import { renderHook, act } from '@testing-library/react';
import { useOrderWorkflow } from '@/hooks/useOrderWorkflow';
import { OrderWorkflowProvider } from '@/contexts/OrderWorkflowContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <OrderWorkflowProvider>
      {children}
    </OrderWorkflowProvider>
  </QueryClientProvider>
);

describe('useOrderWorkflow Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('should initialize with select step', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      expect(result.current.workflow.currentStep).toBe('select');
      expect(result.current.workflow.creationMethod).toBeNull();
      expect(result.current.workflow.orderData).toBeNull();
    });

    it('should have correct initial step states', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      expect(result.current.workflow.steps).toHaveLength(5);
      expect(result.current.workflow.steps[0].status).toBe('current');
      expect(result.current.workflow.steps[1].status).toBe('pending');
    });

    it('should not allow navigation initially', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      expect(result.current.canGoNext).toBe(false);
      expect(result.current.canGoPrevious).toBe(false);
    });
  });

  describe('Method Selection', () => {
    it('should select excel method and advance to create step', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      act(() => {
        result.current.selectCreationMethod('excel');
      });
      
      expect(result.current.workflow.creationMethod).toBe('excel');
      expect(result.current.workflow.currentStep).toBe('create');
      expect(result.current.workflow.steps[0].status).toBe('completed');
      expect(result.current.workflow.steps[1].status).toBe('current');
    });

    it('should select standard method and advance to create step', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      act(() => {
        result.current.selectCreationMethod('standard');
      });
      
      expect(result.current.workflow.creationMethod).toBe('standard');
      expect(result.current.workflow.currentStep).toBe('create');
    });
  });

  describe('Navigation', () => {
    it('should navigate forward when allowed', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      // Select method first
      act(() => {
        result.current.selectCreationMethod('excel');
      });
      
      // Submit data to enable next
      act(() => {
        result.current.submitOrderData({ test: 'data' });
      });
      
      expect(result.current.canGoNext).toBe(true);
      
      act(() => {
        result.current.goNext();
      });
      
      expect(result.current.workflow.currentStep).toBe('approve');
    });

    it('should navigate backward when allowed', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      // Navigate to create step
      act(() => {
        result.current.selectCreationMethod('excel');
      });
      
      expect(result.current.canGoPrevious).toBe(true);
      
      act(() => {
        result.current.goPrevious();
      });
      
      expect(result.current.workflow.currentStep).toBe('select');
    });

    it('should jump to specific step', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      act(() => {
        result.current.selectCreationMethod('excel');
        result.current.submitOrderData({ test: 'data' });
      });
      
      act(() => {
        result.current.goToStep('process');
      });
      
      expect(result.current.workflow.currentStep).toBe('process');
    });
  });

  describe('Data Management', () => {
    it('should submit order data and update state', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      act(() => {
        result.current.selectCreationMethod('standard');
      });
      
      const testData = {
        orderNumber: 'PO-001',
        items: [{ name: 'Item 1', quantity: 10 }]
      };
      
      act(() => {
        result.current.submitOrderData(testData);
      });
      
      expect(result.current.workflow.orderData).toEqual(testData);
      expect(result.current.workflow.stepStates.create.completed).toBe(true);
    });

    it('should update step data', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      act(() => {
        result.current.selectCreationMethod('excel');
        result.current.updateStepData('create', { fileName: 'test.xlsx' });
      });
      
      expect(result.current.workflow.stepStates.create.data).toEqual({ fileName: 'test.xlsx' });
    });
  });

  describe('Processing State', () => {
    it('should start processing and update state', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      // Navigate to process step
      act(() => {
        result.current.selectCreationMethod('excel');
        result.current.submitOrderData({ test: 'data' });
        result.current.goToStep('process');
      });
      
      expect(result.current.isProcessing).toBe(false);
      
      act(() => {
        result.current.startProcessing();
      });
      
      expect(result.current.isProcessing).toBe(true);
      expect(result.current.currentProcessingStep).toBe(0);
    });

    it('should handle processing step completion', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      // Setup and start processing
      act(() => {
        result.current.selectCreationMethod('excel');
        result.current.submitOrderData({ test: 'data' });
        result.current.goToStep('process');
        result.current.startProcessing();
      });
      
      // Complete first processing step
      act(() => {
        result.current.completeProcessingStep(0);
      });
      
      expect(result.current.workflow.stepStates.processing.steps[0].status).toBe('completed');
      expect(result.current.currentProcessingStep).toBe(1);
    });

    it('should retry failed processing step', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      // Setup with failed step
      act(() => {
        result.current.selectCreationMethod('excel');
        result.current.submitOrderData({ test: 'data' });
        result.current.goToStep('process');
        result.current.workflow.stepStates.processing.steps[0].status = 'error';
      });
      
      act(() => {
        result.current.retryProcessingStep(0);
      });
      
      expect(result.current.workflow.stepStates.processing.steps[0].status).toBe('pending');
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate overall progress correctly', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      expect(result.current.progress).toBe(0);
      
      act(() => {
        result.current.selectCreationMethod('excel');
      });
      
      expect(result.current.progress).toBe(20); // 1/5 steps
      
      act(() => {
        result.current.submitOrderData({ test: 'data' });
        result.current.goNext();
      });
      
      expect(result.current.progress).toBe(40); // 2/5 steps
    });

    it('should estimate remaining time', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      act(() => {
        result.current.selectCreationMethod('standard');
      });
      
      expect(result.current.estimatedTime).toBeGreaterThan(0);
    });
  });

  describe('Persistence', () => {
    it('should save progress to localStorage', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      act(() => {
        result.current.selectCreationMethod('excel');
        result.current.submitOrderData({ test: 'data' });
        result.current.saveProgress();
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'order-workflow-state',
        expect.any(String)
      );
    });

    it('should load progress from localStorage', () => {
      const savedState = {
        currentStep: 'create',
        creationMethod: 'excel',
        orderData: { test: 'data' },
        steps: [],
        stepStates: {}
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));
      
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      act(() => {
        result.current.loadProgress();
      });
      
      expect(result.current.workflow.currentStep).toBe('create');
      expect(result.current.workflow.creationMethod).toBe('excel');
    });

    it('should clear saved progress', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      act(() => {
        result.current.clearProgress();
      });
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('order-workflow-state');
    });
  });

  describe('Validation', () => {
    it('should validate step completion before allowing navigation', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      act(() => {
        result.current.selectCreationMethod('excel');
      });
      
      // Should not allow next without data submission
      expect(result.current.canGoNext).toBe(false);
      
      act(() => {
        result.current.submitOrderData({ test: 'data' });
      });
      
      // Should allow next after data submission
      expect(result.current.canGoNext).toBe(true);
    });

    it('should handle validation errors', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      act(() => {
        result.current.selectCreationMethod('standard');
        result.current.updateStepData('create', { error: 'Validation failed' });
      });
      
      expect(result.current.workflow.stepStates.create.error).toBe('Validation failed');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset workflow to initial state', () => {
      const { result } = renderHook(() => useOrderWorkflow(), { wrapper });
      
      // Setup some progress
      act(() => {
        result.current.selectCreationMethod('excel');
        result.current.submitOrderData({ test: 'data' });
        result.current.goNext();
      });
      
      act(() => {
        result.current.resetWorkflow();
      });
      
      expect(result.current.workflow.currentStep).toBe('select');
      expect(result.current.workflow.creationMethod).toBeNull();
      expect(result.current.workflow.orderData).toBeNull();
    });
  });
});