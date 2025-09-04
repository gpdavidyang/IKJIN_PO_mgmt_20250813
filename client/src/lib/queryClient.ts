import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createOptimizedQueryClient } from "./query-optimization";
import { isDevelopmentEnvironment } from "@/utils/environment";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let errorData: any;
    
    // Try to parse as JSON to get structured error data
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { message: text };
    }
    
    // Create error with message
    const error = new Error(errorData.message || `${res.status}: ${text}`);
    
    // Attach all error properties to the error object
    Object.assign(error, errorData);
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

// EMERGENCY ANTI-LOOP CONFIGURATION: Override defaults with aggressive caching
queryClient.setDefaultOptions({
  queries: {
    queryFn: getQueryFn({ on401: "returnNull" }), // Return null for 401 instead of throwing
    retry: false, // EMERGENCY: Disable all retries to prevent loops
    staleTime: Infinity, // EMERGENCY: Never consider data stale to prevent refetches
    gcTime: Infinity, // EMERGENCY: Keep cache forever to prevent re-requests
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnMount: false, // EMERGENCY: Never refetch on mount
    refetchOnReconnect: false, // Never refetch on reconnect
    refetchInterval: false, // Disable automatic polling
    // EMERGENCY: Network prioritization to use cache first
    networkMode: 'offlineFirst',
  },
  mutations: {
    // EMERGENCY: Disable mutation retry to prevent cascades
    retry: false,
    // EMERGENCY: Disable automatic query invalidation
    onSuccess: () => {
      // Do nothing - prevent automatic invalidations that cause loops
    },
  },
  // EMERGENCY: Suppress ALL query errors to prevent console spam and loops
  defaultOptions: {
    queries: {
      onError: () => {
        // EMERGENCY: Complete error suppression to prevent cascading failures
      },
    },
    mutations: {
      onError: () => {
        // EMERGENCY: Complete error suppression to prevent cascading failures  
      },
    },
  },
});
