import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface FormStep {
  id: string;
  title: string;
  description?: string;
}

export interface FormProgressProps {
  steps: FormStep[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  allowStepClick?: boolean;
  className?: string;
}

export function FormProgress({
  steps,
  currentStep,
  onStepClick,
  allowStepClick = false,
  className,
}: FormProgressProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
          {/* Progress bar fill */}
          <div 
            className="absolute top-0 left-0 h-full bg-primary-600 transition-all duration-300"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        </div>
        
        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isClickable = allowStepClick && (isCompleted || isCurrent);
            
            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center",
                  isClickable && "cursor-pointer"
                )}
                onClick={() => isClickable && onStepClick?.(index)}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    "relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
                    isCompleted && "bg-primary-600 text-white",
                    isCurrent && "bg-primary-600 text-white ring-4 ring-primary-100",
                    !isCompleted && !isCurrent && "bg-gray-200 text-gray-500"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                
                {/* Step label */}
                <div className="mt-3 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isCurrent && "text-primary-600",
                      !isCurrent && "text-gray-500"
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="mt-1 text-xs text-gray-400 max-w-[120px]">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Simplified progress bar variant
export interface FormProgressBarProps {
  currentStep: number;
  totalSteps: number;
  showStepNumbers?: boolean;
  className?: string;
}

export function FormProgressBar({
  currentStep,
  totalSteps,
  showStepNumbers = true,
  className,
}: FormProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;
  
  return (
    <div className={cn("w-full", className)}>
      <div className="space-y-2">
        {showStepNumbers && (
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              단계 {currentStep} / {totalSteps}
            </p>
            <p className="text-sm text-gray-600">
              {Math.round(progress)}% 완료
            </p>
          </div>
        )}
        
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}