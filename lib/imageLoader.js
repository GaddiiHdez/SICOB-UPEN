/**
 * imageLoader.js - Loader personalizado para next/image
 *
 * Next.js no puede optimizar data URIs (Base64) desde el servidor ya que
 * requieren acceso a la URL remota. Este loader devuelve la src sin
 * transformar, delegando el renderizado al navegador directamente.
 *
 * Tambien sirve para imagenes locales (/public) y SVG sin modificaciones.
 *
 * @param {Object} params
 * @param {string} params.src - La URL o data URI de la imagen
 * @returns {string} - La src sin procesar
 */
export default function imageLoader({ src }) {
  return src;
}
