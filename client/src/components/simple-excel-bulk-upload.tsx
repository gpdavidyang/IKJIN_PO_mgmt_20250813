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
  Package
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BulkOrderEditorTwoRow } from '@/components/bulk-order-editor-two-row';
import { toast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

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
      toast({
        title: "파일 파싱 실패",
        description: "엑셀 파일을 읽는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
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
      title: "발주서 생성 완료",
      description: "성공적으로 발주서가 생성되어 작성 목록에서 제거되었습니다. 생성된 발주서는 발주서 관리 화면에서 확인할 수 있습니다.",
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
    onSuccess: (data) => {
      toast({
        title: "저장 완료",
        description: `${data.savedCount}개의 발주서가 성공적으로 저장되었습니다.`,
      });
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
              
              <Button
                onClick={triggerFileSelect}
                disabled={isProcessing}
                className="mt-6"
                size="lg"
              >
                {isProcessing ? '처리 중...' : '파일 선택'}
              </Button>
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
    </div>
  );
}