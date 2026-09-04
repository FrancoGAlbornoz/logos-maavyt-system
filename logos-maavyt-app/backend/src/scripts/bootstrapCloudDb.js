const fs = require('fs');
const path = require('path');
const { pool, checkConnection } = require('../config/database');
const { loadTarifarioFromExcel } = require('../services/tariffService');
require('dotenv').config();

/**
 * Script universal de inicializacion y migracion para Cloud MySQL (Railway, Aiven, TiDB, Render)
 */
async function bootstrapCloudDb() {
  console.log('====================================================');
  console.log('  INICIALIZADOR DE BASE DE DATOS CLOUD: MAAVYT DB   ');
  console.log('====================================================\n');

  console.log('[1/4] Verificando conexion con la base de datos MySQL...');
  const isConnected = await checkConnection();
  if (!isConnected) {
    console.error('? Error fatal: No se pudo conectar a la base de datos. Verifica DB_HOST, DB_USER, DB_PASSWORD, DB_NAME o DATABASE_URL.');
    process.exit(1);
  }

  const connection = await pool.getConnection();

  try {
    console.log('\n[2/4] Leyendo y preparando script schema.sql...');
    const schemaPath = path.join(__dirname, '../../sql/schema.sql');
    let sqlScript = fs.readFileSync(schemaPath, 'utf8');

    // Si estamos en un cloud hosting (Aiven/Railway), remover comandos que requieren permisos de superusuario
    const isCloud = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' || Boolean(process.env.DATABASE_URL);
    if (isCloud) {
      console.log('  -> Detectado entorno Cloud: adaptando DDL para base de datos gestionada...');
      sqlScript = sqlScript
        .replace(/CREATE DATABASE IF NOT EXISTS[^;]+;/gi, '-- CREATE DATABASE (Gestionado por el proveedor Cloud)')
        .replace(/USE\s+[^;]+;/gi, '-- USE DB (Gestionado por el proveedor Cloud)');
    }

    console.log('  -> Ejecutando creacion de tablas, indices, vistas y semillas...');
    await connection.query(sqlScript);
    console.log('  -> ? Tablas y vistas inicializadas con exito.');

    console.log('\n[3/4] Poblando Tarifario Oficial MAAVYT...');
    const tarifarioCount = await loadTarifarioFromExcel();
    console.log(`  -> ? ${tarifarioCount} tarifas cargadas en la tabla 'tarifario'.`);

    console.log('\n[4/4] Verificando usuario administrador...');
    const [users] = await connection.execute(`SELECT id, nombre, email, rol, activo FROM usuarios WHERE email = 'admin@maavyt.com'`);
    if (users.length > 0) {
      console.log(`  -> ? Usuario administrador listo: ${users[0].email} (Rol: ${users[0].rol})`);
    }

    console.log('\n====================================================');
    console.log('  ?? ¡BASE DE DATOS CLOUD LISTA PARA PRODUCCION!   ');
    console.log('====================================================\n');

    connection.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    connection.release();
    console.error('\n? Error durante la migracion de la base de datos:', error.message);
    process.exit(1);
  }
}

bootstrapCloudDb();
