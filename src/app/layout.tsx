import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/lib/data-context";
import { PeriodoProvider } from "@/lib/periodo-context";
import AppShell from "@/components/AppShell";
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
  title: "Gestão Financeira | Dashboard",
  description:
    "Dashboard financeiro para empresas de serviços: faturamento, contas, fluxo de caixa projetado, DRE e relatórios gerenciais.",
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
        <DataProvider>
          <PeriodoProvider>
            <AppShell>{children}</AppShell>
          </PeriodoProvider>
        </DataProvider>
      </body>
    </html>
  );
}
