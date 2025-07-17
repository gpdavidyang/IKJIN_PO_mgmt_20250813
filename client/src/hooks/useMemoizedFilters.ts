import { useMemo, useCallback } from "react";
import { useSearchParams } from "wouter";

interface FilterConfig {
  [key: string]: {
    default: any;
    type: 'string' | 'number' | 'boolean';
  };
}

export function useMemoizedFilters<T extends Record<string, any>>(
  config: FilterConfig,
  dependencies: any[] = []
) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Memoized filter values parsed from URL
  const filters = useMemo(() => {
    const result = {} as T;
    
    Object.entries(config).forEach(([key, { default: defaultValue, type }]) => {
      const urlValue = searchParams.get(key);
      
      if (urlValue === null) {
        result[key as keyof T] = defaultValue;
        return;
      }

      switch (type) {
        case 'number':
          const num = parseFloat(urlValue);
          result[key as keyof T] = isNaN(num) ? defaultValue : num;
          break;
        case 'boolean':
          result[key as keyof T] = urlValue === 'true';
          break;
        default:
          result[key as keyof T] = urlValue || defaultValue;
      }
    });

    return result;
  }, [searchParams, config, ...dependencies]);

  // Memoized update function
  const updateFilter = useCallback((key: string, value: any) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (value === undefined || value === null || value === '' || value === config[key]?.default) {
      newParams.delete(key);
    } else {
      newParams.set(key, String(value));
    }
    
    setSearchParams(newParams.toString());
  }, [searchParams, setSearchParams, config]);

  // Memoized reset function
  const resetFilters = useCallback(() => {
    setSearchParams('');
  }, [setSearchParams]);

  // Memoized active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      const defaultValue = config[key]?.default;
      return value !== defaultValue && value !== '' && value !== null && value !== undefined;
    }).length;
  }, [filters, config]);

  return {
    filters,
    updateFilter,
    resetFilters,
    activeFiltersCount,
  };
}

// Specialized hook for common list page filters
export function useListFilters() {
  return useMemoizedFilters({
    search: { default: '', type: 'string' },
    page: { default: 1, type: 'number' },
    limit: { default: 50, type: 'number' },
    sortBy: { default: 'createdAt', type: 'string' },
    sortOrder: { default: 'desc', type: 'string' },
  });
}