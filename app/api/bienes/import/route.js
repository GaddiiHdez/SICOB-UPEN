import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseNextCorrelativo } from '@/lib/configHelpers';

/**
 * POST /api/bienes/import
 * Recibe un lote de bienes mapeados y los inserta de forma transaccional.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No se enviaron datos para importar.' }, { status: 400 });
    }

    // 1. Validaciones previas de integridad y formato en cada fila
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (!item.marca || !item.marca.trim()) {
        return NextResponse.json({ error: `Fila ${idx + 1}: La marca es obligatoria.` }, { status: 400 });
      }
      if (!item.modelo || !item.modelo.trim()) {
        return NextResponse.json({ error: `Fila ${idx + 1}: El modelo es obligatorio.` }, { status: 400 });
      }
      if (!item.numero_serie || !item.numero_serie.trim()) {
        return NextResponse.json({ error: `Fila ${idx + 1}: El número de serie es obligatorio.` }, { status: 400 });
      }
      if (!item.categoriaId) {
        return NextResponse.json({ error: `Fila ${idx + 1}: La categoría es obligatoria.` }, { status: 400 });
      }
      if (!item.ubicacionId) {
        return NextResponse.json({ error: `Fila ${idx + 1}: La ubicación es obligatoria.` }, { status: 400 });
      }
    }

    // 2. Verificar duplicados de número de serie en el payload enviado
    const series = items.map(x => x.numero_serie.trim());
    const uniqueSeries = [...new Set(series)];
    if (uniqueSeries.length !== items.length) {
      return NextResponse.json({ error: 'El lote contiene números de serie duplicados entre sí.' }, { status: 400 });
    }

    // 3. Verificar si algún número de serie ya existe en la base de datos
    const seriesExistentes = await prisma.bien.findMany({
      where: { numero_serie: { in: uniqueSeries } },
      select: { numero_serie: true }
    });
    if (seriesExistentes.length > 0) {
      const duplicadas = seriesExistentes.map(x => x.numero_serie).join(', ');
      return NextResponse.json({
        error: `Los siguientes números de serie ya están registrados en el sistema: ${duplicadas}`
      }, { status: 400 });
    }

    // 4. Verificar duplicados de códigos de inventario manuales provistos
    const codigosManuales = items.map(x => x.codigo_inventario?.trim()).filter(Boolean);
    if (codigosManuales.length > 0) {
      const uniqueCodigos = [...new Set(codigosManuales)];
      if (uniqueCodigos.length !== codigosManuales.length) {
        return NextResponse.json({ error: 'El lote contiene códigos de inventario manuales duplicados entre sí.' }, { status: 400 });
      }

      const codigosExistentes = await prisma.bien.findMany({
        where: { codigo_inventario: { in: uniqueCodigos } },
        select: { codigo_inventario: true }
      });
      if (codigosExistentes.length > 0) {
        const duplicados = codigosExistentes.map(x => x.codigo_inventario).join(', ');
        return NextResponse.json({
          error: `Los siguientes códigos de inventario ya están registrados en el sistema: ${duplicados}`
        }, { status: 400 });
      }
    }

    // 5. Iniciar inserción en transacción
    const configDoc = await prisma.configuracion.findUnique({
      where: { clave: 'formato_codigo_inventario' }
    });
    const plantilla = configDoc ? configDoc.valor : 'UPEN-{CAT}-{YEAR}-{CORRELATIVO}';
    const year = new Date().getFullYear().toString();

    const creados = [];

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        let codigoFinal = item.codigo_inventario?.trim();

        if (!codigoFinal) {
          // Obtener categoría para abreviatura
          const categoria = await tx.categoria.findUnique({
            where: { id: parseInt(item.categoriaId, 10) }
          });
          const catNombre = categoria ? categoria.nombre : 'EQ';
          const catAbbr = catNombre
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 4);

          // Generar código secuencial en base a la categoría y plantilla
          codigoFinal = await parseNextCorrelativo(plantilla, catAbbr, year, tx.bien);

          // Verificación de redundancia para prevenir colisiones en escritura ultra rápida
          const existe = await tx.bien.findUnique({
            where: { codigo_inventario: codigoFinal }
          });
          if (existe) {
            codigoFinal = `${codigoFinal}-${Date.now().toString().slice(-4)}`;
          }
        }

        const brand = item.marca.trim();
        let modeloLimpio = item.modelo.trim();
        if (modeloLimpio.toLowerCase().startsWith(brand.toLowerCase())) {
          modeloLimpio = modeloLimpio.substring(brand.length).trim();
        }

        const nuevoB = await tx.bien.create({
          data: {
            codigo_inventario: codigoFinal,
            numero_serie: item.numero_serie.trim(),
            marca: brand,
            modelo: modeloLimpio,
            estado: item.estado || 'Activo',
            descripcion: item.descripcion?.trim() || null,
            especificaciones: item.especificaciones || {},
            fecha_adquisicion: item.fecha_adquisicion ? new Date(item.fecha_adquisicion) : null,
            programa_adquisicion: item.programa_adquisicion?.trim() || null,
            valor_estimado: item.valor_estimado ? parseFloat(item.valor_estimado) : null,
            categoriaId: parseInt(item.categoriaId, 10),
            ubicacionId: parseInt(item.ubicacionId, 10),
            departamentoId: item.departamentoId ? parseInt(item.departamentoId, 10) : null,
          }
        });
        creados.push(nuevoB);
      }
    });

    return NextResponse.json({ success: true, count: creados.length });
  } catch (error) {
    console.error('❌ Error en POST /api/bienes/import:', error);
    return NextResponse.json({ error: error.message || 'Error interno al importar los bienes.' }, { status: 500 });
  }
}
