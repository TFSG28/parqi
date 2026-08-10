import type { Metadata } from "next";
import { Barlow, Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";

// Barlow descende das letras da sinalética rodoviária: a marca Parqi É sinalética.
const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const display = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Parqi · Encontra estacionamento em Portugal",
  description:
    "O Parqi junta dados públicos das câmaras municipais, OpenStreetMap e contribuições da comunidade para te mostrar onde estacionar em Portugal. App gratuita com mapa, confiança da comunidade e rota direta no Google Maps.",
  metadataBase: new URL("https://parqi.pt"),
  keywords: [
    "estacionamento",
    "Portugal",
    "parque",
    "parking",
    "mapa",
    "comunidade",
    "estacionar",
    "Parqi",
  ],
  authors: [{ name: "Parqi" }],
  creator: "Parqi",
  publisher: "Parqi",
  openGraph: {
    title: "Parqi · Encontra estacionamento em Portugal",
    description:
      "App comunitária gratuita para encontrar estacionamento em Portugal. Dados públicos + comunidade. Rota no Google Maps a um toque.",
    url: "https://parqi.pt",
    siteName: "Parqi",
    locale: "pt_PT",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Parqi — Encontra estacionamento em Portugal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Parqi · Encontra estacionamento em Portugal",
    description:
      "App comunitária gratuita para encontrar estacionamento em Portugal.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://parqi.pt",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "apple-touch-icon-precomposed", url: "/icon.png" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT">
      <body className={`${display.variable} ${body.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
