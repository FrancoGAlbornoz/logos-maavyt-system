const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
const routes = require('./routes');
const setupSwagger = require('./config/swagger');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Documentación de Swagger
setupSwagger(app);

// Rutas base API
app.use('/api/v1', routes);

// Middleware de manejo de errores
app.use(errorHandler);

module.exports = app;
