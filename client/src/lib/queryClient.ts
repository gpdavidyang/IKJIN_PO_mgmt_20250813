import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createOptimizedQueryClient } from "./query-optimization";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Use the optimized query client with enhanced defaults
export const queryClient = createOptimizedQueryClient();

// Override the default query function with auth-friendly defaults
queryClient.setDefaultOptions({
  queries: {
    queryFn: getQueryFn({ on401: "returnNull" }), // Return null for 401 instead of throwing
    retry: (failureCount, error: any) => {
      // Don't retry 401, 403, or 404 errors
      if (error?.message?.includes('401') || error?.message?.includes('403') || error?.message?.includes('404')) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, // Prevent excessive refetching
  },
});
