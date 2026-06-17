import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth';

/**
 * POST /api/auth/reset-confirm
 * Ruta pública — el usuario aún no está autenticado.
 * Valida el token de restablecimiento y actualiza la contraseña.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { correo, token, nuevaPassword } = body;

    if (!correo || !token || !nuevaPassword) {
      return NextResponse.json(
        { error: 'Correo, código y nueva contraseña son obligatorios.' },
        { status: 400 }
      );
    }

    if (nuevaPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    // Buscar el token más reciente válido para ese correo
    const resetRecord = await prisma.passwordReset.findFirst({
      where: { correo, token, usado: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: 'Código inválido o ya fue utilizado.' },
        { status: 400 }
      );
    }

    // Verificar que no haya expirado
    if (new Date() > resetRecord.expiresAt) {
      return NextResponse.json(
        { error: 'El código ha expirado. Solicita uno nuevo al administrador.' },
        { status: 400 }
      );
    }

    // Actualizar contraseña y marcar token como usado en una transacción
    const nuevoHash = await hashPassword(nuevaPassword);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { correo },
        data: { password_hash: nuevoHash },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usado: true },
      }),
    ]);

    console.log(`✅ Contraseña restablecida exitosamente para: ${correo}`);

    return NextResponse.json({
      success: true,
      mensaje: 'Contraseña restablecida correctamente. Ahora puedes iniciar sesión.',
    });
  } catch (error) {
    console.error('❌ Error en POST /api/auth/reset-confirm:', error);
    return NextResponse.json(
      { error: 'Error interno al restablecer la contraseña.' },
      { status: 500 }
    );
  }
}
