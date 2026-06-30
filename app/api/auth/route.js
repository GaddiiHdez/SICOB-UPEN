import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword, signToken, verifyToken } from '@/lib/auth';

/**
 * GET /api/auth
 * Verifica si la sesión está activa decodificando el token en la cookie.
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('gdi_token='))
      ?.split('=')[1];

    if (!token) {
      return NextResponse.json({ authenticated: false, usuario: null });
    }

    const decoded = verifyToken(token);
    return NextResponse.json({ authenticated: true, usuario: decoded });
  } catch (error) {
    return NextResponse.json({ authenticated: false, usuario: null });
  }
}

/**
 * POST /api/auth
 * Inicia sesión con correo y contraseña.
 * Retorna un JWT en una cookie httpOnly y en el cuerpo de la respuesta.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { correo, password } = body;

    // Validar que vengan los campos requeridos
    if (!correo || !password) {
      return NextResponse.json(
        { error: 'El correo y la contraseña son obligatorios.' },
        { status: 400 }
      );
    }

    const normalizedCorreo = correo.trim().toLowerCase();

    // Buscar el usuario en la base de datos
    const usuario = await prisma.usuario.findUnique({ where: { correo: normalizedCorreo } });

    if (!usuario) {
      // Respuesta genérica: no revelar si el correo existe o no (seguridad)
      return NextResponse.json(
        { error: 'Correo o contraseña incorrectos.' },
        { status: 401 }
      );
    }

    // Comparar la contraseña usando bcrypt (compara texto plano vs hash almacenado)
    const passwordValida = await verifyPassword(password, usuario.password_hash);

    if (!passwordValida) {
      return NextResponse.json(
        { error: 'Correo o contraseña incorrectos.' },
        { status: 401 }
      );
    }

    // Generar el token JWT con los datos no sensibles del usuario (duración de 7 días)
    const tokenPayload = {
      id:     usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol:    usuario.rol,
    };
    const token = signToken(tokenPayload, '7d');

    // Construir la respuesta con los datos del usuario (sin contraseña)
    const response = NextResponse.json({
      success: true,
      usuario: tokenPayload,
      token,  // también en el cuerpo para que el frontend pueda guardarlo si necesita
    });

    // Guardar el token en una cookie httpOnly (más segura que localStorage)
    // httpOnly: el JS del navegador no puede leerla directamente
    // sameSite: 'lax' protege contra ataques CSRF básicos
    response.cookies.set('gdi_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 24 * 7, // 7 días en segundos
      // secure: true  ← descomentar cuando se use HTTPS en producción
    });

    return response;
  } catch (error) {
    console.error('❌ Error en POST /api/auth:', error);
    console.error('🔗 DATABASE_URL:', process.env.DATABASE_URL);
    return NextResponse.json(
      { error: 'Error interno en el servidor de autenticación.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth
 * Cierra la sesión eliminando la cookie del token.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Sesión cerrada.' });
  response.cookies.set('gdi_token', '', { maxAge: 0, path: '/' });
  return response;
}
