import "./globals.css";
import ModalGuard from "./components/ModalGuard";
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: "SICOB UPEN - Gestor de Inventario Tecnológico",
  description: "Sistema de gestión y control de bienes tecnológicos de la Universidad Politécnica del Estado de Nayarit (UPEN).",
  keywords: "inventario, bienes tecnológicos, UPEN, universidad, gestión activos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.className}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00716A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/sicob-logo.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) {
                      console.log('Service Worker registrado con éxito ✓');
                    })
                    .catch(function(err) {
                      console.error('Fallo al registrar el Service Worker:', err);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <ModalGuard />
        {children}
      </body>
    </html>
  );
}
