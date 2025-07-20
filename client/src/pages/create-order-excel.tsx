import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Upload, Info, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    fileName: string;
    filePath: string;
    totalOrders: number;
    totalItems: number;
    orders: any[];
  };
  error?: string;
}

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
}

export default function CreateOrderExcel() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [emailProcessStep, setEmailProcessStep] = useState<'none' | 'vendor-validation' | 'email-preview' | 'sending' | 'completed'>('none');
  const [emailSendResult, setEmailSendResult] = useState<{
    success: boolean;
    sentEmails: number;
    failedEmails: number;
    error?: string;
  } | null>(null);
  const [vendorValidation, setVendorValidation] = useState<any>(null);
  const [selectedVendors, setSelectedVendors] = useState<any[]>([]);
  const [emailPreview, setEmailPreview] = useState<any>(null);
  const [emailContentPreview, setEmailContentPreview] = useState<string | null>(null);
  const [showEmailContent, setShowEmailContent] = useState(false);
  const [editableEmailData, setEditableEmailData] = useState<{
    recipients: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    additionalMessage: string;
    attachments: { name: string; selected: boolean }[];
  }>({
    recipients: [],
    cc: [],
    bcc: [],
    subject: '',
    additionalMessage: '',
    attachments: []
  });
  const [additionalAttachments, setAdditionalAttachments] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<{
    filename: string;
    originalName: string;
    size: number;
    path: string;
  }[]>([]);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [validationError, setValidationError] = useState<{
    error: string;
    details?: string;
    warnings?: string[];
  } | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { id: 'upload', title: '파일 업로드', description: '엑셀 파일을 서버로 업로드', status: 'pending' },
    { id: 'parse', title: 'Input 시트 파싱', description: '엑셀 파일의 Input 시트 데이터 분석', status: 'pending' },
    { id: 'save', title: '데이터베이스 저장', description: '발주서 정보를 데이터베이스에 저장', status: 'pending' },
    { id: 'extract', title: '갑지/을지 추출', description: '갑지/을지 시트를 별도 파일로 추출', status: 'pending' },
  ]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.includes('excel') || droppedFile.type.includes('spreadsheet') || droppedFile.name.endsWith('.xlsx')) {
        setFile(droppedFile);
        setUploadResult(null);
        resetProcessingSteps();
      } else {
        alert('엑셀 파일(.xlsx)만 업로드 가능합니다.');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadResult(null);
      resetProcessingSteps();
    }
  };

  const resetProcessingSteps = () => {
    setProcessingSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const, message: undefined })));
    setValidationError(null);
  };

  const updateProcessingStep = (id: string, status: ProcessingStep['status'], message?: string) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === id ? { ...step, status, message } : step
    ));
  };

  const handleUpload = async () => {
    if (!file) return;

    setProcessing(true);
    
    try {
      // Step 1: Upload file
      updateProcessingStep('upload', 'processing');
      
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/excel-automation/upload-and-process', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      
      if (!uploadResponse.ok) {
        updateProcessingStep('upload', 'error', uploadData.error || '파일 업로드 실패');
        
        // Step 0 검증 실패 에러 정보 설정
        setValidationError({
          error: uploadData.error || '파일 업로드 실패',
          details: uploadData.details,
          warnings: uploadData.warnings
        });
        
        setProcessing(false);
        return;
      }

      updateProcessingStep('upload', 'completed', `파일 업로드 완료`);
      updateProcessingStep('parse', 'completed', `발주서 ${uploadData.data.savedOrders}개 저장 완료`);
      updateProcessingStep('save', 'completed', `거래처 검증 완료`);
      updateProcessingStep('extract', 'completed', `이메일 미리보기 생성 완료`);
      
      // 새로운 응답 구조에 맞게 데이터 설정
      setUploadResult({
        success: true,
        message: uploadData.message || '파일 처리 완료',
        data: {
          fileName: uploadData.data.fileName || '업로드된 파일',
          filePath: uploadData.data.filePath,
          totalOrders: uploadData.data.savedOrders,
          totalItems: uploadData.data.orders?.reduce((sum: number, order: any) => sum + (order.items?.length || 0), 0) || 0,
          orders: uploadData.data.orders || [] // 서버에서 전송된 실제 orders 데이터 사용
        }
      });

      // 거래처 검증 결과와 이메일 미리보기 설정
      if (uploadData.data.vendorValidation) {
        setVendorValidation(uploadData.data.vendorValidation);
        
        if (uploadData.data.vendorValidation.needsUserAction) {
          setEmailProcessStep('vendor-validation');
        } else {
          setEmailProcessStep('email-preview');
        }
      }

      if (uploadData.data.emailPreview) {
        setEmailPreview(uploadData.data.emailPreview);
      }
      
      // 자동화 프로세스가 이미 거래처 검증을 완료했으므로 추가 작업 불필요
      
    } catch (error) {
      console.error('Processing error:', error);
      updateProcessingStep('upload', 'error', '처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const getProgressValue = () => {
    const completedSteps = processingSteps.filter(step => step.status === 'completed').length;
    return (completedSteps / processingSteps.length) * 100;
  };

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing': return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const handleStartEmailProcess = async () => {
    if (!uploadResult?.data?.filePath) return;
    await handleStartEmailProcessWithFilePath(uploadResult.data.filePath);
  };

  const handleStartEmailProcessWithFilePath = async (filePath: string) => {
    setEmailProcessStep('vendor-validation');
    setProcessing(true);

    try {
      console.log('거래처 검증 API 호출 시작, filePath:', filePath);
      
      // 거래처 검증 API 호출
      const response = await fetch('/api/excel-automation/validate-vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: filePath
        }),
      });

      const result = await response.json();
      console.log('거래처 검증 API 응답:', result);

      if (result.success) {
        setVendorValidation(result.data.vendorValidation);
        
        // 모든 거래처가 등록되어 있다면 바로 이메일 미리보기로
        if (!result.data.vendorValidation.needsUserAction) {
          setEmailProcessStep('email-preview');
          await generateEmailPreview(result.data.vendorValidation.validVendors);
        } else {
          // 사용자 확인이 필요한 경우 모달 표시 등
          setEmailProcessStep('vendor-validation');
        }
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('거래처 검증 오류:', error);
      alert('거래처 검증 중 오류가 발생했습니다.');
      setEmailProcessStep('none');
    } finally {
      setProcessing(false);
    }
  };

  const generateEmailContentPreview = async () => {
    if (!uploadResult?.data?.orders?.[0] || !emailPreview) return;
    
    const orderData = uploadResult.data.orders[0];
    
    // 편집 가능한 이메일 데이터 초기화
    setEditableEmailData({
      recipients: [...emailPreview.recipients],
      cc: [],
      bcc: [],
      subject: emailPreview.subject || '발주서 전송',
      additionalMessage: '자동화 시스템을 통해 발송된 발주서입니다.',
      attachments: [
        { name: '발주서.xlsx (Excel 파일)', selected: true },
        { name: '발주서.pdf (PDF 파일)', selected: true }
      ]
    });
    
    try {
      const response = await fetch('/api/excel-automation/email-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: emailPreview.subject || '발주서 전송',
          orderNumber: orderData.orderNumber,
          vendorName: orderData.vendorName,
          orderDate: orderData.orderDate,
          totalAmount: orderData.totalAmount,
          additionalMessage: '자동화 시스템을 통해 발송된 발주서입니다.'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setEmailContentPreview(result.data.htmlContent);
        setShowEmailContent(true);
      } else {
        console.error('이메일 내용 미리보기 생성 실패:', result.error);
      }
    } catch (error) {
      console.error('이메일 내용 미리보기 오류:', error);
    }
  };

  const updateEmailContentPreview = async () => {
    if (!uploadResult?.data?.orders?.[0]) return;
    
    const orderData = uploadResult.data.orders[0];
    
    try {
      const response = await fetch('/api/excel-automation/email-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: editableEmailData.subject,
          orderNumber: orderData.orderNumber,
          vendorName: orderData.vendorName,
          orderDate: orderData.orderDate,
          totalAmount: orderData.totalAmount,
          additionalMessage: editableEmailData.additionalMessage
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setEmailContentPreview(result.data.htmlContent);
      } else {
        console.error('이메일 내용 업데이트 실패:', result.error);
      }
    } catch (error) {
      console.error('이메일 내용 업데이트 오류:', error);
    }
  };

  const uploadAdditionalAttachments = async () => {
    if (additionalAttachments.length === 0) return;

    const formData = new FormData();
    additionalAttachments.forEach((file) => {
      formData.append('attachments', file);
    });

    try {
      const response = await fetch('/api/excel-automation/upload-attachment', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setUploadedAttachments([...uploadedAttachments, ...result.data.files]);
        setAdditionalAttachments([]); // 업로드된 파일들을 로컬 상태에서 제거
        console.log('파일 업로드 성공:', result.data.files);
      } else {
        console.error('파일 업로드 실패:', result.error);
        alert('파일 업로드에 실패했습니다: ' + result.error);
      }
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    }
  };

  const handleSendEmailWithEditedData = async () => {
    if (!emailPreview || !uploadResult?.data?.orders?.[0]) return;

    // 빈 이메일 주소 제거
    const validRecipients = editableEmailData.recipients.filter(r => r.trim());
    const validCC = editableEmailData.cc.filter(c => c.trim());
    const validBCC = editableEmailData.bcc.filter(b => b.trim());

    if (validRecipients.length === 0) {
      alert('수신자를 한 명 이상 입력해주세요.');
      return;
    }

    setEmailProcessStep('sending');
    setEmailSendResult(null);
    
    try {
      const response = await fetch('/api/excel-automation/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          processedFilePath: `uploads/${emailPreview.attachmentInfo.processedFile}`,
          recipients: validRecipients,
          cc: validCC.length > 0 ? validCC : undefined,
          bcc: validBCC.length > 0 ? validBCC : undefined,
          additionalAttachments: uploadedAttachments.map(file => ({
            filename: file.filename,
            originalName: file.originalName,
            path: file.path
          })),
          emailOptions: {
            subject: editableEmailData.subject,
            orderNumber: uploadResult.data.orders[0].orderNumber,
            additionalMessage: editableEmailData.additionalMessage
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setEmailSendResult({
          success: true,
          sentEmails: result.data.sentEmails || 0,
          failedEmails: result.data.failedEmails || 0
        });
        setEmailProcessStep('completed');
      } else {
        setEmailSendResult({
          success: false,
          sentEmails: result.data?.sentEmails || 0,
          failedEmails: result.data?.failedEmails?.length || 0,
          error: result.message || result.error || '이메일 발송 실패'
        });
        setEmailProcessStep('completed');
      }
    } catch (error) {
      console.error('이메일 발송 오류:', error);
      setEmailSendResult({
        success: false,
        sentEmails: 0,
        failedEmails: 0,
        error: error instanceof Error ? error.message : '이메일 발송 중 오류가 발생했습니다.'
      });
      setEmailProcessStep('completed');
    }
  };

  const generateEmailPreview = async (validVendors: any[]) => {
    if (!uploadResult?.data?.filePath) return;

    try {
      const response = await fetch('/api/excel-automation/update-email-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: uploadResult.data.filePath,
          selectedVendors: validVendors.map(v => ({
            originalName: v.vendorName,
            selectedVendorId: v.vendorId,
            selectedVendorEmail: v.email
          }))
        }),
      });

      const result = await response.json();

      if (result.success) {
        setEmailPreview(result.data.emailPreview);
        setEmailProcessStep('email-preview');
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('이메일 미리보기 생성 오류:', error);
      alert('이메일 미리보기 생성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">엑셀 발주서 처리</h1>
        <p className="text-gray-600">
          엑셀 파일을 업로드하여 발주서를 생성하세요.
        </p>
      </div>

      <div className="space-y-6">

        {/* 업로드 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              엑셀 발주서 업로드
            </CardTitle>
            <CardDescription>
              PO Template 엑셀 파일을 업로드하면 Input 시트의 데이터가 자동으로 파싱되어 발주서가 생성됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              
              {file ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    파일 준비 완료
                  </Badge>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg text-gray-600 mb-2">
                    엑셀 파일을 드래그하거나 클릭하여 업로드하세요
                  </p>
                  <p className="text-sm text-gray-500">
                    지원 형식: .xlsx (Excel 파일)
                  </p>
                </div>
              )}
              
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors font-medium"
              >
                파일 선택
              </label>
            </div>

            {file && (
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={processing}
                  className="flex-1 h-12"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      업로드 및 처리 시작
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setUploadResult(null);
                    resetProcessingSteps();
                  }}
                  className="h-12"
                  size="lg"
                >
                  취소
                </Button>
              </div>
            )}

            {processing && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-blue-900">처리 진행 상황</span>
                  <span className="text-sm text-blue-700">{Math.round(getProgressValue())}%</span>
                </div>
                <Progress value={getProgressValue()} className="h-2 mb-3" />
                <div className="text-sm text-blue-700">
                  {processingSteps.find(s => s.status === 'processing')?.title || '처리 중...'}
                </div>
              </div>
            )}

            {/* Step 0 검증 실패 에러 표시 */}
            {validationError && (
              <Alert className="mt-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-semibold text-red-800">
                      {validationError.error}
                    </div>
                    {validationError.details && (
                      <div className="text-sm text-red-700 whitespace-pre-line">
                        {validationError.details}
                      </div>
                    )}
                    {validationError.warnings && validationError.warnings.length > 0 && (
                      <div className="text-sm text-yellow-700">
                        <div className="font-medium mb-1">경고사항:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {validationError.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="text-sm text-red-600 mt-3">
                      💡 Excel 파일을 다시 확인하고 수정 후 업로드해주세요.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

      {/* 발주서 미리보기 섹션 */}
      {uploadResult && uploadResult.data && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              발주서 데이터 미리보기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {uploadResult.data?.orders?.map((order: any, orderIndex: number) => (
                <div key={orderIndex} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                      <p className="text-sm text-gray-600">
                        거래처: {(() => {
                          const uniqueVendors = Array.from(new Set(
                            order.items?.map((item: any) => item.vendorName).filter(Boolean) || []
                          ));
                          if (uniqueVendors.length <= 3) {
                            return uniqueVendors.join(', ');
                          } else {
                            return uniqueVendors.slice(0, 3).join(', ') + ` 외 ${uniqueVendors.length - 3}건`;
                          }
                        })()} | 납품처: {(() => {
                          const uniqueDeliveries = Array.from(new Set(
                            order.items?.map((item: any) => item.deliveryName).filter(Boolean) || []
                          ));
                          if (uniqueDeliveries.length <= 3) {
                            return uniqueDeliveries.join(', ');
                          } else {
                            return uniqueDeliveries.slice(0, 3).join(', ') + ` 외 ${uniqueDeliveries.length - 3}건`;
                          }
                        })()}
                      </p>
                      <p className="text-sm text-gray-600">
                        현장: {order.siteName} | 발주일: {order.orderDate} | 납기일: {order.dueDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">
                        {new Intl.NumberFormat('ko-KR', {
                          style: 'currency',
                          currency: 'KRW',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(order.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-600">{order.items.length}개 품목</div>
                    </div>
                  </div>
                  
                  {/* 품목 리스트 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-2 py-1 text-left">품목명</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">규격</th>
                          <th className="border border-gray-300 px-2 py-1 text-right">수량</th>
                          <th className="border border-gray-300 px-2 py-1 text-right">단가</th>
                          <th className="border border-gray-300 px-2 py-1 text-right">금액</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">거래처명</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">납품처명</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item: any, itemIndex: number) => (
                          <tr key={itemIndex}>
                            <td className="border border-gray-300 px-2 py-1">{item.itemName}</td>
                            <td className="border border-gray-300 px-2 py-1">{item.specification}</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {new Intl.NumberFormat('ko-KR', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(item.quantity)}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {new Intl.NumberFormat('ko-KR', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(item.unitPrice)}원
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {new Intl.NumberFormat('ko-KR', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(item.totalAmount)}원
                            </td>
                            <td className="border border-gray-300 px-2 py-1">{item.vendorName || '-'}</td>
                            <td className="border border-gray-300 px-2 py-1">{item.deliveryName || item.vendorName || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 처리 결과 섹션 */}
      {uploadResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              처리 결과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {uploadResult.data?.totalOrders || 0}
                </div>
                <div className="text-sm text-gray-600">생성된 발주서</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {uploadResult.data?.totalItems || 0}
                </div>
                <div className="text-sm text-gray-600">처리된 아이템</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">2</div>
                <div className="text-sm text-gray-600">추출된 시트</div>
              </div>
              {vendorValidation && (
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {vendorValidation.validVendors.length}/{vendorValidation.validVendors.length + vendorValidation.invalidVendors.length}
                  </div>
                  <div className="text-sm text-gray-600">등록된 거래처</div>
                </div>
              )}
            </div>

            {vendorValidation ? (
              <Alert className={vendorValidation.invalidVendors.length > 0 ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"}>
                {vendorValidation.invalidVendors.length > 0 ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>거래처 확인 완료:</strong> {vendorValidation.invalidVendors.length}개의 미등록 거래처가 발견되었습니다. 
                      시스템 관리자나 본사 관리자에게 거래처 등록을 요청해 주세요.
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>거래처 확인 완료:</strong> 모든 거래처가 등록되어 있습니다. 이메일 발송을 진행할 수 있습니다.
                    </AlertDescription>
                  </>
                )}
              </Alert>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  엑셀 발주서가 성공적으로 처리되었습니다. 거래처 확인을 자동으로 진행하고 있습니다.
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-4 flex gap-2">
              {vendorValidation && vendorValidation.invalidVendors.length === 0 && emailPreview && (
                <Button 
                  onClick={async () => {
                    if (!emailPreview.canProceed) {
                      alert('이메일을 발송할 수 없습니다. 수신자를 확인해주세요.');
                      return;
                    }

                    setEmailProcessStep('sending');
                    setEmailSendResult(null);
                    
                    try {
                      const response = await fetch('/api/excel-automation/send-emails', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          processedFilePath: `uploads/${emailPreview.attachmentInfo.processedFile}`,
                          recipients: emailPreview.recipients,
                          emailOptions: {
                            subject: emailPreview.subject,
                            orderNumber: uploadResult?.data?.orders?.[0]?.orderNumber || 'AUTO',
                            additionalMessage: '자동화 시스템을 통해 발송된 발주서입니다.'
                          }
                        }),
                      });

                      const result = await response.json();
                      
                      if (result.success) {
                        setEmailSendResult({
                          success: true,
                          sentEmails: result.data.sentEmails || 0,
                          failedEmails: result.data.failedEmails || 0
                        });
                        setEmailProcessStep('completed');
                      } else {
                        // 서버에서 실패 응답을 받은 경우
                        setEmailSendResult({
                          success: false,
                          sentEmails: result.data?.sentEmails || 0,
                          failedEmails: result.data?.failedEmails?.length || 0,
                          error: result.message || result.error || '이메일 발송 실패'
                        });
                        setEmailProcessStep('completed');
                      }
                    } catch (error) {
                      console.error('이메일 발송 오류:', error);
                      setEmailSendResult({
                        success: false,
                        sentEmails: 0,
                        failedEmails: 0,
                        error: error instanceof Error ? error.message : '이메일 발송 중 오류가 발생했습니다.'
                      });
                      setEmailProcessStep('completed');
                    }
                  }}
                  disabled={!emailPreview?.canProceed || emailPreview?.recipients.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  이메일 발송 ({emailPreview?.recipients.length || 0}명)
                </Button>
              )}
              <Button onClick={() => window.location.href = '/orders'}>
                발주서 관리로 이동
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/create-order/excel'}>
                새 파일 업로드
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 거래처 검증 및 이메일 미리보기 섹션 */}
      {emailProcessStep === 'vendor-validation' && vendorValidation && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-orange-600" />
              거래처 확인 필요
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{vendorValidation.validVendors.length}</div>
                  <div className="text-sm text-green-600">등록된 거래처</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{vendorValidation.invalidVendors.length}</div>
                  <div className="text-sm text-orange-600">확인 필요한 거래처</div>
                </div>
              </div>

              {vendorValidation.invalidVendors.length > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <Info className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>등록되지 않은 거래처는 시스템 관리자나 본사 관리자에게 거래처 등록을 요청해 주세요.</strong>
                  </AlertDescription>
                </Alert>
              )}

              {vendorValidation.invalidVendors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">확인이 필요한 거래처</h4>
                  <div className="space-y-3">
                    {vendorValidation.invalidVendors.map((vendor: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="font-medium text-red-600 mb-2">"{vendor.vendorName}" - 등록되지 않은 거래처</div>
                        {vendor.suggestions.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-600 mb-2">유사한 거래처 추천:</p>
                            <div className="space-y-1">
                              {vendor.suggestions.slice(0, 3).map((suggestion: any, sIndex: number) => (
                                <div key={sIndex} className="text-sm p-2 bg-white rounded border">
                                  {suggestion.name} ({suggestion.email}) - 유사도: {(suggestion.similarity * 100).toFixed(0)}%
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    // 등록된 거래처만으로 진행
                    generateEmailPreview(vendorValidation.validVendors);
                  }}
                  disabled={vendorValidation.validVendors.length === 0}
                >
                  등록된 거래처만으로 이메일 발송 진행
                </Button>
                <Button variant="outline" onClick={() => setEmailProcessStep('none')}>
                  취소
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 이메일 미리보기 섹션 */}
      {emailProcessStep === 'email-preview' && emailPreview && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              이메일 발송 미리보기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">수신자 ({emailPreview.recipients.length}명)</label>
                <div className="mt-1 p-3 bg-gray-50 rounded border min-h-[60px]">
                  {emailPreview.recipients.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {emailPreview.recipients.map((email: string, index: number) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                          {email}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">이메일 수신자가 없습니다.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">제목</label>
                <div className="mt-1 p-2 bg-gray-50 rounded border">
                  {emailPreview.subject}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">첨부파일</label>
                <div className="mt-1 p-2 bg-gray-50 rounded border">
                  {emailPreview.attachmentInfo.processedFile} ({Math.round(emailPreview.attachmentInfo.fileSize / 1024)}KB)
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={generateEmailContentPreview}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  이메일 내용 미리보기
                </Button>
                <Button 
                  onClick={async () => {
                    if (!emailPreview.canProceed) {
                      alert('이메일을 발송할 수 없습니다. 수신자를 확인해주세요.');
                      return;
                    }

                    setEmailProcessStep('sending');
                    setEmailSendResult(null);
                    
                    try {
                      const response = await fetch('/api/excel-automation/send-emails', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          processedFilePath: `uploads/${emailPreview.attachmentInfo.processedFile}`,
                          recipients: emailPreview.recipients,
                          emailOptions: {
                            subject: emailPreview.subject,
                            orderNumber: uploadResult?.data?.orders?.[0]?.orderNumber || 'AUTO',
                            additionalMessage: '자동화 시스템을 통해 발송된 발주서입니다.'
                          }
                        }),
                      });

                      const result = await response.json();
                      
                      if (result.success) {
                        setEmailSendResult({
                          success: true,
                          sentEmails: result.data.sentEmails || 0,
                          failedEmails: result.data.failedEmails || 0
                        });
                        setEmailProcessStep('completed');
                      } else {
                        // 서버에서 실패 응답을 받은 경우
                        setEmailSendResult({
                          success: false,
                          sentEmails: result.data?.sentEmails || 0,
                          failedEmails: result.data?.failedEmails?.length || 0,
                          error: result.message || result.error || '이메일 발송 실패'
                        });
                        setEmailProcessStep('completed');
                      }
                    } catch (error) {
                      console.error('이메일 발송 오류:', error);
                      setEmailSendResult({
                        success: false,
                        sentEmails: 0,
                        failedEmails: 0,
                        error: error instanceof Error ? error.message : '이메일 발송 중 오류가 발생했습니다.'
                      });
                      setEmailProcessStep('completed');
                    }
                  }}
                  disabled={!emailPreview.canProceed || emailPreview.recipients.length === 0 || emailProcessStep === 'sending'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {emailProcessStep === 'sending' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      발송 중...
                    </div>
                  ) : (
                    `이메일 발송 (${emailPreview.recipients.length}명)`
                  )}
                </Button>
                <Button variant="outline" onClick={() => setEmailProcessStep('none')}>
                  취소
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 이메일 편집 및 미리보기 모달 */}
      {showEmailContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">이메일 편집 및 미리보기</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowEmailContent(false)}
              >
                ✕
              </Button>
            </div>
            
            <div className="flex">
              {/* 편집 패널 */}
              <div className="w-1/2 p-4 border-r border-gray-200 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  {/* 제목 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">제목</label>
                    <input
                      type="text"
                      value={editableEmailData.subject}
                      onChange={(e) => setEditableEmailData({...editableEmailData, subject: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                      placeholder="이메일 제목"
                    />
                  </div>

                  {/* 수신자 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">수신자 (TO)</label>
                    <div className="space-y-2">
                      {editableEmailData.recipients.map((email, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                              const newRecipients = [...editableEmailData.recipients];
                              newRecipients[index] = e.target.value;
                              setEditableEmailData({...editableEmailData, recipients: newRecipients});
                            }}
                            className="flex-1 p-2 border rounded-lg"
                            placeholder="이메일 주소"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newRecipients = editableEmailData.recipients.filter((_, i) => i !== index);
                              setEditableEmailData({...editableEmailData, recipients: newRecipients});
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditableEmailData({
                            ...editableEmailData,
                            recipients: [...editableEmailData.recipients, '']
                          });
                        }}
                      >
                        + 수신자 추가
                      </Button>
                    </div>
                  </div>

                  {/* CC */}
                  <div>
                    <label className="block text-sm font-medium mb-2">참조 (CC)</label>
                    <div className="space-y-2">
                      {editableEmailData.cc.map((email, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                              const newCC = [...editableEmailData.cc];
                              newCC[index] = e.target.value;
                              setEditableEmailData({...editableEmailData, cc: newCC});
                            }}
                            className="flex-1 p-2 border rounded-lg"
                            placeholder="이메일 주소"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newCC = editableEmailData.cc.filter((_, i) => i !== index);
                              setEditableEmailData({...editableEmailData, cc: newCC});
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditableEmailData({
                            ...editableEmailData,
                            cc: [...editableEmailData.cc, '']
                          });
                        }}
                      >
                        + 참조 추가
                      </Button>
                    </div>
                  </div>

                  {/* BCC */}
                  <div>
                    <label className="block text-sm font-medium mb-2">숨은참조 (BCC)</label>
                    <div className="space-y-2">
                      {editableEmailData.bcc.map((email, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                              const newBCC = [...editableEmailData.bcc];
                              newBCC[index] = e.target.value;
                              setEditableEmailData({...editableEmailData, bcc: newBCC});
                            }}
                            className="flex-1 p-2 border rounded-lg"
                            placeholder="이메일 주소"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newBCC = editableEmailData.bcc.filter((_, i) => i !== index);
                              setEditableEmailData({...editableEmailData, bcc: newBCC});
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditableEmailData({
                            ...editableEmailData,
                            bcc: [...editableEmailData.bcc, '']
                          });
                        }}
                      >
                        + 숨은참조 추가
                      </Button>
                    </div>
                  </div>

                  {/* 첨부파일 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">첨부파일</label>
                    
                    {/* 기본 첨부파일 (발주서) */}
                    <div className="space-y-2 mb-4">
                      <h5 className="text-sm font-medium text-gray-700">기본 첨부파일</h5>
                      {editableEmailData.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                          <input
                            type="checkbox"
                            checked={attachment.selected}
                            onChange={(e) => {
                              const newAttachments = [...editableEmailData.attachments];
                              newAttachments[index].selected = e.target.checked;
                              setEditableEmailData({...editableEmailData, attachments: newAttachments});
                            }}
                            className="rounded"
                          />
                          <span className="text-sm flex-1">{attachment.name}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pdfGenerating && attachment.name.includes('.pdf')}
                            onClick={async () => {
                              const fileType = attachment.name.includes('.xlsx') ? 'xlsx' : 'pdf';
                              const filename = emailPreview?.attachmentInfo?.processedFile;
                              if (filename) {
                                if (fileType === 'xlsx') {
                                  const downloadUrl = `/api/excel-automation/download/${filename}`;
                                  window.open(downloadUrl, '_blank');
                                } else {
                                  // PDF 다운로드 처리
                                  setPdfGenerating(true);
                                  try {
                                    const response = await fetch('/api/excel-automation/generate-pdf', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        processedFilePath: filename,
                                        orderNumber: uploadResult?.data?.orders?.[0]?.orderNumber
                                      }),
                                    });

                                    const result = await response.json();
                                    
                                    if (result.success) {
                                      const downloadUrl = `/api/excel-automation/download/${result.data.pdfPath}`;
                                      window.open(downloadUrl, '_blank');
                                    } else {
                                      alert('PDF 생성 실패: ' + result.error);
                                    }
                                  } catch (error) {
                                    console.error('PDF 다운로드 오류:', error);
                                    alert('PDF 다운로드 중 오류가 발생했습니다.');
                                  } finally {
                                    setPdfGenerating(false);
                                  }
                                }
                              }
                            }}
                          >
                            {pdfGenerating && attachment.name.includes('.pdf') ? (
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                PDF 생성 중...
                              </div>
                            ) : (
                              '다운로드'
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* 추가 첨부파일 */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">추가 첨부파일</h5>
                      
                      {/* 업로드 대기 중인 파일들 */}
                      {additionalAttachments.length > 0 && (
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">업로드 대기 중</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={uploadAdditionalAttachments}
                            >
                              업로드
                            </Button>
                          </div>
                          {additionalAttachments.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                              <span className="text-sm flex-1">{file.name}</span>
                              <span className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newFiles = additionalAttachments.filter((_, i) => i !== index);
                                  setAdditionalAttachments(newFiles);
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 업로드 완료된 파일들 */}
                      {uploadedAttachments.length > 0 && (
                        <div className="space-y-2 mb-3">
                          <span className="text-xs text-gray-600">업로드 완료</span>
                          {uploadedAttachments.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                              <span className="text-sm flex-1">{file.originalName}</span>
                              <span className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const downloadUrl = `/api/excel-automation/download/${file.filename}`;
                                  window.open(downloadUrl, '_blank');
                                }}
                              >
                                다운로드
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newFiles = uploadedAttachments.filter((_, i) => i !== index);
                                  setUploadedAttachments(newFiles);
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 파일 업로드 */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            if (e.target.files) {
                              const newFiles = Array.from(e.target.files);
                              setAdditionalAttachments([...additionalAttachments, ...newFiles]);
                            }
                          }}
                          className="hidden"
                          id="additional-attachments"
                        />
                        <label
                          htmlFor="additional-attachments"
                          className="cursor-pointer text-sm text-gray-600 hover:text-gray-800"
                        >
                          📎 파일 첨부하기
                          <div className="text-xs text-gray-500 mt-1">
                            PDF, DOC, XLS, 이미지 파일 등 (최대 10MB)
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 추가 메시지 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">추가 메시지</label>
                    <textarea
                      value={editableEmailData.additionalMessage}
                      onChange={(e) => setEditableEmailData({...editableEmailData, additionalMessage: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                      rows={3}
                      placeholder="추가할 메시지 입력"
                    />
                  </div>

                  {/* 미리보기 업데이트 버튼 */}
                  <Button
                    onClick={updateEmailContentPreview}
                    className="w-full"
                    variant="outline"
                  >
                    미리보기 업데이트
                  </Button>
                </div>
              </div>

              {/* 미리보기 패널 */}
              <div className="w-1/2 p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">이메일 미리보기</h4>
                  {emailContentPreview ? (
                    <div 
                      className="border rounded-lg p-4 bg-gray-50"
                      dangerouslySetInnerHTML={{ __html: emailContentPreview }}
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50 text-center text-gray-500">
                      "미리보기 업데이트" 버튼을 클릭하여 이메일 내용을 확인하세요.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowEmailContent(false)}
              >
                취소
              </Button>
              <Button 
                onClick={() => {
                  setShowEmailContent(false);
                  // 편집된 데이터로 이메일 발송
                  handleSendEmailWithEditedData();
                }}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={editableEmailData.recipients.filter(r => r.trim()).length === 0}
              >
                이메일 발송
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 이메일 발송 완료 */}
      {emailProcessStep === 'completed' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {emailSendResult?.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              이메일 발송 {emailSendResult?.success ? '완료' : '실패'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emailSendResult?.success ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>✅ 이메일 발송이 완료되었습니다!</div>
                    <div className="text-sm text-gray-600">
                      • 성공: {emailSendResult.sentEmails}개
                      {emailSendResult.failedEmails > 0 && (
                        <span className="text-red-600"> • 실패: {emailSendResult.failedEmails}개</span>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>❌ 이메일 발송 중 오류가 발생했습니다</div>
                    <div className="text-sm">
                      {emailSendResult?.error || '알 수 없는 오류가 발생했습니다.'}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <div className="mt-4 flex gap-2">
              <Button onClick={() => window.location.href = '/orders'}>
                발주서 관리로 이동
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                새 파일 처리
              </Button>
              {!emailSendResult?.success && (
                <Button variant="outline" onClick={() => setEmailProcessStep('email-preview')}>
                  다시 시도
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 사용법 안내 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>사용법 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. 엑셀 파일 업로드</h4>
              <p className="text-sm text-gray-600">
                Input 시트가 포함된 발주서 엑셀 파일을 업로드하세요.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. 발주서 데이터 확인</h4>
              <p className="text-sm text-gray-600">
                파싱된 발주서 데이터를 미리보기로 확인하세요.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. 거래처 확인 및 이메일 발송</h4>
              <p className="text-sm text-gray-600">
                거래처를 확인하고 이메일 수신자를 검토한 후 발송하세요.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">4. 완료</h4>
              <p className="text-sm text-gray-600">
                발주서가 저장되고 관련 업체에 이메일이 자동 발송됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}