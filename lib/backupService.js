import fs from 'fs';
import path from 'path';
import prisma from './db.js';

// Directorio de almacenamiento de respaldos locales
const BACKUPS_DIR = path.join(process.cwd(), 'backups');

// Asegurar que la carpeta de respaldos exista
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Lista ordenada de tablas para inserción/eliminación respetando claves foráneas
const TABLES_ORDER = [
  'Configuracion',
  'Usuario',
  'Categoria',
  'Ubicacion',
  'Departamento',
  'Personal',
  'Bien',
  'Asignacion'
];

/**
 * Genera un archivo JSON de respaldo con todos los datos del sistema.
 * @returns {Promise<{filepath: string, filename: string, totalRecords: number}>}
 */
export async function createBackup() {
  try {
    const backupData = {
      metadata: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        totalRecords: 0
      },
      data: {}
    };

    let totalRecords = 0;

    // Obtener los registros de cada tabla
    for (const table of TABLES_ORDER) {
      // Prisma utiliza nombres de modelo en minúscula/camelCase en su cliente
      const clientKey = table.charAt(0).toLowerCase() + table.slice(1);
      const records = await prisma[clientKey].findMany();
      backupData.data[clientKey] = records;
      totalRecords += records.length;
    }

    backupData.metadata.totalRecords = totalRecords;

    // Generar nombre de archivo con timestamp
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:T]/g, '-').split('.')[0];
    const filename = `backup_${timestamp}.json`;
    const filepath = path.join(BACKUPS_DIR, filename);

    // Escribir archivo JSON formateado
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf-8');

    return {
      filepath,
      filename,
      totalRecords
    };
  } catch (error) {
    console.error('❌ Error en createBackup:', error);
    throw new Error(`Falla al generar respaldo: ${error.message}`);
  }
}

/**
 * Restaura la base de datos a partir de un objeto JSON de respaldo.
 * @param {Object} backupData - Objeto JSON con el respaldo completo
 */
export async function restoreBackup(backupData) {
  if (!backupData || !backupData.data) {
    throw new Error('Formato de respaldo inválido: faltan los datos del sistema.');
  }

  const { data } = backupData;

  try {
    // Ejecutar borrado e inserción en una sola transacción transaccional
    await prisma.$transaction(async (tx) => {
      console.log('🧹 Iniciando vaciado de base de datos...');
      
      // 1. ELIMINAR DATOS EN ORDEN INVERSO (De Hijos a Padres)
      // Se requiere el orden inverso para no violar la integridad referencial (claves foráneas)
      // de PostgreSQL. Por ejemplo, no se puede borrar una Categoría si existen bienes vinculados a ella.
      const reversedTables = [...TABLES_ORDER].reverse();
      for (const table of reversedTables) {
        const clientKey = table.charAt(0).toLowerCase() + table.slice(1);
        await tx[clientKey].deleteMany({});
      }
      console.log('🧹 Vaciado completado con éxito.');

      // 2. INSERTAR DATOS EN ORDEN DIRECTO (De Padres a Hijos)
      // Se inserta respetando las dependencias jerárquicas primarias.
      console.log('📥 Insertando datos de respaldo...');
      for (const table of TABLES_ORDER) {
        const clientKey = table.charAt(0).toLowerCase() + table.slice(1);
        const records = data[clientKey];

        if (records && records.length > 0) {
          // Nota: pg_dump/restore no es necesario, prisma createMany es muy rápido
          // Ajustamos fechas a objetos Date para evitar que Prisma se confunda
          const formattedRecords = records.map(record => {
            const copy = { ...record };
            
            // Convertir strings de fecha a Date
            if (copy.createdAt) copy.createdAt = new Date(copy.createdAt);
            if (copy.updatedAt) copy.updatedAt = new Date(copy.updatedAt);
            if (copy.fecha_adquisicion) copy.fecha_adquisicion = new Date(copy.fecha_adquisicion);
            if (copy.eliminadoEn) copy.eliminadoEn = new Date(copy.eliminadoEn);
            if (copy.fecha_asignacion) copy.fecha_asignacion = new Date(copy.fecha_asignacion);
            if (copy.fecha_retorno) copy.fecha_retorno = new Date(copy.fecha_retorno);

            return copy;
          });

          await tx[clientKey].createMany({
            data: formattedRecords
          });
          console.log(`✅ Tabla "${table}" restaurada con ${records.length} registros.`);
        }
      }

      // 3. SINCRONIZAR LAS SECUENCIAS AUTOINCREMENTABLES DE POSTGRESQL
      // Al forzar la reinserción de IDs originales primarios, PostgreSQL no actualiza internamente
      // el puntero de las secuencias serial correspondientes. Si no se sincronizan mediante SQL nativo,
      // la base de datos colisionará al intentar generar un nuevo ID (error de clave duplicada) en inserciones futuras.
      console.log('🔄 Sincronizando secuencias autoincrementales (autoincrement) en PostgreSQL...');
      for (const table of TABLES_ORDER) {
        const maxIdRes = await tx.$queryRawUnsafe(`SELECT MAX(id) as max_id FROM "${table}";`);
        const maxId = maxIdRes[0]?.max_id;

        if (maxId !== null && maxId !== undefined) {
          // SELECT setval(..., max_id) sincroniza la secuencia de la tabla en el ID máximo actual.
          await tx.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), ${maxId}, true);`
          );
          console.log(`🔄 Secuencia de "${table}" sincronizada en ID = ${maxId}.`);
        } else {
          // Si está vacía, reiniciamos la secuencia a 1
          const seqRes = await tx.$queryRawUnsafe(
            `SELECT pg_get_serial_sequence('"${table}"', 'id') as seq;`
          );
          const seqName = seqRes[0]?.seq;
          if (seqName) {
            await tx.$executeRawUnsafe(`ALTER SEQUENCE ${seqName} RESTART WITH 1;`);
            console.log(`🔄 Secuencia de "${table}" reiniciada a 1 (Tabla vacía).`);
          }
        }
      }
    });

    console.log('🎉 Restauración de base de datos finalizada exitosamente.');
    return true;
  } catch (error) {
    console.error('❌ Error en restoreBackup:', error);
    throw new Error(`Falla al restaurar base de datos: ${error.message}`);
  }
}

/**
 * Lista todos los respaldos locales guardados en la carpeta /backups.
 * @returns {Array<{filename: string, timestamp: string, sizeBytes: number}>}
 */
export function listBackups() {
  try {
    const files = fs.readdirSync(BACKUPS_DIR);
    const backupFiles = files
      .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
      .map(file => {
        const filepath = path.join(BACKUPS_DIR, file);
        const stats = fs.statSync(filepath);
        
        // Extraer timestamp del nombre o usar stats
        // backup_YYYY-MM-DD-HH-MM-SS.json
        const cleanName = file.replace('backup_', '').replace('.json', '');
        const parts = cleanName.split('-');
        let timestamp = stats.mtime.toISOString();
        if (parts.length >= 6) {
          const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:${parts[4]}:${parts[5]}.000Z`;
          if (!isNaN(Date.parse(dateStr))) {
            timestamp = new Date(dateStr).toISOString();
          }
        }

        return {
          filename: file,
          timestamp,
          sizeBytes: stats.size
        };
      });

    // Ordenar los respaldos del más reciente al más antiguo
    return backupFiles.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('❌ Error en listBackups:', error);
    return [];
  }
}

/**
 * Elimina un archivo de respaldo específico.
 * @param {string} filename - Nombre del archivo de respaldo
 */
export function deleteBackup(filename) {
  // Evitar ataques de Directory Traversal validando el nombre
  if (path.basename(filename) !== filename) {
    throw new Error('Nombre de archivo inválido.');
  }

  const filepath = path.join(BACKUPS_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    return true;
  } else {
    throw new Error('El archivo no existe.');
  }
}

/**
 * Obtiene la ruta física de un archivo de respaldo.
 * @param {string} filename - Nombre del archivo
 * @returns {string}
 */
export function getBackupPath(filename) {
  if (path.basename(filename) !== filename) {
    throw new Error('Nombre de archivo inválido.');
  }
  return path.join(BACKUPS_DIR, filename);
}
