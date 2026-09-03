const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Rate limiting específico para login: previene ataques de fuerza bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos por IP
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiados intentos fallidos de inicio de sesión desde esta IP. Por favor intente nuevamente en 15 minutos.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión y obtener token JWT
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@maavyt.com
 *               password:
 *                 type: string
 *                 example: AdminMaavyt2026!
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso con token emitido
 *       401:
 *         description: Credenciales incorrectas
 */
router.post('/login', loginLimiter, authController.login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Obtener datos del usuario logueado actualmente
 *     tags:
 *       - Autenticación
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil de usuario recuperado
 *       401:
 *         description: Token inválido o expirado
 */
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
