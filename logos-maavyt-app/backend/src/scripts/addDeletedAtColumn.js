const { pool } = require('../config/database');

async function applyMigration() {
  console.log('--- Aplicando migración de borrado lógico (deleted_at) a MySQL ---');
  
  try {
    // 1. Agregar columna deleted_at si no existe
    const [cols] = await pool.execute(`SHOW COLUMNS FROM servicios LIKE 'deleted_at'`);
    if (cols.length === 0) {
      await pool.execute(`ALTER TABLE servicios ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER observaciones_internas`);
      await pool.execute(`ALTER TABLE servicios ADD INDEX idx_deleted_at (deleted_at)`);
      console.log('Columna deleted_at e índice agregados a la tabla servicios.');
    } else {
      console.log('La columna deleted_at ya existía en la tabla servicios.');
    }

    // 2. Actualizar vistas
    await pool.execute(`
      CREATE OR REPLACE VIEW vista_hoja_de_ruta AS
      SELECT 
          s.id AS servicio_id,
          s.nro_reserva,
          s.categoria_vehiculo,
          s.fecha_servicio,
          s.hora_servicio,
          GROUP_CONCAT(
              CASE 
                  WHEN p.documento_o_referencia IS NOT NULL AND p.documento_o_referencia != '' 
                  THEN CONCAT(p.documento_o_referencia, ' - ', p.nombre_completo)
                  ELSE p.nombre_completo 
              END 
              SEPARATOR ' / '
          ) AS pasajeros_concatenados,
          s.origen,
          s.destino,
          s.vuelo_observacion,
          s.detalle_espera,
          s.estado_servicio,
          c.nombre AS conductor_nombre,
          v.numero_unidad
      FROM servicios s
      LEFT JOIN pasajeros p ON s.id = p.servicio_id
      LEFT JOIN conductores c ON s.conductor_id = c.id
      LEFT JOIN vehiculos v ON s.vehiculo_id = v.id
      WHERE s.deleted_at IS NULL
      GROUP BY s.id
      ORDER BY s.fecha_servicio ASC, s.hora_servicio ASC
    `);

    await pool.execute(`
      CREATE OR REPLACE VIEW vista_liquidacion_quincenal AS
      SELECT 
          pl.id AS periodo_id,
          CONCAT(pl.anio, '-', LPAD(pl.mes, 2, '0'), ' Q', pl.quincena) AS periodo_nombre,
          COUNT(CASE WHEN s.deleted_at IS NULL THEN s.id END) AS total_servicios,
          SUM(CASE WHEN s.deleted_at IS NULL AND s.estado_servicio != 'Cancelado' THEN s.subtotal ELSE 0 END) AS total_subtotal,
          SUM(CASE WHEN s.deleted_at IS NULL AND s.estado_servicio != 'Cancelado' THEN s.monto_espera ELSE 0 END) AS total_esperas,
          SUM(CASE WHEN s.deleted_at IS NULL AND s.estado_servicio != 'Cancelado' THEN s.monto_adicionales ELSE 0 END) AS total_adicionales,
          SUM(CASE WHEN s.deleted_at IS NULL AND s.estado_servicio != 'Cancelado' THEN s.total ELSE 0 END) AS total_general
      FROM periodos_liquidacion pl
      LEFT JOIN servicios s ON pl.id = s.periodo_id
      GROUP BY pl.id
      ORDER BY pl.anio DESC, pl.mes DESC, pl.quincena DESC
    `);

    console.log('Vistas vista_hoja_de_ruta y vista_liquidacion_quincenal actualizadas.');
    process.exit(0);
  } catch (error) {
    console.error('Error al aplicar la migración:', error);
    process.exit(1);
  }
}

applyMigration();
