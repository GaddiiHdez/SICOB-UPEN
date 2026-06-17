import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const busqueda = searchParams.get('q') || '';
    const categoriaId = searchParams.get('categoriaId');
    const incluirEliminados = searchParams.get('incluirEliminados') === 'true';

    // 1. Obtener consumible por ID
    if (id) {
      const item = await prisma.consumible.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          categoriaConsumible: true,
          ubicacion: true,
          movimientos: {
            orderBy: { fecha: 'desc' },
            include: {
              personal: { select: { id: true, nombre: true } },
              departamento: { select: { id: true, nombre: true } }
            }
          }
        }
      });
      return NextResponse.json(item);
    }

    // 2. Por defecto solo activos
    const where = { eliminado: incluirEliminados ? undefined : false };

    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { marca:  { contains: busqueda, mode: 'insensitive' } },
        { modelo: { contains: busqueda, mode: 'insensitive' } },
        { compatibilidad: { contains: busqueda, mode: 'insensitive' } }
      ];
    }

    if (categoriaId && categoriaId !== 'all') {
      where.categoriaConsumibleId = parseInt(categoriaId, 10);
    }

    const items = await prisma.consumible.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        categoriaConsumible: true,
        ubicacion: true
      }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('❌ Error en GET /api/consumibles:', error);
    return NextResponse.json({ error: 'Error al listar los consumibles.' }, { status: 500 });
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
    const {
      nombre,
      marca,
      modelo,
      stock_actual,
      stock_minimo,
      unidad_medida,
      color,
      compatibilidad,
      rendimiento,
      observaciones,
      categoriaConsumibleId,
      ubicacionId
    } = body;

    if (!nombre || !categoriaConsumibleId) {
      return NextResponse.json({ error: 'El nombre y la categoría son requeridos.' }, { status: 400 });
    }

    const duplicado = await prisma.consumible.findUnique({
      where: { nombre }
    });
    if (duplicado) {
      return NextResponse.json({ error: `El consumible '${nombre}' ya existe.` }, { status: 400 });
    }

    const nuevo = await prisma.consumible.create({
      data: {
        nombre,
        marca: marca || null,
        modelo: modelo || null,
        stock_actual: stock_actual ? parseInt(stock_actual, 10) : 0,
        stock_minimo: stock_minimo ? parseInt(stock_minimo, 10) : 5,
        unidad_medida: unidad_medida || 'Pieza',
        color: color || null,
        compatibilidad: compatibilidad || null,
        rendimiento: rendimiento ? parseInt(rendimiento, 10) : null,
        observaciones: observaciones || null,
        categoriaConsumibleId: parseInt(categoriaConsumibleId, 10),
        ubicacionId: ubicacionId ? parseInt(ubicacionId, 10) : null
      },
      include: {
        categoriaConsumible: true,
        ubicacion: true
      }
    });

    // Si el stock inicial es mayor a 0, registrar un movimiento de entrada inicial
    const stockInit = stock_actual ? parseInt(stock_actual, 10) : 0;
    if (stockInit > 0) {
      await prisma.movimientoConsumible.create({
        data: {
          tipo: 'ENTRADA',
          cantidad: stockInit,
          motivo: 'Carga de inventario inicial',
          consumibleId: nuevo.id
        }
      });
    }

    return NextResponse.json(nuevo);
  } catch (error) {
    console.error('❌ Error en POST /api/consumibles:', error);
    return NextResponse.json({ error: 'Error al registrar el consumible.' }, { status: 500 });
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
    const {
      id,
      nombre,
      marca,
      modelo,
      stock_minimo,
      unidad_medida,
      color,
      compatibilidad,
      rendimiento,
      observaciones,
      categoriaConsumibleId,
      ubicacionId
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'El ID es requerido para actualizar.' }, { status: 400 });
    }

    const idInt = parseInt(id, 10);

    const duplicado = await prisma.consumible.findFirst({
      where: {
        nombre,
        id: { not: idInt }
      }
    });
    if (duplicado) {
      return NextResponse.json({ error: `El nombre '${nombre}' ya está en uso por otro consumible.` }, { status: 400 });
    }

    const actualizado = await prisma.consumible.update({
      where: { id: idInt },
      data: {
        nombre,
        marca: marca !== undefined ? (marca || null) : undefined,
        modelo: modelo !== undefined ? (modelo || null) : undefined,
        stock_minimo: stock_minimo !== undefined ? parseInt(stock_minimo, 10) : undefined,
        unidad_medida: unidad_medida || undefined,
        color: color !== undefined ? (color || null) : undefined,
        compatibilidad: compatibilidad !== undefined ? (compatibilidad || null) : undefined,
        rendimiento: rendimiento !== undefined ? (rendimiento ? parseInt(rendimiento, 10) : null) : undefined,
        observaciones: observaciones !== undefined ? (observaciones || null) : undefined,
        categoriaConsumibleId: categoriaConsumibleId ? parseInt(categoriaConsumibleId, 10) : undefined,
        ubicacionId: ubicacionId !== undefined ? (ubicacionId ? parseInt(ubicacionId, 10) : null) : undefined
      },
      include: {
        categoriaConsumible: true,
        ubicacion: true
      }
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('❌ Error en PUT /api/consumibles:', error);
    return NextResponse.json({ error: 'Error al actualizar el consumible.' }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ error: 'El ID es requerido.' }, { status: 400 });
    }

    const idInt = parseInt(id, 10);

    const dadoDeBaja = await prisma.consumible.update({
      where: { id: idInt },
      data: {
        eliminado: true,
        nombre: `${idInt}_ELIMINADO_${Date.now()}` // Evita colisiones de unicidad sobre el campo 'nombre'
      }
    });

    return NextResponse.json(dadoDeBaja);
  } catch (error) {
    console.error('❌ Error en DELETE /api/consumibles:', error);
    return NextResponse.json({ error: 'Error al eliminar el consumible.' }, { status: 500 });
  }
}
