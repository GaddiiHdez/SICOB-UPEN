/**
 * Módulo de Utilidades para Configuración y Plantillas de Inventario
 * Contiene funciones para extraer padding, actualizar plantillas y calcular consecutivos
 * utilizando expresiones regulares genéricas y robustas.
 */

/**
 * Devuelve el relleno de ceros (padding) a la izquierda configurado para el correlativo.
 * @param {string} format 
 * @returns {number}
 */
export function getCorrelativoPadding(format) {
  if (!format) return 4;
  const match = format.match(/\{CORRELATIVO(?::(\d+))?\}/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 4;
}

/**
 * Actualiza o inyecta el correlativo con un nuevo relleno (padding) en la plantilla.
 * @param {string} format 
 * @param {number} newPadding 
 * @returns {string}
 */
export function updateCorrelativoPadding(format, newPadding) {
  if (!format) return `{CORRELATIVO:${newPadding}}`;
  const hasPlaceholder = /\{CORRELATIVO(?::\d+)?\}/.test(format);
  if (hasPlaceholder) {
    return format.replace(/\{CORRELATIVO(?::\d+)?\}/, `{CORRELATIVO:${newPadding}}`);
  } else {
    return format.endsWith('-') || format === '' ? format + `{CORRELATIVO:${newPadding}}` : format + `-{CORRELATIVO:${newPadding}}`;
  }
}

/**
 * Genera el string de código ficticio para previsualizaciones en tiempo real.
 * @param {string} format 
 * @param {string} categoryAbbr 
 * @param {number} [padding] 
 * @returns {string}
 */
export function generatePreviewCode(format, categoryAbbr, padding) {
  if (!format) return '';
  const selectedCatAbbr = (categoryAbbr || 'COMP').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
  const currentYear = new Date().getFullYear().toString();
  const padLen = padding || getCorrelativoPadding(format);
  const correlativoVal = "42".padStart(padLen, '0');
  
  let result = format;
  result = result.replace('{CAT}', selectedCatAbbr);
  result = result.replace('{YEAR}', currentYear);
  result = result.replace(/\{CORRELATIVO(?::\d+)?\}/, correlativoVal);
  return result;
}

/**
 * Analiza dinámicamente los códigos existentes en la BD para generar el consecutivo incremental
 * basado en la plantilla y la categoría, resolviendo problemas de separadores y colisiones.
 * 
 * ── SEGURIDAD DE CONCURRENCIA Y TRANSACCIONES ──────────────────────────────────────────────
 * Para evitar colisiones de códigos cuando se registran múltiples bienes en lote o bajo
 * peticiones concurrentes simultáneas, la función recibe `bienModel` que puede corresponder
 * al cliente global de Prisma (`prisma.bien`) o al delegado de transacción activo (`tx.bien`).
 * Esto garantiza que las búsquedas de códigos existentes y las siguientes escrituras ocurran
 * dentro del mismo aislamiento de transacción (bloqueo ordenado).
 * 
 * @param {string} plantilla 
 * @param {string} catAbbr 
 * @param {string} year 
 * @param {object} bienModel - Modelo Prisma `prisma.bien` o delegado transaccional `tx.bien`
 * @returns {Promise<string>} Código final autogenerado
 */
export async function parseNextCorrelativo(plantilla, catAbbr, year, bienModel) {
  // Instanciar la plantilla con la categoría y el año
  const plantillaInstanciada = plantilla
    .replace('{CAT}', catAbbr)
    .replace('{YEAR}', year);

  // Buscar el marcador de correlativo {CORRELATIVO} o {CORRELATIVO:N}
  const matchCorr = plantillaInstanciada.match(/\{CORRELATIVO(?::(\d+))?\}/);
  let padding = 4;
  let placeholderStr = '{CORRELATIVO}';
  if (matchCorr) {
    placeholderStr = matchCorr[0];
    if (matchCorr[1]) {
      padding = parseInt(matchCorr[1], 10);
    }
  }

  // Obtener el prefijo y sufijo constante antes y después de la etiqueta de correlativo
  const idx = plantillaInstanciada.indexOf(placeholderStr);
  const prefix = idx !== -1 ? plantillaInstanciada.substring(0, idx) : '';
  const suffix = idx !== -1 ? plantillaInstanciada.substring(idx + placeholderStr.length) : '';

  // Buscar todos los registros que comiencen con el prefijo en la base de datos
  // dentro de la misma transacción para calcular el folio real más alto.
  const bienesConPrefijo = await bienModel.findMany({
    where: { codigo_inventario: { startsWith: prefix } },
    select: { codigo_inventario: true },
  });

  // Escapar caracteres especiales para construir una expresión regular robusta
  const escapeRegex = (str) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const patternStr = '^' + escapeRegex(prefix) + '(\\d+)' + escapeRegex(suffix) + '$';
  const regexMatcher = new RegExp(patternStr);

  // Analizar los códigos e identificar el número secuencial más alto registrado
  let maxCorrelativo = 0;
  for (const { codigo_inventario } of bienesConPrefijo) {
    const match = codigo_inventario.match(regexMatcher);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxCorrelativo) maxCorrelativo = num;
    }
  }

  // Incrementar e inyectar el nuevo valor con el espaciado de ceros (padding)
  const correlativoStr = (maxCorrelativo + 1).toString().padStart(padding, '0');

  // Construir el código de inventario final
  return plantillaInstanciada.replace(placeholderStr, correlativoStr);
}
