const { pool } = require('../config/database');
const { generateHojaDeRutaPDF } = require('../services/pdfGeneratorService');
const { generateLiquidacionExcel, generateServiciosOperativosExcel } = require('../services/excelGeneratorService');

/**
 * Generar y enviar Hoja de Ruta / Servicios Operativos en PDF A4 Horizontal
 * Respeta los filtros activos (fecha_desde, fecha_hasta, search, estado, range_label)
 */
async function getServiciosOperativosPDF(req, res, next) {
  try {
    const { fecha_desde, fecha_hasta, search, estado, range_label } = req.query;

    let query = `
      SELECT 
        s.id, s.nro_reserva, s.fecha_servicio, s.hora_servicio, s.categoria_vehiculo,
        s.origen, s.destino, s.origen_2, s.destino_2, s.vuelo_observacion, s.detalle_espera, s.estado_servicio,
        GROUP_CONCAT(
          CASE 
            WHEN p.documento_o_referencia IS NOT NULL AND p.documento_o_referencia != '' 
            THEN CONCAT(p.documento_o_referencia, ' - ', p.nombre_completo)
            ELSE p.nombre_completo 
          END 
          SEPARATOR ' / '
        ) AS pasajeros_concatenados
      FROM servicios s
      LEFT JOIN pasajeros p ON s.id = p.servicio_id
      WHERE s.deleted_at IS NULL
        AND s.estado_servicio != 'Cancelado'
    `;

    const params = [];

    if (fecha_desde) {
      query += ` AND s.fecha_servicio >= ?`;
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      query += ` AND s.fecha_servicio <= ?`;
      params.push(fecha_hasta);
    }
    if (estado && estado !== 'Cancelado') {
      query += ` AND s.estado_servicio = ?`;
      params.push(estado);
    }
    if (search) {
      query += ` AND (s.nro_reserva LIKE ? OR s.origen LIKE ? OR s.destino LIKE ? OR s.vuelo_observacion LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` GROUP BY s.id ORDER BY s.fecha_servicio ASC, s.hora_servicio ASC`;

    const [servicios] = await pool.execute(query, params);

    const pdfBuffer = await generateHojaDeRutaPDF(servicios, {
      rangeLabel: range_label || 'Servicios Operativos'
    });

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Servicios_Operativos_MAAVYT_${dateStr}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

/**
 * Generar y descargar Planilla de Servicios Operativos en Excel (.xlsx)
 * Respeta los filtros activos (fecha_desde, fecha_hasta, search, estado, range_label)
 */
async function getServiciosOperativosExcel(req, res, next) {
  try {
    const { fecha_desde, fecha_hasta, search, estado, range_label } = req.query;

    let query = `
      SELECT 
        s.id, s.nro_reserva, s.fecha_servicio, s.hora_servicio, s.categoria_vehiculo,
        s.origen, s.destino, s.origen_2, s.destino_2, s.vuelo_observacion, s.detalle_espera, s.estado_servicio,
        GROUP_CONCAT(
          CASE 
            WHEN p.documento_o_referencia IS NOT NULL AND p.documento_o_referencia != '' 
            THEN CONCAT(p.documento_o_referencia, ' - ', p.nombre_completo)
            ELSE p.nombre_completo 
          END 
          SEPARATOR ' / '
        ) AS pasajeros_concatenados
      FROM servicios s
      LEFT JOIN pasajeros p ON s.id = p.servicio_id
      WHERE s.deleted_at IS NULL
        AND s.estado_servicio != 'Cancelado'
    `;

    const params = [];

    if (fecha_desde) {
      query += ` AND s.fecha_servicio >= ?`;
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      query += ` AND s.fecha_servicio <= ?`;
      params.push(fecha_hasta);
    }
    if (estado && estado !== 'Cancelado') {
      query += ` AND s.estado_servicio = ?`;
      params.push(estado);
    }
    if (search) {
      query += ` AND (s.nro_reserva LIKE ? OR s.origen LIKE ? OR s.destino LIKE ? OR s.vuelo_observacion LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` GROUP BY s.id ORDER BY s.fecha_servicio ASC, s.hora_servicio ASC`;

    const [servicios] = await pool.execute(query, params);

    const excelBuffer = await generateServiciosOperativosExcel(servicios, {
      rangeLabel: range_label || 'Servicios Operativos'
    });

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Servicios_Operativos_MAAVYT_${dateStr}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
}

/**
 * Descargar Hoja de Ruta Operativa en PDF A4 Horizontal (Ruta heredada)
 */
async function getHojaDeRutaPDF(req, res, next) {
  return getServiciosOperativosPDF(req, res, next);
}

/**
 * Descargar Liquidación Quincenal en Excel (.xlsx)
 */
async function getLiquidacionExcel(req, res, next) {
  try {
    const { periodo_id, fecha_desde, fecha_hasta, range_label, search, estado } = req.query;

    let query = `
      SELECT 
        s.id, s.nro_reserva, s.fecha_servicio, s.hora_servicio, s.categoria_vehiculo,
        s.origen, s.destino, s.origen_2, s.destino_2, s.subtotal, s.detalle_espera,
        s.monto_espera, s.monto_adicionales, s.total, s.estado_servicio,
        GROUP_CONCAT(p.nombre_completo SEPARATOR ' / ') AS pasajeros_concatenados
      FROM servicios s
      LEFT JOIN pasajeros p ON s.id = p.servicio_id
      WHERE s.deleted_at IS NULL
        AND s.estado_servicio != 'Cancelado'
    `;

    const params = [];

    let periodoNombre = range_label || 'Liquidacion_Quincenal';

    if (periodo_id) {
      const [periodos] = await pool.execute(
        `SELECT id, CONCAT(anio, '-', LPAD(mes, 2, '0'), ' Q', quincena) AS periodo_nombre,
                DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
                DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_fin
         FROM periodos_liquidacion WHERE id = ?`,
        [periodo_id]
      );
      if (periodos.length > 0) {
        periodoNombre = periodos[0].periodo_nombre;
        const { fecha_inicio, fecha_fin } = periodos[0];
        if (fecha_inicio && fecha_fin) {
          query += ` AND (s.periodo_id = ? OR (s.fecha_servicio >= ? AND s.fecha_servicio <= ?))`;
          params.push(periodo_id, fecha_inicio, fecha_fin);
        } else {
          query += ` AND s.periodo_id = ?`;
          params.push(periodo_id);
        }
      } else {
        query += ` AND s.periodo_id = ?`;
        params.push(periodo_id);
      }
    } else {
      if (fecha_desde) {
        query += ` AND s.fecha_servicio >= ?`;
        params.push(fecha_desde);
      }
      if (fecha_hasta) {
        query += ` AND s.fecha_servicio <= ?`;
        params.push(fecha_hasta);
      }
    }

    if (estado && estado !== 'Cancelado') {
      query += ` AND s.estado_servicio = ?`;
      params.push(estado);
    }
    if (search) {
      query += ` AND (s.nro_reserva LIKE ? OR s.origen LIKE ? OR s.destino LIKE ? OR s.vuelo_observacion LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` GROUP BY s.id ORDER BY s.fecha_servicio ASC, s.hora_servicio ASC`;

    const [servicios] = await pool.execute(query, params);

    const excelBuffer = await generateLiquidacionExcel(servicios, { periodo_nombre: periodoNombre });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Liquidacion_Logos_MAAVYT_${periodoNombre.replace(/[\s\/\\:]+/g, '_')}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getServiciosOperativosPDF,
  getServiciosOperativosExcel,
  getHojaDeRutaPDF,
  getLiquidacionExcel
};
