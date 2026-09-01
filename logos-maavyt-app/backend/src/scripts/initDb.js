const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDb() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';

  console.log(`[DB Init] Conectando a MySQL en ${host}:${port} como ${user}...`);

  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });

    const schemaPath = path.join(__dirname, '../../sql/schema.sql');
    const sqlScript = fs.readFileSync(schemaPath, 'utf8');

    console.log('[DB Init] Ejecutando script schema.sql...');
    await connection.query(sqlScript);

    console.log('[DB Init] ¡Base de datos maavyt_db, tablas, vistas y semillas inicializados exitosamente!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('[DB Init] Error al inicializar la base de datos:', error);
    process.exit(1);
  }
}

initDb();
