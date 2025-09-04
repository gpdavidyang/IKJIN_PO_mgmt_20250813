import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function ExcelSmartUploadSimple() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          selectedFile.type === 'application/vnd.ms-excel') {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        toast({
          title: '파일 형식 오류',
          description: 'Excel 파일(.xlsx, .xls)만 업로드 가능합니다.',
          variant: 'destructive',
        });
      }
    }
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
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiRequest('/api/excel-smart-upload/process', {
        method: 'POST',
        body: formData,
        headers: {
          // FormData를 보낼 때는 Content-Type을 설정하지 않음
        },
      });

      setUploadResult(response);
      toast({
        title: '업로드 성공',
        description: `${response.itemCount || 0}개의 항목이 처리되었습니다.`,
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: '업로드 실패',
        description: error.message || '파일 업로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
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
          {/* File Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <div className="mb-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  파일을 선택하세요
                </span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </label>
            </div>
            {file && (
              <div className="text-sm text-gray-600">
                선택된 파일: {file.name} ({(file.size / 1024).toFixed(2)} KB)
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

          {/* Results */}
          {uploadResult && (
            <Alert className="mt-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div>✅ 업로드 완료</div>
                  {uploadResult.itemCount && (
                    <div>처리된 항목: {uploadResult.itemCount}개</div>
                  )}
                  {uploadResult.duplicates && (
                    <div>중복 발견: {uploadResult.duplicates}개</div>
                  )}
                  {uploadResult.validationErrors && (
                    <div>검증 오류: {uploadResult.validationErrors}개</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
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