"use client";

import { useState } from "react";
import Modal from "./Modal";
import { Button, Input, useToastContext } from "@/components/ui";

interface EntrarSessaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntrarSessao: (sessaoId: string) => Promise<void>;
}

export default function EntrarSessaoModal({
  isOpen,
  onClose,
  onEntrarSessao,
}: EntrarSessaoModalProps) {
  const { error: showError, warning } = useToastContext();
  const [sessaoId, setSessaoId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!sessaoId.trim()) {
      warning("Por favor, informe o ID ou código da sessão.");
      return;
    }

    setLoading(true);
    try {
      await onEntrarSessao(sessaoId.trim());
      // Limpa o campo após entrar
      setSessaoId("");
      onClose();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      showError(`Erro ao entrar na sessão: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full h-full p-6 overflow-auto flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-black">Entrar em uma Sessão</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <Input
            label="ID ou Código da Sessão"
            id="sessaoId"
            type="text"
            value={sessaoId}
            onChange={(e) => setSessaoId(e.target.value)}
            placeholder="Cole aqui o ID ou código da sessão"
            required
            disabled={loading}
            helperText="Peça ao mestre da sessão o ID ou código para entrar."
          />

          <div className="flex gap-3 mt-auto">
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
              Entrar na Sessão
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

