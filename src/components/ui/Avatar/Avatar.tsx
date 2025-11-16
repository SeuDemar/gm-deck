"use client";

import React, { HTMLAttributes, forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string;
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, name, size = "md", fallback, ...props }, ref) => {
    const sizes = {
      sm: "w-8 h-8 text-sm",
      md: "w-12 h-12 text-base",
      lg: "w-16 h-16 text-xl",
      xl: "w-20 h-20 text-2xl",
    };
    
    const getInitial = (name: string) => {
      return name.charAt(0).toUpperCase();
    };
    
    const displayName = name || fallback || "?";
    const initial = getInitial(displayName);
    const [imageError, setImageError] = useState(false);
    
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-full flex items-center justify-center font-bold bg-brand text-primary border-2 border-primary shadow-md overflow-hidden",
          sizes[size],
          className
        )}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

export default Avatar;

