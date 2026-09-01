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

module.exports = {
  syncGmail,
  getGmailStatus
};
