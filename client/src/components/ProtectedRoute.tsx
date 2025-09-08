import { useAuth } from "@/hooks/useAuth";
import { Loader2, Shield } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

interface AdminRouteProps {
  children: React.ReactNode;
}

interface SystemManagementRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login
    window.location.href = "/login";
    return null;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login
    window.location.href = "/login";
    return null;
  }

  if (user.role !== 'admin') {
    // Show access denied page for non-admin users
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4 p-8">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">접근 권한이 없습니다</h1>
          <p className="text-gray-600 max-w-md">
            이 페이지는 시스템 관리자만 접근할 수 있습니다. 
            관리자 권한이 필요한 경우 시스템 관리자에게 문의하세요.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// System Management Route - Admin, Executive, HQ Management만 접근 가능
export function SystemManagementRoute({ children }: SystemManagementRouteProps) {
  const { user, isLoading } = useAuth();
  const allowedRoles = ['admin', 'executive', 'hq_management'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login
    window.location.href = "/login";
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    // Show access denied page for unauthorized users
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4 p-8">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">접근 권한이 없습니다</h1>
          <p className="text-gray-600 max-w-md">
            이 페이지는 시스템 관리 권한이 있는 사용자만 접근할 수 있습니다.
            <br />
            (관리자, 임원, 본사 관리자)
          </p>
          <div className="text-sm text-gray-500">
            현재 역할: <span className="font-medium">{getRoleDisplayName(user.role)}</span>
          </div>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Helper function to display role names in Korean
function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    'admin': '시스템 관리자',
    'executive': '임원',
    'hq_management': '본사 관리자',
    'project_manager': '현장 소장',
    'field_worker': '현장 작업자'
  };
  return roleNames[role] || role;
}