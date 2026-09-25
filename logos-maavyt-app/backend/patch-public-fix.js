const fs = require('fs');

let indexContent = fs.readFileSync('src/routes/index.js', 'utf8');

const publicFixRoute = `
// Temporary public fix route
router.get('/fix-db', async (req, res, next) => {
  try {
    const { pool } = require('../config/database');
    const connection = await pool.getConnection();
    
    await connection.execute("UPDATE clientes SET nombre = 'Logos Traslados' WHERE id = 1");
    
    const [rows] = await connection.execute("SELECT id, nombre FROM clientes WHERE nombre LIKE '%Miguel Angel%' OR nombre LIKE '%Logos Travel%'");
    for (let r of rows) {
      if (r.id !== 1) {
        await connection.execute("UPDATE servicios SET cliente_id = 1 WHERE cliente_id = ?", [r.id]);
        await connection.execute("DELETE FROM clientes WHERE id = ?", [r.id]);
      }
    }
    
    connection.release();
    res.json({ success: true, message: '¡Limpio! Ya puedes recargar el frontend.' });
  } catch (err) {
    next(err);
  }
});
`;

if (!indexContent.includes("router.get('/fix-db'")) {
  indexContent = indexContent.replace(
    "module.exports = router;",
    publicFixRoute + "\nmodule.exports = router;"
  );
  fs.writeFileSync('src/routes/index.js', indexContent, 'utf8');
}
