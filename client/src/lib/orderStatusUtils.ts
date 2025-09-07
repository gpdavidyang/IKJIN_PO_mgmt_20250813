/**
 * Extended Order Status Utilities
 * Provides enhanced status handling with dark mode support
 */

import { getStatusText as getBaseStatusText, getStatusColor as getBaseStatusColor } from './statusUtils';

/**
 * Get enhanced status color with dark mode and border support
 */
export const getEnhancedStatusColor = (status: string): string => {
  const baseColor = getBaseStatusColor(status);
  
  // Map base colors to enhanced versions with dark mode support
  const colorEnhancementMap: { [key: string]: string } = {
    'bg-gray-100 text-gray-800': 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50',
    'bg-yellow-100 text-yellow-800': 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/25 dark:text-yellow-200 dark:border-yellow-400/50',
    'bg-blue-100 text-blue-800': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400/50',
    'bg-red-100 text-red-800': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/25 dark:text-red-200 dark:border-red-400/50',
    'bg-purple-100 text-purple-800': 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/25 dark:text-indigo-200 dark:border-indigo-400/50',
    'bg-green-100 text-green-800': 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-200 dark:border-green-400/50'
  };
  
  return colorEnhancementMap[baseColor] || colorEnhancementMap['bg-gray-100 text-gray-800'];
};

/**
 * Get order-specific status text
 * Handles special cases for order context
 */
export const getOrderStatusText = (status: string): string => {
  // Special mappings for order context
  if (status === 'sent') return '발주완료';
  if (status === 'delivered') return '납품완료';
  if (status === 'completed') return '납품완료'; // Legacy support
  
  return getBaseStatusText(status) || '-';
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