"use client";

import { useState } from "react";
import Modal from "./Modal";
import { Button, Input, Textarea, useToastContext } from "@/components/ui";

interface CriarSessaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSessao: (nome: string, descricao?: string) => Promise<void>;
}

export default function CriarSessaoModal({
  isOpen,
  onClose,
  onCreateSessao,
}: CriarSessaoModalProps) {
  const { error: showError, warning } = useToastContext();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!nome.trim()) {
      warning("Por favor, preencha o nome da sessão.");
      return;
    }

    setLoading(true);
    try {
      await onCreateSessao(nome.trim(), descricao.trim() || undefined);
      // Limpa os campos após criar
      setNome("");
      setDescricao("");
      onClose();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      showError(`Erro ao criar sessão: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full h-full p-6 overflow-auto flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-black">Criar Nova Sessão</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <Input
            label="Nome da Sessão"
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Campanha de Ordem Paranormal"
            required
            disabled={loading}
          />

          <div className="flex-1">
            <Textarea
              label="Descrição (opcional)"
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva sua sessão..."
              rows={6}
              disabled={loading}
            />
          </div>

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
              Criar Sessão
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

