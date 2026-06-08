import { NextResponse } from 'next/server';
import fs from 'fs';
import { restoreBackup, getBackupPath } from '@/lib/backupService';

// POST: Restaurar base de datos a partir de una instantánea local o un JSON subido
export async function POST(request) {
  try {
    const body = await request.json();
    const { filename, backupData } = body;

    let targetData = null;

    // Caso A: Restaurar desde un archivo local en el servidor
    if (filename) {
      try {
        const filepath = getBackupPath(filename);
        if (!fs.existsSync(filepath)) {
          return NextResponse.json({ error: `El archivo local '${filename}' no existe.` }, { status: 404 });
        }
        const fileContent = fs.readFileSync(filepath, 'utf-8');
        targetData = JSON.parse(fileContent);
      } catch (err) {
        console.error('❌ Error al leer archivo local de restauración:', err);
        return NextResponse.json({ error: 'Error al abrir el respaldo del servidor.' }, { status: 500 });
      }
    } 
    // Caso B: Restaurar desde datos cargados directamente (Importar JSON)
    else if (backupData) {
      targetData = backupData;
    } 
    // Ninguno de los dos
    else {
      return NextResponse.json({ error: 'Se requiere el nombre del archivo local o los datos del respaldo.' }, { status: 400 });
    }

    // Validar formato básico antes de restaurar
    if (!targetData.data || typeof targetData.data !== 'object') {
      return NextResponse.json({ error: 'Formato de datos de respaldo inválido.' }, { status: 400 });
    }

    // Ejecutar restauración
    await restoreBackup(targetData);

    return NextResponse.json({
      success: true,
      message: 'Base de datos restaurada correctamente a partir de la copia de seguridad.'
    });
  } catch (error) {
    console.error('❌ Error en POST /api/configuracion/backup/restore:', error);
    return NextResponse.json({ error: error.message || 'Error al restaurar la base de datos.' }, { status: 500 });
  }
}
