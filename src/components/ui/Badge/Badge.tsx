"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "error" | "warning" | "info";
  status?: "active" | "pending" | "rejected" | "paused" | "ended" | "inactive";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, status, children, ...props }, ref) => {
    // Mapeamento de status para variantes
    const statusToVariant: Record<
      string,
      "success" | "error" | "warning" | "info" | "default"
    > = {
      active: "success",
      pending: "warning",
      rejected: "error",
      paused: "info",
      ended: "default",
      inactive: "default",
    };

    const effectiveVariant = status
      ? statusToVariant[status]
      : variant || "default";

    const variants = {
      default: "bg-gray-500/20 text-gray-700",
      success: "text-success",
      error: "text-error",
      warning: "text-warning",
      info: "text-info",
    };

    // Estilos inline para background com opacidade (já que Tailwind pode não reconhecer /20 com variáveis customizadas)
    const backgroundStyles: Record<string, React.CSSProperties> = {
      success: { backgroundColor: "rgba(16, 185, 129, 0.2)" },
      error: { backgroundColor: "rgba(239, 68, 68, 0.2)" },
      warning: { backgroundColor: "rgba(245, 158, 11, 0.2)" },
      info: { backgroundColor: "rgba(59, 130, 246, 0.2)" },
      default: { backgroundColor: "rgba(107, 114, 128, 0.2)" },
    };

    const statusLabels: Record<string, string> = {
      active: "Ativa",
      pending: "Pendente",
      rejected: "Recusado",
      paused: "Pausada",
      ended: "Encerrada",
      inactive: "Inativa",
    };

    // Verifica se há classes de background customizadas no className
    // Se houver, não aplica o estilo inline de background
    const hasCustomBackground = className?.includes("bg-");
    const shouldApplyBackgroundStyle = !hasCustomBackground;

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
          variants[effectiveVariant],
          className
        )}
        style={{
          ...(shouldApplyBackgroundStyle
            ? backgroundStyles[effectiveVariant]
            : {}),
          ...props.style,
        }}
        {...props}
      >
        {status ? statusLabels[status] : children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export default Badge;
