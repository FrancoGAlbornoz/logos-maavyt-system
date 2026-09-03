const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { pool } = require('../config/database');
require('dotenv').config();

const loginSchema = z.object({
  email: z.string().email('Formato de correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe contener al menos 6 caracteres')
});

/**
 * Autenticación de usuarios y emisión de JWT
 */
async function login(req, res, next) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    const [users] = await pool.execute(
      `SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = ? LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Credenciales inválidas. Verifica tu correo y contraseña.'
        }
      });
    }

    const user = users[0];

    if (!user.activo) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_DISABLED',
          message: 'Tu cuenta ha sido desactivada. Comunícate con el administrador.'
        }
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Credenciales inválidas. Verifica tu correo y contraseña.'
        }
      });
    }

    // Actualizar fecha de último login
    await pool.execute(`UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?`, [user.id]);

    // Generar Token JWT firmado
    const secret = process.env.JWT_SECRET || 'maavyt_super_secure_jwt_secret_key_2026_x99';
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

    const tokenPayload = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    };

    const token = jwt.sign(tokenPayload, secret, { expiresIn });

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        token,
        user: tokenPayload
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors.map(e => e.message).join(', ')
        }
      });
    }
    next(error);
  }
}

/**
 * Obtener perfil del usuario actualmente autenticado
 */
async function getMe(req, res, next) {
  try {
    const [users] = await pool.execute(
      `SELECT id, nombre, email, rol, activo, ultimo_login, created_at FROM usuarios WHERE id = ? LIMIT 1`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' }
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  getMe
};
