import React, { createContext, useContext, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// High contrast theme context
interface ContrastContextType {
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  contrastLevel: "normal" | "high" | "maximum";
  setContrastLevel: (level: "normal" | "high" | "maximum") => void;
}

const ContrastContext = createContext<ContrastContextType | null>(null);

export function ContrastProvider({ children }: { children: React.ReactNode }) {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [contrastLevel, setContrastLevel] = useState<"normal" | "high" | "maximum">("normal");

  useEffect(() => {
    // Check for system preference or saved setting
    const savedContrast = localStorage.getItem("high-contrast");
    const savedLevel = localStorage.getItem("contrast-level") as "normal" | "high" | "maximum";
    
    if (savedContrast === "true") {
      setIsHighContrast(true);
    }
    
    if (savedLevel) {
      setContrastLevel(savedLevel);
    } else {
      // Check system preference
      const prefersHighContrast = window.matchMedia("(prefers-contrast: high)").matches;
      if (prefersHighContrast) {
        setIsHighContrast(true);
        setContrastLevel("high");
      }
    }
  }, []);

  useEffect(() => {
    // Apply contrast classes to document
    const root = document.documentElement;
    
    if (isHighContrast) {
      root.classList.add("high-contrast");
      root.classList.add(`contrast-${contrastLevel}`);
    } else {
      root.classList.remove("high-contrast");
      root.classList.remove("contrast-normal", "contrast-high", "contrast-maximum");
    }

    // Save to localStorage
    localStorage.setItem("high-contrast", isHighContrast.toString());
    localStorage.setItem("contrast-level", contrastLevel);
  }, [isHighContrast, contrastLevel]);

  const toggleHighContrast = () => {
    setIsHighContrast(!isHighContrast);
    if (!isHighContrast && contrastLevel === "normal") {
      setContrastLevel("high");
    }
  };

  return (
    <ContrastContext.Provider value={{
      isHighContrast,
      toggleHighContrast,
      contrastLevel,
      setContrastLevel
    }}>
      {children}
    </ContrastContext.Provider>
  );
}

export function useContrast() {
  const context = useContext(ContrastContext);
  if (!context) {
    throw new Error("useContrast must be used within ContrastProvider");
  }
  return context;
}

// High contrast button component
interface HighContrastButtonProps {
  variant?: "icon" | "text" | "full";
  className?: string;
}

export function HighContrastButton({ 
  variant = "full", 
  className 
}: HighContrastButtonProps) {
  const { isHighContrast, toggleHighContrast, contrastLevel, setContrastLevel } = useContrast();

  if (variant === "icon") {
    return (
      <button
        onClick={toggleHighContrast}
        className={cn(
          "p-2 rounded-md transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary-500",
          isHighContrast 
            ? "bg-gray-900 text-white hover:bg-gray-800"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200",
          className
        )}
        aria-label={isHighContrast ? "고대비 모드 끄기" : "고대비 모드 켜기"}
        title={isHighContrast ? "고대비 모드 끄기" : "고대비 모드 켜기"}
      >
        <ContrastIcon className="h-5 w-5" />
      </button>
    );
  }

  if (variant === "text") {
    return (
      <button
        onClick={toggleHighContrast}
        className={cn(
          "text-sm underline transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 rounded",
          isHighContrast ? "text-white" : "text-gray-600 hover:text-gray-900",
          className
        )}
      >
        {isHighContrast ? "고대비 모드 끄기" : "고대비 모드 켜기"}
      </button>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          고대비 모드
        </label>
        <button
          onClick={toggleHighContrast}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
            isHighContrast ? "bg-primary-600" : "bg-gray-200"
          )}
          role="switch"
          aria-checked={isHighContrast}
          aria-labelledby="contrast-label"
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              isHighContrast ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>
      
      {isHighContrast && (
        <div className="space-y-2">
          <label className="text-xs text-gray-600">대비 수준</label>
          <div className="flex gap-2">
            {["normal", "high", "maximum"].map((level) => (
              <button
                key={level}
                onClick={() => setContrastLevel(level as any)}
                className={cn(
                  "px-3 py-1 text-xs rounded border transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500",
                  contrastLevel === level
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                )}
              >
                {level === "normal" && "보통"}
                {level === "high" && "높음"}
                {level === "maximum" && "최대"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// High contrast styles helper
export const contrastStyles = {
  // Text colors
  text: {
    primary: "contrast-normal:text-gray-900 contrast-high:text-black contrast-maximum:text-black",
    secondary: "contrast-normal:text-gray-600 contrast-high:text-gray-800 contrast-maximum:text-black",
    muted: "contrast-normal:text-gray-500 contrast-high:text-gray-700 contrast-maximum:text-gray-900",
    inverse: "contrast-normal:text-white contrast-high:text-white contrast-maximum:text-white"
  },
  
  // Background colors
  bg: {
    primary: "contrast-normal:bg-white contrast-high:bg-white contrast-maximum:bg-white",
    secondary: "contrast-normal:bg-gray-50 contrast-high:bg-gray-100 contrast-maximum:bg-white",
    accent: "contrast-normal:bg-primary-600 contrast-high:bg-blue-700 contrast-maximum:bg-black",
    danger: "contrast-normal:bg-red-600 contrast-high:bg-red-700 contrast-maximum:bg-black"
  },

  // Border colors
  border: {
    default: "contrast-normal:border-gray-200 contrast-high:border-gray-400 contrast-maximum:border-black",
    focus: "contrast-normal:border-primary-500 contrast-high:border-blue-600 contrast-maximum:border-black"
  },

  // Interactive states
  interactive: {
    hover: "contrast-normal:hover:bg-gray-100 contrast-high:hover:bg-gray-200 contrast-maximum:hover:bg-gray-300",
    focus: "contrast-normal:focus:ring-primary-500 contrast-high:focus:ring-blue-600 contrast-maximum:focus:ring-black",
    active: "contrast-normal:active:bg-gray-200 contrast-high:active:bg-gray-300 contrast-maximum:active:bg-gray-400"
  }
};

// Enhanced components with high contrast support
interface ContrastCardProps {
  children: React.ReactNode;
  className?: string;
}

export function ContrastCard({ children, className }: ContrastCardProps) {
  return (
    <div className={cn(
      "rounded-lg border p-4",
      contrastStyles.bg.primary,
      contrastStyles.border.default,
      contrastStyles.text.primary,
      "high-contrast:shadow-lg",
      className
    )}>
      {children}
    </div>
  );
}

interface ContrastButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  children: React.ReactNode;
}

export function ContrastButton({ 
  variant = "primary", 
  children, 
  className, 
  ...props 
}: ContrastButtonProps) {
  const variants = {
    primary: cn(
      "contrast-normal:bg-primary-600 contrast-normal:text-white contrast-normal:hover:bg-primary-700",
      "contrast-high:bg-blue-700 contrast-high:text-white contrast-high:hover:bg-blue-800",
      "contrast-maximum:bg-black contrast-maximum:text-white contrast-maximum:hover:bg-gray-900",
      "contrast-normal:focus:ring-primary-500 contrast-high:focus:ring-blue-600 contrast-maximum:focus:ring-black"
    ),
    secondary: cn(
      "contrast-normal:bg-gray-200 contrast-normal:text-gray-900 contrast-normal:hover:bg-gray-300",
      "contrast-high:bg-gray-300 contrast-high:text-black contrast-high:hover:bg-gray-400",
      "contrast-maximum:bg-white contrast-maximum:text-black contrast-maximum:hover:bg-gray-100 contrast-maximum:border-2 contrast-maximum:border-black"
    ),
    danger: cn(
      "contrast-normal:bg-red-600 contrast-normal:text-white contrast-normal:hover:bg-red-700",
      "contrast-high:bg-red-700 contrast-high:text-white contrast-high:hover:bg-red-800",
      "contrast-maximum:bg-black contrast-maximum:text-white contrast-maximum:hover:bg-gray-900"
    )
  };

  return (
    <button
      className={cn(
        "px-4 py-2 rounded-md font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Contrast icon component
function ContrastIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v8"
      />
    </svg>
  );
}