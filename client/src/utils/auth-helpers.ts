import type { UserRole } from "@/hooks/useAuth";

// 역할 계층 구조 정의 (낮은 숫자 = 높은 권한)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 0,
  executive: 1,
  hq_management: 2,
  project_manager: 3,
  field_worker: 4,
};

// 역할별 권한 정의
export const ROLE_PERMISSIONS = {
  // 관리자: 모든 권한
  admin: {
    canManageUsers: true,
    canManageVendors: true,
    canManageProjects: true,
    canApproveOrders: true,
    canViewAllOrders: true,
    canEditAllOrders: true,
    canDeleteOrders: true,
    canViewDashboard: true,
    canManageSettings: true,
    canViewEmailHistory: true,
    canExportData: true,
  },
  // 임원: 승인 및 조회 권한
  executive: {
    canManageUsers: false,
    canManageVendors: false,
    canManageProjects: false,
    canApproveOrders: true,
    canViewAllOrders: true,
    canEditAllOrders: false,
    canDeleteOrders: false,
    canViewDashboard: true,
    canManageSettings: false,
    canViewEmailHistory: true,
    canExportData: true,
  },
  // 본사 관리: 관리 및 승인 권한
  hq_management: {
    canManageUsers: false,
    canManageVendors: true,
    canManageProjects: true,
    canApproveOrders: true,
    canViewAllOrders: true,
    canEditAllOrders: true,
    canDeleteOrders: false,
    canViewDashboard: true,
    canManageSettings: false,
    canViewEmailHistory: true,
    canExportData: true,
  },
  // 프로젝트 관리자: 프로젝트 관련 권한
  project_manager: {
    canManageUsers: false,
    canManageVendors: false,
    canManageProjects: true,
    canApproveOrders: false,
    canViewAllOrders: false,
    canEditAllOrders: false,
    canDeleteOrders: false,
    canViewDashboard: true,
    canManageSettings: false,
    canViewEmailHistory: false,
    canExportData: true,
  },
  // 현장 작업자: 기본 권한
  field_worker: {
    canManageUsers: false,
    canManageVendors: false,
    canManageProjects: false,
    canApproveOrders: false,
    canViewAllOrders: false,
    canEditAllOrders: false,
    canDeleteOrders: false,
    canViewDashboard: false,
    canManageSettings: false,
    canViewEmailHistory: false,
    canExportData: false,
  },
} as const;

// 사용자가 특정 역할 이상인지 확인
export function hasMinimumRole(userRole: UserRole | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] <= ROLE_HIERARCHY[requiredRole];
}

// 사용자가 특정 권한을 가지고 있는지 확인
export function hasPermission(
  userRole: UserRole | undefined,
  permission: keyof typeof ROLE_PERMISSIONS.admin
): boolean {
  if (!userRole) return false;
  return ROLE_PERMISSIONS[userRole][permission] ?? false;
}

// 여러 역할 중 하나라도 만족하는지 확인
export function hasAnyRole(userRole: UserRole | undefined, roles: UserRole[]): boolean {
  if (!userRole) return false;
  return roles.includes(userRole);
}

// 주문 관리자 역할 확인 (admin, executive, hq_management)
export function isOrderManager(userRole: UserRole | undefined): boolean {
  return hasAnyRole(userRole, ["admin", "executive", "hq_management"]);
}

// 관리자 역할 확인
export function isAdmin(userRole: UserRole | undefined): boolean {
  return userRole === "admin";
}

// 역할 한글명 반환
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: "관리자",
    executive: "임원",
    hq_management: "본사 관리",
    project_manager: "프로젝트 관리자",
    field_worker: "현장 작업자",
  };
  return roleNames[role] || role;
}

// 역할별 색상 반환 (UI용)
export function getRoleColor(role: UserRole): string {
  const roleColors: Record<UserRole, string> = {
    admin: "text-red-600 bg-red-50",
    executive: "text-purple-600 bg-purple-50",
    hq_management: "text-blue-600 bg-blue-50",
    project_manager: "text-green-600 bg-green-50",
    field_worker: "text-gray-600 bg-gray-50",
  };
  return roleColors[role] || "text-gray-600 bg-gray-50";
}