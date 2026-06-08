import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

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
    const body = await request.json();
    const { nombre, jefe, ubicacionId, icono } = body;

    if (!nombre) return NextResponse.json({ error: 'El nombre del departamento es requerido.' }, { status: 400 });

    const duplicado = await prisma.departamento.findUnique({ where: { nombre } });
    if (duplicado) return NextResponse.json({ error: `El departamento '${nombre}' ya existe.` }, { status: 400 });

    const data = { nombre, jefe, icono: icono || "🏢" };
    if (ubicacionId) data.ubicacionId = parseInt(ubicacionId, 10);

    const nuevo = await prisma.departamento.create({ data });
    return NextResponse.json(nuevo);
  } catch (error) {
    console.error('❌ Error en POST /api/departamentos:', error);
    return NextResponse.json({ error: 'Error al crear el departamento.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, nombre, jefe, ubicacionId, icono } = body;

    if (!id || !nombre) return NextResponse.json({ error: 'ID y nombre son requeridos.' }, { status: 400 });

    const duplicado = await prisma.departamento.findFirst({
      where: { nombre, id: { not: parseInt(id) } }
    });
    if (duplicado) return NextResponse.json({ error: `El departamento '${nombre}' ya existe.` }, { status: 400 });

    const data = { nombre, jefe, icono };
    data.ubicacionId = ubicacionId ? parseInt(ubicacionId, 10) : null;

    const actualizado = await prisma.departamento.update({
      where: { id: parseInt(id) },
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
