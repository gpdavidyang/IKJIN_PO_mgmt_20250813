import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send, Download, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionBarProps {
  orderData: any;
  pdfUrl: string | null;
  processingStatus: {
    pdf: 'idle' | 'processing' | 'completed' | 'error';
    vendor: 'idle' | 'processing' | 'completed' | 'error';
    email: 'idle' | 'processing' | 'completed' | 'error';
    order: 'idle' | 'processing' | 'completed' | 'error';
  };
  onSave: () => void;
  onSend: () => void;
  onDownload: () => void;
  onCreateOrder: () => void;
}

const ActionBar: React.FC<ActionBarProps> = ({
  orderData,
  pdfUrl,
  processingStatus,
  onSave,
  onSend,
  onDownload,
  onCreateOrder
}) => {
  const canSend = 
    processingStatus.pdf === 'completed' && 
    processingStatus.vendor === 'completed' &&
    orderData.vendorEmail;

  const canCreateOrder = 
    orderData.orderNumber && 
    orderData.vendorName && 
    orderData.projectName && 
    orderData.items?.length > 0;

  const isProcessing = Object.values(processingStatus).some(status => status === 'processing');

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onSave}
              disabled={isProcessing}
            >
              <Save className="w-4 h-4 mr-2" />
              임시 저장
            </Button>
            
            
            <Button
              variant="outline"
              onClick={onDownload}
              disabled={!pdfUrl || processingStatus.pdf !== 'completed'}
            >
              <Download className="w-4 h-4 mr-2" />
              다운로드
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                처리 중...
              </div>
            )}
            
            {/* 발주서 생성 버튼 */}
            <Button
              variant="default"
              onClick={onCreateOrder}
              disabled={!canCreateOrder || processingStatus.order === 'processing'}
              className={cn(
                "min-w-[120px]",
                canCreateOrder ? "bg-green-600 hover:bg-green-700" : ""
              )}
            >
              {processingStatus.order === 'processing' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  발주서 생성
                </>
              )}
            </Button>
            
            {/* 이메일 발송 버튼 */}
            <Button
              onClick={onSend}
              disabled={!canSend || processingStatus.email === 'processing'}
              className={cn(
                "min-w-[120px]",
                canSend ? "bg-blue-600 hover:bg-blue-700" : ""
              )}
            >
              {processingStatus.email === 'processing' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  발송하기
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* 진행 상태 표시 */}
        <div className="mt-3 flex items-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              processingStatus.pdf === 'completed' ? "bg-green-500" :
              processingStatus.pdf === 'processing' ? "bg-blue-500 animate-pulse" :
              processingStatus.pdf === 'error' ? "bg-red-500" : "bg-gray-300"
            )} />
            PDF 생성
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              processingStatus.vendor === 'completed' ? "bg-green-500" :
              processingStatus.vendor === 'processing' ? "bg-blue-500 animate-pulse" :
              processingStatus.vendor === 'error' ? "bg-red-500" : "bg-gray-300"
            )} />
            거래처 확인
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              processingStatus.order === 'completed' ? "bg-green-500" :
              processingStatus.order === 'processing' ? "bg-blue-500 animate-pulse" :
              processingStatus.order === 'error' ? "bg-red-500" : "bg-gray-300"
            )} />
            발주서 생성
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              processingStatus.email === 'completed' ? "bg-green-500" :
              processingStatus.email === 'processing' ? "bg-blue-500 animate-pulse" :
              processingStatus.email === 'error' ? "bg-red-500" : "bg-gray-300"
            )} />
            이메일 준비
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionBar;