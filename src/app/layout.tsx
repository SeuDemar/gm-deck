import "../styles/tokens.css";
import "./globals.css";
// Importa o CSS obrigatório do PDF.js
import "pdfjs-dist/web/pdf_viewer.css";
import { ToastProvider } from "@/components/ui/Toast";

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
