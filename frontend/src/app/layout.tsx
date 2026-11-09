import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grafiquinho • Estúdio de Relatórios e Destaques",
  description:
    "Crie relatórios e gráficos de linha e área estilizados a partir de CSV, Copy/Paste ou entrada manual com DuckDB local.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
