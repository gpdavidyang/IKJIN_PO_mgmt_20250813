import React from "react";
import { cn } from "@/lib/utils";
import { Check, AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react";

// Auto-save hook for forms
interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
  compareFields?: (keyof T)[];
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export function useAutoSave<T extends Record<string, any>>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
  compareFields,
  onSaveSuccess,
  onSaveError
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const previousDataRef = React.useRef<T>(data);
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const isOnline = React.useRef(navigator.onLine);

  // Track online status
  React.useEffect(() => {
    const handleOnline = () => { isOnline.current = true; };
    const handleOffline = () => { isOnline.current = false; };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check if data has changed
  const hasDataChanged = React.useCallback((current: T, previous: T): boolean => {
    if (!compareFields) {
      return JSON.stringify(current) !== JSON.stringify(previous);
    }

    return compareFields.some(field => current[field] !== previous[field]);
  }, [compareFields]);

  // Save function with error handling
  const performSave = React.useCallback(async (dataToSave: T) => {
    if (!isOnline.current) {
      setStatus("error");
      setError("인터넷 연결이 없습니다");
      return;
    }

    try {
      setStatus("saving");
      setError(null);
      await onSave(dataToSave);
      setStatus("saved");
      setLastSaved(new Date());
      previousDataRef.current = { ...dataToSave };
      onSaveSuccess?.();
    } catch (err) {
      setStatus("error");
      const errorMessage = err instanceof Error ? err.message : "저장 중 오류가 발생했습니다";
      setError(errorMessage);
      onSaveError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [onSave, onSaveSuccess, onSaveError]);

  // Auto-save effect
  React.useEffect(() => {
    if (!enabled || status === "saving") return;

    if (hasDataChanged(data, previousDataRef.current)) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        performSave(data);
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, delay, hasDataChanged, performSave, status]);

  // Manual save function
  const saveNow = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    performSave(data);
  }, [performSave, data]);

  // Reset status after showing success
  React.useEffect(() => {
    if (status === "saved") {
      const timer = setTimeout(() => setStatus("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return {
    status,
    lastSaved,
    error,
    saveNow,
    hasUnsavedChanges: hasDataChanged(data, previousDataRef.current)
  };
}

// Auto-save status indicator component
interface AutoSaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  lastSaved?: Date | null;
  error?: string | null;
  className?: string;
  showLastSaved?: boolean;
  size?: "sm" | "md";
}

export function AutoSaveIndicator({
  status,
  lastSaved,
  error,
  className,
  showLastSaved = true,
  size = "md"
}: AutoSaveIndicatorProps) {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        text: "오프라인",
        className: "text-orange-600",
        animate: false
      };
    }

    switch (status) {
      case "saving":
        return {
          icon: Loader2,
          text: "저장 중...",
          className: "text-blue-600",
          animate: true
        };
      case "saved":
        return {
          icon: Check,
          text: showLastSaved && lastSaved 
            ? `${lastSaved.toLocaleTimeString()}에 저장됨`
            : "저장됨",
          className: "text-green-600",
          animate: false
        };
      case "error":
        return {
          icon: AlertCircle,
          text: error || "저장 실패",
          className: "text-red-600",
          animate: false
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={cn(
      "flex items-center space-x-1",
      config.className,
      className
    )}>
      <Icon 
        className={cn(
          iconSize,
          config.animate && "animate-spin"
        )} 
        aria-hidden="true"
      />
      <span className={textSize}>
        {config.text}
      </span>
    </div>
  );
}

// Auto-save form wrapper component
interface AutoSaveFormProps<T extends Record<string, any>> {
  children: React.ReactNode;
  data: T;
  onSave: (data: T) => Promise<void>;
  className?: string;
  delay?: number;
  enabled?: boolean;
  compareFields?: (keyof T)[];
  showIndicator?: boolean;
  indicatorPosition?: "top" | "bottom" | "inline";
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export function AutoSaveForm<T extends Record<string, any>>({
  children,
  data,
  onSave,
  className,
  delay = 2000,
  enabled = true,
  compareFields,
  showIndicator = true,
  indicatorPosition = "top",
  onSaveSuccess,
  onSaveError
}: AutoSaveFormProps<T>) {
  const { status, lastSaved, error, saveNow, hasUnsavedChanges } = useAutoSave({
    data,
    onSave,
    delay,
    enabled,
    compareFields,
    onSaveSuccess,
    onSaveError
  });

  const indicator = showIndicator && (
    <AutoSaveIndicator
      status={status}
      lastSaved={lastSaved}
      error={error}
      className={cn(
        indicatorPosition === "top" && "mb-4",
        indicatorPosition === "bottom" && "mt-4"
      )}
    />
  );

  // Add keyboard shortcut for manual save
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveNow();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveNow]);

  // Warn about unsaved changes when leaving
  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '저장되지 않은 변경사항이 있습니다. 정말 페이지를 떠나시겠습니까?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className={className}>
      {indicatorPosition === "top" && indicator}
      <div className="relative">
        {children}
        {indicatorPosition === "inline" && (
          <div className="absolute top-2 right-2">
            {indicator}
          </div>
        )}
      </div>
      {indicatorPosition === "bottom" && indicator}
    </div>
  );
}

// Auto-save textarea component
interface AutoSaveTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  rows?: number;
  delay?: number;
  enabled?: boolean;
  showIndicator?: boolean;
}

export function AutoSaveTextarea({
  value,
  onChange,
  onSave,
  placeholder,
  className,
  rows = 4,
  delay = 2000,
  enabled = true,
  showIndicator = true
}: AutoSaveTextareaProps) {
  const { status, lastSaved, error } = useAutoSave({
    data: { value },
    onSave: (data) => onSave(data.value),
    delay,
    enabled,
    compareFields: ['value']
  });

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            "w-full px-3 py-2 border border-gray-300 rounded-md resize-vertical",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:bg-gray-50 disabled:text-gray-500",
            className
          )}
        />
        {showIndicator && status !== "idle" && (
          <div className="absolute top-2 right-2">
            <AutoSaveIndicator
              status={status}
              lastSaved={lastSaved}
              error={error}
              size="sm"
              showLastSaved={false}
            />
          </div>
        )}
      </div>
      {showIndicator && status !== "idle" && (
        <AutoSaveIndicator
          status={status}
          lastSaved={lastSaved}
          error={error}
          size="sm"
        />
      )}
    </div>
  );
}

// Auto-save input component
interface AutoSaveInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (value: string) => Promise<void>;
  type?: string;
  placeholder?: string;
  className?: string;
  delay?: number;
  enabled?: boolean;
  showIndicator?: boolean;
}

export function AutoSaveInput({
  value,
  onChange,
  onSave,
  type = "text",
  placeholder,
  className,
  delay = 2000,
  enabled = true,
  showIndicator = true
}: AutoSaveInputProps) {
  const { status, lastSaved, error } = useAutoSave({
    data: { value },
    onSave: (data) => onSave(data.value),
    delay,
    enabled,
    compareFields: ['value']
  });

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full px-3 py-2 border border-gray-300 rounded-md",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:bg-gray-50 disabled:text-gray-500",
            showIndicator && status !== "idle" && "pr-8",
            className
          )}
        />
        {showIndicator && status !== "idle" && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            <AutoSaveIndicator
              status={status}
              lastSaved={lastSaved}
              error={error}
              size="sm"
              showLastSaved={false}
            />
          </div>
        )}
      </div>
      {showIndicator && status !== "idle" && (
        <AutoSaveIndicator
          status={status}
          lastSaved={lastSaved}
          error={error}
          size="sm"
        />
      )}
    </div>
  );
}

// Auto-save context for forms
interface AutoSaveContextValue {
  saveNow: () => void;
  status: "idle" | "saving" | "saved" | "error";
  hasUnsavedChanges: boolean;
}

const AutoSaveContext = React.createContext<AutoSaveContextValue | undefined>(undefined);

export function useAutoSaveContext() {
  const context = React.useContext(AutoSaveContext);
  if (!context) {
    throw new Error('useAutoSaveContext must be used within an AutoSaveProvider');
  }
  return context;
}

interface AutoSaveProviderProps<T extends Record<string, any>> {
  children: React.ReactNode;
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
  compareFields?: (keyof T)[];
}

export function AutoSaveProvider<T extends Record<string, any>>({
  children,
  data,
  onSave,
  delay = 2000,
  enabled = true,
  compareFields
}: AutoSaveProviderProps<T>) {
  const { status, saveNow, hasUnsavedChanges } = useAutoSave({
    data,
    onSave,
    delay,
    enabled,
    compareFields
  });

  const value: AutoSaveContextValue = {
    saveNow,
    status,
    hasUnsavedChanges
  };

  return (
    <AutoSaveContext.Provider value={value}>
      {children}
    </AutoSaveContext.Provider>
  );
}