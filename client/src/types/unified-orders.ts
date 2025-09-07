/**
 * Unified Order Types for Consistent Order Display Across Components
 */

// Base Order interface that all order components will use
export interface UnifiedOrder {
  id: number;
  orderNumber: string;
  status: string;
  orderStatus?: string; // 발주 상태: draft, created, sent, delivered
  approvalStatus?: string; // 승인 상태: not_required, pending, approved, rejected
  totalAmount: number;
  orderDate: string;
  deliveryDate: string | null;
  createdAt?: string; // 등록일
  userId: string;
  vendorId: number | null;
  projectId: number | null;
  vendorName: string | null;
  projectName: string | null;
  userName: string | null;
  emailStatus: string | null;
  totalEmailsSent: number;
  vendor?: { id: number; name: string; email?: string };
  project?: { id: number; projectName: string; projectCode?: string };
  user?: { name: string };
  filePath?: string;
  notes?: string;
  remarks?: string;
  items?: any[];
  createdBy?: string;
}

// Display modes for the unified component
export type OrderDisplayMode = 'compact' | 'detailed' | 'full';

// Filter options for orders
export interface UnifiedOrderFilters {
  status?: string;
  orderStatus?: string;
  approvalStatus?: string;
  vendorId?: string;
  projectId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: string;
  maxAmount?: string;
  searchText?: string;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API Response structure
export interface UnifiedOrdersResponse {
  orders: UnifiedOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  metadata?: {
    vendors: any[];
    projects: any[];
    users: any[];
  };
  performance?: {
    queryTime: string;
    cacheHit: boolean;
  };
}

// Component props interface
export interface UnifiedOrdersListProps {
  // Display configuration
  mode?: OrderDisplayMode;
  maxItems?: number;
  showActions?: boolean;
  showPagination?: boolean;
  
  // Data and filtering
  filters?: UnifiedOrderFilters;
  orders?: UnifiedOrder[]; // Optional pre-loaded orders
  
  // Event handlers
  onOrderClick?: (orderId: number) => void;
  onStatusChange?: (orderId: number, status: string) => void;
  onDeleteOrder?: (orderId: number) => void;
  
  // Styling
  compact?: boolean;
  className?: string;
  
  // Advanced features
  enableSelection?: boolean;
  selectedOrders?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
}

// Hook configuration
export interface UseOrdersQueryConfig {
  filters?: UnifiedOrderFilters;
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  gcTime?: number;
}