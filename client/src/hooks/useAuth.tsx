import { createContext, ReactNode, useContext, useCallback, useState, useEffect, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isDevelopmentEnvironment, isProductionEnvironment, devLog, devWarn } from "@/utils/environment";

type User = {
  id: string;
  email: string | null;
  name: string;
  password: string;
  positionId: number | null;
  phoneNumber: string;
  profileImageUrl: string | null;
  role: "field_worker" | "project_manager" | "hq_management" | "executive" | "admin";
  createdAt: Date | null;
  updatedAt: Date | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
  forceLogout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Disable auth check temporarily to fix 401 issues
  const [shouldCheckAuth, setShouldCheckAuth] = useState(false);
  
  // Mock user for production to bypass auth issues - MEMOIZED to prevent recreation
  const mockUser = useMemo(() => ({
    id: "temp-user",
    email: "admin@company.com", 
    name: "관리자",
    password: "",
    positionId: 1,
    phoneNumber: "010-0000-0000",
    profileImageUrl: null,
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date()
  }), []); // Empty dependency array - this value never changes

  // Debug effect to monitor shouldCheckAuth state changes - THROTTLED
  useEffect(() => {
    if (isDevelopmentEnvironment()) {
      const timeout = setTimeout(() => {
        console.log('🔄 shouldCheckAuth changed:', shouldCheckAuth);
      }, 100); // Throttle logging
      return () => clearTimeout(timeout);
    }
  }, [shouldCheckAuth]);

  // FIXED: Re-enable authentication query with proper error handling
  const userQuery = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        // Backend uses httpOnly cookies for JWT authentication
        // No need to manually set Authorization header
        
        const response = await fetch("/api/auth/user", {
          credentials: 'include',
        });
        
        // Silently handle 401 errors - user is not authenticated
        if (response.status === 401) {
          return null;
        }
        
        // Handle other HTTP errors
        if (!response.ok) {
          throw new Error(`Authentication check failed: ${response.status}`);
        }
        
        const userData = await response.json();
        console.log('🟢 useAuth - User authenticated:', {
          id: userData.id,
          name: userData.name,
          role: userData.role
        });
        
        return userData;
      } catch (fetchError: any) {
        // Silently handle network errors that might indicate auth issues
        if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
          return null;
        }
        
        // Re-throw other errors for proper error handling
        throw fetchError;
      }
    },
    enabled: true, // FIXED: Re-enable authentication checking
    retry: 1, // Allow one retry
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Check on mount
    refetchOnReconnect: false,
    refetchInterval: false,
  });
  
  const user = userQuery.data;
  const error = userQuery.error;
  const isLoading = userQuery.isLoading;
  
  // Disabled: Real authentication query - causing persistent 401 errors in production
  const disabledQuery = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: 'include',
        });
        
        // Silently handle 401 errors - user is not authenticated
        if (response.status === 401) {
          // Clear authentication indicators on 401
          localStorage.removeItem('hasAuthenticated');
          sessionStorage.removeItem('userAuthenticated');
          return null;
        }
        
        // Handle other HTTP errors
        if (!response.ok) {
          // Don't log auth errors to console in production
          if (isDevelopmentEnvironment()) {
            console.warn(`Auth query failed with status ${response.status}:`, response.statusText);
          }
          throw new Error(`Authentication check failed: ${response.status}`);
        }
        
        const userData = await response.json();
        
        // Only log in development and throttle to prevent console spam
        if (isDevelopmentEnvironment()) {
          // Use sessionStorage to throttle logging
          const lastLogTime = parseInt(sessionStorage.getItem('authLogTime') || '0');
          const now = Date.now();
          if (now - lastLogTime > 10000) { // Log at most every 10 seconds
            console.log('🔍 useAuth - User authenticated:', {
              id: userData.id,
              name: userData.name,
              role: userData.role
            });
            sessionStorage.setItem('authLogTime', now.toString());
          }
        }
        
        // Set authentication indicators on successful auth
        localStorage.setItem('hasAuthenticated', 'true');
        sessionStorage.setItem('userAuthenticated', 'true');
        
        return userData;
      } catch (fetchError: any) {
        // Clear authentication indicators on network errors
        localStorage.removeItem('hasAuthenticated');
        sessionStorage.removeItem('userAuthenticated');
        
        // Silently handle network errors that might indicate auth issues
        if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
          devWarn('🌐 Network error during auth check, treating as unauthenticated');
          return null;
        }
        
        // Re-throw other errors for proper error handling
        throw fetchError;
      }
    },
    enabled: false, // DISABLED: Completely disabled to prevent 401 errors
    retry: false, // Never retry auth queries to prevent 401 spam
    staleTime: Infinity, // Never consider stale to prevent refetches
    gcTime: Infinity, // Keep cache forever
    refetchOnWindowFocus: false, // Disable window focus refetch
    refetchOnMount: false, // Prevent automatic refetch on mount
    refetchOnReconnect: false, // Disable reconnect refetch
    refetchInterval: false, // No automatic polling
    networkMode: 'offlineFirst', // Prioritize cache over network
    // Add meta for query identification in DevTools
    meta: {
      cacheType: 'MASTER',
      isAuthQuery: true,
    },
  });

  // STABLE LOGIN MUTATION - no query invalidation loops
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      return await response.json();
    },
    onSuccess: (response: any) => {
      // Extract user data from response
      const userData = response.user || response;
      
      // JWT token is stored as httpOnly cookie by backend
      // No need to store in localStorage
      
      // Set the user data directly without invalidating to prevent immediate 401 calls
      queryClient.setQueryData(["/api/auth/user"], userData);
      devLog('✅ Login successful, user data set:', response);
      
      // Set authentication indicators for future sessions
      localStorage.setItem('hasAuthenticated', 'true');
      sessionStorage.setItem('userAuthenticated', 'true');
      
      // Navigate to dashboard
      navigate("/dashboard");
    },
  });

  // STABLE FORCE LOGOUT - memoized to prevent recreation
  const forceLogout = useCallback(async () => {
    console.log("🚪 Starting force logout process");
    
    try {
      // First, immediately set query data to null to prevent further requests
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Clear authentication indicators immediately
      localStorage.removeItem('hasAuthenticated');
      // JWT token cookie is cleared by backend logout endpoint
      sessionStorage.removeItem('userAuthenticated');
      
      // Cancel any outgoing requests to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });
      
      // Call the force logout endpoint for complete cleanup
      const response = await fetch("/api/auth/force-logout", {
        method: "POST",
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.warn("⚠️ Force logout API call failed, but continuing with client-side cleanup");
      } else {
        console.log("✅ Server logout successful");
      }
    } catch (error) {
      console.warn("⚠️ Server logout failed, but continuing with client-side cleanup:", error);
    }
    
    // Clear all React Query caches
    queryClient.clear();
    
    // Force redirect to login page
    navigate("/login");
    
    console.log("✅ Force logout completed");
  }, [queryClient, navigate]); // Stable dependencies

  // STABLE LOGOUT MUTATION - memoized
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("🚪 Starting logout process");
      
      // Immediately set user to null to prevent UI issues
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Clear authentication indicators immediately
      localStorage.removeItem('hasAuthenticated');
      // JWT token cookie is cleared by backend logout endpoint
      sessionStorage.removeItem('userAuthenticated');
      
      // Cancel any pending auth queries to prevent 401 errors
      await queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });
      
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn("⚠️ Regular logout failed, attempting force logout");
        throw new Error("Logout failed");
      }
      
      console.log("✅ Regular logout successful");
      return response.json();
    },
    onSuccess: () => {
      console.log("🧹 Cleaning up after successful logout");
      
      // Clear all caches
      queryClient.clear();
      
      // Navigate to login
      navigate("/login");
    },
    onError: async (error) => {
      console.log("❌ Regular logout failed, attempting force logout:", error);
      
      // If regular logout fails, try force logout
      await forceLogout();
    },
  });

  // MEMOIZED CONTEXT VALUE to prevent provider recreation
  const contextValue = useMemo(() => ({
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
    loginMutation,
    logoutMutation,
    forceLogout,
  }), [user, isLoading, error, loginMutation, logoutMutation, forceLogout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AuthProvider, useAuth };