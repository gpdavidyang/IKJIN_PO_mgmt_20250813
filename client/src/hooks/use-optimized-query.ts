/**
 * Optimized React Query hooks with performance enhancements
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

// Cache configuration
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CACHE_TIME = 30 * 60 * 1000; // 30 minutes

/**
 * Optimized useQuery hook with default performance settings
 */
export function useOptimizedQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError> & { queryKey: readonly unknown[] }
) {
  return useQuery({
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Optimized mutation hook with error handling
 */
export function useOptimizedMutation<TData, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    onError: (error, variables, context) => {
      console.error("Mutation error:", error);
      options.onError?.(error, variables, context);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate relevant queries on success
      if (options.meta?.invalidateQueries) {
        queryClient.invalidateQueries({
          queryKey: options.meta.invalidateQueries as readonly unknown[]
        });
      }
      options.onSuccess?.(data, variables, context);
    },
  });
}

/**
 * Hook for paginated queries with optimizations
 */
export function usePaginatedQuery<TData>(
  baseQueryKey: readonly unknown[],
  page: number,
  limit: number = 20,
  fetcher: (page: number, limit: number) => Promise<TData>
) {
  const queryKey = useMemo(() => [...baseQueryKey, page, limit], [baseQueryKey, page, limit]);

  return useOptimizedQuery({
    queryKey,
    queryFn: () => fetcher(page, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes for paginated data
  });
}

/**
 * Hook for search queries with debouncing
 */
export function useSearchQuery<TData>(
  baseQueryKey: readonly unknown[],
  searchTerm: string,
  fetcher: (searchTerm: string) => Promise<TData>,
  debounceMs: number = 300
) {
  const debouncedSearchTerm = useMemo(() => {
    if (searchTerm.length < 2) return "";
    return searchTerm;
  }, [searchTerm]);

  const queryKey = useMemo(() => [...baseQueryKey, debouncedSearchTerm], [baseQueryKey, debouncedSearchTerm]);

  return useOptimizedQuery({
    queryKey,
    queryFn: () => fetcher(debouncedSearchTerm),
    enabled: debouncedSearchTerm.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute for search results
  });
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticMutation<TData, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    queryKey: readonly unknown[];
    optimisticUpdate?: (oldData: any, variables: TVariables) => any;
    invalidateQueries?: readonly unknown[][];
  }
) {
  const queryClient = useQueryClient();

  return useOptimizedMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: options.queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(options.queryKey);

      // Optimistically update
      if (options.optimisticUpdate) {
        queryClient.setQueryData(options.queryKey, (old: any) => 
          options.optimisticUpdate!(old, variables)
        );
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(options.queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: options.queryKey });
      
      // Invalidate additional queries if specified
      options.invalidateQueries?.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
    meta: {
      invalidateQueries: options.invalidateQueries,
    },
  });
}