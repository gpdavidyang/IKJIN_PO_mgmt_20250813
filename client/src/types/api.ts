/**
 * API-related TypeScript types for better type safety
 */

// Enum types from schema
export type OrderStatus = 'draft' | 'pending' | 'approved' | 'completed' | 'sent';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type UserRole = 'field_worker' | 'project_manager' | 'hq_management' | 'executive' | 'admin';
export type InvoiceStatus = 'pending' | 'verified' | 'paid';

// User types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  position?: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuthSession {
  user: User;
  sessionId: string;
  isAuthenticated: boolean;
}

// Project types
export interface Project {
  id: number;
  projectName: string;
  projectCode: string;
  location: string;
  description?: string;
  startDate: Date | string;
  endDate?: Date | string;
  status: ProjectStatus;
  manager: string;
  totalBudget?: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: string;
  role: string;
  createdAt: Date | string;
}

// Vendor types
export interface Vendor {
  id: number;
  name: string;
  businessNumber: string;
  mainContact: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Item types
export interface Item {
  id: number;
  name: string;
  category: string;
  specification?: string;
  unit: string;
  unitPrice: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ItemCategory {
  id: number;
  type: string;
  name: string;
  parentId?: number;
  createdAt: Date | string;
}

// Order types
export interface OrderItem {
  itemName: string;
  specification?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  projectId: number;
  vendorId?: number;
  userId: string;
  status: OrderStatus;
  orderDate: Date | string;
  deliveryDate?: Date | string;
  totalAmount: number;
  notes?: string;
  items: OrderItem[];
  templateType?: string;
  currentApproverRole?: string;
  approvalLevel?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Invoice types
export interface Invoice {
  id: number;
  orderId: number;
  invoiceNumber: string;
  invoiceType: string;
  issueDate: Date | string;
  totalAmount: number;
  vatAmount: number;
  status: InvoiceStatus;
  uploadedBy: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// File types
export interface OrderAttachment {
  id: number;
  orderId: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  uploadedAt: Date | string;
}

// Company types
export interface Company {
  id: number;
  companyName: string;
  businessNumber: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Dashboard types
export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  totalAmount: number;
  activeProjects: number;
  newProjectsThisMonth: number;
}

export interface RecentProject {
  id: number;
  projectName: string;
  startDate: Date | string;
  status: ProjectStatus;
}

export interface UrgentOrder {
  id: number;
  orderNumber: string;
  projectName: string;
  totalAmount: number;
  daysOverdue: number;
}

// API Response wrappers
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedApiResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter types
export interface OrderFilters {
  status?: OrderStatus;
  projectId?: number;
  vendorId?: number;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  managerId?: string;
  startDate?: string;
  endDate?: string;
}

// Form submission types
export interface OrderFormData {
  projectId: number;
  vendorId?: number;
  orderDate: Date | string;
  deliveryDate?: Date | string;
  notes?: string;
  items: OrderItem[];
  templateType?: string;
}

export interface ProjectFormData {
  projectName: string;
  projectCode: string;
  location: string;
  description?: string;
  startDate: Date | string;
  endDate?: Date | string;
  manager: string;
  totalBudget?: number;
}

export interface VendorFormData {
  name: string;
  businessNumber: string;
  mainContact: string;
  phone: string;
  email: string;
  address: string;
}

// Approval workflow types
export interface ApprovalAction {
  action: 'approve' | 'reject' | 'submit';
  comments?: string;
}

export interface ApprovalHistory {
  id: number;
  orderId: number;
  userId: string;
  action: string;
  comments?: string;
  createdAt: Date | string;
}