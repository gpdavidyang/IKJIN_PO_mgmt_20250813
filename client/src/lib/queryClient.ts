import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createOptimizedQueryClient } from "./query-optimization";
import { isDevelopment, isProduction } from "@/utils/environment";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const error = new Error(`${res.status}: ${text}`);
    // Attach status to error for better error handling
    (error as any).status = res.status;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const headers: Record<string, string> = {};
  
  // Only set Content-Type for JSON data, not for FormData
  if (data && !(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Return JSON for successful responses
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return text;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      // Silently handle 401s when configured to return null
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (fetchError: any) {
      // Handle network errors gracefully
      if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
        if (unauthorizedBehavior === "returnNull") {
          // Treat network errors as unauthenticated when in auth mode
          return null;
        }
      }
      
      // Attach additional error context
      if (fetchError.status) {
        (fetchError as any).queryKey = queryKey;
      }
      
      throw fetchError;
    }
  };

// Use the optimized query client with enhanced defaults
export const queryClient = createOptimizedQueryClient();

// Override the default query function with auth-friendly defaults
queryClient.setDefaultOptions({
  queries: {
    queryFn: getQueryFn({ on401: "returnNull" }), // Return null for 401 instead of throwing
    retry: (failureCount, error: any) => {
      // Don't retry auth-related or client errors
      if (error?.message?.includes('401') || 
          error?.message?.includes('403') || 
          error?.message?.includes('404') ||
          error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, // Prevent excessive refetching
    // Production-specific optimizations for auth queries
    refetchOnMount: isDevelopment(),
    refetchOnReconnect: false,
    // Global error handling to suppress 401s in production
    onError: (error: any) => {
      // Only log non-auth errors in production
      if (isProduction()) {
        // Suppress 401 errors from console logs
        if (error?.message?.includes('401') || error?.status === 401) {
          return;
        }
      }
      
      // Log other errors normally
      if (isDevelopment()) {
        console.warn('Query error:', error);
      }
    },
  },
});
