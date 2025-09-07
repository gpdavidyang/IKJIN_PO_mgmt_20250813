import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Download, FileText, CheckCircle } from 'lucide-react';
import { EmailSendDialog } from '@/components/email-send-dialog';
import { EmailService } from '@/services/emailService';
import { useToast } from '@/hooks/use-toast';

interface UploadSuccessActionsProps {
  uploadResult: {
    fileName: string;
    filePath: string;
    totalOrders: number;
    orders: Array<{
      orderNumber: string;
      orderDate: string;
      siteName: string;
      vendorName: string;
      totalAmount: number;
    }>;
  };
  extractedFiles?: {
    excelPath?: string;
    pdfPath?: string;
  };
}

export function UploadSuccessActions({ uploadResult, extractedFiles }: UploadSuccessActionsProps) {
  const { toast } = useToast();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // 첫 번째 발주서를 기본으로 선택
  const primaryOrder = uploadResult.orders[0];

  const handleEmailSend = () => {
    if (primaryOrder) {
      setSelectedOrder(primaryOrder);
      setEmailDialogOpen(true);
    }
  };

  const handleSendEmail = async (emailData: any) => {
    if (!selectedOrder) return;

    try {
      // Build attachment URLs from selectedAttachmentIds
      const attachmentUrls: string[] = [];
      if (emailData.selectedAttachmentIds && emailData.selectedAttachmentIds.length > 0) {
        for (const attachmentId of emailData.selectedAttachmentIds) {
          const attachmentUrl = `/api/attachments/${attachmentId}/download`;
          attachmentUrls.push(attachmentUrl);
        }
      }

      const orderData = {
        orderNumber: selectedOrder.orderNumber,
        vendorName: selectedOrder.vendorName,
        orderDate: selectedOrder.orderDate,
        totalAmount: selectedOrder.totalAmount,
        siteName: selectedOrder.siteName,
        filePath: extractedFiles?.excelPath || uploadResult.filePath,
        attachmentUrls: attachmentUrls
      };

      await EmailService.sendPurchaseOrderEmail(orderData, emailData);
      
      toast({
        title: "이메일 발송 완료",
        description: `${selectedOrder.vendorName}에게 발주서 ${selectedOrder.orderNumber}를 전송했습니다.`,
      });
    } catch (error) {
      toast({
        title: "이메일 발송 실패",
        description: error instanceof Error ? error.message : "이메일 발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadExtracted = () => {
    if (extractedFiles?.excelPath) {
      // 추출된 파일 다운로드
      const link = document.createElement('a');
      link.href = `/uploads/${extractedFiles.excelPath.split('/').pop()}`;
      link.download = `발주서_갑을지_${primaryOrder?.orderNumber || 'extracted'}.xlsx`;
      link.click();
    }
  };

  return (
    <>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            업로드 완료
          </CardTitle>
          <CardDescription>
            {uploadResult.totalOrders}개의 발주서가 성공적으로 처리되었습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 발주서 정보 */}
            {primaryOrder && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="font-medium text-lg mb-2">{primaryOrder.orderNumber}</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">거래처:</span> {primaryOrder.vendorName}
                  </div>
                  <div>
                    <span className="font-medium">현장:</span> {primaryOrder.siteName}
                  </div>
                  <div>
                    <span className="font-medium">발주일:</span> {primaryOrder.orderDate}
                  </div>
                  <div>
                    <span className="font-medium">금액:</span> {primaryOrder.totalAmount.toLocaleString()}원
                  </div>
                </div>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleEmailSend}
                className="flex items-center gap-2"
                disabled={!primaryOrder}
              >
                <Mail className="h-4 w-4" />
                이메일 발송
              </Button>

              {extractedFiles?.excelPath && (
                <Button
                  variant="outline"
                  onClick={handleDownloadExtracted}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  갑지/을지 다운로드
                </Button>
              )}

              {extractedFiles?.pdfPath && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = extractedFiles.pdfPath!;
                    link.target = '_blank';
                    link.click();
                  }}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  PDF 미리보기
                </Button>
              )}
            </div>

            {uploadResult.totalOrders > 1 && (
              <div className="text-sm text-gray-600">
                {uploadResult.totalOrders - 1}개의 추가 발주서가 처리되었습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 이메일 발송 다이얼로그 */}
      {selectedOrder && (
        <EmailSendDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          orderData={{
            orderNumber: selectedOrder.orderNumber,
            vendorName: selectedOrder.vendorName,
            vendorEmail: '', // 추후 거래처 정보에서 가져오기
            orderDate: selectedOrder.orderDate,
            totalAmount: selectedOrder.totalAmount,
            siteName: selectedOrder.siteName
          }}
          onSendEmail={handleSendEmail}
        />
      )}
    </>
  );
}