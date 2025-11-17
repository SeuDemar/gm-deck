"use client";

import { Plus, LogIn } from "lucide-react";
import Modal from "./Modal";

interface EscolherSessaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCriarSessao: () => void;
  onEntrarSessao: () => void;
}

export default function EscolherSessaoModal({
  isOpen,
  onClose,
  onCriarSessao,
  onEntrarSessao,
}: EscolherSessaoModalProps) {
  function handleCriarSessao() {
    onClose();
    onCriarSessao();
  }

  function handleEntrarSessao() {
    onClose();
    onEntrarSessao();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full h-full p-6 overflow-auto flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-black">Nova Sessão</h2>
        <p className="text-gray-600 mb-6">Escolha uma opção:</p>

        <div className="flex flex-col gap-4 flex-1">
          <button
            onClick={handleCriarSessao}
            className="flex items-center gap-4 p-6 rounded-lg border-2 border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all cursor-pointer text-left group"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
              <Plus className="w-6 h-6 text-brand" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-black mb-1">
                Criar uma sessão
              </h3>
              <p className="text-sm text-gray-600">
                Crie uma nova sessão de RPG e seja o mestre
              </p>
            </div>
          </button>

          <button
            onClick={handleEntrarSessao}
            className="flex items-center gap-4 p-6 rounded-lg border-2 border-brand hover:border-brand-light hover:bg-brand-light/5 transition-all cursor-pointer text-left group"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
              <LogIn className="w-6 h-6 text-brand" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-black mb-1">
                Entrar em sessão já existente
              </h3>
              <p className="text-sm text-gray-600">
                Entre em uma sessão usando o ID ou código da sessão
              </p>
            </div>
          </button>
        </div>
      </div>
    </Modal>
  );
}

