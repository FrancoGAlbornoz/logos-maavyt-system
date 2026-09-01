const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const { parseVoucherText } = require('./textParserService');
const { pool } = require('../config/database');
require('dotenv').config();

/**
 * Conecta a Gmail vía IMAP y procesa los correos de vouchers no leídos (UNSEEN) con timeout de seguridad
 */
async function syncGmailVouchers() {
  const user = process.env.GMAIL_USER;
  const password = process.env.GMAIL_APP_PASSWORD;

  if (!user || !password) {
    return {
      success: false,
      message: 'Gmail no está configurado. Ingrese GMAIL_USER y GMAIL_APP_PASSWORD en el archivo .env',
      emails_processed: 0,
      vouchers_imported: 0
    };
  }

  // Wrapper con timeout de 15 segundos para evitar colgar la petición HTTP
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar con el servidor IMAP de Gmail')), 15000)
  );

  return Promise.race([
    performSync(user, password),
    timeoutPromise
  ]).catch(err => {
    console.error('[Gmail Service] Error o Timeout:', err.message);
    return {
      success: false,
      message: err.message,
      emails_processed: 0,
      vouchers_imported: 0
    };
  });
}

async function performSync(user, password) {
  const config = {
    imap: {
      user: user.trim(),
      password: password.trim(),
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 8000
    }
  };

  let connection;
  try {
    console.log(`[Gmail Service] Conectando a IMAP Gmail para ${user}...`);
    connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    // Buscar correos no leídos
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: [''],
      markSeen: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`[Gmail Service] Mensajes no leídos encontrados: ${messages.length}`);

    let totalVouchersImported = 0;
    const importedDetails = [];

    for (const item of messages) {
      const allParts = item.parts.find(part => part.which === '');

      if (allParts && allParts.body) {
        const parsedEmail = await simpleParser(allParts.body);
        const subject = parsedEmail.subject || '';
        const textBody = parsedEmail.text || parsedEmail.html || '';

        console.log(`[Gmail Service] Procesando correo: "${subject}"`);

        // Extraer servicios usando textParserService
        const parsedServices = parseVoucherText(textBody);

        if (parsedServices.length > 0) {
          const dbConnection = await pool.getConnection();
          await dbConnection.beginTransaction();

          try {
            for (const srv of parsedServices) {
              const [res] = await dbConnection.execute(
                `INSERT INTO servicios (
                  nro_reserva, cliente_id, periodo_id, conductor_id, vehiculo_id,
                  fecha_servicio, hora_servicio, categoria_vehiculo, origen, destino,
                  vuelo_observacion, subtotal, monto_espera, monto_adicionales, total,
                  estado_servicio, observaciones_internas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  srv.nro_reserva || 'S/N',
                  1, // Logos Travel
                  1,
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
                  `Importado automáticamente desde Gmail. Asunto: ${subject}`
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

              totalVouchersImported++;
              importedDetails.push({ id: srvId, nro_reserva: srv.nro_reserva, subject });
            }

            await dbConnection.commit();
          } catch (dbErr) {
            await dbConnection.rollback();
            console.error('[Gmail Service] Error al guardar reservas en DB:', dbErr);
          } finally {
            dbConnection.release();
          }
        }
      }
    }

    try { connection.end(); } catch (e) {}

    return {
      success: true,
      message: `Sincronización completada. Se leyeron ${messages.length} correo(s) y se importaron ${totalVouchersImported} reserva(s).`,
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
