import { 
  UnifiedOrderWorkflow, 
  WorkflowStep, 
  ProcessingStep,
  WorkflowStepInfo,
  CreationMethod 
} from '@shared/workflow-types';

// Workflow Navigation Utilities
export const getNextStep = (currentStep: WorkflowStep, skipApproval = false): WorkflowStep | null => {
  const steps: WorkflowStep[] = ['select', 'create', 'approve', 'process', 'complete'];
  const currentIndex = steps.indexOf(currentStep);
  
  if (currentIndex === -1 || currentIndex === steps.length - 1) {
    return null;
  }
  
  const nextStep = steps[currentIndex + 1];
  
  // Skip approval if flag is set
  if (nextStep === 'approve' && skipApproval) {
    return steps[currentIndex + 2] || null;
  }
  
  return nextStep;
};

export const getPreviousStep = (currentStep: WorkflowStep, wasApprovalSkipped = false): WorkflowStep | null => {
  const steps: WorkflowStep[] = ['select', 'create', 'approve', 'process', 'complete'];
  const currentIndex = steps.indexOf(currentStep);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  const prevStep = steps[currentIndex - 1];
  
  // Skip approval if it was skipped before
  if (prevStep === 'approve' && wasApprovalSkipped) {
    return steps[currentIndex - 2] || null;
  }
  
  return prevStep;
};

// Progress Calculation
export const calculateWorkflowProgress = (workflow: UnifiedOrderWorkflow): number => {
  const totalSteps = workflow.steps.filter(step => 
    step.id !== 'approve' || workflow.stepStates.approval.required
  ).length;
  
  const completedSteps = workflow.steps.filter(step => 
    step.status === 'completed' || step.status === 'skipped'
  ).length;
  
  return Math.round((completedSteps / totalSteps) * 100);
};

// Time Estimation
export const estimateRemainingTime = (workflow: UnifiedOrderWorkflow): number => {
  const timeEstimates: Record<WorkflowStep, number> = {
    select: 1, // 1 minute
    create: 5, // 5 minutes
    approve: 10, // 10 minutes (if required)
    process: 3, // 3 minutes
    complete: 1  // 1 minute
  };
  
  const remainingSteps = workflow.steps.filter(step => 
    step.status === 'pending' || step.status === 'current'
  );
  
  return remainingSteps.reduce((total, step) => {
    if (step.id === 'approve' && !workflow.stepStates.approval.required) {
      return total;
    }
    return total + (timeEstimates[step.id] || 0);
  }, 0);
};

// Validation Utilities
export const validateCreationData = (method: CreationMethod, data: any): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  if (method === 'standard') {
    // Standard form validation
    if (!data?.projectId) errors.projectId = '프로젝트를 선택해주세요';
    if (!data?.vendorId) errors.vendorId = '거래처를 선택해주세요';
    if (!data?.items || data.items.length === 0) errors.items = '품목을 추가해주세요';
    if (!data?.orderDate) errors.orderDate = '발주일자를 입력해주세요';
    if (!data?.deliveryDate) errors.deliveryDate = '납기일자를 입력해주세요';
  } else if (method === 'excel') {
    // Excel upload validation
    if (!data) {
      errors.data = '업로드된 데이터가 없습니다';
    } else {
      if (!data.type || data.type !== 'excel') errors.type = '엑셀 업로드 형식이 올바르지 않습니다';
      if (!data.orders || data.orders.length === 0) errors.orders = '파싱된 발주서 데이터가 없습니다';
      if (!data.filePath) errors.filePath = '파일 경로가 없습니다';
      if (data.parseErrors && data.parseErrors.length > 0) {
        errors.parse = '엑셀 파일 파싱 중 오류가 발생했습니다';
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Processing Pipeline Utilities
export const createProcessingPipeline = (flags: UnifiedOrderWorkflow['flags']): ProcessingStep[] => {
  const steps: ProcessingStep[] = [];
  
  if (flags.generatePDF) {
    steps.push({
      id: 'pdf_generation',
      title: 'PDF 생성',
      description: '발주서를 PDF로 변환하고 있습니다',
      status: 'idle'
    });
  }
  
  // Always validate vendor
  steps.push({
    id: 'vendor_validation',
    title: '거래처 검증',
    description: '거래처 정보를 확인하고 있습니다',
    status: 'idle'
  });
  
  if (flags.sendEmails) {
    steps.push({
      id: 'email_preparation',
      title: '이메일 준비',
      description: '이메일을 작성하고 있습니다',
      status: 'idle'
    });
    
    steps.push({
      id: 'attachment_processing',
      title: '첨부파일 처리',
      description: '첨부파일을 준비하고 있습니다',
      status: 'idle'
    });
  }
  
  // Always do final validation
  steps.push({
    id: 'final_validation',
    title: '최종 검증',
    description: '모든 정보를 최종 확인하고 있습니다',
    status: 'idle'
  });
  
  return steps;
};

// State Persistence
export const saveWorkflowState = (workflow: UnifiedOrderWorkflow): void => {
  const key = `workflow_${workflow.metadata.workflowId}`;
  localStorage.setItem(key, JSON.stringify(workflow));
  
  // Also save to recent workflows list
  const recentWorkflows = getRecentWorkflows();
  const updated = [
    { id: workflow.metadata.workflowId, date: workflow.metadata.lastModified },
    ...recentWorkflows.filter(w => w.id !== workflow.metadata.workflowId)
  ].slice(0, 10); // Keep last 10
  
  localStorage.setItem('recentWorkflows', JSON.stringify(updated));
};

export const loadWorkflowState = (workflowId: string): UnifiedOrderWorkflow | null => {
  const key = `workflow_${workflowId}`;
  const saved = localStorage.getItem(key);
  
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to parse workflow state:', error);
    return null;
  }
};

export const getRecentWorkflows = (): Array<{ id: string; date: Date }> => {
  const saved = localStorage.getItem('recentWorkflows');
  if (!saved) return [];
  
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
};

// Error Recovery
export const canRetryStep = (step: ProcessingStep): boolean => {
  return step.status === 'error' && !['final_validation'].includes(step.id);
};

export const getRetryDelay = (retryCount: number): number => {
  // Exponential backoff: 1s, 2s, 4s, 8s...
  return Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
};

// Formatting Utilities
export const formatStepDuration = (startTime?: Date, endTime?: Date): string => {
  if (!startTime) return '-';
  
  const end = endTime || new Date();
  const durationMs = end.getTime() - startTime.getTime();
  const seconds = Math.floor(durationMs / 1000);
  
  if (seconds < 60) return `${seconds}초`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}분 ${remainingSeconds}초`;
};

export const getStepIcon = (step: WorkflowStep): string => {
  const icons: Record<WorkflowStep, string> = {
    select: '📋',
    create: '✏️',
    approve: '✅',
    process: '⚙️',
    complete: '🎉'
  };
  
  return icons[step] || '📄';
};

export const getStatusColor = (status: WorkflowStepInfo['status']): string => {
  const colors: Record<WorkflowStepInfo['status'], string> = {
    pending: 'text-gray-500 bg-gray-100',
    current: 'text-blue-700 bg-blue-100',
    completed: 'text-green-700 bg-green-100',
    error: 'text-red-700 bg-red-100',
    skipped: 'text-gray-400 bg-gray-50'
  };
  
  return colors[status] || 'text-gray-500 bg-gray-100';
};

// Export all utilities
export const workflowUtils = {
  getNextStep,
  getPreviousStep,
  calculateWorkflowProgress,
  estimateRemainingTime,
  validateCreationData,
  createProcessingPipeline,
  saveWorkflowState,
  loadWorkflowState,
  getRecentWorkflows,
  canRetryStep,
  getRetryDelay,
  formatStepDuration,
  getStepIcon,
  getStatusColor
};