/**
 * Generador nativo de código de barras en formato SVG (Estándar Code 128 - Set B)
 * Soporta de forma nativa todo el set ASCII imprimible (letras mayúsculas, minúsculas, números, guiones y espacios).
 * Es un 36% más compacto que Code 39, permitiendo líneas más espaciadas y legibles en etiquetas pequeñas.
 * No requiere dependencias externas.
 */

export function generateBarcodeSVG(text, includeText = true) {
  if (!text) return '';

  const cleanText = text.toString().trim();

  // ── MAPEO DE CARACTERES CODE 128 ───────────────────────────────────────
  // El estándar industrial Code 128 define 103 patrones de barras y espacios.
  // Cada patrón se representa mediante una secuencia de 6 dígitos que alternan
  // el ancho de barras (índices pares) y espacios (índices impares).
  // La suma de los anchos de cada módulo siempre equivale a 11 unidades (ej: "212222" -> 2+1+2+2+2+2 = 11).
  const data = "212222222122222221121223121322131222122213122312132212221213221312231212112232122132122231113222123122123221223211221132221231213212223112312131311222321122321221312212322112322211212123212321232121111323131123131321112313132113132311211313231113231311112133112331132131113123113321133121313121211331231131213113213311213131311123311321331121312113312311332111314111221411431111111224111422121124121421141122141221112214112412122114122411142112142211241211221114413111241112134111111242121142121241114212124112124211411212421112421211212141214121412121111143111341131141114113114311411113411311113141114131311141411131"
    .split(/(\d{6})/)
    .filter(Boolean);

  // Mapeamos los caracteres imprimibles ASCII (rango 32 - espacio a 126 - tilde ~)
  // asociando su valor de índice para el cálculo del dígito verificador.
  const lookup = {};
  for (let i = 32; i < 127; i++) {
    lookup[String.fromCharCode(i)] = [i - 32, data[i - 32]];
  }

  // ── CONFIGURACIÓN DE DIMENSIONES (CUMPLIMIENTO DE LECTURA) ──────────────
  const f = 2;                      // Multiplicador de ancho (módulo X-dimension).
  const height = 130;               // Altura de barras (proporciona tolerancia vertical para pistolas escáner).
  const quietZone = 10;             // Margen silencioso a los costados para evitar lecturas fallidas por sombras.
  const totalHeight = height + (includeText ? 26 : 8); // Ajuste dinámico de lienzo para albergar texto legible.

  let x = quietZone;
  const rects = [];

  // Función recursiva/auxiliar que traduce el patrón del estándar a elementos SVG <rect>
  function draw(pattern) {
    pattern.split("").forEach((n, i) => {
      const w = parseInt(n, 10) * f;
      const isBar = i % 2 === 0; // Índices pares son barras de color negro, impares son espacios transparentes
      if (isBar) {
        rects.push(`<rect x="${x}" y="4" width="${w}" height="${height}" fill="black" />`);
      }
      x += w;
    });
  }

  // 1. CARÁCTER START B (Valor 104)
  // Requerido por el estándar Code 128 para indicarle al hardware que se lee en Set B (letras y números mixtos).
  // Su patrón codificado corresponde a "211214".
  draw("211214");

  // 2. DIBUJAR DATOS Y CALCULAR CHECKSUM (Módulo 103)
  // El checksum es una suma ponderada: Valor_Start + Suma(Valor_Carácter * Posición_Carácter_1_Based).
  let sum = 104; 
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const item = lookup[char] || [0, "212222"]; // Fallback a carácter espacio en caso de caracteres fuera de rango.
    sum += item[0] * (i + 1);
    draw(item[1]);
  }

  // 3. DIBUJAR EL CHECKSUM OBTENIDO
  // Se obtiene el residuo de la suma modulo 103 (sum % 103) y se dibuja su patrón asociado.
  // Esto previene lecturas truncadas o falsos positivos en el escáner.
  draw(data[sum % 103]);

  // 4. CARÁCTER STOP ("2331112")
  // Indica el final de la cadena de barras. Posee una barra extra al final para cerrar el módulo.
  draw("2331112");

  const totalWidth = x + quietZone;

  // Generar marcado SVG limpio
  return `
    <svg viewBox="0 0 ${totalWidth.toFixed(0)} ${totalHeight}" width="100%" height="100%" preserveAspectRatio="none" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" class="barcode-svg">
      <rect width="100%" height="100%" fill="white" />
      <g>
        ${rects.join('\n        ')}
      </g>
      ${includeText ? `
      <text x="${(totalWidth / 2).toFixed(1)}" y="${height + 22}" font-family="monospace" font-size="18" font-weight="900" fill="black" text-anchor="middle" letter-spacing="1">
        ${cleanText}
      </text>` : ''}
    </svg>
  `.trim();
}
