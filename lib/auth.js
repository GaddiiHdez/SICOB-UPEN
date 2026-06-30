/**
 * lib/auth.js
 * Helpers centralizados de seguridad para GDI UPEN.
 * - Hash y verificación de contraseñas con bcryptjs
 * - Emisión y verificación de JWT para sesiones
 * - Wrapper requireAuth() para proteger endpoints de API
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

// ── Configuración ──────────────────────────────────────────────
const JWT_SECRET  = process.env.JWT_SECRET;
const SALT_ROUNDS = 12; // coste del hash; 12 es el estándar de producción

// ── Hash de contraseñas ────────────────────────────────────────

/**
 * Genera el hash seguro de una contraseña en texto plano.
 * Usar al CREAR o CAMBIAR contraseña de un usuario.
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compara una contraseña en texto plano contra un hash almacenado.
 * Retorna true si coinciden, false si no.
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ── JSON Web Tokens ────────────────────────────────────────────

/**
 * Genera un JWT firmado con la clave secreta del servidor.
 * @param {object} payload - Datos del usuario (id, nombre, correo, rol)
 * @param {string} expiresIn - Tiempo de expiración, ej. '8h', '1d'
 */
export function signToken(payload, expiresIn = '8h') {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET no está definido en las variables de entorno.');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verifica y decodifica un JWT.
 * Lanza un error si el token es inválido o ha expirado.
 */
export function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET no está definido en las variables de entorno.');
  }
  return jwt.verify(token, JWT_SECRET);
}

// ── Protección de endpoints ────────────────────────────────────

/**
 * Middleware de autorización para rutas de API.
 *
 * Uso en cualquier route.js:
 *   const { user, errorResponse } = await requireAuth(request);
 *   if (errorResponse) return errorResponse;
 *   // ... lógica protegida usando `user.id`, `user.rol`, etc.
 *
 * Acepta el token en dos formas:
 *   1. Cookie "gdi_token" (recomendado para browser)
 *   2. Header "Authorization: Bearer <token>" (para clientes externos)
 */
export async function requireAuth(request) {
  // 0. Ruta rápida: leer usuario pre-verificado inyectado por el proxy
  const proxyPayload = request.headers.get('x-user-payload');
  if (proxyPayload) {
    try {
      const user = JSON.parse(proxyPayload);
      return { user, errorResponse: null };
    } catch {
      // Si el header está corrupto, caer al flujo normal
    }
  }

  // 1. Intentar leer desde la cookie httpOnly
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieToken = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('gdi_token='))
    ?.split('=')[1];

  // 2. Intentar leer desde el header Authorization como fallback
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const token = cookieToken || bearerToken;

  if (!token) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'No autorizado. Por favor, inicia sesión.' },
        { status: 401 }
      ),
    };
  }

  try {
    const user = verifyToken(token);
    return { user, errorResponse: null };
  } catch {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Sesión inválida o expirada. Por favor, inicia sesión de nuevo.' },
        { status: 401 }
      ),
    };
  }
}
