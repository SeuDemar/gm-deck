"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Modal from "./Modal";
import PdfJsViewer, { PdfJsViewerRef } from "./PdfJsViewer";
import { useSupabasePdf } from "@/hooks/useSupabasePdf";
import { Button, Loading, useToastContext } from "@/components/ui";

interface PdfFichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichaId?: string; // ID da ficha para carregar dados existentes
  onDelete?: () => void; // Callback após deletar a ficha
  readOnly?: boolean; // Se true, desabilita edição e exclusão da ficha
}

export default function PdfFichaModal({
  isOpen,
  onClose,
  fichaId,
  onDelete,
  readOnly = false,
}: PdfFichaModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { savePdfData, getPdfData, deleteFicha } = useSupabasePdf();
  const { success, error: showError } = useToastContext();

  // Usa ref para getPdfData para evitar re-renders desnecessários
  const getPdfDataRef = useRef(getPdfData);
  useEffect(() => {
    getPdfDataRef.current = getPdfData;
  }, [getPdfData]);

  // Usa ref para showError para evitar re-renders desnecessários
  const showErrorRef = useRef(showError);
  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

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
      } catch (err) {
        console.error("Erro ao carregar dados da ficha:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Erro desconhecido ao carregar ficha";
        showErrorRef.current(
          `Não foi possível carregar os dados da ficha: ${errorMessage}`
        );
      } finally {
        setLoadingData(false);
      }
    }

    loadFichaData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fichaId]);

  // Ref para acessar o viewer e forçar coleta de valores
  const pdfViewerRef = useRef<PdfJsViewerRef | null>(null);

  // Callback disparado pelo viewer quando coleta valores
  // useCallback evita que a função seja recriada a cada render
  const handleValues = useCallback((v: Record<string, string>) => {
    console.log("handleValues chamado com:", v);
    setValues(v);
  }, []);

  async function salvarFicha() {
    setLoading(true);
    try {
      // Força coleta de valores antes de salvar
      // Isso garante que temos os valores mais recentes diretamente dos campos do PDF
      let valuesToSave = values;

      if (pdfViewerRef.current?.collectValues) {
        const latestValues = pdfViewerRef.current.collectValues();
        console.log("Valores coletados antes de salvar:", latestValues);
        console.log(
          "Quantidade de campos coletados:",
          Object.keys(latestValues).length
        );

        // Usa os valores coletados diretamente, não do state
        valuesToSave = latestValues;

        // Atualiza o state também para manter sincronizado
        setValues(latestValues);
      } else {
        console.warn(
          "pdfViewerRef não está disponível, usando valores do state"
        );
      }

      // Log dos valores antes de salvar para debug
      console.log("Valores a serem salvos:", valuesToSave);
      console.log("Quantidade de campos:", Object.keys(valuesToSave).length);

      // Verifica se há valores vazios
      const emptyFields = Object.entries(valuesToSave).filter(
        ([_, value]) => !value || value.trim() === ""
      );
      if (emptyFields.length > 0) {
        console.warn("Campos vazios encontrados:", emptyFields);
      }

      await savePdfData(valuesToSave, fichaId);
      success(
        fichaId ? "Ficha atualizada com sucesso!" : "Ficha salva com sucesso!"
      );
      onClose();
    } catch (err) {
      console.error("Erro ao salvar ficha:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      showError(`Erro ao salvar ficha: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteFicha() {
    if (!fichaId) return;

    if (
      !confirm(
        "Tem certeza que deseja excluir esta ficha? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      await deleteFicha(fichaId);
      success("Ficha excluída com sucesso!");
      onDelete?.(); // Chama o callback para recarregar a lista
      onClose();
    } catch (err) {
      console.error("Erro ao excluir ficha:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      showError(`Erro ao excluir ficha: ${errorMessage}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full flex flex-col" style={{ border: "none" }}>
        {/* Cabeçalho fixo */}
        <div className="flex-shrink-0 p-6 pb-4">
          <h2 className="text-2xl font-bold text-black">Ficha do Personagem</h2>
        </div>

        {/* Área do PDF - se adapta ao conteúdo */}
        <div
          className="overflow-x-hidden"
          style={{
            backgroundColor: "#ffffff",
            paddingBottom: "0",
            marginBottom: "0",
            border: "none",
          }}
        >
          {loadingData ? (
            <div
              className="flex items-center justify-center"
              style={{ minHeight: "400px" }}
            >
              <Loading message="Carregando dados da ficha..." />
            </div>
          ) : (
            <div
              className="w-full flex items-start justify-center"
              style={{
                backgroundColor: "#ffffff",
                border: "none",
                padding: "16px 0",
              }}
            >
              <PdfJsViewer
                ref={pdfViewerRef}
                pdfUrl="/fichas/FichaOrdem.pdf"
                onValues={handleValues}
                initialValues={initialValues}
                readOnly={readOnly}
                isVisible={isOpen}
              />
            </div>
          )}
        </div>

        {/* Botões fixos no final - apenas se não for readOnly */}
        {!readOnly && (
          <div
            className="flex-shrink-0 p-6 pt-4 flex gap-3 justify-end"
            style={{ border: "none" }}
          >
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
          <div
            className="flex-shrink-0 p-6 pt-4 flex justify-center"
            style={{ border: "none" }}
          >
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
