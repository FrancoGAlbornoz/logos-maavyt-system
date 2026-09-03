const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const serviciosRoutes = require('./serviciosRoutes');
const parserRoutes = require('./parserRoutes');
const periodosRoutes = require('./periodosRoutes');
const reportesRoutes = require('./reportesRoutes');
const gmailRoutes = require('./gmailRoutes');
const { verifyToken } = require('../middlewares/authMiddleware');

// Healthcheck público
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Logos-MAAVYT Backend API',
    timestamp: new Date().toISOString()
  });
});

// Rutas de Autenticación (Login público, /me protegido)
router.use('/auth', authRoutes);

// Rutas Privadas del Negocio (Protegidas con JWT)
router.use('/servicios', verifyToken, serviciosRoutes);
router.use('/parser', verifyToken, parserRoutes);
router.use('/periodos', verifyToken, periodosRoutes);
router.use('/reportes', verifyToken, reportesRoutes);
router.use('/gmail', verifyToken, gmailRoutes);

module.exports = router;
