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

// Query key factory for consistent key generation with normalization
export const queryKeys = {
  // Authentication
  auth: {
    user: () => ['/api/auth/user'] as const,
    permissions: (userId: number) => ['/api/auth/permissions', userId] as const,
  },
  
  // Dashboard
  dashboard: {
    unified: () => ['/api/dashboard/unified'] as const,
    stats: (timeRange?: string) => ['/api/dashboard/stats', timeRange] as const,
    charts: (type: string, period?: string) => ['/api/dashboard/charts', type, period] as const,
  },
  
  // Orders (using optimized endpoints with normalized keys)
  orders: {
    all: () => ['/api/orders-optimized'] as const,
    list: (filters?: any) => {
      // Normalize filters to improve cache hit rate
      if (!filters) return ['/api/orders-optimized'] as const;
      const normalizedFilters = normalizeFilters(filters);
      return ['/api/orders-optimized', normalizedFilters] as const;
    },
    optimized: (filters?: any) => {
      // Alias for backward compatibility - maps to same normalized key
      if (!filters) return ['orders-optimized'] as const;
      const normalizedFilters = normalizeFilters(filters);
      return ['orders-optimized', normalizedFilters] as const;
    },
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

// Filter normalization function to improve cache hit rate
function normalizeFilters(filters: any): any {
  if (!filters || typeof filters !== 'object') return filters;
  
  // Create a clean copy with consistent ordering and normalized values
  const normalized: any = {};
  
  // Sort keys for consistent ordering
  const sortedKeys = Object.keys(filters).sort();
  
  for (const key of sortedKeys) {
    const value = filters[key];
    
    // Skip empty, null, undefined, or default values
    if (value === undefined || value === null || value === '' || value === 'all') {
      continue;
    }
    
    // Normalize number strings to numbers for consistent comparison
    if (key === 'page' || key === 'limit' || key === 'vendorId' || key === 'projectId') {
      normalized[key] = typeof value === 'string' ? parseInt(value, 10) || value : value;
    } else {
      normalized[key] = value;
    }
  }
  
  return Object.keys(normalized).length === 0 ? undefined : normalized;
}

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

// Enhanced mutation hook with intelligent invalidation patterns
export function useSmartMutation<TData, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    invalidateQueries?: readonly unknown[][];
    invalidationStrategy?: 'precise' | 'broad' | 'smart';
    mutationType?: 'create' | 'update' | 'delete' | 'status' | 'bulk';
    entityType?: 'order' | 'vendor' | 'project' | 'item' | 'user';
    optimisticUpdate?: {
      queryKey: readonly unknown[];
      updater: (oldData: any, variables: TVariables) => any;
    };
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const queryClient = useQueryClient();
  const { 
    invalidateQueries = [], 
    invalidationStrategy = 'smart',
    mutationType = 'update',
    entityType = 'order',
    optimisticUpdate, 
    successMessage, 
    errorMessage, 
    ...mutationOptions 
  } = options;
  
  // Intelligent invalidation based on mutation type and entity
  const getSmartInvalidationKeys = useCallback(() => {
    const keys: readonly unknown[][] = [];
    
    if (entityType === 'order') {
      // Always invalidate optimized orders
      keys.push(queryKeys.orders.all());
      keys.push(['orders-optimized']); // Backward compatibility
      
      // Invalidate dashboard for data changes
      if (['create', 'delete', 'status'].includes(mutationType)) {
        keys.push(queryKeys.dashboard.unified());
        keys.push(queryKeys.dashboard.stats());
      }
    }
    
    // Add custom invalidation keys
    keys.push(...invalidateQueries);
    
    return keys;
  }, [entityType, mutationType, invalidateQueries]);
  
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
      // Smart invalidation based on strategy
      const invalidationKeys = invalidationStrategy === 'smart' ? getSmartInvalidationKeys() : invalidateQueries;
      
      invalidationKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ 
          queryKey, 
          exact: invalidationStrategy === 'precise',
          refetchType: 'active' // Only refetch currently active queries for performance
        });
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
      invalidationStrategy,
      mutationType,
      entityType,
      successMessage,
      errorMessage,
      ...mutationOptions.meta,
    } as MutationMeta,
  });
}

// Background sync hook for keeping data fresh - DISABLED to prevent infinite loops
export function useBackgroundSync(
  queryKeys: readonly unknown[][],
  interval: number = 5 * 60 * 1000 // 5 minutes default
) {
  const queryClient = useQueryClient();
  
  // DISABLED: Background sync that was causing infinite loops
  // The automatic interval invalidation was triggering cascading re-renders
  
  // Manual sync function only - no automatic intervals
  const syncNow = useCallback(() => {
    // Only sync in development and throttle heavily
    if (process.env.NODE_ENV === 'development') {
      const lastSync = parseInt(sessionStorage.getItem('lastBackgroundSync') || '0');
      const now = Date.now();
      if (now - lastSync > 60000) { // Minimum 1 minute between syncs
        queryKeys.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey, exact: false, refetchType: 'none' });
        });
        sessionStorage.setItem('lastBackgroundSync', now.toString());
      }
    }
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

// Advanced query performance monitoring with real-time insights
export function useQueryPerformanceMonitor() {
  const queryClient = useQueryClient();
  const performanceRef = useRef({
    cacheHits: 0,
    cacheMisses: 0,
    totalQueries: 0,
    averageResponseTime: 0,
    slowQueries: [] as Array<{ key: string; time: number }>,
    lastReset: Date.now(),
  });
  
  useEffect(() => {
    const cache = queryClient.getQueryCache();
    
    const unsubscribe = cache.subscribe((event) => {
      if (event?.type === 'queryAdded') {
        const query = event.query;
        const cacheType = query.meta?.cacheType || 'UNKNOWN';
        performanceRef.current.totalQueries++;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Query added [${cacheType}]: ${JSON.stringify(query.queryKey)}`);
        }
      } else if (event?.type === 'queryRemoved') {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🗑️ Query removed: ${JSON.stringify(event.query.queryKey)}`);
        }
      } else if (event?.type === 'queryUpdated') {
        // Track cache hits vs misses
        const query = event.query;
        if (query.state.status === 'success' && !query.state.isFetching) {
          const wasStale = query.isStale();
          if (wasStale) {
            performanceRef.current.cacheMisses++;
          } else {
            performanceRef.current.cacheHits++;
          }
        }
      }
    });
    
    return unsubscribe;
  }, [queryClient]);
  
  const getQueryStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Enhanced stats with performance metrics
    const cacheTypeStats = queries.reduce((acc, query) => {
      const cacheType = query.meta?.cacheType || 'UNKNOWN';
      if (!acc[cacheType]) {
        acc[cacheType] = { 
          count: 0, 
          stale: 0, 
          error: 0, 
          active: 0,
          dataSize: 0 
        };
      }
      acc[cacheType].count++;
      if (query.isStale()) acc[cacheType].stale++;
      if (query.state.status === 'error') acc[cacheType].error++;
      if (query.getObserversCount() > 0) acc[cacheType].active++;
      
      try {
        acc[cacheType].dataSize += query.state.data ? JSON.stringify(query.state.data).length : 0;
      } catch {
        // Ignore circular references
      }
      
      return acc;
    }, {} as Record<string, { count: number; stale: number; error: number; active: number; dataSize: number }>);
    
    const perf = performanceRef.current;
    const cacheHitRate = perf.cacheHits + perf.cacheMisses > 0 
      ? (perf.cacheHits / (perf.cacheHits + perf.cacheMisses)) * 100 
      : 0;
    
    const stats = {
      timestamp: new Date().toISOString(),
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      loadingQueries: queries.filter(q => q.state.isFetching).length,
      cacheSize: queries.reduce((size, query) => {
        try {
          return size + (query.state.data ? JSON.stringify(query.state.data).length : 0);
        } catch {
          return size;
        }
      }, 0),
      cacheTypeStats,
      performance: {
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        cacheHits: perf.cacheHits,
        cacheMisses: perf.cacheMisses,
        totalRequests: perf.totalQueries,
        uptime: Date.now() - perf.lastReset,
      },
      optimizationSuggestions: generateAdvancedOptimizationSuggestions(queries, cacheHitRate),
      health: calculateCacheHealth(queries, cacheHitRate),
    };
    
    return stats;
  }, [queryClient]);
  
  const resetPerformanceCounters = useCallback(() => {
    performanceRef.current = {
      cacheHits: 0,
      cacheMisses: 0,
      totalQueries: 0,
      averageResponseTime: 0,
      slowQueries: [],
      lastReset: Date.now(),
    };
  }, []);
  
  return { 
    getQueryStats, 
    resetPerformanceCounters,
    getCurrentPerformance: () => performanceRef.current 
  };
}

// Generate optimization suggestions based on query patterns (legacy)
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

// Advanced optimization suggestions with actionable insights
function generateAdvancedOptimizationSuggestions(queries: any[], cacheHitRate: number): string[] {
  const suggestions: string[] = [];
  
  // Cache hit rate analysis
  if (cacheHitRate < 70) {
    suggestions.push(`🎯 Cache hit rate is ${cacheHitRate.toFixed(1)}% - consider increasing staleTime for frequently accessed data`);
  } else if (cacheHitRate > 95) {
    suggestions.push(`✨ Excellent cache hit rate (${cacheHitRate.toFixed(1)}%) - queries are well optimized`);
  }
  
  // Query pattern analysis
  const staleQueries = queries.filter(q => q.isStale());
  const staleRate = staleQueries.length / queries.length;
  if (staleRate > 0.6) {
    suggestions.push(`⏰ ${(staleRate * 100).toFixed(1)}% of queries are stale - review cache timing configuration`);
  }
  
  // Error rate analysis
  const errorQueries = queries.filter(q => q.state.status === 'error');
  const errorRate = errorQueries.length / queries.length;
  if (errorRate > 0.15) {
    suggestions.push(`⚠️ High error rate (${(errorRate * 100).toFixed(1)}%) - investigate network issues or API problems`);
  }
  
  // Active vs inactive queries
  const activeQueries = queries.filter(q => q.getObserversCount() > 0);
  const inactiveQueries = queries.filter(q => q.getObserversCount() === 0);
  if (inactiveQueries.length > activeQueries.length * 2) {
    suggestions.push(`🧹 ${inactiveQueries.length} inactive queries detected - consider reducing gcTime to free memory`);
  }
  
  // Cache type optimization
  const unknownCacheType = queries.filter(q => !q.meta?.cacheType);
  if (unknownCacheType.length > 0) {
    suggestions.push(`🔧 ${unknownCacheType.length} queries without cache type - use useSmartQuery for better optimization`);
  }
  
  // Memory usage analysis
  const totalCacheSize = queries.reduce((size, query) => {
    try {
      return size + (query.state.data ? JSON.stringify(query.state.data).length : 0);
    } catch {
      return size;
    }
  }, 0);
  
  if (totalCacheSize > 5 * 1024 * 1024) { // 5MB
    suggestions.push(`💾 Cache size is ${(totalCacheSize / 1024 / 1024).toFixed(1)}MB - consider reducing gcTime for large datasets`);
  }
  
  return suggestions;
}

// Calculate overall cache health score
function calculateCacheHealth(queries: any[], cacheHitRate: number): {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  factors: Array<{ name: string; score: number; weight: number }>;
} {
  const factors = [
    {
      name: 'Cache Hit Rate',
      score: Math.min(100, cacheHitRate),
      weight: 0.4
    },
    {
      name: 'Error Rate',
      score: Math.max(0, 100 - (queries.filter(q => q.state.status === 'error').length / queries.length) * 100),
      weight: 0.25
    },
    {
      name: 'Stale Rate',
      score: Math.max(0, 100 - (queries.filter(q => q.isStale()).length / queries.length) * 100),
      weight: 0.2
    },
    {
      name: 'Cache Type Coverage',
      score: Math.max(0, 100 - (queries.filter(q => !q.meta?.cacheType).length / queries.length) * 100),
      weight: 0.15
    }
  ];
  
  const totalScore = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);
  
  let status: 'excellent' | 'good' | 'fair' | 'poor';
  if (totalScore >= 90) status = 'excellent';
  else if (totalScore >= 75) status = 'good';
  else if (totalScore >= 60) status = 'fair';
  else status = 'poor';
  
  return {
    score: Math.round(totalScore),
    status,
    factors
  };
}