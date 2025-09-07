/**
 * Enhanced Query Hooks for Purchase Order Management System
 * Provides optimized, type-safe query hooks for all major data entities
 */

import { useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { 
  useSmartQuery, 
  useSmartMutation, 
  useBackgroundSync,
  usePrefetchManager,
  useCacheWarming,
  queryKeys,
  CACHE_CONFIGS 
} from "@/lib/query-optimization";
import { useAuth } from "@/hooks/useAuth";

// Re-export commonly used hooks and utilities for use in other components
export { 
  useCacheWarming,
  useSmartQuery,
  useSmartMutation,
  useBackgroundSync,
  usePrefetchManager,
  queryKeys,
  CACHE_CONFIGS
};
import type { 
  PurchaseOrder, 
  Vendor, 
  Project, 
  Item, 
  User 
} from "@shared/order-types";

// Authentication hooks - DEPRECATED: Use useAuth instead
export function useCurrentUser() {
  // DEPRECATED FUNCTION - Always return null to prevent 401 calls
  return {
    data: null,
    isLoading: false,
    error: null,
    isError: false,
    isSuccess: true,
    refetch: () => Promise.resolve(null)
  };
}

export function useUserPermissions(userId: number) {
  return useSmartQuery(
    queryKeys.auth.permissions(userId),
    {
      queryFn: () => apiRequest("GET", `/api/auth/permissions/${userId}`),
      cacheType: "MASTER",
      enabled: !!userId,
    }
  );
}

// Dashboard hooks
export function useDashboardData() {
  const { user } = useAuth();
  
  return useSmartQuery(
    queryKeys.dashboard.unified(),
    {
      queryFn: () => apiRequest("GET", "/api/dashboard/unified"),
      cacheType: "DYNAMIC",
      backgroundSync: true,
      enabled: !!user, // Only fetch when user is authenticated
    }
  );
}

export function useDashboardStats(timeRange?: string) {
  return useSmartQuery(
    queryKeys.dashboard.stats(timeRange),
    {
      queryFn: () => apiRequest("GET", `/api/dashboard/stats${timeRange ? `?range=${timeRange}` : ''}`),
      cacheType: "DYNAMIC",
    }
  );
}

// Order hooks (temporarily using normal orders endpoint to fix draft visibility)
export function useOrders(filters?: any) {
  const queryFn = async () => {
    // Use regular orders endpoint instead of optimized to ensure draft orders are shown
    const url = `/api/orders${filters ? `?${new URLSearchParams(filters).toString()}` : ''}`;
    const response = await apiRequest("GET", url);
    return response;
  };

  return useSmartQuery(
    queryKeys.orders.list(filters),
    {
      queryFn,
      cacheType: "DYNAMIC",
      backgroundSync: true,
      staleTime: 30000, // 30초 동안 fresh 상태 유지 (재요청 방지)
      gcTime: 300000, // 5분 동안 캐시 유지
    }
  );
}

export function useOrder(id: number) {
  return useSmartQuery(
    queryKeys.orders.detail(id),
    {
      queryFn: () => apiRequest("GET", `/api/orders/${id}`),
      cacheType: "DYNAMIC",
      enabled: !!id,
      dependencies: [
        queryKeys.vendors.all(),
        queryKeys.projects.all(),
        queryKeys.items.all()
      ],
    }
  );
}

export function useOrderItems(orderId: number) {
  return useSmartQuery(
    queryKeys.orders.items(orderId),
    {
      queryFn: () => apiRequest("GET", `/api/orders/${orderId}/items`),
      cacheType: "DYNAMIC",
      enabled: !!orderId,
    }
  );
}

export function useOrderHistory(orderId: number) {
  return useSmartQuery(
    queryKeys.orders.history(orderId),
    {
      queryFn: () => apiRequest("GET", `/api/orders/${orderId}/history`),
      cacheType: "STATIC", // History doesn't change frequently
      enabled: !!orderId,
    }
  );
}

export function useOrderTemplates() {
  return useSmartQuery(
    queryKeys.orders.templates(),
    {
      queryFn: () => apiRequest("GET", "/api/orders/templates"),
      cacheType: "MASTER",
    }
  );
}

// Order mutations with intelligent invalidation
export function useCreateOrder() {
  return useSmartMutation({
    mutationFn: (orderData: Partial<PurchaseOrder>) => 
      apiRequest("POST", "/api/orders", orderData),
    mutationType: 'create',
    entityType: 'order',
    optimisticUpdate: {
      queryKey: queryKeys.orders.all(),
      updater: (oldData: any, variables) => {
        if (!oldData) return oldData;
        const tempOrder = {
          ...variables,
          id: Date.now(), // Temporary ID
          status: 'draft',
          createdAt: new Date().toISOString(),
        };
        return [...(oldData || []), tempOrder];
      },
    },
    successMessage: "발주서가 성공적으로 생성되었습니다.",
    errorMessage: "발주서 생성 중 오류가 발생했습니다.",
  });
}

export function useUpdateOrder() {
  return useSmartMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PurchaseOrder> }) =>
      apiRequest("PUT", `/api/orders/${id}`, data),
    mutationType: 'update',
    entityType: 'order',
    successMessage: "발주서가 성공적으로 수정되었습니다.",
    errorMessage: "발주서 수정 중 오류가 발생했습니다.",
  });
}

export function useDeleteOrder() {
  return useSmartMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/orders/${id}`),
    mutationType: 'delete',
    entityType: 'order',
    optimisticUpdate: {
      queryKey: queryKeys.orders.all(),
      updater: (oldData: any, variables) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((order: any) => order.id !== variables);
      },
    },
    successMessage: "발주서가 성공적으로 삭제되었습니다.",
    errorMessage: "발주서 삭제 중 오류가 발생했습니다.",
  });
}

// Vendor hooks
export function useVendors(filters?: any) {
  return useSmartQuery(
    queryKeys.vendors.list(filters),
    {
      queryFn: () => apiRequest("GET", `/api/vendors${filters ? `?${new URLSearchParams(filters).toString()}` : ''}`),
      cacheType: "MASTER",
      backgroundSync: true,
    }
  );
}

export function useVendor(id: number) {
  return useSmartQuery(
    queryKeys.vendors.detail(id),
    {
      queryFn: () => apiRequest("GET", `/api/vendors/${id}`),
      cacheType: "MASTER",
      enabled: !!id,
    }
  );
}

export function useVendorSearch(query: string) {
  return useSmartQuery(
    queryKeys.vendors.search(query),
    {
      queryFn: () => apiRequest("GET", `/api/vendors/search?q=${encodeURIComponent(query)}`),
      cacheType: "SEARCH",
      enabled: query.length >= 2,
    }
  );
}

// Vendor mutations
export function useCreateVendor() {
  return useSmartMutation({
    mutationFn: (vendorData: Partial<Vendor>) => 
      apiRequest("POST", "/api/vendors", vendorData),
    invalidateQueries: [
      queryKeys.vendors.all(),
    ],
    successMessage: "거래처가 성공적으로 등록되었습니다.",
    errorMessage: "거래처 등록 중 오류가 발생했습니다.",
  });
}

export function useUpdateVendor() {
  return useSmartMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vendor> }) =>
      apiRequest("PUT", `/api/vendors/${id}`, data),
    invalidateQueries: [
      queryKeys.vendors.all(),
    ],
    successMessage: "거래처 정보가 성공적으로 수정되었습니다.",
    errorMessage: "거래처 정보 수정 중 오류가 발생했습니다.",
  });
}

// Project hooks
export function useProjects(filters?: any) {
  return useSmartQuery(
    queryKeys.projects.list(filters),
    {
      queryFn: () => apiRequest("GET", `/api/projects${filters ? `?${new URLSearchParams(filters).toString()}` : ''}`),
      cacheType: "MASTER",
      backgroundSync: true,
    }
  );
}

export function useProject(id: number) {
  return useSmartQuery(
    queryKeys.projects.detail(id),
    {
      queryFn: () => apiRequest("GET", `/api/projects/${id}`),
      cacheType: "MASTER",
      enabled: !!id,
    }
  );
}

export function useActiveProjects() {
  return useSmartQuery(
    queryKeys.projects.active(),
    {
      queryFn: () => apiRequest("GET", "/api/projects/active"),
      cacheType: "MASTER",
    }
  );
}

// Project mutations
export function useCreateProject() {
  return useSmartMutation({
    mutationFn: (projectData: Partial<Project>) => 
      apiRequest("POST", "/api/projects", projectData),
    invalidateQueries: [
      queryKeys.projects.all(),
      queryKeys.projects.active(),
    ],
    successMessage: "현장이 성공적으로 등록되었습니다.",
    errorMessage: "현장 등록 중 오류가 발생했습니다.",
  });
}

// Item hooks
export function useItems(filters?: any) {
  return useSmartQuery(
    queryKeys.items.list(filters),
    {
      queryFn: () => apiRequest("GET", `/api/items${filters ? `?${new URLSearchParams(filters).toString()}` : ''}`),
      cacheType: "MASTER",
    }
  );
}

export function useItem(id: number) {
  return useSmartQuery(
    queryKeys.items.detail(id),
    {
      queryFn: () => apiRequest("GET", `/api/items/${id}`),
      cacheType: "MASTER",
      enabled: !!id,
    }
  );
}

export function useItemCategories() {
  return useSmartQuery(
    queryKeys.items.categories(),
    {
      queryFn: () => apiRequest("GET", "/api/items/categories"),
      cacheType: "STATIC",
    }
  );
}

// Admin hooks
export function useUsers() {
  return useSmartQuery(
    queryKeys.admin.users(),
    {
      queryFn: () => apiRequest("GET", "/api/admin/users"),
      cacheType: "MASTER",
    }
  );
}

export function usePositions() {
  return useSmartQuery(
    queryKeys.admin.positions(),
    {
      queryFn: () => apiRequest("GET", "/api/positions"),
      cacheType: "STATIC",
    }
  );
}

export function useUITerms() {
  return useSmartQuery(
    queryKeys.admin.uiTerms(),
    {
      queryFn: () => apiRequest("GET", "/api/ui-terms"),
      cacheType: "STATIC",
    }
  );
}

// Global hooks for application-wide optimizations
export function useQueryOptimization() {
  const { prefetchRoute, prefetchDetail } = usePrefetchManager();
  
  // Background sync for critical data
  const syncNow = useBackgroundSync([
    queryKeys.dashboard.unified(),
    queryKeys.orders.all(),
    queryKeys.vendors.all(),
    queryKeys.projects.active(),
  ]);
  
  const prefetchForRoute = useCallback((route: string, params?: any) => {
    prefetchRoute(route, params);
  }, [prefetchRoute]);
  
  const prefetchDetails = useCallback((type: string, id: number) => {
    prefetchDetail(type, id);
  }, [prefetchDetail]);
  
  return {
    syncNow,
    prefetchForRoute,
    prefetchDetails,
  };
}

// Hook for warming up essential caches on app start
export function useAppInitialization() {
  const { user } = useAuth(); // Use useAuth instead of useCurrentUser to prevent 401 calls
  
  // Prefetch essential static data only (projects/vendors come via optimized endpoints)
  usePositions();
  useUITerms();
  useItemCategories();
  // Removed useActiveProjects() - this data comes via optimized orders endpoint
  
  // Prefetch user-specific data when user is available
  const { data: permissions } = useUserPermissions(user?.id);
  
  return {
    user,
    permissions,
    isInitialized: !!user && !!permissions,
  };
}