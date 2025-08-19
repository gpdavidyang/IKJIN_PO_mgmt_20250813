import { createContext, ReactNode, useContext, useCallback, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isDevelopmentEnvironment, devLog, devWarn } from "@/utils/environment";

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

  // Production-safe authentication check using React state
  const [shouldCheckAuth, setShouldCheckAuth] = useState(() => {
    // Always start with false in production to prevent immediate auth calls
    if (!isDevelopmentEnvironment()) {
      devLog('🏭 Production mode: Starting with auth checking disabled');
      return false;
    }
    
    // In development, always enable but still check session indicators for logging
    try {
      const hasSession = document.cookie.includes('connect.sid') || 
                        document.cookie.includes('session') ||
                        localStorage.getItem('hasAuthenticated') === 'true' ||
                        sessionStorage.getItem('userAuthenticated') === 'true';
      
      devLog('🔧 Development mode: Auth checking enabled', { hasSession });
      return true; // Always return true in development
    } catch {
      devWarn('🔧 Development mode: Error checking session, defaulting to enabled');
      return true; // Always return true in development even on error
    }
  });

  // Dynamic session monitoring effect
  useEffect(() => {
    const checkAuthIndicators = () => {
      // In development, always keep auth checking enabled
      if (isDevelopmentEnvironment()) {
        if (!shouldCheckAuth) {
          setShouldCheckAuth(true);
          devLog('🔧 Development mode: Ensuring auth checking remains enabled');
        }
        return;
      }

      // In production, check for session indicators
      try {
        const hasSessionCookie = document.cookie.includes('connect.sid') || 
                                 document.cookie.includes('session');
        const hasLocalIndicator = localStorage.getItem('hasAuthenticated') === 'true';
        const hasSessionIndicator = sessionStorage.getItem('userAuthenticated') === 'true';
        
        const shouldCheck = hasSessionCookie || hasLocalIndicator || hasSessionIndicator;
        
        devLog('🔍 Production session check:', {
          hasSessionCookie,
          hasLocalIndicator, 
          hasSessionIndicator,
          shouldCheck,
          currentState: shouldCheckAuth
        });
        
        if (shouldCheck !== shouldCheckAuth) {
          setShouldCheckAuth(shouldCheck);
          devLog(`📊 Auth checking ${shouldCheck ? 'enabled' : 'disabled'} in production`);
        }
      } catch (error) {
        devWarn('Error checking auth indicators:', error);
        if (shouldCheckAuth) {
          setShouldCheckAuth(false);
          devLog('🚫 Auth checking disabled due to error');
        }
      }
    };

    // Initial check after component mount
    checkAuthIndicators();

    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hasAuthenticated' || e.key === 'userAuthenticated') {
        devLog('🔄 Storage change detected, rechecking auth indicators');
        checkAuthIndicators();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Check periodically for cookie changes (since there's no cookie change event)
    const interval = setInterval(checkAuthIndicators, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
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
          if (isDevelopment()) {
            console.warn(`Auth query failed with status ${response.status}:`, response.statusText);
          }
          throw new Error(`Authentication check failed: ${response.status}`);
        }
        
        const userData = await response.json();
        if (isDevelopment()) {
          console.log('🔍 useAuth - Fetched user data:', userData);
          console.log('🌍 Environment:', { isDev: isDevelopment(), isProd: isProduction(), isServerless: isServerless() });
          console.log('🔑 Auth indicators:', {
            hasSessionCookie: document.cookie.includes('connect.sid') || document.cookie.includes('session'),
            hasLocalAuth: localStorage.getItem('hasAuthenticated') === 'true',
            hasSessionAuth: sessionStorage.getItem('userAuthenticated') === 'true',
            shouldCheckAuth
          });
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
    enabled: shouldCheckAuth, // Only run query when session indicators are present
    retry: false, // Never retry auth queries to prevent 401 spam
    staleTime: 1000 * 60 * 5, // 5 minutes - prevent excessive polling
    refetchOnWindowFocus: false, // Disable window focus refetch to prevent 401 spam
    refetchOnMount: false, // Prevent automatic refetch on mount
    refetchOnReconnect: false, // Disable reconnect refetch during logout
    refetchInterval: false, // No automatic polling for auth
    // Add meta for query identification in DevTools
    meta: {
      cacheType: 'MASTER',
      isAuthQuery: true,
    },
  });

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
    onSuccess: (user: User) => {
      // Set the user data directly without invalidating to prevent immediate 401 calls
      queryClient.setQueryData(["/api/auth/user"], user);
      devLog('✅ Login successful, user data set:', user);
      
      // Set authentication indicators for future sessions
      localStorage.setItem('hasAuthenticated', 'true');
      sessionStorage.setItem('userAuthenticated', 'true');
      
      // Enable auth checking after successful login (especially important in production)
      if (!shouldCheckAuth) {
        setShouldCheckAuth(true);
        devLog('🔓 Auth checking enabled after successful login');
      }
      
      // Clear any other queries to ensure fresh data on next access
      queryClient.removeQueries({ queryKey: ["/api/auth/user"], exact: false });
      queryClient.setQueryData(["/api/auth/user"], user); // Ensure user data remains set
    },
  });

  const forceLogout = useCallback(async () => {
    console.log("🚪 Starting force logout process");
    
    try {
      // First, immediately set query data to null to prevent further requests
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Clear authentication indicators immediately
      localStorage.removeItem('hasAuthenticated');
      sessionStorage.removeItem('userAuthenticated');
      
      // Disable auth checking on logout (especially important in production)
      if (shouldCheckAuth && !isDevelopmentEnvironment()) {
        setShouldCheckAuth(false);
        devLog('🔒 Auth checking disabled after logout');
      }
      
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
  }, [queryClient, navigate]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("🚪 Starting logout process");
      
      // Immediately set user to null to prevent UI issues
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Clear authentication indicators immediately
      localStorage.removeItem('hasAuthenticated');
      sessionStorage.removeItem('userAuthenticated');
      
      // Disable auth checking on logout (especially important in production)
      if (shouldCheckAuth && !isDevelopmentEnvironment()) {
        setShouldCheckAuth(false);
        devLog('🔒 Auth checking disabled after logout');
      }
      
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

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        error,
        loginMutation,
        logoutMutation,
        forceLogout,
      }}
    >
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