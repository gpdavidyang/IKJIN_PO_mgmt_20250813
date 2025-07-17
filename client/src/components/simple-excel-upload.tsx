import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from 'xlsx';

interface SimpleExcelUploadProps {
  onDataParsed: (data: any[]) => void;
}

export function SimpleExcelUpload({ onDataParsed }: SimpleExcelUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    setUploadStatus('idle');

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          throw new Error('Excel 파일에 데이터가 없습니다.');
        }

        const rows = jsonData.slice(1) as any[][];
        const validRows = rows.filter(row => row && row.some(cell => cell));

        if (validRows.length === 0) {
          throw new Error('유효한 데이터가 없습니다.');
        }

        setUploadStatus('success');
        setStatusMessage(`${validRows.length}개의 행을 성공적으로 불러왔습니다.`);
        onDataParsed(validRows);
        
      } catch (error) {
        setUploadStatus('error');
        setStatusMessage(error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      setUploadStatus('error');
      setStatusMessage('파일을 읽는 중 오류가 발생했습니다.');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Excel 파일 업로드 (실험 기능)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center border-gray-300 hover:border-gray-400">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            
            <div className="space-y-2">
              <p className="font-medium text-gray-700">
                Excel 파일을 업로드하여 품목 데이터 불러오기
              </p>
              <p className="text-sm text-gray-500">
                .xlsx, .xls, .csv 파일을 지원합니다
              </p>
            </div>
            
            <Button
              onClick={triggerFileSelect}
              disabled={isProcessing}
              className="mt-3"
              variant="outline"
            >
              {isProcessing ? '처리 중...' : '파일 선택'}
            </Button>
          </div>

          {uploadStatus === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}

          {uploadStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>참고:</strong> 첫 번째 행은 헤더로 처리되며, 두 번째 행부터 데이터로 인식됩니다.
              품목명, 수량, 단가 등의 정보가 포함된 Excel 파일을 업로드해주세요.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}