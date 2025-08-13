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
        { message: '발주서 데이터 준비 중...', progress: 15 },
        { message: 'PDF 템플릿 로딩 중...', progress: 30 },
        { message: 'HTML 콘텐츠 생성 중...', progress: 50 },
        { message: 'PDF 변환 중...', progress: 75 },
        { message: '최종 검증 중...', progress: 90 },
        { message: '완료', progress: 100 }
      ];

      // Progress simulation with realistic timing
      for (let i = 0; i < steps.length - 1; i++) {
        const step = steps[i];
        setPdfStatus({ status: 'generating', progress: step.progress });
        await new Promise(resolve => setTimeout(resolve, i === 0 ? 300 : 600));
      }

      // 실제 API 호출 - 전체 orderData를 전송
      console.log('📄 API 호출 시작...');
      
      const requestData = {
        orderData: {
          orderNumber: orderData.orderNumber || 'PO-TEMP-001',
          projectName: orderData.projectName || orderData.project?.name || orderData.project?.projectName || '프로젝트 미지정',
          vendorName: orderData.vendorName || orderData.vendor?.name || '거래처 미지정',
          items: Array.isArray(orderData.items) ? orderData.items : [],
          totalAmount: Number(orderData.totalAmount) || 0,
          notes: orderData.notes || orderData.remarks || '',
          orderDate: orderData.orderDate || new Date().toISOString(),
          deliveryDate: orderData.deliveryDate || orderData.dueDate || null,
          createdBy: orderData.createdBy || orderData.user?.name || '시스템'
        },
        options: {
          includeWatermark: true,
          format: 'A4',
          orientation: 'portrait'
        }
      };
      
      console.log('📤 전송할 데이터:', JSON.stringify(requestData, null, 2));

      const response = await fetch('/api/orders/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      console.log('📨 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `서버 오류 (${response.status})`;
        
        try {
          const errorData = await response.json();
          console.error('📨 서버 에러 응답:', errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          console.error('📨 에러 응답 파싱 실패:', parseError);
          const textResponse = await response.text();
          console.error('📨 텍스트 응답:', textResponse);
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ PDF 생성 성공 응답:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'PDF 생성에 실패했습니다.');
      }
      
      if (!result.pdfUrl) {
        throw new Error('PDF URL이 응답에 포함되지 않았습니다.');
      }

      // Final progress update
      setPdfStatus({ status: 'generating', progress: 100 });
      await new Promise(resolve => setTimeout(resolve, 200));

      setPdfStatus({ 
        status: 'ready', 
        url: result.pdfUrl,
        message: result.message 
      });

    } catch (error) {
      console.error('❌ PDF 생성 오류:', error);
      
      let userFriendlyMessage = 'PDF 생성 중 오류가 발생했습니다.';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          userFriendlyMessage = '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.';
        } else if (error.message.includes('timeout')) {
          userFriendlyMessage = '처리 시간이 초과되었습니다. 다시 시도해주세요.';
        } else if (error.message.includes('발주서 데이터')) {
          userFriendlyMessage = error.message;
        } else if (error.message.includes('puppeteer') || error.message.includes('PDF 생성 실패')) {
          userFriendlyMessage = 'PDF 변환 도구에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
        } else {
          userFriendlyMessage = error.message;
        }
      }
      
      setPdfStatus({ 
        status: 'error', 
        error: userFriendlyMessage
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

  const handleAlternativeDownload = async () => {
    try {
      console.log('🔄 대안 PDF 다운로드 시작...');
      
      const requestData = {
        orderData: {
          orderNumber: orderData?.orderNumber || 'PO-TEMP-001',
          projectName: orderData?.projectName || orderData?.project?.name || '프로젝트 미지정',
          vendorName: orderData?.vendorName || orderData?.vendor?.name || '거래처 미지정',
          items: Array.isArray(orderData?.items) ? orderData.items : [],
          totalAmount: Number(orderData?.totalAmount) || 0,
          notes: orderData?.notes || orderData?.remarks || '',
          orderDate: orderData?.orderDate || new Date().toISOString(),
          deliveryDate: orderData?.deliveryDate || orderData?.dueDate || null,
          createdBy: orderData?.createdBy || orderData?.user?.name || '시스템'
        }
      };

      const response = await fetch('/api/orders/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.pdfUrl) {
          // Direct download
          window.open(`${result.pdfUrl}?download=true`, '_blank');
        } else {
          throw new Error(result.error || '대안 PDF 생성 실패');
        }
      } else {
        throw new Error(`서버 오류 (${response.status})`);
      }
    } catch (error) {
      console.error('❌ 대안 PDF 다운로드 오류:', error);
      alert('대안 PDF 다운로드에 실패했습니다. 브라우저 인쇄 기능을 이용해보세요.');
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
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <div className="text-center space-y-3">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">PDF 생성 실패</h3>
              <p className="text-sm text-red-600 dark:text-red-400 max-w-md">
                {pdfStatus.error}
              </p>
            </div>
            
            {/* 해결 방법 제안 */}
            <div className="w-full max-w-2xl space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 해결 방법</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• 브라우저를 새로고침하고 다시 시도해보세요</li>
                  <li>• 다른 브라우저(Chrome, Firefox 등)를 사용해보세요</li>
                  <li>• 페이지를 잠시 기다린 후 재시도해보세요</li>
                  <li>• 발주서 데이터가 완전히 로드된 후 시도해보세요</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">✨ 대안 방법</h4>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <li>• "단순 PDF 생성" 버튼으로 직접 다운로드 시도</li>
                  <li>• 발주서 상세 페이지에서 직접 다운로드</li>
                  <li>• 브라우저의 인쇄 기능(Ctrl+P)을 이용해 PDF로 저장</li>
                  <li>• Excel 형태로 내보내기 후 수동으로 PDF 변환</li>
                </ul>
              </div>

              {/* 기술적 정보 (개발 환경에서만) */}
              {process.env.NODE_ENV === 'development' && pdfStatus.error && (
                <details className="w-full">
                  <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                    기술적 정보 보기
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                    {pdfStatus.error}
                  </div>
                </details>
              )}
            </div>

            {/* 액션 버튼들 */}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={generatePDF} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </Button>
              
              <Button 
                onClick={() => window.location.reload()}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                페이지 새로고침
              </Button>
              
              {orderData?.id && (
                <Button 
                  onClick={() => {
                    if (onClose) onClose();
                    // Navigate to order detail page
                    window.location.href = `/orders/${orderData.id}`;
                  }}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  상세 페이지로
                </Button>
              )}
              
              <Button 
                onClick={() => {
                  // Try alternative download method
                  if (orderData?.id) {
                    window.open(`/api/orders/${orderData.id}/download`, '_blank');
                  } else {
                    // Fallback: try to generate and download PDF directly
                    handleAlternativeDownload();
                  }
                }}
                disabled={!orderData?.orderNumber}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                직접 다운로드
              </Button>
              
              <Button 
                onClick={handleAlternativeDownload}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                단순 PDF 생성
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