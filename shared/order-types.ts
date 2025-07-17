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

export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected" | "skipped";

export interface ApprovalWorkflow {
  id: string;
  status: ApprovalStatus;
  approver?: string;
  approvedAt?: Date;
  comments?: string;
  allowSkip: boolean;
}

export interface OrderContext {
  formData: StandardOrderForm;
  items: PurchaseItem[];
  approvalStatus: ApprovalStatus;
  uploadedFiles: File[];
  poNumber: string;
  isNegotiable: boolean;
}