import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cactus — Gestão de Agência",
  description:
    "Sistema de gestão para agências de publicidade e marketing: clientes, projetos, propostas, financeiro, mídia e redes sociais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
