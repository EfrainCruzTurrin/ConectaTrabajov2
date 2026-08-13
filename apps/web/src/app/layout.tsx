import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Directorio de Servicios',
  description: 'Encontrá trabajadores independientes por categoría y localidad.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
