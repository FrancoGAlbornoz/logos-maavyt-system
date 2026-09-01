const { loadTarifarioFromExcel, calculatePrice } = require('../services/tariffService');
const { pool } = require('../config/database');

async function runImportAndAutoPrice() {
  console.log('=== Inicializando Tarifario Oficial MAAVYT ===');
  
  // 1. Cargar Tarifario desde Excel
  const count = await loadTarifarioFromExcel();
  console.log(`[OK] Tarifario importado: ${count} registros en la tabla 'tarifario'.`);

  // 2. Recalcular precios de todos los servicios vigentes en MySQL
  console.log('\n=== Recalculando precios para todos los servicios activos ===');
  const [servicios] = await pool.execute(
    `SELECT id, nro_reserva, origen, destino, categoria_vehiculo, minutos_espera, subtotal, total FROM servicios WHERE deleted_at IS NULL`
  );

  console.log(`Servicios activos a actualizar: ${servicios.length}`);

  let updatedCount = 0;

  for (const srv of servicios) {
    const prices = await calculatePrice(srv.origen, srv.destino, srv.categoria_vehiculo, srv.minutos_espera || 0);

    await pool.execute(
      `UPDATE servicios SET subtotal = ?, monto_espera = ?, total = ? WHERE id = ?`,
      [prices.subtotal, prices.monto_espera, prices.total, srv.id]
    );

    updatedCount++;
    console.log(` -> Servicio #${srv.nro_reserva}: Subtotal $${prices.subtotal.toLocaleString('es-AR')} | Total $${prices.total.toLocaleString('es-AR')}`);
  }

  console.log(`\n¡PROCESO COMPLETADO! Se actualizaron los precios de ${updatedCount} servicios.`);
  process.exit(0);
}

runImportAndAutoPrice();
