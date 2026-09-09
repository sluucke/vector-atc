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
  title: "Vector ATC Helper",
  description:
    "Console operacional para controladores da rede IVAO: cartas oficiais, procedimentos, pista em uso, meteorologia, NOTAM e tráfego ao vivo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${plexMono.variable} h-full`}
      // The inline script below sets data-theme before hydration, so React is
      // expected to see an attribute the server did not render.
      suppressHydrationWarning
    >
      <body className="font-sans min-h-full bg-base text-ink">
        <script
          // Runs before the rest of the body paints, so the dark default
          // never flashes for someone who chose the light theme.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('vector:theme');if(t==='light')document.documentElement.dataset.theme='light'}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
