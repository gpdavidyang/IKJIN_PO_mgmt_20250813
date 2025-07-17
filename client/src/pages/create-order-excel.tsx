import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Upload, Download, Mail, CheckCircle, AlertCircle, Info } from 'lucide-react';

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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">엑셀 발주서 업로드</h1>
        <p className="text-gray-600">
          지정된 템플릿 양식의 엑셀 파일을 업로드하여 발주서를 자동으로 생성합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 업로드 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              파일 업로드
            </CardTitle>
            <CardDescription>
              PO Template 엑셀 파일을 업로드하세요. Input 시트의 데이터가 자동으로 파싱됩니다.
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
                  <p className="text-sm text-gray-600">
                    파일을 드래그하여 업로드하거나 클릭하여 선택하세요
                  </p>
                  <p className="text-xs text-gray-500">
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
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
              >
                파일 선택
              </label>
            </div>

            {file && (
              <div className="mt-6 flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      업로드 및 처리
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
                >
                  취소
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 처리 상태 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              처리 상태
            </CardTitle>
            <CardDescription>
              파일 업로드부터 데이터베이스 저장까지의 진행 상황을 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">전체 진행률</span>
                  <span className="text-sm text-gray-600">{Math.round(getProgressValue())}%</span>
                </div>
                <Progress value={getProgressValue()} className="h-2" />
              </div>

              <div className="space-y-3">
                {processingSteps.map((step) => (
                  <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    {getStepIcon(step.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{step.title}</h4>
                        <Badge 
                          variant={
                            step.status === 'completed' ? 'default' :
                            step.status === 'processing' ? 'secondary' :
                            step.status === 'error' ? 'destructive' : 'outline'
                          }
                        >
                          {step.status === 'completed' ? '완료' :
                           step.status === 'processing' ? '진행중' :
                           step.status === 'error' ? '오류' : '대기'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      {step.message && (
                        <p className="text-xs text-gray-500 mt-1">{step.message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 결과 섹션 */}
      {uploadResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              처리 결과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                엑셀 발주서가 성공적으로 처리되었습니다. 발주서 관리 페이지에서 생성된 발주서를 확인할 수 있습니다.
              </AlertDescription>
            </Alert>

            <div className="mt-4 flex gap-2">
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

      {/* 사용법 안내 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>사용법 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. 템플릿 파일 준비</h4>
              <p className="text-sm text-gray-600">
                지정된 PO Template 양식(.xlsx)을 준비하세요. Input 시트에 발주서 정보가 포함되어야 합니다.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. 파일 업로드</h4>
              <p className="text-sm text-gray-600">
                드래그 앤 드롭 또는 파일 선택을 통해 엑셀 파일을 업로드하세요.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. 자동 처리</h4>
              <p className="text-sm text-gray-600">
                시스템이 자동으로 Input 시트를 파싱하고 발주서를 생성합니다. 갑지/을지 시트도 자동으로 추출됩니다.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">4. 결과 확인</h4>
              <p className="text-sm text-gray-600">
                처리 완료 후 발주서 관리 페이지에서 생성된 발주서를 확인하고 관리할 수 있습니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}