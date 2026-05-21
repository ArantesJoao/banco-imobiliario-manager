import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./sw-register";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Super Banco Imobiliário",
  description:
    "Banco digital para o jogo Super Banco Imobiliário. Gerencie jogadores, propriedades e transferências.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Banco BI",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a347a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`h-full antialiased ${display.variable} ${mono.variable}`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink font-display">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
