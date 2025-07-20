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
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
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
  orders?: Array<{
    orderNumber: string;
    orderDate: string;
    siteName: string;
    vendorName: string;
    totalAmount: number;
    items: any[];
  }>;
}

export function ExcelAutomationWizard() {
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

      const response = await fetch('/api/excel-automation/upload-and-process', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '파일 처리 실패');
      }

      updateStepStatus('upload', 'completed');
      updateStepStatus('save', 'completed');
      updateStepStatus('validate', 'completed');
      updateStepStatus('preview', 'completed');

      // 디버깅: 받은 데이터 확인
      console.log('📊 Received automation data:', result.data);
      console.log('📊 Orders data:', result.data.orders);
      console.log('📊 Orders exists:', !!result.data.orders);
      console.log('📊 Orders length:', result.data.orders?.length || 0);
      console.log('📊 Full response:', result);
      
      setAutomationData(result.data);
      
      // 거래처 검증이 필요한 경우 모달 표시
      if (result.data.vendorValidation.needsUserAction) {
        setShowVendorModal(true);
      } else {
        // React 상태 업데이트 배치 문제 해결을 위해 setTimeout 사용
        setTimeout(() => {
          setCurrentStep(1); // 이메일 미리보기 단계로
        }, 100);
      }

    } catch (error) {
      console.error('자동화 처리 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
      updateStepStatus('upload', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: isProcessing
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
        body: JSON.stringify({
          filePath: automationData.filePath,
          selectedVendors: selections
        }),
      });

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

  const handleSendEmails = async () => {
    if (!automationData?.emailPreview) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/excel-automation/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          processedFilePath: `uploads/${automationData.emailPreview.attachmentInfo.processedFile}`,
          recipients: automationData.emailPreview.recipients,
          emailOptions: {
            subject: automationData.emailPreview.subject,
            orderNumber: `AUTO-${Date.now()}`,
            additionalMessage: '자동화 시스템을 통해 발송된 발주서입니다.'
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        setEmailResults(result.data);
        setCurrentStep(2);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : '이메일 발송 실패');
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
        return <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  // 1단계: 파일 업로드
  if (currentStep === 0 && !automationData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Excel 발주서 자동화 처리
            </CardTitle>
            <CardDescription>
              Excel 파일을 업로드하면 발주서 데이터 저장부터 이메일 발송까지 자동으로 처리됩니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input {...getInputProps()} />
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-blue-600">파일을 여기에 놓으세요...</p>
              ) : (
                <div>
                  <p className="text-lg mb-2">Excel 파일을 드래그하거나 클릭하여 업로드</p>
                  <p className="text-sm text-gray-500">.xlsx, .xls 파일 지원 (최대 10MB)</p>
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>처리 진행 상황</span>
                  <span>{processingSteps.filter(s => s.status === 'completed').length} / {processingSteps.length}</span>
                </div>
                
                <Progress 
                  value={(processingSteps.filter(s => s.status === 'completed').length / processingSteps.length) * 100} 
                />

                <div className="space-y-2">
                  {processingSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3 p-2 rounded">
                      {renderStepIcon(step.status)}
                      <div className="flex-1">
                        <div className="font-medium">{step.title}</div>
                        <div className="text-sm text-gray-500">{step.description}</div>
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

  // 거래처 검증 모달 - 임시 비활성화
  if (false && showVendorModal && automationData) {
    // VendorValidationModal에서 기대하는 형태로 데이터 변환
    const validationData = {
      vendorValidations: automationData!.vendorValidation.invalidVendors.map(vendor => ({
        vendorName: vendor.vendorName,
        exists: false,
        suggestions: vendor.suggestions
      })),
      deliveryValidations: [], // 현재는 납품처 검증을 별도로 하지 않음
      emailConflicts: [], // 현재는 이메일 충돌 검증을 별도로 하지 않음
      summary: {
        totalVendors: automationData!.vendorValidation.validVendors.length + automationData!.vendorValidation.invalidVendors.length,
        totalDeliveries: 0,
        unregisteredVendors: automationData!.vendorValidation.invalidVendors.length,
        unregisteredDeliveries: 0,
        emailConflicts: 0,
        needsAction: automationData!.vendorValidation.needsUserAction
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

  // 2단계: 이메일 미리보기 - 강제 렌더링
  if (true) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              이메일 발송 미리보기
            </CardTitle>
            <CardDescription>
              발송할 이메일 내용을 확인하고 전송하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 처리 결과 요약 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{automationData.savedOrders}</div>
                <div className="text-sm text-green-600">저장된 발주서</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{automationData.vendorValidation.validVendors.length}</div>
                <div className="text-sm text-blue-600">확인된 거래처</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{automationData.emailPreview.recipients.length}</div>
                <div className="text-sm text-purple-600">이메일 수신자</div>
              </div>
            </div>

            <Separator />

            {/* 발주서 데이터 미리보기 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">발주서 데이터 미리보기</h3>
              
              {/* 디버깅 정보 */}
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <div>🔍 Debug Info:</div>
                <div>currentStep: {currentStep}</div>
                <div>automationData exists: {automationData ? 'true' : 'false'}</div>
                <div>orders exists: {automationData?.orders ? 'true' : 'false'}</div>
                <div>orders length: {automationData?.orders?.length || 0}</div>
                <div>orders is array: {Array.isArray(automationData?.orders) ? 'true' : 'false'}</div>
                <div>condition result: {(automationData?.orders && Array.isArray(automationData.orders) && automationData.orders.length > 0) ? 'true' : 'false'}</div>
                <div>Raw orders data: {JSON.stringify(automationData?.orders)}</div>
              </div>
              
              {/* 강제 테스트 테이블 */}
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <div className="text-sm font-medium text-red-700 mb-2">🚨 강제 테스트 테이블</div>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>발주번호</TableHead>
                        <TableHead>발주일</TableHead>
                        <TableHead>품명</TableHead>
                        <TableHead>수량</TableHead>
                        <TableHead>단가</TableHead>
                        <TableHead>공급가액</TableHead>
                        <TableHead>거래처명</TableHead>
                        <TableHead>납품처명</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>TEST-001</TableCell>
                        <TableCell>2025-07-18</TableCell>
                        <TableCell>테스트 품목</TableCell>
                        <TableCell>1</TableCell>
                        <TableCell>₩10,000</TableCell>
                        <TableCell>₩10,000</TableCell>
                        <TableCell>테스트 거래처</TableCell>
                        <TableCell>테스트 납품처</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              {/* 아이템 세부 정보 테이블 */}
              {(automationData?.orders && Array.isArray(automationData.orders) && automationData.orders.length > 0) ? (
                <div className="border rounded-lg overflow-x-auto max-h-96">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50">
                      <TableRow>
                        <TableHead className="text-xs whitespace-nowrap">발주번호</TableHead>
                        <TableHead className="text-xs whitespace-nowrap">발주일</TableHead>
                        <TableHead className="text-xs whitespace-nowrap">품명</TableHead>
                        <TableHead className="text-xs whitespace-nowrap">수량</TableHead>
                        <TableHead className="text-xs whitespace-nowrap">단가</TableHead>
                        <TableHead className="text-xs whitespace-nowrap">공급가액</TableHead>
                        <TableHead className="text-xs whitespace-nowrap">거래처명</TableHead>
                        <TableHead className="text-xs whitespace-nowrap">납품처명</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {automationData.orders.flatMap((order: any) => 
                        order.items?.map((item: any, itemIndex: number) => (
                          <TableRow key={`${order.orderNumber}-${itemIndex}`}>
                            <TableCell className="text-xs font-medium">{order.orderNumber}</TableCell>
                            <TableCell className="text-xs">{order.orderDate}</TableCell>
                            <TableCell className="text-xs">{item.itemName}</TableCell>
                            <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                            <TableCell className="text-xs text-right">₩{item.unitPrice?.toLocaleString()}</TableCell>
                            <TableCell className="text-xs text-right">₩{item.supplyAmount?.toLocaleString()}</TableCell>
                            <TableCell className="text-xs">{item.vendorName || order.vendorName}</TableCell>
                            <TableCell className="text-xs">{item.deliveryName || '-'}</TableCell>
                          </TableRow>
                        )) || []
                      ).slice(0, 10)}
                    </TableBody>
                  </Table>
                  {automationData.orders.reduce((acc: number, order: any) => acc + (order.items?.length || 0), 0) > 10 && (
                    <div className="p-3 text-center text-xs text-gray-500 border-t">
                      ... 외 {automationData.orders.reduce((acc: number, order: any) => acc + (order.items?.length || 0), 0) - 10}개 품목
                    </div>
                  )}
                </div>
              ) : (
                /* 데이터가 없을 때 */
                <div className="border rounded-lg p-8 text-center">
                  <div className="text-sm text-gray-500">발주서 데이터가 없습니다</div>
                  <div className="text-xs text-gray-400 mt-1">Excel 파일을 업로드하고 처리해주세요</div>
                </div>
              )}
              
              {automationData.savedOrders > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-800 font-medium">
                      {automationData.savedOrders}개의 발주서가 성공적으로 저장되었습니다
                    </span>
                  </div>
                </div>
              )}
            </div>
            <Separator />

            {/* 이메일 정보 */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">수신자</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {automationData.emailPreview.recipients.map((email, index) => (
                    <Badge key={index} variant="secondary">{email}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">제목</label>
                <div className="mt-1 p-2 bg-gray-50 rounded border">
                  {automationData.emailPreview.subject}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">첨부파일</label>
                <div className="mt-1 p-2 bg-gray-50 rounded border flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{automationData.emailPreview.attachmentInfo.processedFile}</span>
                  <Badge variant="outline">
                    {formatFileSize(automationData.emailPreview.attachmentInfo.fileSize)}
                  </Badge>
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
                  파일 다운로드
                </Button>
                <Button 
                  onClick={handleSendEmails}
                  disabled={!automationData.emailPreview.canProceed || isProcessing}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isProcessing ? '발송 중...' : '이메일 발송'}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {emailResults.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              이메일 발송 결과
            </CardTitle>
            <CardDescription>
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
                  className={`flex items-center justify-between p-3 rounded border ${
                    result.status === 'sent' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.status === 'sent' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>{result.email}</span>
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
                <h4 className="font-medium text-red-600 mb-2">발송 실패 상세</h4>
                <div className="space-y-2">
                  {emailResults.failedEmails.map((failed: any, index: number) => (
                    <div key={index} className="p-2 bg-red-50 rounded border border-red-200">
                      <div className="font-medium">{failed.email}</div>
                      <div className="text-sm text-red-600">{failed.error}</div>
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
                    body: JSON.stringify({
                      filePaths: [
                        automationData?.filePath,
                        `uploads/${automationData?.emailPreview.attachmentInfo.processedFile}`
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

  return null;
}