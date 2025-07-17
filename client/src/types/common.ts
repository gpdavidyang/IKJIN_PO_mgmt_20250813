/**
 * Common TypeScript types for frontend components
 */

// Base entity interface
export interface BaseEntity {
  id: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Form types
export interface FormState {
  isSubmitting: boolean;
  isSuccess: boolean;
  isError: boolean;
  error?: Error | null;
}

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface FilterOption {
  key: string;
  label: string;
  options: SelectOption[];
}

// Table types
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

// Status types
export type OrderStatus = 'draft' | 'pending' | 'approved' | 'completed' | 'sent';
export type ProjectStatus = 'planning' | 'active' | 'completed' | 'cancelled';
export type UserRole = 'field_worker' | 'project_manager' | 'hq_management' | 'executive' | 'admin';
export type InvoiceStatus = 'pending' | 'verified' | 'paid';

// Badge variants
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

// Component size variants
export type SizeVariant = 'sm' | 'md' | 'lg';

// Loading states
export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
}

// Error states
export interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  retry?: () => void;
}

// File upload types
export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onUpload: (files: File[]) => void;
  loading?: boolean;
  error?: string;
}

export interface UploadedFile {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  uploadedAt: Date | string;
}

// Search and filter types
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Date range types
export interface DateRange {
  start: Date | string;
  end: Date | string;
}

// Statistics types
export interface StatCard {
  title: string;
  value: string | number;
  icon?: React.ComponentType<any>;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  change?: number;
  changeLabel?: string;
}

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<any>;
  active?: boolean;
  children?: NavItem[];
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type MaybeNull<T> = T | null | undefined;