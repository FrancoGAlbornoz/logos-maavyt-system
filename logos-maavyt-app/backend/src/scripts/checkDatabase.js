const { pool } = require('../config/database');

async function checkAndCleanDb() {
  console.log('--- Revisando servicios en MySQL ---');
  const [rows] = await pool.execute(`SELECT id, nro_reserva, fecha_servicio, origen, destino, observaciones_internas FROM servicios`);
  console.log('Total de servicios en DB:', rows.length);
  console.log('Lista:', JSON.stringify(rows, null, 2));

  // Eliminar servicios si hay alguno con N° Reserva S/N o datos no válidos de mails personales
  const [delRes] = await pool.execute(`DELETE FROM servicios WHERE nro_reserva = 'S/N' OR observaciones_internas NOT LIKE '%MAAVYT%' AND observaciones_internas NOT LIKE '%Logos%' AND id > 1`);
  console.log('Servicios no válidos eliminados:', delRes.affectedRows);

  process.exit(0);
}

checkAndCleanDb();
