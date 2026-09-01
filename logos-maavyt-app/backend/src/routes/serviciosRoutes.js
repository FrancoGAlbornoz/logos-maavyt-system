const express = require('express');
const router = express.Router();
const {
  getServicios,
  getArchivados,
  getServicioById,
  createServicio,
  updateServicio,
  updateEstadoServicio,
  archiveServicio,
  restoreServicio,
  purgeServicio
} = require('../controllers/serviciosController');

router.get('/', getServicios);
router.get('/archivados', getArchivados);
router.get('/:id', getServicioById);
router.post('/', createServicio);
router.put('/:id', updateServicio);
router.patch('/:id/estado', updateEstadoServicio);
router.patch('/:id/restaurar', restoreServicio);
router.delete('/:id', archiveServicio); // Borrado Lógico (Archivar)
router.delete('/:id/purgar', purgeServicio); // Borrado Físico Definitivo

module.exports = router;
