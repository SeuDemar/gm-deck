"use client";

import { useState, useCallback } from "react";
import Modal from "./Modal";
import PdfJsViewer from "./PdfJsViewer";
import { useSupabasePdf } from "@/hooks/useSupabasePdf";

interface PdfFichaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PdfFichaModal({ isOpen, onClose }: PdfFichaModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { savePdfData } = useSupabasePdf();

  // Callback disparado pelo viewer quando coleta valores
  // useCallback evita que a função seja recriada a cada render
  const handleValues = useCallback((v: Record<string, string>) => {
    setValues(v);
  }, []);

  async function salvarNoBanco() {
    setLoading(true);
    try {
      await savePdfData(values);
      alert("Ficha salva no banco com sucesso!");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar ficha. Veja o console para mais detalhes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Conteúdo da modal */}
      <div className="w-full h-full p-4 overflow-hidden flex flex-col">
        <h2 className="text-2xl font-semibold mb-4">Ficha do Personagem</h2>

        {/* PDF Viewer ocupa o restante da tela */}
        <div className="flex-1 min-h-0 overflow-auto rounded-md border p-2 bg-white">
          <PdfJsViewer
            pdfUrl={encodeURI("/fichas/FichaOrdem.pdf")}
            onValues={handleValues}
          />
        </div>

        {/* Botões */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => console.log(values)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Ver campos no console
          </button>

          <button
            disabled={loading}
            onClick={salvarNoBanco}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar no banco"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
