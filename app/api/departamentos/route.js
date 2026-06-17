import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const departamentos = await prisma.departamento.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        ubicacion: {
          select: {
            id: true,
            nombre: true,
            edificio: true,
            icono: true
          }
        }
      }
    });
    return NextResponse.json(departamentos);
  } catch (error) {
    console.error('❌ Error en GET /api/departamentos:', error);
    return NextResponse.json({ error: 'Error al listar los departamentos.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, jefe, ubicacionId, icono } = body;

    if (!nombre) return NextResponse.json({ error: 'El nombre del departamento es requerido.' }, { status: 400 });

    const duplicado = await prisma.departamento.findUnique({ where: { nombre } });
    if (duplicado) return NextResponse.json({ error: `El departamento '${nombre}' ya existe.` }, { status: 400 });

    const data = { nombre, jefe, icono: icono || "🏢" };
    if (ubicacionId) data.ubicacionId = parseInt(ubicacionId, 10);

    const nuevo = await prisma.departamento.create({ data });

    // Sincronizar el puesto del jefe en la tabla Personal
    if (jefe) {
      const nuevoJefe = await prisma.personal.findFirst({
        where: { nombre: jefe }
      });
      if (nuevoJefe) {
        const esFemenino = nuevoJefe.nombre.toLowerCase().includes('lya') ||
                           nuevoJefe.nombre.toLowerCase().includes('paola') ||
                           nuevoJefe.nombre.toLowerCase().includes('estrada') ||
                           nuevoJefe.nombre.toLowerCase().includes('maria') ||
                           nuevoJefe.nombre.toLowerCase().includes('ana') ||
                           nuevoJefe.nombre.toLowerCase().includes('ing. lya');
        const nuevoPuesto = esFemenino ? "Jefa del Departamento" : "Jefe del Departamento";
        await prisma.personal.update({
          where: { id: nuevoJefe.id },
          data: {
            puesto: nuevoPuesto,
            departamentoId: nuevo.id
          }
        });
      }
    }

    return NextResponse.json(nuevo);
  } catch (error) {
    console.error('❌ Error en POST /api/departamentos:', error);
    return NextResponse.json({ error: 'Error al crear el departamento.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, nombre, jefe, ubicacionId, icono } = body;

    if (!id || !nombre) return NextResponse.json({ error: 'ID y nombre son requeridos.' }, { status: 400 });

    const duplicado = await prisma.departamento.findFirst({
      where: { nombre, id: { not: parseInt(id) } }
    });
    if (duplicado) return NextResponse.json({ error: `El departamento '${nombre}' ya existe.` }, { status: 400 });

    const data = { nombre, jefe: jefe || null, icono };
    data.ubicacionId = ubicacionId ? parseInt(ubicacionId, 10) : null;

    // Sincronizar el puesto del jefe en la tabla Personal
    const deptoIdInt = parseInt(id);
    
    // 1. Resetear jefes anteriores de este departamento
    await prisma.personal.updateMany({
      where: {
        departamentoId: deptoIdInt,
        puesto: { in: ["Jefe de Departamento", "Jefa del Departamento", "Jefe del Departamento", "Coordinador", "Coordinadora", "Jefa de Departamento", "Jefe de Departamento"] }
      },
      data: { puesto: "Docente" }
    });

    // 2. Si se asigna un nuevo jefe, actualizar su puesto e ingresarlo al departamento
    if (jefe) {
      const nuevoJefe = await prisma.personal.findFirst({
        where: { nombre: jefe }
      });
      if (nuevoJefe) {
        const esFemenino = nuevoJefe.nombre.toLowerCase().includes('lya') ||
                           nuevoJefe.nombre.toLowerCase().includes('paola') ||
                           nuevoJefe.nombre.toLowerCase().includes('estrada') ||
                           nuevoJefe.nombre.toLowerCase().includes('maria') ||
                           nuevoJefe.nombre.toLowerCase().includes('ana') ||
                           nuevoJefe.nombre.toLowerCase().includes('ing. lya');
        const nuevoPuesto = esFemenino ? "Jefa del Departamento" : "Jefe del Departamento";
        await prisma.personal.update({
          where: { id: nuevoJefe.id },
          data: {
            puesto: nuevoPuesto,
            departamentoId: deptoIdInt
          }
        });
      }
    }

    const actualizado = await prisma.departamento.update({
      where: { id: deptoIdInt },
      data
    });
    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('❌ Error en PUT /api/departamentos:', error);
    return NextResponse.json({ error: 'Error al actualizar el departamento.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'El ID es requerido.' }, { status: 400 });

    const idInt = parseInt(id);
    const bienesAsociados = await prisma.bien.count({ where: { departamentoId: idInt } });
    if (bienesAsociados > 0) {
      return NextResponse.json({ error: `No se puede eliminar. Hay ${bienesAsociados} bienes en este departamento.` }, { status: 400 });
    }

    await prisma.departamento.delete({ where: { id: idInt } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error en DELETE /api/departamentos:', error);
    return NextResponse.json({ error: 'Error al eliminar el departamento.' }, { status: 500 });
  }
}
