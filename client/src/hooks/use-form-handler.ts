/**
 * Centralized form handling hook with validation and submission
 */

import { useForm, UseFormProps, FieldValues, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOptimizedMutation } from "./use-optimized-query";
import { useToast } from "./use-toast";
import { useCallback } from "react";

interface UseFormHandlerOptions<T extends FieldValues> extends UseFormProps<T> {
  schema?: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<any>;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  invalidateQueries?: readonly unknown[][];
}

/**
 * Enhanced form handler with validation, submission, and error handling
 */
export function useFormHandler<T extends FieldValues>({
  schema,
  onSubmit,
  onSuccess,
  onError,
  successMessage = "저장되었습니다",
  errorMessage = "오류가 발생했습니다",
  invalidateQueries,
  ...formOptions
}: UseFormHandlerOptions<T>) {
  const { toast } = useToast();

  const form = useForm<T>({
    resolver: schema ? zodResolver(schema) : undefined,
    ...formOptions,
  });

  const mutation = useOptimizedMutation({
    mutationFn: onSubmit,
    onSuccess: (data) => {
      toast({
        title: "성공",
        description: successMessage,
      });
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(error);
    },
    meta: {
      invalidateQueries,
    },
  });

  const handleSubmit = useCallback<SubmitHandler<T>>((data) => {
    mutation.mutate(data);
  }, [mutation]);

  const resetForm = useCallback(() => {
    form.reset();
    mutation.reset();
  }, [form, mutation]);

  return {
    form,
    handleSubmit: form.handleSubmit(handleSubmit),
    isSubmitting: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    reset: resetForm,
    mutation,
  };
}

/**
 * Hook for handling file uploads with form data
 */
export function useFileFormHandler<T extends FieldValues>({
  schema,
  onSubmit,
  fileFields = [],
  ...options
}: UseFormHandlerOptions<T> & { fileFields?: string[] }) {
  const formHandler = useFormHandler({
    schema,
    onSubmit: async (data: T) => {
      const formData = new FormData();
      
      // Append regular fields
      Object.keys(data).forEach(key => {
        if (!fileFields.includes(key)) {
          const value = data[key];
          if (value !== undefined && value !== null) {
            formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
          }
        }
      });

      // Append file fields
      fileFields.forEach(field => {
        const files = data[field];
        if (files && Array.isArray(files) && files.length > 0) {
          files.forEach((file: File) => {
            formData.append(field, file);
          });
        }
      });

      return onSubmit(formData as any);
    },
    ...options,
  });

  return formHandler;
}

/**
 * Hook for multi-step forms
 */
export function useMultiStepForm<T extends FieldValues>(
  steps: Array<{
    name: string;
    schema?: z.ZodSchema<Partial<T>>;
    component: React.ComponentType<any>;
  }>,
  options: Omit<UseFormHandlerOptions<T>, 'schema'>
) {
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepConfig = steps[currentStep];

  const form = useForm<T>({
    resolver: currentStepConfig.schema ? zodResolver(currentStepConfig.schema) : undefined,
    mode: 'onChange',
    ...options,
  });

  const nextStep = useCallback(async () => {
    if (currentStepConfig.schema) {
      const isValid = await form.trigger();
      if (!isValid) return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length, form, currentStepConfig.schema]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  }, [steps.length]);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return {
    form,
    currentStep,
    currentStepConfig,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep,
    isLastStep,
    totalSteps: steps.length,
  };
}

import { useState } from "react";