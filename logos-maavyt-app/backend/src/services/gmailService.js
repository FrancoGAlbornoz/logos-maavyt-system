const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const { parseVoucherText } = require('./textParserService');
const { pool } = require('../config/database');
require('dotenv').config();

/**
 * Conecta a Gmail vía IMAP y procesa correos de la etiqueta "MAAVYT" aplicando filtros de fecha y acciones (Altas, Modificaciones, Cancelaciones)
 * @param {Object} options
 * @param {string} options.modo 'cierre_quincenal' | 'operativo_3dias' | 'personalizado'
 * @param {string} options.fecha_desde 'YYYY-MM-DD'
 * @param {string} options.fecha_hasta 'YYYY-MM-DD'
 */
async function syncGmailVouchers(options = {}) {
  const user = process.env.GMAIL_USER;
  const password = process.env.GMAIL_APP_PASSWORD;
  const targetFolder = process.env.GMAIL_LABEL || 'MAAVYT';

  if (!user || !password) {
    return {
      success: false,
      message: 'Gmail no está configurado. Ingrese GMAIL_USER y GMAIL_APP_PASSWORD en el archivo .env',
      emails_processed: 0,
      vouchers_imported: 0,
      cancellations_updated: 0,
      modifications_updated: 0
    };
  }

  // Wrapper con timeout de 30 segundos
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar con Gmail IMAP')), 30000)
  );

  return Promise.race([
    performSync(user, password, targetFolder, options),
    timeoutPromise
  ]).catch(err => {
    console.error('[Gmail Service] Error:', err.message);
    return {
      success: false,
      message: err.message,
      emails_processed: 0,
      vouchers_imported: 0,
      cancellations_updated: 0,
      modifications_updated: 0
    };
  });
}

async function performSync(user, password, targetFolder, options = {}) {
  const { modo = 'cierre_quincenal', fecha_desde, fecha_hasta } = options;

  // Calcular rango de fechas
  const today = new Date();
  let minDate = fecha_desde ? new Date(fecha_desde) : new Date(today.getFullYear(), today.getMonth(), 1); // Por defecto 1 del mes actual

  if (modo === 'operativo_3dias') {
    // Desde ayer hasta hoy + 3 días
    minDate = new Date();
    minDate.setDate(today.getDate() - 1);
  }

  let maxDate = fecha_hasta ? new Date(fecha_hasta) : null;
  if (modo === 'operativo_3dias' && !maxDate) {
    maxDate = new Date();
    maxDate.setDate(today.getDate() + 4);
  }

  const minDateStr = minDate.toISOString().split('T')[0];
  const maxDateStr = maxDate ? maxDate.toISOString().split('T')[0] : null;

  console.log(`[Gmail Service] Modo: ${modo} | Filtro Fecha Desde: ${minDateStr} | Hasta: ${maxDateStr || 'Sin límite'}`);

  const config = {
    imap: {
      user: user.trim(),
      password: password.trim(),
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 12000
    }
  };

  let connection;
  try {
    console.log(`[Gmail Service] Conectando a IMAP Gmail para ${user}...`);
    connection = await imaps.connect(config);

    try {
      await connection.openBox(targetFolder);
    } catch (folderErr) {
      console.warn(`[Gmail Service] No se pudo abrir "${targetFolder}". Usando INBOX...`);
      await connection.openBox('INBOX');
    }

    const searchCriteria = ['ALL'];
    const fetchOptions = { bodies: [''], markSeen: true };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`[Gmail Service] Correos en etiqueta "${targetFolder}": ${messages.length}`);

    let vouchersImported = 0;
    let cancellationsUpdated = 0;
    let modificationsUpdated = 0;
    const importedDetails = [];

    for (const item of messages) {
      const allParts = item.parts.find(part => part.which === '');

      if (allParts && allParts.body) {
        const parsedEmail = await simpleParser(allParts.body);
        const subject = parsedEmail.subject || '';
        const textBody = parsedEmail.text || '';
        const htmlBody = parsedEmail.html || '';

        // Detectar si es Cancelación
        const isCancellation = /CANCELACIO?N/i.test(`${subject} ${textBody}`);
        // Detectar si es Modificación
        const isModification = /MODIFICACIO?N/i.test(`${subject} ${textBody}`);

        const parsedServices = parseVoucherText(textBody, htmlBody);

        if (parsedServices.length > 0) {
          const dbConnection = await pool.getConnection();

          try {
            for (const srv of parsedServices) {
              if (!srv.nro_reserva || srv.nro_reserva === 'S/N') continue;

              // Filtro por fecha de servicio (ignorar servicios anteriores a minDateStr)
              if (srv.fecha_servicio < minDateStr) {
                console.log(`[Gmail Service] Omitiendo reserva ${srv.nro_reserva} por fecha anterior a filtro (${srv.fecha_servicio} < ${minDateStr})`);
                continue;
              }

              if (maxDateStr && srv.fecha_servicio > maxDateStr) {
                console.log(`[Gmail Service] Omitiendo reserva ${srv.nro_reserva} por fecha posterior a filtro (${srv.fecha_servicio} > ${maxDateStr})`);
                continue;
              }

              // CASO 1: Cancelación de Servicio
              if (isCancellation) {
                const [upd] = await dbConnection.execute(
                  `UPDATE servicios SET estado_servicio = 'Cancelado' WHERE nro_reserva = ?`,
                  [srv.nro_reserva]
                );
                if (upd.affectedRows > 0) {
                  cancellationsUpdated++;
                  console.log(`[Gmail Service] Servicio #${srv.nro_reserva} marcado como CANCELADO.`);
                }
                continue;
              }

              // CASO 2: Modificación o Alta
              const [existing] = await dbConnection.execute(
                `SELECT id FROM servicios WHERE nro_reserva = ? AND fecha_servicio = ?`,
                [srv.nro_reserva, srv.fecha_servicio]
              );

              if (existing.length > 0) {
                if (isModification) {
                  const srvId = existing[0].id;
                  await dbConnection.execute(
                    `UPDATE servicios SET
                      hora_servicio = ?, categoria_vehiculo = ?, origen = ?, destino = ?,
                      vuelo_observacion = ?, observaciones_internas = ?
                    WHERE id = ?`,
                    [
                      srv.hora_servicio, srv.categoria_vehiculo, srv.origen, srv.destino,
                      srv.vuelo_observacion || subject, `Modificado automáticamente desde Gmail el ${new Date().toLocaleDateString('es-AR')}`,
                      srvId
                    ]
                  );
                  modificationsUpdated++;
                  console.log(`[Gmail Service] Servicio #${srv.nro_reserva} ACTUALIZADO por modificación.`);
                } else {
                  console.log(`[Gmail Service] Reserva ${srv.nro_reserva} (${srv.fecha_servicio}) ya existe. Omitiendo.`);
                }
                continue;
              }

              // CASO 3: Alta de nuevo servicio
              await dbConnection.beginTransaction();

              const fechaObj = new Date(srv.fecha_servicio);
              const anio = fechaObj.getUTCFullYear();
              const mes = fechaObj.getUTCMonth() + 1;
              const dia = fechaObj.getUTCDate();
              const quincena = dia <= 15 ? 1 : 2;

              let periodoId = 1;
              const [periodos] = await dbConnection.execute(
                `SELECT id FROM periodos_liquidacion WHERE anio = ? AND mes = ? AND quincena = ?`,
                [anio, mes, quincena]
              );

              if (periodos.length > 0) {
                periodoId = periodos[0].id;
              } else {
                const fInicio = `${anio}-${String(mes).padStart(2, '0')}-${quincena === 1 ? '01' : '16'}`;
                const lastDay = new Date(anio, mes, 0).getDate();
                const fFin = `${anio}-${String(mes).padStart(2, '0')}-${quincena === 1 ? '15' : lastDay}`;

                const [pRes] = await dbConnection.execute(
                  `INSERT INTO periodos_liquidacion (anio, mes, quincena, fecha_inicio, fecha_fin)
                   VALUES (?, ?, ?, ?, ?)`,
                  [anio, mes, quincena, fInicio, fFin]
                );
                periodoId = pRes.insertId;
              }

              const [res] = await dbConnection.execute(
                `INSERT INTO servicios (
                  nro_reserva, cliente_id, periodo_id, conductor_id, vehiculo_id,
                  fecha_servicio, hora_servicio, categoria_vehiculo, origen, destino,
                  vuelo_observacion, subtotal, monto_espera, monto_adicionales, total,
                  estado_servicio, observaciones_internas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  srv.nro_reserva, 1, periodoId, 1, 1,
                  srv.fecha_servicio, srv.hora_servicio || '00:00:00', srv.categoria_vehiculo || 'Auto Std',
                  srv.origen || 'A definir', srv.destino || 'A definir', srv.vuelo_observacion || subject,
                  srv.subtotal || 0, srv.monto_espera || 0, srv.monto_adicionales || 0, srv.total || 0,
                  'Pendiente', `Importado desde Gmail [MAAVYT]. Asunto: ${subject}`
                ]
              );

              const srvId = res.insertId;

              if (Array.isArray(srv.pasajeros)) {
                for (const pax of srv.pasajeros) {
                  await dbConnection.execute(
                    `INSERT INTO pasajeros (servicio_id, nombre_completo, documento_o_referencia)
                     VALUES (?, ?, ?)`,
                    [srvId, pax.nombre_completo, pax.documento_o_referencia || null]
                  );
                }
              }

              await dbConnection.commit();
              vouchersImported++;
              importedDetails.push({ id: srvId, nro_reserva: srv.nro_reserva, fecha_servicio: srv.fecha_servicio });
            }
          } catch (dbErr) {
            await dbConnection.rollback();
            console.error('[Gmail Service] Error al guardar en DB:', dbErr);
          } finally {
            dbConnection.release();
          }
        }
      }
    }

    try { connection.end(); } catch (e) {}

    return {
      success: true,
      message: `Sincronización completada (${modo}). Evaluados: ${messages.length} correos. Nuevos: ${vouchersImported}, Modificados: ${modificationsUpdated}, Cancelados: ${cancellationsUpdated}.`,
      emails_processed: messages.length,
      vouchers_imported: vouchersImported,
      cancellations_updated: cancellationsUpdated,
      modifications_updated: modificationsUpdated,
      data: importedDetails
    };
  } catch (error) {
    if (connection) {
      try { connection.end(); } catch (e) {}
    }
    throw error;
  }
}

module.exports = {
  syncGmailVouchers
};
