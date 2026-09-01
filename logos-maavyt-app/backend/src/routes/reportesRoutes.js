const express = require('express');
const router = express.Router();
const { getHojaDeRutaPDF, getLiquidacionExcel } = require('../controllers/reportesController');

/**
 * @openapi
 * /reportes/hoja-de-ruta/pdf:
 *   get:
 *     summary: Generar y descargar Hoja de Ruta Operativa en PDF A4 Horizontal
 *     tags: [Motor de Reportes]
 *     parameters:
 *       - in: query
 *         name: periodo_id
 *         schema:
 *           type: integer
 *         description: ID del período quincenal
 *       - in: query
 *         name: fecha_desde
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Archivo PDF generado
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/hoja-de-ruta/pdf', getHojaDeRutaPDF);

/**
 * @openapi
 * /reportes/liquidacion/excel:
 *   get:
 *     summary: Generar y descargar Planilla de Liquidación Quincenal en Excel (.xlsx)
 *     tags: [Motor de Reportes]
 *     parameters:
 *       - in: query
 *         name: periodo_id
 *         schema:
 *           type: integer
 *         description: ID del período quincenal
 *     responses:
 *       200:
 *         description: Archivo Excel .xlsx generado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/liquidacion/excel', getLiquidacionExcel);

module.exports = router;
