import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HorizontalProgressTracker from '@/components/workflow/HorizontalProgressTracker';
import { WorkflowStepInfo } from '@shared/workflow-types';

describe('HorizontalProgressTracker', () => {
  const mockSteps: WorkflowStepInfo[] = [
    { id: 'select', title: '방식 선택', status: 'completed' },
    { id: 'create', title: '발주서 작성', status: 'current' },
    { id: 'approve', title: '승인 처리', status: 'pending' },
    { id: 'process', title: '후처리', status: 'pending' },
    { id: 'complete', title: '완료', status: 'pending' }
  ];

  describe('Basic Rendering', () => {
    it('should render all steps with correct labels', () => {
      render(<HorizontalProgressTracker steps={mockSteps} currentStep="create" />);
      
      expect(screen.getByText('방식 선택')).toBeInTheDocument();
      expect(screen.getByText('발주서 작성')).toBeInTheDocument();
      expect(screen.getByText('승인 처리')).toBeInTheDocument();
      expect(screen.getByText('후처리')).toBeInTheDocument();
      expect(screen.getByText('완료')).toBeInTheDocument();
    });

    it('should display progress percentage correctly', () => {
      render(<HorizontalProgressTracker steps={mockSteps} currentStep="create" />);
      
      // 1 completed out of 5 steps = 20%
      expect(screen.getByText('1/5 단계 완료 (20%)')).toBeInTheDocument();
    });

    it('should show current step indicator', () => {
      render(<HorizontalProgressTracker steps={mockSteps} currentStep="create" />);
      
      expect(screen.getByText('현재: 발주서 작성')).toBeInTheDocument();
    });

    it('should display estimated time when provided', () => {
      render(
        <HorizontalProgressTracker 
          steps={mockSteps} 
          currentStep="create" 
          showTimeEstimate={true}
          estimatedTime={15}
        />
      );
      
      expect(screen.getByText('예상 남은 시간:')).toBeInTheDocument();
      expect(screen.getByText('15분')).toBeInTheDocument();
    });
  });

  describe('Step Status Indicators', () => {
    it('should show check icon for completed steps', () => {
      const { container } = render(
        <HorizontalProgressTracker steps={mockSteps} currentStep="create" />
      );
      
      // First step is completed, should have check icon
      const completedStep = container.querySelector('.bg-green-500');
      expect(completedStep).toBeInTheDocument();
    });

    it('should show current step with blue highlight', () => {
      const { container } = render(
        <HorizontalProgressTracker steps={mockSteps} currentStep="create" />
      );
      
      const currentStep = container.querySelector('.bg-blue-500');
      expect(currentStep).toBeInTheDocument();
    });

    it('should show pending steps in gray', () => {
      const { container } = render(
        <HorizontalProgressTracker steps={mockSteps} currentStep="create" />
      );
      
      const pendingSteps = container.querySelectorAll('.bg-gray-200');
      expect(pendingSteps.length).toBeGreaterThan(0);
    });
  });

  describe('Processing State', () => {
    it('should show processing indicator when isProcessing is true', () => {
      render(
        <HorizontalProgressTracker 
          steps={mockSteps} 
          currentStep="create" 
          isProcessing={true}
        />
      );
      
      expect(screen.getByText('처리 중')).toBeInTheDocument();
    });

    it('should animate progress bar during processing', () => {
      const { container } = render(
        <HorizontalProgressTracker 
          steps={mockSteps} 
          currentStep="create" 
          isProcessing={true}
        />
      );
      
      const animatedBar = container.querySelector('.animate-pulse');
      expect(animatedBar).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error badge when steps have errors', () => {
      const stepsWithError: WorkflowStepInfo[] = [
        ...mockSteps.slice(0, 2),
        { id: 'approve', title: '승인 처리', status: 'error', error: 'Network error' },
        ...mockSteps.slice(3)
      ];
      
      render(
        <HorizontalProgressTracker 
          steps={stepsWithError} 
          currentStep="approve" 
        />
      );
      
      expect(screen.getByText('오류 발생')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render mobile-optimized labels', () => {
      const { container } = render(
        <HorizontalProgressTracker steps={mockSteps} currentStep="create" />
      );
      
      // Check for responsive classes
      const mobileLabels = container.querySelectorAll('.sm\\:hidden');
      const desktopLabels = container.querySelectorAll('.hidden.sm\\:inline');
      
      expect(mobileLabels.length).toBeGreaterThan(0);
      expect(desktopLabels.length).toBeGreaterThan(0);
    });

    it('should have responsive sizing classes', () => {
      const { container } = render(
        <HorizontalProgressTracker steps={mockSteps} currentStep="create" />
      );
      
      // Check for responsive circle sizes
      const circles = container.querySelectorAll('.w-8.h-8.sm\\:w-10.sm\\:h-10');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should have responsive spacing', () => {
      const { container } = render(
        <HorizontalProgressTracker steps={mockSteps} currentStep="create" />
      );
      
      // Check for responsive margins and padding
      const responsiveElements = container.querySelectorAll('[class*="sm:"]');
      expect(responsiveElements.length).toBeGreaterThan(0);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly for different states', () => {
      const partiallyCompleteSteps: WorkflowStepInfo[] = [
        { id: 'select', title: '방식 선택', status: 'completed' },
        { id: 'create', title: '발주서 작성', status: 'completed' },
        { id: 'approve', title: '승인 처리', status: 'completed' },
        { id: 'process', title: '후처리', status: 'current' },
        { id: 'complete', title: '완료', status: 'pending' }
      ];
      
      render(
        <HorizontalProgressTracker 
          steps={partiallyCompleteSteps} 
          currentStep="process" 
        />
      );
      
      // 3 completed out of 5 steps = 60%
      expect(screen.getByText('3/5 단계 완료 (60%)')).toBeInTheDocument();
    });

    it('should show 100% when all steps are completed', () => {
      const allCompleteSteps: WorkflowStepInfo[] = mockSteps.map(step => ({
        ...step,
        status: 'completed'
      }));
      
      render(
        <HorizontalProgressTracker 
          steps={allCompleteSteps} 
          currentStep="complete" 
        />
      );
      
      expect(screen.getByText('5/5 단계 완료 (100%)')).toBeInTheDocument();
    });
  });

  describe('Connector Lines', () => {
    it('should render connector lines between steps', () => {
      const { container } = render(
        <HorizontalProgressTracker steps={mockSteps} currentStep="create" />
      );
      
      // Should have 4 connectors for 5 steps
      const connectors = container.querySelectorAll('.h-0\\.5.sm\\:h-1.rounded-full');
      expect(connectors.length).toBe(4);
    });

    it('should style completed connectors differently', () => {
      const { container } = render(
        <HorizontalProgressTracker steps={mockSteps} currentStep="create" />
      );
      
      // First connector should be green (between completed and current)
      const connectors = container.querySelectorAll('.bg-green-500');
      expect(connectors.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className when provided', () => {
      const { container } = render(
        <HorizontalProgressTracker 
          steps={mockSteps} 
          currentStep="create" 
          className="custom-class"
        />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Header Information', () => {
    it('should display title and badges in header', () => {
      render(<HorizontalProgressTracker steps={mockSteps} currentStep="create" />);
      
      expect(screen.getByText('발주서 작성')).toBeInTheDocument();
    });

    it('should be responsive in header layout', () => {
      const { container } = render(
        <HorizontalProgressTracker steps={mockSteps} currentStep="create" />
      );
      
      const header = container.querySelector('.flex.flex-col.sm\\:flex-row');
      expect(header).toBeInTheDocument();
    });
  });
});