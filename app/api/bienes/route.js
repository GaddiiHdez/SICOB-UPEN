import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseNextCorrelativo, getCorrelativoPadding } from '@/lib/configHelpers';
import { requireAuth, verifyPassword } from '@/lib/auth';

// Listar bienes con filtros de búsqueda y categoría
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id                 = searchParams.get('id');
    const busqueda           = searchParams.get('q') || '';
    const categoriaId        = searchParams.get('categoriaId');
    const estado             = searchParams.get('estado');
    const incluirEliminados  = searchParams.get('incluirEliminados') === 'true';

    // Si se solicita un bien por ID, retornar con su historial completo de asignaciones
    if (id) {
      const bienEspecifico = await prisma.bien.findUnique({
        where: { id: parseInt(id, 10) },
        include: {
          categoria: { select: { id: true, nombre: true, icono: true } },
          ubicacion: { select: { id: true, nombre: true } },
          departamento: {
            select: {
              id: true,
              nombre: true,
              jefe: true,
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
            orderBy: { fecha_asignacion: 'desc' },
            include: {
              personal: { select: { id: true, nombre: true, puesto: true, correo: true } }
            }
          },
          mantenimientos: {
            orderBy: { fecha_mantenimiento: 'desc' }
          }
        }
      });

      if (bienEspecifico && !bienEspecifico.imagen_url) {
        const fallbackBien = await prisma.bien.findFirst({
          where: {
            marca: { equals: bienEspecifico.marca, mode: 'insensitive' },
            modelo: { equals: bienEspecifico.modelo, mode: 'insensitive' },
            imagen_url: { not: null, notIn: [''] },
            eliminado: false
          },
          select: { imagen_url: true }
        });
        if (fallbackBien && fallbackBien.imagen_url) {
          bienEspecifico.imagen_url = fallbackBien.imagen_url;
          bienEspecifico.imagen_compartida = true;
        }
      }

      return NextResponse.json(bienEspecifico);
    }

    // Por defecto solo devolvemos bienes activos (no dados de baja lógicamente)
    const where = { eliminado: incluirEliminados ? undefined : false };

    if (busqueda) {
      where.OR = [
        { codigo_inventario: { contains: busqueda, mode: 'insensitive' } },
        { numero_serie:      { contains: busqueda, mode: 'insensitive' } },
        { marca:             { contains: busqueda, mode: 'insensitive' } },
        { modelo:            { contains: busqueda, mode: 'insensitive' } },
        { descripcion:       { contains: busqueda, mode: 'insensitive' } },
      ];
    }

    if (categoriaId && categoriaId !== 'all') {
      where.categoriaId = parseInt(categoriaId);
    }

    if (estado && estado !== 'all') {
      where.estado = estado;
    }

    const bienes = await prisma.bien.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        codigo_inventario: true,
        numero_serie: true,
        marca: true,
        modelo: true,
        estado: true,
        descripcion: true,
        especificaciones: true,
        fecha_adquisicion: true,
        programa_adquisicion: true,
        valor_estimado: true,
        eliminado: true,
        eliminadoEn: true,
        createdAt: true,
        updatedAt: true,
        categoriaId: true,
        ubicacionId: true,
        departamentoId: true,
        categoria: { select: { id: true, nombre: true, icono: true } },
        ubicacion: { select: { id: true, nombre: true } },
        departamento: {
          select: {
            id: true,
            nombre: true,
            jefe: true,
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
          take: 1,
          orderBy: { fecha_asignacion: 'desc' },
          select: {
            id: true,
            fecha_asignacion: true,
            fecha_retorno: true,
            personal: { select: { id: true, nombre: true, puesto: true } }
          }
        }
      }
    });

    return NextResponse.json(bienes);
  } catch (error) {
    console.error('❌ Error en GET /api/bienes:', error);
    return NextResponse.json({ error: 'Error al listar los bienes.' }, { status: 500 });
  }
}

// Registrar un nuevo bien tecnológico
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const body = await request.json();

    // ── SOPORTE PARA REGISTRO MASIVO EN LOTE ───────────────────
    if (body.esLote && Array.isArray(body.items)) {
      const { items, ...datosComunes } = body;
      const {
        marca,
        modelo,
        estado,
        descripcion,
        especificaciones,
        fecha_adquisicion,
        programa_adquisicion,
        valor_estimado,
        imagen_url,
        categoriaId,
        ubicacionId,
        departamentoId,
        responsableId,
        responsableNombre
      } = datosComunes;

      let modeloLimpio = modelo.trim();
      if (modeloLimpio.toLowerCase().startsWith(marca.trim().toLowerCase())) {
        modeloLimpio = modeloLimpio.substring(marca.trim().length).trim();
      }

      // Validaciones básicas de datos comunes
      if (!marca || !modelo || !categoriaId || !ubicacionId) {
        return NextResponse.json({ error: 'Faltan campos requeridos en datos comunes.' }, { status: 400 });
      }

      // Validar duplicados de número de serie en el lote
      const seriesSubidas = items.map(it => it.numero_serie?.trim()).filter(Boolean);
      const uniqueSeries = [...new Set(seriesSubidas)];
      if (uniqueSeries.length !== items.length) {
        return NextResponse.json({ error: 'El lote contiene números de serie vacíos o duplicados entre sí.' }, { status: 400 });
      }

      // Verificar si alguna serie ya existe en la base de datos
      const seriesExistentes = await prisma.bien.findMany({
        where: { numero_serie: { in: uniqueSeries } },
        select: { numero_serie: true }
      });
      if (seriesExistentes.length > 0) {
        const duplicadas = seriesExistentes.map(x => x.numero_serie).join(', ');
        return NextResponse.json({ error: `Los siguientes números de serie ya existen en el sistema: ${duplicadas}` }, { status: 400 });
      }

      // Resolver personalId
      let finalPersonalId = null;
      if (responsableId) {
        finalPersonalId = parseInt(responsableId, 10);
      } else if (responsableNombre && responsableNombre.trim()) {
        const nombreLimpio = responsableNombre.trim();
        const coincidencia = await prisma.personal.findFirst({
          where: { nombre: { equals: nombreLimpio, mode: 'insensitive' } }
        });
        if (coincidencia) {
          finalPersonalId = coincidencia.id;
        } else {
          const tempEmail = `noreg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@temp.upen.edu.mx`;
          const nuevoPersonal = await prisma.personal.create({
            data: {
              nombre: nombreLimpio,
              correo: tempEmail,
              puesto: 'Temporal (Por registrar)',
              noRegistrado: true
            }
          });
          finalPersonalId = nuevoPersonal.id;
        }
      }

      // Obtener plantilla e inicializar correlativos secuenciales
      const configDoc = await prisma.configuracion.findUnique({
        where: { clave: 'formato_codigo_inventario' }
      });
      const plantilla = configDoc ? configDoc.valor : 'UPEN-{CAT}-{YEAR}-{CORRELATIVO}';

      const categoria = await prisma.categoria.findUnique({
        where: { id: parseInt(categoriaId) }
      });
      const catNombre = categoria ? categoria.nombre : 'EQ';
      const catAbbr = catNombre.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4);
      const year = new Date().getFullYear().toString();

      const creados = [];
      
      // Ejecutar en transacción para garantizar consistencia y auto-generación ordenada
      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          let codigoInventarioFinal = item.codigo_inventario?.trim();

          if (!codigoInventarioFinal) {
            // Auto-generación con el correlativo más reciente
            codigoInventarioFinal = await parseNextCorrelativo(plantilla, catAbbr, year, tx.bien);
            const existe = await tx.bien.findUnique({
              where: { codigo_inventario: codigoInventarioFinal }
            });
            if (existe) {
              codigoInventarioFinal = `${codigoInventarioFinal}-${Date.now().toString().slice(-4)}`;
            }
          } else {
            // Verificar unicidad del código manual provisto en la fila
            const existe = await tx.bien.findUnique({
              where: { codigo_inventario: codigoInventarioFinal }
            });
            if (existe) {
              throw new Error(`El código de inventario '${codigoInventarioFinal}' ya está registrado.`);
            }
          }

          const nuevoB = await tx.bien.create({
            data: {
              codigo_inventario: codigoInventarioFinal,
              numero_serie: item.numero_serie.trim(),
              marca,
              modelo: modeloLimpio,
              estado: estado || 'Activo',
              descripcion,
              especificaciones: especificaciones || {},
              fecha_adquisicion: fecha_adquisicion ? new Date(fecha_adquisicion) : null,
              programa_adquisicion: programa_adquisicion || null,
              valor_estimado: valor_estimado ? parseFloat(valor_estimado) : null,
              imagen_url: imagen_url || null,
              categoriaId: parseInt(categoriaId),
              ubicacionId: parseInt(ubicacionId),
              departamentoId: departamentoId ? parseInt(departamentoId) : null,
              asignaciones: finalPersonalId ? {
                create: {
                  personalId: finalPersonalId,
                  estado_entrega: estado || 'Activo',
                  observaciones: 'Asignación inicial al registrar lote'
                }
              } : undefined
            }
          });
          creados.push(nuevoB);
        }
      }, { timeout: 15000 });

      return NextResponse.json({ success: true, count: creados.length, bienes: creados });
    }

    // ── REGISTRO DE UN SOLO BIEN ───────────────────────────────
    const {
      numero_serie,
      marca,
      modelo,
      estado,
      descripcion,
      especificaciones, // Objeto JSON flexible
      fecha_adquisicion,
      programa_adquisicion,
      valor_estimado,
      imagen_url,
      categoriaId,
      ubicacionId,
      departamentoId,
      responsableId, // Para generar el resguardo inicial
      responsableNombre, // Para custodio no registrado
      codigo_manual // Si el usuario escribe uno personalizado
    } = body;

    // Validar requeridos
    if (!numero_serie || !marca || !modelo || !categoriaId || !ubicacionId) {
      return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 });
    }

    let modeloLimpio = modelo.trim();
    if (modeloLimpio.toLowerCase().startsWith(marca.trim().toLowerCase())) {
      modeloLimpio = modeloLimpio.substring(marca.trim().length).trim();
    }

    // Verificar si el número de serie ya existe
    const serieExistente = await prisma.bien.findUnique({
      where: { numero_serie }
    });
    if (serieExistente) {
      return NextResponse.json({ error: `El número de serie '${numero_serie}' ya está registrado.` }, { status: 400 });
    }

    let codigoInventarioFinal = codigo_manual;

    // Si no se provee un código manual, lo generamos en base a la configuración editable
    if (!codigoInventarioFinal) {
      // 1. Obtener la plantilla de la base de datos
      const configDoc = await prisma.configuracion.findUnique({
        where: { clave: 'formato_codigo_inventario' }
      });
      const plantilla = configDoc ? configDoc.valor : 'UPEN-{CAT}-{YEAR}-{CORRELATIVO}';

      // 2. Obtener abreviatura de categoría
      const categoria = await prisma.categoria.findUnique({
        where: { id: parseInt(categoriaId) }
      });
      
      // Limpiar y abreviar el nombre de la categoría (ej: "Drones" -> "DRON", "Laptops" -> "LAPT")
      const catNombre = categoria ? categoria.nombre : 'EQ';
      const catAbbr = catNombre
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 4);

      // 3. Obtener año actual
      const year = new Date().getFullYear().toString();

      // Generar el código final llamando a la utilidad limpia
      codigoInventarioFinal = await parseNextCorrelativo(plantilla, catAbbr, year, prisma.bien);

      // Verificación final de unicidad (protege ante dos solicitudes simultáneas)
      const codigoExistente = await prisma.bien.findUnique({
        where: { codigo_inventario: codigoInventarioFinal }
      });
      if (codigoExistente) {
        // Colisión por concurrencia: sufijo timestamp garantiza unicidad
        codigoInventarioFinal = `${codigoInventarioFinal}-${Date.now().toString().slice(-4)}`;
      }
    } else {
      // Verificar unicidad del código manual
      const codigoExistente = await prisma.bien.findUnique({
        where: { codigo_inventario: codigoInventarioFinal }
      });
      if (codigoExistente) {
        return NextResponse.json({ error: `El código de inventario '${codigoInventarioFinal}' ya existe.` }, { status: 400 });
      }
    }

    // Resolver personalId para POST
    let finalPersonalId = null;
    if (responsableId) {
      finalPersonalId = parseInt(responsableId, 10);
    } else if (responsableNombre && responsableNombre.trim()) {
      const nombreLimpio = responsableNombre.trim();
      const coincidencia = await prisma.personal.findFirst({
        where: { nombre: { equals: nombreLimpio, mode: 'insensitive' } }
      });
      if (coincidencia) {
        finalPersonalId = coincidencia.id;
      } else {
        const tempEmail = `noreg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@temp.upen.edu.mx`;
        const nuevoPersonal = await prisma.personal.create({
          data: {
            nombre: nombreLimpio,
            correo: tempEmail,
            puesto: 'Temporal (Por registrar)',
            noRegistrado: true
          }
        });
        finalPersonalId = nuevoPersonal.id;
      }
    }

    // Crear el registro del bien
    const nuevoBien = await prisma.bien.create({
      data: {
        codigo_inventario: codigoInventarioFinal,
        numero_serie,
        marca,
        modelo: modeloLimpio,
        estado: estado || 'Activo',
        descripcion,
        especificaciones: especificaciones || {},
        fecha_adquisicion: fecha_adquisicion ? new Date(fecha_adquisicion) : null,
        programa_adquisicion: programa_adquisicion || null,
        valor_estimado: valor_estimado ? parseFloat(valor_estimado) : null,
        imagen_url: imagen_url || null,
        categoriaId: parseInt(categoriaId),
        ubicacionId: parseInt(ubicacionId),
        departamentoId: departamentoId ? parseInt(departamentoId) : null,
        asignaciones: finalPersonalId ? {
          create: {
            personalId: finalPersonalId,
            estado_entrega: estado || 'Activo',
            observaciones: 'Asignación inicial al registrar equipo'
          }
        } : undefined
      },
      include: {
        categoria: { select: { nombre: true } },
        ubicacion: { select: { nombre: true } },
        departamento: { select: { nombre: true } }
      }
    });

    return NextResponse.json(nuevoBien);
  } catch (error) {
    console.error('❌ Error en POST /api/bienes:', error);
    return NextResponse.json({ error: 'Error al registrar el bien tecnológico.' }, { status: 500 });
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
      ids, // Para acciones masivas
      darDeBaja, // Para baja lógica masiva
      id,
      codigo_inventario,
      numero_serie,
      marca,
      modelo,
      estado,
      descripcion,
      especificaciones,
      fecha_adquisicion,
      programa_adquisicion,
      valor_estimado,
      imagen_url,
      categoriaId,
      ubicacionId,
      departamentoId,
      responsableId,
      responsableNombre // Custodio no registrado
    } = body;

    // ── SOPORTE PARA ACCIONES MASIVAS (BULK UPDATES) ───────────────────
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const idsInt = ids.map(x => parseInt(x, 10));

      // 1.1 Eliminar número de inventario masivamente
      if (body.eliminarNoInventario) {
        for (const bienId of idsInt) {
          await prisma.bien.update({
            where: { id: bienId },
            data: { codigo_inventario: `SIN-NUMERO-${bienId}` }
          });
        }
        return NextResponse.json({ success: true, message: `${idsInt.length} números de inventario eliminados en lote.` });
      }

      // 1.15 Autogenerar número de inventario masivamente en lote
      if (body.autogenerarNoInventario) {
        let plantilla = body.plantilla;
        if (!plantilla || plantilla.trim() === '') {
          const configDoc = await prisma.configuracion.findUnique({
            where: { clave: 'formato_codigo_inventario' }
          });
          plantilla = configDoc ? configDoc.valor : 'UPEN-{CAT}-{YEAR}-{CORRELATIVO}';
        }
        const year = new Date().getFullYear().toString();

        const bienesLote = await prisma.bien.findMany({
          where: { id: { in: idsInt } },
          include: { categoria: true }
        });

        await prisma.$transaction(async (tx) => {
          let runningCorrelativo = undefined;
          if (body.correlativoInicial !== undefined && body.correlativoInicial !== null && body.correlativoInicial !== '') {
            runningCorrelativo = parseInt(body.correlativoInicial, 10);
          }

          for (const bien of bienesLote) {
            const catNombre = bien.categoria ? bien.categoria.nombre : 'EQ';
            const catAbbr = catNombre.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4);

            let codigoInventarioFinal;

            if (runningCorrelativo !== undefined && !isNaN(runningCorrelativo)) {
              const plantillaInstanciada = plantilla
                .replace('{CAT}', catAbbr)
                .replace('{YEAR}', year);

              const matchCorr = plantillaInstanciada.match(/\{CORRELATIVO(?::(\d+))?\}/);
              let padding = 4;
              let placeholderStr = '{CORRELATIVO}';
              if (matchCorr) {
                placeholderStr = matchCorr[0];
                if (matchCorr[1]) {
                  padding = parseInt(matchCorr[1], 10);
                }
              }

              const correlativoStr = runningCorrelativo.toString().padStart(padding, '0');
              codigoInventarioFinal = plantillaInstanciada.replace(placeholderStr, correlativoStr);
              runningCorrelativo++;
            } else {
              codigoInventarioFinal = await parseNextCorrelativo(plantilla, catAbbr, year, tx.bien);
            }

            const existe = await tx.bien.findUnique({
              where: { codigo_inventario: codigoInventarioFinal }
            });
            if (existe) {
              codigoInventarioFinal = `${codigoInventarioFinal}-${Date.now().toString().slice(-4)}`;
            }

            await tx.bien.update({
              where: { id: bien.id },
              data: { codigo_inventario: codigoInventarioFinal }
            });
          }
        }, { timeout: 15000 });

        return NextResponse.json({ success: true, message: `No. de Inventario autogenerado para ${idsInt.length} bienes.` });
      }

      // 1. Dar de baja lógica masiva
      if (darDeBaja) {
        // Terminar asignaciones activas de los bienes dados de baja
        await prisma.asignacion.updateMany({
          where: {
            bienId: { in: idsInt },
            fecha_retorno: null
          },
          data: {
            fecha_retorno: new Date()
          }
        });

        await prisma.bien.updateMany({
          where: { id: { in: idsInt } },
          data: {
            eliminado: true,
            eliminadoEn: new Date(),
            estado: 'Baja'
          }
        });
        return NextResponse.json({ success: true, message: `${idsInt.length} bienes dados de baja en lote.` });
      }

      // 1.5 Restaurar lógica masiva
      if (body.restaurar) {
        await prisma.bien.updateMany({
          where: { id: { in: idsInt } },
          data: {
            eliminado: false,
            eliminadoEn: null,
            estado: estado || 'En reserva'
          }
        });
        return NextResponse.json({ success: true, message: `${idsInt.length} bienes re-activados en lote.` });
      }

      // 2. Actualizar estado masivo
      if (estado) {
        if (estado === 'En reserva') {
          const bodega = await prisma.ubicacion.upsert({
            where: { nombre: 'Bodega General' },
            update: {},
            create: {
              nombre: 'Bodega General',
              edificio: 'Bodega',
              icono: '📦',
              encargado: 'Administrador de Inventario'
            }
          });

          // Mover a bodega y cambiar estado
          await prisma.bien.updateMany({
            where: { id: { in: idsInt } },
            data: { ubicacionId: bodega.id, estado }
          });

          // Terminar asignaciones activas de todos estos bienes
          const activeAsigs = await prisma.asignacion.findMany({
            where: { bienId: { in: idsInt }, fecha_retorno: null }
          });
          for (const asig of activeAsigs) {
            await prisma.asignacion.update({
              where: { id: asig.id },
              data: {
                fecha_retorno: new Date(),
                observaciones: (asig.observaciones ? asig.observaciones + ' | ' : '') + 'Retornado a Bodega por cambio de estado a En reserva masivo'
              }
            });
          }
        } else {
          await prisma.bien.updateMany({
            where: { id: { in: idsInt } },
            data: { estado }
          });
        }
      }

      // 3. Actualizar ubicación física masiva
      if (ubicacionId) {
        await prisma.bien.updateMany({
          where: { id: { in: idsInt } },
          data: { ubicacionId: parseInt(ubicacionId, 10) }
        });
      }

      // 4. Actualizar resguardante/custodio masivo (manteniendo auditoría e historial)
      if (responsableId !== undefined || (responsableNombre && responsableNombre.trim())) {
        let finalPersonalId = null;
        if (responsableId) {
          finalPersonalId = parseInt(responsableId, 10);
        } else if (responsableNombre && responsableNombre.trim()) {
          const nombreLimpio = responsableNombre.trim();
          const coincidencia = await prisma.personal.findFirst({
            where: { nombre: { equals: nombreLimpio, mode: 'insensitive' } }
          });
          if (coincidencia) {
            finalPersonalId = coincidencia.id;
          } else {
            const tempEmail = `noreg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@temp.upen.edu.mx`;
            const nuevoPersonal = await prisma.personal.create({
              data: {
                nombre: nombreLimpio,
                correo: tempEmail,
                puesto: 'Temporal (Por registrar)',
                noRegistrado: true
              }
            });
            finalPersonalId = nuevoPersonal.id;
          }
        }

        // Para cada bien, gestionar la transición de resguardo individualmente
        for (const bienId of idsInt) {
          const ultimaAsignacion = await prisma.asignacion.findFirst({
            where: { bienId },
            orderBy: { fecha_asignacion: 'desc' }
          });

          if (finalPersonalId) {
            if (!ultimaAsignacion || ultimaAsignacion.personalId !== finalPersonalId || ultimaAsignacion.fecha_retorno) {
              if (ultimaAsignacion && !ultimaAsignacion.fecha_retorno) {
                await prisma.asignacion.update({
                  where: { id: ultimaAsignacion.id },
                  data: { fecha_retorno: new Date() }
                });
              }

              await prisma.asignacion.create({
                data: {
                  bienId,
                  personalId: finalPersonalId,
                  estado_entrega: estado || 'Activo',
                  observaciones: 'Asignación masiva en lote'
                }
              });
            }
          } else {
            // Desasignar (retornar a bodega)
            if (ultimaAsignacion && !ultimaAsignacion.fecha_retorno) {
              await prisma.asignacion.update({
                where: { id: ultimaAsignacion.id },
                data: { fecha_retorno: new Date() }
              });
            }
          }
        }
      }

      return NextResponse.json({ success: true, message: `${idsInt.length} bienes actualizados en lote con éxito.` });
    }

    if (!id) {
      return NextResponse.json({ error: 'El ID del bien es requerido para actualizar.' }, { status: 400 });
    }

    // Validar duplicado de serie
    if (numero_serie) {
      const duplicadoSerie = await prisma.bien.findFirst({
        where: {
          numero_serie,
          id: { not: parseInt(id) }
        }
      });
      if (duplicadoSerie) {
        return NextResponse.json({ error: `El número de serie '${numero_serie}' ya está en uso por otro equipo.` }, { status: 400 });
      }
    }

    // Validar duplicado de código de inventario
    if (codigo_inventario && codigo_inventario.trim() !== '' && !codigo_inventario.startsWith('SIN-NUMERO-')) {
      const duplicadoCodigo = await prisma.bien.findFirst({
        where: {
          codigo_inventario,
          id: { not: parseInt(id) }
        }
      });
      if (duplicadoCodigo) {
        return NextResponse.json({ error: `El código de inventario '${codigo_inventario}' ya está en uso por otro equipo.` }, { status: 400 });
      }
    }

    const idInt = parseInt(id);

    // Resolver personalId para PUT
    let finalPersonalId = null;
    let overrideUbicacionId = undefined;

    if (estado === 'En reserva') {
      // Si el estado cambia a 'En reserva', forzamos a que no tenga custodio (retorno a bodega)
      finalPersonalId = null;

      const bodega = await prisma.ubicacion.upsert({
        where: { nombre: 'Bodega General' },
        update: {},
        create: {
          nombre: 'Bodega General',
          edificio: 'Bodega',
          icono: '📦',
          encargado: 'Administrador de Inventario'
        }
      });
      overrideUbicacionId = bodega.id;
    } else if (responsableId) {
      finalPersonalId = parseInt(responsableId, 10);
    } else if (responsableNombre && responsableNombre.trim()) {
      const nombreLimpio = responsableNombre.trim();
      const coincidencia = await prisma.personal.findFirst({
        where: { nombre: { equals: nombreLimpio, mode: 'insensitive' } }
      });
      if (coincidencia) {
        finalPersonalId = coincidencia.id;
      } else {
        const tempEmail = `noreg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@temp.upen.edu.mx`;
        const nuevoPersonal = await prisma.personal.create({
          data: {
            nombre: nombreLimpio,
            correo: tempEmail,
            puesto: 'Temporal (Por registrar)',
            noRegistrado: true
          }
        });
        finalPersonalId = nuevoPersonal.id;
      }
    }

    // Gestionar la asignación (cambio o desasignación)
    const ultimaAsignacion = await prisma.asignacion.findFirst({
      where: { bienId: idInt },
      orderBy: { fecha_asignacion: 'desc' }
    });

    if (finalPersonalId) {
      if (!ultimaAsignacion || ultimaAsignacion.personalId !== finalPersonalId || ultimaAsignacion.fecha_retorno) {
        if (ultimaAsignacion && !ultimaAsignacion.fecha_retorno) {
          await prisma.asignacion.update({
            where: { id: ultimaAsignacion.id },
            data: { fecha_retorno: new Date() }
          });
        }

        await prisma.asignacion.create({
          data: {
            bienId: idInt,
            personalId: finalPersonalId,
            estado_entrega: estado || 'Activo',
            observaciones: 'Asignación actualizada desde edición de bien'
          }
        });
      }
    } else {
      // Si se desasigna el bien (retorno a bodega)
      if (ultimaAsignacion && !ultimaAsignacion.fecha_retorno) {
        const obs = (ultimaAsignacion.observaciones ? ultimaAsignacion.observaciones + ' | ' : '') +
                    (estado === 'En reserva' ? 'Retornado a Bodega por cambio de estado a En reserva' : 'Desasignación por edición de bien');
        await prisma.asignacion.update({
          where: { id: ultimaAsignacion.id },
          data: {
            fecha_retorno: new Date(),
            observaciones: obs
          }
        });
      }
    }

    let modeloLimpio = modelo !== undefined ? modelo.trim() : undefined;
    if (modeloLimpio && marca) {
      if (modeloLimpio.toLowerCase().startsWith(marca.trim().toLowerCase())) {
        modeloLimpio = modeloLimpio.substring(marca.trim().length).trim();
      }
    }

    let finalCodigoInventario = codigo_inventario;
    if (finalCodigoInventario === undefined || finalCodigoInventario === null || finalCodigoInventario.trim() === '') {
      finalCodigoInventario = `SIN-NUMERO-${idInt}`;
    }

    const updateData = {
      codigo_inventario: finalCodigoInventario,
      numero_serie,
      marca,
      modelo: modeloLimpio,
      estado,
      descripcion,
      especificaciones: especificaciones || {},
      fecha_adquisicion: fecha_adquisicion ? new Date(fecha_adquisicion) : null,
      programa_adquisicion: programa_adquisicion || null,
      valor_estimado: valor_estimado ? parseFloat(valor_estimado) : null,
      imagen_url: imagen_url !== undefined ? imagen_url : undefined,
      categoriaId: categoriaId ? parseInt(categoriaId) : undefined,
      ubicacionId: overrideUbicacionId !== undefined ? overrideUbicacionId : (ubicacionId ? parseInt(ubicacionId) : undefined),
      departamentoId: departamentoId ? parseInt(departamentoId) : null
    };

    if (body.restaurar) {
      updateData.eliminado = false;
      updateData.eliminadoEn = null;
      updateData.estado = estado || 'En reserva';
    }

    const bienActualizado = await prisma.bien.update({
      where: { id: idInt },
      data: updateData,
      include: {
        categoria: { select: { nombre: true } },
        ubicacion: { select: { nombre: true } },
        departamento: { select: { nombre: true } },
        asignaciones: {
          take: 1,
          orderBy: { fecha_asignacion: 'desc' },
          include: {
            personal: { select: { id: true, nombre: true, puesto: true } }
          }
        }
      }
    });

    return NextResponse.json(bienActualizado);
  } catch (error) {
    console.error('❌ Error en PUT /api/bienes:', error);
    return NextResponse.json({ error: 'Error al actualizar el bien.' }, { status: 500 });
  }
}

// Dar de baja lógica (soft delete) o eliminación permanente (hard delete)
export async function DELETE(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'El ID del bien es requerido.' }, { status: 400 });
    }

    const idInt = parseInt(id);

    // Verificar que el bien exista
    const bien = await prisma.bien.findUnique({ where: { id: idInt } });
    if (!bien) {
      return NextResponse.json({ error: 'El bien no existe.' }, { status: 404 });
    }

    // ── BORRADO PERMANENTE (HARD DELETE) ────────────────────────
    if (permanent) {

      // 2. Validar que el equipo esté dado de baja (eliminado === true)
      if (!bien.eliminado) {
        return NextResponse.json(
          { error: 'Solo se pueden borrar permanentemente equipos que ya estén dados de baja.' },
          { status: 400 }
        );
      }

      // 3. Obtener contraseña del body para autorizar
      let password = '';
      try {
        const body = await request.json();
        password = body.password;
      } catch (e) {
        return NextResponse.json(
          { error: 'La contraseña es requerida para autorizar esta acción.' },
          { status: 400 }
        );
      }

      if (!password) {
        return NextResponse.json(
          { error: 'La contraseña es requerida para autorizar esta acción.' },
          { status: 400 }
        );
      }

      // 4. Verificar la contraseña contra la base de datos
      const adminUser = await prisma.usuario.findUnique({ where: { id: user.id } });
      if (!adminUser) {
        return NextResponse.json(
          { error: 'Usuario administrador no encontrado.' },
          { status: 404 }
        );
      }

      const isPasswordValid = await verifyPassword(password, adminUser.password_hash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Contraseña incorrecta. Autorización denegada.' },
          { status: 401 }
        );
      }

      // 5. Proceder con la eliminación transaccional
      await prisma.$transaction(async (tx) => {
        // Eliminar historial de asignaciones/resguardos
        await tx.asignacion.deleteMany({
          where: { bienId: idInt }
        });
        // Eliminar el bien (mantenimientos se borran por cascade onDelete)
        await tx.bien.delete({
          where: { id: idInt }
        });
      }, { timeout: 15000 });

      return NextResponse.json({
        success: true,
        message: 'Bien y todo su historial de resguardos eliminados permanentemente.',
      });
    }

    // ── BAJA LÓGICA (SOFT DELETE) ──────────────────────────────
    if (bien.eliminado) {
      return NextResponse.json({ error: 'El bien ya estaba dado de baja.' }, { status: 400 });
    }
    
    // Terminar asignación activa si existe
    const ultimaAsignacion = await prisma.asignacion.findFirst({
      where: { bienId: idInt },
      orderBy: { fecha_asignacion: 'desc' }
    });

    if (ultimaAsignacion && !ultimaAsignacion.fecha_retorno) {
      await prisma.asignacion.update({
        where: { id: ultimaAsignacion.id },
        data: { fecha_retorno: new Date() }
      });
    }

    await prisma.bien.update({
      where: { id: idInt },
      data: {
        eliminado:   true,
        eliminadoEn: new Date(),
        estado:      'Baja',  // actualizar el estado también
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Bien dado de baja correctamente. El registro se conserva en el historial y se cierra su resguardo activo.',
    });
  } catch (error) {
    console.error('❌ Error en DELETE /api/bienes:', error);
    return NextResponse.json({ error: 'Error al eliminar el bien tecnológico.' }, { status: 500 });
  }
}
