import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  FileText, 
  Mail, 
  Database,
  Shield,
  Zap
} from 'lucide-react';
import { ProcessingStep } from '@shared/workflow-types';

interface ProcessingResultsProps {
  steps: ProcessingStep[];
  onRetryStep?: (stepId: string) => void;
  showRetryButtons?: boolean;
}

const ProcessingResults: React.FC<ProcessingResultsProps> = ({ 
  steps, 
  onRetryStep,
  showRetryButtons = false 
}) => {
  const completedSteps = steps.filter(step => step.status === 'completed');
  const errorSteps = steps.filter(step => step.status === 'error');
  const processingSteps = steps.filter(step => step.status === 'processing');

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.id) {
      case 'pdf_generation':
        return <FileText className="w-4 h-4" />;
      case 'vendor_validation':
        return <Shield className="w-4 h-4" />;
      case 'email_preparation':
        return <Mail className="w-4 h-4" />;
      case 'attachment_processing':
        return <FileText className="w-4 h-4" />;
      case 'final_validation':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          처리 결과 상세
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 처리 결과 요약 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {completedSteps.length}
            </div>
            <div className="text-sm text-green-700">완료</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {processingSteps.length}
            </div>
            <div className="text-sm text-blue-700">처리 중</div>
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {errorSteps.length}
            </div>
            <div className="text-sm text-red-700">오류</div>
          </div>
        </div>

        {/* 단계별 상세 결과 */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div 
              key={step.id}
              className={`p-4 rounded-lg border ${getStatusColor(step.status)} transition-all duration-200`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex items-center gap-2 mt-0.5">
                    {getStepIcon(step)}
                    {getStatusIcon(step.status)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{step.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={
                          step.status === 'completed' ? 'border-green-600 text-green-600' :
                          step.status === 'error' ? 'border-red-600 text-red-600' :
                          step.status === 'processing' ? 'border-blue-600 text-blue-600' :
                          'border-gray-400 text-gray-600'
                        }
                      >
                        {step.status === 'completed' ? '완료' :
                         step.status === 'error' ? '오류' :
                         step.status === 'processing' ? '처리 중' : '대기'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                    
                    {/* 진행률 표시 */}
                    {step.progress !== undefined && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>진행률</span>
                          <span>{step.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* 결과 또는 오류 메시지 */}
                    {step.result && (
                      <div className="text-sm text-green-700 bg-green-50 p-2 rounded mt-2">
                        <strong>결과:</strong> {typeof step.result === 'string' ? step.result : JSON.stringify(step.result)}
                      </div>
                    )}
                    
                    {step.error && (
                      <div className="text-sm text-red-700 bg-red-50 p-2 rounded mt-2">
                        <strong>오류:</strong> {step.error}
                      </div>
                    )}
                    
                    {/* 상세 정보 */}
                    {step.details && step.details.length > 0 && (
                      <div className="mt-2">
                        <details className="text-sm">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                            상세 정보 보기
                          </summary>
                          <ul className="mt-2 space-y-1 text-gray-600 ml-4">
                            {step.details.map((detail, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-gray-400">•</span>
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 재시도 버튼 */}
                {showRetryButtons && step.status === 'error' && onRetryStep && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetryStep(step.id)}
                    className="ml-2"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    재시도
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 전체적인 상태 메시지 */}
        {errorSteps.length === 0 && completedSteps.length === steps.length && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              모든 처리 단계가 성공적으로 완료되었습니다
            </div>
          </div>
        )}
        
        {errorSteps.length > 0 && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              {errorSteps.length}개 단계에서 오류가 발생했습니다
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProcessingResults;