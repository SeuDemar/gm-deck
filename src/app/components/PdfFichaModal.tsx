"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Modal from "./Modal";
import PdfJsViewer from "./PdfJsViewer";
import { useSupabasePdf } from "@/hooks/useSupabasePdf";
import { Button, Loading } from "@/components/ui";

interface PdfFichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichaId?: string; // ID da ficha para carregar dados existentes
  onDelete?: () => void; // Callback após deletar a ficha
  readOnly?: boolean; // Se true, desabilita edição e exclusão da ficha
}

export default function PdfFichaModal({ isOpen, onClose, fichaId, onDelete, readOnly = false }: PdfFichaModalProps) {
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
      <div className="w-full h-full p-6 overflow-hidden flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-black">Ficha do Personagem</h2>

        {/* PDF Viewer ocupa o restante da tela */}
        <div 
          className="flex-1 min-h-0 overflow-auto rounded-lg border"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-background-white)",
            padding: "var(--spacing-4)",
          }}
        >
          {loadingData ? (
            <div className="flex items-center justify-center h-full">
              <Loading message="Carregando dados da ficha..." />
            </div>
          ) : (
            <PdfJsViewer
              pdfUrl={encodeURI("/fichas/FichaOrdem.pdf")}
              onValues={handleValues}
              initialValues={initialValues}
              readOnly={readOnly}
            />
          )}
        </div>

        {/* Botões - apenas se não for readOnly */}
        {!readOnly && (
          <div className="mt-6 flex gap-3 justify-end">
            {fichaId && (
              <Button
                variant="danger"
                onClick={handleDeleteFicha}
                isLoading={deleting}
                disabled={deleting || loading}
              >
                {deleting ? "Excluindo..." : "Deletar Ficha"}
              </Button>
            )}
            <Button
              variant="primary"
              onClick={salvarFicha}
              isLoading={loading}
              disabled={loading || deleting}
            >
              {loading ? "Salvando..." : "Salvar Ficha"}
            </Button>
          </div>
        )}
        {readOnly && (
          <div className="mt-6 flex justify-center">
            <p 
              className="text-sm italic"
              style={{ color: "var(--color-text-muted)" }}
            >
              Modo somente leitura - Esta ficha pertence a outro jogador
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
