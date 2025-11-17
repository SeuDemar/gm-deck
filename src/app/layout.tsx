import "../styles/tokens.css";
import "./globals.css";
// Importa o CSS obrigatório do PDF.js
import "pdfjs-dist/web/pdf_viewer.css";
import { ToastProvider } from "@/components/ui/Toast";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GM Deck",
  description: "Sistema de gerenciamento de fichas e sessões de RPG",
  icons: {
    icon: "/dataset/Gm-deck-image.png",
    shortcut: "/dataset/Gm-deck-image.png",
    apple: "/dataset/Gm-deck-image.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
