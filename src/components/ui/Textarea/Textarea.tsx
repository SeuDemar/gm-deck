"use client";

import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium mb-2 text-black"
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-colors",
            error
              ? "border-error focus:ring-error"
              : "border-gray-300",
            "text-black placeholder:text-gray-400",
            "disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600",
            "resize-none",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;

