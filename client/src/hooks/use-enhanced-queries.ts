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
import type { 
  PurchaseOrder, 
  Vendor, 
  Project, 
  Item, 
  User 
} from "@shared/order-types";

// Authentication hooks
export function useCurrentUser() {
  return useSmartQuery(
    queryKeys.auth.user(),
    {
      queryFn: () => apiRequest("GET", "/api/auth/me"),
      cacheType: "MASTER",
      backgroundSync: true,
    }
  );
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
  return useSmartQuery(
    queryKeys.dashboard.unified(),
    {
      queryFn: () => apiRequest("GET", "/api/dashboard/unified"),
      cacheType: "DYNAMIC",
      backgroundSync: true,
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

// Order hooks
export function useOrders(filters?: any) {
  return useSmartQuery(
    queryKeys.orders.list(filters),
    {
      queryFn: () => apiRequest("GET", `/api/orders${filters ? `?${new URLSearchParams(filters).toString()}` : ''}`),
      cacheType: "DYNAMIC",
      backgroundSync: true,
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

// Order mutations with optimistic updates
export function useCreateOrder() {
  return useSmartMutation({
    mutationFn: (orderData: Partial<PurchaseOrder>) => 
      apiRequest("POST", "/api/orders", orderData),
    invalidateQueries: [
      queryKeys.orders.all(),
      queryKeys.dashboard.unified(),
    ],
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
    invalidateQueries: [
      queryKeys.orders.all(),
      queryKeys.dashboard.unified(),
    ],
    successMessage: "발주서가 성공적으로 수정되었습니다.",
    errorMessage: "발주서 수정 중 오류가 발생했습니다.",
  });
}

export function useDeleteOrder() {
  return useSmartMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/orders/${id}`),
    invalidateQueries: [
      queryKeys.orders.all(),
      queryKeys.dashboard.unified(),
    ],
    optimisticUpdate: {
      queryKey: queryKeys.orders.all(),
      updater: (oldData: any, variables) => {
        if (!oldData) return oldData;
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
  const { data: user } = useCurrentUser();
  
  // Prefetch essential static data
  usePositions();
  useUITerms();
  useItemCategories();
  useActiveProjects();
  
  // Prefetch user-specific data when user is available
  const { data: permissions } = useUserPermissions(user?.id);
  
  return {
    user,
    permissions,
    isInitialized: !!user && !!permissions,
  };
}