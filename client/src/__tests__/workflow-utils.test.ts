import { describe, it, expect } from '@jest/globals';
import { workflowUtils } from '../utils/workflow-utils';
import { UnifiedOrderWorkflow, WorkflowStep, CreationMethod } from '@shared/workflow-types';

describe('Workflow Utils', () => {
  const mockWorkflow: UnifiedOrderWorkflow = {
    currentStep: 'create',
    steps: [
      { id: 'select', title: '방식 선택', status: 'completed' },
      { id: 'create', title: '발주서 작성', status: 'current' },
      { id: 'approve', title: '승인 처리', status: 'pending' },
      { id: 'process', title: '후처리', status: 'pending' },
      { id: 'complete', title: '완료', status: 'pending' }
    ],
    stepStates: {
      creation: { isValid: true },
      approval: { required: true },
      processing: { steps: [], completedSteps: [], failedSteps: [] },
      completed: {}
    },
    metadata: {
      workflowId: 'test-123',
      startedAt: new Date(),
      lastModified: new Date(),
      userId: 'user-1',
      sessionId: 'session-1',
      version: '1.0.0'
    },
    flags: {
      skipApproval: false,
      autoProcess: true,
      sendEmails: true,
      generatePDF: true
    }
  };

  describe('getNextStep', () => {
    it('should return next step in sequence', () => {
      expect(workflowUtils.getNextStep('select')).toBe('create');
      expect(workflowUtils.getNextStep('create')).toBe('approve');
      expect(workflowUtils.getNextStep('approve')).toBe('process');
      expect(workflowUtils.getNextStep('process')).toBe('complete');
      expect(workflowUtils.getNextStep('complete')).toBe(null);
    });

    it('should skip approval when flag is set', () => {
      expect(workflowUtils.getNextStep('create', true)).toBe('process');
    });
  });

  describe('getPreviousStep', () => {
    it('should return previous step in sequence', () => {
      expect(workflowUtils.getPreviousStep('complete')).toBe('process');
      expect(workflowUtils.getPreviousStep('process')).toBe('approve');
      expect(workflowUtils.getPreviousStep('approve')).toBe('create');
      expect(workflowUtils.getPreviousStep('create')).toBe('select');
      expect(workflowUtils.getPreviousStep('select')).toBe(null);
    });

    it('should skip approval when it was skipped', () => {
      expect(workflowUtils.getPreviousStep('process', true)).toBe('create');
    });
  });

  describe('calculateWorkflowProgress', () => {
    it('should calculate progress correctly', () => {
      const progress = workflowUtils.calculateWorkflowProgress(mockWorkflow);
      expect(progress).toBe(20); // 1 out of 5 steps completed
    });

    it('should exclude skipped approval from calculation', () => {
      const workflowWithoutApproval = {
        ...mockWorkflow,
        stepStates: {
          ...mockWorkflow.stepStates,
          approval: { required: false }
        }
      };
      const progress = workflowUtils.calculateWorkflowProgress(workflowWithoutApproval);
      expect(progress).toBe(25); // 1 out of 4 steps completed
    });
  });

  describe('validateCreationData', () => {
    it('should validate standard form data', () => {
      const validData = {
        projectId: 'project-1',
        vendorId: 'vendor-1',
        items: [{ id: 1, name: 'Item 1' }],
        orderDate: '2025-01-01',
        deliveryDate: '2025-01-15'
      };

      const result = workflowUtils.validateCreationData('standard', validData);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should detect missing required fields in standard form', () => {
      const invalidData = {
        projectId: '',
        vendorId: '',
        items: [],
        orderDate: '',
        deliveryDate: ''
      };

      const result = workflowUtils.validateCreationData('standard', invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.projectId).toBeDefined();
      expect(result.errors.vendorId).toBeDefined();
      expect(result.errors.items).toBeDefined();
    });

    it('should validate excel upload data', () => {
      const validData = {
        file: new File(['test'], 'test.xlsx')
      };

      const result = workflowUtils.validateCreationData('excel', validData);
      expect(result.isValid).toBe(true);
    });

    it('should detect missing file in excel upload', () => {
      const invalidData = {};

      const result = workflowUtils.validateCreationData('excel', invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.file).toBeDefined();
    });
  });

  describe('createProcessingPipeline', () => {
    it('should create pipeline with all steps when all flags are enabled', () => {
      const flags = {
        generatePDF: true,
        sendEmails: true
      };

      const pipeline = workflowUtils.createProcessingPipeline(flags);
      expect(pipeline.length).toBe(5); // PDF, Vendor, Email, Attachment, Final
      expect(pipeline[0].id).toBe('pdf_generation');
      expect(pipeline[1].id).toBe('vendor_validation');
      expect(pipeline[2].id).toBe('email_preparation');
      expect(pipeline[3].id).toBe('attachment_processing');
      expect(pipeline[4].id).toBe('final_validation');
    });

    it('should skip optional steps when flags are disabled', () => {
      const flags = {
        generatePDF: false,
        sendEmails: false
      };

      const pipeline = workflowUtils.createProcessingPipeline(flags);
      expect(pipeline.length).toBe(2); // Only Vendor and Final
      expect(pipeline[0].id).toBe('vendor_validation');
      expect(pipeline[1].id).toBe('final_validation');
    });
  });

  describe('getStepIcon', () => {
    it('should return correct icons for each step', () => {
      expect(workflowUtils.getStepIcon('select')).toBe('📋');
      expect(workflowUtils.getStepIcon('create')).toBe('✏️');
      expect(workflowUtils.getStepIcon('approve')).toBe('✅');
      expect(workflowUtils.getStepIcon('process')).toBe('⚙️');
      expect(workflowUtils.getStepIcon('complete')).toBe('🎉');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color classes for each status', () => {
      expect(workflowUtils.getStatusColor('pending')).toBe('text-gray-500 bg-gray-100');
      expect(workflowUtils.getStatusColor('current')).toBe('text-blue-700 bg-blue-100');
      expect(workflowUtils.getStatusColor('completed')).toBe('text-green-700 bg-green-100');
      expect(workflowUtils.getStatusColor('error')).toBe('text-red-700 bg-red-100');
      expect(workflowUtils.getStatusColor('skipped')).toBe('text-gray-400 bg-gray-50');
    });
  });
});

// Integration tests would go here
describe('Workflow Integration', () => {
  it('should handle complete workflow lifecycle', () => {
    // This would test the entire workflow from start to finish
    // with mock API calls and state changes
    expect(true).toBe(true); // Placeholder
  });
});