import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Turbofan Lab — Havanın içinden, motorun kalbine',
  description: 'Turbofan motorunu hareketli kesit, iki hava yolu, canlı grafikler ve etkileşimli deneylerle keşfet. Türkçe eğitim laboratuvarı.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
