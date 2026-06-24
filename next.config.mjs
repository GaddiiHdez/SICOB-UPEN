/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.0.131', '192.168.0.141'],

  images: {
    // Loader personalizado: devuelve la src sin transformar.
    // Necesario para imágenes Base64 (data:image/...) ya que next/image
    // no puede optimizar data URIs — el loader pasa la URL tal cual al <img>.
    loader: 'custom',
    loaderFile: './lib/imageLoader.js',

    // Permite SVG como fuente de imagen con política de seguridad
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
