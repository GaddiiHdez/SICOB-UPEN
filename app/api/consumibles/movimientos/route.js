import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Listar movimientos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const consumibleId = searchParams.get('consumibleId');
    const bienId = searchParams.get('bienId');

    const where = {};
    if (consumibleId) {
      where.consumibleId = parseInt(consumibleId, 10);
    }
    if (bienId) {
      where.bienId = parseInt(bienId, 10);
    }

    const movimientos = await prisma.movimientoConsumible.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        consumible: {
          select: {
            id: true,
            nombre: true,
            marca: true,
            modelo: true,
            color: true,
            rendimiento: true
          }
        },
        personal: {
          select: {
            id: true,
            nombre: true,
            puesto: true
          }
        },
        departamento: {
          select: {
            id: true,
            nombre: true
          }
        },
        bien: {
          select: {
            id: true,
            codigo_inventario: true,
            marca: true,
            modelo: true,
            numero_serie: true
          }
        }
      }
    });

    return NextResponse.json(movimientos);
  } catch (error) {
    console.error('❌ Error en GET /api/consumibles/movimientos:', error);
    return NextResponse.json({ error: 'Error al listar los movimientos de consumibles.' }, { status: 500 });
  }
}

// Registrar un movimiento de entrada o salida con validación transaccional
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      consumibleId,
      tipo, // "ENTRADA" o "SALIDA"
      cantidad,
      motivo,
      personalId,
      departamentoId,
      usuarioId,
      bienId
    } = body;

    // Validar campos requeridos
    if (!consumibleId || !tipo || !cantidad) {
      return NextResponse.json({ error: 'El consumible, tipo de movimiento y cantidad son requeridos.' }, { status: 400 });
    }

    const idConsumible = parseInt(consumibleId, 10);
    const cant = parseInt(cantidad, 10);

    if (isNaN(cant) || cant <= 0) {
      return NextResponse.json({ error: 'La cantidad debe ser un número entero positivo mayor a cero.' }, { status: 400 });
    }

    if (tipo !== 'ENTRADA' && tipo !== 'SALIDA') {
      return NextResponse.json({ error: 'El tipo de movimiento debe ser ENTRADA o SALIDA.' }, { status: 400 });
    }

    // Ejecutar todo en una transacción atómica segura
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buscar consumible y bloquear su registro (si es soportado) o buscar
      const consumible = await tx.consumible.findUnique({
        where: { id: idConsumible }
      });

      if (!consumible) {
        throw new Error('CONSUMIBLE_NOT_FOUND');
      }

      if (consumible.eliminado) {
        throw new Error('CONSUMIBLE_DELETED');
      }

      let nuevoStock = consumible.stock_actual;

      if (tipo === 'ENTRADA') {
        nuevoStock += cant;
      } else if (tipo === 'SALIDA') {
        if (consumible.stock_actual < cant) {
          throw new Error('STOCK_INSUFICIENTE');
        }
        nuevoStock -= cant;
      }

      // 2. Actualizar stock del consumible
      await tx.consumible.update({
        where: { id: idConsumible },
        data: { stock_actual: nuevoStock }
      });

      // 3. Crear registro del movimiento
      const movimiento = await tx.movimientoConsumible.create({
        data: {
          tipo,
          cantidad: cant,
          motivo: motivo || null,
          consumibleId: idConsumible,
          personalId: personalId ? parseInt(personalId, 10) : null,
          departamentoId: departamentoId ? parseInt(departamentoId, 10) : null,
          usuarioId: usuarioId ? parseInt(usuarioId, 10) : null,
          bienId: bienId ? parseInt(bienId, 10) : null
        },
        include: {
          consumible: { select: { nombre: true, stock_actual: true } }
        }
      });

      return movimiento;
    });

    return NextResponse.json({ success: true, movimiento: result });
  } catch (error) {
    console.error('❌ Error en POST /api/consumibles/movimientos:', error);

    // Mapear errores específicos a respuestas HTTP limpias
    if (error.message === 'CONSUMIBLE_NOT_FOUND') {
      return NextResponse.json({ error: 'El consumible seleccionado no existe.' }, { status: 404 });
    }
    if (error.message === 'CONSUMIBLE_DELETED') {
      return NextResponse.json({ error: 'El consumible ha sido eliminado.' }, { status: 400 });
    }
    if (error.message === 'STOCK_INSUFICIENTE') {
      return NextResponse.json({ error: 'Operación denegada: Stock insuficiente de consumibles.' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Error al procesar el movimiento de consumibles.' }, { status: 500 });
  }
}
