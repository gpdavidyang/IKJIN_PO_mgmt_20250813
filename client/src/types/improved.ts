/**
 * 개선된 TypeScript 타입 정의
 * any 타입을 제거하고 강타입 정의를 위한 타입들
 */

// 공통 API 응답 타입
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 사용자 관련 타입
export type UserRole = 
  | "field_worker" 
  | "project_manager" 
  | "hq_management" 
  | "executive" 
  | "admin";

export interface User {
  id: string;
  email: string | null;
  name: string;
  password: string;
  positionId: number | null;
  phoneNumber: string;
  profileImageUrl: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// 발주서 관련 타입
export type OrderStatus = 
  | "draft" 
  | "pending" 
  | "approved" 
  | "sent" 
  | "completed";

export interface OrderItem {
  id?: number;
  orderId?: number;
  itemId?: number;
  itemName: string;
  specification?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  categoryLv1?: string;
  categoryLv2?: string;
  categoryLv3?: string;
  supplyAmount?: number;
  taxAmount?: number;
  deliveryName?: string;
  notes?: string;
  createdAt?: Date;
}

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  projectId: number;
  vendorId: number;
  userId: string;
  templateId?: number;
  orderDate: Date;
  deliveryDate?: Date;
  status: OrderStatus;
  totalAmount: number;
  notes?: string;
  customFields?: Record<string, any>;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  sentAt?: Date;
  emailStatus: string;
  emailSentCount: number;
  lastEmailError?: string;
  currentApproverRole?: UserRole;
  approvalLevel: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  project?: Project;
  vendor?: Vendor;
  user?: User;
  template?: OrderTemplate;
  items?: OrderItem[];
  history?: OrderHistory[];
}

// 거래처 관련 타입
export type VendorType = "거래처" | "납품처";

export interface Vendor {
  id: number;
  name: string;
  type: VendorType;
  businessNumber?: string;
  industry?: string;
  representative?: string;
  mainContact: string;
  contactPerson: string;
  email: string;
  phone?: string;
  address?: string;
  memo?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 프로젝트 관련 타입
export type ProjectStatus = 
  | "planning" 
  | "active" 
  | "on_hold" 
  | "completed" 
  | "cancelled";

export interface Project {
  id: number;
  projectName: string;
  projectCode: string;
  clientName?: string;
  projectType?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  status: ProjectStatus;
  totalBudget?: number;
  projectManagerId?: string;
  orderManagerId?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  projectManager?: User;
  orderManager?: User;
  members?: ProjectMember[];
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: string;
  role: string;
  assignedAt: Date;
  assignedBy?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  project?: Project;
  user?: User;
}

// 품목 관련 타입
export interface Item {
  id: number;
  name: string;
  category?: string;
  specification?: string;
  unit: string;
  standardPrice?: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemCategory {
  id: number;
  categoryType: "major" | "middle" | "minor";
  categoryValue: string;
  parentId?: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  parent?: ItemCategory;
  children?: ItemCategory[];
}

// 템플릿 관련 타입
export interface OrderTemplate {
  id: number;
  templateName: string;
  templateType: string;
  fieldsConfig: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  fields?: TemplateField[];
  handsontableConfig?: HandsontableConfig[];
}

export interface TemplateField {
  id: number;
  templateId: number;
  fieldType: string;
  fieldName: string;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: Record<string, any>;
  options?: Record<string, any>;
  gridPosition: Record<string, any>;
  sectionName: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HandsontableConfig {
  id: number;
  templateId: number;
  colHeaders: string[];
  columns: Record<string, any>[];
  rowsCount: number;
  formulas?: Record<string, any>;
  validationRules?: Record<string, any>;
  customStyles?: Record<string, any>;
  settings?: Record<string, any>;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 승인 관련 타입
export interface ApprovalAuthority {
  id: number;
  role: UserRole;
  maxAmount: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 이력 관련 타입
export interface OrderHistory {
  id: number;
  orderId: number;
  userId: string;
  action: string;
  changes?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  order?: PurchaseOrder;
  user?: User;
}

// 이메일 관련 타입
export interface EmailSendingHistory {
  id: number;
  orderId?: number;
  orderNumber?: string;
  senderUserId: string;
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  messageContent?: string;
  attachmentFiles?: Array<{
    filename: string;
    size: number;
    contentType: string;
  }>;
  sendingStatus: "pending" | "sending" | "completed" | "failed" | "partial";
  sentCount: number;
  failedCount: number;
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  order?: PurchaseOrder;
  senderUser?: User;
  details?: EmailSendingDetails[];
}

export interface EmailSendingDetails {
  id: number;
  historyId: number;
  recipientEmail: string;
  recipientType: "to" | "cc" | "bcc";
  sendingStatus: "pending" | "sent" | "failed";
  messageId?: string;
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
  
  // Relations
  history?: EmailSendingHistory;
}

// 통계 관련 타입
export interface DashboardStatistics {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  completedOrders: number;
  totalAmount: number;
  monthlyTrend: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
  topVendors: Array<{
    vendorId: number;
    vendorName: string;
    orderCount: number;
    totalAmount: number;
  }>;
  projectStats: Array<{
    projectId: number;
    projectName: string;
    orderCount: number;
    totalAmount: number;
  }>;
}

// 폼 관련 타입
export interface FormFieldConfig {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "password" | "textarea" | "select" | "date" | "checkbox" | "radio";
  placeholder?: string;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => boolean | string;
  };
  options?: Array<{
    value: string | number;
    label: string;
  }>;
  defaultValue?: any;
  disabled?: boolean;
  hidden?: boolean;
}

// API 요청/응답 타입
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  message?: string;
}

export interface LogoutResponse {
  success: boolean;
  message?: string;
}

// 필터링 관련 타입
export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  projectId?: number;
  vendorId?: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
  urgent?: boolean;
  pendingApproval?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface SortParams {
  field: string;
  direction: "asc" | "desc";
}

// Excel 자동화 관련 타입
export interface ExcelProcessingStep {
  step: number;
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  message?: string;
  data?: any;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

export interface ExcelAutomationResult {
  success: boolean;
  message: string;
  steps: ExcelProcessingStep[];
  summary: {
    totalOrders: number;
    totalItems: number;
    validationPassed: boolean;
    savedToDatabase: boolean;
    sheetsExtracted: boolean;
    pdfGenerated: boolean;
    emailSent: boolean;
  };
  files: {
    originalFile?: string;
    extractedFile?: string;
    processedFile?: string;
    pdfFile?: string;
  };
}

// 파일 업로드 관련 타입
export interface FileUpload {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "failed";
  error?: string;
  result?: any;
}

// 컴포넌트 props 타입
export interface TableColumn<T = any> {
  key: keyof T | string;
  title: string;
  width?: number | string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  className?: string;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  rowKey?: keyof T | ((record: T) => string);
  onRow?: (record: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  className?: string;
}

// 에러 타입
export interface APIError {
  status: number;
  message: string;
  details?: string;
  code?: string;
  timestamp?: string;
}

// 유틸리티 타입
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Export all types
export type {
  APIResponse,
  PaginatedResponse,
  User,
  UserRole,
  PurchaseOrder,
  OrderItem,
  OrderStatus,
  Vendor,
  VendorType,
  Project,
  ProjectStatus,
  ProjectMember,
  Item,
  ItemCategory,
  OrderTemplate,
  TemplateField,
  HandsontableConfig,
  ApprovalAuthority,
  OrderHistory,
  EmailSendingHistory,
  EmailSendingDetails,
  DashboardStatistics,
  FormFieldConfig,
  LoginCredentials,
  LoginResponse,
  LogoutResponse,
  OrderFilters,
  PaginationParams,
  SortParams,
  ExcelProcessingStep,
  ExcelAutomationResult,
  FileUpload,
  TableColumn,
  TableProps,
  APIError,
};