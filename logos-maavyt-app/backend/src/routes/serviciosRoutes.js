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

/**
 * @openapi
 * /servicios:
 *   get:
 *     summary: Listar servicios de traslados activos
 *     tags: [Servicios Operativos]
 *     parameters:
 *       - in: query
 *         name: fecha_desde
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar fecha desde (YYYY-MM-DD)
 *       - in: query
 *         name: fecha_hasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar fecha hasta (YYYY-MM-DD)
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [Pendiente, Confirmado, Realizado, No Show, Cancelado]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Búsqueda por nro_reserva, origen, destino o pasajero
 *     responses:
 *       200:
 *         description: Lista de servicios activos
 *   post:
 *     summary: Crear un nuevo servicio de traslado
 *     tags: [Servicios Operativos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Servicio'
 *     responses:
 *       201:
 *         description: Servicio creado exitosamente
 */
router.get('/', getServicios);
router.post('/', createServicio);

/**
 * @openapi
 * /servicios/archivados:
 *   get:
 *     summary: Listar servicios archivados (Borrado Lógico / Papelera)
 *     tags: [Servicios Operativos]
 *     responses:
 *       200:
 *         description: Lista de servicios eliminados lógicamente
 */
router.get('/archivados', getArchivados);

/**
 * @openapi
 * /servicios/{id}:
 *   get:
 *     summary: Obtener detalle completo de un servicio por ID
 *     tags: [Servicios Operativos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle del servicio y sus pasajeros
 *       404:
 *         description: Servicio no encontrado
 *   put:
 *     summary: Actualizar datos de un servicio por ID
 *     tags: [Servicios Operativos]
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
 *             $ref: '#/components/schemas/Servicio'
 *     responses:
 *       200:
 *         description: Servicio actualizado exitosamente
 *   delete:
 *     summary: Archivar servicio (Borrado Lógico / Enviar a Papelera)
 *     tags: [Servicios Operativos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Servicio archivado (soft delete)
 */
router.get('/:id', getServicioById);
router.put('/:id', updateServicio);
router.delete('/:id', archiveServicio);

/**
 * @openapi
 * /servicios/{id}/estado:
 *   patch:
 *     summary: Cambiar estado operativo de un servicio
 *     tags: [Servicios Operativos]
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
 *               estado_servicio:
 *                 type: string
 *                 enum: [Pendiente, Confirmado, Realizado, No Show, Cancelado]
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.patch('/:id/estado', updateEstadoServicio);

/**
 * @openapi
 * /servicios/{id}/restaurar:
 *   patch:
 *     summary: Restaurar servicio desde la papelera de archivados
 *     tags: [Servicios Operativos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Servicio restaurado exitosamente
 */
router.patch('/:id/restaurar', restoreServicio);

/**
 * @openapi
 * /servicios/{id}/purgar:
 *   delete:
 *     summary: Eliminar permanentemente (Purga Física en MySQL)
 *     tags: [Servicios Operativos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Registro eliminado físicamente de la base de datos
 */
router.delete('/:id/purgar', purgeServicio);

module.exports = router;
