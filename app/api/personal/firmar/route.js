import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/personal/firmar
 * Registra la firma digitalizada en Base64 para todas las asignaciones activas de un custodio.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { personalId, firma } = body;

    if (!personalId) {
      return NextResponse.json({ error: 'El ID del personal es requerido.' }, { status: 400 });
    }
    if (!firma) {
      return NextResponse.json({ error: 'El dibujo o datos de la firma son obligatorios.' }, { status: 400 });
    }

    const idInt = parseInt(personalId, 10);

    // Actualizar todas las asignaciones activas (sin fecha de retorno) de este custodio con su firma
    const actualizados = await prisma.asignacion.updateMany({
      where: {
        personalId: idInt,
        fecha_retorno: null
      },
      data: {
        firma: firma
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Se estamparon y guardaron ${actualizados.count} firmas activas para el custodio.`,
      count: actualizados.count 
    });
  } catch (error) {
    console.error('❌ Error en POST /api/personal/firmar:', error);
    return NextResponse.json({ error: 'Error al registrar la firma digital del custodio.' }, { status: 500 });
  }
}
