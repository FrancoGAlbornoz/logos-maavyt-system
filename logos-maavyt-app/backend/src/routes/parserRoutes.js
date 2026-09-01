const express = require('express');
const router = express.Router();
const { previewParser, importVouchers } = require('../controllers/parserController');

/**
 * @openapi
 * /parser/preview:
 *   post:
 *     summary: Previsualizar extracción desde texto crudo o voucher
 *     tags: [Módulo Parser & Ingesta]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rawText:
 *                 type: string
 *                 example: 'RESERVA 230309 FECHA 18/08/2026 HORA 14:50 PAX TORRES DIEGO ORIGEN ARPT DESTINO HILTON TUCUMAN'
 *     responses:
 *       200:
 *         description: Lista de servicios detectados para previsualización
 */
router.post('/preview', previewParser);

/**
 * @openapi
 * /parser/import:
 *   post:
 *     summary: Importar lote de servicios confirmados con transacciones SQL
 *     tags: [Módulo Parser & Ingesta]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               servicios:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Servicio'
 *     responses:
 *       201:
 *         description: Servicios importados exitosamente
 */
router.post('/import', importVouchers);

module.exports = router;
