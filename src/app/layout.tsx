import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vector — Cartas SID/STAR",
  description:
    "Console operacional de cartas SID/STAR para controladores e pilotos da rede IVAO.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${plexMono.variable} h-full`}
    >
      <body className="font-sans min-h-full bg-base text-ink">{children}</body>
    </html>
  );
}
