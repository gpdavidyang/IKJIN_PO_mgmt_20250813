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
  optionsOrMethod: string | { endpoint: string; method: string; data?: unknown },
  url?: string,
  data?: unknown | undefined,
): Promise<any> {
  // Support both old and new call signatures
  let actualMethod: string;
  let actualUrl: string;
  let actualData: unknown | undefined;
  
  if (typeof optionsOrMethod === 'object') {
    // New signature: apiRequest({ endpoint, method, data })
    actualMethod = optionsOrMethod.method;
    actualUrl = optionsOrMethod.endpoint;
    actualData = optionsOrMethod.data;
  } else {
    // Old signature: apiRequest(method, url, data)
    actualMethod = optionsOrMethod;
    actualUrl = url!;
    actualData = data;
  }
  const headers: Record<string, string> = {};
  
  // Only set Content-Type for JSON data, not for FormData
  if (actualData && !(actualData instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  // Backend uses httpOnly cookies for JWT authentication
  // No need to manually set Authorization header
  
  const res = await fetch(actualUrl, {
    method: actualMethod,
    headers,
    body: actualData instanceof FormData ? actualData : (actualData ? JSON.stringify(actualData) : undefined),
    credentials: "include", // Keep cookie-based auth as fallback
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
      const headers: Record<string, string> = {};
      
      // Backend uses httpOnly cookies for JWT authentication
      // No need to manually set Authorization header
      
      const res = await fetch(queryKey[0] as string, {
        headers,
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

// Configure proper error handling for authentication failures
queryClient.setDefaultOptions({
  queries: {
    queryFn: getQueryFn({ on401: "returnNull" }), // Return null for 401 instead of throwing
    retry: (failureCount, error: any) => {
      // Don't retry on 401 or 403 errors (authentication/authorization failures)
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnMount: true, // Allow refetch on mount for fresh data
    refetchOnReconnect: true, // Refetch when reconnecting
    refetchInterval: false, // Disable automatic polling by default
  },
  mutations: {
    retry: (failureCount, error: any) => {
      // Don't retry on 401 or 403 errors
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      // Retry other errors once
      return failureCount < 1;
    },
  },
});
