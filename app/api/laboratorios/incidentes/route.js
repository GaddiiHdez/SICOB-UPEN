import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Crear un nuevo incidente
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { laboratorioId, titulo, descripcion, prioridad, reportadoPor, bienId } = body;

    if (!laboratorioId || !titulo || !descripcion) {
      return NextResponse.json({ error: 'El laboratorio, título y descripción son requeridos.' }, { status: 400 });
    }

    const nuevo = await prisma.labIncidente.create({
      data: {
        laboratorioId: parseInt(laboratorioId, 10),
        titulo,
        descripcion,
        prioridad: prioridad || "MEDIA",
        reportadoPor: reportadoPor || null,
        bienId: bienId ? parseInt(bienId, 10) : null
      },
      include: {
        bien: {
          select: { id: true, codigo_inventario: true, marca: true, modelo: true }
        }
      }
    });

    return NextResponse.json(nuevo);
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

    const actualizado = await prisma.labIncidente.update({
      where: { id: parseInt(id, 10) },
      data,
      include: {
        bien: {
          select: { id: true, codigo_inventario: true, marca: true, modelo: true }
        }
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
