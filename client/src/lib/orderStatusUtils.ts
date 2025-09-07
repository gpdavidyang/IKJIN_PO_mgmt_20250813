/**
 * Extended Order Status Utilities
 * Provides enhanced status handling with dark mode support
 */

// No imports needed - this is now a self-contained utility

/**
 * Get enhanced status color with dark mode and border support
 */
export const getEnhancedStatusColor = (status: string): string => {
  // Direct status to enhanced color mapping for consistency
  const statusColorMap: { [key: string]: string } = {
    'draft': 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50',
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/25 dark:text-yellow-200 dark:border-yellow-400/50',
    'approved': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400/50',
    'created': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400/50',
    'sent': 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/25 dark:text-indigo-200 dark:border-indigo-400/50',
    'delivered': 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-200 dark:border-green-400/50',
    'completed': 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-200 dark:border-green-400/50',
    'rejected': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/25 dark:text-red-200 dark:border-red-400/50'
  };
  
  return statusColorMap[status] || statusColorMap['draft']; // Default to draft color
};

/**
 * Get order-specific status text
 * Handles special cases for order context
 */
export const getOrderStatusText = (status: string): string => {
  // Complete mappings for order context - consistent with dashboard requirements
  const orderStatusMap: { [key: string]: string } = {
    'draft': '임시저장',
    'pending': '승인대기', 
    'approved': '승인완료',
    'created': '발주생성',
    'sent': '발주완료',
    'delivered': '납품완료',
    'completed': '납품완료', // Legacy support
    'rejected': '반려'
  };
  
  return orderStatusMap[status] || status || '-';
};

/**
 * Get approval status text
 */
export const getApprovalStatusText = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'not_required': '승인불필요',
    'pending': '승인대기',
    'approved': '승인완료',
    'rejected': '반려'
  };
  
  return statusMap[status] || status || '-';
};

/**
 * Get approval status color
 */
export const getApprovalStatusColor = (status: string): string => {
  // Map approval statuses to base statuses for color consistency
  const mappedStatus = status === 'not_required' ? 'draft' : status;
  return getEnhancedStatusColor(mappedStatus);
};

/**
 * Check if order can show PDF button
 */
export const canShowPDF = (order: { orderStatus?: string; status?: string }): boolean => {
  const currentStatus = order.orderStatus || order.status;
  
  if (order.orderStatus) {
    return order.orderStatus !== 'draft' && ['created', 'sent', 'delivered'].includes(order.orderStatus);
  }
  
  return currentStatus !== 'draft' && ['approved', 'sent', 'completed'].includes(currentStatus || '');
};

/**
 * Check if order can be edited
 */
export const canEditOrder = (order: { orderStatus?: string; status?: string }): boolean => {
  if (order.orderStatus) {
    return order.orderStatus === 'draft' || order.orderStatus === 'created';
  }
  
  return !order.orderStatus && order.status !== 'sent' && order.status !== 'delivered';
};

/**
 * Check if order can send email
 */
export const canSendEmail = (order: { orderStatus?: string; status?: string }): boolean => {
  if (order.orderStatus === 'created') return true;
  
  return !order.orderStatus && order.status === 'approved';
};

/**
 * Check if order can show email history
 */
export const canShowEmailHistory = (order: { orderStatus?: string; status?: string }): boolean => {
  if (order.orderStatus === 'sent' || order.orderStatus === 'delivered') return true;
  
  return !order.orderStatus && (
    order.status === 'sent' || 
    order.status === 'delivered' || 
    order.status === 'completed'
  );
};