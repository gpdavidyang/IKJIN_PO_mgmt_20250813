// 발주서 상태 유틸리티 함수들

export const getStatusText = (status: string): string => {
  switch (status) {
    case "draft":
      return "임시저장";
    case "pending":
      return "승인대기";
    case "approved":
      return "승인완료";
    case "sent":
      return "발송됨";
    case "completed":
      return "발주완료";
    case "rejected":
      return "반려";
    default:
      return status;
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "approved":
      return "bg-blue-100 text-blue-800";
    case "sent":
      return "bg-purple-100 text-purple-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getUserInitials = (user: { name?: string; firstName?: string; email?: string }): string => {
  // Use single name field first, fallback to firstName for backward compatibility
  if (user?.name) {
    return user.name.substring(0, 2);
  }
  if (user?.firstName) {
    return user.firstName.substring(0, 2);
  }
  return user?.email?.[0]?.toUpperCase() || "U";
};

export const getUserDisplayName = (user: { name?: string; firstName?: string; lastName?: string; email?: string }): string => {
  // Use single name field first (matches database schema)
  if (user?.name) {
    return user.name;
  }
  // Fallback to firstName/lastName for backward compatibility
  if (user?.firstName || user?.lastName) {
    return `${user.lastName || ""} ${user.firstName || ""}`.trim();
  }
  return user?.email || "";
};

export const getRoleText = (role: string): string => {
  const roleMap: Record<string, string> = {
    "admin": "관리자",
    "orderer": "발주자",
    "manager": "관리자",
    "user": "사용자",
    "order_manager": "발주관리자"
  };
  return roleMap[role] || role;
};