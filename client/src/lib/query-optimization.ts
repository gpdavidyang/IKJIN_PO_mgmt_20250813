/**
 * Advanced React Query Optimization System
 * Provides sophisticated caching, background sync, and performance enhancements
 */

import { 
  QueryClient, 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
  MutationMeta,
  QueryMeta
} from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useEffect } from "react";

// Cache configuration based on data types
export const CACHE_CONFIGS = {
  // Static data (rarely changes)
  STATIC: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  },
  // Master data (changes occasionally)
  MASTER: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  },
  // Dynamic data (changes frequently)
  DYNAMIC: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  // Live data (real-time updates)
  LIVE: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 60 * 1000, // 1 minute polling
  },
  // Search results (temporary data)
  SEARCH: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
} as const;

// Query key factory for consistent key generation
export const queryKeys = {
  // Authentication
  auth: {
    user: () => ['/api/auth/me'] as const,
    permissions: (userId: number) => ['/api/auth/permissions', userId] as const,
  },
  
  // Dashboard
  dashboard: {
    unified: () => ['/api/dashboard/unified'] as const,
    stats: (timeRange?: string) => ['/api/dashboard/stats', timeRange] as const,
    charts: (type: string, period?: string) => ['/api/dashboard/charts', type, period] as const,
  },
  
  // Orders (using optimized endpoints)
  orders: {
    all: () => ['/api/orders-optimized'] as const,
    list: (filters?: any) => ['/api/orders-optimized', filters] as const,
    detail: (id: number) => ['/api/orders', id] as const, // Keep individual order details as is
    items: (orderId: number) => ['/api/orders', orderId, 'items'] as const,
    history: (orderId: number) => ['/api/orders', orderId, 'history'] as const,
    templates: () => ['/api/orders/templates'] as const,
  },
  
  // Vendors
  vendors: {
    all: () => ['/api/vendors'] as const,
    list: (filters?: any) => ['/api/vendors', filters] as const,
    detail: (id: number) => ['/api/vendors', id] as const,
    search: (query: string) => ['/api/vendors/search', query] as const,
  },
  
  // Projects
  projects: {
    all: () => ['/api/projects'] as const,
    list: (filters?: any) => ['/api/projects', filters] as const,
    detail: (id: number) => ['/api/projects', id] as const,
    active: () => ['/api/projects/active'] as const,
  },
  
  // Items
  items: {
    all: () => ['/api/items'] as const,
    list: (filters?: any) => ['/api/items', filters] as const,
    detail: (id: number) => ['/api/items', id] as const,
    categories: () => ['/api/items/categories'] as const,
  },
  
  // Admin
  admin: {
    users: () => ['/api/admin/users'] as const,
    settings: () => ['/api/admin/settings'] as const,
    positions: () => ['/api/positions'] as const,
    uiTerms: () => ['/api/ui-terms'] as const,
  },
} as const;

// Enhanced query client with optimized defaults
export function createOptimizedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CACHE_CONFIGS.DYNAMIC.staleTime,
        gcTime: CACHE_CONFIGS.DYNAMIC.gcTime,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors except 408, 429
          if (error?.status >= 400 && error?.status < 500 && ![408, 429].includes(error.status)) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: (failureCount, error: any) => {
          // Don't retry mutations on client errors
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      },
    },
  });
}

// Smart query hook with automatic cache configuration
export function useSmartQuery<TData, TError = Error>(
  queryKey: readonly unknown[],
  options: UseQueryOptions<TData, TError> & {
    cacheType?: keyof typeof CACHE_CONFIGS;
    backgroundSync?: boolean;
    dependencies?: readonly unknown[][];
  }
) {
  const { cacheType = 'DYNAMIC', backgroundSync = false, dependencies = [], ...queryOptions } = options;
  const cacheConfig = CACHE_CONFIGS[cacheType];
  
  // Prefetch dependencies
  const queryClient = useQueryClient();
  useEffect(() => {
    if (dependencies.length > 0) {
      dependencies.forEach(depKey => {
        queryClient.prefetchQuery({ queryKey: depKey });
      });
    }
  }, [queryClient, dependencies]);
  
  return useQuery({
    queryKey,
    ...cacheConfig,
    ...queryOptions,
    meta: {
      cacheType,
      backgroundSync,
      ...queryOptions.meta,
    } as QueryMeta,
  });
}

// Enhanced mutation hook with smart invalidation
export function useSmartMutation<TData, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    invalidateQueries?: readonly unknown[][];
    optimisticUpdate?: {
      queryKey: readonly unknown[];
      updater: (oldData: any, variables: TVariables) => any;
    };
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const queryClient = useQueryClient();
  const { invalidateQueries = [], optimisticUpdate, successMessage, errorMessage, ...mutationOptions } = options;
  
  return useMutation({
    ...mutationOptions,
    onMutate: async (variables) => {
      // Handle optimistic updates
      if (optimisticUpdate) {
        await queryClient.cancelQueries({ queryKey: optimisticUpdate.queryKey });
        const previousData = queryClient.getQueryData(optimisticUpdate.queryKey);
        
        queryClient.setQueryData(optimisticUpdate.queryKey, (old: any) => 
          optimisticUpdate.updater(old, variables)
        );
        
        return { previousData, optimisticUpdate };
      }
      
      return mutationOptions.onMutate?.(variables);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate specified queries
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      
      // Show success message if provided
      if (successMessage) {
        // Toast would be shown here - depends on your toast implementation
        console.log('Success:', successMessage);
      }
      
      mutationOptions.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context: any) => {
      // Rollback optimistic updates
      if (context?.previousData && context?.optimisticUpdate) {
        queryClient.setQueryData(context.optimisticUpdate.queryKey, context.previousData);
      }
      
      // Show error message if provided
      if (errorMessage) {
        console.error('Error:', errorMessage, error);
      }
      
      mutationOptions.onError?.(error, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      // Always invalidate optimistic update queries
      if (optimisticUpdate) {
        queryClient.invalidateQueries({ queryKey: optimisticUpdate.queryKey });
      }
      
      mutationOptions.onSettled?.(data, error, variables, context);
    },
    meta: {
      invalidateQueries,
      successMessage,
      errorMessage,
      ...mutationOptions.meta,
    } as MutationMeta,
  });
}

// Background sync hook for keeping data fresh
export function useBackgroundSync(
  queryKeys: readonly unknown[][],
  interval: number = 5 * 60 * 1000 // 5 minutes default
) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    const sync = () => {
      queryKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey, exact: false });
      });
    };
    
    intervalRef.current = setInterval(sync, interval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryClient, queryKeys, interval]);
  
  // Manual sync function
  const syncNow = useCallback(() => {
    queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey, exact: false });
    });
  }, [queryClient, queryKeys]);
  
  return syncNow;
}

// Prefetch manager for predictive loading
export function usePrefetchManager() {
  const queryClient = useQueryClient();
  
  const prefetchRoute = useCallback((routePath: string, params?: Record<string, any>) => {
    // Define route-specific prefetch strategies
    const routePrefetchMap: Record<string, () => void> = {
      '/dashboard': () => {
        queryClient.prefetchQuery({ queryKey: queryKeys.dashboard.unified() });
        queryClient.prefetchQuery({ queryKey: queryKeys.orders.all() });
      },
      '/orders': () => {
        queryClient.prefetchQuery({ queryKey: queryKeys.orders.list() });
        queryClient.prefetchQuery({ queryKey: queryKeys.vendors.all() });
        queryClient.prefetchQuery({ queryKey: queryKeys.projects.active() });
      },
      '/vendors': () => {
        queryClient.prefetchQuery({ queryKey: queryKeys.vendors.list() });
      },
      '/projects': () => {
        queryClient.prefetchQuery({ queryKey: queryKeys.projects.list() });
      },
    };
    
    const prefetchFn = routePrefetchMap[routePath];
    if (prefetchFn) {
      prefetchFn();
    }
  }, [queryClient]);
  
  const prefetchDetail = useCallback((type: string, id: number) => {
    const prefetchMap: Record<string, (id: number) => void> = {
      order: (id) => {
        queryClient.prefetchQuery({ queryKey: queryKeys.orders.detail(id) });
        queryClient.prefetchQuery({ queryKey: queryKeys.orders.items(id) });
        queryClient.prefetchQuery({ queryKey: queryKeys.orders.history(id) });
      },
      vendor: (id) => {
        queryClient.prefetchQuery({ queryKey: queryKeys.vendors.detail(id) });
      },
      project: (id) => {
        queryClient.prefetchQuery({ queryKey: queryKeys.projects.detail(id) });
      },
    };
    
    const prefetchFn = prefetchMap[type];
    if (prefetchFn) {
      prefetchFn(id);
    }
  }, [queryClient]);
  
  return { prefetchRoute, prefetchDetail };
}

// Cache warming utility
export function useCacheWarming() {
  const queryClient = useQueryClient();
  
  const warmEssentialData = useCallback(() => {
    // Warm frequently accessed static data
    queryClient.prefetchQuery({ 
      queryKey: queryKeys.admin.positions(),
      staleTime: CACHE_CONFIGS.STATIC.staleTime,
    });
    
    queryClient.prefetchQuery({ 
      queryKey: queryKeys.admin.uiTerms(),
      staleTime: CACHE_CONFIGS.STATIC.staleTime,
    });
    
    queryClient.prefetchQuery({ 
      queryKey: queryKeys.items.categories(),
      staleTime: CACHE_CONFIGS.MASTER.staleTime,
    });
    
    // Removed projects.active() prefetch - this data comes via optimized orders endpoint
  }, [queryClient]);
  
  const warmUserSpecificData = useCallback((userId: number) => {
    queryClient.prefetchQuery({ 
      queryKey: queryKeys.auth.permissions(userId),
      staleTime: CACHE_CONFIGS.MASTER.staleTime,
    });
    
    // Prefetch dashboard data
    queryClient.prefetchQuery({ 
      queryKey: queryKeys.dashboard.unified(),
      staleTime: CACHE_CONFIGS.DYNAMIC.staleTime,
    });
  }, [queryClient]);
  
  return { warmEssentialData, warmUserSpecificData };
}

// Enhanced query performance monitoring with optimization insights
export function useQueryPerformanceMonitor() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const cache = queryClient.getQueryCache();
    
    const unsubscribe = cache.subscribe((event) => {
      if (event?.type === 'queryAdded') {
        const query = event.query;
        const cacheType = query.meta?.cacheType || 'UNKNOWN';
        console.log(`🔄 Query added [${cacheType}]: ${JSON.stringify(query.queryKey)}`);
      } else if (event?.type === 'queryRemoved') {
        console.log(`🗑️ Query removed: ${JSON.stringify(event.query.queryKey)}`);
      }
    });
    
    return unsubscribe;
  }, [queryClient]);
  
  const getQueryStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Group queries by cache type for optimization insights
    const cacheTypeStats = queries.reduce((acc, query) => {
      const cacheType = query.meta?.cacheType || 'UNKNOWN';
      if (!acc[cacheType]) {
        acc[cacheType] = { count: 0, stale: 0, error: 0 };
      }
      acc[cacheType].count++;
      if (query.isStale()) acc[cacheType].stale++;
      if (query.state.status === 'error') acc[cacheType].error++;
      return acc;
    }, {} as Record<string, { count: number; stale: number; error: number }>);
    
    const stats = {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      cacheSize: queries.reduce((size, query) => {
        try {
          return size + (query.state.data ? JSON.stringify(query.state.data).length : 0);
        } catch {
          return size;
        }
      }, 0),
      cacheTypeStats,
      // Optimization insights
      optimizationSuggestions: generateOptimizationSuggestions(queries),
    };
    
    return stats;
  }, [queryClient]);
  
  return { getQueryStats };
}

// Generate optimization suggestions based on query patterns
function generateOptimizationSuggestions(queries: any[]) {
  const suggestions: string[] = [];
  
  const staleRate = queries.filter(q => q.isStale()).length / queries.length;
  if (staleRate > 0.5) {
    suggestions.push("Consider increasing staleTime for frequently accessed data");
  }
  
  const errorRate = queries.filter(q => q.state.status === 'error').length / queries.length;
  if (errorRate > 0.1) {
    suggestions.push("High error rate detected - review retry strategies");
  }
  
  const unknownCacheType = queries.filter(q => !q.meta?.cacheType).length;
  if (unknownCacheType > 0) {
    suggestions.push(`${unknownCacheType} queries without cache type optimization`);
  }
  
  return suggestions;
}