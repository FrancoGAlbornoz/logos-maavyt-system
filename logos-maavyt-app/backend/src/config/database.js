const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'maavyt_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

// Prueba rápida de conexión
async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Conexión exitosa a MySQL: ${process.env.DB_NAME || 'maavyt_db'}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('[Database] Error al conectar con MySQL:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  checkConnection
};
