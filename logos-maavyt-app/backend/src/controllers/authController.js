const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { pool } = require('../config/database');
require('dotenv').config();

const loginSchema = z.object({
  email: z.string().email('Formato de correo electronico invalido'),
  password: z.string().min(6, 'La contrasena debe contener al menos 6 caracteres')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contrasena actual es requerida'),
  newPassword: z.string().min(8, 'La nueva contrasena debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'La confirmacion de la contrasena es requerida')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contrasenas no coinciden',
  path: ['confirmPassword']
});

/**
 * Autenticacion de usuarios y emision de JWT
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
          message: 'Credenciales invalidas. Verifica tu correo y contrasena.'
        }
      });
    }

    const user = users[0];

    if (!user.activo) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_DISABLED',
          message: 'Tu cuenta ha sido desactivada. Comunicate con el administrador.'
        }
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Credenciales invalidas. Verifica tu correo y contrasena.'
        }
      });
    }

    // Actualizar fecha de ultimo login
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
      message: 'Inicio de sesion exitoso',
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

/**
 * Cambio de contrasena para el usuario autenticado
 */
async function changePassword(req, res, next) {
  try {
    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;
    const userId = req.user.id;

    // Buscar hash actual del usuario
    const [users] = await pool.execute(
      `SELECT id, password_hash FROM usuarios WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Usuario no encontrado'
        }
      });
    }

    const user = users[0];

    // Verificar que la contrasena actual ingresada coincida con el hash almacenado
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'La contrasena actual ingresada es incorrecta.'
        }
      });
    }

    // Hashear la nueva contrasena con salt de 10 rondas
    const saltRounds = 10;
    const newHash = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar en base de datos
    await pool.execute(
      `UPDATE usuarios SET password_hash = ? WHERE id = ?`,
      [newHash, userId]
    );

    res.json({
      success: true,
      message: 'Contrasena actualizada exitosamente'
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

module.exports = {
  login,
  getMe,
  changePassword
};