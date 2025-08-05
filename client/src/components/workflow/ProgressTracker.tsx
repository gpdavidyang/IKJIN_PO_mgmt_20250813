import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Clock, Play, ChevronRight, Zap, Timer, CheckCircle2, XCircle, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkflowStep, WorkflowStepInfo } from '@shared/workflow-types';

interface ProgressTrackerProps {
  steps: WorkflowStepInfo[];
  currentStep: WorkflowStep;
  showTimeEstimate?: boolean;
  allowStepNavigation?: boolean;
  onStepClick?: (step: WorkflowStep) => void;
  estimatedTime?: number;
  totalElapsedTime?: number;
  isProcessing?: boolean;
  canRetry?: boolean;
  onRetry?: (step: WorkflowStep) => void;
}

const stepIcons: Record<WorkflowStep, React.ReactNode> = {
  select: '📋',
  create: '✏️',
  approve: '✅',
  process: '⚙️',
  complete: '🎉'
};

const stepLabels: Record<WorkflowStep, string> = {
  select: '방식 선택',
  create: '발주서 작성',
  approve: '승인 처리',
  process: '후처리',
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
    case 'skipped':
      return <Pause className="w-5 h-5 text-gray-400" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const getStepStatusClass = (step: WorkflowStepInfo, isClickable?: boolean) => {
  const baseClass = "relative flex items-center space-x-3 p-4 rounded-lg transition-all duration-300 border transform";
  const hoverClass = isClickable ? "hover:scale-105 hover:shadow-lg cursor-pointer" : "";
  
  switch (step.status) {
    case 'completed':
      return `${baseClass} ${hoverClass} bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-300 shadow-sm`;
    case 'current':
      return `${baseClass} ${hoverClass} bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-300 font-semibold shadow-md ring-2 ring-blue-200 ring-opacity-50`;
    case 'error':
      return `${baseClass} ${hoverClass} bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-300 shadow-sm`;
    case 'skipped':
      return `${baseClass} ${hoverClass} bg-gradient-to-r from-gray-50 to-gray-100 text-gray-500 border-gray-300 opacity-70`;
    default:
      return `${baseClass} ${hoverClass} bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border-gray-200`;
  }
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}초`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
  return `${Math.floor(seconds / 3600)}시간 ${Math.floor((seconds % 3600) / 60)}분`;
};

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  steps,
  currentStep,
  showTimeEstimate = false,
  allowStepNavigation = false,
  onStepClick,
  estimatedTime,
  totalElapsedTime = 0,
  isProcessing = false,
  canRetry = false,
  onRetry
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(totalElapsedTime);

  // 실시간 시계 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (isProcessing) {
        setElapsedSeconds(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isProcessing]);

  const completedSteps = steps.filter(step => step.status === 'completed' || step.status === 'skipped').length;
  const totalSteps = steps.filter(step => step.id !== 'approve' || steps.find(s => s.id === 'approve')?.status !== 'skipped').length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
  const currentStepInfo = steps.find(step => step.status === 'current');
  const hasErrors = steps.some(step => step.status === 'error');

  const handleStepClick = (step: WorkflowStepInfo) => {
    if (allowStepNavigation && onStepClick && !isProcessing) {
      onStepClick(step.id);
    }
  };

  const handleRetry = (step: WorkflowStepInfo) => {
    if (canRetry && onRetry) {
      onRetry(step.id);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-900">진행 상황</h3>
            {isProcessing && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Zap className="w-3 h-3 mr-1" />
                처리 중
              </Badge>
            )}
            {hasErrors && (
              <Badge variant="destructive" className="bg-red-100 text-red-800">
                <AlertCircle className="w-3 h-3 mr-1" />
                오류 발생
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {completedSteps}/{totalSteps} 단계 완료 ({progressPercentage}%)
          </p>
          {currentStepInfo && (
            <p className="text-sm text-blue-600 font-medium mt-1">
              현재: {stepLabels[currentStepInfo.id]}
            </p>
          )}
        </div>
        
        <div className="text-right space-y-2">
          {showTimeEstimate && estimatedTime && (
            <div>
              <div className="text-xs text-gray-500">예상 남은 시간</div>
              <div className="text-lg font-semibold text-blue-600 flex items-center gap-1">
                <Timer className="w-4 h-4" />
                {formatTime(estimatedTime * 60)}
              </div>
            </div>
          )}
          
          {elapsedSeconds > 0 && (
            <div>
              <div className="text-xs text-gray-500">경과 시간</div>
              <div className="text-sm font-medium text-gray-700">
                {formatTime(elapsedSeconds)}
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            {currentTime.toLocaleTimeString('ko-KR')}
          </div>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="relative w-full bg-gray-200 rounded-full h-3 mb-6 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-700 ease-out relative"
          style={{ width: `${progressPercentage}%` }}
        >
          {isProcessing && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
          )}
        </div>
        {progressPercentage > 0 && (
          <div 
            className="absolute top-0 left-0 h-3 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full opacity-50 animate-pulse"
            style={{ width: `${Math.min(progressPercentage + 10, 100)}%` }}
          />
        )}
      </div>

      {/* 단계 목록 */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isClickable = allowStepNavigation && onStepClick && !isProcessing;
          
          return (
            <div key={step.id} className="relative">
              <div
                className={getStepStatusClass(step, isClickable)}
                onClick={() => handleStepClick(step)}
              >
                {/* 단계 아이콘 */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-current bg-white flex items-center justify-center">
                      {getStepIcon(step, isProcessing && step.status === 'current')}
                    </div>
                    {step.status === 'current' && (
                      <div className="absolute -inset-2 border-2 border-blue-400 rounded-full opacity-30 animate-pulse" />
                    )}
                  </div>
                </div>

                {/* 단계 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{stepIcons[step.id]}</span>
                        <div>
                          <h4 className="font-semibold text-base">{stepLabels[step.id]}</h4>
                          {step.description && (
                            <p className="text-sm opacity-80 mt-1">{step.description}</p>
                          )}
                        </div>
                        {step.status === 'current' && isProcessing && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                            <span className="text-xs font-medium">진행 중</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <Badge variant="outline" className="text-xs">
                        {index + 1}/{steps.length}
                      </Badge>
                      {isClickable && (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* 에러 메시지 */}
                  {step.status === 'error' && step.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-red-800 font-medium">오류 발생</p>
                          <p className="text-xs text-red-700 mt-1">{step.error}</p>
                          {canRetry && onRetry && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetry(step);
                              }}
                              variant="outline"
                              size="sm"
                              className="mt-2 h-7 text-xs"
                            >
                              다시 시도
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 시간 정보 */}
                  {step.status === 'completed' && step.startedAt && step.completedAt && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <Timer className="w-3 h-3" />
                      <span>소요 시간: {formatTime(Math.round((step.completedAt.getTime() - step.startedAt.getTime()) / 1000))}</span>
                    </div>
                  )}

                  {/* 현재 진행 중인 단계의 세부 정보 */}
                  {step.status === 'current' && step.progress !== undefined && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>세부 진행률</span>
                        <span>{Math.round(step.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${step.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 성공 애니메이션 */}
                {step.status === 'completed' && (
                  <div className="absolute -inset-1 bg-green-400 rounded-lg opacity-20 animate-ping" 
                       style={{ animationDuration: '2s', animationIterationCount: '1' }} />
                )}
              </div>

              {/* 연결선 */}
              {index < steps.length - 1 && (
                <div className="flex justify-center my-2">
                  <div className={`w-0.5 h-6 ${
                    step.status === 'completed' ? 'bg-green-300' : 
                    step.status === 'current' ? 'bg-blue-300' : 'bg-gray-300'
                  } transition-colors duration-300`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 요약 정보 */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-500">완료된 단계</div>
            <div className="text-xl font-bold text-green-600">{completedSteps}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">전체 단계</div>
            <div className="text-xl font-bold text-gray-900">{totalSteps}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">진행률</div>
            <div className="text-xl font-bold text-blue-600">{progressPercentage}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">상태</div>
            <div className="text-sm font-medium">
              {hasErrors ? (
                <span className="text-red-600">오류 발생</span>
              ) : isProcessing ? (
                <span className="text-blue-600">처리 중</span>
              ) : progressPercentage === 100 ? (
                <span className="text-green-600">완료</span>
              ) : (
                <span className="text-gray-600">대기 중</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;