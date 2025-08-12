import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { focusRing } from "./focus-management";
import { ScreenReaderOnly, LiveAnnouncement } from "./screen-reader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  ChevronDown,
  Check
} from "lucide-react";

// Enhanced form field with comprehensive accessibility
interface AccessibleFormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string;
  success?: string;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
}

export const AccessibleFormField = forwardRef<HTMLInputElement, AccessibleFormFieldProps>(
  ({
    id,
    label,
    type = "text",
    value,
    onChange,
    onBlur,
    required,
    error,
    success,
    helperText,
    placeholder,
    disabled,
    autoComplete,
    className
  }, ref) => {
    const hasError = !!error;
    const hasSuccess = !!success;
    const hasHelper = !!helperText;
    
    const describedBy = [
      hasError && `${id}-error`,
      hasSuccess && `${id}-success`,
      hasHelper && `${id}-helper`
    ].filter(Boolean).join(" ") || undefined;

    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="필수 항목">
              *
            </span>
          )}
        </Label>
        
        <div className="relative">
          <Input
            ref={ref}
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            className={cn(
              focusRing,
              hasError && "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500",
              hasSuccess && "border-green-300 text-green-900 placeholder-green-300 focus:border-green-500 focus:ring-green-500"
            )}
          />
          
          {/* Status Icons */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {hasError && (
              <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
            )}
            {hasSuccess && !hasError && (
              <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            id={`${id}-error`}
            role="alert"
            className="flex items-center text-sm text-red-600"
          >
            <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && !error && (
          <div
            id={`${id}-success`}
            className="flex items-center text-sm text-green-600"
          >
            <CheckCircle className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
            {success}
          </div>
        )}

        {/* Helper Text */}
        {helperText && (
          <div
            id={`${id}-helper`}
            className="flex items-center text-sm text-gray-600"
          >
            <Info className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

AccessibleFormField.displayName = "AccessibleFormField";

// Enhanced select with keyboard navigation
interface AccessibleSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function AccessibleSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "선택하세요",
  required,
  error,
  disabled,
  className
}: AccessibleSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const selectRef = React.useRef<HTMLButtonElement>(null);
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const selectedOption = options.find(option => option.value === value);
  const hasError = !!error;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setSelectedIndex(0);
        } else if (selectedIndex >= 0) {
          onChange(options[selectedIndex].value);
          setIsOpen(false);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setSelectedIndex(0);
        } else {
          setSelectedIndex(prev => Math.min(options.length - 1, prev + 1));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (isOpen) {
          setSelectedIndex(prev => Math.max(0, prev - 1));
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        selectRef.current?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  React.useEffect(() => {
    if (isOpen && selectedIndex >= 0 && optionRefs.current[selectedIndex]) {
      optionRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, isOpen]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="필수 항목">
            *
          </span>
        )}
      </Label>
      
      <div className="relative">
        <button
          ref={selectRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={`${id}-label`}
          aria-describedby={hasError ? `${id}-error` : undefined}
          aria-invalid={hasError}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full px-3 py-2 text-left bg-white border rounded-md shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
            hasError && "border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500",
            !hasError && "border-gray-300 text-gray-900"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown 
              className={cn(
                "h-5 w-5 text-gray-400 transition-transform",
                isOpen && "rotate-180"
              )} 
              aria-hidden="true" 
            />
          </div>
        </button>

        {/* Options */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                ref={(el) => (optionRefs.current[index] = el)}
                role="option"
                type="button"
                disabled={option.disabled}
                aria-selected={selectedIndex === index}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  selectRef.current?.focus();
                }}
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  selectedIndex === index && "bg-primary-50 text-primary-700",
                  value === option.value && "bg-primary-100 text-primary-800"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{option.label}</span>
                  {value === option.value && (
                    <Check className="h-4 w-4 text-primary-600" aria-hidden="true" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          id={`${id}-error`}
          role="alert"
          className="flex items-center text-sm text-red-600"
        >
          <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}

// Accessible alert component
interface AccessibleAlertProps {
  type: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function AccessibleAlert({
  type,
  title,
  children,
  dismissible = false,
  onDismiss,
  className
}: AccessibleAlertProps) {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle
  };

  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    error: "bg-red-50 border-red-200 text-red-800"
  };

  const iconStyles = {
    info: "text-blue-400",
    success: "text-green-400",
    warning: "text-yellow-400",
    error: "text-red-400"
  };

  const Icon = icons[type];
  const role = type === "error" ? "alert" : "status";
  const priority = type === "error" ? "assertive" : "polite";

  return (
    <div
      role={role}
      aria-live={priority}
      className={cn(
        "p-4 border rounded-md",
        styles[type],
        className
      )}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn("h-5 w-5", iconStyles[type])} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              onClick={onDismiss}
              className={cn(
                "inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2",
                type === "info" && "text-blue-500 hover:bg-blue-100 focus:ring-blue-600",
                type === "success" && "text-green-500 hover:bg-green-100 focus:ring-green-600",
                type === "warning" && "text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600",
                type === "error" && "text-red-500 hover:bg-red-100 focus:ring-red-600"
              )}
              aria-label="알림 닫기"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Accessible button with loading states
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "default" | "lg";
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    variant = "primary",
    size = "default",
    loading = false,
    loadingText = "로딩 중...",
    disabled,
    className,
    children,
    ...props
  }, ref) => {
    const variants = {
      primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
      secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-500"
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      default: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base"
    };

    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-md transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
            <ScreenReaderOnly>{loadingText}</ScreenReaderOnly>
          </>
        )}
        {children}
      </Button>
    );
  }
);

AccessibleButton.displayName = "AccessibleButton";

// Accessible progress indicator
interface AccessibleProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  announceChanges?: boolean;
  className?: string;
}

export function AccessibleProgress({
  value,
  max = 100,
  label = "진행률",
  showPercentage = true,
  announceChanges = false,
  className
}: AccessibleProgressProps) {
  const percentage = Math.round((value / max) * 100);
  const [announcement, setAnnouncement] = React.useState("");
  const previousPercentage = React.useRef(percentage);

  React.useEffect(() => {
    if (announceChanges && percentage !== previousPercentage.current) {
      setAnnouncement(`${label} ${percentage}% 완료`);
      previousPercentage.current = percentage;
    }
  }, [percentage, label, announceChanges]);

  return (
    <div className={cn("space-y-2", className)}>
      {announceChanges && (
        <LiveAnnouncement message={announcement} />
      )}
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {label}
        </span>
        {showPercentage && (
          <span className="text-sm text-gray-500">
            {percentage}%
          </span>
        )}
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${label} ${percentage}% 완료`}
          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}