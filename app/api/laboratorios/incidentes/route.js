import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Crear un nuevo incidente
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { laboratorioId, titulo, descripcion, prioridad, reportadoPor, bienId, categoria } = body;

    if (!laboratorioId || !titulo || !descripcion) {
      return NextResponse.json({ error: 'El laboratorio, título y descripción son requeridos.' }, { status: 400 });
    }

    let nuevo;
    await prisma.$transaction(async (tx) => {
      nuevo = await tx.labIncidente.create({
        data: {
          laboratorioId: parseInt(laboratorioId, 10),
          titulo,
          descripcion,
          prioridad: prioridad || "MEDIA",
          categoria: categoria || null,
          reportadoPor: reportadoPor || null,
          bienId: bienId ? parseInt(bienId, 10) : null
        }
      });

      if (bienId) {
        const bId = parseInt(bienId, 10);
        // 1. Cambiar estado del equipo a Mantenimiento
        await tx.bien.update({
          where: { id: bId },
          data: { estado: 'Mantenimiento' }
        });

        // 2. Crear orden de mantenimiento correctivo
        await tx.mantenimiento.create({
          data: {
            bienId: bId,
            tipo: 'Correctivo',
            descripcion: `Incidente: ${titulo} - ${descripcion}`,
            estado: 'En proceso',
            fecha_mantenimiento: new Date(),
            incidenteId: nuevo.id
          }
        });
      }
    });

    // Cargar con las relaciones necesarias para el retorno de la API
    const resultadoFinal = await prisma.labIncidente.findUnique({
      where: { id: nuevo.id },
      include: {
        bien: {
          select: { id: true, codigo_inventario: true, marca: true, modelo: true }
        }
      }
    });

    return NextResponse.json(resultadoFinal);
  } catch (error) {
    console.error('❌ Error en POST /api/laboratorios/incidentes:', error);
    return NextResponse.json({ error: 'Error al registrar el reporte de incidente.' }, { status: 500 });
  }
}

// Resolver o actualizar estado de un incidente
export async function PUT(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { id, estado, comentarios } = body;

    if (!id || !estado) {
      return NextResponse.json({ error: 'El ID y el estado son obligatorios.' }, { status: 400 });
    }

    const data = { estado };
    if (estado === 'RESUELTO') {
      data.fechaResolucion = new Date();
    } else {
      data.fechaResolucion = null;
    }
    if (comentarios !== undefined) {
      data.comentarios = comentarios;
    }

    let actualizado;
    await prisma.$transaction(async (tx) => {
      const incidenteActual = await tx.labIncidente.findUnique({
        where: { id: parseInt(id, 10) }
      });

      if (!incidenteActual) {
        throw new Error('El reporte de incidente no existe.');
      }

      actualizado = await tx.labIncidente.update({
        where: { id: parseInt(id, 10) },
        data,
        include: {
          bien: {
            select: { id: true, codigo_inventario: true, marca: true, modelo: true }
          }
        }
      });

      if (estado === 'RESUELTO') {
        if (incidenteActual.bienId) {
          // 1. Regresar el estado de la PC a "Activo"
          await tx.bien.update({
            where: { id: incidenteActual.bienId },
            data: { estado: 'Activo' }
          });
        }

        // 2. Autocompletar mantenimientos asociados pendientes
        await tx.mantenimiento.updateMany({
          where: { incidenteId: parseInt(id, 10), estado: { in: ['Programado', 'En proceso'] } },
          data: { estado: 'Completado' }
        });
      }
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('❌ Error en PUT /api/laboratorios/incidentes:', error);
    return NextResponse.json({ error: 'Error al actualizar el reporte de incidente.' }, { status: 500 });
  }
}

// Eliminar un reporte de incidente
export async function DELETE(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'El ID es obligatorio.' }, { status: 400 });
    }

    await prisma.labIncidente.delete({
      where: { id: parseInt(id, 10) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error en DELETE /api/laboratorios/incidentes:', error);
    return NextResponse.json({ error: 'Error al eliminar el reporte de incidente.' }, { status: 500 });
  }
}
