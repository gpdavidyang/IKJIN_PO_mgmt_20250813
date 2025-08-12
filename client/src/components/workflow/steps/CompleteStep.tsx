import React from 'react';
import { CheckCircle } from 'lucide-react';
import CompletionSummary from '../completion/CompletionSummary';
import ProcessingResults from '../completion/ProcessingResults';
import ActionButtons from '../completion/ActionButtons';
import NextSteps from '../completion/NextSteps';
import { ProcessingStep } from '@shared/workflow-types';

interface CompleteStepProps {
  orderData?: any;
  processingSteps?: ProcessingStep[];
  onViewOrders?: () => void;
  onCreateNew?: () => void;
  onViewPDF?: () => void;
  onDownloadPDF?: () => void;
  onSendEmail?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
  onArchive?: () => void;
  onNavigate?: (url: string) => void;
  disabled?: boolean;
}

const CompleteStep: React.FC<CompleteStepProps> = ({ 
  orderData, 
  processingSteps = [],
  onViewOrders,
  onCreateNew,
  onViewPDF,
  onDownloadPDF,
  onSendEmail,
  onPrint,
  onShare,
  onArchive,
  onNavigate,
  disabled 
}) => {
  return (
    <div className="space-y-6">
      {/* 메인 완료 헤더 */}
      <div className="text-center py-6">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          발주서 작성이 완료되었습니다!
        </h2>
        <p className="text-lg text-gray-600">
          모든 처리 과정이 성공적으로 완료되었습니다.
        </p>
      </div>

      {/* 완료 요약 */}
      <CompletionSummary orderData={orderData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 처리 결과 상세 */}
        {processingSteps.length > 0 && (
          <div className="lg:col-span-2">
            <ProcessingResults 
              steps={processingSteps}
              showRetryButtons={false}
            />
          </div>
        )}

        {/* 액션 버튼들 */}
        <ActionButtons
          orderData={orderData}
          onViewPDF={onViewPDF}
          onDownloadPDF={onDownloadPDF}
          onSendEmail={onSendEmail}
          onViewOrders={onViewOrders}
          onCreateNew={onCreateNew}
          onPrint={onPrint}
          onArchive={onArchive}
          onShare={onShare}
          disabled={disabled}
        />

        {/* 다음 단계 안내 */}
        <NextSteps
          orderData={orderData}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
};

export default CompleteStep;