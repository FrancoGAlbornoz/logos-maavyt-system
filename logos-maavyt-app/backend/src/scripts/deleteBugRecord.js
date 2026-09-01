const { pool } = require('../config/database');

async function deleteBugRecord() {
  console.log('--- Eliminando registro erróneo #48185 ---');
  const [res] = await pool.execute(`DELETE FROM servicios WHERE nro_reserva = '48185' OR origen = 'A definir' AND total = 0`);
  console.log('Registros erróneos eliminados:', res.affectedRows);
  process.exit(0);
}

deleteBugRecord();
