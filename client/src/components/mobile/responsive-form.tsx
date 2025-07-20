/**
 * Responsive Form Component
 * 
 * Mobile-optimized form with:
 * - Adaptive layouts (stacked on mobile, grid on desktop)
 * - Touch-friendly inputs
 * - Floating action buttons for mobile
 * - Step-by-step wizard on mobile for complex forms
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'date' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: (value: any) => string | null;
  gridColumn?: 'full' | 'half' | 'third';
  mobileColumn?: 'full' | 'half';
  step?: number; // For wizard forms
  section?: string;
  description?: string;
}

export interface FormSection {
  title: string;
  description?: string;
  fields: FormField[];
  step?: number;
}

export interface ResponsiveFormProps {
  title?: string;
  description?: string;
  fields?: FormField[];
  sections?: FormSection[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSubmit: (values: Record<string, any>) => void;
  onCancel?: () => void;
  loading?: boolean;
  errors?: Record<string, string>;
  submitLabel?: string;
  cancelLabel?: string;
  wizardMode?: boolean; // Enable step-by-step on mobile
  className?: string;
}

export function ResponsiveForm({
  title,
  description,
  fields = [],
  sections = [],
  values,
  onChange,
  onSubmit,
  onCancel,
  loading = false,
  errors = {},
  submitLabel = '저장',
  cancelLabel = '취소',
  wizardMode = false,
  className,
}: ResponsiveFormProps) {
  const { isMobile } = useResponsive();
  const [currentStep, setCurrentStep] = useState(0);

  // Prepare form data
  const formData = sections.length > 0 ? sections : [{ 
    title: title || '폼', 
    description, 
    fields,
    step: 0 
  }];

  // Wizard mode for mobile
  const isWizardMode = isMobile && wizardMode && formData.length > 1;
  const totalSteps = isWizardMode ? formData.length : 1;
  const progress = isWizardMode ? ((currentStep + 1) / totalSteps) * 100 : 100;

  const currentSection = isWizardMode ? formData[currentStep] : null;
  const visibleSections = isWizardMode ? [currentSection!] : formData;

  const handleNext = () => {
    if (currentStep < formData.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const getGridClassName = (field: FormField) => {
    if (isMobile) {
      return field.mobileColumn === 'half' ? 'col-span-6' : 'col-span-12';
    }
    
    switch (field.gridColumn) {
      case 'half': return 'col-span-6';
      case 'third': return 'col-span-4';
      default: return 'col-span-12';
    }
  };

  const renderField = (field: FormField) => {
    const hasError = errors[field.name];
    const inputClassName = cn(
      "transition-colors",
      hasError && "border-red-500 focus:border-red-500"
    );

    const fieldContent = (
      <div className={getGridClassName(field)}>
        <div className="space-y-2">
          <Label htmlFor={field.name} className={cn(
            "text-sm font-medium",
            field.required && "after:content-['*'] after:text-red-500 after:ml-1"
          )}>
            {field.label}
          </Label>
          
          {field.description && (
            <p className="text-xs text-gray-500">{field.description}</p>
          )}

          {field.type === 'textarea' ? (
            <Textarea
              id={field.name}
              name={field.name}
              placeholder={field.placeholder}
              value={values[field.name] || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              className={inputClassName}
              rows={isMobile ? 3 : 4}
            />
          ) : field.type === 'select' ? (
            <Select
              value={values[field.name] || ''}
              onValueChange={(value) => onChange(field.name, value)}
            >
              <SelectTrigger className={inputClassName}>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={field.name}
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              value={values[field.name] || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              className={inputClassName}
            />
          )}

          {hasError && (
            <div className="flex items-center gap-1 text-red-600 text-xs">
              <AlertCircle className="h-3 w-3" />
              {errors[field.name]}
            </div>
          )}
        </div>
      </div>
    );

    return fieldContent;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Wizard Progress (Mobile) */}
      {isWizardMode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              단계 {currentStep + 1} / {totalSteps}
            </span>
            <span className="font-medium">
              {Math.round(progress)}% 완료
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {visibleSections.map((section, sectionIndex) => (
          <Card key={sectionIndex} className={cn(
            isMobile && "border-x-0 rounded-none shadow-none"
          )}>
            <CardHeader className={cn(
              "pb-4",
              isMobile && "px-4 py-4"
            )}>
              <CardTitle className="text-lg">
                {section.title}
              </CardTitle>
              {section.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {section.description}
                </p>
              )}
            </CardHeader>
            
            <CardContent className={cn(
              "space-y-4",
              isMobile && "px-4 pb-4"
            )}>
              <div className={cn(
                "grid gap-4",
                isMobile ? "grid-cols-12" : "grid-cols-12"
              )}>
                {section.fields.map((field) => renderField(field))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Navigation and Actions */}
        <div className={cn(
          "flex gap-3",
          isMobile ? "flex-col" : "flex-row justify-end"
        )}>
          {/* Mobile Wizard Navigation */}
          {isWizardMode && (
            <>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  이전
                </Button>
                
                {currentStep < formData.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex-1"
                  >
                    다음
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        저장 중...
                      </div>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {submitLabel}
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  {cancelLabel}
                </Button>
              )}
            </>
          )}

          {/* Standard Navigation */}
          {!isWizardMode && (
            <>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className={isMobile ? "w-full" : ""}
                >
                  <X className="h-4 w-4 mr-2" />
                  {cancelLabel}
                </Button>
              )}
              
              <Button
                type="submit"
                disabled={loading}
                className={isMobile ? "w-full" : ""}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    저장 중...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {submitLabel}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </form>

      {/* Mobile Floating Actions (Alternative) */}
      {isMobile && !isWizardMode && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                {cancelLabel}
              </Button>
            )}
            <Button
              onClick={() => onSubmit(values)}
              disabled={loading}
              className="flex-1"
            >
              {loading ? '저장 중...' : submitLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResponsiveForm;