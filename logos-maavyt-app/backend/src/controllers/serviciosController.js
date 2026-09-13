const { pool } = require('../config/database');

/**
 * Listar servicios activos (por defecto omite borrados lógicos)
 */
async function getServicios(req, res, next) {
  try {
    const { fecha_desde, fecha_hasta, periodo_id, conductor_id, estado, search, include_deleted, only_deleted } = req.query;

    let query = `
      SELECT 
        s.id, s.nro_reserva, s.cliente_id, s.periodo_id, s.conductor_id, s.vehiculo_id,
        s.fecha_servicio, s.hora_servicio, s.categoria_vehiculo, s.origen, s.destino,
        s.origen_2, s.destino_2,
        s.vuelo_observacion, s.estado_servicio, s.subtotal, s.minutos_espera,
        s.detalle_espera, s.monto_espera, s.monto_adicionales, s.total, s.liquidado,
        s.observaciones_internas, s.deleted_at, s.created_at,
        c.nombre AS cliente_nombre,
        cond.nombre AS conductor_nombre, cond.apellido AS conductor_apellido,
        v.numero_unidad, v.patente,
        GROUP_CONCAT(
          CASE 
            WHEN p.documento_o_referencia IS NOT NULL AND p.documento_o_referencia != '' 
            THEN CONCAT(p.documento_o_referencia, ' - ', p.nombre_completo)
            ELSE p.nombre_completo 
          END 
          SEPARATOR ' / '
        ) AS pasajeros_concatenados
      FROM servicios s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      LEFT JOIN conductores cond ON s.conductor_id = cond.id
      LEFT JOIN vehiculos v ON s.vehiculo_id = v.id
      LEFT JOIN pasajeros p ON s.id = p.servicio_id
      WHERE 1=1
    `;

    const params = [];

    // Manejo de Soft Delete
    if (only_deleted === 'true') {
      query += ` AND s.deleted_at IS NOT NULL`;
    } else if (include_deleted !== 'true') {
      query += ` AND s.deleted_at IS NULL`;
    }

    if (fecha_desde) {
      query += ` AND s.fecha_servicio >= ?`;
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      query += ` AND s.fecha_servicio <= ?`;
      params.push(fecha_hasta);
    }
    if (periodo_id) {
      query += ` AND s.periodo_id = ?`;
      params.push(periodo_id);
    }
    if (conductor_id) {
      query += ` AND s.conductor_id = ?`;
      params.push(conductor_id);
    }
    if (estado) {
      query += ` AND s.estado_servicio = ?`;
      params.push(estado);
    }
    if (search) {
      query += ` AND (s.nro_reserva LIKE ? OR s.origen LIKE ? OR s.destino LIKE ? OR s.vuelo_observacion LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` GROUP BY s.id ORDER BY s.fecha_servicio ASC, s.hora_servicio ASC`;

    const [rows] = await pool.execute(query, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener listado exclusivo de servicios archivados / borrados lógicamente
 */
async function getArchivados(req, res, next) {
  req.query.only_deleted = 'true';
  return getServicios(req, res, next);
}

/**
 * Obtener un servicio por ID con su detalle de pasajeros
 */
async function getServicioById(req, res, next) {
  try {
    const { id } = req.params;

    const [servicios] = await pool.execute(`SELECT * FROM servicios WHERE id = ?`, [id]);
    if (servicios.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Servicio no encontrado.' } });
    }

    const servicio = servicios[0];
    const [pasajeros] = await pool.execute(`SELECT * FROM pasajeros WHERE servicio_id = ?`, [id]);
    servicio.pasajeros = pasajeros;

    res.json({ success: true, data: servicio });
  } catch (error) {
    next(error);
  }
}

/**
 * Crear un nuevo servicio de forma manual
 */
async function createServicio(req, res, next) {
  let connection;
  try {
    const {
      nro_reserva, cliente_id, periodo_id, conductor_id, vehiculo_id,
      fecha_servicio, hora_servicio, categoria_vehiculo, origen, destino,
      origen_2, destino_2,
      vuelo_observacion, subtotal, minutos_espera, detalle_espera, monto_espera,
      monto_adicionales, total, estado_servicio, observaciones_internas, pasajeros
    } = req.body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO servicios (
        nro_reserva, cliente_id, periodo_id, conductor_id, vehiculo_id,
        fecha_servicio, hora_servicio, categoria_vehiculo, origen, destino,
        origen_2, destino_2,
        vuelo_observacion, subtotal, minutos_espera, detalle_espera, monto_espera,
        monto_adicionales, total, estado_servicio, observaciones_internas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nro_reserva || 'S/N', cliente_id || 1, periodo_id || 1, conductor_id || 1, vehiculo_id || 1,
        fecha_servicio, hora_servicio || '00:00:00', categoria_vehiculo || 'Auto Std',
        origen, destino, origen_2 || null, destino_2 || null,
        vuelo_observacion || null, subtotal || 0, minutos_espera || 0,
        detalle_espera || null, monto_espera || 0, monto_adicionales || 0, total || 0,
        estado_servicio || 'Confirmado', observaciones_internas || null
      ]
    );

    const servicioId = result.insertId;

    if (Array.isArray(pasajeros) && pasajeros.length > 0) {
      for (const pax of pasajeros) {
        await connection.execute(
          `INSERT INTO pasajeros (servicio_id, nombre_completo, documento_o_referencia, telefono)
           VALUES (?, ?, ?, ?)`,
          [servicioId, pax.nombre_completo, pax.documento_o_referencia || null, pax.telefono || null]
        );
      }
    }

    await connection.commit();
    connection.release();

    res.status(201).json({ success: true, message: 'Servicio creado correctamente.', id: servicioId });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    next(error);
  }
}

/**
 * Actualizar servicio existente
 */
async function updateServicio(req, res, next) {
  let connection;
  try {
    const { id } = req.params;
    const {
      nro_reserva, cliente_id, periodo_id, conductor_id, vehiculo_id,
      fecha_servicio, hora_servicio, categoria_vehiculo, origen, destino,
      origen_2, destino_2,
      vuelo_observacion, subtotal, minutos_espera, detalle_espera, monto_espera,
      monto_adicionales, total, estado_servicio, observaciones_internas, pasajeros
    } = req.body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE servicios SET
        nro_reserva = ?, cliente_id = ?, periodo_id = ?, conductor_id = ?, vehiculo_id = ?,
        fecha_servicio = ?, hora_servicio = ?, categoria_vehiculo = ?, origen = ?, destino = ?,
        origen_2 = ?, destino_2 = ?,
        vuelo_observacion = ?, subtotal = ?, minutos_espera = ?, detalle_espera = ?, monto_espera = ?,
        monto_adicionales = ?, total = ?, estado_servicio = ?, observaciones_internas = ?
      WHERE id = ?`,
      [
        nro_reserva, cliente_id, periodo_id, conductor_id, vehiculo_id,
        fecha_servicio, hora_servicio, categoria_vehiculo, origen, destino,
        origen_2 || null, destino_2 || null,
        vuelo_observacion, subtotal, minutos_espera, detalle_espera, monto_espera,
        monto_adicionales, total, estado_servicio, observaciones_internas, id
      ]
    );

    if (Array.isArray(pasajeros)) {
      await connection.execute(`DELETE FROM pasajeros WHERE servicio_id = ?`, [id]);
      for (const pax of pasajeros) {
        await connection.execute(
          `INSERT INTO pasajeros (servicio_id, nombre_completo, documento_o_referencia, telefono)
           VALUES (?, ?, ?, ?)`,
          [id, pax.nombre_completo, pax.documento_o_referencia || null, pax.telefono || null]
        );
      }
    }

    await connection.commit();
    connection.release();

    res.json({ success: true, message: 'Servicio actualizado exitosamente.' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    next(error);
  }
}

/**
 * Actualizar estado operativo
 */
async function updateEstadoServicio(req, res, next) {
  try {
    const { id } = req.params;
    const { estado_servicio } = req.body;

    await pool.execute(`UPDATE servicios SET estado_servicio = ? WHERE id = ?`, [estado_servicio, id]);

    res.json({ success: true, message: `Estado actualizado a ${estado_servicio}.` });
  } catch (error) {
    next(error);
  }
}

/**
 * Borrado Lógico (Soft Delete / Archivar)
 */
async function archiveServicio(req, res, next) {
  try {
    const { id } = req.params;
    await pool.execute(`UPDATE servicios SET deleted_at = NOW() WHERE id = ?`, [id]);

    res.json({ success: true, message: 'Servicio archivado (borrado lógico) exitosamente.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Restaurar Servicio Archivado
 */
async function restoreServicio(req, res, next) {
  try {
    const { id } = req.params;
    await pool.execute(`UPDATE servicios SET deleted_at = NULL WHERE id = ?`, [id]);

    res.json({ success: true, message: 'Servicio restaurado exitosamente.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Borrado Físico Definitivo (Purge)
 */
async function purgeServicio(req, res, next) {
  try {
    const { id } = req.params;
    await pool.execute(`DELETE FROM servicios WHERE id = ?`, [id]);

    res.json({ success: true, message: 'Servicio eliminado permanentemente de la base de datos.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getServicios,
  getArchivados,
  getServicioById,
  createServicio,
  updateServicio,
  updateEstadoServicio,
  archiveServicio,
  restoreServicio,
  purgeServicio
};
