/**
 * Offline-Aware API Hook
 * 
 * Provides API functionality that works both online and offline:
 * - Caches responses for offline access
 * - Queues actions when offline
 * - Automatically syncs when back online
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offlineStorage } from '@/lib/offline-storage';
import { useNetworkStatus } from './useNetworkStatus';
import { useToast } from '@/components/notifications/notification-provider';

interface UseOfflineAPIOptions {
  cacheTime?: number;
  staleTime?: number;
  enableOfflineQueue?: boolean;
  fallbackToCache?: boolean;
}

interface OfflineQueryOptions extends UseOfflineAPIOptions {
  queryKey: any[];
  queryFn: () => Promise<any>;
  enabled?: boolean;
}

interface OfflineMutationOptions extends UseOfflineAPIOptions {
  mutationFn: (variables: any) => Promise<any>;
  onSuccess?: (data: any, variables: any) => void;
  onError?: (error: any, variables: any) => void;
  offlineAction?: {
    type: string;
    endpoint: string;
    method: string;
  };
}

export function useOfflineQuery(options: OfflineQueryOptions) {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  
  const {
    queryKey,
    queryFn,
    enabled = true,
    cacheTime = 1000 * 60 * 60 * 24, // 24 hours
    staleTime = 1000 * 60 * 5, // 5 minutes
    fallbackToCache = true,
  } = options;

  // Enhanced query function that handles offline scenarios
  const enhancedQueryFn = useCallback(async () => {
    try {
      // Try network request first
      const data = await queryFn();
      
      // Cache the response offline
      const cacheKey = Array.isArray(queryKey) ? queryKey.join('-') : String(queryKey);
      await offlineStorage.storeUserData(`query-${cacheKey}`, {
        data,
        timestamp: Date.now(),
      });
      
      return data;
    } catch (error) {
      // If offline and fallback is enabled, try cache
      if (!isOnline && fallbackToCache) {
        console.log('🔄 Network failed, trying offline cache for:', queryKey);
        
        const cacheKey = Array.isArray(queryKey) ? queryKey.join('-') : String(queryKey);
        const cachedData = await offlineStorage.getUserData(`query-${cacheKey}`);
        
        if (cachedData) {
          console.log('📱 Serving from offline cache:', queryKey);
          
          // Show offline indicator
          toast.info('오프라인 모드', '저장된 데이터를 표시하고 있습니다.');
          
          return cachedData.data;
        }
      }
      
      throw error;
    }
  }, [queryFn, queryKey, isOnline, fallbackToCache, toast]);

  return useQuery({
    queryKey,
    queryFn: enhancedQueryFn,
    enabled,
    cacheTime,
    staleTime,
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!isOnline) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useOfflineMutation(options: OfflineMutationOptions) {
  const { isOnline, addOfflineAction } = useNetworkStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    mutationFn,
    onSuccess,
    onError,
    offlineAction,
    enableOfflineQueue = true,
  } = options;

  // Enhanced mutation function that handles offline scenarios
  const enhancedMutationFn = useCallback(async (variables: any) => {
    if (isOnline) {
      // Online: execute normally
      return await mutationFn(variables);
    } else if (enableOfflineQueue && offlineAction) {
      // Offline: queue the action
      console.log('📱 Queuing offline action:', offlineAction.type);
      
      const actionId = await addOfflineAction({
        type: offlineAction.type as any,
        endpoint: offlineAction.endpoint,
        method: offlineAction.method,
        data: {
          body: variables,
          headers: {},
        },
        maxRetries: 3,
      });
      
      toast.info('오프라인 모드', '작업이 대기열에 추가되었습니다. 온라인 시 자동으로 동기화됩니다.');
      
      // Return a placeholder response
      return {
        id: actionId,
        ...variables,
        offline: true,
        timestamp: new Date().toISOString(),
      };
    } else {
      // Offline and no queue: throw error
      throw new Error('오프라인 상태에서는 이 작업을 수행할 수 없습니다.');
    }
  }, [isOnline, mutationFn, enableOfflineQueue, offlineAction, addOfflineAction, toast]);

  return useMutation({
    mutationFn: enhancedMutationFn,
    onSuccess: (data, variables) => {
      if (onSuccess) {
        onSuccess(data, variables);
      }
      
      // If it was an offline action, show appropriate message
      if (data?.offline) {
        toast.success('작업 대기', '온라인 시 자동으로 처리됩니다.');
      }
    },
    onError: (error, variables) => {
      if (onError) {
        onError(error, variables);
      } else {
        toast.error('작업 실패', error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      }
    },
    onSettled: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries();
    },
  });
}

// Specialized hooks for different data types

export function useOfflineOrders() {
  const { isOnline } = useNetworkStatus();
  
  return useOfflineQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      
      // Store in offline cache
      await offlineStorage.storeOrders(data);
      return data;
    },
    fallbackToCache: true,
  });
}

export function useOfflineVendors() {
  return useOfflineQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await fetch('/api/vendors', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch vendors');
      const data = await response.json();
      
      // Store in offline cache
      await offlineStorage.storeVendors(data);
      return data;
    },
    fallbackToCache: true,
  });
}

export function useOfflineItems() {
  return useOfflineQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const response = await fetch('/api/items', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch items');
      const data = await response.json();
      
      // Store in offline cache
      await offlineStorage.storeItems(data);
      return data;
    },
    fallbackToCache: true,
  });
}

export function useOfflineProjects() {
  return useOfflineQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      
      // Store in offline cache
      await offlineStorage.storeProjects(data);
      return data;
    },
    fallbackToCache: true,
  });
}

export function useCreateOfflineOrder() {
  return useOfflineMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to create order');
      return response.json();
    },
    offlineAction: {
      type: 'CREATE_ORDER',
      endpoint: '/api/orders',
      method: 'POST',
    },
  });
}

export function useUpdateOfflineOrder() {
  return useOfflineMutation({
    mutationFn: async ({ id, ...orderData }: any) => {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to update order');
      return response.json();
    },
    offlineAction: {
      type: 'UPDATE_ORDER',
      endpoint: '/api/orders/:id',
      method: 'PUT',
    },
  });
}

export function useCreateOfflineVendor() {
  return useOfflineMutation({
    mutationFn: async (vendorData: any) => {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorData),
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to create vendor');
      return response.json();
    },
    offlineAction: {
      type: 'CREATE_VENDOR',
      endpoint: '/api/vendors',
      method: 'POST',
    },
  });
}

// Utility hook for cache management
export function useOfflineCache() {
  const { toast } = useToast();
  
  const clearCache = useCallback(async () => {
    try {
      await offlineStorage.clearAllData();
      toast.success('캐시 삭제', '모든 오프라인 데이터가 삭제되었습니다.');
    } catch (error) {
      toast.error('캐시 삭제 실패', '오프라인 데이터 삭제 중 오류가 발생했습니다.');
    }
  }, [toast]);

  const getCacheStatus = useCallback(async () => {
    try {
      const status = await offlineStorage.getCacheStatus();
      const size = await offlineStorage.getDatabaseSize();
      return { status, size };
    } catch (error) {
      console.error('Failed to get cache status:', error);
      return null;
    }
  }, []);

  const exportCache = useCallback(async () => {
    try {
      const data = await offlineStorage.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `offline-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('데이터 내보내기', '오프라인 데이터가 다운로드되었습니다.');
    } catch (error) {
      toast.error('내보내기 실패', '데이터 내보내기 중 오류가 발생했습니다.');
    }
  }, [toast]);

  return {
    clearCache,
    getCacheStatus,
    exportCache,
  };
}

export default {
  useOfflineQuery,
  useOfflineMutation,
  useOfflineOrders,
  useOfflineVendors,
  useOfflineItems,
  useOfflineProjects,
  useCreateOfflineOrder,
  useUpdateOfflineOrder,
  useCreateOfflineVendor,
  useOfflineCache,
};