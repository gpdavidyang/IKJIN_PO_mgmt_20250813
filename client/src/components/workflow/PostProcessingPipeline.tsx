import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Mail, 
  Shield, 
  Paperclip,
  RefreshCw,
  Eye,
  Download,
  Send,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  PlayCircle,
  PauseCircle,
  Settings,
  Info,
  ArrowRight,
  Timer
} from 'lucide-react';
import { ProcessingStep } from '@shared/workflow-types';

interface PostProcessingPipelineProps {
  steps: ProcessingStep[];
  currentStep?: string;
  onRetry?: (stepId: string) => void;
  onPreview?: (stepId: string, data?: any) => void;
  onEdit?: (stepId: string, data?: any) => void;
  onPause?: () => void;
  onResume?: () => void;
  onSkip?: (stepId: string) => void;
  onCancel?: () => void;
  isProcessing?: boolean;
  isPaused?: boolean;
  canPause?: boolean;
  canSkip?: boolean;
  totalElapsedTime?: number;
  estimatedTimeRemaining?: number;
  onStepComplete?: (stepId: string, result: any) => void;
  maxRetries?: number;
}

const getStepIcon = (step: ProcessingStep) => {
  switch (step.id) {
    case 'pdf_generation':
      return <FileText className="w-5 h-5" />;
    case 'vendor_validation':
      return <Shield className="w-5 h-5" />;
    case 'email_preparation':
      return <Mail className="w-5 h-5" />;
    case 'attachment_processing':
      return <Paperclip className="w-5 h-5" />;
    case 'final_validation':
      return <CheckCircle className="w-5 h-5" />;
    default:
      return <CheckCircle className="w-5 h-5" />;
  }
};

const getStepStatusColor = (status: ProcessingStep['status']) => {
  switch (status) {
    case 'completed':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'processing':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'error':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStepStatusIcon = (step: ProcessingStep) => {
  switch (step.status) {
    case 'completed':
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    case 'processing':
      return <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />;
    case 'error':
      return <AlertCircle className="w-6 h-6 text-red-600" />;
    default:
      return <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />;
  }
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}초`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
  return `${Math.floor(seconds / 3600)}시간 ${Math.floor((seconds % 3600) / 60)}분`;
};

const PostProcessingPipeline: React.FC<PostProcessingPipelineProps> = ({
  steps,
  currentStep,
  onRetry,
  onPreview,
  onEdit,
  onPause,
  onResume,
  onSkip,
  onCancel,
  isProcessing = false,
  isPaused = false,
  canPause = false,
  canSkip = false,
  totalElapsedTime = 0,
  estimatedTimeRemaining,
  onStepComplete,
  maxRetries = 3
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  
  // 실시간 시계 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  const hasErrors = steps.some(step => step.status === 'error');
  const isComplete = completedSteps === totalSteps;
  const processingStep = steps.find(step => step.status === 'processing');
  const errorSteps = steps.filter(step => step.status === 'error');
  
  const toggleStepExpanded = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* 향상된 헤더 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900">후처리 파이프라인</h3>
              {isProcessing && !isPaused && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Zap className="w-3 h-3 mr-1" />
                  처리 중
                </Badge>
              )}
              {isPaused && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <PauseCircle className="w-3 h-3 mr-1" />
                  일시정지
                </Badge>
              )}
              {hasErrors && (
                <Badge variant="destructive" className="bg-red-100 text-red-800">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  오류 {errorSteps.length}개
                </Badge>
              )}
              {isComplete && !hasErrors && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  완료
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">
              발주서 생성 후 필요한 작업들을 자동으로 처리합니다
            </p>
          </div>
          
          <div className="text-right space-y-2">
            <div className="text-3xl font-bold text-blue-600">{progressPercentage}%</div>
            <div className="text-xs text-gray-500">{completedSteps}/{totalSteps} 단계 완료</div>
            {totalElapsedTime > 0 && (
              <div className="text-xs text-gray-500">
                경과: {formatTime(totalElapsedTime)}
              </div>
            )}
            {estimatedTimeRemaining && (
              <div className="text-xs text-blue-600">
                <Timer className="w-3 h-3 inline mr-1" />
                예상 {formatTime(estimatedTimeRemaining)} 남음
              </div>
            )}
            <div className="text-xs text-gray-400">
              {currentTime.toLocaleTimeString('ko-KR')}
            </div>
          </div>
        </div>

        {/* 제어 버튼들 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isProcessing && canPause && !isPaused && onPause && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPause}
                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
              >
                <PauseCircle className="w-4 h-4 mr-1" />
                일시정지
              </Button>
            )}
            
            {isPaused && onResume && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResume}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <PlayCircle className="w-4 h-4 mr-1" />
                재개
              </Button>
            )}
            
            {hasErrors && errorSteps.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  errorSteps.forEach(step => onRetry?.(step.id));
                }}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                모든 오류 재시도
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isComplete}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                <XCircle className="w-4 h-4 mr-1" />
                취소
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 향상된 전체 진행 상황 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">전체 진행률</span>
            {processingStep && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                {processingStep.title} 처리 중
              </Badge>
            )}
          </div>
          <span className="font-semibold text-lg">{progressPercentage}%</span>
        </div>
        <div className="relative">
          <Progress value={progressPercentage} className="h-3" />
          {isProcessing && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30 animate-pulse rounded-full h-3" />
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{completedSteps}개 완료</span>
          <span>{totalSteps - completedSteps}개 남음</span>
        </div>
      </div>

      {/* 향상된 상태 알림들 */}
      {isPaused && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <PauseCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            후처리 작업이 일시정지되었습니다. 재개 버튼을 눌러 계속 진행하세요.
          </AlertDescription>
        </Alert>
      )}

      {hasErrors && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium mb-1">
              {errorSteps.length}개 단계에서 오류가 발생했습니다
            </div>
            <div className="text-sm">
              {errorSteps.map(step => step.title).join(', ')} 단계를 확인하고 재시도해주세요.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isComplete && !hasErrors && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="font-medium mb-1">모든 후처리 작업이 완료되었습니다!</div>
            <div className="text-sm">
              총 {totalSteps}개 단계가 성공적으로 처리되었습니다.
              {totalElapsedTime > 0 && ` (소요시간: ${formatTime(totalElapsedTime)})`}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 향상된 처리 단계 목록 */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isExpanded = expandedSteps.has(step.id);
          const retryCount = (step as any).retryCount || 0;
          const canRetryStep = step.status === 'error' && retryCount < maxRetries;
          
          return (
            <Card 
              key={step.id}
              className={`border transition-all duration-300 transform hover:scale-[1.01] ${getStepStatusColor(step.status)} ${
                step.id === currentStep ? 'shadow-lg ring-2 ring-blue-200 ring-opacity-50' : 'shadow-sm'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-shrink-0">
                      {getStepStatusIcon(step)}
                      {step.status === 'processing' && (
                        <div className="absolute -inset-2 border-2 border-blue-400 rounded-full opacity-30 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <CardTitle className="text-base flex items-center space-x-2">
                          {getStepIcon(step)}
                          <span>{step.title}</span>
                        </CardTitle>
                        
                        {/* 상태 배지들 */}
                        <div className="flex items-center space-x-2">
                          {step.status === 'processing' && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1" />
                              진행 중
                            </Badge>
                          )}
                          {step.status === 'completed' && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-2 py-0.5">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              완료
                            </Badge>
                          )}
                          {step.status === 'error' && (
                            <Badge variant="destructive" className="bg-red-100 text-red-800 text-xs px-2 py-0.5">
                              <XCircle className="w-3 h-3 mr-1" />
                              오류 {retryCount > 0 && `(${retryCount}/${maxRetries} 시도)`}
                            </Badge>
                          )}
                          {step.priority && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              {step.priority === 'high' ? '높음' : step.priority === 'medium' ? '보통' : '낮음'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{step.description}</p>
                      
                      {/* 타이밍 정보 */}
                      {(step.startedAt || step.completedAt || step.estimatedDuration) && (
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                          {step.startedAt && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>시작: {step.startedAt.toLocaleTimeString('ko-KR')}</span>
                            </div>
                          )}
                          {step.completedAt && step.startedAt && (
                            <div className="flex items-center space-x-1">
                              <Timer className="w-3 h-3" />
                              <span>소요: {formatTime(Math.round((step.completedAt.getTime() - step.startedAt.getTime()) / 1000))}</span>
                            </div>
                          )}
                          {step.estimatedDuration && step.status === 'pending' && (
                            <div className="flex items-center space-x-1">
                              <Timer className="w-3 h-3" />
                              <span>예상: {formatTime(step.estimatedDuration)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">
                        단계 {index + 1}/{steps.length}
                      </div>
                      {(step.details?.length || step.result || step.error) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStepExpanded(step.id)}
                          className="text-xs px-2 py-1 h-6"
                        >
                          {isExpanded ? '접기' : '펼치기'}
                          <ArrowRight className={`w-3 h-3 ml-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* 진행률 (처리 중인 경우) */}
                {step.status === 'processing' && step.progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-medium">처리 진행률</span>
                      <span className="font-bold">{step.progress}%</span>
                    </div>
                    <div className="relative">
                      <Progress value={step.progress} className="h-2" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-20 animate-pulse rounded-full h-2" />
                    </div>
                  </div>
                )}

                {/* 확장 가능한 세부 내용 */}
                {isExpanded && (
                  <div className="space-y-4">
                    <Separator />

                    {/* 에러 메시지 (확장 시) */}
                    {step.status === 'error' && step.error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-red-800 mb-2">오류 상세 정보</div>
                            <div className="text-sm text-red-700 bg-red-100 p-3 rounded border border-red-200 font-mono">
                              {step.error}
                            </div>
                            {retryCount > 0 && (
                              <div className="text-xs text-red-600 mt-2">
                                재시도 횟수: {retryCount}/{maxRetries}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 세부 정보 (확장 시) */}
                    {step.details && step.details.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <Info className="w-4 h-4 text-blue-600" />
                          <div className="font-medium text-blue-800">처리 내용</div>
                        </div>
                        <ul className="space-y-2">
                          {step.details.map((detail, detailIndex) => (
                            <li key={detailIndex} className="flex items-start space-x-3">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 결과 정보 (확장 시) */}
                    {step.status === 'completed' && step.result && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <div className="font-medium text-green-800">처리 결과</div>
                        </div>
                        <div className="text-sm text-green-700">
                          {typeof step.result === 'string' ? step.result : 
                           step.result.message || '성공적으로 처리되었습니다'}
                        </div>
                        {step.result?.details && (
                          <div className="mt-2 text-xs text-green-600 bg-green-100 p-2 rounded border border-green-200">
                            {JSON.stringify(step.result.details, null, 2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 액션 버튼들 */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    {/* 재시도 버튼 */}
                    {step.status === 'error' && onRetry && canRetryStep && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRetry(step.id)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        재시도 ({maxRetries - retryCount}회 남음)
                      </Button>
                    )}

                    {/* 스킵 버튼 */}
                    {step.status === 'pending' && canSkip && onSkip && step.priority !== 'high' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSkip(step.id)}
                        className="text-gray-600 border-gray-300 hover:bg-gray-50"
                      >
                        <ArrowRight className="w-3 h-3 mr-1" />
                        건너뛰기
                      </Button>
                    )}

                    {/* 미리보기 버튼 */}
                    {step.status === 'completed' && onPreview && (
                      step.id === 'pdf_generation' || step.id === 'email_preparation'
                    ) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPreview(step.id, step.result)}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        미리보기
                      </Button>
                    )}

                    {/* 다운로드 버튼 */}
                    {step.status === 'completed' && step.id === 'pdf_generation' && step.result?.pdfUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(step.result.pdfUrl, '_blank')}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        다운로드
                      </Button>
                    )}

                    {/* 편집 버튼 */}
                    {step.status === 'completed' && onEdit && step.id === 'email_preparation' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(step.id, step.result)}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        편집
                      </Button>
                    )}
                  </div>

                  {/* 단계별 액션 (오른쪽) */}
                  <div className="flex items-center space-x-1">
                    {step.status === 'completed' && (
                      <div className="text-xs text-green-600 flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        완료
                      </div>
                    )}
                    {step.status === 'processing' && (
                      <div className="text-xs text-blue-600 flex items-center">
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        처리 중
                      </div>
                    )}
                  </div>
                </div>

                {/* 연결선 (다음 단계가 있는 경우) */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center mt-4 mb-2">
                    <div className={`w-0.5 h-4 transition-colors duration-300 ${
                      step.status === 'completed' ? 'bg-green-400' : 
                      step.status === 'processing' ? 'bg-blue-400' :
                      step.status === 'error' ? 'bg-red-400' : 'bg-gray-300'
                    }`} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 향상된 하단 요약 정보 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {completedSteps}
            </div>
            <div className="text-sm text-gray-600">완료된 단계</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {steps.filter(s => s.status === 'processing').length}
            </div>
            <div className="text-sm text-gray-600">처리 중</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {errorSteps.length}
            </div>
            <div className="text-sm text-gray-600">오류 발생</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600 mb-1">
              {steps.filter(s => s.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">대기 중</div>
          </div>
        </div>

        {/* 처리 상태 메시지 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-4">
            {isProcessing && !isPaused && (
              <div className="flex items-center space-x-2 text-blue-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">
                  {processingStep ? `${processingStep.title} 처리 중...` : '처리 중입니다...'}
                </span>
              </div>
            )}
            
            {isPaused && (
              <div className="flex items-center space-x-2 text-yellow-600">
                <PauseCircle className="w-4 h-4" />
                <span className="text-sm font-medium">일시정지됨</span>
              </div>
            )}
            
            {isComplete && !hasErrors && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">모든 작업이 완료되었습니다</span>
              </div>
            )}
            
            {hasErrors && (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">오류가 발생한 작업이 있습니다</span>
              </div>
            )}
            
            {!isProcessing && !isComplete && !hasErrors && !isPaused && (
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">시작 대기 중</span>
              </div>
            )}
          </div>

          {/* 추가 정보 */}
          {(totalElapsedTime > 0 || estimatedTimeRemaining) && (
            <div className="flex items-center justify-center space-x-6 mt-3 text-xs text-gray-500">
              {totalElapsedTime > 0 && (
                <div className="flex items-center space-x-1">
                  <Timer className="w-3 h-3" />
                  <span>경과: {formatTime(totalElapsedTime)}</span>
                </div>
              )}
              {estimatedTimeRemaining && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>남은 시간: {formatTime(estimatedTimeRemaining)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostProcessingPipeline;