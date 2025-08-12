import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Eye, 
  Download, 
  Printer, 
  RefreshCw, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Maximize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface PDFPreviewModalProps {
  orderData: any;
  isOpen?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
  onDownload?: (pdfUrl: string) => void;
}

interface PDFGenerationStatus {
  status: 'idle' | 'generating' | 'ready' | 'error';
  url?: string;
  error?: string;
  progress?: number;
}

const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  orderData,
  isOpen,
  onClose,
  trigger,
  onDownload
}) => {
  const [pdfStatus, setPdfStatus] = useState<PDFGenerationStatus>({ status: 'idle' });
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // PDF 생성 함수
  const generatePDF = async () => {
    setPdfStatus({ status: 'generating', progress: 0 });
    
    try {
      // 디버깅: orderData 확인
      console.log('PDF 생성 시작 - orderData:', orderData);
      
      // orderData가 없거나 비어있는 경우 에러 처리
      if (!orderData || Object.keys(orderData).length === 0) {
        throw new Error('발주서 데이터가 없습니다. 발주서를 먼저 생성해주세요.');
      }
      
      // 단계별 진행률 시뮬레이션
      const steps = [
        { message: '발주서 데이터 준비 중...', progress: 20 },
        { message: 'PDF 템플릿 로딩 중...', progress: 40 },
        { message: 'PDF 생성 중...', progress: 70 },
        { message: '최종 검증 중...', progress: 90 },
        { message: '완료', progress: 100 }
      ];

      for (const step of steps) {
        setPdfStatus({ status: 'generating', progress: step.progress });
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // 실제 API 호출 - 전체 orderData를 전송
      const response = await fetch('/api/orders/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderData: {
            orderNumber: orderData.orderNumber || 'PO-TEMP-001',
            projectName: orderData.projectName || orderData.project?.name || '프로젝트 미지정',
            vendorName: orderData.vendorName || orderData.vendor?.name || '거래처 미지정',
            items: orderData.items || [],
            totalAmount: orderData.totalAmount || 0,
            notes: orderData.notes || orderData.remarks || '',
            orderDate: orderData.orderDate || new Date().toISOString(),
            deliveryDate: orderData.deliveryDate || orderData.dueDate || null,
            createdBy: orderData.createdBy || orderData.user?.name || '작성자 미상'
          },
          options: {
            includeWatermark: true,
            format: 'A4',
            orientation: 'portrait'
          }
        })
      });

      if (!response.ok) {
        throw new Error('PDF 생성에 실패했습니다');
      }

      const result = await response.json();
      setPdfStatus({ 
        status: 'ready', 
        url: result.pdfUrl || '/api/placeholder-pdf.pdf' 
      });

    } catch (error) {
      setPdfStatus({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'PDF 생성 중 오류가 발생했습니다' 
      });
    }
  };

  // 컴포넌트 마운트 시 자동으로 PDF 생성 시작
  useEffect(() => {
    if (isOpen && pdfStatus.status === 'idle') {
      generatePDF();
    }
  }, [isOpen]);

  const handleDownload = () => {
    if (pdfStatus.url && onDownload) {
      onDownload(pdfStatus.url);
    } else if (pdfStatus.url) {
      const link = document.createElement('a');
      link.href = pdfStatus.url;
      link.download = `발주서_${orderData?.orderNumber || 'unknown'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    if (pdfStatus.url) {
      window.open(pdfStatus.url, '_blank');
    }
  };

  const renderPDFViewer = () => {
    switch (pdfStatus.status) {
      case 'generating':
        return (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <h3 className="text-lg font-semibold text-gray-900">PDF 생성 중...</h3>
            <div className="w-80 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${pdfStatus.progress || 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">{pdfStatus.progress || 0}% 완료</p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <AlertCircle className="w-12 h-12 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">PDF 생성 실패</h3>
            <div className="text-center max-w-md space-y-2">
              <p className="text-sm text-red-600">
                {pdfStatus.error}
              </p>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 <strong>해결 방법:</strong><br/>
                  • 브라우저에서 팝업 차단을 해제해보세요<br/>
                  • 파일 권한 문제일 수 있으니 다시 시도해보세요<br/>
                  • Excel 파일 다운로드는 여전히 가능합니다
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={generatePDF} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                다시 시도
              </Button>
              <Button 
                onClick={() => {
                  if (orderData?.excelUrl) {
                    window.open(orderData.excelUrl, '_blank');
                  }
                }}
                variant="secondary"
                disabled={!orderData?.excelUrl}
              >
                <Download className="w-4 h-4 mr-2" />
                Excel 다운로드
              </Button>
            </div>
          </div>
        );

      case 'ready':
        return (
          <div className="space-y-4">
            {/* PDF 뷰어 도구바 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  disabled={zoom <= 50}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium px-2">{zoom}%</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  disabled={zoom >= 200}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {currentPage} / {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-1" />
                  인쇄
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" />
                  다운로드
                </Button>
              </div>
            </div>

            {/* PDF 뷰어 영역 */}
            <div className="bg-gray-100 rounded-lg p-4 min-h-[600px] flex items-center justify-center">
              {pdfStatus.url ? (
                <iframe
                  src={`${pdfStatus.url}#view=FitH&zoom=${zoom}`}
                  className="w-full h-[600px] border-0 rounded"
                  title="PDF 미리보기"
                />
              ) : (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">PDF 로딩 중...</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center py-16">
            <Button onClick={generatePDF}>
              <FileText className="w-4 h-4 mr-2" />
              PDF 미리보기 시작
            </Button>
          </div>
        );
    }
  };

  const modalContent = (
    <DialogContent className="max-w-5xl h-[90vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          PDF 미리보기
          {orderData?.orderNumber && (
            <Badge variant="outline">
              {orderData.orderNumber}
            </Badge>
          )}
        </DialogTitle>
      </DialogHeader>
      
      <Tabs defaultValue="preview" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview">미리보기</TabsTrigger>
          <TabsTrigger value="details">발주서 정보</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="flex-1 overflow-auto">
          {renderPDFViewer()}
        </TabsContent>
        
        <TabsContent value="details" className="flex-1 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle>발주서 상세 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">발주서 번호:</span>
                    <p className="mt-1">{orderData.orderNumber || 'PO-TEMP-001'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">프로젝트:</span>
                    <p className="mt-1">{orderData.projectName || orderData.project?.name || '프로젝트 미지정'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">거래처:</span>
                    <p className="mt-1">{orderData.vendorName || orderData.vendor?.name || '거래처 미지정'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">총 금액:</span>
                    <p className="mt-1">
                      {orderData.totalAmount ? `₩${orderData.totalAmount.toLocaleString()}` : '₩0'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">품목 수:</span>
                    <p className="mt-1">{orderData.totalItems || orderData.items?.length || 0}개</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">작성 방식:</span>
                    <p className="mt-1">{orderData.type === 'excel' ? 'Excel 업로드' : orderData.creationMethod === 'excel' ? 'Excel 업로드' : '표준 입력'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">발주일자:</span>
                    <p className="mt-1">{orderData.orderDate ? new Date(orderData.orderDate).toLocaleDateString('ko-KR') : new Date().toLocaleDateString('ko-KR')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">납기일자:</span>
                    <p className="mt-1">{orderData.deliveryDate || orderData.dueDate ? new Date(orderData.deliveryDate || orderData.dueDate).toLocaleDateString('ko-KR') : '미지정'}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>발주서 데이터가 없습니다.</p>
                  <p className="text-sm mt-2">발주서를 먼저 생성해주세요.</p>
                </div>
              )}
              
              <Separator />
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">PDF 생성 옵션</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    워터마크 포함
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    A4 크기
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    세로 방향
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        {modalContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {modalContent}
    </Dialog>
  );
};

export default PDFPreviewModal;