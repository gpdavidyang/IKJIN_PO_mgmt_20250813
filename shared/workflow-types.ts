// Unified Workflow Types for Purchase Order Management System

export type WorkflowStep = 'select' | 'create' | 'approve' | 'process' | 'complete';
export type CreationMethod = 'standard' | 'excel';
export type StepStatus = 'pending' | 'current' | 'completed' | 'error' | 'skipped';

export interface WorkflowStepInfo {
  id: WorkflowStep;
  title: string;
  description?: string;
  status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface CreationState {
  method?: CreationMethod;
  data?: any; // Will be either StandardFormData or ExcelUploadData
  validationErrors?: Record<string, string>;
  isValid: boolean;
}

export interface ApprovalState {
  required: boolean;
  approvers?: string[];
  currentApprover?: string;
  status?: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
}

export interface ProcessingState {
  steps: ProcessingStep[];
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
}

export interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress?: number;
  result?: any;
  error?: string;
  details?: string[];
}

export interface CompletedState {
  orderNumber?: string;
  pdfUrl?: string;
  emailsSent?: EmailResult[];
  savedAt?: Date;
  nextActions?: string[];
}

export interface EmailResult {
  recipient: string;
  status: 'sent' | 'failed';
  sentAt?: Date;
  error?: string;
}

export interface UnifiedOrderWorkflow {
  // Core data
  orderData?: any; // Will be PurchaseOrder type
  creationMethod?: CreationMethod;
  
  // State management
  currentStep: WorkflowStep;
  steps: WorkflowStepInfo[];
  stepStates: {
    creation: CreationState;
    approval: ApprovalState;
    processing: ProcessingState;
    completed: CompletedState;
  };
  
  // Metadata
  metadata: {
    workflowId: string;
    startedAt: Date;
    lastModified: Date;
    userId: string;
    sessionId: string;
    version: string;
  };
  
  // Control flags
  flags: {
    skipApproval?: boolean;
    autoProcess?: boolean;
    sendEmails?: boolean;
    generatePDF?: boolean;
  };
}

// Processing Pipeline Steps
export const PROCESSING_STEPS = {
  PDF_GENERATION: {
    id: 'pdf_generation',
    title: 'PDF 생성',
    description: '발주서를 PDF로 변환하고 있습니다'
  },
  VENDOR_VALIDATION: {
    id: 'vendor_validation',
    title: '거래처 검증',
    description: '거래처 정보를 확인하고 있습니다'
  },
  EMAIL_PREPARATION: {
    id: 'email_preparation',
    title: '이메일 준비',
    description: '이메일을 작성하고 있습니다'
  },
  ATTACHMENT_PROCESSING: {
    id: 'attachment_processing',
    title: '첨부파일 처리',
    description: '첨부파일을 준비하고 있습니다'
  },
  FINAL_VALIDATION: {
    id: 'final_validation',
    title: '최종 검증',
    description: '모든 정보를 최종 확인하고 있습니다'
  }
} as const;

// Workflow Events
export interface WorkflowEvent {
  type: 'step_changed' | 'status_updated' | 'error_occurred' | 'workflow_completed';
  timestamp: Date;
  payload: any;
}

// Workflow Actions
export interface WorkflowAction {
  type: 'next' | 'previous' | 'skip' | 'retry' | 'cancel';
  payload?: any;
}

// Helper Types
export type WorkflowStepConfig = {
  [key in WorkflowStep]: {
    title: string;
    description: string;
    required: boolean;
    validation?: (state: UnifiedOrderWorkflow) => boolean;
  };
};

export const WORKFLOW_CONFIG: WorkflowStepConfig = {
  select: {
    title: '방식 선택',
    description: '표준/엑셀 선택',
    required: true,
    validation: (state) => !!state.creationMethod
  },
  create: {
    title: '발주서 작성',
    description: '데이터 입력',
    required: true,
    validation: (state) => state.stepStates.creation.isValid
  },
  approve: {
    title: '승인 처리',
    description: '선택적',
    required: false,
    validation: (state) => !state.stepStates.approval.required || 
                          state.stepStates.approval.status === 'approved'
  },
  process: {
    title: '후처리',
    description: 'PDF/이메일',
    required: true,
    validation: (state) => state.stepStates.processing.failedSteps.length === 0
  },
  complete: {
    title: '완료',
    description: '결과 확인',
    required: true,
    validation: (state) => !!state.stepStates.completed.savedAt
  }
};