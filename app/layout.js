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
      </head>
      <body>
        <ModalGuard />
        {children}
      </body>
    </html>
  );
}
