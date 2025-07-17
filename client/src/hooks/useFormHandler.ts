import { useState, useCallback } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

interface UseFormHandlerOptions<T> {
  schema: z.ZodSchema<T>;
  defaultValues?: Partial<T>;
  apiEndpoint: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  queryKey?: string | string[];
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  transformData?: (data: T) => any;
}

export function useFormHandler<T>({
  schema,
  defaultValues,
  apiEndpoint,
  method = 'POST',
  queryKey,
  onSuccess,
  onError,
  transformData
}: UseFormHandlerOptions<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
  });

  const mutation = useMutation({
    mutationFn: async (data: T) => {
      const payload = transformData ? transformData(data) : data;
      return apiRequest(apiEndpoint, {
        method,
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: "성공",
        description: "저장되었습니다.",
      });
      
      if (queryKey) {
        if (Array.isArray(queryKey)) {
          queryKey.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
        } else {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        }
      }
      
      onSuccess?.(data);
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      onError?.(error);
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleSubmit = useCallback((data: T) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  }, [mutation]);

  const reset = useCallback((data?: Partial<T>) => {
    form.reset(data);
  }, [form]);

  return {
    form,
    handleSubmit: form.handleSubmit(handleSubmit),
    isSubmitting: isSubmitting || mutation.isPending,
    error: mutation.error,
    reset,
    setValue: form.setValue,
    watch: form.watch,
    formState: form.formState
  };
}

// 편집 모드를 관리하는 훅
export function useEditMode(initialValue = false) {
  const [isEditing, setIsEditing] = useState(initialValue);

  const startEdit = useCallback(() => setIsEditing(true), []);
  const cancelEdit = useCallback(() => setIsEditing(false), []);
  const toggleEdit = useCallback(() => setIsEditing(prev => !prev), []);

  return {
    isEditing,
    startEdit,
    cancelEdit,
    toggleEdit
  };
}

// 삭제 확인 훅
export function useDeleteConfirmation(onConfirm: () => void) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const confirmDelete = useCallback(() => {
    onConfirm();
    setShowConfirm(false);
  }, [onConfirm]);

  const cancelDelete = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return {
    showConfirm,
    handleDelete,
    confirmDelete,
    cancelDelete
  };
}