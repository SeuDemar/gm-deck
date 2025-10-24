"use client";

import { FC, ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
}

const Modal: FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose} // clicar fora fecha
    >
      <div
        className="relative rounded-2xl shadow-lg w-[95vw] h-[95vh]"
        style={{
          backgroundColor: "var(--color-text-primary)",
          color: "var(--color-background-dark)",
        }}
        onClick={(e) => e.stopPropagation()} // impede clique interno de fechar
      >
        {/* Botão de fechar sempre visível */}
        <button
          onClick={onClose}
          className="absolute top-12 right-6 p-2 rounded-full hover:bg-gray-200 transition"
        >
          <X className="w-7 h-7 text-red-500" />
        </button>

        {/* Conteúdo da modal */}
        {children}
      </div>
    </div>
  );
};

export default Modal;
import { useState } from "react";
