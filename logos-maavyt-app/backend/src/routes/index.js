const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const serviciosRoutes = require('./serviciosRoutes');
const parserRoutes = require('./parserRoutes');
const periodosRoutes = require('./periodosRoutes');
const reportesRoutes = require('./reportesRoutes');
const gmailRoutes = require('./gmailRoutes');
const { verifyToken } = require('../middlewares/authMiddleware');

// Healthcheck p�blico
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Logos-MAAVYT Backend API',
    timestamp: new Date().toISOString()
  });
});

// Rutas de Autenticaci�n (Login p�blico, /me protegido)
router.use('/auth', authRoutes);

// Rutas Privadas del Negocio (Protegidas con JWT)
router.use('/servicios', verifyToken, serviciosRoutes);
router.use('/parser', verifyToken, parserRoutes);
router.use('/periodos', verifyToken, periodosRoutes);
router.use('/reportes', verifyToken, reportesRoutes);
router.use('/gmail', verifyToken, gmailRoutes);


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

module.exports = router;
