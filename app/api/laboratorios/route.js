import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Listar todos los laboratorios con su ubicación, incidentes y bienes asignados
export async function GET() {
  try {
    const laboratorios = await prisma.laboratorio.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        ubicacion: {
          include: {
            bienes: {
              where: { eliminado: false },
              include: {
                categoria: {
                  select: { id: true, nombre: true, icono: true }
                },
                softwareInstalaciones: {
                  include: {
                    software: true
                  }
                }
              }
            }
          }
        },
        softwareInstalaciones: {
          include: {
            software: true
          }
        },
        incidentes: {
          include: {
            bien: {
              select: { id: true, codigo_inventario: true, marca: true, modelo: true }
            },
            mantenimientos: {
              select: { id: true, estado: true, tipo: true }
            }
          },
          orderBy: { fechaReporte: 'desc' }
        }
      }
    });
    return NextResponse.json(laboratorios);
  } catch (error) {
    console.error('❌ Error en GET /api/laboratorios:', error);
    return NextResponse.json({ error: 'Error al listar los laboratorios.' }, { status: 500 });
  }
}

// Registrar un nuevo laboratorio
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, codigo, capacidad, so, software, red, observaciones, ubicacionId, layout } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre del laboratorio es requerido.' }, { status: 400 });
    }

    // Validar duplicado
    const duplicado = await prisma.laboratorio.findUnique({ where: { nombre } });
    if (duplicado) {
      return NextResponse.json({ error: `El laboratorio '${nombre}' ya existe.` }, { status: 400 });
    }

    // Si ya existe una relación con esa ubicación
    if (ubicacionId) {
      const uIdInt = parseInt(ubicacionId, 10);
      const ubicacionOcupada = await prisma.laboratorio.findFirst({
        where: { ubicacionId: uIdInt }
      });
      if (ubicacionOcupada) {
        return NextResponse.json({ error: 'La ubicación seleccionada ya está asignada a otro laboratorio.' }, { status: 400 });
      }
    }

    const nuevo = await prisma.laboratorio.create({
      data: {
        nombre,
        codigo: codigo || null,
        capacidad: capacidad ? parseInt(capacidad, 10) : 30,
        so: so || null,
        software: software || null,
        red: red || null,
        observaciones: observaciones || null,
        layout: layout || null,
        ubicacionId: ubicacionId ? parseInt(ubicacionId, 10) : null
      }
    });

    return NextResponse.json(nuevo);
  } catch (error) {
    console.error('❌ Error en POST /api/laboratorios:', error);
    return NextResponse.json({ error: 'Error al registrar el laboratorio.' }, { status: 500 });
  }
}

// Actualizar datos del laboratorio
export async function PUT(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, nombre, codigo, capacidad, so, software, red, observaciones, ubicacionId, layout } = body;

    if (!id || !nombre) {
      return NextResponse.json({ error: 'El ID y nombre del laboratorio son obligatorios.' }, { status: 400 });
    }

    const labIdInt = parseInt(id, 10);

    // Validar duplicado por nombre
    const duplicado = await prisma.laboratorio.findFirst({
      where: { nombre, id: { not: labIdInt } }
    });
    if (duplicado) {
      return NextResponse.json({ error: `El nombre de laboratorio '${nombre}' ya está en uso.` }, { status: 400 });
    }

    // Validar si la ubicación ya está en uso por otro laboratorio
    if (ubicacionId) {
      const uIdInt = parseInt(ubicacionId, 10);
      const ubicacionOcupada = await prisma.laboratorio.findFirst({
        where: { ubicacionId: uIdInt, id: { not: labIdInt } }
      });
      if (ubicacionOcupada) {
        return NextResponse.json({ error: 'La ubicación seleccionada ya está asignada a otro laboratorio.' }, { status: 400 });
      }
    }

    const actualizado = await prisma.laboratorio.update({
      where: { id: labIdInt },
      data: {
        nombre,
        codigo: codigo || null,
        capacidad: capacidad ? parseInt(capacidad, 10) : 30,
        so: so || null,
        software: software || null,
        red: red || null,
        observaciones: observaciones || null,
        layout: layout !== undefined ? layout : undefined,
        ubicacionId: ubicacionId ? parseInt(ubicacionId, 10) : null
      }
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('❌ Error en PUT /api/laboratorios:', error);
    return NextResponse.json({ error: 'Error al actualizar los datos del laboratorio.' }, { status: 500 });
  }
}

// Eliminar un laboratorio
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
      return NextResponse.json({ error: 'El ID es requerido.' }, { status: 400 });
    }

    const labIdInt = parseInt(id, 10);

    // Eliminar laboratorio
    await prisma.laboratorio.delete({
      where: { id: labIdInt }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error en DELETE /api/laboratorios:', error);
    return NextResponse.json({ error: 'Error al eliminar el laboratorio.' }, { status: 500 });
  }
}
