/**
 * Data transformation utilities
 * Handles conversion between different data formats and structures
 */

/**
 * Format Korean Won currency
 */
export function formatKoreanWon(amount: number | null | undefined): string {
  if (amount == null) return '₩0';
  return `₩${amount.toLocaleString('ko-KR')}`;
}

/**
 * Parse Korean Won string to number
 */
export function parseKoreanWon(wonString: string): number {
  if (!wonString) return 0;
  // Remove currency symbol and commas, then parse
  const cleaned = wonString.replace(/[₩,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format date for Korean locale
 */
export function formatKoreanDate(date: Date | string | null): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('ko-KR');
}

/**
 * Format date and time for Korean locale
 */
export function formatKoreanDateTime(date: Date | string | null): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('ko-KR');
}

/**
 * Convert order status to Korean display text
 */
export function getOrderStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': '작성중',
    'pending': '승인 대기중',
    'approved': '승인 완료',
    'sent': '발주 완료',
    'completed': '완료',
  };
  return statusMap[status] || status;
}

/**
 * Convert user role to Korean display text
 */
export function getUserRoleText(role: string): string {
  const roleMap: Record<string, string> = {
    'field_worker': '현장 실무자',
    'project_manager': '현장 관리자',
    'hq_management': '본사 관리부',
    'executive': '임원/대표',
    'admin': '시스템 관리자',
  };
  return roleMap[role] || role;
}

/**
 * Convert approval action to Korean text
 */
export function getApprovalActionText(action: string): string {
  const actionMap: Record<string, string> = {
    'submitted': '승인 요청',
    'approved': '승인',
    'rejected': '반려',
    'cancelled': '취소',
  };
  return actionMap[action] || action;
}

/**
 * Calculate order item total amount
 */
export function calculateItemTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice);
}

/**
 * Calculate order total from items
 */
export function calculateOrderTotal(items: Array<{ quantity: number; unitPrice: number }>): number {
  return items.reduce((total, item) => {
    return total + calculateItemTotal(item.quantity, item.unitPrice);
  }, 0);
}

/**
 * Sanitize and truncate text for display
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate file size display text
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Convert Excel data to order items format
 */
export function convertExcelToOrderItems(excelData: any[]): Array<{
  itemName: string;
  specification: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
}> {
  return excelData.map(row => ({
    itemName: row['품목명'] || row['Item Name'] || '',
    specification: row['규격'] || row['Specification'] || '',
    quantity: parseInt(row['수량'] || row['Quantity'] || '1'),
    unitPrice: parseFloat(row['단가'] || row['Unit Price'] || '0'),
    totalAmount: parseInt(row['수량'] || '1') * parseFloat(row['단가'] || '0'),
    notes: row['비고'] || row['Notes'] || '',
  }));
}

/**
 * Validate and normalize phone number
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as 010-XXXX-XXXX
  if (digits.length === 11 && digits.startsWith('010')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  
  return phone; // Return original if can't normalize
}

/**
 * Generate display name for file attachments
 */
export function getAttachmentDisplayName(originalName: string, uploadedAt: Date): string {
  const date = formatKoreanDate(uploadedAt);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  
  return `${truncateText(nameWithoutExt, 30)}_${date}.${extension}`;
}

/**
 * Convert object to query string for URLs
 */
export function objectToQueryString(obj: Record<string, any>): string {
  const params = new URLSearchParams();
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });
  
  return params.toString();
}

/**
 * Parse query string to object
 */
export function queryStringToObject(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}