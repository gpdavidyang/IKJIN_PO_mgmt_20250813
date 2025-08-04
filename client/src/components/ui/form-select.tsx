import React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Loader2
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  success?: boolean;
  helperText?: string;
  tooltip?: string;
  validating?: boolean;
  className?: string;
  labelClassName?: string;
  selectClassName?: string;
}

export function FormSelect({
  label,
  name,
  value = "",
  onChange,
  onBlur,
  options,
  placeholder = "선택하세요",
  required = false,
  disabled = false,
  error,
  success,
  helperText,
  tooltip,
  validating = false,
  className,
  labelClassName,
  selectClassName,
}: FormSelectProps) {
  const fieldId = `field-${name}`;
  const hasError = !!error;
  const hasSuccess = success && !hasError;

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
      </div>

      {/* Select field */}
      <div className="relative">
        <Select
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          required={required}
        >
          <SelectTrigger
            id={fieldId}
            onBlur={onBlur}
            className={cn(
              "transition-all duration-200",
              hasError && "border-red-500 focus:border-red-500 focus:ring-red-500",
              hasSuccess && "border-green-500 focus:border-green-500 focus:ring-green-500",
              selectClassName
            )}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Validation status icons */}
        {(validating || hasError || hasSuccess) && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
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
    </div>
  );
}