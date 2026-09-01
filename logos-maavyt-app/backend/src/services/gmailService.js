const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const { parseVoucherText } = require('./textParserService');
const { pool } = require('../config/database');
require('dotenv').config();

/**
 * Conecta a Gmail vía IMAP y procesa EXCLUSIVAMENTE los correos dentro de la Etiqueta "MAAVYT"
 */
async function syncGmailVouchers() {
  const user = process.env.GMAIL_USER;
  const password = process.env.GMAIL_APP_PASSWORD;
  const targetFolder = process.env.GMAIL_LABEL || 'MAAVYT';

  if (!user || !password) {
    return {
      success: false,
      message: 'Gmail no está configurado. Ingrese GMAIL_USER y GMAIL_APP_PASSWORD en el archivo .env',
      emails_processed: 0,
      vouchers_imported: 0
    };
  }

  // Wrapper con timeout de 20 segundos
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar con Gmail IMAP')), 20000)
  );

  return Promise.race([
    performSync(user, password, targetFolder),
    timeoutPromise
  ]).catch(err => {
    console.error('[Gmail Service] Error:', err.message);
    return {
      success: false,
      message: err.message,
      emails_processed: 0,
      vouchers_imported: 0
    };
  });
}

async function performSync(user, password, targetFolder) {
  const config = {
    imap: {
      user: user.trim(),
      password: password.trim(),
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000
    }
  };

  let connection;
  try {
    console.log(`[Gmail Service] Conectando a IMAP Gmail para ${user}...`);
    connection = await imaps.connect(config);

    // Abrir EXCLUSIVAMENTE la etiqueta MAAVYT
    console.log(`[Gmail Service] Abriendo carpeta / etiqueta de Gmail: "${targetFolder}"`);
    try {
      await connection.openBox(targetFolder);
    } catch (folderErr) {
      console.warn(`[Gmail Service] No se pudo abrir la etiqueta "${targetFolder}". Intentando abreviaciones...`);
      await connection.openBox('INBOX');
    }

    // Buscar todos los correos dentro de la etiqueta MAAVYT
    const searchCriteria = ['ALL'];
    const fetchOptions = {
      bodies: [''],
      markSeen: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`[Gmail Service] Correos en etiqueta "${targetFolder}": ${messages.length}`);

    let totalVouchersImported = 0;
    const importedDetails = [];

    for (const item of messages) {
      const allParts = item.parts.find(part => part.which === '');

      if (allParts && allParts.body) {
        const parsedEmail = await simpleParser(allParts.body);
        const subject = parsedEmail.subject || '';
        const textBody = parsedEmail.text || parsedEmail.html || '';

        console.log(`[Gmail Service] Parseando correo de etiqueta MAAVYT: "${subject}"`);

        // Extraer servicios usando textParserService con validación estricta
        const parsedServices = parseVoucherText(textBody);

        if (parsedServices.length > 0) {
          const dbConnection = await pool.getConnection();

          try {
            for (const srv of parsedServices) {
              if (!srv.nro_reserva || srv.nro_reserva === 'S/N') {
                continue;
              }

              // Prevención de duplicados en MySQL
              const [existing] = await dbConnection.execute(
                `SELECT id FROM servicios WHERE nro_reserva = ? AND fecha_servicio = ?`,
                [srv.nro_reserva, srv.fecha_servicio]
              );

              if (existing.length > 0) {
                console.log(`[Gmail Service] Reserva ${srv.nro_reserva} ya existe en DB. Omitiendo.`);
                continue;
              }

              await dbConnection.beginTransaction();

              // Período quincenal correspondiente
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

              // Insertar Servicio
              const [res] = await dbConnection.execute(
                `INSERT INTO servicios (
                  nro_reserva, cliente_id, periodo_id, conductor_id, vehiculo_id,
                  fecha_servicio, hora_servicio, categoria_vehiculo, origen, destino,
                  vuelo_observacion, subtotal, monto_espera, monto_adicionales, total,
                  estado_servicio, observaciones_internas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  srv.nro_reserva,
                  1, // Logos Travel
                  periodoId,
                  1,
                  1,
                  srv.fecha_servicio,
                  srv.hora_servicio || '00:00:00',
                  srv.categoria_vehiculo || 'Auto Std',
                  srv.origen || 'A definir',
                  srv.destino || 'A definir',
                  srv.vuelo_observacion || subject,
                  srv.subtotal || 0,
                  srv.monto_espera || 0,
                  srv.monto_adicionales || 0,
                  srv.total || 0,
                  'Pendiente',
                  `Importado automáticamente desde Gmail etiqueta [MAAVYT]. Asunto: ${subject}`
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

              totalVouchersImported++;
              importedDetails.push({
                id: srvId,
                nro_reserva: srv.nro_reserva,
                fecha_servicio: srv.fecha_servicio,
                subject
              });
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
      message: `Sincronización de etiqueta "${targetFolder}" completada. Se evaluaron ${messages.length} correo(s) y se importaron ${totalVouchersImported} nueva(s) reserva(s).`,
      emails_processed: messages.length,
      vouchers_imported: totalVouchersImported,
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
