import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Listar mantenimientos con filtros
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const bienId = searchParams.get('bienId');

    const where = {};
    if (estado) {
      where.estado = estado;
    }
    if (bienId) {
      where.bienId = parseInt(bienId, 10);
    }

    const mantenimientos = await prisma.mantenimiento.findMany({
      where,
      orderBy: { fecha_mantenimiento: 'desc' },
      include: {
        bien: {
          select: {
            id: true,
            codigo_inventario: true,
            numero_serie: true,
            marca: true,
            modelo: true,
            estado: true,
            categoria: { select: { nombre: true } }
          }
        }
      }
    });

    return NextResponse.json(mantenimientos);
  } catch (error) {
    console.error('❌ Error en GET /api/mantenimientos:', error);
    return NextResponse.json({ error: 'Error al listar los mantenimientos.' }, { status: 500 });
  }
}

// Registrar o programar un mantenimiento
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      esLote,
      bienIds, // Array de IDs de bienes
      bienId, // ID de bien individual
      tipo,
      descripcion,
      costo,
      fecha_mantenimiento,
      proximo_mantenimiento,
      tecnico_encargado,
      estado,
      liberarResguardo // Boolean
    } = body;

    if (!tipo || !descripcion || !estado) {
      return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 });
    }

    if (esLote) {
      if (!Array.isArray(bienIds) || bienIds.length === 0) {
        return NextResponse.json({ error: 'El lote debe contener al menos un bienId.' }, { status: 400 });
      }

      const results = [];
      const idsInt = bienIds.map(x => parseInt(x, 10));

      await prisma.$transaction(async (tx) => {
        for (const bId of idsInt) {
          const mRecord = await tx.mantenimiento.create({
            data: {
              bienId: bId,
              tipo,
              descripcion,
              costo: costo ? parseFloat(costo) : null,
              fecha_mantenimiento: fecha_mantenimiento ? new Date(fecha_mantenimiento) : new Date(),
              proximo_mantenimiento: proximo_mantenimiento ? new Date(proximo_mantenimiento) : null,
              tecnico_encargado: tecnico_encargado || null,
              estado
            }
          });
          results.push(mRecord);

          if (estado === 'En proceso') {
            await tx.bien.update({
              where: { id: bId },
              data: { estado: 'Mantenimiento' }
            });
          } else if (estado === 'Completado') {
            await tx.bien.update({
              where: { id: bId },
              data: { estado: 'En reserva' }
            });
          }

          if (liberarResguardo === true && (estado === 'En proceso' || estado === 'Completado')) {
            await tx.asignacion.updateMany({
              where: { bienId: bId, fecha_retorno: null },
              data: {
                fecha_retorno: new Date(),
                observaciones: 'Retornado automáticamente por ingreso a mantenimiento técnico masivo'
              }
            });
          }
        }
      });

      return NextResponse.json({ success: true, count: results.length, data: results });
    } else {
      if (!bienId) {
        return NextResponse.json({ error: 'El ID del bien es requerido.' }, { status: 400 });
      }
      const bId = parseInt(bienId, 10);
      let result;

      await prisma.$transaction(async (tx) => {
        result = await tx.mantenimiento.create({
          data: {
            bienId: bId,
            tipo,
            descripcion,
            costo: costo ? parseFloat(costo) : null,
            fecha_mantenimiento: fecha_mantenimiento ? new Date(fecha_mantenimiento) : new Date(),
            proximo_mantenimiento: proximo_mantenimiento ? new Date(proximo_mantenimiento) : null,
            tecnico_encargado: tecnico_encargado || null,
            estado
          }
        });

        if (estado === 'En proceso') {
          await tx.bien.update({
            where: { id: bId },
            data: { estado: 'Mantenimiento' }
          });
        } else if (estado === 'Completado') {
          await tx.bien.update({
            where: { id: bId },
            data: { estado: 'En reserva' }
          });
        }

        if (liberarResguardo === true && (estado === 'En proceso' || estado === 'Completado')) {
          await tx.asignacion.updateMany({
            where: { bienId: bId, fecha_retorno: null },
            data: {
              fecha_retorno: new Date(),
              observaciones: 'Retornado automáticamente por ingreso a mantenimiento técnico'
            }
          });
        }
      });

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('❌ Error en POST /api/mantenimientos:', error);
    return NextResponse.json({ error: 'Error al registrar el mantenimiento.' }, { status: 500 });
  }
}

// Actualizar o finalizar un mantenimiento
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
      tipo,
      descripcion,
      costo,
      fecha_mantenimiento,
      proximo_mantenimiento,
      tecnico_encargado,
      estado, // "Programado" | "En proceso" | "Completado"
      reasignar // Boolean
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de mantenimiento es requerido.' }, { status: 400 });
    }

    const mId = parseInt(id, 10);
    let result;

    await prisma.$transaction(async (tx) => {
      // 1. Obtener el mantenimiento actual antes de actualizar para saber a qué bien pertenece
      const currentM = await tx.mantenimiento.findUnique({
        where: { id: mId }
      });

      if (!currentM) {
        throw new Error('El registro de mantenimiento no existe.');
      }

      // 2. Si pasa a "En proceso" desde "Programado", actualizar estado del bien
      if (estado === 'En proceso' && currentM.estado === 'Programado') {
        await tx.bien.update({
          where: { id: currentM.bienId },
          data: { estado: 'Mantenimiento' }
        });

        // Opcional: Cerrar resguardo actual si el usuario lo decide (o por defecto al iniciar reparación)
        if (body.liberarResguardo === true) {
          await tx.asignacion.updateMany({
            where: { bienId: currentM.bienId, fecha_retorno: null },
            data: {
              fecha_retorno: new Date(),
              observaciones: 'Retornado automáticamente al iniciar mantenimiento correctivo'
            }
          });
        }
      }

      // 3. Si pasa a "Completado"
      if (estado === 'Completado' && currentM.estado !== 'Completado') {
        if (reasignar === true) {
          // Intentar obtener el último resguardo cerrado para volver a asignarlo a ese mismo empleado
          const ultimaAsig = await tx.asignacion.findFirst({
            where: { bienId: currentM.bienId },
            orderBy: { fecha_asignacion: 'desc' }
          });

          if (ultimaAsig) {
            // Crear nueva asignación activa con el mismo custodio
            await tx.asignacion.create({
              data: {
                bienId: currentM.bienId,
                personalId: ultimaAsig.personalId,
                estado_entrega: 'Activo',
                observaciones: 'Reasignación automática tras finalizar mantenimiento técnico'
              }
            });

            // Actualizar bien a Activo
            await tx.bien.update({
              where: { id: currentM.bienId },
              data: { estado: 'Activo' }
            });
          } else {
            // Si no tiene historial, va a Bodega (En reserva)
            await tx.bien.update({
              where: { id: currentM.bienId },
              data: { estado: 'En reserva' }
            });
          }
        } else {
          // Si no se reasigna, el bien retorna a bodega
          await tx.bien.update({
            where: { id: currentM.bienId },
            data: { estado: 'En reserva' }
          });
        }
      }

      // 4. Actualizar el registro de mantenimiento
      result = await tx.mantenimiento.update({
        where: { id: mId },
        data: {
          tipo: tipo !== undefined ? tipo : undefined,
          descripcion: descripcion !== undefined ? descripcion : undefined,
          costo: costo !== undefined ? (costo ? parseFloat(costo) : null) : undefined,
          fecha_mantenimiento: fecha_mantenimiento ? new Date(fecha_mantenimiento) : undefined,
          proximo_mantenimiento: proximo_mantenimiento !== undefined ? (proximo_mantenimiento ? new Date(proximo_mantenimiento) : null) : undefined,
          tecnico_encargado: tecnico_encargado !== undefined ? tecnico_encargado : undefined,
          estado: estado !== undefined ? estado : undefined
        }
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error en PUT /api/mantenimientos:', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar el mantenimiento.' }, { status: 500 });
  }
}

// Eliminar un registro de mantenimiento
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
      return NextResponse.json({ error: 'El ID del mantenimiento es requerido.' }, { status: 400 });
    }

    const mId = parseInt(id, 10);
    
    // Verificar existencia
    const m = await prisma.mantenimiento.findUnique({ where: { id: mId } });
    if (!m) {
      return NextResponse.json({ error: 'El mantenimiento no existe.' }, { status: 404 });
    }

    // Si eliminamos un mantenimiento que estaba "En proceso", devolvemos el estado del bien a "En reserva"
    await prisma.$transaction(async (tx) => {
      if (m.estado === 'En proceso') {
        await tx.bien.update({
          where: { id: m.bienId },
          data: { estado: 'En reserva' }
        });
      }

      await tx.mantenimiento.delete({
        where: { id: mId }
      });
    });

    return NextResponse.json({ success: true, message: 'Registro de mantenimiento eliminado correctamente.' });
  } catch (error) {
    console.error('❌ Error en DELETE /api/mantenimientos:', error);
    return NextResponse.json({ error: 'Error al eliminar el registro de mantenimiento.' }, { status: 500 });
  }
}
