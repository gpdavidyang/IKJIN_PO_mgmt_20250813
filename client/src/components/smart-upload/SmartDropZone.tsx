import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SmartDropZoneProps {
  onFileUpload: (file: File) => Promise<void>;
  onError?: (error: Error) => void;
  maxSize?: number;
  acceptedFormats?: string[];
  multiple?: boolean;
  disabled?: boolean;
  showPreview?: boolean;
  className?: string;
}

export const SmartDropZone: React.FC<SmartDropZoneProps> = ({
  onFileUpload,
  onError,
  maxSize = 50 * 1024 * 1024, // 50MB default
  acceptedFormats = ['.xlsx', '.xls', '.xlsm'],
  multiple = false,
  disabled = false,
  showPreview = true,
  className
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Reset states
    setErrorMessage(null);
    setUploadStatus('idle');

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      let error = '파일 업로드 실패: ';
      
      if (rejection.errors[0]?.code === 'file-too-large') {
        error += `파일 크기가 너무 큽니다 (최대 ${maxSize / 1024 / 1024}MB)`;
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        error += '지원하지 않는 파일 형식입니다';
      } else {
        error += rejection.errors[0]?.message || '알 수 없는 오류';
      }

      setErrorMessage(error);
      setUploadStatus('error');
      if (onError) {
        onError(new Error(error));
      }
      return;
    }

    // Handle accepted files
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setCurrentFile(file);
      setUploadStatus('uploading');
      setUploadProgress(0);

      try {
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        await onFileUpload(file);

        clearInterval(progressInterval);
        setUploadProgress(100);
        setUploadStatus('success');

        // Reset after success
        setTimeout(() => {
          if (uploadStatus === 'success') {
            setUploadStatus('idle');
            setUploadProgress(0);
          }
        }, 3000);
      } catch (error) {
        setUploadStatus('error');
        setErrorMessage(error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다');
        setUploadProgress(0);
        
        if (onError) {
          onError(error instanceof Error ? error : new Error('업로드 실패'));
        }
      }
    }
  }, [onFileUpload, onError, maxSize, uploadStatus]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, format) => {
      // Map file extensions to MIME types
      const mimeMap: Record<string, string[]> = {
        '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        '.xls': ['application/vnd.ms-excel'],
        '.xlsm': ['application/vnd.ms-excel.sheet.macroenabled.12'],
      };
      
      if (mimeMap[format]) {
        mimeMap[format].forEach(mime => {
          acc[mime] = [format];
        });
      }
      return acc;
    }, {} as Record<string, string[]>),
    maxSize,
    multiple,
    disabled: disabled || uploadStatus === 'uploading',
  });

  const handleButtonClick = () => {
    // Trigger file input when button is clicked
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 transition-all duration-200 ease-in-out text-center cursor-pointer',
          isDragActive && 'border-blue-500 bg-blue-50',
          uploadStatus === 'success' && 'border-green-500 bg-green-50',
          uploadStatus === 'error' && 'border-red-500 bg-red-50',
          disabled && 'opacity-50 cursor-not-allowed',
          !isDragActive && uploadStatus === 'idle' && 'border-gray-300 hover:border-gray-400',
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          {uploadStatus === 'idle' && (
            <>
              <FileSpreadsheet className="h-12 w-12 text-gray-400" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-700">
                  {isDragActive ? '파일을 놓으세요' : 'Excel 파일을 여기에 놓으세요'}
                </p>
                <p className="text-sm text-gray-500">
                  또는 클릭하여 선택
                </p>
                <p className="text-xs text-gray-400">
                  지원 형식: {acceptedFormats.join(', ')} (최대 {maxSize / 1024 / 1024}MB)
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleButtonClick}
                  disabled={disabled}
                  variant="default"
                >
                  파일 선택
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Download sample file logic here
                  }}
                >
                  샘플 다운로드
                </Button>
              </div>
            </>
          )}

          {uploadStatus === 'uploading' && (
            <>
              <Upload className="h-12 w-12 text-blue-500 animate-pulse" />
              <div className="w-full max-w-xs space-y-2">
                <p className="text-sm font-medium text-gray-700">업로드 중...</p>
                {currentFile && (
                  <p className="text-xs text-gray-500">{currentFile.name}</p>
                )}
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-gray-500">{uploadProgress}%</p>
              </div>
            </>
          )}

          {uploadStatus === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-700">업로드 완료!</p>
                {currentFile && (
                  <p className="text-xs text-gray-500">{currentFile.name}</p>
                )}
              </div>
            </>
          )}

          {uploadStatus === 'error' && (
            <>
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">업로드 실패</p>
                {errorMessage && (
                  <p className="text-xs text-red-600">{errorMessage}</p>
                )}
                <Button
                  type="button"
                  onClick={handleButtonClick}
                  variant="outline"
                  size="sm"
                >
                  다시 시도
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {showPreview && currentFile && uploadStatus === 'success' && (
        <Alert className="mt-4">
          <FileSpreadsheet className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-center">
              <div>
                <strong>{currentFile.name}</strong>
                <span className="text-sm text-gray-500 ml-2">
                  ({(currentFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <span className="text-sm text-green-600">검증 대기 중...</span>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};