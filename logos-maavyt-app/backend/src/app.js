const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/errorHandler');
const routes = require('./routes');
const setupSwagger = require('./config/swagger');
require('dotenv').config();

const app = express();

// Confiar en el proxy de Render para resolver IPs detras de X-Forwarded-For
app.set('trust proxy', 1);

// 1. Cabeceras de seguridad HTTP con Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// 2. Configuracion de CORS estricto y resiliente para produccion
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://logos-maavyt-system.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
].filter(Boolean).map(url => url.replace(/\/$/, ''));

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir solicitudes sin origen (Postman, server-to-server, curl)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');

    // Permitir origenes configurados o cualquier despliegue de Vercel del proyecto
    const isAllowed = allowedOrigins.includes(normalizedOrigin) || 
                      /^https:\/\/logos-maavyt-system.*\.vercel\.app$/.test(normalizedOrigin);

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn('[CORS Blocked] Origen bloqueado:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 3. Limitador de peticiones global (Anti-DoS)
const globalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas solicitudes a la API. Por favor, espere un momento antes de reintentar.'
    }
  }
});
app.use('/api', globalApiLimiter);

// 4. Procesamiento de cuerpo JSON y URL Encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Documentacion Swagger UI
setupSwagger(app);

// 6. Rutas de la API v1
app.use('/api/v1', routes);

// 7. Middleware centralizado de manejo de errores
app.use(errorHandler);

module.exports = app;