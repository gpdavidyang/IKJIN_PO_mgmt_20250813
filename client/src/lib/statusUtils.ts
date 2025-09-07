// 발주서 상태 관리 유틸리티 함수들
// STATUS_MANAGEMENT.md 문서 기준으로 발주상태와 승인상태 분리

// ========== 발주상태 (Order Status) 관련 함수 ==========

export type OrderStatus = 'draft' | 'created' | 'sent' | 'delivered';

export const getOrderStatusText = (orderStatus: OrderStatus): string => {
  switch (orderStatus) {
    case "draft":
      return "임시저장";
    case "created":
      return "발주생성";
    case "sent":
      return "발주완료";
    case "delivered":
      return "납품완료";
    default:
      return orderStatus;
  }
};

export const getOrderStatusColor = (orderStatus: OrderStatus): string => {
  switch (orderStatus) {
    case "draft":
      return "bg-gray-100 text-gray-800 border-gray-300";
    case "created":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "sent":
      return "bg-purple-100 text-purple-800 border-purple-300";
    case "delivered":
      return "bg-green-100 text-green-800 border-green-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

// ========== 승인상태 (Approval Status) 관련 함수 ==========

export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export const getApprovalStatusText = (approvalStatus: ApprovalStatus): string => {
  switch (approvalStatus) {
    case "not_required":
      return "승인불필요";
    case "pending":
      return "승인대기";
    case "approved":
      return "승인완료";
    case "rejected":
      return "반려";
    default:
      return approvalStatus;
  }
};

export const getApprovalStatusColor = (approvalStatus: ApprovalStatus): string => {
  switch (approvalStatus) {
    case "not_required":
      return "bg-gray-50 text-gray-600 border-gray-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "approved":
      return "bg-green-100 text-green-800 border-green-300";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

// ========== 통합 표시 함수 ==========

export const getDisplayStatus = (orderStatus: OrderStatus, approvalStatus: ApprovalStatus): string => {
  // 승인 대기/반려인 경우 승인상태 우선 표시
  if (approvalStatus === 'pending') return getApprovalStatusText(approvalStatus);
  if (approvalStatus === 'rejected') return getApprovalStatusText(approvalStatus);
  
  // 그 외의 경우 발주상태 표시
  return getOrderStatusText(orderStatus);
};

export const getDisplayStatusColor = (orderStatus: OrderStatus, approvalStatus: ApprovalStatus): string => {
  // 승인 대기/반려인 경우 승인상태 색상 우선 표시
  if (approvalStatus === 'pending') return getApprovalStatusColor(approvalStatus);
  if (approvalStatus === 'rejected') return getApprovalStatusColor(approvalStatus);
  
  // 그 외의 경우 발주상태 색상 표시
  return getOrderStatusColor(orderStatus);
};

// ========== 비즈니스 로직 함수 ==========

export const canEditOrder = (orderStatus: OrderStatus, approvalStatus: ApprovalStatus): boolean => {
  return orderStatus === 'draft' || 
         (orderStatus === 'created' && approvalStatus !== 'pending');
};

export const canSendEmail = (orderStatus: OrderStatus, approvalStatus: ApprovalStatus): boolean => {
  return orderStatus === 'created' && 
         (approvalStatus === 'approved' || approvalStatus === 'not_required');
};

export const canViewEmailHistory = (orderStatus: OrderStatus): boolean => {
  // Allow viewing email history for created, sent, and delivered orders
  // as emails can be sent from any of these states
  return orderStatus === 'created' || orderStatus === 'sent' || orderStatus === 'delivered';
};

export const canApproveOrder = (approvalStatus: ApprovalStatus, userRole?: string): boolean => {
  return approvalStatus === 'pending' && userRole === 'admin';
};

export const canCompleteDelivery = (orderStatus: OrderStatus, approvalStatus: ApprovalStatus): boolean => {
  return (orderStatus === 'created' || orderStatus === 'sent') && 
         (approvalStatus === 'approved' || approvalStatus === 'not_required');
};

export const canGeneratePDF = (orderStatus: OrderStatus): boolean => {
  return orderStatus === 'created' || orderStatus === 'sent' || orderStatus === 'delivered';
};

// ========== DEPRECATED 함수들 (하위 호환성을 위해 유지) ==========

/**
 * @deprecated 발주상태와 승인상태가 혼재된 함수입니다. 
 * getOrderStatusText() 또는 getApprovalStatusText()를 사용하세요.
 */
export const getStatusText = (status: string): string => {
  console.warn('getStatusText() is deprecated. Use getOrderStatusText() or getApprovalStatusText() instead.');
  
  // 발주상태 값들
  if (['draft', 'created', 'sent', 'delivered'].includes(status)) {
    return getOrderStatusText(status as OrderStatus);
  }
  
  // 승인상태 값들
  if (['not_required', 'pending', 'approved', 'rejected'].includes(status)) {
    return getApprovalStatusText(status as ApprovalStatus);
  }
  
  // 레거시 값들
  switch (status) {
    case "completed":
      return "발주완료"; // sent와 동일
    default:
      return status;
  }
};

/**
 * @deprecated 발주상태와 승인상태가 혼재된 함수입니다. 
 * getOrderStatusColor() 또는 getApprovalStatusColor()를 사용하세요.
 */
export const getStatusColor = (status: string): string => {
  console.warn('getStatusColor() is deprecated. Use getOrderStatusColor() or getApprovalStatusColor() instead.');
  
  // 발주상태 값들
  if (['draft', 'created', 'sent', 'delivered'].includes(status)) {
    return getOrderStatusColor(status as OrderStatus);
  }
  
  // 승인상태 값들  
  if (['not_required', 'pending', 'approved', 'rejected'].includes(status)) {
    return getApprovalStatusColor(status as ApprovalStatus);
  }
  
  // 레거시 값들
  switch (status) {
    case "completed":
      return "bg-purple-100 text-purple-800 border-purple-300"; // sent와 동일
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

// ========== 기타 유틸리티 함수들 ==========

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