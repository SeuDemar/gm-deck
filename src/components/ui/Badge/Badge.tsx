"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "error" | "warning" | "info";
  status?: "active" | "pending" | "rejected" | "paused" | "ended";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, status, children, ...props }, ref) => {
    // Mapeamento de status para variantes
    const statusToVariant: Record<string, "success" | "error" | "warning" | "info" | "default"> = {
      active: "success",
      pending: "warning",
      rejected: "error",
      paused: "info",
      ended: "default",
    };
    
    const effectiveVariant = status ? statusToVariant[status] : variant || "default";
    
    const variants = {
      default: "bg-gray-500/20 text-gray-700",
      success: "bg-success/20 text-success",
      error: "bg-error/20 text-error",
      warning: "bg-warning/20 text-warning",
      info: "bg-info/20 text-info",
    };
    
    const statusLabels: Record<string, string> = {
      active: "Ativa",
      pending: "Pendente",
      rejected: "Recusado",
      paused: "Pausada",
      ended: "Encerrada",
    };
    
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
          variants[effectiveVariant],
          className
        )}
        {...props}
      >
        {status ? statusLabels[status] : children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export default Badge;

