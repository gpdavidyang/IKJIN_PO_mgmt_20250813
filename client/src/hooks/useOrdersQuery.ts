/**
 * Unified Orders Query Hook
 * Provides a consistent interface for fetching orders across all components
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type {
  UnifiedOrder,
  UnifiedOrderFilters,
  UnifiedOrdersResponse,
  UseOrdersQueryConfig
} from "@/types/unified-orders";

/**
 * Build query parameters from filters
 */
function buildQueryParams(filters: UnifiedOrderFilters = {}): URLSearchParams {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  
  return params;
}

/**
 * Main hook for querying orders
 */
export function useOrdersQuery(config: UseOrdersQueryConfig = {}) {
  const { filters = {}, ...queryConfig } = config;
  
  return useQuery({
    queryKey: ["unified-orders", filters],
    queryFn: async (): Promise<UnifiedOrdersResponse> => {
      const params = buildQueryParams(filters);
      
      console.log('🔍 Unified Orders API request:', `/api/orders-optimized?${params.toString()}`);
      
      const response = await fetch(`/api/orders-optimized?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const result = await response.json();
      
      console.log('✅ Unified Orders received:', result.orders?.length, 'orders');
      
      return result;
    },
    staleTime: queryConfig.staleTime ?? 1000, // 1초
    gcTime: queryConfig.gcTime ?? 60000, // 1분
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: queryConfig.enabled ?? true,
    refetchInterval: queryConfig.refetchInterval,
    ...queryConfig
  });
}

/**
 * Hook for recent orders (dashboard use)
 */
export function useRecentOrdersQuery(limit: number = 10) {
  return useOrdersQuery({
    filters: {
      limit,
      sortBy: "createdAt",
      sortOrder: "desc"
    },
    staleTime: 30000, // 30초
    gcTime: 300000, // 5분
  });
}

/**
 * Hook for orders with advanced filtering (management page use)
 */
export function useOrdersWithFiltersQuery(filters: UnifiedOrderFilters) {
  return useOrdersQuery({
    filters,
    staleTime: 1000, // 1초 - 빠른 반응성
    gcTime: 60000, // 1분
  });
}

/**
 * Hook for orders metadata (vendors, projects, users)
 */
export function useOrdersMetadata() {
  return useQuery({
    queryKey: ["orders-metadata"],
    queryFn: async () => {
      const response = await fetch(`/api/orders-metadata`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch metadata');
      return response.json();
    },
    staleTime: 300000, // 5분
    gcTime: 600000, // 10분
  });
}

/**
 * Hook for order status statistics
 */
export function useOrderStatusStats() {
  return useQuery({
    queryKey: ["order-status-stats"],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/order-status-stats`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch order status statistics');
      return response.json();
    },
    staleTime: 60000, // 1분
    gcTime: 300000, // 5분
  });
}

/**
 * Mutation hook for order status changes
 */
export function useOrderStatusMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await apiRequest("PUT", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders-optimized"] });
      queryClient.invalidateQueries({ queryKey: ["order-status-stats"] });
      toast({
        title: "성공",
        description: "발주서 상태가 변경되었습니다.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "발주서 상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Mutation hook for order deletion
 */
export function useOrderDeleteMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  return useMutation({
    mutationFn: async (orderId: string) => {
      await apiRequest("DELETE", `/api/orders/${orderId}`);
      return orderId;
    },
    onMutate: async (orderId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["unified-orders"] });
      
      // Optimistically update all cached queries
      queryClient.setQueriesData(
        { queryKey: ["unified-orders"] },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            orders: old.orders.filter((order: UnifiedOrder) => order.id !== parseInt(orderId)),
            total: old.total - 1
          };
        }
      );
      
      return { orderId };
    },
    onError: (error, orderId, context) => {
      // Rollback optimistic update
      queryClient.invalidateQueries({ queryKey: ["unified-orders"] });
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "발주서 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
    onSuccess: (orderId) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["unified-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders-optimized"] });
      queryClient.invalidateQueries({ queryKey: ["order-status-stats"] });
      
      toast({
        title: "성공",
        description: "발주서가 삭제되었습니다.",
      });
    },
  });
}