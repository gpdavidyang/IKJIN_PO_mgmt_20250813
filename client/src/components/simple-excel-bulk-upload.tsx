import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileSpreadsheet, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle,
  Package,
  Info,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BulkOrderEditorTwoRow } from '@/components/bulk-order-editor-two-row';
import { FieldValidationErrorDialog } from './FieldValidationErrorDialog';
import { toast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface ParsedOrderData {
  rowIndex: number;
  orderDate?: string;       // 발주일자
  deliveryDate?: string;    // 납기일자
  vendorName?: string;      // 거래처명
  vendorEmail?: string;     // 거래처 이메일
  deliveryPlace?: string;   // 납품처명
  deliveryEmail?: string;   // 납품처 이메일
  projectName?: string;     // 프로젝트명
  majorCategory?: string;   // 대분류
  middleCategory?: string;  // 중분류
  minorCategory?: string;   // 소분류
  items: Array<{
    itemName?: string;      // 품목명
    specification?: string; // 규격
    quantity?: number;      // 수량
    unitPrice?: number;     // 단가
    totalAmount?: number;   // 총금액
    remarks?: string;       // 비고
  }>;
  isValid?: boolean;
  errors?: string[];
}

export function SimpleExcelBulkUpload() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedOrders, setParsedOrders] = useState<ParsedOrderData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editedOrders, setEditedOrders] = useState<ParsedOrderData[]>([]);
  const [fieldValidationErrors, setFieldValidationErrors] = useState<string[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // 드래그 앤 드롭 핸들러
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
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.xlsm')) {
      toast({
        title: "파일 형식 오류",
        description: "엑셀 파일(.xlsx, .xls, .xlsm)만 업로드 가능합니다.",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    parseExcelFile(selectedFile);
  };

  const parseExcelFile = async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(20);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setUploadProgress(40);
      
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      setUploadProgress(60);
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      setUploadProgress(80);

      // 필드 검증: 첫 번째 행(헤더)이 올바른 필드명을 포함하는지 확인
      if (jsonData.length === 0) {
        throw new Error('엑셀 파일이 비어있습니다.');
      }

      const headerRow = jsonData[0];
      const expectedFields = [
        '발주일자', '납기일자', '거래처명', '거래처 이메일',
        '납품처명', '납품처 이메일', '프로젝트명',
        '대분류', '중분류', '소분류',
        '품목명', '규격', '수량', '단가', '총금액', '비고'
      ];

      const fieldValidationErrors = [];
      const headerMapping = new Map<string, number>();

      // 헤더 필드 검증 및 매핑 생성
      for (let i = 0; i < expectedFields.length; i++) {
        const expectedField = expectedFields[i];
        const actualField = headerRow[i]?.toString().trim();
        
        if (!actualField || actualField !== expectedField) {
          fieldValidationErrors.push(
            `컬럼 ${i + 1}: "${actualField || '(빈값)'}" → 올바른 필드명: "${expectedField}"`
          );
        } else {
          headerMapping.set(expectedField, i);
        }
      }

      // 필드 검증 실패 시 에러 다이얼로그 표시
      if (fieldValidationErrors.length > 0) {
        setFieldValidationErrors(fieldValidationErrors);
        setShowErrorDialog(true);
        setIsProcessing(false);
        return; // 처리 중단
      }

      // 헤더 행 제거 (첫 번째 행이 헤더라고 가정)
      const dataRows = jsonData.slice(1);
      
      // 데이터를 발주서 객체로 변환 - 각 행을 개별 발주서로 처리
      // Excel 컬럼 순서:
      // 0: 발주일자, 1: 납기일자, 2: 거래처명, 3: 거래처 이메일
      // 4: 납품처명, 5: 납품처 이메일, 6: 프로젝트명
      // 7: 대분류, 8: 중분류, 9: 소분류
      // 10: 품목명, 11: 규격, 12: 수량, 13: 단가, 14: 총금액, 15: 비고
      const orders: ParsedOrderData[] = dataRows
        .filter(row => row && row.some(cell => cell)) // 빈 행 제거
        .map((row, index) => {
          // 날짜 변환 (Excel serial number to date string)
          const formatDate = (value: any) => {
            if (!value) return '';
            if (typeof value === 'number') {
              // Excel date serial number
              const date = new Date((value - 25569) * 86400 * 1000);
              return date.toISOString().split('T')[0];
            }
            return value.toString().trim();
          };

          return {
            rowIndex: index + 2, // 엑셀 행 번호 (1-based, 헤더 제외)
            orderDate: formatDate(row[0]),
            deliveryDate: formatDate(row[1]),
            vendorName: row[2]?.toString().trim(),
            vendorEmail: row[3]?.toString().trim(),
            deliveryPlace: row[4]?.toString().trim(),
            deliveryEmail: row[5]?.toString().trim(),
            projectName: row[6]?.toString().trim(),
            majorCategory: row[7]?.toString().trim(),
            middleCategory: row[8]?.toString().trim(),
            minorCategory: row[9]?.toString().trim(),
            items: [{
              itemName: row[10]?.toString().trim(),
              specification: row[11]?.toString().trim(),
              quantity: parseFloat(row[12]) || 0,
              unitPrice: parseFloat(row[13]) || 0,
              totalAmount: parseFloat(row[14]) || 0,
              remarks: row[15]?.toString().trim()
            }],
            isValid: true,
            errors: []
          };
        });

      // 그룹화하지 않고 각 행을 개별 발주서로 처리
      // const groupedOrders = groupOrdersByVendor(orders);
      
      setParsedOrders(orders);
      setEditedOrders(orders);
      setUploadProgress(100);
      
      toast({
        title: "엑셀 파일 로딩 완료",
        description: `발주서 생성을 위해 ${orders.length}개의 데이터가 성공적으로 로드되었습니다. 각 항목을 확인하고 수정한 후 '모두 저장' 버튼을 클릭하세요.`,
      });
    } catch (error) {
      console.error('Excel parsing error:', error);
      
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      
      // 필드 검증 오류인 경우 더 자세한 정보 표시
      if (errorMessage.includes('헤더가 올바르지 않습니다')) {
        toast({
          title: "엑셀 필드 검증 실패",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        toast({
          title: "파일 파싱 실패",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsProcessing(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const groupOrdersByVendor = (orders: ParsedOrderData[]): ParsedOrderData[] => {
    const grouped = new Map<string, ParsedOrderData>();
    
    orders.forEach(order => {
      const key = `${order.projectName}-${order.vendorName}`;
      
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.items.push(...order.items);
      } else {
        grouped.set(key, { ...order });
      }
    });
    
    return Array.from(grouped.values());
  };

  const handleOrderUpdate = (index: number, updatedOrder: ParsedOrderData) => {
    const newOrders = [...editedOrders];
    newOrders[index] = updatedOrder;
    setEditedOrders(newOrders);
  };

  const handleRemoveOrder = (index: number) => {
    const newOrders = editedOrders.filter((_, i) => i !== index);
    setEditedOrders(newOrders);
    toast({
      title: "항목 제거",
      description: "선택한 항목이 목록에서 제거되었습니다.",
    });
  };

  // 일괄 저장 Mutation
  const saveBulkOrders = useMutation({
    mutationFn: async (orders: ParsedOrderData[]) => {
      const formData = new FormData();
      
      // 원본 엑셀 파일 첨부
      if (file) {
        formData.append('excelFile', file);
      }
      
      // 발주서 데이터를 JSON으로 전송
      formData.append('orders', JSON.stringify(orders));
      
      const response = await fetch('/api/orders/bulk-create-simple', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to save orders');
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      // Invalidate all orders related queries to refresh the list
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey.some(key => 
            typeof key === 'string' && (
              key.includes('orders') || 
              key.includes('/api/orders')
            )
          );
        }
      });
      
      toast({
        title: "저장 완료",
        description: `${data.savedCount}개의 발주서가 성공적으로 저장되었습니다.`,
      });
      
      // Navigate to orders page after cache invalidation
      setTimeout(() => navigate('/orders'), 1500);
    },
    onError: (error) => {
      toast({
        title: "저장 실패",
        description: error.message || "발주서 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleSaveAll = () => {
    const validOrders = editedOrders.filter(order => order.isValid !== false);
    
    if (validOrders.length === 0) {
      toast({
        title: "저장할 수 없음",
        description: "유효한 발주서가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    saveBulkOrders.mutate(validOrders);
  };

  const handleReset = () => {
    setFile(null);
    setParsedOrders([]);
    setEditedOrders([]);
    setUploadProgress(0);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/excel-template/download');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PO_Excel_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: '템플릿 다운로드 완료',
        description: '표준 Excel 템플릿을 다운로드했습니다.',
      });
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: '다운로드 실패',
        description: '템플릿 다운로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleRetry = () => {
    setShowErrorDialog(false);
    setFieldValidationErrors([]);
    triggerFileSelect();
  };

  return (
    <div className="space-y-6">
      {/* 파일 업로드 영역 */}
      {editedOrders.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm"
              onChange={handleFileInput}
              className="hidden"
            />
            
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-700">
                  엑셀 파일을 드래그하거나 클릭하여 업로드
                </p>
                <p className="text-sm text-gray-500">
                  DB 검증 없이 바로 편집 가능한 발주서로 변환됩니다
                </p>
                <p className="text-xs text-gray-400">
                  .xlsx, .xls, .xlsm 파일 지원
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button
                  onClick={triggerFileSelect}
                  disabled={isProcessing}
                  size="lg"
                >
                  {isProcessing ? '처리 중...' : '파일 선택'}
                </Button>
                <Button
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  템플릿 다운로드
                </Button>
              </div>
            </div>

            {uploadProgress > 0 && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>파일 처리 중...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {file && (
              <Alert className="mt-6">
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                </AlertDescription>
              </Alert>
            )}

            {/* 필수 필드명 가이드 */}
            <Alert className="mt-6 bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <div className="text-sm">
                  <p className="font-semibold text-blue-900 mb-2">📋 필수 Excel 필드명 (정확히 일치해야 함)</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-800">
                    <div>• <strong>기본 정보:</strong> 발주일자, 납기일자</div>
                    <div>• <strong>거래처:</strong> 거래처명, 거래처 이메일</div>
                    <div>• <strong>납품처:</strong> 납품처명, 납품처 이메일</div>
                    <div>• <strong>프로젝트:</strong> 프로젝트명</div>
                    <div>• <strong>분류:</strong> 대분류, 중분류, 소분류</div>
                    <div>• <strong>품목:</strong> 품목명, 규격, 수량, 단가, 총금액, 비고</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <Alert className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>엑셀 심플 업로드 특징:</strong>
                <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                  <li>DB 값과 비교/보정 과정 없음</li>
                  <li>엑셀 데이터를 그대로 표시</li>
                  <li>모든 필드를 직접 수정 가능</li>
                  <li>여러 발주서를 한번에 편집 및 저장</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* 발주서 편집 영역 */}
      {editedOrders.length > 0 && (
        <>
          {/* 액션 바 */}
          <div className="sticky top-0 z-10 bg-white border rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSaveAll}
                  disabled={saveBulkOrders.isPending}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveBulkOrders.isPending ? '저장 중...' : '모두 저장'}
                </Button>
                
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                >
                  <X className="h-4 w-4 mr-2" />
                  초기화
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="px-3 py-1">
                  <Package className="h-3 w-3 mr-1" />
                  {editedOrders.length}개 발주서
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  {editedOrders.reduce((sum, order) => sum + order.items.length, 0)}개 품목
                </Badge>
              </div>
            </div>
          </div>

          {/* 발주서 편집 컴포넌트 */}
          <BulkOrderEditorTwoRow
            orders={editedOrders}
            onOrderUpdate={handleOrderUpdate}
            onOrderRemove={handleRemoveOrder}
            file={file}
          />
        </>
      )}

      {/* 필드 검증 에러 다이얼로그 */}
      <FieldValidationErrorDialog
        isOpen={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        errors={fieldValidationErrors}
        onRetry={handleRetry}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}