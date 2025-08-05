import React from 'react';
import { Check, Clock, Play, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WorkflowStep, WorkflowStepInfo } from '@shared/workflow-types';

interface HorizontalProgressTrackerProps {
  steps: WorkflowStepInfo[];
  currentStep: WorkflowStep;
  showTimeEstimate?: boolean;
  estimatedTime?: number;
  isProcessing?: boolean;
  className?: string;
}

const stepLabels: Record<WorkflowStep, string> = {
  select: '방식 선택',
  create: '발주서 작성',
  approve: '승인 처리',
  process: '후처리',
  complete: '완료'
};

const stepLabelsMobile: Record<WorkflowStep, string> = {
  select: '선택',
  create: '작성',
  approve: '승인',
  process: '처리',
  complete: '완료'
};

const getStepIcon = (step: WorkflowStepInfo, isProcessing?: boolean) => {
  switch (step.status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case 'current':
      return isProcessing ? (
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        <Play className="w-5 h-5 text-blue-600" />
      );
    case 'error':
      return <XCircle className="w-5 h-5 text-red-600" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const getStepCircleClass = (step: WorkflowStepInfo) => {
  const baseClass = "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-medium text-xs sm:text-sm transition-all duration-300";
  
  switch (step.status) {
    case 'completed':
      return `${baseClass} bg-green-500 text-white shadow-md`;
    case 'current':
      return `${baseClass} bg-blue-500 text-white shadow-lg ring-2 sm:ring-4 ring-blue-200 ring-opacity-50`;
    case 'error':
      return `${baseClass} bg-red-500 text-white shadow-md`;
    default:
      return `${baseClass} bg-gray-200 text-gray-500`;
  }
};

const getConnectorClass = (step: WorkflowStepInfo, nextStep?: WorkflowStepInfo) => {
  if (step.status === 'completed') {
    return 'bg-green-500';
  } else if (step.status === 'current' && nextStep?.status === 'pending') {
    return 'bg-gradient-to-r from-blue-500 to-gray-300';
  }
  return 'bg-gray-300';
};

const HorizontalProgressTracker: React.FC<HorizontalProgressTrackerProps> = ({
  steps,
  currentStep,
  showTimeEstimate = false,
  estimatedTime,
  isProcessing = false,
  className = ''
}) => {
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
  const currentStepInfo = steps.find(step => step.status === 'current');
  const hasErrors = steps.some(step => step.status === 'error');

  return (
    <div className={`bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 헤더 정보 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">발주서 작성</h2>
            <div className="flex items-center space-x-2">
              {isProcessing && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                  처리 중
                </Badge>
              )}
              {hasErrors && (
                <Badge variant="destructive" className="bg-red-100 text-red-800 text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  오류 발생
                </Badge>
              )}
            </div>
          </div>
          
          <div className="text-left sm:text-right">
            <div className="text-sm text-gray-600">
              {completedSteps}/{totalSteps} 단계 완료 ({progressPercentage}%)
            </div>
            {currentStepInfo && (
              <div className="text-sm text-blue-600 font-medium">
                현재: <span className="sm:hidden">{stepLabelsMobile[currentStepInfo.id]}</span>
                <span className="hidden sm:inline">{stepLabels[currentStepInfo.id]}</span>
              </div>
            )}
          </div>
        </div>

        {/* 가로형 진행 단계 */}
        <div className="relative">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                {/* 단계 원형 인디케이터 */}
                <div className="relative flex flex-col items-center">
                  <div className={getStepCircleClass(step)}>
                    {step.status === 'completed' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  
                  {/* 단계 라벨 */}
                  <div className="mt-3 text-center">
                    <div className={`text-xs sm:text-sm font-medium ${
                      step.status === 'current' ? 'text-blue-600' : 
                      step.status === 'completed' ? 'text-green-600' :
                      step.status === 'error' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {/* 모바일에서는 단축된 라벨, 데스크톱에서는 전체 라벨 */}
                      <span className="sm:hidden">{stepLabelsMobile[step.id]}</span>
                      <span className="hidden sm:inline">{stepLabels[step.id]}</span>
                    </div>
                    {step.status === 'current' && (
                      <div className="text-xs text-blue-500 mt-1 hidden sm:block">
                        {isProcessing ? '진행 중...' : '현재 단계'}
                      </div>
                    )}
                    {step.status === 'error' && step.error && (
                      <div className="text-xs text-red-500 mt-1 max-w-16 sm:max-w-24 truncate" title={step.error}>
                        오류
                      </div>
                    )}
                  </div>
                </div>

                {/* 연결선 */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-4">
                    <div className={`h-0.5 sm:h-1 rounded-full transition-all duration-500 ${
                      getConnectorClass(step, steps[index + 1])
                    }`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 전체 진행률 바 */}
        <div className="mt-6 sm:mt-8">
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-2">
            <span>전체 진행률</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${progressPercentage}%` }}
            >
              {isProcessing && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* 시간 정보 (선택적) */}
        {showTimeEstimate && estimatedTime && (
          <div className="mt-3 sm:mt-4 text-center">
            <div className="text-xs sm:text-sm text-gray-600">
              예상 남은 시간: <span className="font-medium text-blue-600">{estimatedTime}분</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HorizontalProgressTracker;