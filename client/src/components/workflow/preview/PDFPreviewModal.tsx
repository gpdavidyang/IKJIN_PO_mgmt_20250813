import React, { useState, useEffect, useRef } from 'react';
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
  ZoomOut,
  FileDown
} from 'lucide-react';
import { ClientPdfGenerator } from '@/utils/client-pdf-generator';

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
  blob?: Blob;
  error?: string;
  progress?: number;
  message?: string;
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
  const [useClientPdf, setUseClientPdf] = useState(false);
  const orderPreviewRef = useRef<HTMLDivElement>(null);

  // 클라이언트 사이드 PDF 생성
  const generateClientPDF = async () => {
    setPdfStatus({ status: 'generating', progress: 0 });
    
    try {
      console.log('📄 클라이언트 PDF 생성 시작...');
      
      if (!orderData || Object.keys(orderData).length === 0) {
        throw new Error('발주서 데이터가 없습니다.');
      }
      
      // 프로그레스 업데이트
      setPdfStatus({ status: 'generating', progress: 30 });
      
      // 클라이언트에서 PDF 생성
      const result = await ClientPdfGenerator.generateOrderPdf(orderData, {
        filename: `PO_${orderData.orderNumber || 'draft'}.pdf`,
        orientation: 'portrait',
        format: 'a4'
      });
      
      setPdfStatus({ status: 'generating', progress: 70 });
      
      if (!result.success || !result.blob) {
        throw new Error(result.error || 'PDF 생성 실패');
      }
      
      // Blob URL 생성
      const blobUrl = window.URL.createObjectURL(result.blob);
      
      setPdfStatus({ status: 'generating', progress: 100 });
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setPdfStatus({ 
        status: 'ready', 
        url: blobUrl,
        blob: result.blob
      });
      
      console.log('✅ 클라이언트 PDF 생성 완료');
      
    } catch (error) {
      console.error('❌ 클라이언트 PDF 생성 오류:', error);
      setPdfStatus({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'PDF 생성 실패' 
      });
    }
  };
  
  // 서버 사이드 PDF 생성 (기존 함수)
  const generateServerPDF = async () => {
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

  // PDF 생성 함수 선택
  const generatePDF = async () => {
    // Vercel 환경이거나 서버 오류 시 클라이언트 PDF 사용
    const isServerless = window.location.hostname.includes('vercel.app') || 
                        window.location.hostname.includes('ikjin-po');
    
    if (useClientPdf || isServerless) {
      await generateClientPDF();
    } else {
      await generateServerPDF();
    }
  };

  // 컴포넌트 마운트 시 자동으로 PDF 생성 시작
  useEffect(() => {
    if (isOpen && pdfStatus.status === 'idle') {
      generatePDF();
    }
  }, [isOpen]);

  const handleDownload = () => {
    if (pdfStatus.blob) {
      // 클라이언트 PDF의 경우 Blob 사용
      ClientPdfGenerator.downloadPdf(
        pdfStatus.blob, 
        `PO_${orderData?.orderNumber || 'draft'}.pdf`
      );
    } else if (pdfStatus.url && onDownload) {
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
    if (pdfStatus.blob) {
      // 클라이언트 PDF의 경우
      ClientPdfGenerator.previewPdf(pdfStatus.blob);
    } else if (pdfStatus.url) {
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
                onClick={() => {
                  setUseClientPdf(true);
                  generateClientPDF();
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                브라우저 PDF 생성
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
                  // 클라이언트 PDF로 전환하여 재시도
                  setUseClientPdf(true);
                  generateClientPDF();
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
          <TabsTrigger value="preview">발주서 미리보기</TabsTrigger>
          <TabsTrigger value="pdf">PDF 생성</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="flex-1 overflow-auto">
          {/* order-preview.tsx와 동일한 레이아웃 적용 */}
          <div className="order-preview-container bg-white" style={{
            fontFamily: '"Noto Sans KR", "Malgun Gothic", sans-serif',
            fontSize: '11px',
            lineHeight: '1.3',
            color: '#000',
            backgroundColor: '#fff',
            width: '210mm',
            minHeight: '297mm',
            padding: '10mm',
            margin: '0 auto',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)'
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderBottom: '2px solid #333', 
              paddingBottom: '8px', 
              marginBottom: '15px' 
            }}>
              <h1 style={{ 
                margin: '0', 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#333' 
              }}>
                발주서 Purchase Order
              </h1>
              <div style={{ 
                fontSize: '10px', 
                color: '#666' 
              }}>
                발주번호: {orderData?.orderNumber || 'PO-TEMP-001'}
              </div>
            </div>
            
            {/* Info grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '20px', 
              marginBottom: '20px' 
            }}>
              <div>
                <h3 style={{ 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  margin: '0 0 8px 0', 
                  backgroundColor: '#f5f5f5', 
                  padding: '4px 8px', 
                  border: '1px solid #ddd' 
                }}>
                  거래처 정보
                </h3>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>회사명:</span>
                  <span style={{ flex: '1' }}>{orderData?.vendorName || orderData?.vendor?.name || '-'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>사업자번호:</span>
                  <span style={{ flex: '1' }}>{orderData?.vendor?.businessNumber || '-'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>연락처:</span>
                  <span style={{ flex: '1' }}>{orderData?.vendor?.phone || '-'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>이메일:</span>
                  <span style={{ flex: '1' }}>{orderData?.vendor?.email || '-'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>주소:</span>
                  <span style={{ flex: '1' }}>{orderData?.vendor?.address || '-'}</span>
                </div>
              </div>
              
              <div>
                <h3 style={{ 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  margin: '0 0 8px 0', 
                  backgroundColor: '#f5f5f5', 
                  padding: '4px 8px', 
                  border: '1px solid #ddd' 
                }}>
                  발주 정보
                </h3>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>발주일자:</span>
                  <span style={{ flex: '1' }}>{orderData?.orderDate ? new Date(orderData.orderDate).toLocaleDateString('ko-KR') : new Date().toLocaleDateString('ko-KR')}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>납품희망일:</span>
                  <span style={{ flex: '1' }}>{orderData?.deliveryDate || orderData?.dueDate ? new Date(orderData.deliveryDate || orderData.dueDate).toLocaleDateString('ko-KR') : '-'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>발주자:</span>
                  <span style={{ flex: '1' }}>{orderData?.createdBy || orderData?.user?.name || '시스템'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>상태:</span>
                  <span style={{ flex: '1' }}>
                    {orderData?.status === 'pending' ? '대기' : 
                     orderData?.status === 'approved' ? '승인' : 
                     orderData?.status === 'sent' ? '발송' : orderData?.status || '임시'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Items table */}
            <h3 style={{ 
              fontSize: '12px', 
              fontWeight: 'bold', 
              margin: '0 0 8px 0', 
              backgroundColor: '#f5f5f5', 
              padding: '4px 8px', 
              border: '1px solid #ddd' 
            }}>
              발주 품목
            </h3>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              marginBottom: '15px' 
            }}>
              <thead>
                <tr>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'left', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    품목명
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'left', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    규격
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    수량
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    단가
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    금액
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'left', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    비고
                  </th>
                </tr>
              </thead>
              <tbody>
                {(orderData?.items || []).map((item: any, index: number) => (
                  <tr key={index}>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '6px', 
                      textAlign: 'left', 
                      fontSize: '10px' 
                    }}>
                      {item.itemName || item.name}
                    </td>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '6px', 
                      textAlign: 'left', 
                      fontSize: '10px' 
                    }}>
                      {item.specification || '-'}
                    </td>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '6px', 
                      textAlign: 'right', 
                      fontSize: '10px' 
                    }}>
                      {Number(item.quantity).toLocaleString('ko-KR')}
                    </td>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '6px', 
                      textAlign: 'right', 
                      fontSize: '10px' 
                    }}>
                      ₩{Number(item.unitPrice).toLocaleString('ko-KR')}
                    </td>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '6px', 
                      textAlign: 'right', 
                      fontSize: '10px' 
                    }}>
                      ₩{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('ko-KR')}
                    </td>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '6px', 
                      textAlign: 'left', 
                      fontSize: '10px' 
                    }}>
                      {item.notes || '-'}
                    </td>
                  </tr>
                ))}
                {(!orderData?.items || orderData.items.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ 
                      border: '1px solid #ddd', 
                      padding: '20px', 
                      textAlign: 'center', 
                      fontSize: '10px',
                      color: '#666'
                    }}>
                      품목 정보가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'left', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }} colSpan={4}>
                    총 금액
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    ₩{Number(orderData?.totalAmount || 0).toLocaleString('ko-KR')}
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    backgroundColor: '#f5f5f5' 
                  }}></th>
                </tr>
              </tfoot>
            </table>
            
            {/* Notes */}
            {(orderData?.notes || orderData?.remarks) && (
              <div style={{ 
                marginTop: '15px', 
                padding: '8px', 
                border: '1px solid #ddd', 
                backgroundColor: '#f9f9f9' 
              }}>
                <strong>특이사항:</strong><br />
                {orderData.notes || orderData.remarks}
              </div>
            )}
            
            {/* Print controls */}
            <div className="no-print mt-6 flex justify-center space-x-4">
              <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                <Printer className="h-4 w-4 mr-2" />
                인쇄
              </Button>
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                PDF 다운로드
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="pdf" className="flex-1 overflow-auto">
          {renderPDFViewer()}
        </TabsContent>
        
        <TabsContent value="details" className="flex-1 overflow-auto">
          {/* order-preview.tsx와 동일한 레이아웃 적용 */}
          <div className="order-preview-container bg-white" style={{
            fontFamily: '"Noto Sans KR", "Malgun Gothic", sans-serif',
            fontSize: '11px',
            lineHeight: '1.3',
            color: '#000',
            backgroundColor: '#fff',
            width: '210mm',
            minHeight: '297mm',
            padding: '10mm',
            margin: '0 auto',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)'
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderBottom: '2px solid #333', 
              paddingBottom: '8px', 
              marginBottom: '15px' 
            }}>
              <h1 style={{ 
                margin: '0', 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#333' 
              }}>
                발주서 Purchase Order
              </h1>
              <div style={{ 
                fontSize: '10px', 
                color: '#666' 
              }}>
                발주번호: {orderData?.orderNumber || 'PO-TEMP-001'}
              </div>
            </div>
            
            {/* Info grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '20px', 
              marginBottom: '20px' 
            }}>
              <div>
                <h3 style={{ 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  margin: '0 0 8px 0', 
                  backgroundColor: '#f5f5f5', 
                  padding: '4px 8px', 
                  border: '1px solid #ddd' 
                }}>
                  거래처 정보
                </h3>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>회사명:</span>
                  <span style={{ flex: '1' }}>{orderData?.vendorName || orderData?.vendor?.name || '-'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>사업자번호:</span>
                  <span style={{ flex: '1' }}>{orderData?.vendor?.businessNumber || '-'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>연락처:</span>
                  <span style={{ flex: '1' }}>{orderData?.vendor?.phone || '-'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>이메일:</span>
                  <span style={{ flex: '1' }}>{orderData?.vendor?.email || '-'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>주소:</span>
                  <span style={{ flex: '1' }}>{orderData?.vendor?.address || '-'}</span>
                </div>
              </div>
              
              <div>
                <h3 style={{ 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  margin: '0 0 8px 0', 
                  backgroundColor: '#f5f5f5', 
                  padding: '4px 8px', 
                  border: '1px solid #ddd' 
                }}>
                  발주 정보
                </h3>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>발주일자:</span>
                  <span style={{ flex: '1' }}>{orderData?.orderDate ? new Date(orderData.orderDate).toLocaleDateString('ko-KR') : new Date().toLocaleDateString('ko-KR')}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>납품희망일:</span>
                  <span style={{ flex: '1' }}>{orderData?.deliveryDate || orderData?.dueDate ? new Date(orderData.deliveryDate || orderData.dueDate).toLocaleDateString('ko-KR') : '-'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>발주자:</span>
                  <span style={{ flex: '1' }}>{orderData?.createdBy || orderData?.user?.name || '시스템'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', width: '80px', flexShrink: '0' }}>상태:</span>
                  <span style={{ flex: '1' }}>
                    {orderData?.status === 'pending' ? '대기' : 
                     orderData?.status === 'approved' ? '승인' : 
                     orderData?.status === 'sent' ? '발송' : orderData?.status || '임시'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Items table */}
            <h3 style={{ 
              fontSize: '12px', 
              fontWeight: 'bold', 
              margin: '0 0 8px 0', 
              backgroundColor: '#f5f5f5', 
              padding: '4px 8px', 
              border: '1px solid #ddd' 
            }}>
              발주 품목
            </h3>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              marginBottom: '15px' 
            }}>
              <thead>
                <tr>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'left', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    품목명
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'left', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    규격
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    수량
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    단가
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    금액
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'left', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    비고
                  </th>
                </tr>
              </thead>
              <tbody>
                {(orderData?.items || []).map((item: any, index: number) => (
                  <tr key={index}>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '6px', 
                      textAlign: 'left', 
                      fontSize: '10px' 
                    }}>
                      {item.itemName || item.name}
                    </td>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '6px', 
                      textAlign: 'left', 
                      fontSize: '10px' 
                    }}>
                      {item.specification || '-'}
                    </td>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '6px', 
                      textAlign: 'right', 
                      fontSize: '10px' 
                    }}>
                      {Number(item.quantity).toLocaleString('ko-KR')}
                    </td>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '6px', 
                      textAlign: 'right', 
                      fontSize: '10px' 
                    }}>
                      ₩{Number(item.unitPrice).toLocaleString('ko-KR')}
                    </td>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '6px', 
                      textAlign: 'right', 
                      fontSize: '10px' 
                    }}>
                      ₩{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('ko-KR')}
                    </td>
                    <td style={{ 
                      border: '1px solid #ddd', 
                      padding: '6px', 
                      textAlign: 'left', 
                      fontSize: '10px' 
                    }}>
                      {item.notes || '-'}
                    </td>
                  </tr>
                ))}
                {(!orderData?.items || orderData.items.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ 
                      border: '1px solid #ddd', 
                      padding: '20px', 
                      textAlign: 'center', 
                      fontSize: '10px',
                      color: '#666'
                    }}>
                      품목 정보가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'left', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }} colSpan={4}>
                    총 금액
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    textAlign: 'right', 
                    fontSize: '10px',
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 'bold' 
                  }}>
                    ₩{Number(orderData?.totalAmount || 0).toLocaleString('ko-KR')}
                  </th>
                  <th style={{ 
                    border: '1px solid #ddd', 
                    padding: '6px', 
                    backgroundColor: '#f5f5f5' 
                  }}></th>
                </tr>
              </tfoot>
            </table>
            
            {/* Notes */}
            {(orderData?.notes || orderData?.remarks) && (
              <div style={{ 
                marginTop: '15px', 
                padding: '8px', 
                border: '1px solid #ddd', 
                backgroundColor: '#f9f9f9' 
              }}>
                <strong>특이사항:</strong><br />
                {orderData.notes || orderData.remarks}
              </div>
            )}
          </div>
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