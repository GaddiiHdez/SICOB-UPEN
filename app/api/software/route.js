import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Listar catálogo de software
export async function GET() {
  try {
    const software = await prisma.software.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        instalaciones: {
          include: {
            bien: {
              select: { id: true, codigo_inventario: true, marca: true, modelo: true }
            },
            laboratorio: {
              select: { id: true, nombre: true, codigo: true }
            }
          }
        }
      }
    });
    return NextResponse.json(software);
  } catch (error) {
    console.error('❌ Error en GET /api/software:', error);
    return NextResponse.json({ error: 'Error al listar el catálogo de software.' }, { status: 500 });
  }
}

// Agregar software al catálogo
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, version, fabricante, tipoLicencia, licenciaKey, vencimientoLicencia, sitioWeb, descripcion } = body;

    if (!nombre || !tipoLicencia) {
      return NextResponse.json({ error: 'El nombre y el tipo de licencia son obligatorios.' }, { status: 400 });
    }

    // Validar duplicado
    const duplicado = await prisma.software.findUnique({
      where: { nombre }
    });
    if (duplicado) {
      return NextResponse.json({ error: `El software '${nombre}' ya existe en el catálogo.` }, { status: 400 });
    }

    const nuevo = await prisma.software.create({
      data: {
        nombre,
        version: version || null,
        fabricante: fabricante || null,
        tipoLicencia,
        licenciaKey: licenciaKey || null,
        vencimientoLicencia: vencimientoLicencia ? new Date(vencimientoLicencia) : null,
        sitioWeb: sitioWeb || null,
        descripcion: descripcion || null
      }
    });

    return NextResponse.json(nuevo);
  } catch (error) {
    console.error('❌ Error en POST /api/software:', error);
    return NextResponse.json({ error: 'Error al crear el registro de software.' }, { status: 500 });
  }
}

// Actualizar software del catálogo
export async function PUT(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, nombre, version, fabricante, tipoLicencia, licenciaKey, vencimientoLicencia, sitioWeb, descripcion } = body;

    if (!id || !nombre || !tipoLicencia) {
      return NextResponse.json({ error: 'El ID, nombre y tipo de licencia son requeridos.' }, { status: 400 });
    }

    const softwareIdInt = parseInt(id, 10);

    // Validar duplicado por nombre
    const duplicado = await prisma.software.findFirst({
      where: { nombre, id: { not: softwareIdInt } }
    });
    if (duplicado) {
      return NextResponse.json({ error: `El nombre de software '${nombre}' ya está registrado.` }, { status: 400 });
    }

    const actualizado = await prisma.software.update({
      where: { id: softwareIdInt },
      data: {
        nombre,
        version: version || null,
        fabricante: fabricante || null,
        tipoLicencia,
        licenciaKey: licenciaKey || null,
        vencimientoLicencia: vencimientoLicencia ? new Date(vencimientoLicencia) : null,
        sitioWeb: sitioWeb || null,
        descripcion: descripcion || null
      }
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('❌ Error en PUT /api/software:', error);
    return NextResponse.json({ error: 'Error al actualizar el software del catálogo.' }, { status: 500 });
  }
}

// Eliminar software del catálogo
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

    const softwareIdInt = parseInt(id, 10);

    // Eliminar software (las instalaciones se eliminan en cascada gracias a onDelete: Cascade)
    await prisma.software.delete({
      where: { id: softwareIdInt }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error en DELETE /api/software:', error);
    return NextResponse.json({ error: 'Error al eliminar el software del catálogo.' }, { status: 500 });
  }
}
