import { cn } from "@/lib/utils";
import React from "react";

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

export const Typography = {
  H1: ({ children, className }: TypographyProps) => (
    <h1 className={cn("text-3xl font-bold tracking-tight text-gray-900", className)}>
      {children}
    </h1>
  ),
  
  H2: ({ children, className }: TypographyProps) => (
    <h2 className={cn("text-2xl font-semibold tracking-tight text-gray-900", className)}>
      {children}
    </h2>
  ),
  
  H3: ({ children, className }: TypographyProps) => (
    <h3 className={cn("text-xl font-semibold text-gray-900", className)}>
      {children}
    </h3>
  ),
  
  H4: ({ children, className }: TypographyProps) => (
    <h4 className={cn("text-lg font-semibold text-gray-900", className)}>
      {children}
    </h4>
  ),
  
  Body: ({ children, className }: TypographyProps) => (
    <p className={cn("text-base text-gray-700 leading-relaxed", className)}>
      {children}
    </p>
  ),
  
  Small: ({ children, className }: TypographyProps) => (
    <p className={cn("text-sm text-gray-600", className)}>
      {children}
    </p>
  ),
  
  Caption: ({ children, className }: TypographyProps) => (
    <span className={cn("text-xs text-gray-500", className)}>
      {children}
    </span>
  ),
  
  Lead: ({ children, className }: TypographyProps) => (
    <p className={cn("text-lg text-gray-700 leading-relaxed", className)}>
      {children}
    </p>
  ),
  
  Muted: ({ children, className }: TypographyProps) => (
    <span className={cn("text-sm text-gray-500", className)}>
      {children}
    </span>
  ),
  
  Label: ({ children, className }: TypographyProps) => (
    <span className={cn("text-sm font-medium text-gray-700", className)}>
      {children}
    </span>
  ),
};