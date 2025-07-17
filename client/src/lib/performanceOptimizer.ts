// 성능 최적화를 위한 유틸리티 모음
import { useMemo, useCallback } from 'react';

// 메모이제이션 헬퍼
export function useMemoizedValue<T>(value: T, deps: any[]): T {
  return useMemo(() => value, deps);
}

// 콜백 최적화
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  return useCallback(callback, deps);
}

// 배열 필터링 최적화
export function useFilteredData<T>(
  data: T[],
  filterFn: (item: T) => boolean,
  deps: any[]
) {
  return useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter(filterFn);
  }, [data, filterFn, ...deps]);
}

// 페이지네이션 최적화
export function usePaginatedData<T>(
  data: T[],
  page: number,
  pageSize: number
) {
  return useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const startIndex = (page - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [data, page, pageSize]);
}

// 검색 최적화 (디바운싱 포함)
export function useOptimizedSearch<T>(
  data: T[],
  searchTerm: string,
  searchFields: (keyof T)[],
  debounceMs: number = 300
) {
  return useMemo(() => {
    if (!searchTerm.trim() || !data) return data;
    
    const lowercaseSearchTerm = searchTerm.toLowerCase();
    return data.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        return value && 
               typeof value === 'string' && 
               value.toLowerCase().includes(lowercaseSearchTerm);
      })
    );
  }, [data, searchTerm, searchFields]);
}

// 정렬 최적화
export function useSortedData<T>(
  data: T[],
  sortKey: keyof T,
  sortDirection: 'asc' | 'desc' = 'asc'
) {
  return useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDirection]);
}

// 번들 크기 최적화: 동적 import 헬퍼
export function createLazyComponent<T>(
  componentLoader: () => Promise<{ default: T }>
) {
  return componentLoader;
}

// 메모리 사용량 모니터링
export function logMemoryUsage(label: string) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const memory = (performance as any).memory;
    if (memory) {
      console.log(`[${label}] Memory Usage:`, {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB`
      });
    }
  }
}

// 렌더링 성능 측정
export function measureRenderTime(componentName: string) {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    console.log(`[${componentName}] Render time: ${endTime - startTime}ms`);
  };
}