import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Download,
  AlertTriangle 
} from 'lucide-react';

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
}

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

interface ExcelUploadComponentProps {
  onUploadComplete: (data: any) => void;
  disabled?: boolean;
}

const ExcelUploadComponent: React.FC<ExcelUploadComponentProps> = ({ 
  onUploadComplete, 
  disabled 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
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
      
      // 업로드 완료 시 상위 컴포넌트에 데이터 전달
      const dataToSubmit = {
        type: 'excel',
        orders: uploadData.data.orders,
        filePath: uploadData.data.filePath,
        totalOrders: uploadData.data.totalOrders,
        totalItems: uploadData.data.totalItems,
        fileName: uploadData.data.fileName
      };
      
      console.log('ExcelUploadComponent submitting data:', dataToSubmit);
      onUploadComplete(dataToSubmit);
      
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

  return (
    <div className="space-y-6">
      {/* 가이드라인 및 템플릿 다운로드 섹션 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="space-y-4">
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
                disabled={disabled}
              >
                <Download className="w-4 h-4 mr-2" />
                PO_Excel_Template.xlsx 다운로드
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 업로드 섹션 */}
      <div>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
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
            disabled={disabled}
          />
          <label
            htmlFor="file-upload"
            className={`inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors font-medium ${
              disabled ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            파일 선택
          </label>
        </div>

        {file && (
          <div className="mt-6 flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={processing || disabled}
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
              disabled={processing || disabled}
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
      </div>

      {/* 발주서 미리보기 섹션 */}
      {uploadResult && uploadResult.data?.orders && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              발주서 데이터 미리보기
            </h4>
            <div className="space-y-6">
              {uploadResult.data.orders.slice(0, 2).map((order: any, orderIndex: number) => (
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
                  
                  {/* 처음 3개 품목만 표시 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-2 py-1 text-left">품목명</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">규격</th>
                          <th className="border border-gray-300 px-2 py-1 text-right">수량</th>
                          <th className="border border-gray-300 px-2 py-1 text-right">단가</th>
                          <th className="border border-gray-300 px-2 py-1 text-right">금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.slice(0, 3).map((item: any, itemIndex: number) => (
                          <tr key={itemIndex}>
                            <td className="border border-gray-300 px-2 py-1">{item.itemName}</td>
                            <td className="border border-gray-300 px-2 py-1">{item.specification}</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {new Intl.NumberFormat('ko-KR').format(item.quantity)}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {new Intl.NumberFormat('ko-KR').format(item.unitPrice)}원
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {new Intl.NumberFormat('ko-KR').format(item.totalAmount)}원
                            </td>
                          </tr>
                        ))}
                        {order.items.length > 3 && (
                          <tr>
                            <td colSpan={5} className="border border-gray-300 px-2 py-1 text-center text-gray-500">
                              ... 외 {order.items.length - 3}개 품목
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {uploadResult.data.orders.length > 2 && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">... 외 {uploadResult.data.orders.length - 2}개 발주서</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 처리 결과 */}
      {uploadResult && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            엑셀 발주서가 성공적으로 처리되었습니다. 
            발주서 {uploadResult.data?.totalOrders}개, 품목 {uploadResult.data?.totalItems}개가 생성되었습니다.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ExcelUploadComponent;