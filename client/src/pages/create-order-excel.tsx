import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Upload, Info, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [vendorValidation, setVendorValidation] = useState<any>(null);
  const [selectedVendors, setSelectedVendors] = useState<any[]>([]);
  const [emailPreview, setEmailPreview] = useState<any>(null);
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

      const uploadResponse = await fetch('/api/po-template/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      
      if (!uploadResponse.ok) {
        updateProcessingStep('upload', 'error', uploadData.error || '파일 업로드 실패');
        setProcessing(false);
        return;
      }

      updateProcessingStep('upload', 'completed', `${uploadData.data.fileName} 업로드 완료`);
      updateProcessingStep('parse', 'completed', `발주서 ${uploadData.data.totalOrders}개, 아이템 ${uploadData.data.totalItems}개 파싱 완료`);

      // Step 2: Save to database
      updateProcessingStep('save', 'processing');
      
      const saveResponse = await fetch('/api/po-template/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orders: uploadData.data.orders }),
      });

      const saveData = await saveResponse.json();
      
      if (!saveResponse.ok) {
        updateProcessingStep('save', 'error', saveData.error || '데이터베이스 저장 실패');
        setProcessing(false);
        return;
      }

      updateProcessingStep('save', 'completed', `발주서 ${saveData.data.savedOrders}개 저장 완료`);

      // Step 3: Extract sheets
      updateProcessingStep('extract', 'processing');
      
      const extractResponse = await fetch('/api/po-template/extract-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath: uploadData.data.filePath }),
      });

      const extractData = await extractResponse.json();
      
      if (!extractResponse.ok) {
        updateProcessingStep('extract', 'error', extractData.error || '시트 추출 실패');
      } else {
        updateProcessingStep('extract', 'completed', `${extractData.data.extractedSheets.join(', ')} 시트 추출 완료`);
      }

      setUploadResult(uploadData);
      
      // 업로드 완료 후 자동으로 거래처 확인 시작
      setTimeout(() => {
        console.log('자동 거래처 확인 시작, filePath:', uploadData.data?.filePath);
        if (uploadData.data?.filePath) {
          handleStartEmailProcessWithFilePath(uploadData.data.filePath);
        } else {
          console.error('파일 경로가 없어서 거래처 확인을 시작할 수 없습니다.');
        }
      }, 500); // 약간의 딜레이로 UI 업데이트 완료 후 실행
      
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
          </CardContent>
        </Card>

      {/* 발주서 미리보기 섹션 */}
      {uploadResult && uploadResult.data?.orders && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              발주서 데이터 미리보기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {uploadResult.data.orders.map((order: any, orderIndex: number) => (
                <div key={orderIndex} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                      <p className="text-sm text-gray-600">
                        거래처: {order.vendorName} | 납품처: {order.deliveryName || order.vendorName}
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
                        setEmailProcessStep('completed');
                        alert(`이메일 발송 완료! (성공: ${result.data.sentEmails}개)`);
                      } else {
                        throw new Error(result.error);
                      }
                    } catch (error) {
                      console.error('이메일 발송 오류:', error);
                      alert('이메일 발송 중 오류가 발생했습니다.');
                      setEmailProcessStep('email-preview');
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
                  onClick={async () => {
                    if (!emailPreview.canProceed) {
                      alert('이메일을 발송할 수 없습니다. 수신자를 확인해주세요.');
                      return;
                    }

                    setEmailProcessStep('sending');
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
                        setEmailProcessStep('completed');
                        alert(`이메일 발송 완료! (성공: ${result.data.sentEmails}개)`);
                      } else {
                        throw new Error(result.error);
                      }
                    } catch (error) {
                      console.error('이메일 발송 오류:', error);
                      alert('이메일 발송 중 오류가 발생했습니다.');
                      setEmailProcessStep('email-preview');
                    }
                  }}
                  disabled={!emailPreview.canProceed || emailPreview.recipients.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  이메일 발송 ({emailPreview.recipients.length}명)
                </Button>
                <Button variant="outline" onClick={() => setEmailProcessStep('none')}>
                  취소
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 이메일 발송 완료 */}
      {emailProcessStep === 'completed' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              이메일 발송 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                모든 과정이 성공적으로 완료되었습니다. 발주서가 저장되고 이메일이 발송되었습니다.
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => window.location.href = '/orders'}>
                발주서 관리로 이동
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                새 파일 처리
              </Button>
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
                '발주서 관리' 화면으로 이동하여 발주서가 정상 등록된 것을 확인 후, '이메일 아이콘'을 클릭하여 발송하는 것을 권장드립니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}