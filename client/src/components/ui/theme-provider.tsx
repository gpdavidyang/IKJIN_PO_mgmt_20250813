import React from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: "light" | "dark";
}

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
  actualTheme: "light",
};

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "po-management-theme",
  enableSystem = true,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey) as Theme;
    return stored || defaultTheme;
  });

  const [actualTheme, setActualTheme] = React.useState<"light" | "dark">(() => {
    // 초기 actualTheme 계산 - 안전한 브라우저 환경 체크
    if (typeof window === "undefined") return "light";
    
    const stored = localStorage.getItem(storageKey) as Theme;
    const currentTheme = stored || defaultTheme;
    
    if (currentTheme === "system" && enableSystem) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return currentTheme === "dark" ? "dark" : "light";
  });

  React.useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    let effectiveTheme: "light" | "dark";

    if (theme === "system" && enableSystem) {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      effectiveTheme = theme as "light" | "dark";
    }

    root.classList.add(effectiveTheme);
    setActualTheme(effectiveTheme);
  }, [theme, enableSystem]);

  // 시스템 테마 변경 감지 활성화
  React.useEffect(() => {
    if (theme !== "system" || !enableSystem) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      
      const newTheme = e.matches ? "dark" : "light";
      root.classList.add(newTheme);
      setActualTheme(newTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, enableSystem]);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme: (newTheme: Theme) => {
        localStorage.setItem(storageKey, newTheme);
        setTheme(newTheme);
      },
      actualTheme,
    }),
    [theme, actualTheme, storageKey]
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};

// Theme toggle button component
interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "button" | "dropdown" | "switch";
  showLabel?: boolean;
}

export function ThemeToggle({
  className,
  size = "md",
  variant = "button",
  showLabel = false
}: ThemeToggleProps) {
  const { theme, setTheme, actualTheme } = useTheme();

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm", 
    lg: "h-10 w-10 text-base"
  };

  if (variant === "switch") {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {showLabel && (
          <span className="text-sm font-medium">
            {actualTheme === "dark" ? "다크 모드" : "라이트 모드"}
          </span>
        )}
        <button
          onClick={() => setTheme(actualTheme === "dark" ? "light" : "dark")}
          className={cn(
            "relative inline-flex items-center rounded-full transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            actualTheme === "dark" 
              ? "bg-blue-600" 
              : "bg-gray-200",
            sizeClasses[size]
          )}
          aria-label={`${actualTheme === "dark" ? "라이트" : "다크"} 모드로 전환`}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              actualTheme === "dark" ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
      </div>
    );
  }

  if (variant === "dropdown") {
    return (
      <div className={cn("relative", className)}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
          className={cn(
            "appearance-none bg-background border border-input rounded-md px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            sizeClasses[size]
          )}
        >
          <option value="light">라이트 모드</option>
          <option value="dark">다크 모드</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }

  // Default button variant
  return (
    <button
      onClick={() => setTheme(actualTheme === "dark" ? "light" : "dark")}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-input bg-background",
        "hover:bg-accent hover:text-accent-foreground transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        sizeClasses[size],
        className
      )}
      aria-label={`${actualTheme === "dark" ? "라이트" : "다크"} 모드로 전환`}
    >
      {actualTheme === "dark" ? (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
      {showLabel && (
        <span className="ml-2 text-sm">
          {actualTheme === "dark" ? "라이트" : "다크"}
        </span>
      )}
    </button>
  );
}

// Theme selection component with all options
export function ThemeSelector({ className }: { className?: string }) {
  const { theme, setTheme, actualTheme } = useTheme();

  const themes = [
    {
      value: "light" as const,
      label: "라이트 모드",
      description: "밝은 테마",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      value: "dark" as const,
      label: "다크 모드",
      description: "어두운 테마",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )
    },
    {
      value: "system" as const,
      label: "시스템 설정",
      description: "시스템 설정을 따름",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-medium">테마 설정</h3>
      <div className="grid grid-cols-1 gap-2">
        {themes.map((themeOption) => (
          <button
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className={cn(
              "flex items-center space-x-3 p-3 rounded-lg border text-left transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              theme === themeOption.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-input"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full",
              theme === themeOption.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}>
              {themeOption.icon}
            </div>
            <div className="flex-1">
              <div className="font-medium">{themeOption.label}</div>
              <div className="text-xs text-muted-foreground">
                {themeOption.description}
                {themeOption.value === "system" && ` (현재: ${actualTheme === "dark" ? "다크" : "라이트"})`}
              </div>
            </div>
            {theme === themeOption.value && (
              <div className="w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Theme status indicator
export function ThemeStatus({ className }: { className?: string }) {
  const { theme, actualTheme } = useTheme();

  return (
    <div className={cn("flex items-center space-x-2 text-xs text-muted-foreground", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        actualTheme === "dark" ? "bg-slate-400" : "bg-yellow-400"
      )} />
      <span>
        {theme === "system" 
          ? `시스템 (${actualTheme === "dark" ? "다크" : "라이트"})`
          : theme === "dark" ? "다크 모드" : "라이트 모드"
        }
      </span>
    </div>
  );
}