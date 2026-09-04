const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Configuracion del Pool de Conexiones a MySQL (Local o Cloud con SSL)
 */
function createPoolConfig() {
  const isSsl = process.env.DB_SSL === 'true' || 
                (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=REQUIRED'));

  const baseConfig = {
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    multipleStatements: true,
    // Prevencion de caidas por timeout en routers de la nube
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 20000
  };

  // Si se provee una URL de conexion completa (ej. Railway, Aiven, TiDB)
  if (process.env.DATABASE_URL) {
    return {
      uri: process.env.DATABASE_URL,
      ...baseConfig,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined
    };
  }

  // Configuracion tradicional por variables individuales
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'maavyt_db',
    ...baseConfig,
    ssl: isSsl ? { rejectUnauthorized: false } : undefined
  };
}

const pool = mysql.createPool(createPoolConfig());

// Verificacion de conexion con registro de modo (Local / Cloud SSL)
async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    const isSsl = process.env.DB_SSL === 'true';
    const dbName = process.env.DB_NAME || 'maavyt_db';
    console.log(`[Database] Conexión exitosa a MySQL: ${dbName} (SSL: ${isSsl ? 'Activado TLS' : 'Desactivado Local'})`);
    connection.release();
    return true;
  } catch (error) {
    console.error('[Database] Error al conectar con MySQL:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  checkConnection,
  createPoolConfig
};
