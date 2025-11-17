"use client";

import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import { Button } from "@/components/ui";

interface ConfirmacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
}

export default function ConfirmacaoModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  loading = false,
}: ConfirmacaoModalProps) {
  function handleConfirm() {
    onConfirm();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full h-full p-6 overflow-auto flex flex-col">
        <div className="flex items-start gap-4 mb-6">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              variant === "danger"
                ? "bg-red-100"
                : "bg-yellow-100"
            }`}
          >
            <AlertTriangle
              className={`w-6 h-6 ${
                variant === "danger" ? "text-red-600" : "text-yellow-600"
              }`}
            />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2 text-black">{title}</h2>
            <p className="text-gray-600 whitespace-pre-line">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 text-black hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-gray-300"
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={handleConfirm}
            className="flex-1 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            isLoading={loading}
            disabled={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

