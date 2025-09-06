import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Download, 
  Mail, 
  Eye, 
  ArrowRight, 
  Plus, 
  Share2,
  Printer,
  Archive
} from 'lucide-react';
import PDFPreviewModal from '../preview/PDFPreviewModal';
import { EmailSendDialog } from '@/components/email-send-dialog';

interface ActionButtonsProps {
  orderData?: any; // 전체 orderData 객체를 받도록 수정
  onViewPDF?: () => void;
  onDownloadPDF?: () => void;
  onSendEmail?: () => void;
  onViewOrders?: () => void;
  onCreateNew?: () => void;
  onPrint?: () => void;
  onArchive?: () => void;
  onShare?: () => void;
  disabled?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  orderData,
  onViewPDF,
  onDownloadPDF,
  onSendEmail,
  onViewOrders,
  onCreateNew,
  onPrint,
  onArchive,
  onShare,
  disabled = false
}) => {
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-600">
          <Share2 className="w-5 h-5" />
          사용 가능한 작업
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 주요 작업 */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 mb-3">문서 관리</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* PDF 미리보기 */}
            <Button
              variant="outline"
              onClick={() => setShowPDFPreview(true)}
              disabled={disabled}
              className="flex items-center justify-center gap-2 h-12"
            >
              <Eye className="w-4 h-4" />
              PDF 미리보기
            </Button>
            
            {/* PDF 다운로드 */}
            {orderData?.pdfUrl && (
              <Button
                variant="outline"
                onClick={onDownloadPDF}
                disabled={disabled}
                className="flex items-center justify-center gap-2 h-12"
              >
                <Download className="w-4 h-4" />
                PDF 다운로드
              </Button>
            )}
            
            {/* 인쇄 */}
            <Button
              variant="outline"
              onClick={onPrint}
              disabled={disabled}
              className="flex items-center justify-center gap-2 h-12"
            >
              <Printer className="w-4 h-4" />
              인쇄하기
            </Button>
            
            {/* 공유 */}
            <Button
              variant="outline"
              onClick={onShare}
              disabled={disabled}
              className="flex items-center justify-center gap-2 h-12"
            >
              <Share2 className="w-4 h-4" />
              공유하기
            </Button>
          </div>
        </div>

        {/* 이메일 작업 */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 mb-3">이메일 발송</h4>
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant={orderData?.emailsSent ? "outline" : "default"}
              onClick={() => setShowEmailPreview(true)}
              disabled={disabled}
              className="flex items-center justify-center gap-2 h-12"
            >
              <Mail className="w-4 h-4" />
              {orderData?.emailsSent ? '이메일 재발송' : '이메일 발송'}
            </Button>
            
            {orderData?.emailsSent && (
              <div className="text-sm text-green-600 text-center py-2 bg-green-50 rounded-lg">
                ✓ 이메일이 발송되었습니다
              </div>
            )}
          </div>
        </div>

        {/* 네비게이션 작업 */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 mb-3">다음 단계</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 발주서 관리로 이동 */}
            <Button
              onClick={() => {
                if (onViewOrders) {
                  onViewOrders();
                } else {
                  window.location.href = '/orders';
                }
              }}
              disabled={disabled}
              className="flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="w-4 h-4" />
              발주서 관리
            </Button>
            
            {/* 새 발주서 작성 */}
            <Button
              onClick={() => {
                if (onCreateNew) {
                  onCreateNew();
                } else {
                  window.location.href = '/create-order/unified';
                }
              }}
              variant="outline"
              disabled={disabled}
              className="flex items-center justify-center gap-2 h-12"
            >
              <Plus className="w-4 h-4" />
              새 발주서 작성
            </Button>
          </div>
        </div>

        {/* 추가 작업 */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 mb-3">기타</h4>
          <div className="grid grid-cols-1 gap-3">
            {/* 보관하기 */}
            <Button
              variant="outline"
              onClick={onArchive}
              disabled={disabled}
              className="flex items-center justify-center gap-2 h-10 text-gray-600"
            >
              <Archive className="w-4 h-4" />
              보관하기
            </Button>
          </div>
        </div>

        {/* 빠른 액세스 정보 */}
        {orderData?.orderNumber && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">발주서 번호</div>
              <div className="font-mono text-blue-900">{orderData.orderNumber}</div>
            </div>
          </div>
        )}
      </CardContent>

      {/* PDF 미리보기 모달 */}
      <PDFPreviewModal
        orderData={orderData}
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        onDownload={onDownloadPDF}
      />

      {/* 이메일 발송 모달 */}
      <EmailSendDialog
        open={showEmailPreview}
        onOpenChange={(open) => {
          if (!open) setShowEmailPreview(false);
        }}
        orderData={{
          orderNumber: orderData?.orderNumber || 'WORKFLOW-ORDER',
          vendorName: orderData?.vendorName || 'Unknown',
          vendorEmail: orderData?.vendorEmail || '',
          orderDate: new Date().toLocaleDateString(),
          totalAmount: orderData?.totalAmount || 0,
          siteName: orderData?.projectName || '워크플로우 발주서'
        }}
        onSendEmail={async (emailData) => {
          console.log('이메일 발송:', emailData);
          if (onSendEmail) {
            onSendEmail();
          }
        }}
      />
    </Card>
  );
};

export default ActionButtons;