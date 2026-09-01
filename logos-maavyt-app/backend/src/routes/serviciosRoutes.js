const express = require('express');
const router = express.Router();
const {
  getServicios,
  getServicioById,
  createServicio,
  updateServicio,
  updateEstadoServicio,
  deleteServicio
} = require('../controllers/serviciosController');

router.get('/', getServicios);
router.get('/:id', getServicioById);
router.post('/', createServicio);
router.put('/:id', updateServicio);
router.patch('/:id/estado', updateEstadoServicio);
router.delete('/:id', deleteServicio);

module.exports = router;
