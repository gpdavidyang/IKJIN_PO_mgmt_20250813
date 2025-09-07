/**
 * Excel 발주서 자동화 처리 마법사 컴포넌트
 * 
 * 단계별 프로세스:
 * 1. 파일 업로드 및 초기 처리
 * 2. 거래처 검증 및 선택
 * 3. 이메일 미리보기 및 확인
 * 4. 이메일 발송 및 결과
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useTheme } from '@/components/ui/theme-provider';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  Users, 
  AlertTriangle,
  Send,
  Download,
  Trash2
} from 'lucide-react';
import { VendorValidationModal } from './vendor-validation-modal';
import { EmailSendDialog } from './email-send-dialog';

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

interface VendorValidation {
  validVendors: Array<{
    vendorName: string;
    email: string;
    vendorId: number;
  }>;
  invalidVendors: Array<{
    vendorName: string;
    suggestions: Array<{
      id: number;
      name: string;
      email: string;
      similarity: number;
    }>;
  }>;
  needsUserAction: boolean;
}

interface EmailPreview {
  recipients: string[];
  subject: string;
  attachmentInfo: {
    originalFile: string;
    processedFile: string;
    fileSize: number;
  };
  canProceed: boolean;
}

interface AutomationData {
  savedOrders: number;
  vendorValidation: VendorValidation;
  emailPreview: EmailPreview;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  pdfGeneration?: {
    total: number;
    successful: number;
    failed: number;
    attachmentIds: number[];
  };
}

export function ExcelAutomationWizard() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [currentStep, setCurrentStep] = useState(0);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    {
      id: 'upload',
      title: '파일 업로드 및 파싱',
      description: 'Excel 파일을 업로드하고 Input 시트를 파싱합니다',
      status: 'pending'
    },
    {
      id: 'save',
      title: '데이터베이스 저장',
      description: '발주서 데이터를 데이터베이스에 저장합니다',
      status: 'pending'
    },
    {
      id: 'validate',
      title: '거래처 검증',
      description: '거래처명을 검증하고 이메일 주소를 확인합니다',
      status: 'pending'
    },
    {
      id: 'preview',
      title: '이메일 미리보기',
      description: '발송할 이메일 내용과 수신자를 확인합니다',
      status: 'pending'
    }
  ]);

  const [automationData, setAutomationData] = useState<AutomationData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<Array<{
    originalName: string;
    selectedVendorId: number;
    selectedVendorEmail: string;
  }>>([]);
  const [emailResults, setEmailResults] = useState<any>(null);
  // EmailSendDialog 상태
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [currentOrderForEmail, setCurrentOrderForEmail] = useState<any>(null);

  // 파일 드롭 핸들러
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setCurrentStep(0);

    // 단계별 상태 초기화
    setProcessingSteps(steps => steps.map(step => ({ ...step, status: 'pending' })));

    try {
      // 1단계: 파일 업로드 및 처리
      updateStepStatus('upload', 'processing');
      
      const formData = new FormData();
      formData.append('file', file);

      console.log('📤 [클라이언트] 파일 업로드 시작:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 58000); // 58초 타임아웃 (서버 55초 + 여유 3초)

      const response = await fetch('/api/excel-automation/upload-and-process', {
        method: 'POST',
        body: formData,
        credentials: 'include', // 인증 쿠키 포함
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('📥 [클라이언트] 서버 응답 수신:', {
        status: response.status,
        ok: response.ok
      });

      // Handle authentication errors
      if (response.status === 401) {
        setError('인증이 만료되었습니다. 페이지를 새로고침하고 다시 로그인해주세요.');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `서버 오류 (${response.status})`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '파일 처리 실패');
      }

      updateStepStatus('upload', 'completed');
      updateStepStatus('save', 'completed');
      updateStepStatus('validate', 'completed');
      updateStepStatus('preview', 'completed');

      setAutomationData(result.data);
      
      // 거래처 검증이 필요한 경우 모달 표시
      if (result.data.vendorValidation.needsUserAction) {
        setShowVendorModal(true);
      } else {
        setCurrentStep(1); // 이메일 미리보기 단계로
      }

    } catch (error) {
      console.error('📋 [클라이언트] 자동화 처리 오류:', error);
      
      // 더 자세한 에러 정보 제공
      let errorMessage = '알 수 없는 오류가 발생했습니다';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // 네트워크 및 처리 오류 감지
        if (error.message.includes('Failed to fetch')) {
          errorMessage = '서버 연결에 실패했습니다. 네트워크 상태를 확인해주세요.';
        } else if (error.message.includes('timeout') || error.name === 'AbortError') {
          errorMessage = '요청 시간이 초과되었습니다. 파일 크기를 줄이거나 나누어서 업로드해주세요.';
        } else if (error.message.includes('500')) {
          errorMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.message.includes('413')) {
          errorMessage = '파일 크기가 너무 큽니다 (최대 10MB). 더 작은 파일로 시도해주세요.';
        } else if (error.message.includes('422')) {
          errorMessage = '파일 형식이 올바르지 않습니다. Excel 파일(.xlsx, .xlsm, .xls)만 업로드 가능합니다.';
        }
      }
      
      console.error('📋 [클라이언트] 최종 에러 메시지:', errorMessage);
      setError(errorMessage);
      updateStepStatus('upload', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject, rejectedFiles } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    maxSize: 10485760, // 10MB
    disabled: isProcessing,
    onDropRejected: (rejectedFiles) => {
      const file = rejectedFiles[0];
      if (file) {
        if (file.file.size > 10485760) {
          setError('파일 크기가 10MB를 초과합니다. 더 작은 파일을 선택해주세요.');
        } else {
          setError('지원하지 않는 파일 형식입니다. .xlsx, .xlsm, .xls 파일만 업로드 가능합니다.');
        }
      }
    }
  });

  const updateStepStatus = (stepId: string, status: ProcessingStep['status']) => {
    setProcessingSteps(steps =>
      steps.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const handleVendorSelection = async (selections: typeof selectedVendors) => {
    if (!automationData?.filePath) return;

    setSelectedVendors(selections);
    setShowVendorModal(false);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/excel-automation/update-email-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 인증 쿠키 포함
        body: JSON.stringify({
          filePath: automationData.filePath,
          selectedVendors: selections
        }),
      });

      if (response.status === 401) {
        setError('인증이 만료되었습니다. 페이지를 새로고침하고 다시 로그인해주세요.');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`서버 오류 (${response.status}): ${errorText || response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setAutomationData(prev => prev ? {
          ...prev,
          emailPreview: result.data.emailPreview
        } : null);
        setCurrentStep(1);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : '이메일 미리보기 업데이트 실패');
    } finally {
      setIsProcessing(false);
    }
  };

  // 이메일 모달 열기
  const handleOpenEmailDialog = () => {
    if (!automationData?.emailPreview) return;
    
    // 첫 번째 발주서 정보를 기반으로 이메일 데이터 생성
    const orderData = {
      orderNumber: `AUTO-${Date.now()}`,
      vendorName: selectedVendors[0]?.selectedVendorEmail ? 
        selectedVendors.find(v => v.selectedVendorEmail === automationData.emailPreview.recipients[0])?.originalName || 'Unknown' : 
        'Multiple Vendors',
      vendorEmail: automationData.emailPreview.recipients[0],
      orderDate: new Date().toLocaleDateString(),
      totalAmount: 0, // Excel 자동화에서는 총액이 없으므로 0
      siteName: '자동화 발주서'
    };
    
    setCurrentOrderForEmail({
      ...orderData,
      attachmentInfo: automationData.emailPreview.attachmentInfo
    });
    setEmailDialogOpen(true);
  };

  // EmailSendDialog에서 실제 이메일 발송
  const handleSendEmailFromDialog = async (emailData: any) => {
    if (!automationData?.emailPreview) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch('/api/excel-automation/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          processedFilePath: `uploads/${automationData.emailPreview.attachmentInfo.processedFile}`,
          recipients: emailData.to, // 사용자가 입력한 수신자
          emailOptions: {
            subject: emailData.subject,
            orderNumber: currentOrderForEmail?.orderNumber || `AUTO-${Date.now()}`,
            additionalMessage: emailData.message || '자동화 시스템을 통해 발송된 발주서입니다.',
            cc: emailData.cc || []
          }
        }),
      });
      
      if (response.status === 401) {
        setError('인증이 만료되었습니다. 페이지를 새로고침하고 다시 로그인해주세요.');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`서버 오류 (${response.status}): ${errorText || response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setEmailResults(result.data);
        setCurrentStep(2); // 결과 단계로 이동
        setEmailDialogOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '이메일 발송 실패');
      throw error; // EmailSendDialog에서 에러를 표시할 수 있도록
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAutomationData(null);
    setError(null);
    setSelectedVendors([]);
    setEmailResults(null);
    setProcessingSteps(steps => steps.map(step => ({ ...step, status: 'pending' })));
  };

  const formatFileSize = (bytes: number) => {
    return bytes > 1024 * 1024 
      ? `${(bytes / (1024 * 1024)).toFixed(1)}MB`
      : `${(bytes / 1024).toFixed(1)}KB`;
  };

  const renderStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <div className={`h-5 w-5 border-2 border-t-transparent rounded-full animate-spin transition-colors ${isDarkMode ? 'border-blue-400' : 'border-blue-500'}`} />;
      default:
        return <div className={`h-5 w-5 border-2 rounded-full transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`} />;
    }
  };

  // 1단계: 파일 업로드
  if (currentStep === 0 && !automationData) {
    return (
      <div className="space-y-6">
        <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Upload className="h-5 w-5" />
              Excel 발주서 자동화 처리
            </CardTitle>
            <CardDescription className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Excel 파일을 업로드하면 발주서 데이터 저장부터 이메일 발송까지 자동으로 처리됩니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                isDragReject
                  ? (isDarkMode ? 'border-red-400 bg-red-900/30 scale-105' : 'border-red-500 bg-red-50 scale-105')
                  : isDragActive 
                    ? (isDarkMode ? 'border-blue-400 bg-blue-900/30 scale-105 shadow-lg' : 'border-blue-500 bg-blue-50 scale-105 shadow-lg')
                    : (isDarkMode ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/20' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50')
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
            >
              <input {...getInputProps()} />
              
              {/* 업로드 아이콘 - 드래그 상태에 따라 애니메이션 */}
              <div className={`transition-all duration-300 ${isDragActive ? 'animate-bounce' : isDragReject ? 'animate-pulse' : ''}`}>
                {isDragReject ? (
                  <XCircle className={`h-16 w-16 mx-auto mb-4 transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                ) : isDragActive ? (
                  <Upload className={`h-16 w-16 mx-auto mb-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                ) : (
                  <FileText className={`h-12 w-12 mx-auto mb-4 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} group-hover:text-blue-500`} />
                )}
              </div>

              {/* 드래그 상태에 따른 텍스트 */}
              {isDragReject ? (
                <div>
                  <p className={`text-lg font-semibold mb-2 transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    지원하지 않는 파일입니다! ❌
                  </p>
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-red-300' : 'text-red-500'}`}>
                    .xlsx, .xlsm, .xls 파일만 업로드 가능합니다
                  </p>
                </div>
              ) : isDragActive ? (
                <div>
                  <p className={`text-lg font-semibold mb-2 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    파일을 여기에 놓으세요! 📁
                  </p>
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-blue-300' : 'text-blue-500'}`}>
                    Excel 파일이 자동으로 처리됩니다
                  </p>
                </div>
              ) : (
                <div>
                  <p className={`text-lg mb-2 font-medium transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    📄 Excel 파일을 드래그하거나 클릭하여 업로드
                  </p>
                  <p className={`text-sm mb-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    .xlsx, .xlsm, .xls 파일 지원 (최대 10MB)
                  </p>
                  
                  {/* 버튼 스타일 추가 */}
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={isProcessing}
                      className={`transition-colors ${
                        isDarkMode 
                          ? 'border-gray-600 hover:border-blue-400 hover:text-blue-400' 
                          : 'border-gray-300 hover:border-blue-500 hover:text-blue-600'
                      }`}
                      onClick={(e) => e.preventDefault()} // 클릭 이벤트는 getRootProps가 처리
                    >
                      파일 선택하기
                    </Button>
                  </div>
                </div>
              )}

              {/* 드래그 오버레이 효과 */}
              {isDragActive && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 animate-pulse" />
              )}
            </div>

            {isProcessing && (
              <div className="mt-6 space-y-4">
                <div className={`flex items-center justify-between text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span>처리 진행 상황</span>
                  <span>{processingSteps.filter(s => s.status === 'completed').length} / {processingSteps.length}</span>
                </div>
                
                <Progress 
                  value={(processingSteps.filter(s => s.status === 'completed').length / processingSteps.length) * 100} 
                />

                <div className="space-y-2">
                  {processingSteps.map((step) => (
                    <div key={step.id} className={`flex items-center gap-3 p-2 rounded transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      {renderStepIcon(step.status)}
                      <div className="flex-1">
                        <div className={`font-medium transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{step.title}</div>
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{step.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <Alert className="mt-4" variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // 거래처 검증 모달
  if (showVendorModal && automationData) {
    // VendorValidationModal에서 기대하는 형태로 데이터 변환
    const validationData = {
      vendorValidations: automationData.vendorValidation.invalidVendors.map(vendor => ({
        vendorName: vendor.vendorName,
        exists: false,
        suggestions: vendor.suggestions?.map(s => ({
          ...s,
          contactPerson: s.contactPerson || '',
          distance: s.distance || 0
        })) || []
      })),
      deliveryValidations: [], // 현재는 납품처 검증을 별도로 하지 않음
      emailConflicts: [], // 현재는 이메일 충돌 검증을 별도로 하지 않음
      summary: {
        totalVendors: automationData.vendorValidation.validVendors.length + automationData.vendorValidation.invalidVendors.length,
        totalDeliveries: 0,
        unregisteredVendors: automationData.vendorValidation.invalidVendors.length,
        unregisteredDeliveries: 0,
        emailConflicts: 0,
        needsAction: automationData.vendorValidation.needsUserAction
      }
    };

    return (
      <VendorValidationModal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        validationData={validationData}
        onConfirm={(resolvedVendors) => {
          // 해결된 거래처 데이터를 우리가 기대하는 형태로 변환
          const selections = resolvedVendors
            .filter(vendor => vendor.action === 'use_existing' && vendor.existingVendorId)
            .map(vendor => ({
              originalName: vendor.originalName,
              selectedVendorId: vendor.existingVendorId!,
              selectedVendorEmail: '' // 실제로는 vendors 테이블에서 조회해야 함
            }));
          
          handleVendorSelection(selections);
        }}
      />
    );
  }

  // 2단계: 이메일 미리보기
  if (currentStep === 1 && automationData) {
    return (
      <div className="space-y-6">
        <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Mail className="h-5 w-5" />
              이메일 발송 미리보기
            </CardTitle>
            <CardDescription className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              발송할 이메일 내용을 확인하고 전송하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 처리 결과 요약 */}
            <div className="grid grid-cols-3 gap-4">
              <div className={`text-center p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{automationData.savedOrders}</div>
                <div className={`text-sm transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>저장된 발주서</div>
              </div>
              <div className={`text-center p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{automationData.vendorValidation.validVendors.length}</div>
                <div className={`text-sm transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>확인된 거래처</div>
              </div>
              <div className={`text-center p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{automationData.emailPreview.recipients.length}</div>
                <div className={`text-sm transition-colors ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>이메일 수신자</div>
              </div>
            </div>
            
            {/* PDF 생성 상태 표시 */}
            {automationData.pdfGeneration && (
              <Alert className={automationData.pdfGeneration.failed > 0 ? 'border-yellow-500' : 'border-green-500'}>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  PDF 생성 완료: {automationData.pdfGeneration.successful}개 성공
                  {automationData.pdfGeneration.failed > 0 && `, ${automationData.pdfGeneration.failed}개 실패`}
                  {automationData.pdfGeneration.successful > 0 && ' - PDF 파일이 자동으로 첨부됩니다'}
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* 이메일 정보 */}
            <div className="space-y-4">
              <div>
                <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>수신자</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {automationData.emailPreview.recipients.map((email, index) => (
                    <Badge key={index} variant="secondary">{email}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>제목</label>
                <div className={`mt-1 p-2 rounded border transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'}`}>
                  {automationData.emailPreview.subject}
                </div>
              </div>

              <div>
                <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>첨부파일</label>
                <div className="mt-1 space-y-2">
                  <div className={`p-2 rounded border flex items-center gap-2 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <FileText className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className={`flex-1 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{automationData.emailPreview.attachmentInfo.processedFile}</span>
                    <Badge variant="outline">
                      {formatFileSize(automationData.emailPreview.attachmentInfo.fileSize)}
                    </Badge>
                  </div>
                  {automationData.emailPreview.attachmentInfo.processedPdfFile && (
                    <div className={`p-2 rounded border flex items-center gap-2 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <FileText className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
                      <span className={`flex-1 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{automationData.emailPreview.attachmentInfo.processedPdfFile}</span>
                      <Badge variant="outline">
                        {formatFileSize(automationData.emailPreview.attachmentInfo.pdfFileSize || 0)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                처음부터 다시
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/api/excel-automation/download/${automationData.emailPreview.attachmentInfo.processedFile}`;
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Excel 다운로드
                </Button>
                {automationData.emailPreview.attachmentInfo.processedPdfFile && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `/api/excel-automation/download/${automationData.emailPreview.attachmentInfo.processedPdfFile}`;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF 다운로드
                  </Button>
                )}
                <Button 
                  onClick={handleOpenEmailDialog}
                  disabled={!automationData.emailPreview.canProceed || isProcessing}
                >
                  <Send className="h-4 w-4 mr-2" />
                  이메일 발송
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3단계: 발송 결과
  if (currentStep === 2 && emailResults) {
    return (
      <div className="space-y-6">
        <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {emailResults.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              이메일 발송 결과
            </CardTitle>
            <CardDescription className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {emailResults.success 
                ? `모든 이메일이 성공적으로 발송되었습니다 (${emailResults.sentEmails}개)`
                : `일부 이메일 발송에 실패했습니다 (성공: ${emailResults.sentEmails}개, 실패: ${emailResults.failedEmails.length}개)`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 발송 결과 상세 */}
            <div className="space-y-2">
              {emailResults.emailResults.map((result: any, index: number) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded border transition-colors ${
                    result.status === 'sent' 
                      ? (isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200')
                      : (isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.status === 'sent' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{result.email}</span>
                  </div>
                  <div className="text-sm">
                    {result.status === 'sent' ? (
                      <Badge variant="secondary">발송 완료</Badge>
                    ) : (
                      <Badge variant="destructive">실패</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 실패한 이메일 상세 */}
            {emailResults.failedEmails.length > 0 && (
              <div>
                <h4 className={`font-medium mb-2 transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>발송 실패 상세</h4>
                <div className="space-y-2">
                  {emailResults.failedEmails.map((failed: any, index: number) => (
                    <div key={index} className={`p-2 rounded border transition-colors ${isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'}`}>
                      <div className={`font-medium transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{failed.email}</div>
                      <div className={`text-sm transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{failed.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                새 파일 처리
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  // 임시 파일 정리 API 호출
                  fetch('/api/excel-automation/cleanup', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // 인증 쿠키 포함
                    body: JSON.stringify({
                      filePaths: [
                        automationData?.filePath,
                        `uploads/${automationData?.emailPreview.attachmentInfo.processedFile}`,
                        automationData?.emailPreview.attachmentInfo.processedPdfFile ? 
                          `uploads/${automationData.emailPreview.attachmentInfo.processedPdfFile}` : null
                      ].filter(Boolean)
                    })
                  });
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                임시 파일 정리
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* EmailSendDialog */}
      {currentOrderForEmail && automationData?.emailPreview?.attachmentInfo && (
        <EmailSendDialog
          open={emailDialogOpen}
          onOpenChange={(open) => {
            setEmailDialogOpen(open);
            if (!open) setCurrentOrderForEmail(null);
          }}
          orderData={currentOrderForEmail}
          attachments={[
            // Excel file
            {
              id: 'excel-file',
              originalName: automationData.emailPreview.attachmentInfo.processedFile,
              filePath: `uploads/${automationData.emailPreview.attachmentInfo.processedFile}`,
              fileSize: automationData.emailPreview.attachmentInfo.fileSize,
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              isSelected: false
            },
            // PDF file (if exists)
            ...(automationData.emailPreview.attachmentInfo.processedPdfFile ? [{
              id: 'pdf-file',
              originalName: automationData.emailPreview.attachmentInfo.processedPdfFile,
              filePath: `uploads/${automationData.emailPreview.attachmentInfo.processedPdfFile}`,
              fileSize: automationData.emailPreview.attachmentInfo.pdfFileSize || 0,
              mimeType: 'application/pdf',
              isSelected: false
            }] : [])
          ]}
          onSendEmail={handleSendEmailFromDialog}
        />
      )}
    </>
  );
}