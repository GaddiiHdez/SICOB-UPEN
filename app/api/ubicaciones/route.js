import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const ubicaciones = await prisma.ubicacion.findMany({
      orderBy: { nombre: 'asc' }
    });
    return NextResponse.json(ubicaciones);
  } catch (error) {
    console.error('❌ Error en GET /api/ubicaciones:', error);
    return NextResponse.json({ error: 'Error al listar las ubicaciones.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, edificio, encargado, icono } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre de la ubicación es requerido.' }, { status: 400 });
    }

    const duplicada = await prisma.ubicacion.findUnique({
      where: { nombre }
    });
    if (duplicada) {
      return NextResponse.json({ error: `La ubicación '${nombre}' ya existe.` }, { status: 400 });
    }

    const nuevaUbicacion = await prisma.ubicacion.create({
      data: { nombre, edificio, encargado, icono: icono || "🏫" }
    });

    return NextResponse.json(nuevaUbicacion);
  } catch (error) {
    console.error('❌ Error en POST /api/ubicaciones:', error);
    return NextResponse.json({ error: 'Error al crear la ubicación.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, nombre, edificio, encargado, icono, antiguoEdificio, nuevoEdificio } = body;

    // Si es renombrado masivo de un edificio / bloque entero
    if (antiguoEdificio !== undefined && nuevoEdificio !== undefined) {
      if (!nuevoEdificio || !nuevoEdificio.trim()) {
        return NextResponse.json({ error: 'El nuevo nombre del bloque no puede estar vacío.' }, { status: 400 });
      }
      const actualizados = await prisma.ubicacion.updateMany({
        where: { edificio: antiguoEdificio },
        data: { edificio: nuevoEdificio.trim() }
      });
      return NextResponse.json({ success: true, count: actualizados.count });
    }

    if (!id || !nombre) return NextResponse.json({ error: 'ID y nombre son requeridos.' }, { status: 400 });

    const duplicada = await prisma.ubicacion.findFirst({
      where: { nombre, id: { not: parseInt(id) } }
    });
    if (duplicada) return NextResponse.json({ error: `La ubicación '${nombre}' ya existe.` }, { status: 400 });

    const ubicacionAct = await prisma.ubicacion.update({
      where: { id: parseInt(id) },
      data: { nombre, edificio, encargado, icono }
    });

    return NextResponse.json(ubicacionAct);
  } catch (error) {
    console.error('❌ Error en PUT /api/ubicaciones:', error);
    return NextResponse.json({ error: 'Error al actualizar la ubicación.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const edificio = searchParams.get('edificio');

    if (!id && !edificio) {
      return NextResponse.json({ error: 'El ID o el Edificio es requerido.' }, { status: 400 });
    }

    // Si es eliminación masiva de un edificio / bloque entero
    if (edificio) {
      const ubicaciones = await prisma.ubicacion.findMany({
        where: { edificio: edificio },
        select: { id: true }
      });
      const ids = ubicaciones.map(u => u.id);

      if (ids.length > 0) {
        const bienesAsociados = await prisma.bien.count({ where: { ubicacionId: { in: ids } } });
        if (bienesAsociados > 0) {
          return NextResponse.json({
            error: `No se puede eliminar el bloque. Hay ${bienesAsociados} bienes asignados a ubicaciones de este bloque.`
          }, { status: 400 });
        }

        await prisma.ubicacion.deleteMany({
          where: { id: { in: ids } }
        });
      }
      return NextResponse.json({ success: true });
    }

    const idInt = parseInt(id);

    const bienesAsociados = await prisma.bien.count({ where: { ubicacionId: idInt } });
    if (bienesAsociados > 0) {
      return NextResponse.json({ error: `No se puede eliminar. Hay ${bienesAsociados} bienes en esta ubicación.` }, { status: 400 });
    }

    await prisma.ubicacion.delete({ where: { id: idInt } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error en DELETE /api/ubicaciones:', error);
    return NextResponse.json({ error: 'Error al eliminar la ubicación.' }, { status: 500 });
  }
}

