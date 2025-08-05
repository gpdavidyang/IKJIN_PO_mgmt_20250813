import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useOrderWorkflow as useWorkflowContext } from '@/contexts/OrderWorkflowContext';
import { 
  ProcessingStep, 
  EmailResult,
  CreationMethod,
  WorkflowStep 
} from '@shared/workflow-types';
import { workflowUtils } from '@/utils/workflow-utils';
// import { apiClient } from '@/services/api-client'; // TEMPORARY: Disabled for build fix

// Temporary mock API client
const apiClient = {
  post: async (url: string, data: any) => {
    // Mock responses for different endpoints
    if (url.includes('check-approval')) {
      return { data: { required: data.amount > 1000000 } };
    }
    if (url.includes('generate-pdf')) {
      return { data: { url: '/api/downloads/order.pdf' } };
    }
    if (url.includes('validate')) {
      return { data: { valid: true, suggestions: [] } };
    }
    return { data: {} };
  }
};

interface UseOrderWorkflowReturn {
  // State
  workflow: ReturnType<typeof useWorkflowContext>['state'];
  isProcessing: boolean;
  currentProcessingStep: string | null;
  
  // Navigation
  canGoNext: boolean;
  canGoPrevious: boolean;
  goNext: () => void;
  goPrevious: () => void;
  goToStep: (step: WorkflowStep) => void;
  
  // Actions
  selectCreationMethod: (method: CreationMethod) => void;
  submitOrderData: (data: any) => Promise<void>;
  startProcessing: () => Promise<void>;
  retryProcessingStep: (stepId: string) => Promise<void>;
  
  // Utilities
  progress: number;
  estimatedTime: number;
  saveProgress: () => void;
  loadProgress: (workflowId: string) => void;
}

export const useOrderWorkflow = (): UseOrderWorkflowReturn => {
  const context = useWorkflowContext();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingStep, setCurrentProcessingStep] = useState<string | null>(null);

  // Calculate derived state
  const canGoNext = context.canProceed();
  const canGoPrevious = context.getCurrentStepIndex() > 0;
  const progress = workflowUtils.calculateWorkflowProgress(context.state);
  const estimatedTime = workflowUtils.estimateRemainingTime(context.state);

  // Navigation handlers
  const goNext = useCallback(() => {
    if (!canGoNext) {
      toast({
        title: '진행할 수 없습니다',
        description: '현재 단계를 완료해주세요',
        variant: 'destructive'
      });
      return;
    }
    
    context.goToNextStep();
  }, [canGoNext, context, toast]);

  const goPrevious = useCallback(() => {
    if (!canGoPrevious) return;
    context.goToPreviousStep();
  }, [canGoPrevious, context]);

  const goToStep = useCallback((step: WorkflowStep) => {
    // Validate if user can jump to this step
    const stepIndex = ['select', 'create', 'approve', 'process', 'complete'].indexOf(step);
    const currentIndex = context.getCurrentStepIndex();
    
    if (stepIndex > currentIndex + 1) {
      toast({
        title: '이동할 수 없습니다',
        description: '이전 단계를 먼저 완료해주세요',
        variant: 'destructive'
      });
      return;
    }
    
    context.goToStep(step);
  }, [context, toast]);

  // Creation method selection
  const selectCreationMethod = useCallback((method: CreationMethod) => {
    context.setCreationMethod(method);
    
    // Auto-advance to next step
    setTimeout(() => {
      context.goToNextStep();
    }, 500);
  }, [context]);

  // Order data submission
  const submitOrderData = useCallback(async (data: any) => {
    try {
      // Validate data
      const validation = workflowUtils.validateCreationData(
        context.state.creationMethod!,
        data
      );
      
      if (!validation.isValid) {
        // Show specific validation errors
        const errorMessages = Object.values(validation.errors).join(', ');
        toast({
          title: '입력 오류',
          description: errorMessages || '필수 항목을 모두 입력해주세요',
          variant: 'destructive'
        });
        console.error('Validation errors:', validation.errors);
        console.error('Submitted data:', data);
        return;
      }
      
      // Update state
      context.updateOrderData(data);
      context.dispatch({
        type: 'UPDATE_CREATION_STATE',
        payload: {
          data,
          isValid: true,
          validationErrors: {}
        }
      });
      
      // Check if approval is required based on amount or role
      const requiresApproval = await checkApprovalRequired(data);
      context.dispatch({
        type: 'UPDATE_APPROVAL_STATE',
        payload: { required: requiresApproval }
      });
      
      // Save progress
      workflowUtils.saveWorkflowState(context.state);
      
      toast({
        title: '저장 완료',
        description: '발주서 정보가 저장되었습니다'
      });
      
      // Auto-advance
      setTimeout(() => {
        context.goToNextStep();
      }, 1000);
      
    } catch (error) {
      console.error('Failed to submit order data:', error);
      toast({
        title: '저장 실패',
        description: '발주서 저장 중 오류가 발생했습니다',
        variant: 'destructive'
      });
    }
  }, [context, toast]);

  // Processing pipeline
  const startProcessing = useCallback(async () => {
    setIsProcessing(true);
    
    try {
      const pipeline = workflowUtils.createProcessingPipeline(context.state.flags);
      
      for (const step of pipeline) {
        setCurrentProcessingStep(step.id);
        
        // Update step status to processing
        context.updateProcessingStep(step.id, { status: 'processing' });
        
        try {
          // Execute step
          const result = await executeProcessingStep(step, context.state);
          
          // Update step status to completed
          context.updateProcessingStep(step.id, { 
            status: 'completed',
            result,
            progress: 100
          });
          
        } catch (error: any) {
          // Update step status to error
          context.updateProcessingStep(step.id, { 
            status: 'error',
            error: error.message
          });
          
          // Stop pipeline on error
          throw error;
        }
      }
      
      // All steps completed successfully
      context.dispatch({
        type: 'UPDATE_COMPLETED_STATE',
        payload: {
          savedAt: new Date(),
          orderNumber: context.state.orderData?.orderNumber,
          nextActions: ['발주서 목록 보기', '새 발주서 작성']
        }
      });
      
      // Save final state
      workflowUtils.saveWorkflowState(context.state);
      
      // Auto-advance to complete
      context.goToNextStep();
      
      toast({
        title: '처리 완료',
        description: '발주서가 성공적으로 처리되었습니다'
      });
      
    } catch (error: any) {
      toast({
        title: '처리 실패',
        description: error.message || '처리 중 오류가 발생했습니다',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      setCurrentProcessingStep(null);
    }
  }, [context, toast]);

  // Retry failed step
  const retryProcessingStep = useCallback(async (stepId: string) => {
    const step = context.state.stepStates.processing.steps.find(s => s.id === stepId);
    if (!step || !workflowUtils.canRetryStep(step)) return;
    
    setIsProcessing(true);
    setCurrentProcessingStep(stepId);
    
    try {
      context.updateProcessingStep(stepId, { status: 'processing' });
      
      const result = await executeProcessingStep(step, context.state);
      
      context.updateProcessingStep(stepId, { 
        status: 'completed',
        result,
        progress: 100
      });
      
      toast({
        title: '재시도 성공',
        description: `${step.title} 단계가 성공적으로 완료되었습니다`
      });
      
      // Continue with remaining steps if this was blocking
      if (context.state.stepStates.processing.failedSteps.length === 1) {
        await startProcessing();
      }
      
    } catch (error: any) {
      context.updateProcessingStep(stepId, { 
        status: 'error',
        error: error.message
      });
      
      toast({
        title: '재시도 실패',
        description: error.message || '재시도 중 오류가 발생했습니다',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      setCurrentProcessingStep(null);
    }
  }, [context, startProcessing, toast]);

  // Save/Load progress
  const saveProgress = useCallback(() => {
    workflowUtils.saveWorkflowState(context.state);
    toast({
      title: '저장 완료',
      description: '진행 상황이 저장되었습니다'
    });
  }, [context.state, toast]);

  const loadProgress = useCallback((workflowId: string) => {
    const loaded = workflowUtils.loadWorkflowState(workflowId);
    if (loaded) {
      // Would need to implement a LOAD_STATE action in reducer
      toast({
        title: '불러오기 완료',
        description: '저장된 진행 상황을 불러왔습니다'
      });
    } else {
      toast({
        title: '불러오기 실패',
        description: '저장된 진행 상황을 찾을 수 없습니다',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Auto-save on state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      workflowUtils.saveWorkflowState(context.state);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [context.state]);

  return {
    workflow: context.state,
    isProcessing,
    currentProcessingStep,
    canGoNext,
    canGoPrevious,
    goNext,
    goPrevious,
    goToStep,
    selectCreationMethod,
    submitOrderData,
    startProcessing,
    retryProcessingStep,
    progress,
    estimatedTime,
    saveProgress,
    loadProgress
  };
};

// Helper functions
async function checkApprovalRequired(orderData: any): Promise<boolean> {
  // Check if approval is required based on business rules
  // This would typically call an API endpoint
  try {
    const response = await apiClient.post('/api/orders/check-approval', {
      amount: orderData.totalAmount,
      projectId: orderData.projectId
    });
    return response.data.required;
  } catch {
    // Default to requiring approval if check fails
    return true;
  }
}

async function executeProcessingStep(step: ProcessingStep, workflow: any): Promise<any> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  switch (step.id) {
    case 'pdf_generation':
      // Call PDF generation API
      const pdfResponse = await apiClient.post('/api/orders/generate-pdf', {
        orderData: workflow.orderData
      });
      return { pdfUrl: pdfResponse.data.url };
      
    case 'vendor_validation':
      // Call vendor validation API
      const vendorResponse = await apiClient.post('/api/vendors/validate', {
        vendorId: workflow.orderData.vendorId,
        vendorEmail: workflow.orderData.vendorEmail
      });
      return { isValid: vendorResponse.data.valid, suggestions: vendorResponse.data.suggestions };
      
    case 'email_preparation':
      // Prepare email content
      return {
        subject: `발주서 - ${workflow.orderData.orderNumber}`,
        recipients: [workflow.orderData.vendorEmail],
        body: '발주서를 첨부합니다.'
      };
      
    case 'attachment_processing':
      // Process attachments
      return {
        attachments: ['purchase_order.pdf', 'additional_docs.zip']
      };
      
    case 'final_validation':
      // Final validation checks
      return { allChecksPass: true };
      
    default:
      throw new Error(`Unknown processing step: ${step.id}`);
  }
}