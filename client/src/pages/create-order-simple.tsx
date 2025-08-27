import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Download,
  Edit3,
  Package
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BulkOrderEditor } from '@/components/bulk-order-editor';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

interface ParsedOrderData {
  rowIndex: number;
  projectName?: string;
  vendorName?: string;
  vendorEmail?: string;
  deliveryDate?: string;
  items: Array<{
    itemName?: string;
    specification?: string;
    unit?: string;
    quantity?: number;
    unitPrice?: number;
    totalAmount?: number;
    remarks?: string;
  }>;
  notes?: string;
  isValid?: boolean;
  errors?: string[];
}

export default function CreateOrderSimple() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
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
      
      // 데이터를 발주서 객체로 변환
      const orders: ParsedOrderData[] = dataRows
        .filter(row => row && row.some(cell => cell)) // 빈 행 제거
        .map((row, index) => ({
          rowIndex: index + 2, // 엑셀 행 번호 (1-based, 헤더 제외)
          projectName: row[0]?.toString().trim(),
          vendorName: row[1]?.toString().trim(),
          vendorEmail: row[2]?.toString().trim(),
          deliveryDate: row[3]?.toString().trim(),
          items: [{
            itemName: row[4]?.toString().trim(),
            specification: row[5]?.toString().trim(),
            unit: row[6]?.toString().trim(),
            quantity: parseFloat(row[7]) || 0,
            unitPrice: parseFloat(row[8]) || 0,
            totalAmount: parseFloat(row[9]) || 0,
            remarks: row[10]?.toString().trim()
          }],
          notes: row[11]?.toString().trim(),
          isValid: true,
          errors: []
        }));

      // 같은 프로젝트/거래처의 항목들을 그룹화
      const groupedOrders = groupOrdersByVendor(orders);
      
      setParsedOrders(groupedOrders);
      setEditedOrders(groupedOrders);
      setUploadProgress(100);
      
      toast({
        title: "엑셀 파일 로딩 완료",
        description: `발주서 생성을 위해 ${groupedOrders.length}개의 데이터가 성공적으로 로드되었습니다. 각 항목을 확인하고 수정한 후 '모두 저장' 버튼을 클릭하세요.`,
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6 pb-20">
        {/* 페이지 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">엑셀 심플 업로드</h1>
                <p className="text-sm text-gray-600 mt-1">
                  검증 없이 엑셀 데이터를 바로 편집 가능한 발주서로 변환합니다
                </p>
              </div>
            </div>
            
            {editedOrders.length > 0 && (
              <div className="flex gap-2">
                <Badge variant="secondary" className="px-3 py-1">
                  <Package className="h-3 w-3 mr-1" />
                  {editedOrders.length}개 발주서
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  {editedOrders.reduce((sum, order) => sum + order.items.length, 0)}개 품목
                </Badge>
              </div>
            )}
          </div>
        </div>

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

                <Alert className="max-w-md">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    각 카드의 필드를 클릭하여 직접 수정할 수 있습니다.
                    모든 수정이 완료되면 '모두 저장'을 클릭하세요.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {/* 발주서 편집 컴포넌트 */}
            <BulkOrderEditor
              orders={editedOrders}
              onOrderUpdate={handleOrderUpdate}
              onOrderRemove={handleRemoveOrder}
            />
          </>
        )}
      </div>
    </div>
  );
}