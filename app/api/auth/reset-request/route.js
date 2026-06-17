import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/auth/reset-request
 * Solo accesible por ADMINISTRADOR.
 * Genera un token de 6 dígitos para restablecer la contraseña de un usuario
 * y lo devuelve en la respuesta para que el admin lo comparta manualmente.
 */
export async function POST(request) {
  // Solo admins pueden generar tokens de restablecimiento
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  if (user.rol !== 'ADMINISTRADOR') {
    return NextResponse.json(
      { error: 'Solo los administradores pueden generar códigos de restablecimiento.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { correo } = body;

    if (!correo) {
      return NextResponse.json(
        { error: 'El correo es obligatorio.' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const usuario = await prisma.usuario.findUnique({ where: { correo } });
    if (!usuario) {
      return NextResponse.json(
        { error: 'No existe un usuario con ese correo.' },
        { status: 404 }
      );
    }

    // Invalidar tokens previos no usados del mismo correo
    await prisma.passwordReset.updateMany({
      where: { correo, usado: false },
      data: { usado: true },
    });

    // Generar token de 6 dígitos
    const token = String(Math.floor(100000 + Math.random() * 900000));

    // Expira en 30 minutos
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordReset.create({
      data: { correo, token, expiresAt },
    });

    console.log(`🔑 Token de restablecimiento generado por ${user.correo} para ${correo}: ${token}`);

    return NextResponse.json({
      success: true,
      token,
      correo,
      nombreUsuario: usuario.nombre,
      expiresAt: expiresAt.toISOString(),
      mensaje: `Comparte este código con ${usuario.nombre}. Es válido por 30 minutos.`,
    });
  } catch (error) {
    console.error('❌ Error en POST /api/auth/reset-request:', error);
    return NextResponse.json(
      { error: 'Error interno al generar el código de restablecimiento.' },
      { status: 500 }
    );
  }
}
