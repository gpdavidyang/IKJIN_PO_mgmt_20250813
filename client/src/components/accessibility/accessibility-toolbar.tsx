import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HighContrastButton, useContrast } from "./high-contrast";
import { SkipToContent } from "./focus-management";
import { KeyboardShortcutsModal, useKeyboardShortcuts } from "./keyboard-navigation";
import { ThemeSelector } from "@/components/ui/theme-provider";
import {
  Accessibility,
  ZoomIn,
  ZoomOut,
  Type,
  Keyboard,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Settings
} from "lucide-react";

// Text size context
interface TextSizeContextType {
  textSize: "small" | "normal" | "large" | "extra-large";
  setTextSize: (size: "small" | "normal" | "large" | "extra-large") => void;
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

const TextSizeContext = React.createContext<TextSizeContextType | null>(null);

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSize] = useState<"small" | "normal" | "large" | "extra-large">("normal");
  const [fontSize, setFontSize] = useState(16);

  const fontSizes = {
    small: 14,
    normal: 16,
    large: 18,
    "extra-large": 24
  };

  React.useEffect(() => {
    const savedSize = localStorage.getItem("text-size") as keyof typeof fontSizes;
    if (savedSize && fontSizes[savedSize]) {
      setTextSize(savedSize);
      setFontSize(fontSizes[savedSize]);
    }
  }, []);

  React.useEffect(() => {
    setFontSize(fontSizes[textSize]);
    document.documentElement.style.fontSize = `${fontSizes[textSize]}px`;
    document.documentElement.className = document.documentElement.className.replace(
      /text-size-\w+/g, 
      ""
    ) + ` text-size-${textSize}`;
    localStorage.setItem("text-size", textSize);
  }, [textSize]);

  const increaseFontSize = () => {
    const sizes = ["small", "normal", "large", "extra-large"] as const;
    const currentIndex = sizes.indexOf(textSize);
    if (currentIndex < sizes.length - 1) {
      setTextSize(sizes[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    const sizes = ["small", "normal", "large", "extra-large"] as const;
    const currentIndex = sizes.indexOf(textSize);
    if (currentIndex > 0) {
      setTextSize(sizes[currentIndex - 1]);
    }
  };

  return (
    <TextSizeContext.Provider value={{
      textSize,
      setTextSize,
      fontSize,
      increaseFontSize,
      decreaseFontSize
    }}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  const context = React.useContext(TextSizeContext);
  if (!context) {
    throw new Error("useTextSize must be used within TextSizeProvider");
  }
  return context;
}

// Motion preferences
interface MotionContextType {
  prefersReducedMotion: boolean;
  toggleReducedMotion: () => void;
}

const MotionContext = React.createContext<MotionContextType | null>(null);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  React.useEffect(() => {
    // Check system preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    // Check saved preference
    const savedPreference = localStorage.getItem("reduced-motion");
    if (savedPreference !== null) {
      setPrefersReducedMotion(savedPreference === "true");
    }

    const handleChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem("reduced-motion") === null) {
        setPrefersReducedMotion(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  React.useEffect(() => {
    if (prefersReducedMotion) {
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.classList.remove("reduce-motion");
    }
    localStorage.setItem("reduced-motion", prefersReducedMotion.toString());
  }, [prefersReducedMotion]);

  const toggleReducedMotion = () => {
    setPrefersReducedMotion(!prefersReducedMotion);
  };

  return (
    <MotionContext.Provider value={{ prefersReducedMotion, toggleReducedMotion }}>
      {children}
    </MotionContext.Provider>
  );
}

export function useMotion() {
  const context = React.useContext(MotionContext);
  if (!context) {
    throw new Error("useMotion must be used within MotionProvider");
  }
  return context;
}

// Main accessibility toolbar
interface AccessibilityToolbarProps {
  className?: string;
  position?: "top" | "bottom" | "fixed";
}

export function AccessibilityToolbar({ 
  className, 
  position = "top" 
}: AccessibilityToolbarProps) {
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { textSize, increaseFontSize, decreaseFontSize } = useTextSize();
  const { isHighContrast, toggleHighContrast } = useContrast();
  const { prefersReducedMotion, toggleReducedMotion } = useMotion();

  // Define keyboard shortcuts
  const shortcuts = [
    {
      key: "h",
      altKey: true,
      action: () => toggleHighContrast(),
      description: "고대비 모드 토글"
    },
    {
      key: "+",
      ctrlKey: true,
      action: () => increaseFontSize(),
      description: "글자 크기 확대"
    },
    {
      key: "-",
      ctrlKey: true,
      action: () => decreaseFontSize(),
      description: "글자 크기 축소"
    },
    {
      key: "?",
      altKey: true,
      action: () => setShowKeyboardShortcuts(true),
      description: "키보드 단축키 보기"
    }
  ];

  useKeyboardShortcuts(shortcuts);

  const positionClasses = {
    top: "top-0",
    bottom: "bottom-0",
    fixed: "fixed top-4 right-4"
  };

  return (
    <>
      <SkipToContent />
      
      <div className={cn(
        "bg-background border-b border-border px-4 py-2 z-40",
        position === "fixed" && "fixed top-4 right-4 border rounded-lg shadow-lg",
        position !== "fixed" && positionClasses[position],
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
              접근성 도구
            </span>
            
            {isExpanded && (
              <div className="flex items-center gap-2">
                {/* Text Size Controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={decreaseFontSize}
                    disabled={textSize === "small"}
                    className="h-8 w-8 p-0"
                    aria-label="글자 크기 축소"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[60px] text-center">
                    {textSize === "small" && "작게"}
                    {textSize === "normal" && "보통"}
                    {textSize === "large" && "크게"}
                    {textSize === "extra-large" && "매우 크게"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={increaseFontSize}
                    disabled={textSize === "extra-large"}
                    className="h-8 w-8 p-0"
                    aria-label="글자 크기 확대"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                <div className="w-px h-6 bg-gray-300" />

                {/* High Contrast Toggle */}
                <HighContrastButton variant="icon" />

                <div className="w-px h-6 bg-gray-300" />

                {/* Motion Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleReducedMotion}
                  className={cn(
                    "h-8 w-8 p-0",
                    prefersReducedMotion && "bg-primary-100 text-primary-700"
                  )}
                  aria-label={prefersReducedMotion ? "애니메이션 켜기" : "애니메이션 끄기"}
                  title={prefersReducedMotion ? "애니메이션 켜기" : "애니메이션 끄기"}
                >
                  {prefersReducedMotion ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>

                <div className="w-px h-6 bg-gray-300" />

                {/* Keyboard Shortcuts */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="h-8 w-8 p-0"
                  aria-label="키보드 단축키 보기"
                  title="키보드 단축키 보기"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Settings Dropdown */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
              aria-label={isExpanded ? "접근성 도구 숨기기" : "접근성 도구 보기"}
              title={isExpanded ? "접근성 도구 숨기기" : "접근성 도구 보기"}
            >
              <Accessibility className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="접근성 설정"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>접근성 설정</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => setShowKeyboardShortcuts(true)}>
                  <Keyboard className="mr-2 h-4 w-4" />
                  키보드 단축키
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={toggleHighContrast}>
                  <Eye className="mr-2 h-4 w-4" />
                  {isHighContrast ? "고대비 모드 끄기" : "고대비 모드 켜기"}
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={toggleReducedMotion}>
                  {prefersReducedMotion ? (
                    <Volume2 className="mr-2 h-4 w-4" />
                  ) : (
                    <VolumeX className="mr-2 h-4 w-4" />
                  )}
                  {prefersReducedMotion ? "애니메이션 켜기" : "애니메이션 끄기"}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <div className="px-2 py-2">
                  <ThemeSelector />
                </div>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel>글자 크기</DropdownMenuLabel>
                {["small", "normal", "large", "extra-large"].map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => useTextSize().setTextSize(size as any)}
                    className={textSize === size ? "bg-primary-50" : ""}
                  >
                    <Type className="mr-2 h-4 w-4" />
                    {size === "small" && "작게"}
                    {size === "normal" && "보통"}
                    {size === "large" && "크게"}
                    {size === "extra-large" && "매우 크게"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <KeyboardShortcutsModal
        shortcuts={shortcuts}
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </>
  );
}

// Complete accessibility provider
export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  return (
    <TextSizeProvider>
      <MotionProvider>
        {children}
      </MotionProvider>
    </TextSizeProvider>
  );
}