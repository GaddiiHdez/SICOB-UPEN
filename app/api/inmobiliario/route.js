import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseNextCorrelativo } from '@/lib/configHelpers';
import { requireAuth } from '@/lib/auth';

// Listar mobiliarios con relaciones
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const busqueda = searchParams.get('q') || '';
    const categoriaId = searchParams.get('categoriaId');
    const estado = searchParams.get('estado');
    const incluirEliminados = searchParams.get('incluirEliminados') === 'true';

    // 1. Obtener mobiliario específico por ID
    if (id) {
      const item = await prisma.inmobiliario.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          categoriaInmobiliario: true,
          ubicacion: true,
          departamento: true,
          personal: true
        }
      });
      return NextResponse.json(item);
    }

    // 2. Por defecto solo devolvemos activos (no eliminados)
    const where = { eliminado: incluirEliminados ? undefined : false };

    if (busqueda) {
      where.OR = [
        { codigo_inventario: { contains: busqueda, mode: 'insensitive' } },
        { descripcion:       { contains: busqueda, mode: 'insensitive' } },
        { marca:             { contains: busqueda, mode: 'insensitive' } },
        { modelo:            { contains: busqueda, mode: 'insensitive' } }
      ];
    }

    if (categoriaId && categoriaId !== 'all') {
      where.categoriaInmobiliarioId = parseInt(categoriaId, 10);
    }

    if (estado && estado !== 'all') {
      where.estado = estado;
    }

    const items = await prisma.inmobiliario.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        categoriaInmobiliario: true,
        ubicacion: true,
        departamento: true,
        personal: true
      }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('❌ Error en GET /api/inmobiliario:', error);
    return NextResponse.json({ error: 'Error al listar el mobiliario.' }, { status: 500 });
  }
}

// Registrar un nuevo mobiliario
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      descripcion,
      marca,
      modelo,
      estado,
      valor_estimado,
      fecha_adquisicion,
      programa_adquisicion,
      observaciones,
      categoriaInmobiliarioId,
      ubicacionId,
      departamentoId,
      personalId,
      codigo_manual,
      cantidad
    } = body;

    // Validar requeridos
    if (!descripcion || !categoriaInmobiliarioId || !ubicacionId) {
      return NextResponse.json({ error: 'La descripción, categoría y ubicación son requeridas.' }, { status: 400 });
    }

    const cant = cantidad ? parseInt(cantidad, 10) : 1;
    if (isNaN(cant) || cant < 1) {
      return NextResponse.json({ error: 'La cantidad a registrar debe ser un número entero mayor a cero.' }, { status: 400 });
    }

    if (cant > 1 && codigo_manual) {
      return NextResponse.json({ error: 'Para el registro en lote no se admite un código de inventario manual. Por favor use la autogeneración.' }, { status: 400 });
    }

    // 1. Obtener la plantilla de la base de datos
    const configDoc = await prisma.configuracion.findUnique({
      where: { clave: 'formato_codigo_inventario' }
    });
    const plantilla = configDoc ? configDoc.valor : 'UPEN-{CAT}-{YEAR}-{CORRELATIVO}';

    // 2. Obtener abreviatura de la categoría de mobiliario
    const categoria = await prisma.categoriaInmobiliario.findUnique({
      where: { id: parseInt(categoriaInmobiliarioId, 10) }
    });
    
    const catNombre = categoria ? categoria.nombre : 'MOB';
    const catAbbr = catNombre
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 4) || 'MOB';

    // 3. Obtener año actual
    const year = new Date().getFullYear().toString();

    // Caso A: Registro de múltiples elementos (Lote)
    if (cant > 1) {
      const creados = [];
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < cant; i++) {
          let codigoInventarioFinal = await parseNextCorrelativo(plantilla, catAbbr, year, tx.inmobiliario);

          const codigoExistente = await tx.inmobiliario.findUnique({
            where: { codigo_inventario: codigoInventarioFinal }
          });
          if (codigoExistente) {
            codigoInventarioFinal = `${codigoInventarioFinal}-${Date.now().toString().slice(-4)}`;
          }

          const nuevoInmob = await tx.inmobiliario.create({
            data: {
              codigo_inventario: codigoInventarioFinal,
              descripcion,
              marca: marca || null,
              modelo: modelo || null,
              estado: estado || 'Bueno',
              valor_estimado: valor_estimado ? parseFloat(valor_estimado) : null,
              fecha_adquisicion: fecha_adquisicion ? new Date(fecha_adquisicion) : null,
              programa_adquisicion: programa_adquisicion || null,
              observaciones: observaciones || null,
              categoriaInmobiliarioId: parseInt(categoriaInmobiliarioId, 10),
              ubicacionId: parseInt(ubicacionId, 10),
              departamentoId: departamentoId ? parseInt(departamentoId, 10) : null,
              personalId: personalId ? parseInt(personalId, 10) : null
            }
          });
          creados.push(nuevoInmob);
        }
      });

      return NextResponse.json({ success: true, count: creados.length, items: creados });
    }

    // Caso B: Registro de un solo elemento
    let codigoInventarioFinal = codigo_manual?.trim();

    if (!codigoInventarioFinal) {
      codigoInventarioFinal = await parseNextCorrelativo(plantilla, catAbbr, year, prisma.inmobiliario);

      const codigoExistente = await prisma.inmobiliario.findUnique({
        where: { codigo_inventario: codigoInventarioFinal }
      });
      if (codigoExistente) {
        codigoInventarioFinal = `${codigoInventarioFinal}-${Date.now().toString().slice(-4)}`;
      }
    } else {
      const codigoExistente = await prisma.inmobiliario.findUnique({
        where: { codigo_inventario: codigoInventarioFinal }
      });
      if (codigoExistente) {
        return NextResponse.json({ error: `El código de inventario '${codigoInventarioFinal}' ya existe.` }, { status: 400 });
      }
    }

    // Registrar en BD
    const nuevo = await prisma.inmobiliario.create({
      data: {
        codigo_inventario: codigoInventarioFinal,
        descripcion,
        marca: marca || null,
        modelo: modelo || null,
        estado: estado || 'Bueno',
        valor_estimado: valor_estimado ? parseFloat(valor_estimado) : null,
        fecha_adquisicion: fecha_adquisicion ? new Date(fecha_adquisicion) : null,
        programa_adquisicion: programa_adquisicion || null,
        observaciones: observaciones || null,
        categoriaInmobiliarioId: parseInt(categoriaInmobiliarioId, 10),
        ubicacionId: parseInt(ubicacionId, 10),
        departamentoId: departamentoId ? parseInt(departamentoId, 10) : null,
        personalId: personalId ? parseInt(personalId, 10) : null
      },
      include: {
        categoriaInmobiliario: true,
        ubicacion: true,
        departamento: true,
        personal: true
      }
    });

    return NextResponse.json(nuevo);
  } catch (error) {
    console.error('❌ Error en POST /api/inmobiliario:', error);
    return NextResponse.json({ error: 'Error al registrar el mobiliario.' }, { status: 500 });
  }
}

// Actualizar mobiliario
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
      codigo_inventario,
      descripcion,
      marca,
      modelo,
      estado,
      valor_estimado,
      fecha_adquisicion,
      programa_adquisicion,
      observaciones,
      categoriaInmobiliarioId,
      ubicacionId,
      departamentoId,
      personalId
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'El ID del mobiliario es requerido.' }, { status: 400 });
    }

    const idInt = parseInt(id, 10);

    // Validar duplicado de código de inventario
    if (codigo_inventario && codigo_inventario.trim() !== '') {
      const duplicadoCodigo = await prisma.inmobiliario.findFirst({
        where: {
          codigo_inventario,
          id: { not: idInt }
        }
      });
      if (duplicadoCodigo) {
        return NextResponse.json({ error: `El código de inventario '${codigo_inventario}' ya está en uso.` }, { status: 400 });
      }
    }

    const actualizado = await prisma.inmobiliario.update({
      where: { id: idInt },
      data: {
        codigo_inventario,
        descripcion,
        marca: marca !== undefined ? (marca || null) : undefined,
        modelo: modelo !== undefined ? (modelo || null) : undefined,
        estado,
        valor_estimado: valor_estimado !== undefined ? (valor_estimado ? parseFloat(valor_estimado) : null) : undefined,
        fecha_adquisicion: fecha_adquisicion !== undefined ? (fecha_adquisicion ? new Date(fecha_adquisicion) : null) : undefined,
        programa_adquisicion: programa_adquisicion !== undefined ? (programa_adquisicion || null) : undefined,
        observaciones: observaciones !== undefined ? (observaciones || null) : undefined,
        categoriaInmobiliarioId: categoriaInmobiliarioId ? parseInt(categoriaInmobiliarioId, 10) : undefined,
        ubicacionId: ubicacionId ? parseInt(ubicacionId, 10) : undefined,
        departamentoId: departamentoId !== undefined ? (departamentoId ? parseInt(departamentoId, 10) : null) : undefined,
        personalId: personalId !== undefined ? (personalId ? parseInt(personalId, 10) : null) : undefined
      },
      include: {
        categoriaInmobiliario: true,
        ubicacion: true,
        departamento: true,
        personal: true
      }
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('❌ Error en PUT /api/inmobiliario:', error);
    return NextResponse.json({ error: 'Error al actualizar el mobiliario.' }, { status: 500 });
  }
}

// Dar de baja / Eliminar de forma lógica
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

    const idInt = parseInt(id, 10);

    const dadoDeBaja = await prisma.inmobiliario.update({
      where: { id: idInt },
      data: {
        eliminado: true,
        eliminadoEn: new Date(),
        estado: 'Baja'
      }
    });

    return NextResponse.json(dadoDeBaja);
  } catch (error) {
    console.error('❌ Error en DELETE /api/inmobiliario:', error);
    return NextResponse.json({ error: 'Error al dar de baja el mobiliario.' }, { status: 500 });
  }
}
