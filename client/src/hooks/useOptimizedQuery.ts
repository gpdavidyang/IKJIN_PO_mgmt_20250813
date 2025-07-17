import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useMemo } from "react";

// Optimized query hook with automatic stale time and caching
export function useOptimizedQuery<T>(
  queryKey: (string | number | boolean | undefined)[],
  options?: Omit<UseQueryOptions<T>, 'queryKey'> & {
    staleTime?: number;
    cacheTime?: number;
  }
) {
  const optimizedOptions = useMemo(() => ({
    staleTime: 5 * 60 * 1000, // 5 minutes default
    gcTime: 10 * 60 * 1000, // 10 minutes default (renamed from cacheTime in v5)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  }), [options]);

  return useQuery({
    queryKey,
    ...optimizedOptions,
  });
}

// Hook for data that rarely changes (like lookup tables)
export function useStaticQuery<T>(
  queryKey: (string | number | boolean | undefined)[],
  options?: Omit<UseQueryOptions<T>, 'queryKey'>
) {
  return useOptimizedQuery(queryKey, {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

// Hook for frequently changing data
export function useLiveQuery<T>(
  queryKey: (string | number | boolean | undefined)[],
  options?: Omit<UseQueryOptions<T>, 'queryKey'>
) {
  return useOptimizedQuery(queryKey, {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    ...options,
  });
}