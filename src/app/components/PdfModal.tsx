"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useSupabasePdf } from "@/hooks/useSupabasePdf";
import PdfJsViewer from "./PdfJsViewer";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  pdfId: string;
  userId: string;
}

export default function PdfModal({
  isOpen,
  onClose,
  pdfUrl,
  pdfId,
  userId,
}: Props) {
  const { savePdfData } = useSupabasePdf();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full p-4">
        <div className="flex-1 overflow-auto">
          <PdfJsViewer pdfUrl={pdfUrl} onValues={(vals) => setFields(vals)} />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            onClick={onClose}
            disabled={saving}
          >
            Fechar
          </button>

          <button
            className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
            onClick={async () => {
              setSaving(true);
              try {
                await savePdfData(fields);
                alert("Ficha salva com sucesso!");
                onClose();
              } catch (err) {
                console.error(err);
                alert("Erro ao salvar ficha. Veja console.");
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
