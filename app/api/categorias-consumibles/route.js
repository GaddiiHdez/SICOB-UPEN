import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const categorias = await prisma.categoriaConsumible.findMany({
      orderBy: { nombre: 'asc' }
    });
    return NextResponse.json(categorias);
  } catch (error) {
    console.error('❌ Error en GET /api/categorias-consumibles:', error);
    return NextResponse.json({ error: 'Error al listar las categorías de consumibles.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, icono } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre de la categoría es requerido.' }, { status: 400 });
    }

    const duplicada = await prisma.categoriaConsumible.findUnique({
      where: { nombre }
    });
    if (duplicada) {
      return NextResponse.json({ error: `La categoría '${nombre}' ya existe.` }, { status: 400 });
    }

    const nuevaCategoria = await prisma.categoriaConsumible.create({
      data: { nombre, descripcion, icono: icono || "📦" }
    });

    return NextResponse.json(nuevaCategoria);
  } catch (error) {
    console.error('❌ Error en POST /api/categorias-consumibles:', error);
    return NextResponse.json({ error: 'Error al crear la categoría de consumibles.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, nombre, descripcion, icono } = body;

    if (!id || !nombre) return NextResponse.json({ error: 'ID y nombre son requeridos.' }, { status: 400 });

    const duplicada = await prisma.categoriaConsumible.findFirst({
      where: { nombre, id: { not: parseInt(id) } }
    });
    if (duplicada) return NextResponse.json({ error: `La categoría '${nombre}' ya existe.` }, { status: 400 });

    const categoriaAct = await prisma.categoriaConsumible.update({
      where: { id: parseInt(id) },
      data: { nombre, descripcion, icono }
    });

    return NextResponse.json(categoriaAct);
  } catch (error) {
    console.error('❌ Error en PUT /api/categorias-consumibles:', error);
    return NextResponse.json({ error: 'Error al actualizar la categoría de consumibles.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'El ID es requerido.' }, { status: 400 });

    const idInt = parseInt(id);

    // Validar si tiene consumibles asociados
    const asociados = await prisma.consumible.count({ where: { categoriaConsumibleId: idInt } });
    if (asociados > 0) {
      return NextResponse.json({ error: `No se puede eliminar. Hay ${asociados} consumibles asociados a esta categoría.` }, { status: 400 });
    }

    await prisma.categoriaConsumible.delete({ where: { id: idInt } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error en DELETE /api/categorias-consumibles:', error);
    return NextResponse.json({ error: 'Error al eliminar la categoría de consumibles.' }, { status: 500 });
  }
}
