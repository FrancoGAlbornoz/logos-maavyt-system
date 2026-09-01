const { parseVoucherText } = require('../services/textParserService');
const { pool } = require('../config/database');

/**
 * Previsualizar el resultado de parsear texto de vouchers
 */
async function previewParser(req, res, next) {
  try {
    const { rawText } = req.body;

    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'El campo rawText es requerido y debe ser una cadena de texto.' }
      });
    }

    const parsedServices = parseVoucherText(rawText);

    return res.json({
      success: true,
      total_detected: parsedServices.length,
      data: parsedServices
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Importar servicios confirmados en lote con transacciones SQL (BEGIN ... COMMIT)
 */
async function importVouchers(req, res, next) {
  let connection;
  try {
    const { servicios, periodo_id, cliente_id, conductor_id, vehiculo_id } = req.body;

    if (!Array.isArray(servicios) || servicios.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Debe enviar un arreglo "servicios" con al menos un elemento.' }
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const insertedServices = [];

    for (const item of servicios) {
      // 1. Insertar servicio
      const [srvResult] = await connection.execute(
        `INSERT INTO servicios (
          nro_reserva, cliente_id, periodo_id, conductor_id, vehiculo_id,
          fecha_servicio, hora_servicio, categoria_vehiculo, origen, destino,
          vuelo_observacion, subtotal, monto_espera, monto_adicionales, total,
          estado_servicio, observaciones_internas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.nro_reserva || 'S/N',
          cliente_id || item.cliente_id || 1, // Default 1 (Logos Travel)
          periodo_id || item.periodo_id || 1,
          conductor_id || item.conductor_id || 1, // Default 1 (Miguel Ángel Albornoz)
          vehiculo_id || item.vehiculo_id || 1,
          item.fecha_servicio,
          item.hora_servicio || '00:00:00',
          item.categoria_vehiculo || 'Auto Std',
          item.origen || 'A definir',
          item.destino || 'A definir',
          item.vuelo_observacion || null,
          item.subtotal || 0,
          item.monto_espera || 0,
          item.monto_adicionales || 0,
          item.total || 0,
          item.estado_servicio || 'Confirmado',
          item.observaciones_internas || null
        ]
      );

      const servicioId = srvResult.insertId;

      // 2. Insertar Pasajeros si existen
      if (Array.isArray(item.pasajeros) && item.pasajeros.length > 0) {
        for (const pax of item.pasajeros) {
          await connection.execute(
            `INSERT INTO pasajeros (servicio_id, nombre_completo, documento_o_referencia, telefono)
             VALUES (?, ?, ?, ?)`,
            [
              servicioId,
              pax.nombre_completo || 'PAX A DEFINIR',
              pax.documento_o_referencia || null,
              pax.telefono || null
            ]
          );
        }
      }

      insertedServices.push({ id: servicioId, nro_reserva: item.nro_reserva });
    }

    await connection.commit();
    connection.release();

    return res.status(201).json({
      success: true,
      message: `Se importaron exitosamente ${insertedServices.length} servicios en lote.`,
      imported_count: insertedServices.length,
      data: insertedServices
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    next(error);
  }
}

module.exports = {
  previewParser,
  importVouchers
};
