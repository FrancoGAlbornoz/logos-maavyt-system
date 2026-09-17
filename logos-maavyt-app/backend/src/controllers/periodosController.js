const { pool } = require('../config/database');

/**
 * Listar períodos de liquidación quincenales
 */
async function getPeriodos(req, res, next) {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        pl.id AS periodo_id,
        CONCAT(pl.anio, '-', LPAD(pl.mes, 2, '0'), ' Q', pl.quincena) AS periodo_nombre,
        pl.anio,
        pl.mes,
        pl.quincena,
        DATE_FORMAT(pl.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
        DATE_FORMAT(pl.fecha_fin, '%Y-%m-%d') AS fecha_fin,
        COUNT(CASE WHEN s.deleted_at IS NULL THEN s.id END) AS total_servicios,
        SUM(CASE WHEN s.deleted_at IS NULL AND s.estado_servicio != 'Cancelado' THEN s.subtotal ELSE 0 END) AS total_subtotal,
        SUM(CASE WHEN s.deleted_at IS NULL AND s.estado_servicio != 'Cancelado' THEN s.monto_espera ELSE 0 END) AS total_esperas,
        SUM(CASE WHEN s.deleted_at IS NULL AND s.estado_servicio != 'Cancelado' THEN s.monto_adicionales ELSE 0 END) AS total_adicionales,
        SUM(CASE WHEN s.deleted_at IS NULL AND s.estado_servicio != 'Cancelado' THEN s.total ELSE 0 END) AS total_general
      FROM periodos_liquidacion pl
      LEFT JOIN servicios s ON (
        s.periodo_id = pl.id 
        OR (s.fecha_servicio >= pl.fecha_inicio AND s.fecha_servicio <= pl.fecha_fin)
      )
      GROUP BY pl.id
      ORDER BY pl.anio DESC, pl.mes DESC, pl.quincena DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * Crear un nuevo período quincenal
 */
async function createPeriodo(req, res, next) {
  try {
    const { anio, mes, quincena, observaciones } = req.body;

    const fecha_inicio = quincena === 1 
      ? `${anio}-${String(mes).padStart(2, '0')}-01`
      : `${anio}-${String(mes).padStart(2, '0')}-16`;

    const lastDay = new Date(anio, mes, 0).getDate();
    const fecha_fin = quincena === 1
      ? `${anio}-${String(mes).padStart(2, '0')}-15`
      : `${anio}-${String(mes).padStart(2, '0')}-${lastDay}`;

    const [result] = await pool.execute(
      `INSERT INTO periodos_liquidacion (anio, mes, quincena, fecha_inicio, fecha_fin, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [anio, mes, quincena, fecha_inicio, fecha_fin, observaciones || null]
    );

    res.status(201).json({
      success: true,
      message: 'Período de liquidación creado exitosamente.',
      id: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cambiar estado de un período (Abierto -> Cerrado / Liquidado)
 */
async function updateEstadoPeriodo(req, res, next) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    await pool.execute(`UPDATE periodos_liquidacion SET estado = ? WHERE id = ?`, [estado, id]);

    res.json({ success: true, message: `Período actualizado a estado ${estado}.` });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPeriodos,
  createPeriodo,
  updateEstadoPeriodo
};
