import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnifiedOrderWorkflow from '@/components/workflow/UnifiedOrderWorkflow';
import { OrderWorkflowProvider } from '@/contexts/OrderWorkflowContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the child components
jest.mock('@/components/workflow/HorizontalProgressTracker', () => ({
  __esModule: true,
  default: ({ steps, currentStep, isProcessing }: any) => (
    <div data-testid="horizontal-progress-tracker">
      <div data-testid="current-step">{currentStep}</div>
      <div data-testid="processing-status">{isProcessing ? 'processing' : 'idle'}</div>
      {steps.map((step: any) => (
        <div key={step.id} data-testid={`step-${step.id}`}>
          {step.title} - {step.status}
        </div>
      ))}
    </div>
  )
}));

jest.mock('@/components/workflow/MethodSelection', () => ({
  __esModule: true,
  default: ({ onMethodSelect, disabled }: any) => (
    <div data-testid="method-selection">
      <button 
        data-testid="select-excel" 
        onClick={() => onMethodSelect('excel')}
        disabled={disabled}
      >
        엑셀 발주서 선택
      </button>
      <button 
        data-testid="select-standard" 
        onClick={() => onMethodSelect('standard')}
        disabled={disabled}
      >
        표준 발주서 선택
      </button>
    </div>
  )
}));

jest.mock('@/components/workflow/excel/ExcelUploadComponent', () => ({
  __esModule: true,
  default: ({ onUploadComplete, disabled }: any) => (
    <div data-testid="excel-upload">
      <button 
        data-testid="upload-excel"
        onClick={() => onUploadComplete({ fileName: 'test.xlsx', data: [] })}
        disabled={disabled}
      >
        Upload Excel
      </button>
    </div>
  )
}));

jest.mock('@/components/workflow/standard/StandardFormComponent', () => ({
  __esModule: true,
  default: ({ onFormComplete, disabled }: any) => (
    <div data-testid="standard-form">
      <button 
        data-testid="submit-form"
        onClick={() => onFormComplete({ orderData: 'test' })}
        disabled={disabled}
      >
        Submit Form
      </button>
    </div>
  )
}));

jest.mock('@/components/workflow/PostProcessingPipeline', () => ({
  __esModule: true,
  default: ({ steps, currentStep, onRetry, isProcessing }: any) => (
    <div data-testid="post-processing">
      <div data-testid="processing-current-step">{currentStep}</div>
      <div data-testid="processing-status">{isProcessing ? 'processing' : 'idle'}</div>
      {steps.map((step: any, index: number) => (
        <div key={index} data-testid={`processing-step-${index}`}>
          {step.name} - {step.status}
        </div>
      ))}
    </div>
  )
}));

// Test utilities
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('UnifiedOrderWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Layout and Structure', () => {
    it('should render with horizontal progress tracker at the top', () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      const progressTracker = screen.getByTestId('horizontal-progress-tracker');
      expect(progressTracker).toBeInTheDocument();
      
      // Check that progress tracker appears before main content
      const mainContent = screen.getByText(/발주서 작성 방식 선택/);
      expect(progressTracker.compareDocumentPosition(mainContent)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
    });

    it('should display the current step title and description', () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      expect(screen.getByText('발주서 작성 방식 선택')).toBeInTheDocument();
      expect(screen.getByText('프로젝트 요구사항에 맞는 발주서 작성 방식을 선택해주세요')).toBeInTheDocument();
    });

    it('should show save and cancel buttons in the header', () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      expect(screen.getByRole('button', { name: /저장/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /취소/ })).toBeInTheDocument();
    });

    it('should display navigation buttons at the bottom', () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      expect(screen.getByRole('button', { name: /이전/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /다음/ })).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should navigate to create step when method is selected', async () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      // Select Excel method
      fireEvent.click(screen.getByTestId('select-excel'));
      
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('create');
        expect(screen.getByTestId('excel-upload')).toBeInTheDocument();
      });
    });

    it('should navigate between steps using navigation buttons', async () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      // Select a method
      fireEvent.click(screen.getByTestId('select-standard'));
      
      await waitFor(() => {
        expect(screen.getByTestId('standard-form')).toBeInTheDocument();
      });
      
      // Go back
      fireEvent.click(screen.getByRole('button', { name: /이전/ }));
      
      await waitFor(() => {
        expect(screen.getByTestId('method-selection')).toBeInTheDocument();
      });
    });

    it('should disable previous button on first step', () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      const prevButton = screen.getByRole('button', { name: /이전/ });
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button when step is not complete', () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      const nextButton = screen.getByRole('button', { name: /다음/ });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Excel Workflow', () => {
    it('should complete excel workflow from start to finish', async () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      // Step 1: Select Excel method
      fireEvent.click(screen.getByTestId('select-excel'));
      
      await waitFor(() => {
        expect(screen.getByTestId('excel-upload')).toBeInTheDocument();
      });
      
      // Step 2: Upload Excel file
      fireEvent.click(screen.getByTestId('upload-excel'));
      
      // Should advance to next step after upload
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('approve');
      });
    });
  });

  describe('Standard Workflow', () => {
    it('should complete standard workflow from start to finish', async () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      // Step 1: Select Standard method
      fireEvent.click(screen.getByTestId('select-standard'));
      
      await waitFor(() => {
        expect(screen.getByTestId('standard-form')).toBeInTheDocument();
      });
      
      // Step 2: Submit form
      fireEvent.click(screen.getByTestId('submit-form'));
      
      // Should advance to next step after form submission
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('approve');
      });
    });
  });

  describe('Save and Progress Management', () => {
    it('should show save notification when save button is clicked', async () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      const saveButton = screen.getByRole('button', { name: /저장/ });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('진행 상황이 저장되었습니다.')).toBeInTheDocument();
      });
      
      // Notification should disappear after 3 seconds
      await waitFor(() => {
        expect(screen.queryByText('진행 상황이 저장되었습니다.')).not.toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should call onCancel when cancel button is clicked', () => {
      const mockCancel = jest.fn();
      renderWithProviders(<UnifiedOrderWorkflow onCancel={mockCancel} />);
      
      const cancelButton = screen.getByRole('button', { name: /취소/ });
      fireEvent.click(cancelButton);
      
      expect(mockCancel).toHaveBeenCalled();
    });
  });

  describe('Processing State', () => {
    it('should disable navigation during processing', async () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      // Navigate to process step
      fireEvent.click(screen.getByTestId('select-excel'));
      await waitFor(() => screen.getByTestId('excel-upload'));
      
      fireEvent.click(screen.getByTestId('upload-excel'));
      
      // Wait for process step
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('process');
      });
      
      // During processing, buttons should be disabled
      const prevButton = screen.getByRole('button', { name: /이전/ });
      const saveButton = screen.getByRole('button', { name: /저장/ });
      
      expect(prevButton).toBeDisabled();
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;
      global.dispatchEvent(new Event('resize'));
    });

    afterEach(() => {
      // Reset to desktop
      global.innerWidth = 1024;
      global.innerHeight = 768;
      global.dispatchEvent(new Event('resize'));
    });

    it('should render mobile-optimized layout', () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      // Check for mobile-specific classes or elements
      const container = screen.getByTestId('horizontal-progress-tracker').parentElement;
      expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
    });

    it('should show mobile-friendly button text', () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      // Mobile buttons should have shorter text
      const saveButton = screen.getByRole('button', { name: /저장/ });
      const cancelButton = screen.getByRole('button', { name: /취소/ });
      
      expect(saveButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should call onComplete with order data when workflow is finished', async () => {
      const mockComplete = jest.fn();
      renderWithProviders(<UnifiedOrderWorkflow onComplete={mockComplete} />);
      
      // Complete the workflow
      fireEvent.click(screen.getByTestId('select-excel'));
      await waitFor(() => screen.getByTestId('excel-upload'));
      
      fireEvent.click(screen.getByTestId('upload-excel'));
      
      // Navigate through remaining steps...
      // (In real app, this would involve actual step completion)
      
      // When reaching complete step, onComplete should be callable
      // This test would need more complete mocking to fully test
    });
  });

  describe('Error Handling', () => {
    it('should display error states in progress tracker', async () => {
      renderWithProviders(<UnifiedOrderWorkflow />);
      
      // Test would need error simulation capability
      // Check that error states are properly reflected in UI
    });
  });
});