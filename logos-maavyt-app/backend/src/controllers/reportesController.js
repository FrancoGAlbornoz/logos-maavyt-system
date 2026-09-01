const { pool } = require('../config/database');
const { generateHojaDeRutaPDF } = require('../services/pdfGeneratorService');
const { generateLiquidacionExcel } = require('../services/excelGeneratorService');

/**
 * Descargar Hoja de Ruta Operativa en PDF A4 Horizontal
 */
async function getHojaDeRutaPDF(req, res, next) {
  try {
    const { periodo_id, fecha_desde, fecha_hasta, conductor_id } = req.query;

    let query = `
      SELECT 
        s.id, s.nro_reserva, s.fecha_servicio, s.hora_servicio, s.categoria_vehiculo,
        s.origen, s.destino, s.vuelo_observacion, s.detalle_espera, s.estado_servicio,
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
      WHERE s.estado_servicio != 'Cancelado'
    `;

    const params = [];

    if (periodo_id) {
      query += ` AND s.periodo_id = ?`;
      params.push(periodo_id);
    }
    if (fecha_desde) {
      query += ` AND s.fecha_servicio >= ?`;
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      query += ` AND s.fecha_servicio <= ?`;
      params.push(fecha_hasta);
    }
    if (conductor_id) {
      query += ` AND s.conductor_id = ?`;
      params.push(conductor_id);
    }

    query += ` GROUP BY s.id ORDER BY s.fecha_servicio ASC, s.hora_servicio ASC`;

    const [servicios] = await pool.execute(query, params);

    const pdfBuffer = await generateHojaDeRutaPDF(servicios, {
      conductor: 'Miguel Ángel Albornoz (Unidad 430)'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Hoja_de_Ruta_MAAVYT_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

/**
 * Descargar Liquidación Quincenal en Excel (.xlsx)
 */
async function getLiquidacionExcel(req, res, next) {
  try {
    const { periodo_id } = req.query;

    let query = `
      SELECT 
        s.id, s.nro_reserva, s.fecha_servicio, s.hora_servicio, s.categoria_vehiculo,
        s.origen, s.destino, s.subtotal, s.monto_espera, s.monto_adicionales, s.total,
        s.estado_servicio,
        GROUP_CONCAT(p.nombre_completo SEPARATOR ' / ') AS pasajeros_concatenados
      FROM servicios s
      LEFT JOIN pasajeros p ON s.id = p.servicio_id
      WHERE 1=1
    `;

    const params = [];

    if (periodo_id) {
      query += ` AND s.periodo_id = ?`;
      params.push(periodo_id);
    }

    query += ` GROUP BY s.id ORDER BY s.fecha_servicio ASC, s.hora_servicio ASC`;

    const [servicios] = await pool.execute(query, params);

    let periodoNombre = 'Global';
    if (periodo_id) {
      const [periodos] = await pool.execute(
        `SELECT CONCAT(anio, '-', LPAD(mes, 2, '0'), ' Q', quincena) AS periodo_nombre FROM periodos_liquidacion WHERE id = ?`,
        [periodo_id]
      );
      if (periodos.length > 0) {
        periodoNombre = periodos[0].periodo_nombre;
      }
    }

    const excelBuffer = await generateLiquidacionExcel(servicios, { periodo_nombre: periodoNombre });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Liquidacion_Logos_MAAVYT_${periodoNombre.replace(/\s+/g, '_')}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHojaDeRutaPDF,
  getLiquidacionExcel
};
