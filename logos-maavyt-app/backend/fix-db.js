const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  // Rename Logos Travel to Logos Traslados
  await connection.execute("UPDATE clientes SET nombre = 'Logos Traslados' WHERE id = 1");
  
  // Find Miguel Angel Albornoz VyT and reassign to 1
  const [rows] = await connection.execute("SELECT id FROM clientes WHERE nombre LIKE '%Miguel Angel Albornoz%'");
  for (let r of rows) {
    if (r.id !== 1) {
      await connection.execute("UPDATE servicios SET cliente_id = 1 WHERE cliente_id = ?", [r.id]);
      await connection.execute("DELETE FROM clientes WHERE id = ?", [r.id]);
    }
  }

  // Also rename anything that shouldn't be there
  const [all] = await connection.execute("SELECT id, nombre FROM clientes");
  console.log("Clientes actuales:", all);

  await connection.end();
}
fixDb();
