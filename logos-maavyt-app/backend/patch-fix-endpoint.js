const fs = require('fs');

// 1. Add fix-db function to gmailController.js
let controllerContent = fs.readFileSync('src/controllers/gmailController.js', 'utf8');

const fixFunction = `
async function fixDatabaseClients(req, res, next) {
  try {
    const { pool } = require('../config/database');
    const connection = await pool.getConnection();
    
    // Rename Logos Travel to Logos Traslados
    await connection.execute("UPDATE clientes SET nombre = 'Logos Traslados' WHERE id = 1");
    
    // Find Miguel Angel Albornoz VyT and reassign to 1
    const [rows] = await connection.execute("SELECT id, nombre FROM clientes WHERE nombre LIKE '%Miguel Angel%' OR nombre LIKE '%Logos Travel%'");
    for (let r of rows) {
      if (r.id !== 1) {
        await connection.execute("UPDATE servicios SET cliente_id = 1 WHERE cliente_id = ?", [r.id]);
        await connection.execute("DELETE FROM clientes WHERE id = ?", [r.id]);
      }
    }
    
    connection.release();
    res.json({ success: true, message: 'Base de datos de clientes limpiada exitosamente.' });
  } catch (err) {
    next(err);
  }
}
`;

if (!controllerContent.includes('fixDatabaseClients')) {
  controllerContent = controllerContent.replace('module.exports = {', fixFunction + '\nmodule.exports = {\n  fixDatabaseClients,');
  fs.writeFileSync('src/controllers/gmailController.js', controllerContent, 'utf8');
}

// 2. Add route to gmailRoutes.js
let routeContent = fs.readFileSync('src/routes/gmailRoutes.js', 'utf8');
if (!routeContent.includes('fixDatabaseClients')) {
  routeContent = routeContent.replace('const { syncGmail } = require(\'../controllers/gmailController\');', 'const { syncGmail, fixDatabaseClients } = require(\'../controllers/gmailController\');');
  routeContent = routeContent.replace('router.post(\'/sync\', syncGmail);', 'router.post(\'/sync\', syncGmail);\nrouter.get(\'/fix-db\', fixDatabaseClients);');
  fs.writeFileSync('src/routes/gmailRoutes.js', routeContent, 'utf8');
}

console.log('Added /api/v1/gmail/fix-db endpoint');
