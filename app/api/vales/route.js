import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/vales
 * Lista todos los vales de salida con su personal y bienes asociados.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const vale = await prisma.valeSalida.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          personal: {
            include: {
              departamento: true
            }
          },
          bienes: {
            include: {
              categoria: true,
              ubicacion: true
            }
          }
        }
      });
      return NextResponse.json(vale);
    }

    const vales = await prisma.valeSalida.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        personal: {
          select: {
            id: true,
            nombre: true,
            puesto: true,
            departamento: { select: { nombre: true } }
          }
        },
        bienes: {
          select: {
            id: true,
            nombre: true,
            codigo_inventario: true,
            numero_serie: true,
            icono: true
          }
        }
      }
    });

    return NextResponse.json(vales);
  } catch (error) {
    console.error('❌ Error en GET /api/vales:', error);
    return NextResponse.json({ error: 'Error al listar los vales de salida.' }, { status: 500 });
  }
}

/**
 * POST /api/vales
 * Registra un nuevo vale de salida (préstamo temporal).
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { personalId, bienesIds, fecha_estimada, motivo, observaciones } = body;

    if (!personalId) {
      return NextResponse.json({ error: 'El personal responsable es requerido.' }, { status: 400 });
    }
    if (!bienesIds || !Array.isArray(bienesIds) || bienesIds.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos un bien para la salida.' }, { status: 400 });
    }
    if (!fecha_estimada) {
      return NextResponse.json({ error: 'La fecha estimada de retorno es requerida.' }, { status: 400 });
    }
    if (!motivo) {
      return NextResponse.json({ error: 'El motivo de la salida es requerido.' }, { status: 400 });
    }

    // Generar Folio Automático
    const year = new Date().getFullYear();
    const count = await prisma.valeSalida.count({
      where: {
        folio: {
          startsWith: `VALE-${year}-`
        }
      }
    });
    const nextCorrelativo = (count + 1).toString().padStart(4, '0');
    const folio = `VALE-${year}-${nextCorrelativo}`;

    // Crear el vale y conectar los bienes
    const nuevoVale = await prisma.valeSalida.create({
      data: {
        folio,
        personalId: parseInt(personalId, 10),
        fecha_estimada: new Date(fecha_estimada),
        motivo,
        observaciones: observaciones || null,
        estado: 'PENDIENTE',
        bienes: {
          connect: bienesIds.map(id => ({ id: parseInt(id, 10) }))
        }
      },
      include: {
        personal: true,
        bienes: true
      }
    });

    return NextResponse.json(nuevoVale);
  } catch (error) {
    console.error('❌ Error en POST /api/vales:', error);
    return NextResponse.json({ error: 'Error al registrar el vale de salida.' }, { status: 500 });
  }
}

/**
 * PUT /api/vales
 * Actualiza un vale (ej. registrar retorno de bienes o editar notas).
 */
export async function PUT(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { id, registrarRetorno, observaciones, motivo, fecha_estimada } = body;

    if (!id) {
      return NextResponse.json({ error: 'El ID del vale es requerido.' }, { status: 400 });
    }

    const valeId = parseInt(id, 10);
    const valeExistente = await prisma.valeSalida.findUnique({ where: { id: valeId } });
    if (!valeExistente) {
      return NextResponse.json({ error: 'El vale de salida no existe.' }, { status: 404 });
    }

    const updateData = {};

    if (registrarRetorno) {
      updateData.fecha_retorno = new Date();
      updateData.estado = 'DEVUELTO';
    }

    if (observaciones !== undefined) {
      updateData.observaciones = observaciones;
    }
    if (motivo !== undefined) {
      updateData.motivo = motivo;
    }
    if (fecha_estimada !== undefined) {
      updateData.fecha_estimada = new Date(fecha_estimada);
    }

    const valeActualizado = await prisma.valeSalida.update({
      where: { id: valeId },
      data: updateData,
      include: {
        personal: true,
        bienes: true
      }
    });

    return NextResponse.json(valeActualizado);
  } catch (error) {
    console.error('❌ Error en PUT /api/vales:', error);
    return NextResponse.json({ error: 'Error al actualizar el vale de salida.' }, { status: 500 });
  }
}

/**
 * DELETE /api/vales
 * Elimina un vale de salida.
 */
export async function DELETE(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'El ID del vale es requerido.' }, { status: 400 });
    }

    const idInt = parseInt(id, 10);
    const vale = await prisma.valeSalida.findUnique({ where: { id: idInt } });
    if (!vale) {
      return NextResponse.json({ error: 'El vale no existe.' }, { status: 404 });
    }

    await prisma.valeSalida.delete({ where: { id: idInt } });
    return NextResponse.json({ success: true, message: 'Vale de salida eliminado con éxito.' });
  } catch (error) {
    console.error('❌ Error en DELETE /api/vales:', error);
    return NextResponse.json({ error: 'Error al eliminar el vale de salida.' }, { status: 500 });
  }
}
