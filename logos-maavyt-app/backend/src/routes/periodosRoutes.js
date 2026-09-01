const express = require('express');
const router = express.Router();
const { getPeriodos, createPeriodo, updateEstadoPeriodo } = require('../controllers/periodosController');

router.get('/', getPeriodos);
router.post('/', createPeriodo);
router.patch('/:id/estado', updateEstadoPeriodo);

module.exports = router;
