// Re-export from schema for consistency
export type { Project, User } from "./schema";

export interface PurchaseItem {
  category: string;
  subCategory1: string;
  subCategory2: string;
  item: string;
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  price: number;
  vendor: string;
  vendorId?: number;
  deliveryLocation: string;
}

export interface Vendor {
  id: number;
  name: string;
  businessNumber?: string;
  email?: string;
  phone?: string;
}

export interface StandardOrderForm {
  site: string;
  deliveryDate: string;
  isNegotiable: boolean;
  receiver: string;
  manager: string;
  notes: string;
  items: PurchaseItem[];
}

// New dual status system types
export type OrderStatus = "draft" | "created" | "sent" | "delivered";
export type ApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

// Approval bypass reasons
export enum ApprovalBypassReason {
  AMOUNT_THRESHOLD = "amount_threshold",     // 금액 미달
  DIRECT_APPROVAL = "direct_approval",       // 직접 승인 권한
  AUTO_APPROVED = "auto_approved",          // 자동 승인 설정
  EMERGENCY = "emergency",                   // 긴급 발주
  REPEAT_ORDER = "repeat_order",           // 반복 발주
  EXCEL_AUTOMATION = "excel_automation"     // 엑셀 자동화
}

// Legacy status for backward compatibility
export type LegacyStatus = "draft" | "pending" | "approved" | "rejected" | "sent" | "completed";

// Authority check result
export interface AuthorityCheck {
  canDirectApprove: boolean;
  directApproveLimit?: number;
  requiresApproval: boolean;
  nextApprover?: string;
  bypassReason?: ApprovalBypassReason;
}

// Workflow status tracking
export interface WorkflowStatus {
  orderId: string;
  orderStatus: OrderStatus;
  approvalStatus: ApprovalStatus;
  currentStep: string;
  nextStep?: string;
  estimatedCompletion?: Date;
  history: WorkflowEvent[];
}

// Workflow event for audit trail
export interface WorkflowEvent {
  timestamp: Date;
  event: string;
  actor: string;
  details?: Record<string, any>;
}

// Updated approval workflow interface
export interface ApprovalWorkflow {
  id: string;
  orderStatus: OrderStatus;
  approvalStatus: ApprovalStatus;
  approvalBypassReason?: ApprovalBypassReason;
  nextApproverId?: string;
  approvalRequestedAt?: Date;
  approvedAt?: Date;
  approver?: string;
  comments?: string;
  deliveredAt?: Date;
  deliveredBy?: string;
}

export interface OrderContext {
  formData: StandardOrderForm;
  items: PurchaseItem[];
  orderStatus: OrderStatus;
  approvalStatus: ApprovalStatus;
  approvalBypassReason?: ApprovalBypassReason;
  uploadedFiles: File[];
  poNumber: string;
  isNegotiable: boolean;
}