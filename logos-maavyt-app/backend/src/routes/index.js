const express = require('express');
const router = express.Router();

const serviciosRoutes = require('./serviciosRoutes');
const parserRoutes = require('./parserRoutes');
const periodosRoutes = require('./periodosRoutes');
const reportesRoutes = require('./reportesRoutes');

// Healthcheck
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Logos-MAAVYT Backend API',
    timestamp: new Date().toISOString()
  });
});

// Enrutadores principales
router.use('/servicios', serviciosRoutes);
router.use('/parser', parserRoutes);
router.use('/periodos', periodosRoutes);
router.use('/reportes', reportesRoutes);

module.exports = router;
