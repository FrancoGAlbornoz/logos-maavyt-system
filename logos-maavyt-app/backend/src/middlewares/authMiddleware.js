const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware para proteger rutas de la API verificando el Token JWT
 * Soporta tanto cabecera Authorization (Bearer) como query param (?token=...) para descargas directas de PDFs/Excel.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Acceso denegado. Token de autorización no proporcionado o formato inválido.'
      }
    });
  }

  const secret = process.env.JWT_SECRET || 'maavyt_super_secure_jwt_secret_key_2026_x99';

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { id, email, nombre, rol, iat, exp }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token de autenticación inválido o manipulado.'
      }
    });
  }
}

/**
 * Middleware para restringir por roles (ej. solo ADMIN)
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.rol !== role) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Acceso restringido. Se requiere rol: ${role}.`
        }
      });
    }
    next();
  };
}

module.exports = {
  verifyToken,
  requireRole
};
