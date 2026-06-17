import { NextResponse } from 'next/server';
import fs from 'fs';
import { createBackup, listBackups, deleteBackup, getBackupPath } from '@/lib/backupService';
import { requireAuth } from '@/lib/auth';

// GET: Listar archivos de respaldos locales o descargar un archivo específico
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    // Caso 1: Descargar un archivo de respaldo específico
    if (filename) {
      try {
        const filepath = getBackupPath(filename);
        if (!fs.existsSync(filepath)) {
          return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
        }
        
        const fileContent = fs.readFileSync(filepath, 'utf-8');
        return new NextResponse(fileContent, {
          headers: {
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Type': 'application/json'
          }
        });
      } catch (err) {
        console.error('❌ Error al descargar respaldo:', err);
        return NextResponse.json({ error: 'Error al leer el archivo de respaldo.' }, { status: 500 });
      }
    }

    // Caso 2: Listar metadatos de respaldos locales
    const backups = listBackups();
    return NextResponse.json({ backups });
  } catch (error) {
    console.error('❌ Error en GET /api/configuracion/backup:', error);
    return NextResponse.json({ error: 'Error al obtener listado de respaldos.' }, { status: 500 });
  }
}

// POST: Crear una instantánea de respaldo manual en el servidor
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }
    const result = await createBackup();
    return NextResponse.json({
      success: true,
      message: 'Instantánea de base de datos creada en el servidor.',
      filename: result.filename,
      totalRecords: result.totalRecords
    });
  } catch (error) {
    console.error('❌ Error en POST /api/configuracion/backup:', error);
    return NextResponse.json({ error: error.message || 'Error al generar el respaldo.' }, { status: 500 });
  }
}

// DELETE: Eliminar una instantánea de respaldo del servidor
export async function DELETE(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Nombre de archivo requerido.' }, { status: 400 });
    }

    deleteBackup(filename);
    return NextResponse.json({ success: true, message: `Archivo ${filename} eliminado.` });
  } catch (error) {
    console.error('❌ Error en DELETE /api/configuracion/backup:', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar el respaldo.' }, { status: 500 });
  }
}
