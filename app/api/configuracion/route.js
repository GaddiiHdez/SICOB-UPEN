import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Obtener configuración mapeada como objeto clave-valor
export async function GET() {
  try {
    const configs = await prisma.configuracion.findMany();
    const configMap = {};
    configs.forEach(c => {
      configMap[c.clave] = c.valor;
    });

    // Valores por defecto seguros si no están en base de datos
    if (!configMap['formato_codigo_inventario']) {
      configMap['formato_codigo_inventario'] = 'UPEN-{CAT}-{YEAR}-{CORRELATIVO}';
    }
    if (!configMap['nombre_institucion']) {
      configMap['nombre_institucion'] = 'Universidad Politécnica del Estado de Nayarit';
    }
    if (!configMap['siglas_institucion']) {
      configMap['siglas_institucion'] = 'UPEN';
    }
    if (!configMap['logo_institucion']) {
      configMap['logo_institucion'] = '';
    }
    if (!configMap['firma_patrimonio_nombre']) {
      configMap['firma_patrimonio_nombre'] = 'Arq. Ricardo A.';
    }
    if (!configMap['firma_patrimonio_puesto']) {
      configMap['firma_patrimonio_puesto'] = 'Jefe del Departamento de Adquisiciones y Control Patrimonial';
    }
    if (!configMap['firma_jefe_nombre']) {
      configMap['firma_jefe_nombre'] = 'Ing. Lya Paola Estrada Ramirez';
    }
    if (!configMap['firma_jefe_puesto']) {
      configMap['firma_jefe_puesto'] = 'Jefa del Departamento de Informática';
    }
    if (!configMap['firma_tecnico_nombre']) {
      configMap['firma_tecnico_nombre'] = 'Henry Gaddiel Hernandez Cortes';
    }
    if (!configMap['firma_tecnico_puesto']) {
      configMap['firma_tecnico_puesto'] = 'Ingeniero en Sistemas';
    }
    if (!configMap['etiqueta_mostrar_cabecera']) {
      configMap['etiqueta_mostrar_cabecera'] = 'true';
    }
    if (!configMap['etiqueta_mostrar_marca_modelo']) {
      configMap['etiqueta_mostrar_marca_modelo'] = 'true';
    }
    if (!configMap['etiqueta_mostrar_serial']) {
      configMap['etiqueta_mostrar_serial'] = 'true';
    }
    if (!configMap['etiqueta_ancho_mm']) {
      configMap['etiqueta_ancho_mm'] = '30';
    }
    if (!configMap['etiqueta_alto_mm']) {
      configMap['etiqueta_alto_mm'] = '15';
    }
    if (!configMap['etiqueta_altura_codigo_barras_mm']) {
      configMap['etiqueta_altura_codigo_barras_mm'] = '5.6';
    }
    if (!configMap['etiqueta_letra_cabecera_pt']) {
      configMap['etiqueta_letra_cabecera_pt'] = '4.5';
    }
    if (!configMap['etiqueta_letra_marca_modelo_pt']) {
      configMap['etiqueta_letra_marca_modelo_pt'] = '4.2';
    }
    if (!configMap['etiqueta_letra_codigo_pt']) {
      configMap['etiqueta_letra_codigo_pt'] = '5.5';
    }
    if (!configMap['etiqueta_letra_serial_pt']) {
      configMap['etiqueta_letra_serial_pt'] = '5.0';
    }

    return NextResponse.json(configMap);
  } catch (error) {
    console.error('❌ Error en GET /api/configuracion:', error);
    return NextResponse.json({ error: 'Error al obtener la configuración.' }, { status: 500 });
  }
}

// Guardar o actualizar múltiples parámetros de configuración a la vez
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Compatibilidad con formato anterior de guardar plantilla individual { valor }
    if (body.valor !== undefined && body.clave === undefined && body.nombre_institucion === undefined) {
      const configActualizada = await prisma.configuracion.upsert({
        where: { clave: 'formato_codigo_inventario' },
        update: { valor: String(body.valor) },
        create: {
          clave: 'formato_codigo_inventario',
          valor: String(body.valor),
          descripcion: 'Plantilla global para códigos de inventario.'
        }
      });
      return NextResponse.json(configActualizada);
    }

    // Upsert masivo para identidad institucional u otros parámetros
    const entries = Object.entries(body);
    const resultados = [];

    for (const [clave, valor] of entries) {
      if (clave) {
        const item = await prisma.configuracion.upsert({
          where: { clave },
          update: { valor: String(valor) },
          create: {
            clave,
            valor: String(valor),
            descripcion: `Parámetro de configuración: ${clave}`
          }
        });
        resultados.push(item);
      }
    }

    return NextResponse.json({ success: true, resultados });
  } catch (error) {
    console.error('❌ Error en POST /api/configuracion:', error);
    return NextResponse.json({ error: 'Error al guardar la configuración.' }, { status: 500 });
  }
}
