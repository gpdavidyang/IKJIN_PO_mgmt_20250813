import React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface FormCheckboxProps {
  label: string;
  name: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  onBlur?: () => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  tooltip?: string;
  className?: string;
  labelClassName?: string;
}

export function FormCheckbox({
  label,
  name,
  checked = false,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  error,
  helperText,
  tooltip,
  className,
  labelClassName,
}: FormCheckboxProps) {
  const fieldId = `field-${name}`;
  const hasError = !!error;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start space-x-3">
        <Checkbox
          id={fieldId}
          name={name}
          checked={checked}
          onCheckedChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className={cn(
            "mt-0.5",
            hasError && "border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
          )}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
        />
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1">
            <Label 
              htmlFor={fieldId}
              className={cn(
                "text-sm font-medium cursor-pointer select-none",
                hasError && "text-red-600",
                disabled && "cursor-not-allowed opacity-50",
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
      </div>
    </div>
  );
}