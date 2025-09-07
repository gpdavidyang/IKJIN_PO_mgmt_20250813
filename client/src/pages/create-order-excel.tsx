import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  FileSpreadsheet, 
  Upload, 
  Info, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  AlertTriangle,
  Search,
  FileText,
  Database,
  FilePlus,
  Paperclip,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  estimatedTime?: number; // 예상 소요 시간 (초)
  icon?: string; // 아이콘 타입
}

export default function CreateOrderExcel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [emailProcessStep, setEmailProcessStep] = useState<'none' | 'vendor-validation' | 'email-preview' | 'sending' | 'completed'>('none');
  const [vendorValidation, setVendorValidation] = useState<any>(null);
  const [selectedVendors, setSelectedVendors] = useState<any[]>([]);
  const [emailPreview, setEmailPreview] = useState<any>(null);
  const [savedOrderNumbers, setSavedOrderNumbers] = useState<string[]>([]);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { 
      id: 'upload', 
      title: '파일 업로드', 
      description: '엑셀 파일을 서버로 업로드', 
      status: 'pending',
      estimatedTime: 5,
      icon: 'upload'
    },
    { 
      id: 'parse', 
      title: 'Input 시트 파싱', 
      description: '엑셀 파일의 Input 시트 데이터 분석', 
      status: 'pending',
      estimatedTime: 10,
      icon: 'search'
    },
    { 
      id: 'extract', 
      title: '갑지/을지 추출', 
      description: '갑지/을지 시트를 별도 파일로 추출', 
      status: 'pending',
      estimatedTime: 8,
      icon: 'file-text'
    },
    { 
      id: 'save-db', 
      title: '발주서 저장', 
      description: '발주서 기본 정보를 데이터베이스에 저장', 
      status: 'pending',
      estimatedTime: 12,
      icon: 'database'
    },
    { 
      id: 'generate-pdf', 
      title: 'PDF 생성 및 저장', 
      description: '전문 발주서 PDF 생성 후 DB 저장', 
      status: 'pending',
      estimatedTime: 20,
      icon: 'file-plus'
    },
    { 
      id: 'prepare-attachments', 
      title: '첨부파일 준비', 
      description: 'Excel 파일 첨부 준비 완료', 
      status: 'pending',
      estimatedTime: 5,
      icon: 'paperclip'
    },
    { 
      id: 'complete', 
      title: '처리 완료', 
      description: '모든 작업이 성공적으로 완료됨', 
      status: 'pending',
      estimatedTime: 2,
      icon: 'check-circle'
    }
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

      updateProcessingStep('upload', 'completed');
      
      // Step 2: Parse Input sheet
      updateProcessingStep('parse', 'processing');
      await new Promise(resolve => setTimeout(resolve, 500)); // 시각적 피드백
      updateProcessingStep('parse', 'completed');

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
        setProcessing(false);
        return;
      }

      updateProcessingStep('extract', 'completed');
      
      // 1단계 완료: 엑셀파일 처리 결과
      toast({
        title: "✅ 1. 엑셀파일 처리 완료",
        description: `발주서 ${uploadData.data.totalOrders}개, 아이템 ${uploadData.data.totalItems}개 처리 완료`,
        duration: 8000, // 8초 동안 유지
      });
      
      // Step 4: Save to database
      updateProcessingStep('save-db', 'processing');
      
      const extractedFilePath = extractData.data?.extractedFilePath || uploadData.data.filePath.replace('.xlsx', '_extracted.xlsx');
      
      const saveResponse = await fetch('/api/po-template/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          orders: uploadData.data.orders,
          extractedFilePath: extractedFilePath 
        }),
      });

      const saveData = await saveResponse.json();
      
      if (!saveResponse.ok) {
        updateProcessingStep('save-db', 'error', saveData.error || '데이터베이스 저장 실패');
        toast({
          title: "❌ 3. DB 저장 실패",
          description: "데이터베이스 저장에 실패했습니다.",
          variant: "destructive",
          duration: 8000, // 8초 동안 유지
        });
        setProcessing(false);
        return;
      }

      updateProcessingStep('save-db', 'completed');

      // Step 5: Generate PDF
      updateProcessingStep('generate-pdf', 'processing');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2단계 완료: PDF 생성 결과 및 3단계: DB 저장 결과
      let pdfSuccess = false;
      let pdfCount = 0;
      
      if (saveData.data.pdfGenerationStatuses && saveData.data.pdfGenerationStatuses.length > 0) {
        const successfulPdfs = saveData.data.pdfGenerationStatuses.filter((status: any) => status.success);
        pdfSuccess = successfulPdfs.length > 0;
        pdfCount = successfulPdfs.length;
        
        if (pdfSuccess) {
          updateProcessingStep('generate-pdf', 'completed');
          toast({
            title: "✅ 2. PDF 생성 완료",
            description: `${pdfCount}개 발주서 PDF가 성공적으로 생성되었습니다`,
            duration: 8000, // 8초 동안 유지
          });
        } else {
          updateProcessingStep('generate-pdf', 'error');
          toast({
            title: "❌ 2. PDF 생성 실패",
            description: "PDF 생성에 실패했습니다",
            variant: "destructive",
            duration: 8000, // 8초 동안 유지
          });
        }
      } else {
        updateProcessingStep('generate-pdf', 'error');
        toast({
          title: "❌ 2. PDF 생성 실패",
          description: "PDF 생성 상태를 확인할 수 없습니다",
          variant: "destructive",
          duration: 8000, // 8초 동안 유지
        });
      }

      // Step 6: Prepare attachments
      updateProcessingStep('prepare-attachments', 'processing');
      await new Promise(resolve => setTimeout(resolve, 300));
      updateProcessingStep('prepare-attachments', 'completed');

      // Step 7: Complete
      updateProcessingStep('complete', 'processing');
      await new Promise(resolve => setTimeout(resolve, 200));
      updateProcessingStep('complete', 'completed');

      // 3단계 완료: DB 저장 여부
      if (saveData.data.savedOrderNumbers && saveData.data.savedOrderNumbers.length > 0) {
        setSavedOrderNumbers(saveData.data.savedOrderNumbers);
        
        toast({
          title: "✅ 3. DB 저장 완료",
          description: `Excel/PDF 파일 ${saveData.data.savedOrderNumbers.length}건이 데이터베이스에 저장됨`,
          duration: 8000, // 8초 동안 유지
        });
        
        // 4단계 완료: 이메일 첨부 가능여부 (약간의 딜레이 후 표시)
        setTimeout(() => {
          toast({
            title: "✅ 4. 이메일 첨부 준비 완료",
            description: `${pdfSuccess ? 'PDF + Excel' : 'Excel'} 파일이 이메일 첨부 가능한 상태입니다`,
            duration: 8000, // 8초 동안 유지
          });
        }, 500);
      } else {
        toast({
          title: "❌ 3. DB 저장 실패",
          description: "데이터베이스 저장에 실패했습니다",
          variant: "destructive",
          duration: 8000, // 8초 동안 유지
        });
      }

      // Invalidate orders queries
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['orders-optimized'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });

      setUploadResult(uploadData);
      
      // 모든 처리 완료 후 이메일 프로세스 시작
      setTimeout(() => {
        if (uploadData.data?.filePath) {
          handleStartEmailProcessWithFilePath(uploadData.data.filePath);
        }
      }, 1000); // 완료 후 1초 대기
      
    } catch (error) {
      console.error('Processing error:', error);
      const currentStep = processingSteps.find(s => s.status === 'processing');
      if (currentStep) {
        updateProcessingStep(currentStep.id, 'error', '처리 중 오류가 발생했습니다.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const getProgressValue = () => {
    const completedSteps = processingSteps.filter(step => step.status === 'completed').length;
    return (completedSteps / processingSteps.length) * 100;
  };

  const getStepIcon = (iconType: string, status: ProcessingStep['status']) => {
    const baseClasses = "w-3 h-3";
    
    if (status === 'completed') return <CheckCircle className={`${baseClasses} text-green-600`} />;
    if (status === 'processing') return <div className={`${baseClasses} border border-blue-600 border-t-transparent rounded-full animate-spin`} />;
    if (status === 'error') return <AlertCircle className={`${baseClasses} text-red-600`} />;
    
    const IconComponent = {
      'upload': Upload,
      'search': Search, 
      'file-text': FileText,
      'database': Database,
      'file-plus': FilePlus,
      'paperclip': Paperclip,
      'check-circle': CheckCircle
    }[iconType] || CheckCircle;
    
    return <IconComponent className={`${baseClasses} text-gray-400`} />;
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">엑셀 발주서 처리</h1>
            <p className="text-sm text-gray-600">
              엑셀 파일을 업로드하여 발주서를 생성하세요.
            </p>
          </div>
        </div>

      <div className="space-y-6">
        {/* 가이드라인 및 템플릿 다운로드 섹션 */}
        <Card className="border-blue-200 bg-blue-50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Info className="w-5 h-5" />
              엑셀 발주서 작성 가이드
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-3">📋 엑셀 파일 요구사항</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>시트명:</strong> 'Input' (대소문자 구분)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>컬럼 구조:</strong> A~P열 (16개 컬럼) 표준 구조</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>파일 형식:</strong> .xlsx (Excel 2007 이상)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>파일 크기:</strong> 최대 10MB</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                ⚠️ 주의사항
              </h4>
              <div className="space-y-2 text-sm text-amber-800">
                <div>• 필수 컬럼 (발주일자, 거래처명, 납품처명, 프로젝트명, 대분류, 품목명, 수량, 단가, 총금액) 누락 시 처리 불가</div>
                <div>• 거래처명이 시스템에 등록되지 않은 경우 관리자에게 등록 요청 필요</div>
                <div>• 총금액(O열) = 수량(M열) × 단가(N열) 수식이 정확해야 함</div>
                <div>• Input 시트 외 다른 시트(갑지, 을지 등)는 그대로 보존됨</div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-3">📥 표준 템플릿 다운로드</h4>
              <p className="text-sm text-green-700 mb-3">
                시스템에 최적화된 16개 컬럼 구조의 표준 템플릿을 다운로드하여 사용하세요.
              </p>
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/excel-template/download', {
                      method: 'GET',
                    });
                    
                    if (response.ok) {
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'PO_Excel_Template.xlsx';
                      document.body.appendChild(link);
                      link.click();
                      
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } else {
                      throw new Error('템플릿 다운로드 실패');
                    }
                  } catch (error) {
                    console.error('템플릿 다운로드 오류:', error);
                    alert('템플릿 다운로드 중 오류가 발생했습니다.');
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                PO_Excel_Template.xlsx 다운로드
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 업로드 섹션 */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              엑셀 발주서 업로드
            </CardTitle>
            <CardDescription>
              16개 컬럼 구조의 Input 시트가 포함된 엑셀 파일을 업로드하면 자동으로 발주서가 생성됩니다.
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
              <div className="mt-4 p-3 bg-blue-50 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-blue-900">진행 상황</span>
                  <span className="text-xs text-blue-700">{Math.round(getProgressValue())}%</span>
                </div>
                <Progress value={getProgressValue()} className="h-1 mb-2" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {processingSteps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-0.5">
                        {getStepIcon(step.icon || 'check-circle', step.status)}
                        {index < processingSteps.length - 1 && (
                          <div className={`w-2 h-0.5 ${
                            step.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-blue-700">
                    {processingSteps.find(s => s.status === 'processing')?.title || '완료'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {/* 발주서 미리보기 섹션 */}
      {uploadResult && uploadResult.data?.orders && (
        <Card className="mt-6 shadow-sm">
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
        <Card className="mt-6 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              처리 결과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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
                          savedOrderNumbers: savedOrderNumbers,
                          emailOptions: {
                            subject: emailPreview.subject,
                            orderNumber: uploadResult?.data?.orders?.[0]?.orderNumber || 'AUTO',
                            savedOrderNumbers: savedOrderNumbers,
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
        <Card className="mt-6 shadow-sm">
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
        <Card className="mt-6 shadow-sm">
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
                          savedOrderNumbers: savedOrderNumbers,
                          emailOptions: {
                            subject: emailPreview.subject,
                            orderNumber: uploadResult?.data?.orders?.[0]?.orderNumber || 'AUTO',
                            savedOrderNumbers: savedOrderNumbers,
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
        <Card className="mt-6 shadow-sm">
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
      <Card className="mt-6 shadow-sm">
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
    </div>
  );
}