const { pool } = require('../config/database');

async function cleanAugust() {
  console.log('--- Eliminando servicios anteriores a 01/09/2026 en MySQL ---');
  const [res] = await pool.execute(`DELETE FROM servicios WHERE fecha_servicio < '2026-09-01' AND id > 1`);
  console.log('Servicios anteriores a 01/09/2026 eliminados:', res.affectedRows);

  const [remaining] = await pool.execute(`SELECT id, nro_reserva, fecha_servicio, hora_servicio, origen, destino FROM servicios WHERE fecha_servicio >= '2026-09-01'`);
  console.log('Servicios vigentes desde 01/09/2026 en adelante:', remaining.length);

  process.exit(0);
}

cleanAugust();
