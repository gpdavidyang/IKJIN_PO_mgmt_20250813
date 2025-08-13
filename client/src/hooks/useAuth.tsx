import { createContext, ReactNode, useContext, useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocation } from "wouter";

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

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user", {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error("Failed to get user");
      }
      
      const userData = await response.json();
      console.log('🔍 useAuth - Fetched user data:', userData);
      return userData;
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes - prevent excessive polling
    refetchOnWindowFocus: false, // Disable window focus refetch to prevent 401 spam
    refetchOnMount: true,
    refetchOnReconnect: false, // Disable reconnect refetch during logout
    refetchInterval: false,
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
      queryClient.setQueryData(["/api/auth/user"], user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const forceLogout = useCallback(async () => {
    console.log("🚪 Starting force logout process");
    
    try {
      // First, immediately set query data to null to prevent further requests
      queryClient.setQueryData(["/api/auth/user"], null);
      
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