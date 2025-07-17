/**
 * Type guards for runtime type safety
 */

import { 
  User, 
  Project, 
  Vendor, 
  Item, 
  PurchaseOrder, 
  Invoice, 
  ApiResponse,
  OrderItem,
  OrderStatus,
  ProjectStatus,
  UserRole,
  InvoiceStatus
} from '@/types/api';

// Type guards for API responses
export function isApiSuccessResponse<T>(response: any): response is { success: true; data: T } {
  return response && typeof response === 'object' && response.success === true && 'data' in response;
}

export function isApiErrorResponse(response: any): response is { success: false; error: string } {
  return response && typeof response === 'object' && response.success === false && 'error' in response;
}

// Type guards for entities
export function isValidUser(obj: any): obj is User {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    isValidUserRole(obj.role) &&
    typeof obj.isActive === 'boolean';
}

export function isValidProject(obj: any): obj is Project {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.projectName === 'string' &&
    typeof obj.projectCode === 'string' &&
    typeof obj.location === 'string' &&
    isValidProjectStatus(obj.status) &&
    typeof obj.manager === 'string' &&
    typeof obj.isActive === 'boolean';
}

export function isValidVendor(obj: any): obj is Vendor {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.businessNumber === 'string' &&
    typeof obj.mainContact === 'string' &&
    typeof obj.phone === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.address === 'string' &&
    typeof obj.isActive === 'boolean';
}

export function isValidItem(obj: any): obj is Item {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.unit === 'string' &&
    typeof obj.unitPrice === 'number' &&
    typeof obj.isActive === 'boolean';
}

export function isValidOrderItem(obj: any): obj is OrderItem {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.itemName === 'string' &&
    typeof obj.quantity === 'number' &&
    typeof obj.unitPrice === 'number' &&
    typeof obj.totalAmount === 'number';
}

export function isValidPurchaseOrder(obj: any): obj is PurchaseOrder {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.orderNumber === 'string' &&
    typeof obj.projectId === 'number' &&
    typeof obj.userId === 'string' &&
    isValidOrderStatus(obj.status) &&
    typeof obj.totalAmount === 'number' &&
    Array.isArray(obj.items) &&
    obj.items.every(isValidOrderItem);
}

export function isValidInvoice(obj: any): obj is Invoice {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.orderId === 'number' &&
    typeof obj.invoiceNumber === 'string' &&
    typeof obj.invoiceType === 'string' &&
    typeof obj.totalAmount === 'number' &&
    typeof obj.vatAmount === 'number' &&
    isValidInvoiceStatus(obj.status) &&
    typeof obj.uploadedBy === 'string';
}

// Enum type guards
export function isValidOrderStatus(status: any): status is OrderStatus {
  return typeof status === 'string' && 
    ['draft', 'pending', 'approved', 'completed', 'sent'].includes(status);
}

export function isValidProjectStatus(status: any): status is ProjectStatus {
  return typeof status === 'string' && 
    ['planning', 'active', 'completed', 'cancelled'].includes(status);
}

export function isValidUserRole(role: any): role is UserRole {
  return typeof role === 'string' && 
    ['field_worker', 'project_manager', 'hq_management', 'executive', 'admin'].includes(role);
}

export function isValidInvoiceStatus(status: any): status is InvoiceStatus {
  return typeof status === 'string' && 
    ['pending', 'verified', 'paid'].includes(status);
}

// Array type guards
export function isValidUserArray(arr: any): arr is User[] {
  return Array.isArray(arr) && arr.every(isValidUser);
}

export function isValidProjectArray(arr: any): arr is Project[] {
  return Array.isArray(arr) && arr.every(isValidProject);
}

export function isValidVendorArray(arr: any): arr is Vendor[] {
  return Array.isArray(arr) && arr.every(isValidVendor);
}

export function isValidItemArray(arr: any): arr is Item[] {
  return Array.isArray(arr) && arr.every(isValidItem);
}

export function isValidOrderArray(arr: any): arr is PurchaseOrder[] {
  return Array.isArray(arr) && arr.every(isValidPurchaseOrder);
}

// Utility type guards
export function isNonEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isValidId(id: any): id is number {
  return typeof id === 'number' && id > 0 && Number.isInteger(id);
}

export function isValidStringId(id: any): id is string {
  return typeof id === 'string' && id.length > 0;
}

export function isValidEmail(email: any): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: any): phone is string {
  return typeof phone === 'string' && /^[\d\-\s\+\(\)]+$/.test(phone);
}

export function isValidAmount(amount: any): amount is number {
  return typeof amount === 'number' && amount >= 0 && Number.isFinite(amount);
}

export function isValidDate(date: any): date is Date | string {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  return false;
}

// Form validation helpers
export function validateRequired<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName}은(는) 필수 입력 항목입니다.`);
  }
  return value;
}

export function validateEmail(email: string): string {
  if (!isValidEmail(email)) {
    throw new Error('올바른 이메일 주소를 입력해주세요.');
  }
  return email;
}

export function validatePhone(phone: string): string {
  if (!isValidPhone(phone)) {
    throw new Error('올바른 전화번호를 입력해주세요.');
  }
  return phone;
}

export function validateAmount(amount: number): number {
  if (!isValidAmount(amount)) {
    throw new Error('올바른 금액을 입력해주세요.');
  }
  return amount;
}

export function validatePositiveNumber(value: number, fieldName: string): number {
  if (typeof value !== 'number' || value <= 0 || !Number.isFinite(value)) {
    throw new Error(`${fieldName}은(는) 0보다 큰 숫자여야 합니다.`);
  }
  return value;
}

// Safe array operations
export function safeMap<T, U>(
  array: T[] | null | undefined, 
  fn: (item: T, index: number) => U
): U[] {
  if (!Array.isArray(array)) return [];
  return array.map(fn);
}

export function safeFilter<T>(
  array: T[] | null | undefined, 
  predicate: (item: T, index: number) => boolean
): T[] {
  if (!Array.isArray(array)) return [];
  return array.filter(predicate);
}

export function safeFind<T>(
  array: T[] | null | undefined, 
  predicate: (item: T, index: number) => boolean
): T | undefined {
  if (!Array.isArray(array)) return undefined;
  return array.find(predicate);
}

// Safe property access
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  return obj?.[key];
}

export function safeGetNested<T>(obj: any, path: string): T | undefined {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}