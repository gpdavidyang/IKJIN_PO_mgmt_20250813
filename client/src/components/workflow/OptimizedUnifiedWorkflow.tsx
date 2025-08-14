import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Save, X, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

import { OrderWorkflowProvider, useOrderWorkflow } from '@/contexts/OrderWorkflowContext';
import { useOrderWorkflow as useWorkflowHook } from '@/hooks/useOrderWorkflow';
import HorizontalProgressTracker from './HorizontalProgressTracker';
import MethodSelection from './MethodSelection';
import PostProcessingPipeline from './PostProcessingPipeline';

// Step 컴포넌트들을 동적으로 임포트
import CreateStep from './steps/CreateStep';
import ApprovalStep from './steps/ApprovalStep';
import CompleteStep from './steps/CompleteStep';

const StepComponents = {
  select: MethodSelection,
  create: CreateStep,
  approve: ApprovalStep, 
  process: PostProcessingPipeline,
  complete: CompleteStep
};

interface UnifiedOrderWorkflowProps {
  onComplete?: (orderData: any) => void;
  onCancel?: () => void;
  className?: string;
  helpContent?: React.ReactNode;
}

const WorkflowContent: React.FC<UnifiedOrderWorkflowProps> = ({
  onComplete,
  onCancel,
  className = '',
  helpContent
}) => {
  const {
    workflow,
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
    saveProgress
  } = useWorkflowHook();

  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleMethodSelect = (method: 'standard' | 'excel') => {
    selectCreationMethod(method);
  };

  const handleSave = () => {
    saveProgress();
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 3000);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const currentStepInfo = workflow.steps.find(s => s.id === workflow.currentStep);
  const currentStepIndex = workflow.steps.findIndex(s => s.id === workflow.currentStep);

  const renderCurrentStep = () => {
    const currentStep = workflow.currentStep;
    
    switch (currentStep) {
      case 'select':
        return (
          <MethodSelection
            onMethodSelect={handleMethodSelect}
            disabled={isProcessing}
          />
        );
        
      case 'create':
        return (
          <React.Suspense fallback={<div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <CreateStep
              method={workflow.creationMethod || 'standard'}
              onDataSubmit={submitOrderData}
              disabled={isProcessing}
            />
          </React.Suspense>
        );
        
      case 'approve':
        return (
          <React.Suspense fallback={<div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">승인 대기 중</h3>
              <p className="text-gray-600">승인 권한자의 검토가 필요합니다.</p>
            </div>
          </React.Suspense>
        );
        
      case 'process':
        return (
          <PostProcessingPipeline
            steps={workflow.stepStates.processing.steps}
            currentStep={currentProcessingStep}
            onRetry={retryProcessingStep}
            isProcessing={isProcessing}
          />
        );
        
      case 'complete':
        return (
          <React.Suspense fallback={<div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <CompleteStep
              orderData={workflow.orderData}
              processingSteps={workflow.stepStates.processing.steps}
              onViewOrders={() => {
                if (onComplete) {
                  onComplete(workflow.orderData);
                } else {
                  window.location.href = '/orders';
                }
              }}
              onCreateNew={() => {
                window.location.href = '/create-order/unified';
              }}
              onViewPDF={() => {
                if (workflow.stepStates.completed.pdfUrl) {
                  window.open(workflow.stepStates.completed.pdfUrl, '_blank');
                }
              }}
              onDownloadPDF={() => {
                if (workflow.stepStates.completed.pdfUrl) {
                  const link = document.createElement('a');
                  link.href = workflow.stepStates.completed.pdfUrl;
                  link.download = `발주서_${workflow.orderData?.orderNumber || 'unknown'}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              onSendEmail={() => {
                console.log('이메일 발송 기능 (구현 예정)');
              }}
              onPrint={() => {
                window.print();
              }}
              onShare={() => {
                if (navigator.share && workflow.orderData?.orderNumber) {
                  navigator.share({
                    title: `발주서 ${workflow.orderData.orderNumber}`,
                    text: '발주서를 공유합니다.',
                    url: window.location.href
                  });
                }
              }}
              onArchive={() => {
                console.log('보관하기 기능 (구현 예정)');
              }}
              onNavigate={(url) => {
                window.location.href = url;
              }}
              disabled={isProcessing}
            />
          </React.Suspense>
        );
        
      default:
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <X className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">알 수 없는 단계</h3>
            <p className="text-gray-600">현재 단계를 인식할 수 없습니다.</p>
          </div>
        );
    }
  };

  return (
    <div className={`h-screen flex flex-col bg-gray-50 ${className}`}>
      {/* 최상단 헤더 - 높이 최소화 */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">발주서 작성</h1>
              <div className="h-4 w-px bg-gray-300"></div>
              <span className="text-sm text-gray-600">{currentStepInfo?.title}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isProcessing}
                className="text-gray-600 hover:text-gray-900"
              >
                <Save className="w-4 h-4 mr-1" />
                저장
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isProcessing}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="w-4 h-4 mr-1" />
                취소
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 저장 알림 - 절대 위치로 최소 공간 사용 */}
      {showSaveNotification && (
        <div className="absolute top-16 right-6 z-50">
          <Alert className="border-green-200 bg-green-50 shadow-lg">
            <Save className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              저장되었습니다
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 사이드바 - 진행상황 및 네비게이션 */}
        <div className={`bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-80'
        }`}>
          {/* 사이드바 토글 버튼 */}
          <div className="p-4 border-b border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full justify-between"
            >
              {!sidebarCollapsed && <span className="text-sm font-medium">진행 상황</span>}
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>

          {!sidebarCollapsed && (
            <>
              {/* 세로형 단계 표시 */}
              <div className="p-4">
                <div className="space-y-4">
                  {workflow.steps.map((step, index) => {
                    const isActive = step.id === workflow.currentStep;
                    const isCompleted = index < currentStepIndex;
                    const isClickable = index <= currentStepIndex;
                    
                    return (
                      <div key={step.id} className="flex items-start space-x-3">
                        {/* 단계 번호 */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          isCompleted 
                            ? 'bg-green-500 text-white' 
                            : isActive 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-200 text-gray-600'
                        }`}>
                          {isCompleted ? '✓' : index + 1}
                        </div>
                        
                        {/* 단계 정보 */}
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => isClickable && goToStep(step.id)}
                            disabled={!isClickable}
                            className={`text-left w-full ${
                              isClickable ? 'cursor-pointer hover:text-blue-600' : 'cursor-not-allowed'
                            }`}
                          >
                            <h3 className={`text-sm font-medium truncate ${
                              isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-700'
                            }`}>
                              {step.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {step.description}
                            </p>
                          </button>
                          
                          {/* 진행률 바 */}
                          {isActive && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              {estimatedTime && (
                                <p className="text-xs text-gray-500 mt-1">
                                  예상 소요: {estimatedTime}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 네비게이션 버튼 */}
              <div className="p-4 border-t border-gray-100 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goPrevious}
                  disabled={!canGoPrevious || isProcessing}
                  className="w-full justify-start"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  이전 단계
                </Button>

                {workflow.currentStep === 'process' ? (
                  <Button
                    onClick={startProcessing}
                    disabled={isProcessing || !canGoNext}
                    className="w-full justify-start"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        처리 시작
                      </>
                    )}
                  </Button>
                ) : workflow.currentStep === 'complete' ? (
                  <Button
                    onClick={() => onComplete?.(workflow.orderData)}
                    className="w-full justify-start bg-green-600 hover:bg-green-700"
                  >
                    완료
                  </Button>
                ) : (
                  <Button
                    onClick={goNext}
                    disabled={!canGoNext || isProcessing}
                    className="w-full justify-start"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    다음 단계
                  </Button>
                )}
              </div>
            </>
          )}

          {/* 축소된 사이드바 */}
          {sidebarCollapsed && (
            <div className="p-2">
              <div className="space-y-2">
                {workflow.steps.map((step, index) => {
                  const isActive = step.id === workflow.currentStep;
                  const isCompleted = index < currentStepIndex;
                  
                  return (
                    <div key={step.id} className="flex justify-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isCompleted 
                          ? 'bg-green-500 text-white' 
                          : isActive 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 text-gray-600'
                      }`}>
                        {isCompleted ? '✓' : index + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 메인 콘텐츠 영역 - UI Standards 1366px 최대 너비 적용 */}
        <div className="flex-1 overflow-auto flex flex-col">
          <div className="flex-1 p-6">
            <div className="max-w-[1366px] mx-auto">
              <Card className="h-full shadow-sm">
                <CardContent className="h-full p-6 flex flex-col">
                  {/* 단계 제목 - 최소화 */}
                  <div className="flex-shrink-0 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {currentStepInfo?.title}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {currentStepInfo?.description}
                    </p>
                  </div>

                  {/* 현재 단계 콘텐츠 - 전체 높이 활용 */}
                  <div className="flex-1 overflow-auto">
                    {renderCurrentStep()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* 도움말 섹션 - 하단 고정 */}
          {helpContent && (
            <div className="flex-shrink-0">
              {helpContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 메인 래퍼 컴포넌트
const OptimizedUnifiedWorkflow: React.FC<UnifiedOrderWorkflowProps> = (props) => {
  return (
    <OrderWorkflowProvider>
      <WorkflowContent {...props} />
    </OrderWorkflowProvider>
  );
};

export default OptimizedUnifiedWorkflow;