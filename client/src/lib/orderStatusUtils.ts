/**
 * Enhanced Order Status Utilities
 * STATUS_MANAGEMENT.md 문서 기준에 따른 다크모드 지원 및 고급 상태 관리
 */

import { 
  OrderStatus, 
  ApprovalStatus, 
  getOrderStatusText as getOrderStatusTextBase,
  getApprovalStatusText as getApprovalStatusTextBase,
  canEditOrder as canEditOrderBase,
  canSendEmail as canSendEmailBase,
  canViewEmailHistory as canViewEmailHistoryBase,
  canGeneratePDF as canGeneratePDFBase,
  canApproveOrder as canApproveOrderBase,
  canCompleteDelivery as canCompleteDeliveryBase
} from './statusUtils';

// ========== 향상된 다크모드 지원 색상 함수 ==========

/**
 * 발주상태용 다크모드 지원 색상
 */
export const getEnhancedOrderStatusColor = (orderStatus: OrderStatus): string => {
  const colorMap: { [key in OrderStatus]: string } = {
    'draft': 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50',
    'created': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400/50',
    'sent': 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/25 dark:text-indigo-200 dark:border-indigo-400/50',
    'delivered': 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-200 dark:border-green-400/50'
  };
  
  return colorMap[orderStatus] || colorMap['draft'];
};

/**
 * 승인상태용 다크모드 지원 색상
 */
export const getEnhancedApprovalStatusColor = (approvalStatus: ApprovalStatus): string => {
  const colorMap: { [key in ApprovalStatus]: string } = {
    'not_required': 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-500/15 dark:text-gray-300 dark:border-gray-400/30',
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/25 dark:text-yellow-200 dark:border-yellow-400/50',
    'approved': 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-200 dark:border-green-400/50',
    'rejected': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/25 dark:text-red-200 dark:border-red-400/50'
  };
  
  return colorMap[approvalStatus] || colorMap['not_required'];
};

/**
 * 통합 표시용 다크모드 지원 색상
 */
export const getEnhancedDisplayStatusColor = (orderStatus: OrderStatus, approvalStatus: ApprovalStatus): string => {
  // 승인 대기/반려인 경우 승인상태 색상 우선 표시
  if (approvalStatus === 'pending') return getEnhancedApprovalStatusColor(approvalStatus);
  if (approvalStatus === 'rejected') return getEnhancedApprovalStatusColor(approvalStatus);
  
  // 그 외의 경우 발주상태 색상 표시
  return getEnhancedOrderStatusColor(orderStatus);
};

// ========== 타입 안전 Wrapper 함수들 ==========

type OrderWithStatuses = {
  orderStatus?: OrderStatus | string;
  approvalStatus?: ApprovalStatus | string;
  status?: string; // deprecated field
};

/**
 * 발주상태 텍스트 (다크모드 컨텍스트 고려)
 */
export const getOrderStatusText = (status: string): string => {
  return getOrderStatusTextBase(status as OrderStatus);
};

/**
 * 승인상태 텍스트 (다크모드 컨텍스트 고려) 
 */
export const getApprovalStatusText = (status: string): string => {
  return getApprovalStatusTextBase(status as ApprovalStatus);
};

// ========== 고급 비즈니스 로직 함수들 ==========

/**
 * PDF 보기 가능 여부 (레거시 호환성 포함)
 */
export const canShowPDF = (order: OrderWithStatuses): boolean => {
  if (order.orderStatus) {
    return canGeneratePDFBase(order.orderStatus as OrderStatus);
  }
  
  // 레거시 status 필드 지원
  const legacyStatus = order.status;
  if (legacyStatus) {
    return legacyStatus !== 'draft' && ['approved', 'sent', 'completed', 'delivered'].includes(legacyStatus);
  }
  
  return false;
};

/**
 * 주문 편집 가능 여부 (레거시 호환성 포함)
 */
export const canEditOrder = (order: OrderWithStatuses): boolean => {
  if (order.orderStatus && order.approvalStatus) {
    return canEditOrderBase(
      order.orderStatus as OrderStatus, 
      order.approvalStatus as ApprovalStatus
    );
  }
  
  // 레거시 status 필드 지원
  if (order.status) {
    return order.status !== 'sent' && order.status !== 'delivered' && order.status !== 'completed';
  }
  
  return false;
};

/**
 * 이메일 발송 가능 여부 (레거시 호환성 포함)
 */
export const canSendEmail = (order: OrderWithStatuses): boolean => {
  if (order.orderStatus && order.approvalStatus) {
    return canSendEmailBase(
      order.orderStatus as OrderStatus, 
      order.approvalStatus as ApprovalStatus
    );
  }
  
  // 레거시 status 필드 지원
  if (order.status) {
    return order.status === 'approved' || order.status === 'created';
  }
  
  return false;
};

/**
 * 이메일 기록 조회 가능 여부 (레거시 호환성 포함)
 */
export const canShowEmailHistory = (order: OrderWithStatuses): boolean => {
  if (order.orderStatus) {
    return canViewEmailHistoryBase(order.orderStatus as OrderStatus);
  }
  
  // 레거시 status 필드 지원
  if (order.status) {
    return ['sent', 'delivered', 'completed'].includes(order.status);
  }
  
  return false;
};

/**
 * 승인 가능 여부
 */
export const canApprove = (order: OrderWithStatuses, userRole?: string): boolean => {
  if (order.approvalStatus) {
    return canApproveOrderBase(order.approvalStatus as ApprovalStatus, userRole);
  }
  
  // 레거시 status 필드 지원
  if (order.status) {
    return order.status === 'pending' && userRole === 'admin';
  }
  
  return false;
};

/**
 * 납품완료 처리 가능 여부
 */
export const canCompleteDelivery = (order: OrderWithStatuses): boolean => {
  if (order.orderStatus && order.approvalStatus) {
    return canCompleteDeliveryBase(
      order.orderStatus as OrderStatus, 
      order.approvalStatus as ApprovalStatus
    );
  }
  
  // 레거시 status 필드 지원
  if (order.status) {
    return ['approved', 'sent', 'created'].includes(order.status);
  }
  
  return false;
};

// ========== DEPRECATED 함수들 (하위 호환성을 위해 유지) ==========

/**
 * @deprecated 발주상태와 승인상태가 혼재된 함수입니다. 
 * getEnhancedOrderStatusColor() 또는 getEnhancedApprovalStatusColor()를 사용하세요.
 */
export const getEnhancedStatusColor = (status: string): string => {
  console.warn('getEnhancedStatusColor() is deprecated. Use getEnhancedOrderStatusColor() or getEnhancedApprovalStatusColor() instead.');
  
  // 발주상태 값들
  if (['draft', 'created', 'sent', 'delivered'].includes(status)) {
    return getEnhancedOrderStatusColor(status as OrderStatus);
  }
  
  // 승인상태 값들  
  if (['not_required', 'pending', 'approved', 'rejected'].includes(status)) {
    return getEnhancedApprovalStatusColor(status as ApprovalStatus);
  }
  
  // 레거시 값들
  const statusColorMap: { [key: string]: string } = {
    'completed': 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/25 dark:text-indigo-200 dark:border-indigo-400/50'
  };
  
  return statusColorMap[status] || getEnhancedOrderStatusColor('draft');
};