const { syncGmailVouchers } = require('../services/gmailService');

/**
 * Triggerea la sincronización manual instantánea de Gmail con opciones de filtro
 */
async function syncGmail(req, res, next) {
  try {
    const { modo, fecha_desde, fecha_hasta } = req.body || {};
    const result = await syncGmailVouchers({ modo, fecha_desde, fecha_hasta });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Devuelve el estado de la configuración de Gmail
 */
async function getGmailStatus(req, res, next) {
  try {
    const user = process.env.GMAIL_USER || '';
    const configured = Boolean(user && process.env.GMAIL_APP_PASSWORD);

    res.json({
      success: true,
      configured,
      gmail_user: user ? `${user.substring(0, 3)}***@${user.split('@')[1] || 'gmail.com'}` : null,
      auto_sync: process.env.GMAIL_AUTO_SYNC === 'true',
      interval_minutes: Number(process.env.GMAIL_SYNC_INTERVAL_MINUTES) || 10
    });
  } catch (error) {
    next(error);
  }
}


async function fixDatabaseClients(req, res, next) {
  try {
    const { pool } = require('../config/database');
    const connection = await pool.getConnection();
    
    // Rename Logos Travel to Logos Traslados
    await connection.execute("UPDATE clientes SET nombre = 'Logos Traslados' WHERE id = 1");
    
    // Find Miguel Angel Albornoz VyT and reassign to 1
    const [rows] = await connection.execute("SELECT id, nombre FROM clientes WHERE nombre LIKE '%Miguel Angel%' OR nombre LIKE '%Logos Travel%'");
    for (let r of rows) {
      if (r.id !== 1) {
        await connection.execute("UPDATE servicios SET cliente_id = 1 WHERE cliente_id = ?", [r.id]);
        await connection.execute("DELETE FROM clientes WHERE id = ?", [r.id]);
      }
    }
    
    connection.release();
    res.json({ success: true, message: 'Base de datos de clientes limpiada exitosamente.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  fixDatabaseClients,
  syncGmail,
  getGmailStatus
};
