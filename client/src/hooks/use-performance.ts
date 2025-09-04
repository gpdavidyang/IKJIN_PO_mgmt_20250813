/**
 * Performance optimization hooks
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

/**
 * Debounce hook to limit the rate of function execution
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook to limit function calls to once per specified time period
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Memoized callback with dependency tracking
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  return useCallback(callback, deps);
}

/**
 * Previous value hook for comparison
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

/**
 * Deep comparison memo hook
 */
export function useDeepMemo<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<{ deps: any[]; value: T }>();

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
}

/**
 * Mount state hook to prevent state updates on unmounted components
 */
export function useMountedState(): () => boolean {
  const mountedRef = useRef(false);
  const get = useCallback(() => mountedRef.current, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return get;
}

/**
 * Async operation hook with loading and error states
 */
export function useAsyncOperation<T>(): {
  execute: (operation: () => Promise<T>) => Promise<T | undefined>;
  loading: boolean;
  error: Error | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useMountedState();

  const execute = useCallback(
    async (operation: () => Promise<T>): Promise<T | undefined> => {
      if (!isMounted()) return;

      setLoading(true);
      setError(null);

      try {
        const result = await operation();
        if (isMounted()) {
          setLoading(false);
        }
        return result;
      } catch (err) {
        if (isMounted()) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setLoading(false);
        }
        return undefined;
      }
    },
    [isMounted]
  );

  return { execute, loading, error };
}

/**
 * Lazy initialization hook
 */
export function useLazyInit<T>(initializer: () => T): T {
  const [state] = useState(initializer);
  return state;
}

/**
 * Force update hook
 */
export function useForceUpdate(): () => void {
  const [, setTick] = useState(0);
  const update = useCallback(() => {
    setTick(tick => tick + 1);
  }, []);
  return update;
}

/**
 * Intersection observer hook for lazy loading
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      options
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * Window size hook
 */
export function useWindowSize(): { width: number; height: number } {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

/**
 * Local storage hook with serialization
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

/**
 * Performance monitoring hook - Optimized to prevent memory leaks
 */
export function usePerformanceMonitor(componentName: string) {
  const startTime = useRef<number>();
  const renderCount = useRef(0);
  const lastLogTime = useRef(Date.now());
  const isFirstRender = useRef(true);

  // Only run in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  useEffect(() => {
    if (!isDevelopment) return;
    
    const renderStart = performance.now();
    renderCount.current += 1;
    
    // Throttle logging to prevent console spam
    const shouldLog = Date.now() - lastLogTime.current > 5000; // Log at most every 5 seconds
    
    return () => {
      if (renderStart) {
        const duration = performance.now() - renderStart;
        
        // Only log if it's a significant slowdown and we haven't logged recently
        if (shouldLog && duration > 50) { // Higher threshold to reduce noise
          console.warn(`[${componentName}] Render: ${duration.toFixed(1)}ms (render #${renderCount.current})`);
          lastLogTime.current = Date.now();
        }
        
        // Reset render count periodically to prevent unbounded growth
        if (renderCount.current > 50) {
          renderCount.current = 0;
        }
      }
    };
  }, []); // Empty dependency array to prevent memory leaks

  // Return minimal data to prevent unnecessary re-renders
  return useMemo(() => ({ 
    renderCount: renderCount.current 
  }), []);
}

/**
 * Memory usage monitoring hook
 */
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSMemory?: number;
    totalJSMemory?: number;
    memoryLimit?: number;
  }>({});

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSMemory: memory.usedJSHeapSize,
          totalJSMemory: memory.totalJSHeapSize,
          memoryLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

/**
 * First Contentful Paint monitoring - Optimized to prevent multiple observers
 */
export function usePageLoadMetrics() {
  const [metrics, setMetrics] = useState<{
    fcp?: number;
    lcp?: number;
    cls?: number;
    fid?: number;
  }>({});
  
  const hasSetupObserver = useRef(false);
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // Only setup in development and only once
    if (!isDevelopment || hasSetupObserver.current) return;
    
    hasSetupObserver.current = true;
    
    // Check if PerformanceObserver is supported
    if (typeof PerformanceObserver === 'undefined') return;
    
    try {
      // Measure First Contentful Paint and Largest Contentful Paint
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
            setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
          }
          if (entry.entryType === 'largest-contentful-paint') {
            setMetrics(prev => ({ ...prev, lcp: entry.startTime }));
          }
        });
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

      return () => {
        observer.disconnect();
        hasSetupObserver.current = false;
      };
    } catch (error) {
      // Silently handle any PerformanceObserver errors
      hasSetupObserver.current = false;
    }
  }, []); // Empty dependency array to prevent re-setup

  return metrics;
}

/**
 * Component size monitoring hook
 */
export function useComponentSize(ref: React.RefObject<HTMLElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    resizeObserver.observe(ref.current);

    return () => resizeObserver.disconnect();
  }, [ref]);

  return size;
}

/**
 * Bundle size analytics - Optimized to run only once and cache results
 */
export function useBundleAnalytics() {
  const hasRun = useRef(false);
  
  useEffect(() => {
    // Only run once and only in development
    if (hasRun.current || process.env.NODE_ENV !== 'development') {
      return;
    }
    
    hasRun.current = true;
    
    // Defer bundle analysis to avoid blocking render
    const timeoutId = setTimeout(() => {
      try {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const chunkCount = scripts.filter(script => {
          const src = script.getAttribute('src');
          return src && src.includes('chunk');
        }).length;

        if (chunkCount > 0) {
          console.log(`Bundle chunks detected: ${chunkCount}`);
        }
      } catch (error) {
        // Silently handle any DOM query errors
      }
    }, 1000); // Delay to not interfere with initial render
    
    return () => clearTimeout(timeoutId);
  }, []);
}

// Utility function for deep equality check
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (let key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}