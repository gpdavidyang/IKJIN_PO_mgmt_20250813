import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { hasMinimumRole, hasPermission, hasAnyRole } from "@/utils/auth-helpers";
import type { UserRole } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldOff } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  // 최소 요구 역할
  minimumRole?: UserRole;
  // 필요한 권한
  requiredPermission?: keyof typeof import("@/utils/auth-helpers").ROLE_PERMISSIONS.admin;
  // 허용된 역할 목록
  allowedRoles?: UserRole[];
  // 로그인 페이지로 리다이렉트할지 여부
  redirectToLogin?: boolean;
  // 접근 거부 시 보여줄 메시지
  deniedMessage?: string;
}

export function ProtectedRoute({
  children,
  minimumRole,
  requiredPermission,
  allowedRoles,
  redirectToLogin = true,
  deniedMessage = "이 페이지에 접근할 권한이 없습니다.",
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated || !user) {
    if (redirectToLogin) {
      return <Redirect to="/login" />;
    }
    return (
      <div className="container mx-auto p-6">
        <Alert className="max-w-md mx-auto">
          <ShieldOff className="h-4 w-4" />
          <AlertDescription>
            로그인이 필요한 페이지입니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 비활성화된 사용자
  if (!user.isActive) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="max-w-md mx-auto" variant="destructive">
          <ShieldOff className="h-4 w-4" />
          <AlertDescription>
            계정이 비활성화되었습니다. 관리자에게 문의하세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 권한 검사
  let hasAccess = true;

  if (minimumRole) {
    hasAccess = hasAccess && hasMinimumRole(user.role, minimumRole);
  }

  if (requiredPermission) {
    hasAccess = hasAccess && hasPermission(user.role, requiredPermission);
  }

  if (allowedRoles && allowedRoles.length > 0) {
    hasAccess = hasAccess && hasAnyRole(user.role, allowedRoles);
  }

  // 접근 권한이 없는 경우
  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="max-w-md mx-auto" variant="destructive">
          <ShieldOff className="h-4 w-4" />
          <AlertDescription>{deniedMessage}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 권한이 있는 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
}