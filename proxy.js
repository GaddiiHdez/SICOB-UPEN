/**
 * proxy.js — Protección global de rutas API (Next.js 16+)
 *
 * En Next.js 16, "Middleware" se renombró a "Proxy".
 * La funcionalidad es idéntica — solo cambia el nombre del archivo
 * y el export: `proxy` en lugar de `middleware`.
 *
 * Este archivo intercepta TODAS las peticiones a /api/* y verifica
 * que haya un JWT válido antes de dejarlas pasar.
 *
 * Rutas públicas (sin autenticación):
 *   - POST /api/auth  → login
 */

import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Rutas que NO requieren autenticación
const RUTAS_PUBLICAS = [
  { path: '/api/auth', methods: ['POST'] },
  { path: '/api/bienes/auto-registrar', methods: ['POST'] },
];

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  console.log(`[Proxy Request] Path: ${pathname}, Method: ${request.method}`);

  // Solo aplica a rutas /api/
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ¿Es una ruta pública?
  const esPublica = RUTAS_PUBLICAS.some(
    r => pathname === r.path && r.methods.includes(request.method)
  );
  console.log(`[Proxy Request] Path: ${pathname}, Public: ${esPublica}`);
  if (esPublica) return NextResponse.next();

  // Leer token desde cookie httpOnly o header Authorization
  const cookieToken = request.cookies.get('gdi_token')?.value;
  const authHeader  = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token       = cookieToken || bearerToken;

  if (!token) {
    return NextResponse.json(
      { error: 'No autorizado. Por favor, inicia sesión.' },
      { status: 401 }
    );
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Inyectar datos del usuario verificado en los headers para que
    // los route handlers los lean sin re-verificar el JWT.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-payload', JSON.stringify(payload));
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    return NextResponse.json(
      { error: 'Sesión inválida o expirada. Por favor, inicia sesión de nuevo.' },
      { status: 401 }
    );
  }
}

// Rutas donde este proxy se activa
export const config = {
  matcher: '/api/:path*',
};
