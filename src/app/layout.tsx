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
  title: "Satoshi Pixel Grid - 100,000,000 pixels = 1 Bitcoin",
  description: "Purchase pixels using Lightning Network. Each pixel costs 1 satoshi (0.00000001 BTC). Create your own pixel art on the Bitcoin blockchain.",
  keywords: "bitcoin, lightning network, pixel grid, satoshi, crypto art, pixel art, blockchain art, bitcoin art, satoshi pixel grid",
  authors: [{ name: "Satoshi Pixel Grid" }],
  openGraph: {
    title: "Satoshi Pixel Grid - Bitcoin Pixel Art",
    description: "Purchase pixels using Lightning Network. Each pixel costs 1 satoshi (0.00000001 BTC).",
    url: "https://satoshipixelgrid.com",
    siteName: "Satoshi Pixel Grid",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Satoshi Pixel Grid - Bitcoin Pixel Art",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Satoshi Pixel Grid - Bitcoin Pixel Art",
    description: "Purchase pixels using Lightning Network. Each pixel costs 1 satoshi (0.00000001 BTC).",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
