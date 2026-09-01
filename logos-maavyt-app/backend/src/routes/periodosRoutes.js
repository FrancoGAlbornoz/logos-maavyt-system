const express = require('express');
const router = express.Router();
const { getPeriodos, createPeriodo, updateEstadoPeriodo } = require('../controllers/periodosController');

/**
 * @openapi
 * /periodos:
 *   get:
 *     summary: Listar períodos de liquidación quincenales con resumen de totales
 *     tags: [Períodos & Liquidaciones]
 *     responses:
 *       200:
 *         description: Lista de períodos quincenales y totales financieros
 *   post:
 *     summary: Crear un nuevo período quincenal
 *     tags: [Períodos & Liquidaciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               anio:
 *                 type: integer
 *                 example: 2026
 *               mes:
 *                 type: integer
 *                 example: 9
 *               quincena:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Período creado exitosamente
 */
router.get('/', getPeriodos);
router.post('/', createPeriodo);

/**
 * @openapi
 * /periodos/{id}/estado:
 *   patch:
 *     summary: Cambiar estado de un período (Abierto, Cerrado, Liquidado)
 *     tags: [Períodos & Liquidaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [Abierto, Cerrado, Liquidado]
 *     responses:
 *       200:
 *         description: Estado del período actualizado
 */
router.patch('/:id/estado', updateEstadoPeriodo);

module.exports = router;
