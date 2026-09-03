const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/errorHandler');
const routes = require('./routes');
const setupSwagger = require('./config/swagger');
require('dotenv').config();

const app = express();

// 1. Cabeceras de seguridad HTTP con Helmet
// contentSecurityPolicy en false permite a Swagger UI renderizar sus assets locales
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// 2. Configuración de CORS estricto
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permite solicitudes sin origen (como Postman, Curl, o descargas directas) y orígenes autorizados
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Acceso bloqueado por política CORS desde origen: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Limitador de peticiones global para proteger el servidor (Anti-DoS)
const globalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 200, // Máximo 200 peticiones por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas solicitudes a la API. Por favor, espere un momento antes de reintentar.'
    }
  }
});
app.use('/api', globalApiLimiter);

// 4. Procesamiento de cuerpo JSON y URL Encoded con límite seguro
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Documentación interactiva de Swagger UI
setupSwagger(app);

// 6. Rutas de la API v1
app.use('/api/v1', routes);

// 7. Middleware centralizado de manejo de errores
app.use(errorHandler);

module.exports = app;
