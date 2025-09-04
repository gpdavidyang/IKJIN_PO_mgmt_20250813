import React from 'react';
import { 
  FileText, 
  UserCheck, 
  Send, 
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderStatus, ApprovalStatus } from '@shared/order-types';

interface WorkflowStep {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'pending' | 'error' | 'skipped';
  icon: React.ReactNode;
  timestamp?: Date;
}

interface WorkflowProgressProps {
  orderStatus: OrderStatus;
  approvalStatus: ApprovalStatus;
  currentStep?: string;
  nextStep?: string;
  estimatedCompletion?: Date;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function WorkflowProgress({
  orderStatus,
  approvalStatus,
  currentStep,
  nextStep,
  estimatedCompletion,
  className,
  orientation = 'horizontal'
}: WorkflowProgressProps) {
  
  // Generate workflow steps based on status
  const getWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = [];
    
    // Step 1: Draft/Create
    steps.push({
      id: 'draft',
      title: '발주서 작성',
      description: '발주 정보 입력',
      status: orderStatus !== 'draft' ? 'completed' : 'current',
      icon: <FileText className="h-4 w-4" />
    });
    
    // Step 2: Approval (if needed)
    if (approvalStatus !== 'not_required') {
      let approvalStepStatus: WorkflowStep['status'] = 'pending';
      
      if (approvalStatus === 'approved') {
        approvalStepStatus = 'completed';
      } else if (approvalStatus === 'rejected') {
        approvalStepStatus = 'error';
      } else if (approvalStatus === 'pending' && orderStatus === 'created') {
        approvalStepStatus = 'current';
      }
      
      steps.push({
        id: 'approval',
        title: '승인',
        description: approvalStatus === 'rejected' ? '반려됨' : '승인 진행',
        status: approvalStepStatus,
        icon: <UserCheck className="h-4 w-4" />
      });
    }
    
    // Step 3: Send
    steps.push({
      id: 'send',
      title: '발송',
      description: '거래처 전송',
      status: orderStatus === 'sent' || orderStatus === 'delivered' ? 'completed' : 
              orderStatus === 'created' && (approvalStatus === 'approved' || approvalStatus === 'not_required') ? 'current' : 
              'pending',
      icon: <Send className="h-4 w-4" />
    });
    
    // Step 4: Delivery
    steps.push({
      id: 'delivery',
      title: '납품',
      description: '물품 수령',
      status: orderStatus === 'delivered' ? 'completed' : 
              orderStatus === 'sent' ? 'current' : 
              'pending',
      icon: <Package className="h-4 w-4" />
    });
    
    return steps;
  };
  
  const steps = getWorkflowSteps();
  const isVertical = orientation === 'vertical';
  
  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'current':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'skipped':
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };
  
  const getStepColor = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-100 border-green-600 text-green-700';
      case 'current':
        return 'bg-blue-100 border-blue-600 text-blue-700 ring-2 ring-blue-200';
      case 'error':
        return 'bg-red-100 border-red-600 text-red-700';
      case 'skipped':
        return 'bg-gray-100 border-gray-400 text-gray-500';
      default:
        return 'bg-gray-50 border-gray-300 text-gray-500';
    }
  };
  
  const getConnectorColor = (step: WorkflowStep, index: number) => {
    if (index === 0) return '';
    
    const prevStep = steps[index - 1];
    if (prevStep.status === 'completed' && step.status !== 'pending') {
      return 'bg-green-600';
    } else if (prevStep.status === 'completed') {
      return 'bg-gray-300';
    }
    return 'bg-gray-200';
  };
  
  return (
    <div className={cn('w-full', className)}>
      {/* Progress Steps */}
      <div className={cn(
        'flex',
        isVertical ? 'flex-col space-y-4' : 'items-center justify-between'
      )}>
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center',
              !isVertical && index < steps.length - 1 && 'flex-1'
            )}
          >
            {/* Step */}
            <div className={cn(
              'relative flex items-center',
              isVertical && 'w-full'
            )}>
              {/* Connector Line (before) */}
              {index > 0 && !isVertical && (
                <div className={cn(
                  'absolute -left-1/2 w-full h-0.5',
                  getConnectorColor(step, index)
                )} />
              )}
              
              {/* Step Circle */}
              <div className={cn(
                'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2',
                getStepColor(step)
              )}>
                {step.status === 'current' ? getStepIcon(step) : step.icon}
              </div>
              
              {/* Step Content */}
              <div className={cn(
                'ml-3',
                isVertical ? 'flex-1' : 'min-w-[80px]'
              )}>
                <div className={cn(
                  'font-medium text-sm',
                  step.status === 'completed' ? 'text-gray-900' : 
                  step.status === 'current' ? 'text-blue-700' :
                  step.status === 'error' ? 'text-red-700' : 
                  'text-gray-500'
                )}>
                  {step.title}
                </div>
                {step.description && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {step.description}
                  </div>
                )}
              </div>
              
              {/* Vertical Connector */}
              {isVertical && index < steps.length - 1 && (
                <div className={cn(
                  'absolute top-10 left-5 w-0.5 h-8',
                  getConnectorColor(steps[index + 1], index + 1)
                )} />
              )}
            </div>
            
            {/* Horizontal Connector (after) */}
            {!isVertical && index < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-2',
                getConnectorColor(steps[index + 1], index + 1)
              )} />
            )}
          </div>
        ))}
      </div>
      
      {/* Status Summary */}
      {(currentStep || nextStep || estimatedCompletion) && (
        <div className={cn(
          'mt-4 p-3 bg-gray-50 rounded-lg text-sm',
          isVertical ? 'w-full' : 'text-center'
        )}>
          {currentStep && (
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="h-4 w-4" />
              <span>현재 단계: <strong>{currentStep}</strong></span>
            </div>
          )}
          
          {nextStep && (
            <div className="flex items-center gap-2 text-gray-600 mt-1">
              <AlertCircle className="h-4 w-4" />
              <span>다음 단계: {nextStep}</span>
            </div>
          )}
          
          {estimatedCompletion && (
            <div className="text-gray-500 mt-1">
              예상 완료: {new Date(estimatedCompletion).toLocaleString('ko-KR')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}