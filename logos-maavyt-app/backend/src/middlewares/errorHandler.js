// Middleware global de manejo de errores
function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      details: err.details || null,
      code: err.code || 'INTERNAL_SERVER_ERROR'
    }
  });
}

module.exports = errorHandler;
