import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FDK – Rejestr spraw",
  description: "Rejestr spraw — Fundacja Firma Dla Każdego",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
