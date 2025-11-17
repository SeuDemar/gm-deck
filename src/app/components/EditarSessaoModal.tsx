"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { Button, Input, Textarea, useToastContext } from "@/components/ui";

interface EditarSessaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessaoId: string;
  nomeInicial: string;
  descricaoInicial?: string | null;
  onUpdate: (nome: string, descricao?: string | null) => Promise<void>;
}

export default function EditarSessaoModal({
  isOpen,
  onClose,
  sessaoId,
  nomeInicial,
  descricaoInicial,
  onUpdate,
}: EditarSessaoModalProps) {
  const { error: showError, warning } = useToastContext();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNome(nomeInicial || "");
      setDescricao(descricaoInicial || "");
    }
  }, [isOpen, nomeInicial, descricaoInicial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!nome.trim()) {
      warning("Por favor, preencha o nome da sessão.");
      return;
    }

    setLoading(true);
    try {
      await onUpdate(nome.trim(), descricao.trim() || null);
      onClose();
      } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      showError(`Erro ao atualizar sessão: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full h-full p-6 overflow-auto flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-black">Editar Sessão</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <Input
            label="Nome da Sessão"
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite o nome da sessão"
            required
            disabled={loading}
          />

          <Textarea
            label="Descrição"
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Digite uma descrição para a sessão (opcional)"
            rows={4}
            disabled={loading}
          />

          <div className="flex gap-3 mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              disabled={loading}
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

