const { pool } = require('../config/database');

/**
 * Listar períodos de liquidación quincenales
 */
async function getPeriodos(req, res, next) {
  try {
    const [rows] = await pool.execute(`SELECT * FROM vista_liquidacion_quincenal`);
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
