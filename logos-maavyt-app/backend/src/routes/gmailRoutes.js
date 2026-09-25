const express = require('express');
const router = express.Router();
const { syncGmail, getGmailStatus, fixDatabaseClients } = require('../controllers/gmailController');

/**
 * @openapi
 * /gmail/sync:
 *   post:
 *     summary: Sincronizar correo desde la etiqueta MAAVYT de Gmail
 *     tags: [Integración Gmail]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modo:
 *                 type: string
 *                 enum: [cierre_quincenal, operativo_3dias, personalizado]
 *                 example: cierre_quincenal
 *               fecha_desde:
 *                 type: string
 *                 format: date
 *                 example: '2026-09-01'
 *     responses:
 *       200:
 *         description: Resultado de la sincronización IMAP
 */
router.post('/sync', syncGmail);
router.get('/fix-db', fixDatabaseClients);

/**
 * @openapi
 * /gmail/status:
 *   get:
 *     summary: Obtener estado de configuración de Gmail
 *     tags: [Integración Gmail]
 *     responses:
 *       200:
 *         description: Estado de vinculación de la casilla Gmail
 */
router.get('/status', getGmailStatus);

module.exports = router;
