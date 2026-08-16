import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { DataProvider } from "@/lib/data-context";
import { PeriodoProvider } from "@/lib/periodo-context";
import AppShell from "@/components/AppShell";
import RegistrarApp from "@/components/RegistrarApp";
import { SCRIPT_TEMA } from "@/lib/tema";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BASE — Gestão financeira",
  description:
    "BASE é o painel financeiro de empresas de serviços: faturamento, contas, fluxo de caixa projetado, DRE e relatórios gerenciais.",
  applicationName: "BASE",
  manifest: "/manifest.webmanifest",
  // Instalada no celular, a BASE abre como aplicativo e some a barra do
  // navegador — daí a cor do tema e o comportamento de tela cheia.
  appleWebApp: { capable: true, title: "BASE", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icone-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Aplica o tema antes da primeira pintura para não haver flash de claro. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full">
        <AuthProvider>
          <DataProvider>
            <PeriodoProvider>
              <AppShell>{children}</AppShell>
              <RegistrarApp />
            </PeriodoProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
