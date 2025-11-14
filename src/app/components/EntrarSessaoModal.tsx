"use client";

import { useState } from "react";
import Modal from "./Modal";

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
  const [sessaoId, setSessaoId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!sessaoId.trim()) {
      alert("Por favor, informe o ID ou código da sessão.");
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
      alert("Erro ao entrar na sessão. Veja o console para mais detalhes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full h-full p-6 overflow-auto flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-black">Entrar em uma Sessão</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <div>
            <label
              htmlFor="sessaoId"
              className="block text-sm font-medium mb-2 text-black"
            >
              ID ou Código da Sessão *
            </label>
            <input
              id="sessaoId"
              type="text"
              value={sessaoId}
              onChange={(e) => setSessaoId(e.target.value)}
              placeholder="Cole aqui o ID ou código da sessão"
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-black"
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-600">
              Peça ao mestre da sessão o ID ou código para entrar.
            </p>
          </div>

          <div className="flex gap-3 mt-auto">
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
              {loading ? "Entrando..." : "Entrar na Sessão"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

