"use client";

import { useState } from "react";
import Modal from "./Modal";

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
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!nome.trim()) {
      alert("Por favor, preencha o nome da sessão.");
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
      alert("Erro ao criar sessão. Veja o console para mais detalhes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full h-full p-6 overflow-auto flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-black">Criar Nova Sessão</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <div>
            <label
              htmlFor="nome"
              className="block text-sm font-medium mb-2 text-black"
            >
              Nome da Sessão *
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Campanha de Ordem Paranormal"
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-black"
              disabled={loading}
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="descricao"
              className="block text-sm font-medium mb-2 text-black"
            >
              Descrição (opcional)
            </label>
            <textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva sua sessão..."
              rows={6}
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none text-black"
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
              {loading ? "Criando..." : "Criar Sessão"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

