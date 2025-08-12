/**
 * Optimized Orders Hook
 * High-performance React Query hook for order management page
 */

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface OptimizedOrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  projectId?: number | string;
  vendorId?: number | string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number | string;
  maxAmount?: number | string;
  searchText?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OrderWithMetadata {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  orderDate: string;
  deliveryDate: string | null;
  userId: string;
  vendorId: number | null;
  projectId: number | null;
  approvalLevel: number;
  currentApproverRole: string | null;
  // Joined data
  vendorName: string | null;
  projectName: string | null;
  userName: string | null;
  // Email status
  emailStatus?: string | null;
  lastSentAt?: string | null;
  totalEmailsSent?: number;
  openedAt?: string | null;
}

export interface OptimizedOrdersResponse {
  orders: OrderWithMetadata[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  metadata: {
    vendors: Array<{ id: number; name: string }>;
    projects: Array<{ id: number; projectName: string; projectCode: string }>;
    users: Array<{ id: string; name: string; email: string }>;
  };
  performance: {
    queryTime: string;
    cacheHit: boolean;
    timestamp: string;
  };
}

/**
 * High-performance hook for orders page
 * Single query replaces multiple API calls
 */
export function useOptimizedOrders(filters: OptimizedOrderFilters = {}) {
  const queryClient = useQueryClient();
  
  // Create stable query key
  const queryKey = useMemo(() => {
    // Remove empty/default values to improve cache hit rate
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => 
        value !== undefined && 
        value !== '' && 
        value !== 'all' &&
        value !== null
      )
    );
    
    return ['orders-optimized', cleanFilters];
  }, [filters]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add non-empty filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 'all' && value !== null) {
          params.append(key, value.toString());
        }
      });
      
      const url = `/api/orders-optimized${params.toString() ? `?${params}` : ''}`;
      console.log('🚀 Fetching optimized orders:', url);
      
      const response = await apiRequest<OptimizedOrdersResponse>("GET", url);
      
      console.log('✅ Optimized orders response:', {
        ordersCount: response.orders.length,
        total: response.total,
        queryTime: response.performance.queryTime
      });
      
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Prefetch next page for better UX
  const prefetchNextPage = () => {
    if (query.data && query.data.page < query.data.totalPages) {
      const nextPageFilters = { ...filters, page: query.data.page + 1 };
      queryClient.prefetchQuery({
        queryKey: ['orders-optimized', nextPageFilters],
        queryFn: () => apiRequest("GET", `/api/orders-optimized?${new URLSearchParams(nextPageFilters as any)}`),
        staleTime: 30 * 1000
      });
    }
  };

  return {
    ...query,
    orders: query.data?.orders || [],
    vendors: query.data?.metadata.vendors || [],
    projects: query.data?.metadata.projects || [],
    users: query.data?.metadata.users || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    totalPages: query.data?.totalPages || 1,
    performance: query.data?.performance,
    prefetchNextPage,
    // Convenience methods
    hasNextPage: query.data ? query.data.page < query.data.totalPages : false,
    hasPreviousPage: query.data ? query.data.page > 1 : false,
  };
}

/**
 * Lightweight hook for metadata only
 * Used for filter initialization without loading orders
 */
export function useOrdersMetadata() {
  return useQuery({
    queryKey: ['orders-metadata'],
    queryFn: () => apiRequest("GET", "/api/orders-metadata"),
    staleTime: 10 * 60 * 1000, // 10 minutes - metadata changes rarely
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for order statistics
 * Used in dashboard widgets
 */
export function useOrderStatistics(userId?: string) {
  return useQuery({
    queryKey: ['orders-stats', userId],
    queryFn: () => {
      const params = userId ? `?userId=${userId}` : '';
      return apiRequest("GET", `/api/orders-stats${params}`);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Performance monitoring hook
 * Only available in development
 */
export function useQueryPerformance() {
  return useQuery({
    queryKey: ['query-performance'],
    queryFn: () => apiRequest("GET", "/api/query-performance"),
    enabled: process.env.NODE_ENV === 'development',
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refresh every minute in dev
  });
}

/**
 * Optimized hook with intelligent caching and prefetching
 * Includes performance monitoring and error boundaries
 */
export function useOptimizedOrdersWithPrefetch(filters: OptimizedOrderFilters = {}) {
  const queryClient = useQueryClient();
  const ordersQuery = useOptimizedOrders(filters);
  
  // Prefetch related data intelligently
  const prefetchRelatedData = () => {
    // Prefetch metadata if not cached
    queryClient.prefetchQuery({
      queryKey: ['orders-metadata'],
      queryFn: () => apiRequest("GET", "/api/orders-metadata"),
      staleTime: 10 * 60 * 1000
    });
    
    // Prefetch next page if user is near the bottom
    if (ordersQuery.hasNextPage) {
      ordersQuery.prefetchNextPage();
    }
  };

  return {
    ...ordersQuery,
    prefetchRelatedData,
    // Performance metrics
    isOptimized: true,
    cacheHit: ordersQuery.performance?.cacheHit || false,
    queryTime: ordersQuery.performance?.queryTime || 'unknown',
  };
}