import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseNextCorrelativo } from '@/lib/configHelpers';

export async function POST(request) {
  try {
    // 1. Validar el token de seguridad
    const tokenHeader = request.headers.get('x-colector-token');
    const tokenSecreto = process.env.COLECTOR_TOKEN || 'UPEN_COLECTOR_SECRET_2026';

    if (!tokenHeader || tokenHeader !== tokenSecreto) {
      return NextResponse.json(
        { error: 'Acceso denegado. Token invalido o no suministrado.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { numero_serie, marca, modelo, categoria_sugerida, especificaciones, descripcion } = body;

    if (!numero_serie || !marca) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: numero_serie y marca.' },
        { status: 400 }
      );
    }

    const serialLimpio = numero_serie.trim();
    const marcaLimpia = marca.trim();
    const modeloLimpio = modelo ? modelo.trim() : 'Desconocido';

    // 2. Verificar si el número de serie ya existe
    const bienExistente = await prisma.bien.findUnique({
      where: { numero_serie: serialLimpio }
    });

    if (bienExistente) {
      // Si el equipo ya existe, solo actualizamos sus especificaciones técnicas y descripción
      // (Por si se le agregó memoria RAM, disco, etc. posterior a su registro)
      const bienActualizado = await prisma.bien.update({
        where: { id: bienExistente.id },
        data: {
          especificaciones: especificaciones || bienExistente.especificaciones,
          descripcion: descripcion || bienExistente.descripcion,
        },
        include: {
          categoria: { select: { nombre: true } },
          ubicacion: { select: { nombre: true } }
        }
      });

      return NextResponse.json({
        mensaje: `El equipo con serie '${serialLimpio}' ya estaba registrado. Especificaciones actualizadas.`,
        bien: bienActualizado,
        actualizado: true
      });
    }

    // 3. Resolver la Categoria
    let categoria = null;
    const catSugeridaNombre = categoria_sugerida ? categoria_sugerida.trim() : 'Computo';
    
    // Buscar categoria existente (insensible a mayusculas/minusculas)
    categoria = await prisma.categoria.findFirst({
      where: {
        nombre: {
          equals: catSugeridaNombre,
          mode: 'insensitive'
        }
      }
    });

    // Si no existe la categoria sugerida, buscar la categoria 'Computo' o 'Cómputo' o 'Laptops'
    if (!categoria) {
      categoria = await prisma.categoria.findFirst({
        where: {
          nombre: {
            in: ['Computo', 'Cómputo', 'Laptops', 'Computadoras'],
            mode: 'insensitive'
          }
        }
      });
    }

    // Si sigue sin existir, tomar la primera categoria disponible
    if (!categoria) {
      categoria = await prisma.categoria.findFirst();
    }

    // Si de plano la base de datos no tiene NINGUNA categoria, crear una por defecto
    if (!categoria) {
      categoria = await prisma.categoria.create({
        data: {
          nombre: 'Computo',
          descripcion: 'Equipos de computo registrados por agente colector',
          icono: '💻'
        }
      });
    }

    // 4. Resolver la Ubicacion
    let ubicacion = null;
    // Buscar ubicacion por defecto como 'Bodega', 'Almacen General', etc.
    ubicacion = await prisma.ubicacion.findFirst({
      where: {
        nombre: {
          in: ['Bodega', 'Almacen General', 'Almacén General', 'Pendiente', 'Recepcion', 'Soporte'],
          mode: 'insensitive'
        }
      }
    });

    // Si no se encuentra, tomar la primera ubicacion
    if (!ubicacion) {
      ubicacion = await prisma.ubicacion.findFirst();
    }

    // Si no hay ubicaciones en la base de datos, crear una por defecto
    if (!ubicacion) {
      ubicacion = await prisma.ubicacion.create({
        data: {
          nombre: 'Almacen General',
          edificio: 'Edificio Principal',
          encargado: 'Administrador de Inventario',
          icono: '📦'
        }
      });
    }

    // 5. Generar codigo de inventario automatico
    const configDoc = await prisma.configuracion.findUnique({
      where: { clave: 'formato_codigo_inventario' }
    });
    const plantilla = configDoc ? configDoc.valor : 'UPEN-{CAT}-{YEAR}-{CORRELATIVO}';

    const catAbbr = categoria.nombre
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .substring(0, 4) || 'COMP';
    const year = new Date().getFullYear().toString();

    const codigoInventarioFinal = await parseNextCorrelativo(plantilla, catAbbr, year, prisma.bien);

    // 6. Crear el Bien en la base de datos (con estado 'En reserva' para que el administrador lo asigne)
    const nuevoBien = await prisma.bien.create({
      data: {
        codigo_inventario: codigoInventarioFinal,
        numero_serie: serialLimpio,
        marca: marcaLimpia,
        modelo: modeloLimpio,
        estado: 'En reserva', // Guardar como 'En reserva' para clasificar despues
        descripcion: descripcion || `Computadora marca ${marcaLimpia} modelo ${modeloLimpio} registrada automaticamente por agente colector.`,
        especificaciones: especificaciones || {},
        categoriaId: categoria.id,
        ubicacionId: ubicacion.id,
      },
      include: {
        categoria: { select: { nombre: true } },
        ubicacion: { select: { nombre: true } }
      }
    });

    return NextResponse.json({
      mensaje: `Equipo con serie '${serialLimpio}' registrado exitosamente con codigo ${codigoInventarioFinal}.`,
      bien: nuevoBien,
      creado: true
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error en POST /api/bienes/auto-registrar:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el auto-registro.' },
      { status: 500 }
    );
  }
}
