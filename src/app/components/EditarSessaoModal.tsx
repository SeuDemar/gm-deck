"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";

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
      alert("Por favor, preencha o nome da sessão.");
      return;
    }

    setLoading(true);
    try {
      await onUpdate(nome.trim(), descricao.trim() || null);
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar sessão:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      alert("Erro ao atualizar sessão: " + errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full h-full p-6 overflow-auto flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-black">Editar Sessão</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium mb-2 text-black">
              Nome da Sessão *
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome da sessão"
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-black"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label htmlFor="descricao" className="block text-sm font-medium mb-2 text-black">
              Descrição
            </label>
            <textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Digite uma descrição para a sessão (opcional)"
              rows={4}
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-black resize-none"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded bg-gray-300 text-gray-800 hover:bg-gray-400 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded bg-brand text-primary hover:bg-brand-light transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

