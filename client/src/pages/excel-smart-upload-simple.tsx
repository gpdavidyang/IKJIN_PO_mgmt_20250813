import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Info, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { ValidationStatusPanel } from '@/components/excel/ValidationStatusPanel';
import { SmartTable } from '@/components/excel/SmartTable';

export default function ExcelSmartUploadSimple() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [validationProgress, setValidationProgress] = useState(0);
  const [statusCounts, setStatusCounts] = useState({
    valid: 0,
    warning: 0,
    error: 0
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const [fieldError, setFieldError] = useState<{
    missing?: string[];
    incorrect?: string[];
    message?: string;
    templateUrl?: string;
  } | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      toast({
        title: '파일 형식 오류',
        description: 'Excel 파일(.xlsx, .xls)만 업로드 가능합니다.',
        variant: 'destructive',
      });
      return;
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setUploadResult(null);
      toast({
        title: '파일 선택됨',
        description: `${acceptedFiles[0].name} 파일이 선택되었습니다.`,
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          selectedFile.type === 'application/vnd.ms-excel' ||
          selectedFile.type === 'application/vnd.ms-excel.sheet.macroEnabled.12') {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        toast({
          title: '파일 형식 오류',
          description: 'Excel 파일(.xlsx, .xls, .xlsm)만 업로드 가능합니다.',
          variant: 'destructive',
        });
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadResult(null);
    setFieldError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: '파일 선택',
        description: '업로드할 파일을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setValidationProgress(0);
    setStatusCounts({ valid: 0, warning: 0, error: 0 });
    setAutoSaveStatus(null);

    // Simulate validation progress
    const progressInterval = setInterval(() => {
      setValidationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setAutoSaveStatus('saving');
      const response = await apiRequest('POST', '/api/excel-smart-upload/process', formData);

      // Update validation counts from server response
      if (response.statusCounts) {
        setStatusCounts(response.statusCounts);
      } else {
        // Fallback for backward compatibility
        const totalItems = response.itemCount || 0;
        const errors = response.validationErrors || 0;
        const duplicates = response.duplicates || 0;
        
        setStatusCounts({
          valid: totalItems - errors - duplicates,
          warning: duplicates,
          error: errors
        });
      }
      
      setValidationProgress(100);
      setAutoSaveStatus('saved');
      setUploadResult(response);
      
      const totalCount = response.itemCount || 0;
      toast({
        title: '업로드 성공',
        description: `${totalCount}개의 항목이 처리되었습니다.`,
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setAutoSaveStatus('error');
      
      // Check if it's a field validation error
      if (error.fieldErrors) {
        setFieldError(error.fieldErrors);
        toast({
          title: 'Excel 필드명 오류',
          description: error.message || '표준 템플릿 형식을 사용해주세요.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '업로드 실패',
          description: error.message || '파일 업로드 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      }
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5" />
            스마트 엑셀 업로드
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Field Guide Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              <div className="font-semibold text-blue-900 mb-2">필수 Excel 필드명 안내</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                <div>• <strong>발주일자</strong> (날짜 형식)</div>
                <div>• <strong>납기일자</strong> (날짜 형식)</div>
                <div>• <strong>거래처명</strong> (필수)</div>
                <div>• <strong>거래처 이메일</strong></div>
                <div>• <strong>납품처명</strong></div>
                <div>• <strong>프로젝트명</strong> (필수)</div>
                <div>• <strong>품목명</strong> (필수)</div>
                <div>• <strong>규격</strong></div>
                <div>• <strong>수량</strong> (숫자)</div>
                <div>• <strong>단가</strong> (숫자)</div>
                <div>• <strong>총금액</strong> (숫자)</div>
                <div>• <strong>대분류, 중분류, 소분류</strong></div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Button 
                  size="xs" 
                  variant="outline" 
                  className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => window.open('/api/excel-template/download', '_blank')}
                >
                  <Download className="h-3 w-3 mr-1" />
                  표준 템플릿 다운로드
                </Button>
                <span className="text-xs text-blue-700">※ Input 시트에 데이터를 입력하세요</span>
              </div>
            </AlertDescription>
          </Alert>
          {/* Drag and Drop File Upload Section */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
              isDragActive && !isDragReject && "border-blue-500 bg-blue-50",
              isDragReject && "border-red-500 bg-red-50",
              !isDragActive && !file && "border-gray-300 hover:border-gray-400",
              file && "border-green-500 bg-green-50",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            
            {!file ? (
              <>
                <Upload className={cn(
                  "h-12 w-12 mx-auto mb-4",
                  isDragActive && !isDragReject && "text-blue-500",
                  isDragReject && "text-red-500",
                  !isDragActive && "text-gray-400"
                )} />
                <div className="mb-4">
                  {isDragActive && !isDragReject ? (
                    <p className="text-blue-600 font-medium">파일을 여기에 놓으세요</p>
                  ) : isDragReject ? (
                    <p className="text-red-600 font-medium">Excel 파일만 업로드 가능합니다</p>
                  ) : (
                    <>
                      <p className="text-lg font-medium text-gray-700">
                        파일을 드래그하거나
                      </p>
                      <p className="text-blue-600 hover:text-blue-700 font-medium mt-2">
                        클릭하여 선택하세요
                      </p>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Excel 파일 (.xlsx, .xls, .xlsm) - 최대 10MB
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-green-500" />
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {file.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({(file.size / 1024).toFixed(2)} KB)
                  </span>
                  {!isUploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      className="ml-2 p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  )}
                </div>
                {!isUploading && (
                  <p className="text-xs text-gray-500">
                    다른 파일을 선택하려면 클릭하거나 드래그하세요
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="min-w-[200px]"
              size="sm"
            >
              {isUploading ? '처리 중...' : '업로드 및 처리'}
            </Button>
          </div>
          
          {/* Field Error Alert */}
          {fieldError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm">
                <div className="font-semibold text-red-900 mb-2">Excel 필드명 오류 발견</div>
                {fieldError.missing && fieldError.missing.length > 0 && (
                  <div className="mb-2">
                    <span className="font-semibold text-red-800">필수 필드 누락:</span>
                    <div className="mt-1 text-xs text-red-700">
                      {fieldError.missing.map(field => (
                        <div key={field}>• {field}</div>
                      ))}
                    </div>
                  </div>
                )}
                {fieldError.incorrect && fieldError.incorrect.length > 0 && (
                  <div className="mb-2">
                    <span className="font-semibold text-red-800">잘못된 필드명:</span>
                    <div className="mt-1 text-xs text-red-700">
                      {fieldError.incorrect.map(field => (
                        <div key={field}>• {field}</div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <Button 
                    size="xs" 
                    variant="outline" 
                    className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => window.open('/api/excel-template/download', '_blank')}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    표준 템플릿 다운로드
                  </Button>
                  <span className="text-xs text-red-700">템플릿을 사용하여 다시 업로드해주세요</span>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Validation Status Panel - Separated and Compact */}
      {(isUploading || uploadResult) && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">검증 결과 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <ValidationStatusPanel
              validationProgress={validationProgress}
              statusCounts={statusCounts}
              autoSaveStatus={autoSaveStatus}
              totalItems={uploadResult?.itemCount || 0}
            />
          </CardContent>
        </Card>
      )}

      {/* Smart Table for detailed results - Full Width */}
      {uploadResult && uploadResult.details && uploadResult.details.processedData && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">상세 데이터 검증 결과</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel 다운로드
                </Button>
                <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  발주서 생성
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SmartTable
              data={uploadResult.details.processedData}
              columns={uploadResult.details.columns || []}
              onDataChange={(updatedData) => {
                // Handle data changes
                console.log('Data updated:', updatedData);
                toast({
                  title: '데이터 수정됨',
                  description: '변경사항이 저장되었습니다.',
                  variant: 'success',
                });
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Instructions - Moved to bottom */}
      {!uploadResult && (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-xs">
              <div>• Excel 파일(.xlsx, .xls)만 지원됩니다</div>
              <div>• 파일 크기는 10MB 이하여야 합니다</div>
              <div>• 중복 검출 및 자동 검증이 수행됩니다</div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}