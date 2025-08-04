import React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
  helperText?: string;
}

export interface FormRadioGroupProps {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  options: RadioOption[];
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  tooltip?: string;
  orientation?: "horizontal" | "vertical";
  className?: string;
  labelClassName?: string;
}

export function FormRadioGroup({
  label,
  name,
  value = "",
  onChange,
  onBlur,
  options,
  required = false,
  disabled = false,
  error,
  helperText,
  tooltip,
  orientation = "vertical",
  className,
  labelClassName,
}: FormRadioGroupProps) {
  const fieldId = `field-${name}`;
  const hasError = !!error;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label with required indicator and tooltip */}
      <div className="flex items-center gap-1">
        <Label 
          className={cn(
            "text-sm font-medium",
            hasError && "text-red-600",
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

      {/* Radio group */}
      <RadioGroup
        value={value}
        onValueChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        className={cn(
          orientation === "horizontal" ? "flex flex-wrap gap-6" : "space-y-3"
        )}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-start space-x-2">
            <RadioGroupItem
              value={option.value}
              id={`${fieldId}-${option.value}`}
              disabled={option.disabled || disabled}
              className={cn(
                "mt-0.5",
                hasError && "border-red-500 text-red-500"
              )}
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor={`${fieldId}-${option.value}`}
                className={cn(
                  "text-sm font-normal cursor-pointer",
                  (option.disabled || disabled) && "cursor-not-allowed opacity-50"
                )}
              >
                {option.label}
              </Label>
              {option.helperText && (
                <p className="text-xs text-gray-500">{option.helperText}</p>
              )}
            </div>
          </div>
        ))}
      </RadioGroup>

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