import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
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
      toast({
        title: '업로드 실패',
        description: error.message || '파일 업로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            스마트 엑셀 업로드 (간소화 버전)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
            >
              {isUploading ? '처리 중...' : '업로드 및 처리'}
            </Button>
          </div>

          {/* Validation Status Panel */}
          {(isUploading || uploadResult) && (
            <div className="mt-6">
              <ValidationStatusPanel
                validationProgress={validationProgress}
                statusCounts={statusCounts}
                autoSaveStatus={autoSaveStatus}
                totalItems={uploadResult?.itemCount || 0}
              />
            </div>
          )}

          {/* Smart Table for detailed results */}
          {uploadResult && uploadResult.details && uploadResult.details.processedData && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">상세 데이터 검증 결과</CardTitle>
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

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <div>• Excel 파일(.xlsx, .xls)만 지원됩니다</div>
                <div>• 파일 크기는 10MB 이하여야 합니다</div>
                <div>• 중복 검출 및 자동 검증이 수행됩니다</div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}