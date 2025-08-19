import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  ClipboardList, 
  Download, 
  Send, 
  Save,
  Eye,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 컴포넌트들
import ExcelUploadZone from '@/components/workflow-v2/ExcelUploadZone';
import DirectInputForm from '@/components/workflow-v2/DirectInputForm';
import LivePreview from '@/components/workflow-v2/LivePreview';
import ActionBar from '@/components/workflow-v2/ActionBar';
import SmartAssist from '@/components/workflow-v2/SmartAssist';

interface OrderData {
  orderNumber?: string;
  projectName?: string;
  vendorName?: string;
  vendorEmail?: string;
  totalAmount?: number;
  items?: any[];
  processedExcelUrl?: string;
  originalFileName?: string;
  [key: string]: any;
}

interface ProcessingStatus {
  pdf: 'idle' | 'processing' | 'completed' | 'error';
  vendor: 'idle' | 'processing' | 'completed' | 'error';
  email: 'idle' | 'processing' | 'completed' | 'error';
  order: 'idle' | 'processing' | 'completed' | 'error';
}

const CreateOrderUnifiedV2: React.FC = () => {
  const { toast } = useToast();
  const [activeMethod, setActiveMethod] = useState<'excel' | 'direct' | null>(null);
  const [orderData, setOrderData] = useState<OrderData>({});
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    pdf: 'idle',
    vendor: 'idle',
    email: 'idle',
    order: 'idle'
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 페이지 초기화 함수
  const resetPageState = useCallback(() => {
    console.log('🔄 발주서 작성 페이지 초기화');
    setActiveMethod(null);
    setOrderData({});
    setProcessingStatus({
      pdf: 'idle',
      vendor: 'idle',
      email: 'idle',
      order: 'idle'
    });
    setPdfUrl(null);
    setIsAutoSaving(false);
    setHasUnsavedChanges(false);
    // 로컬 스토리지의 임시 데이터도 정리
    localStorage.removeItem('draftOrder');
  }, []);

  // 페이지 로드 시 초기화 (사이드바에서 같은 페이지 클릭 시에도 동작)
  useEffect(() => {
    const handlePageReset = () => {
      console.log('🎯 페이지 포커스 감지 - 상태 확인');
      // 현재 활성 상태라면 초기화
      if (activeMethod !== null) {
        resetPageState();
      }
    };

    // 페이지가 포커스를 받을 때 초기화
    window.addEventListener('focus', handlePageReset);
    
    return () => {
      window.removeEventListener('focus', handlePageReset);
    };
  }, [activeMethod, resetPageState]);

  // 자동 저장
  useEffect(() => {
    if (hasUnsavedChanges && orderData.orderNumber) {
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [orderData, hasUnsavedChanges]);

  // 실시간 PDF 생성 - 발주서 정보가 모두 준비되고 잠시 후에 생성
  useEffect(() => {
    if (orderData.orderNumber && orderData.vendorName && orderData.projectName && orderData.items?.length > 0) {
      // 500ms 지연 후 PDF 생성 (사용자가 정보를 확인할 시간 제공)
      const timer = setTimeout(() => {
        generatePdfPreview();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [orderData.orderNumber, orderData.vendorName, orderData.projectName, orderData.items]);

  const handleAutoSave = async () => {
    setIsAutoSaving(true);
    try {
      // 로컬 스토리지에 임시 저장
      localStorage.setItem('draftOrder', JSON.stringify(orderData));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const generatePdfPreview = async () => {
    if (!orderData.orderNumber) return;
    
    console.log('🔵 PDF 생성 시작:', orderData);
    setProcessingStatus(prev => ({ ...prev, pdf: 'processing' }));
    
    try {
      // Calculate total amount if not already set
      const totalAmount = orderData.totalAmount || 
        (orderData.items || []).reduce((sum: number, item: any) => 
          sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
      
      const pdfOrderData = {
        ...orderData,
        totalAmount
      };
      
      console.log('🔵 PDF 생성 요청 데이터:', pdfOrderData);
      
      const response = await fetch('/api/orders/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderData: pdfOrderData })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔵 PDF 생성 응답:', result);
        
        // Ensure the PDF URL is absolute
        const absolutePdfUrl = result.pdfUrl.startsWith('http') 
          ? result.pdfUrl 
          : `${window.location.origin}${result.pdfUrl}`;
        
        console.log('🔵 PDF URL:', absolutePdfUrl);
        setPdfUrl(absolutePdfUrl);
        setProcessingStatus(prev => ({ ...prev, pdf: 'completed' }));
        
        // Test if PDF is accessible
        fetch(absolutePdfUrl, { method: 'HEAD' })
          .then(res => {
            console.log('🔵 PDF 접근성 테스트:', res.status, res.headers.get('content-type'));
          })
          .catch(err => {
            console.error('🔴 PDF 접근 실패:', err);
          });
      } else {
        const errorText = await response.text();
        console.error('🔴 PDF 생성 실패 응답:', response.status, errorText);
        throw new Error(`PDF 생성 실패: ${response.status}`);
      }
    } catch (error) {
      setProcessingStatus(prev => ({ ...prev, pdf: 'error' }));
      console.error('🔴 PDF generation error:', error);
    }
  };

  const handleMethodSelect = (method: 'excel' | 'direct') => {
    setActiveMethod(method);
    // 이전 작업 이력 확인
    const savedDraft = localStorage.getItem('draftOrder');
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      if (window.confirm('저장된 임시 작업이 있습니다. 불러오시겠습니까?')) {
        setOrderData(draft);
      }
    }
  };

  const handleDataUpdate = (data: Partial<OrderData>) => {
    setOrderData(prev => ({ ...prev, ...data }));
    setHasUnsavedChanges(true);
    
    // 거래처 정보 자동 확인
    if (data.vendorName && data.vendorName !== orderData.vendorName) {
      validateVendor(data.vendorName);
    }
  };

  const handleProcessedFileReady = (fileInfo: { url: string; name: string }) => {
    setOrderData(prev => ({ 
      ...prev, 
      processedExcelUrl: fileInfo.url,
      originalFileName: fileInfo.name
    }));
  };

  const validateVendor = async (vendorName: string) => {
    setProcessingStatus(prev => ({ ...prev, vendor: 'processing' }));
    
    try {
      const response = await fetch('/api/vendors/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorName })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.isValid) {
          setProcessingStatus(prev => ({ ...prev, vendor: 'completed' }));
          // 이메일 자동 완성
          if (result.vendorEmail) {
            setOrderData(prev => ({ ...prev, vendorEmail: result.vendorEmail }));
          }
        } else {
          setProcessingStatus(prev => ({ ...prev, vendor: 'error' }));
        }
      }
    } catch (error) {
      setProcessingStatus(prev => ({ ...prev, vendor: 'error' }));
    }
  };

  const handleCreateOrder = async () => {
    if (!orderData.orderNumber || !orderData.vendorName || !orderData.projectName || !orderData.items?.length) {
      toast({
        title: '생성 불가',
        description: '필수 정보를 모두 입력해주세요.',
        variant: 'destructive'
      });
      return;
    }

    setProcessingStatus(prev => ({ ...prev, order: 'processing' }));
    
    // 인증 상태 확인
    try {
      const authResponse = await fetch('/api/auth/user');
      console.log('🔐 인증 상태 확인:', authResponse.status);
      if (!authResponse.ok) {
        console.error('🔴 인증 실패 - 로그인 필요');
        toast({
          title: '인증 필요',
          description: '로그인이 필요합니다. 로그인 페이지로 이동합니다.',
          variant: 'destructive'
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      const userData = await authResponse.json();
      console.log('🔐 현재 사용자:', userData);
    } catch (authError) {
      console.error('🔴 인증 확인 실패:', authError);
    }
    
    try {
      console.log('🟢 발주서 생성 시작:', orderData);
      
      // FormData 생성 (기존 API 형식에 맞춤)
      const formData = new FormData();
      
      // 기본 필드들
      formData.append('projectId', '1'); // 임시 프로젝트 ID
      formData.append('vendorId', '1'); // 임시 거래처 ID  
      formData.append('deliveryDate', orderData.deliveryDate || new Date().toISOString());
      formData.append('notes', orderData.notes || `발주서 작성으로 생성된 발주서 - ${orderData.orderNumber}`);
      
      // 품목 데이터 매핑 - API가 기대하는 형식으로 변환
      const mappedItems = (orderData.items || []).map((item: any) => ({
        itemName: item.name || item.itemName || '',
        specification: item.specification || '',
        unit: item.unit || 'EA',
        quantity: parseFloat(item.quantity || '0'),
        unitPrice: parseFloat(item.unitPrice || '0'),
        totalAmount: parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0'),
        majorCategory: item.majorCategory || '',
        middleCategory: item.middleCategory || '',
        minorCategory: item.minorCategory || '',
        notes: item.notes || ''
      }));
      
      formData.append('items', JSON.stringify(mappedItems));
      
      console.log('🟢 발주서 생성 요청 데이터:', {
        projectId: '1',
        vendorId: '1',
        deliveryDate: orderData.deliveryDate || new Date().toISOString(),
        notes: orderData.notes || `발주서 작성으로 생성된 발주서 - ${orderData.orderNumber}`,
        items: mappedItems
      });
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        body: formData
      });
      
      console.log('🟢 발주서 생성 응답 상태:', response.status);
      
      if (response.ok) {
        const createdOrder = await response.json();
        console.log('🟢 생성된 발주서:', createdOrder);
        setProcessingStatus(prev => ({ ...prev, order: 'completed' }));
        
        toast({
          title: '생성 완료',
          description: `발주서가 성공적으로 생성되었습니다. (${createdOrder.orderNumber || orderData.orderNumber})`
        });
        
        // 로컬 스토리지 정리
        localStorage.removeItem('draftOrder');
        
        // 3초 후 발주서 관리 페이지로 리다이렉트
        setTimeout(() => {
          window.location.href = '/orders';
        }, 3000);
      } else {
        const errorText = await response.text();
        console.error('🔴 발주서 생성 실패 응답:', response.status, errorText);
        let errorMessage = '발주서 생성 실패';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      setProcessingStatus(prev => ({ ...prev, order: 'error' }));
      toast({
        title: '생성 실패',
        description: error instanceof Error ? error.message : '발주서 생성 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handleCreateOrderWithEmail = async (emailSettings: any) => {
    console.log('📧 발주서 생성 및 이메일 발송 시작:', { orderData, emailSettings });
    
    if (!orderData.orderNumber || !orderData.vendorName || !orderData.projectName || !orderData.items?.length) {
      toast({
        title: '생성 불가',
        description: '필수 정보를 모두 입력해주세요.',
        variant: 'destructive'
      });
      return;
    }

    setProcessingStatus(prev => ({ ...prev, order: 'processing', email: 'processing' }));
    
    try {
      // 1. 먼저 발주서 생성
      console.log('🟢 Step 1: 발주서 생성');
      const formData = new FormData();
      formData.append('projectId', '1');
      formData.append('vendorId', '1');
      formData.append('deliveryDate', orderData.deliveryDate || new Date().toISOString());
      formData.append('notes', orderData.notes || `발주서 작성으로 생성된 발주서 - ${orderData.orderNumber}`);
      
      const mappedItems = (orderData.items || []).map((item: any) => ({
        itemName: item.name || item.itemName || '',
        specification: item.specification || '',
        unit: item.unit || 'EA',
        quantity: parseFloat(item.quantity || '0'),
        unitPrice: parseFloat(item.unitPrice || '0'),
        totalAmount: parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0'),
        majorCategory: item.majorCategory || '',
        middleCategory: item.middleCategory || '',
        minorCategory: item.minorCategory || '',
        notes: item.notes || ''
      }));
      
      formData.append('items', JSON.stringify(mappedItems));
      
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        body: formData
      });
      
      if (!orderResponse.ok) {
        throw new Error('발주서 생성 실패');
      }
      
      const createdOrder = await orderResponse.json();
      console.log('🟢 발주서 생성 완료:', createdOrder);
      setProcessingStatus(prev => ({ ...prev, order: 'completed' }));
      
      // 2. 이메일 발송 (처리된 엑셀 파일이 있는 경우에만)
      console.log('📧 Step 2: 이메일 발송');
      if (orderData.processedExcelUrl) {
        try {
          const emailResponse = await fetch('/api/orders/send-email-with-excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emailSettings: {
                to: emailSettings.to,
                cc: emailSettings.cc || '',
                subject: emailSettings.subject,
                message: emailSettings.message,
                orderNumber: orderData.orderNumber,
                vendorName: orderData.vendorName,
                totalAmount: orderData.totalAmount
              },
              excelFilePath: orderData.processedExcelUrl,
              orderData: orderData
            })
          });
          
          if (emailResponse.ok) {
            console.log('📧 이메일 발송 성공');
            setProcessingStatus(prev => ({ ...prev, email: 'completed' }));
            
            toast({
              title: '생성 및 발송 완료',
              description: `발주서가 생성되고 이메일이 발송되었습니다. (${createdOrder.orderNumber || orderData.orderNumber})`
            });
          } else {
            throw new Error('이메일 발송 실패');
          }
        } catch (emailError) {
          console.error('📧 이메일 발송 실패:', emailError);
          setProcessingStatus(prev => ({ ...prev, email: 'error' }));
          
          toast({
            title: '부분 완료',
            description: '발주서는 생성되었으나 이메일 발송에 실패했습니다.',
            variant: 'destructive'
          });
        }
      } else {
        // PDF만으로 이메일 발송
        try {
          const emailResponse = await fetch('/api/orders/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderData: {
                ...orderData,
                vendorEmail: emailSettings.to
              },
              pdfUrl: pdfUrl,
              recipients: [emailSettings.to],
              emailSettings: {
                subject: emailSettings.subject,
                message: emailSettings.message,
                cc: emailSettings.cc
              }
            })
          });
          
          if (emailResponse.ok) {
            console.log('📧 PDF 이메일 발송 성공');
            setProcessingStatus(prev => ({ ...prev, email: 'completed' }));
            
            toast({
              title: '생성 및 발송 완료',
              description: `발주서가 생성되고 PDF 이메일이 발송되었습니다.`
            });
          } else {
            throw new Error('PDF 이메일 발송 실패');
          }
        } catch (emailError) {
          console.error('📧 PDF 이메일 발송 실패:', emailError);
          setProcessingStatus(prev => ({ ...prev, email: 'error' }));
          
          toast({
            title: '부분 완료',
            description: '발주서는 생성되었으나 이메일 발송에 실패했습니다.',
            variant: 'destructive'
          });
        }
      }
      
      // 로컬 스토리지 정리
      localStorage.removeItem('draftOrder');
      
      // 3초 후 발주서 관리 페이지로 리다이렉트
      setTimeout(() => {
        window.location.href = '/orders';
      }, 3000);
      
    } catch (error) {
      console.error('🔴 발주서 생성 및 이메일 발송 실패:', error);
      setProcessingStatus(prev => ({ ...prev, order: 'error', email: 'error' }));
      toast({
        title: '실패',
        description: error instanceof Error ? error.message : '발주서 생성 및 이메일 발송 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handleSendEmail = async () => {
    if (!orderData.vendorEmail) {
      toast({
        title: '발송 불가',
        description: '수신자 이메일을 입력해주세요.',
        variant: 'destructive'
      });
      return;
    }

    setProcessingStatus(prev => ({ ...prev, email: 'processing' }));
    
    try {
      const response = await fetch('/api/orders/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderData,
          pdfUrl: pdfUrl || null, // PDF가 없어도 발송 가능
          recipients: [orderData.vendorEmail]
        })
      });
      
      if (response.ok) {
        setProcessingStatus(prev => ({ ...prev, email: 'completed' }));
        toast({
          title: '발송 완료',
          description: '발주서가 성공적으로 발송되었습니다.'
        });
        
        // 로컬 스토리지 정리
        localStorage.removeItem('draftOrder');
        
        // 3초 후 리다이렉트
        setTimeout(() => {
          window.location.href = '/orders';
        }, 3000);
      } else {
        throw new Error('이메일 발송 실패');
      }
    } catch (error) {
      setProcessingStatus(prev => ({ ...prev, email: 'error' }));
      toast({
        title: '발송 실패',
        description: '이메일 발송 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const getProgressValue = () => {
    const statuses = Object.values(processingStatus);
    const completed = statuses.filter(s => s === 'completed').length;
    return (completed / statuses.length) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">발주서 작성</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">한 화면에서 모든 작업을 완료하세요</p>
            </div>
            <div className="flex items-center gap-3">
              {/* 새로 작성 버튼 - 작업 중일 때만 표시 */}
              {activeMethod && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('현재 작업 중인 내용이 모두 삭제됩니다. 새로 작성하시겠습니까?')) {
                      resetPageState();
                      toast({
                        title: '새로 작성',
                        description: '발주서 작성 화면이 초기화되었습니다.'
                      });
                    }
                  }}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  새로 작성
                </Button>
              )}
              
              {isAutoSaving && (
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  자동 저장 중...
                </Badge>
              )}
              {!isAutoSaving && !hasUnsavedChanges && orderData.orderNumber && (
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  저장됨
                </Badge>
              )}
              <Progress value={getProgressValue()} className="w-32 h-2" />
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto px-6 py-6">
        {/* 사용팁 및 템플릿 다운로드 */}
        {!activeMethod && (
          <div className="mb-8">
            <Alert className="mb-6 max-w-4xl mx-auto">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">📋 사용팁</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-600">엑셀 파일 업로드:</span> 대량 발주서, 반복 업무, 자동화 처리에 적합 (50건+ 권장)
                    </div>
                    <div>
                      <span className="font-medium text-green-600">직접 입력:</span> 소량 발주서, 세밀한 조정, 즉시 처리에 적합 (10건 이하 권장)
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={async () => {
                        try {
                          // 파일 존재 여부 확인 후 다운로드
                          const response = await fetch('/PO_Excel_Template.xlsx');
                          if (response.ok) {
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = 'PO_Excel_Template.xlsx';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          } else {
                            throw new Error('파일을 찾을 수 없습니다');
                          }
                        } catch (error) {
                          console.error('엑셀 템플릿 다운로드 실패:', error);
                          toast({
                            title: '다운로드 실패',
                            description: '엑셀 템플릿 다운로드에 실패했습니다.',
                            variant: 'destructive'
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      엑셀 템플릿 다운로드
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* 방법 선택 (처음에만 표시) */}
        {!activeMethod && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
              onClick={() => handleMethodSelect('excel')}
            >
              <CardContent className="p-8 text-center">
                <Upload className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                <h3 className="text-xl font-semibold mb-2">엑셀 파일 업로드</h3>
                <p className="text-gray-600 mb-4">기존 엑셀 파일을 업로드하여 빠르게 작성</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>✅ 대량 처리 (50건+)</div>
                  <div>✅ 자동화 워크플로우</div>
                  <div>✅ 거래처 자동 매칭</div>
                  <div>✅ 이메일 자동 발송</div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-500"
              onClick={() => handleMethodSelect('direct')}
            >
              <CardContent className="p-8 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <h3 className="text-xl font-semibold mb-2">직접 입력</h3>
                <p className="text-gray-600 mb-4">폼을 통해 직접 정보 입력</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>✅ 소량 처리 (10건 이하)</div>
                  <div>✅ 즉시 처리</div>
                  <div>✅ 실시간 검증</div>
                  <div>✅ 세밀한 조정</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 선택된 방법에 따른 화면 */}
        {activeMethod && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 왼쪽: 입력 영역 */}
            <div className="space-y-6">
              {/* 입력 컴포넌트 */}
              <Card>
                <CardContent className="p-6">
                  {activeMethod === 'excel' && (
                    <ExcelUploadZone 
                      onDataExtracted={handleDataUpdate}
                      onProcessedFileReady={handleProcessedFileReady}
                    />
                  )}
                  {activeMethod === 'direct' && (
                    <DirectInputForm 
                      initialData={orderData}
                      onChange={handleDataUpdate} 
                    />
                  )}
                </CardContent>
              </Card>

              {/* 스마트 어시스트 */}
              <SmartAssist 
                orderData={orderData}
                onSuggestionApply={handleDataUpdate}
              />
            </div>

            {/* 오른쪽: 실시간 미리보기 */}
            <div className="space-y-6">
              <LivePreview 
                orderData={orderData}
                pdfUrl={pdfUrl}
                processingStatus={processingStatus}
              />
            </div>
          </div>
        )}

        {/* 하단 액션바 */}
        {activeMethod && orderData.orderNumber && (
          <ActionBar 
            orderData={orderData}
            pdfUrl={pdfUrl}
            processingStatus={processingStatus}
            onSave={handleAutoSave}
            onSend={handleSendEmail}
            onCreateOrder={handleCreateOrder}
            onCreateOrderWithEmail={handleCreateOrderWithEmail}
            onDownload={() => {
              if (pdfUrl) {
                // 다운로드 모드로 PDF 열기
                window.open(`${pdfUrl}?download=true`, '_blank');
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CreateOrderUnifiedV2;