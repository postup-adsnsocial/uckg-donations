import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './styles.css';

export const metadata: Metadata = {
  description: 'PRESTARE — Gestão financeira.',
  icons: {
    apple: '/program-logo.png',
    icon: '/program-logo.png',
  },
  title: 'PRESTARE — Gestão financeira.',
};

export const viewport: Viewport = {
  initialScale: 1,
  viewportFit: 'cover',
  width: 'device-width',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
