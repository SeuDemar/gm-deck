"use client";

import { FC, ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";

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
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl shadow-lg w-[95vw] h-[95vh] sm:w-[90vw] sm:h-[90vh] md:w-[85vw] md:h-[85vh] lg:w-[80vw] lg:h-[80vh]"
        style={{
          backgroundColor: "var(--color-text-primary)",
          color: "var(--color-background-dark)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-12 right-6 p-2 rounded-full hover:bg-gray-200/50"
          aria-label="Fechar modal"
        >
          <X className="w-7 h-7 text-error" />
        </Button>

        {children}
      </div>
    </div>
  );
};

export default Modal;
