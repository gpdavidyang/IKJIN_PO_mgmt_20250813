import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormProgress } from "@/components/ui/form-progress";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ResponsiveFormProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  showCard?: boolean;
}

export function ResponsiveForm({
  children,
  title,
  description,
  className,
  showCard = true,
}: ResponsiveFormProps) {
  const content = (
    <div className={cn("space-y-6", !showCard && className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-gray-600 sm:text-base">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 sm:p-6">
        {content}
      </CardContent>
    </Card>
  );
}

// Form Section for organizing form fields
interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-base font-medium text-gray-900 sm:text-lg">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
        {children}
      </div>
    </div>
  );
}

// Form Grid for responsive field layouts
interface FormGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function FormGrid({
  children,
  columns = 2,
  className,
}: FormGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}

// Full-width form field wrapper
interface FormFieldWrapperProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export function FormFieldWrapper({
  children,
  fullWidth = false,
  className,
}: FormFieldWrapperProps) {
  return (
    <div className={cn(
      fullWidth && "sm:col-span-2 lg:col-span-3",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-optimized multi-step form
interface MobileMultiStepFormProps {
  steps: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
  currentStep: number;
  onStepChange?: (step: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSubmit?: () => void;
  canProceed?: boolean;
  isSubmitting?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function MobileMultiStepForm({
  steps,
  currentStep,
  onStepChange,
  onNext,
  onPrevious,
  onSubmit,
  canProceed = true,
  isSubmitting = false,
  children,
  className,
}: MobileMultiStepFormProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress - Mobile optimized */}
      <div className="bg-white sticky top-0 z-10 pb-4 border-b sm:border-b-0 sm:bg-transparent sm:static">
        <div className="block sm:hidden">
          {/* Mobile: Simple progress bar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900">
              {steps[currentStep].title}
            </span>
            <span className="text-xs text-gray-500">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="hidden sm:block">
          {/* Desktop: Full progress indicator */}
          <FormProgress
            steps={steps}
            currentStep={currentStep}
            onStepClick={onStepChange}
            allowStepClick={!!onStepChange}
          />
        </div>
      </div>

      {/* Form Content */}
      <div className="min-h-[400px]">
        {children}
      </div>

      {/* Actions - Mobile optimized */}
      <div className="bg-white border-t sticky bottom-0 -mx-4 px-4 py-4 sm:border-t-0 sm:static sm:mx-0 sm:px-0 sm:py-0">
        <div className="flex justify-between items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={isFirstStep || isSubmitting}
            className="flex-1 sm:flex-none"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            이전
          </Button>

          <div className="hidden sm:block text-sm text-gray-500">
            {currentStep + 1} / {steps.length} 단계
          </div>

          {isLastStep ? (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!canProceed || isSubmitting}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? "처리 중..." : "완료"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onNext}
              disabled={!canProceed || isSubmitting}
              className="flex-1 sm:flex-none"
            >
              다음
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Touch-friendly input wrapper
interface TouchInputWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function TouchInputWrapper({
  children,
  className,
}: TouchInputWrapperProps) {
  return (
    <div className={cn(
      "[&_input]:min-h-[44px] [&_button]:min-h-[44px]", // iOS minimum touch target
      "[&_textarea]:min-h-[88px]", // Larger touch area for textarea
      "[&_select]:min-h-[44px]",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-friendly spacing utilities
export const mobileSpacing = {
  container: "px-4 sm:px-6 lg:px-8",
  section: "py-6 sm:py-8 lg:py-12",
  element: "mb-4 sm:mb-6",
  tight: "mb-2 sm:mb-3",
  loose: "mb-6 sm:mb-8 lg:mb-12",
};

// Responsive breakpoints hook
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
  };
}