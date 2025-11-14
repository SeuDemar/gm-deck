"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Modal from "./Modal";
import PdfJsViewer from "./PdfJsViewer";
import { useSupabasePdf } from "@/hooks/useSupabasePdf";

interface PdfFichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichaId?: string; // ID da ficha para carregar dados existentes
  onDelete?: () => void; // Callback após deletar a ficha
}

export default function PdfFichaModal({ isOpen, onClose, fichaId, onDelete }: PdfFichaModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { savePdfData, getPdfData, deleteFicha } = useSupabasePdf();

  // Usa ref para getPdfData para evitar re-renders desnecessários
  const getPdfDataRef = useRef(getPdfData);
  useEffect(() => {
    getPdfDataRef.current = getPdfData;
  }, [getPdfData]);

  // Carrega os dados da ficha quando o modal abrir com um fichaId
  useEffect(() => {
    async function loadFichaData() {
      if (!isOpen || !fichaId) {
        setInitialValues({});
        return;
      }

      try {
        setLoadingData(true);
        const fichaData = await getPdfDataRef.current(fichaId);
        if (fichaData) {
          setInitialValues(fichaData);
          setValues(fichaData); // Também define os valores atuais
        }
      } catch (error) {
        console.error("Erro ao carregar dados da ficha:", error);
      } finally {
        setLoadingData(false);
      }
    }

    loadFichaData();
  }, [isOpen, fichaId]);

  // Callback disparado pelo viewer quando coleta valores
  // useCallback evita que a função seja recriada a cada render
  const handleValues = useCallback((v: Record<string, string>) => {
    setValues(v);
  }, []);

  async function salvarFicha() {
    setLoading(true);
    try {
      await savePdfData(values, fichaId);
      alert(fichaId ? "Ficha atualizada com sucesso!" : "Ficha salva com sucesso!");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar ficha. Veja o console para mais detalhes.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteFicha() {
    if (!fichaId) return;

    if (!confirm("Tem certeza que deseja excluir esta ficha? Esta ação não pode ser desfeita.")) {
      return;
    }

    setDeleting(true);
    try {
      await deleteFicha(fichaId);
      alert("Ficha excluída com sucesso!");
      onDelete?.(); // Chama o callback para recarregar a lista
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir ficha. Veja o console para mais detalhes.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Conteúdo da modal */}
      <div className="w-full h-full p-4 overflow-hidden flex flex-col">
        <h2 className="text-2xl font-semibold mb-4">Ficha do Personagem</h2>

        {/* PDF Viewer ocupa o restante da tela */}
        <div className="flex-1 min-h-0 overflow-auto rounded-md border p-2 bg-white">
          {loadingData ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-lg">Carregando dados da ficha...</span>
            </div>
          ) : (
            <PdfJsViewer
              pdfUrl={encodeURI("/fichas/FichaOrdem.pdf")}
              onValues={handleValues}
              initialValues={initialValues}
            />
          )}
        </div>

        {/* Botões */}
        <div className="mt-4 flex gap-3 justify-end">
          {fichaId && (
            <button
              disabled={deleting || loading}
              onClick={handleDeleteFicha}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? "Excluindo..." : "Deletar Ficha"}
            </button>
          )}
          <button
            disabled={loading || deleting}
            onClick={salvarFicha}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Salvando..." : "Salvar Ficha"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
