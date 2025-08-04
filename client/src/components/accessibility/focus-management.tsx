import React, { useEffect, useRef, createContext, useContext } from "react";
import { cn } from "@/lib/utils";

// Focus trap for modals and dialogs
interface FocusTrapProps {
  children: React.ReactNode;
  enabled?: boolean;
  restoreFocus?: boolean;
  className?: string;
}

export function FocusTrap({ 
  children, 
  enabled = true, 
  restoreFocus = true,
  className 
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Focus the first focusable element
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      
      // Restore focus to previously focused element
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [enabled, restoreFocus]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// Enhanced focus visible ring
export const focusRing = cn(
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
  "focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
);

// Skip to content link
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50",
        "bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium",
        focusRing
      )}
    >
      본문으로 건너뛰기
    </a>
  );
}

// Focus context for managing focus announcements
interface FocusContextType {
  announceFocus: (message: string) => void;
}

const FocusContext = createContext<FocusContextType | null>(null);

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announceFocus = (message: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = "";
        }
      }, 1000);
    }
  };

  return (
    <FocusContext.Provider value={{ announceFocus }}>
      {children}
      <div
        ref={announcementRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
    </FocusContext.Provider>
  );
}

export function useFocusAnnouncement() {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error("useFocusAnnouncement must be used within FocusProvider");
  }
  return context;
}

// Utility functions
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');

  return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
}

// Enhanced button with accessibility features
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "secondary" | "ghost" | "outline";
  size?: "default" | "sm" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export function AccessibleButton({
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: AccessibleButtonProps) {
  const variants = {
    default: "bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300",
    destructive: "bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100",
    ghost: "hover:bg-gray-100 disabled:bg-transparent disabled:text-gray-400",
    outline: "border border-gray-300 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400"
  };

  const sizes = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        focusRing,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-describedby={loading ? "loading-text" : undefined}
      {...props}
    >
      {loading && (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
          <span id="loading-text" className="sr-only">
            로딩 중
          </span>
        </>
      )}
      {children}
    </button>
  );
}

// Roving tabindex for keyboard navigation in lists
export function useRovingTabIndex<T extends HTMLElement>(
  items: T[],
  orientation: "horizontal" | "vertical" = "vertical"
) {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const nextKeys = orientation === "horizontal" ? ["ArrowRight"] : ["ArrowDown"];
    const prevKeys = orientation === "horizontal" ? ["ArrowLeft"] : ["ArrowUp"];

    if (nextKeys.includes(e.key)) {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      setActiveIndex(nextIndex);
      items[nextIndex]?.focus();
    } else if (prevKeys.includes(e.key)) {
      e.preventDefault();
      const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
      setActiveIndex(prevIndex);
      items[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const lastIndex = items.length - 1;
      setActiveIndex(lastIndex);
      items[lastIndex]?.focus();
    }
  };

  const getTabIndex = (index: number) => {
    return index === activeIndex ? 0 : -1;
  };

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    getTabIndex
  };
}