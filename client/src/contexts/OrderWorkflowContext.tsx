import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  UnifiedOrderWorkflow,
  WorkflowStep,
  WorkflowAction,
  WorkflowEvent,
  WorkflowStepInfo,
  CreationMethod,
  ProcessingStep,
  WORKFLOW_CONFIG,
  PROCESSING_STEPS
} from '@shared/workflow-types';

interface WorkflowContextType {
  state: UnifiedOrderWorkflow;
  dispatch: (action: WorkflowAction) => void;
  
  // Navigation
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (step: WorkflowStep) => void;
  
  // State updates
  setCreationMethod: (method: CreationMethod) => void;
  updateOrderData: (data: any) => void;
  updateProcessingStep: (stepId: string, update: Partial<ProcessingStep>) => void;
  
  // Utilities
  canProceed: () => boolean;
  getCurrentStepIndex: () => number;
  getStepStatus: (step: WorkflowStep) => WorkflowStepInfo | undefined;
}

const OrderWorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

// Initial state factory
const createInitialState = (): UnifiedOrderWorkflow => ({
  currentStep: 'select',
  steps: Object.entries(WORKFLOW_CONFIG).map(([id, config]) => ({
    id: id as WorkflowStep,
    title: config.title,
    description: config.description,
    status: id === 'select' ? 'current' : 'pending'
  })),
  stepStates: {
    creation: {
      isValid: false
    },
    approval: {
      required: false
    },
    processing: {
      steps: Object.values(PROCESSING_STEPS).map(step => ({
        ...step,
        status: 'idle' as const
      })),
      completedSteps: [],
      failedSteps: []
    },
    completed: {}
  },
  metadata: {
    workflowId: uuidv4(),
    startedAt: new Date(),
    lastModified: new Date(),
    userId: '', // Will be set from auth context
    sessionId: uuidv4(),
    version: '1.0.0'
  },
  flags: {
    skipApproval: false,
    autoProcess: true,
    sendEmails: true,
    generatePDF: true
  }
});

// Reducer
type WorkflowActionType = 
  | { type: 'SET_STEP'; payload: WorkflowStep }
  | { type: 'UPDATE_STEP_STATUS'; payload: { step: WorkflowStep; status: WorkflowStepInfo['status'] } }
  | { type: 'SET_CREATION_METHOD'; payload: CreationMethod }
  | { type: 'UPDATE_ORDER_DATA'; payload: any }
  | { type: 'UPDATE_CREATION_STATE'; payload: Partial<UnifiedOrderWorkflow['stepStates']['creation']> }
  | { type: 'UPDATE_APPROVAL_STATE'; payload: Partial<UnifiedOrderWorkflow['stepStates']['approval']> }
  | { type: 'UPDATE_PROCESSING_STEP'; payload: { stepId: string; update: Partial<ProcessingStep> } }
  | { type: 'UPDATE_COMPLETED_STATE'; payload: Partial<UnifiedOrderWorkflow['stepStates']['completed']> }
  | { type: 'SET_FLAGS'; payload: Partial<UnifiedOrderWorkflow['flags']> }
  | { type: 'RESET_WORKFLOW' };

const workflowReducer = (
  state: UnifiedOrderWorkflow,
  action: WorkflowActionType
): UnifiedOrderWorkflow => {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStep: action.payload,
        steps: state.steps.map(step => ({
          ...step,
          status: step.id === action.payload ? 'current' : 
                  state.steps.findIndex(s => s.id === step.id) < 
                  state.steps.findIndex(s => s.id === action.payload) ? 'completed' : 'pending'
        })),
        metadata: {
          ...state.metadata,
          lastModified: new Date()
        }
      };

    case 'UPDATE_STEP_STATUS':
      return {
        ...state,
        steps: state.steps.map(step =>
          step.id === action.payload.step
            ? { ...step, status: action.payload.status }
            : step
        ),
        metadata: {
          ...state.metadata,
          lastModified: new Date()
        }
      };

    case 'SET_CREATION_METHOD':
      return {
        ...state,
        creationMethod: action.payload,
        stepStates: {
          ...state.stepStates,
          creation: {
            ...state.stepStates.creation,
            method: action.payload
          }
        },
        metadata: {
          ...state.metadata,
          lastModified: new Date()
        }
      };

    case 'UPDATE_ORDER_DATA':
      return {
        ...state,
        orderData: action.payload,
        metadata: {
          ...state.metadata,
          lastModified: new Date()
        }
      };

    case 'UPDATE_CREATION_STATE':
      return {
        ...state,
        stepStates: {
          ...state.stepStates,
          creation: {
            ...state.stepStates.creation,
            ...action.payload
          }
        },
        metadata: {
          ...state.metadata,
          lastModified: new Date()
        }
      };

    case 'UPDATE_APPROVAL_STATE':
      return {
        ...state,
        stepStates: {
          ...state.stepStates,
          approval: {
            ...state.stepStates.approval,
            ...action.payload
          }
        },
        metadata: {
          ...state.metadata,
          lastModified: new Date()
        }
      };

    case 'UPDATE_PROCESSING_STEP':
      const updatedSteps = state.stepStates.processing.steps.map(step =>
        step.id === action.payload.stepId
          ? { ...step, ...action.payload.update }
          : step
      );
      
      const completedSteps = updatedSteps
        .filter(step => step.status === 'completed')
        .map(step => step.id);
      
      const failedSteps = updatedSteps
        .filter(step => step.status === 'error')
        .map(step => step.id);

      return {
        ...state,
        stepStates: {
          ...state.stepStates,
          processing: {
            ...state.stepStates.processing,
            steps: updatedSteps,
            completedSteps,
            failedSteps
          }
        },
        metadata: {
          ...state.metadata,
          lastModified: new Date()
        }
      };

    case 'UPDATE_COMPLETED_STATE':
      return {
        ...state,
        stepStates: {
          ...state.stepStates,
          completed: {
            ...state.stepStates.completed,
            ...action.payload
          }
        },
        metadata: {
          ...state.metadata,
          lastModified: new Date()
        }
      };

    case 'SET_FLAGS':
      return {
        ...state,
        flags: {
          ...state.flags,
          ...action.payload
        },
        metadata: {
          ...state.metadata,
          lastModified: new Date()
        }
      };

    case 'RESET_WORKFLOW':
      return createInitialState();

    default:
      return state;
  }
};

// Provider component
export const OrderWorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(workflowReducer, createInitialState());

  // Navigation helpers
  const stepOrder: WorkflowStep[] = ['select', 'create', 'approve', 'process', 'complete'];
  
  const getCurrentStepIndex = useCallback(() => {
    return stepOrder.indexOf(state.currentStep);
  }, [state.currentStep]);

  const canProceed = useCallback(() => {
    const config = WORKFLOW_CONFIG[state.currentStep];
    return config.validation ? config.validation(state) : true;
  }, [state]);

  const goToNextStep = useCallback(() => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1];
      
      // Skip approval step if not required
      if (nextStep === 'approve' && !state.stepStates.approval.required) {
        dispatch({ type: 'UPDATE_STEP_STATUS', payload: { step: 'approve', status: 'skipped' } });
        dispatch({ type: 'SET_STEP', payload: 'process' });
      } else {
        dispatch({ type: 'SET_STEP', payload: nextStep });
      }
    }
  }, [getCurrentStepIndex, state.stepStates.approval.required]);

  const goToPreviousStep = useCallback(() => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      const prevStep = stepOrder[currentIndex - 1];
      
      // Skip approval step if it was skipped
      if (prevStep === 'approve' && state.steps.find(s => s.id === 'approve')?.status === 'skipped') {
        dispatch({ type: 'SET_STEP', payload: 'create' });
      } else {
        dispatch({ type: 'SET_STEP', payload: prevStep });
      }
    }
  }, [getCurrentStepIndex, state.steps]);

  const goToStep = useCallback((step: WorkflowStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  // State update helpers
  const setCreationMethod = useCallback((method: CreationMethod) => {
    dispatch({ type: 'SET_CREATION_METHOD', payload: method });
  }, []);

  const updateOrderData = useCallback((data: any) => {
    dispatch({ type: 'UPDATE_ORDER_DATA', payload: data });
  }, []);

  const updateProcessingStep = useCallback((stepId: string, update: Partial<ProcessingStep>) => {
    dispatch({ type: 'UPDATE_PROCESSING_STEP', payload: { stepId, update } });
  }, []);

  const getStepStatus = useCallback((step: WorkflowStep) => {
    return state.steps.find(s => s.id === step);
  }, [state.steps]);

  // Auto-save to localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(`workflow_${state.metadata.workflowId}`);
    if (!savedState) {
      localStorage.setItem(`workflow_${state.metadata.workflowId}`, JSON.stringify(state));
    }
  }, [state]);

  const value: WorkflowContextType = {
    state,
    dispatch: dispatch as any,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    setCreationMethod,
    updateOrderData,
    updateProcessingStep,
    canProceed,
    getCurrentStepIndex,
    getStepStatus
  };

  return (
    <OrderWorkflowContext.Provider value={value}>
      {children}
    </OrderWorkflowContext.Provider>
  );
};

// Custom hook
export const useOrderWorkflow = () => {
  const context = useContext(OrderWorkflowContext);
  if (!context) {
    throw new Error('useOrderWorkflow must be used within OrderWorkflowProvider');
  }
  return context;
};