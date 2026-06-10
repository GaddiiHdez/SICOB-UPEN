import "./globals.css";
import ModalGuard from "./components/ModalGuard";

export const metadata = {
  title: "GDI UPEN - Gestor de Inventario Tecnológico",
  description: "Sistema de gestión y control de bienes tecnológicos de la Universidad Politécnica del Estado de Nayarit (UPEN).",
  keywords: "inventario, bienes tecnológicos, UPEN, universidad, gestión activos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ModalGuard />
        {children}
      </body>
    </html>
  );
}
