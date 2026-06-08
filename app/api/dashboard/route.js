import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // 1. Estadísticas básicas
    const totalBienes = await prisma.bien.count();
    
    const bienesActivos = await prisma.bien.count({
      where: { estado: { in: ['Activo', 'En reserva'] } }
    });

    const bienesMantenimiento = await prisma.bien.count({
      where: { estado: 'Mantenimiento' }
    });

    const bienesBaja = await prisma.bien.count({
      where: { estado: 'Baja' }
    });

    const valorEstimadoResult = await prisma.bien.aggregate({
      _sum: {
        valor_estimado: true
      }
    });
    const valorTotal = valorEstimadoResult._sum.valor_estimado || 0;

    // 2. Conteo agrupado por categorías
    const categorias = await prisma.categoria.findMany({
      include: {
        _count: {
          select: { bienes: true }
        }
      }
    });
    
    const distribucionCategorias = categorias.map(cat => ({
      nombre: cat.nombre,
      cantidad: cat._count.bienes
    }));

    // 3. Actividad reciente: Últimas asignaciones
    const ultimasAsignaciones = await prisma.asignacion.findMany({
      take: 5,
      orderBy: { fecha_asignacion: 'desc' },
      include: {
        bien: {
          select: {
            codigo_inventario: true,
            marca: true,
            modelo: true
          }
        },
        usuario: {
          select: {
            nombre: true
          }
        }
      }
    });

    // 4. Bienes agregados recientemente
    const ultimosBienes = await prisma.bien.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        categoria: { select: { nombre: true } },
        ubicacion: { select: { nombre: true } }
      }
    });

    return NextResponse.json({
      resumen: {
        total: totalBienes,
        activos: bienesActivos,
        mantenimiento: bienesMantenimiento,
        baja: bienesBaja,
        valorTotal: valorTotal
      },
      distribucionCategorias,
      ultimasAsignaciones,
      ultimosBienes
    });
  } catch (error) {
    console.error('❌ Error en GET /api/dashboard:', error);
    return NextResponse.json({ error: 'Error al cargar datos del Dashboard.' }, { status: 500 });
  }
}
