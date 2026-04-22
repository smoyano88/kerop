import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kerop Café & Tattoo",
  description: "Café de especialidad, pastelería vegana y estudio de tatuajes en Montevideo. Anotate a nuestro Speed Dating.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#FF107A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/img/logo.png" />
      </head>
      <body suppressHydrationWarning>
        <nav className="navbar">
          <div className="container nav-content">
            <Link href="/" className="text-pink" style={{ fontSize: '1.5rem', fontFamily: 'var(--font-outfit)', fontWeight: 700, letterSpacing: '2px' }}>
              KEROP
            </Link>
            <div className="nav-links">
              <Link href="/" className="nav-link">Menú</Link>
              <Link href="/tattoo" className="nav-link">Tattoo Studio</Link>
              <Link href="/eventos" className="nav-link">Speed Dating</Link>
            </div>
          </div>
        </nav>
        <div style={{ paddingTop: '80px' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
