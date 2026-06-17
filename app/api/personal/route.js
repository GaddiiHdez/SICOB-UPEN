import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Listar personal universitario con relaciones
export async function GET() {
  try {
    const personal = await prisma.personal.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        departamento: {
          select: {
            id: true,
            nombre: true,
            icono: true,
            ubicacion: {
              select: {
                id: true,
                nombre: true,
                edificio: true,
                icono: true
              }
            }
          }
        },
        asignaciones: {
          where: {
            fecha_retorno: null
          },
          include: {
            bien: {
              select: {
                id: true,
                codigo_inventario: true,
                marca: true,
                modelo: true,
                estado: true,
                valor_estimado: true
              }
            }
          }
        },
        inmobiliarios: {
          where: {
            eliminado: false
          },
          select: {
            id: true,
            codigo_inventario: true,
            descripcion: true,
            marca: true,
            modelo: true,
            estado: true,
            valor_estimado: true
          }
        }
      }
    });
    return NextResponse.json(personal);
  } catch (error) {
    console.error('❌ Error en GET /api/personal:', error);
    return NextResponse.json({ error: 'Error al listar el personal universitario.' }, { status: 500 });
  }
}

// Crear un nuevo empleado / resguardante
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, correo, puesto, departamentoId } = body;

    if (!nombre || !correo) {
      return NextResponse.json({ error: 'El nombre y correo son obligatorios.' }, { status: 400 });
    }

    const duplicado = await prisma.personal.findUnique({ where: { correo } });
    if (duplicado) {
      return NextResponse.json({ error: `El correo '${correo}' ya está registrado para otro empleado.` }, { status: 400 });
    }

    const nuevo = await prisma.personal.create({
      data: {
        nombre,
        correo,
        puesto: puesto || null,
        departamentoId: departamentoId ? parseInt(departamentoId, 10) : null
      },
      include: {
        departamento: { select: { id: true, nombre: true } }
      }
    });

    if (nuevo.departamentoId && puesto) {
      const isJefePuesto = puesto.toLowerCase().startsWith('jefe') ||
                           puesto.toLowerCase().startsWith('jefa') ||
                           puesto.toLowerCase().startsWith('coordinador') ||
                           puesto.toLowerCase().startsWith('coordinadora');
      if (isJefePuesto) {
        await prisma.departamento.update({
          where: { id: nuevo.departamentoId },
          data: { jefe: nuevo.nombre }
        });
      }
    }

    return NextResponse.json(nuevo);
  } catch (error) {
    console.error('❌ Error en POST /api/personal:', error);
    return NextResponse.json({ error: 'Error al registrar al empleado.' }, { status: 500 });
  }
}

// Actualizar datos de un empleado
export async function PUT(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, nombre, correo, puesto, departamentoId } = body;

    if (!id || !nombre || !correo) {
      return NextResponse.json({ error: 'ID, nombre y correo son obligatorios.' }, { status: 400 });
    }

    const duplicado = await prisma.personal.findFirst({
      where: { correo, id: { not: parseInt(id, 10) } }
    });
    if (duplicado) {
      return NextResponse.json({ error: `El correo '${correo}' ya está en uso por otro empleado.` }, { status: 400 });
    }

    const actualizado = await prisma.personal.update({
      where: { id: parseInt(id, 10) },
      data: {
        nombre,
        correo,
        puesto: puesto || null,
        departamentoId: departamentoId ? parseInt(departamentoId, 10) : null,
        noRegistrado: false
      },
      include: {
        departamento: { select: { id: true, nombre: true } }
      }
    });

    if (actualizado.departamentoId) {
      const isJefePuesto = puesto && (
        puesto.toLowerCase().startsWith('jefe') ||
        puesto.toLowerCase().startsWith('jefa') ||
        puesto.toLowerCase().startsWith('coordinador') ||
        puesto.toLowerCase().startsWith('coordinadora')
      );

      if (isJefePuesto) {
        await prisma.departamento.update({
          where: { id: actualizado.departamentoId },
          data: { jefe: actualizado.nombre }
        });
      } else {
        // Si ya no es jefe, quitarlo de la tabla de departamento
        const depto = await prisma.departamento.findUnique({
          where: { id: actualizado.departamentoId }
        });
        if (depto && depto.jefe === actualizado.nombre) {
          await prisma.departamento.update({
            where: { id: depto.id },
            data: { jefe: null }
          });
        }
      }
    }

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('❌ Error en PUT /api/personal:', error);
    return NextResponse.json({ error: 'Error al actualizar los datos del empleado.' }, { status: 500 });
  }
}

// Dar de baja / Eliminar un empleado
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

    // Validar que no tenga resguardos / asignaciones activas
    const asignacionesActivas = await prisma.asignacion.count({
      where: { personalId: idInt }
    });

    if (asignacionesActivas > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar al empleado. Tiene ${asignacionesActivas} bien(es) tecnológico(s) asignado(s) bajo su resguardo activo.` 
      }, { status: 400 });
    }

    // Validar que no tenga resguardos de mobiliario activos
    const inmobiliariosActivos = await prisma.inmobiliario.count({
      where: { personalId: idInt, eliminado: false }
    });

    if (inmobiliariosActivos > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar al empleado. Tiene ${inmobiliariosActivos} bien(es) de mobiliario asignado(s) bajo su resguardo activo.` 
      }, { status: 400 });
    }

    const empleado = await prisma.personal.findUnique({ where: { id: idInt } });
    if (empleado) {
      await prisma.departamento.updateMany({
        where: { jefe: empleado.nombre },
        data: { jefe: null }
      });
    }

    await prisma.personal.delete({ where: { id: idInt } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error en DELETE /api/personal:', error);
    return NextResponse.json({ error: 'Error al eliminar al empleado.' }, { status: 500 });
  }
}
