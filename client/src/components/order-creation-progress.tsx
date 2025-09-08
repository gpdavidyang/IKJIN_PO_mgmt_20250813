/**
 * 발주서 생성 진행상황 표시 컴포넌트
 * 
 * 직접 입력과 엑셀 업로드 방식 모두에서 공통으로 사용
 * SSE를 통한 실시간 진행상황 추적
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { useTheme } from '@/components/ui/theme-provider';

interface ProgressStep {
  step: string;
  message: string;
  progress: number;
  completed: boolean;
  error?: string;
}

interface OrderCreationProgressProps {
  sessionId: string;
  onComplete: (result: OrderCreationResult) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

interface OrderCreationResult {
  success: boolean;
  orderId?: number;
  orderNumber?: string;
  pdfGenerated?: boolean;
  attachmentId?: number;
}

const STEP_MESSAGES = {
  validation: '입력 데이터 검증',
  preparation: '데이터 준비',
  saving: '데이터베이스 저장',
  attachments: '첨부파일 처리',
  pdf: 'PDF 생성',
  status: '상태 업데이트',
  complete: '완료',
  error: '오류 발생'
};

export function OrderCreationProgress({ 
  sessionId, 
  onComplete, 
  onError, 
  onCancel,
  showCancelButton = false 
}: OrderCreationProgressProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const [currentStep, setCurrentStep] = useState<ProgressStep | null>(null);
  const [allSteps, setAllSteps] = useState<ProgressStep[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  // SSE 연결 설정
  const connectToProgressStream = useCallback(() => {
    if (isCancelled) return;
    
    // 이미 연결되어 있으면 종료
    if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
      console.log('📡 기존 SSE 연결 종료');
      eventSource.close();
      setEventSource(null);
    }
    
    console.log(`📡 SSE 연결 시작 - 세션: ${sessionId}`);
    
    const es = new EventSource(`/api/orders/progress/${sessionId}`);
    
    es.onopen = () => {
      console.log('📡 SSE 연결됨');
      setIsConnected(true);
      setHasError(false);
    };
    
    es.onmessage = (event) => {
      try {
        const progressData: ProgressStep = JSON.parse(event.data);
        console.log('📊 진행상황 업데이트:', progressData);
        
        setCurrentStep(progressData);
        setAllSteps(prev => {
          const newSteps = [...prev];
          const existingIndex = newSteps.findIndex(s => s.step === progressData.step);
          
          if (existingIndex >= 0) {
            newSteps[existingIndex] = progressData;
          } else {
            newSteps.push(progressData);
          }
          
          return newSteps;
        });
        
        // 완료 또는 오류 처리
        if (progressData.error) {
          setHasError(true);
          onError(progressData.error);
        } else if (progressData.completed && progressData.step === 'complete') {
          // 완료 처리
          onComplete({
            success: true,
            orderId: undefined, // API 응답에서 받아올 예정
            orderNumber: undefined,
            pdfGenerated: true,
          });
        }
      } catch (error) {
        console.error('진행상황 데이터 파싱 오류:', error);
      }
    };
    
    es.onerror = (error) => {
      console.error('📡 SSE 연결 오류:', error);
      setIsConnected(false);
      setHasError(true);
      es.close();
      setEventSource(null);
      
      // 재연결 시도 (취소되지 않은 경우에만, 그리고 무한 루프 방지)
      if (!isCancelled) {
        setTimeout(() => {
          if (!isCancelled && eventSource === null) {
            console.log('📡 SSE 재연결 시도...');
            setHasError(false); // 재연결 전 에러 상태 리셋
            connectToProgressStream();
          }
        }, 3000);
      }
    };
    
    setEventSource(es);
  }, [sessionId, onComplete, onError, isCancelled]); // hasError 제거 - 무한 재연결 방지

  // 컴포넌트 마운트시 연결
  useEffect(() => {
    connectToProgressStream();
    
    return () => {
      if (eventSource) {
        console.log('📡 SSE 연결 종료 - 세션:', sessionId);
        eventSource.close();
        setEventSource(null);
        setIsConnected(false);
      }
    };
  }, [connectToProgressStream]);

  // 취소 핸들러
  const handleCancel = () => {
    setIsCancelled(true);
    if (eventSource) {
      console.log('📡 SSE 연결 취소 - 세션:', sessionId);
      eventSource.close();
      setEventSource(null);
      setIsConnected(false);
    }
    onCancel?.();
  };

  return (
    <div className={`space-y-4 p-6 rounded-lg border transition-colors ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            발주서 생성 중...
          </h3>
        </div>
        {showCancelButton && !hasError && !isCancelled && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            취소
          </Button>
        )}
      </div>

      {/* 연결 상태 */}
      <div className={`flex items-center gap-2 text-sm transition-colors ${
        isConnected 
          ? isDarkMode ? 'text-green-400' : 'text-green-600'
          : isDarkMode ? 'text-red-400' : 'text-red-600'
      }`}>
        {isConnected ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        {isConnected ? '실시간 연결됨' : '연결 중...'}
      </div>

      {/* 현재 단계 진행률 */}
      {currentStep && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {currentStep.message}
            </span>
            <span className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {currentStep.progress}%
            </span>
          </div>
          <Progress 
            value={currentStep.progress} 
            className="h-2"
          />
        </div>
      )}

      {/* 단계별 진행상황 */}
      <div className="space-y-2">
        {Object.entries(STEP_MESSAGES).map(([stepKey, stepName]) => {
          const step = allSteps.find(s => s.step === stepKey);
          const isActive = currentStep?.step === stepKey;
          const isCompleted = step?.completed || false;
          const hasStepError = step?.error;
          
          return (
            <div 
              key={stepKey}
              className={`flex items-center gap-3 p-2 rounded transition-colors ${
                isActive 
                  ? isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'
                  : 'transparent'
              }`}
            >
              {hasStepError ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : isCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : isActive ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              ) : (
                <div className={`h-4 w-4 rounded-full border-2 transition-colors ${
                  isDarkMode ? 'border-gray-600' : 'border-gray-300'
                }`} />
              )}
              <span className={`text-sm transition-colors ${
                isActive 
                  ? isDarkMode ? 'text-blue-300 font-medium' : 'text-blue-600 font-medium'
                  : isCompleted 
                    ? isDarkMode ? 'text-green-300' : 'text-green-600'
                    : hasStepError
                      ? isDarkMode ? 'text-red-300' : 'text-red-600'
                      : isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {stepName}
              </span>
              {hasStepError && (
                <span className={`text-xs text-red-500 ml-auto`}>
                  {hasStepError}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 오류 메시지 */}
      {hasError && currentStep?.error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {currentStep.error}
          </AlertDescription>
        </Alert>
      )}

      {/* 취소됨 메시지 */}
      {isCancelled && (
        <Alert>
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            발주서 생성이 취소되었습니다.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}