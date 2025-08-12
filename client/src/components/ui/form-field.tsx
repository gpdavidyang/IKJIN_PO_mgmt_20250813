import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface FormFieldProps {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "textarea";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  success?: boolean;
  helperText?: string;
  tooltip?: string;
  autoComplete?: string;
  maxLength?: number;
  rows?: number;
  validating?: boolean;
  autoSave?: boolean;
  onAutoSave?: () => void;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
}

export function FormField({
  label,
  name,
  value = "",
  onChange,
  onBlur,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  error,
  success,
  helperText,
  tooltip,
  autoComplete,
  maxLength,
  rows = 3,
  validating = false,
  autoSave = false,
  onAutoSave,
  className,
  labelClassName,
  inputClassName,
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fieldId = `field-${name}`;
  const hasError = !!error;
  const hasSuccess = success && !hasError;

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && value && onAutoSave) {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      const timer = setTimeout(async () => {
        setIsSaving(true);
        await onAutoSave();
        setIsSaving(false);
      }, 1500); // Save after 1.5 seconds of inactivity

      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [value, autoSave, onAutoSave]);

  const renderInput = () => {
    const baseProps = {
      id: fieldId,
      name,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        onChange?.(e.target.value),
      onBlur,
      placeholder,
      required,
      disabled,
      readOnly,
      autoComplete,
      maxLength,
      className: cn(
        "transition-all duration-200",
        hasError && "border-red-500 focus:border-red-500 focus:ring-red-500",
        hasSuccess && "border-green-500 focus:border-green-500 focus:ring-green-500",
        inputClassName
      ),
      "aria-invalid": hasError,
      "aria-describedby": hasError ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined,
    };

    if (type === "textarea") {
      return (
        <Textarea
          {...baseProps}
          rows={rows}
          className={cn(baseProps.className, "resize-none")}
        />
      );
    }

    if (type === "password") {
      return (
        <div className="relative">
          <Input
            {...baseProps}
            type={showPassword ? "text" : "password"}
            className={cn(baseProps.className, "pr-10")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      );
    }

    return <Input {...baseProps} type={type} />;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label with required indicator and tooltip */}
      <div className="flex items-center gap-1">
        <Label 
          htmlFor={fieldId} 
          className={cn(
            "text-sm font-medium",
            hasError && "text-red-600",
            hasSuccess && "text-green-600",
            labelClassName
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Auto-save indicator */}
        {autoSave && isSaving && (
          <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>저장 중...</span>
          </div>
        )}
      </div>

      {/* Input field */}
      <div className="relative">
        {renderInput()}
        
        {/* Validation status icons */}
        {(validating || hasError || hasSuccess) && type !== "password" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {validating && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
            {hasError && !validating && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            {hasSuccess && !validating && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </div>
        )}
      </div>

      {/* Helper text or error message */}
      {(helperText || hasError) && (
        <div 
          id={hasError ? `${fieldId}-error` : `${fieldId}-helper`}
          className={cn(
            "text-sm",
            hasError ? "text-red-600" : "text-gray-500"
          )}
          role={hasError ? "alert" : undefined}
        >
          {hasError ? error : helperText}
        </div>
      )}

      {/* Character count for textarea */}
      {type === "textarea" && maxLength && (
        <div className="text-xs text-gray-500 text-right">
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  );
}