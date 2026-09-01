const express = require('express');
const router = express.Router();
const { getHojaDeRutaPDF, getLiquidacionExcel } = require('../controllers/reportesController');

router.get('/hoja-de-ruta/pdf', getHojaDeRutaPDF);
router.get('/liquidacion/excel', getLiquidacionExcel);

module.exports = router;
