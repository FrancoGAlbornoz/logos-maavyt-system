const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });
  
  const [servicios] = await connection.execute('SELECT s.id, c.nombre AS cliente_nombre FROM servicios s LEFT JOIN clientes c ON s.cliente_id = c.id LIMIT 10');
  console.log(servicios);
  await connection.end();
}
run();
