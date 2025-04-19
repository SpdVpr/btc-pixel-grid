import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientInitDatabase from "@/components/ClientInitDatabase";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Satoshi Pixel Grid - 100 000 000 pixelů = 1 Bitcoin",
  description: "Nakupujte pixely pomocí Lightning Network. Každý pixel stojí 1 satoshi (0.00000001 BTC).",
  keywords: "bitcoin, lightning network, pixel grid, satoshi, krypto umění",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Komponenta pro inicializaci databáze při startu aplikace */}
        {process.env.NODE_ENV === 'production' && <ClientInitDatabase />}
        {children}
      </body>
    </html>
  );
}
