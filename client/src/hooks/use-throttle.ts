import { useCallback, useRef } from 'react';

/**
 * Custom hook to throttle function calls
 * @param fn - Function to throttle
 * @param delay - Delay in milliseconds
 * @returns Throttled function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  const lastCall = useRef(0);
  const timeout = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return fn(...args);
    }
    
    // Clear existing timeout
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    
    // Schedule call for the remaining time
    timeout.current = setTimeout(() => {
      lastCall.current = Date.now();
      fn(...args);
    }, delay - (now - lastCall.current));
  }, [fn, delay]) as T;
}