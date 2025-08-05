import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Save, X } from 'lucide-react';

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
}

const WorkflowContent: React.FC<UnifiedOrderWorkflowProps> = ({
  onComplete,
  onCancel,
  className = ''
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
          <React.Suspense fallback={<div>로딩 중...</div>}>
            <CreateStep
              method={workflow.creationMethod || 'standard'}
              onDataSubmit={submitOrderData}
              disabled={isProcessing}
            />
          </React.Suspense>
        );
        
      case 'approve':
        return (
          <React.Suspense fallback={<div>로딩 중...</div>}>
            <div className="text-center py-8">
              <p className="text-gray-600">승인 단계 컴포넌트 (구현 예정)</p>
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
          <React.Suspense fallback={<div>로딩 중...</div>}>
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
                // 이메일 발송 로직 (추후 구현)
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
                // 보관하기 로직 (추후 구현)
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
          <div className="text-center py-8">
            <p className="text-gray-600">알 수 없는 단계입니다.</p>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* 상단 가로형 진행상황 */}
      <HorizontalProgressTracker 
        steps={workflow.steps}
        currentStep={workflow.currentStep}
        showTimeEstimate={true}
        estimatedTime={estimatedTime}
        isProcessing={isProcessing}
      />
      
      {/* 저장 알림 */}
      {showSaveNotification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Alert className="border-green-200 bg-green-50">
            <Save className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              진행 상황이 저장되었습니다.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* 메인 콘텐츠 영역 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Card className="shadow-lg">
          <CardContent className="p-4 sm:p-8">
              {/* 단계 헤더 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {workflow.steps.find(s => s.id === workflow.currentStep)?.title}
                  </h2>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">
                    {workflow.steps.find(s => s.id === workflow.currentStep)?.description}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 justify-end sm:justify-start">
                  {/* 저장 버튼 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={isProcessing}
                    className="flex-1 sm:flex-initial"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">저장</span>
                    <span className="sm:hidden">저장</span>
                  </Button>
                  
                  {/* 취소 버튼 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isProcessing}
                    className="flex-1 sm:flex-initial"
                  >
                    <X className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">취소</span>
                    <span className="sm:hidden">취소</span>
                  </Button>
                </div>
              </div>

              {/* 현재 단계 콘텐츠 */}
              <div className="min-h-[300px] sm:min-h-[400px]">
                {renderCurrentStep()}
              </div>

              {/* 네비게이션 버튼 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t border-gray-200 space-y-4 sm:space-y-0">
                <Button
                  variant="outline"
                  onClick={goPrevious}
                  disabled={!canGoPrevious || isProcessing}
                  className="flex items-center justify-center space-x-2 w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>이전</span>
                </Button>

                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 text-center">
                  {/* 진행률 표시 */}
                  <div className="text-sm text-gray-600">
                    {workflow.steps.findIndex(s => s.id === workflow.currentStep) + 1} / {workflow.steps.length}
                  </div>
                  
                  {/* 자동 저장 상태 */}
                  <div className="text-xs text-gray-500 hidden sm:block">
                    자동 저장됨
                  </div>
                </div>

                <div className="flex space-x-2 w-full sm:w-auto">
                  {workflow.currentStep === 'process' && (
                    <Button
                      onClick={startProcessing}
                      disabled={isProcessing || !canGoNext}
                      className="flex items-center justify-center space-x-2 flex-1 sm:flex-initial"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="hidden sm:inline">처리 중...</span>
                          <span className="sm:hidden">처리 중</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">처리 시작</span>
                          <span className="sm:hidden">시작</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  )}
                  
                  {workflow.currentStep !== 'process' && workflow.currentStep !== 'complete' && (
                    <Button
                      onClick={goNext}
                      disabled={!canGoNext || isProcessing}
                      className="flex items-center justify-center space-x-2 flex-1 sm:flex-initial"
                    >
                      <span>다음</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {workflow.currentStep === 'complete' && (
                    <Button
                      onClick={() => onComplete?.(workflow.orderData)}
                      className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-initial"
                    >
                      <span>완료</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
};

// 메인 래퍼 컴포넌트
const UnifiedOrderWorkflow: React.FC<UnifiedOrderWorkflowProps> = (props) => {
  return (
    <OrderWorkflowProvider>
      <WorkflowContent {...props} />
    </OrderWorkflowProvider>
  );
};

export default UnifiedOrderWorkflow;