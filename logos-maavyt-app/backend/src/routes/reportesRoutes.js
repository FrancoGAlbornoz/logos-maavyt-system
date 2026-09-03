const express = require('express');
const router = express.Router();
const {
  getServiciosOperativosPDF,
  getServiciosOperativosExcel,
  getHojaDeRutaPDF,
  getLiquidacionExcel
} = require('../controllers/reportesController');

/**
 * @openapi
 * /reportes/servicios/pdf:
 *   get:
 *     summary: Exportar Servicios Operativos en PDF A4 Horizontal (Landscape)
 *     tags: [Motor de Reportes]
 */
router.get('/servicios/pdf', getServiciosOperativosPDF);

/**
 * @openapi
 * /reportes/servicios/excel:
 *   get:
 *     summary: Exportar Servicios Operativos en Excel (.xlsx)
 *     tags: [Motor de Reportes]
 */
router.get('/servicios/excel', getServiciosOperativosExcel);

/**
 * @openapi
 * /reportes/hoja-de-ruta/pdf:
 *   get:
 *     summary: Generar y descargar Hoja de Ruta Operativa en PDF A4 Horizontal
 *     tags: [Motor de Reportes]
 */
router.get('/hoja-de-ruta/pdf', getHojaDeRutaPDF);

/**
 * @openapi
 * /reportes/liquidacion/excel:
 *   get:
 *     summary: Generar y descargar Planilla de Liquidación Quincenal en Excel (.xlsx)
 *     tags: [Motor de Reportes]
 */
router.get('/liquidacion/excel', getLiquidacionExcel);

module.exports = router;
