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
  Package,
  Mail,
  Send
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
  orderDate?: string;
  deliveryDate?: string;
  orderNumber?: string;
  items: Array<{
    itemName?: string;
    specification?: string;
    unit?: string;
    quantity?: number;
    unitPrice?: number;
    totalAmount?: number;
    category?: string;
    subCategory1?: string;
    subCategory2?: string;
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
  const [sendEmail, setSendEmail] = useState(false);

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
      // 엑셀 컬럼 순서: 거래처명(0), 현장명(1), 발주일(2), 납기일(3), 발주번호(4), 
      // 품목(5), 규격(6), 수량(7), 단위(8), 단가(9), 공급가액(10), 부가세(11), 합계(12),
      // 대분류(13), 중분류(14), 소분류(15), 비고(16)
      const orders: ParsedOrderData[] = dataRows
        .filter(row => row && row.some(cell => cell)) // 빈 행 제거
        .map((row, index) => ({
          rowIndex: index + 2, // 엑셀 행 번호 (1-based, 헤더 제외)
          vendorName: row[0]?.toString().trim(),    // 거래처명
          projectName: row[1]?.toString().trim(),   // 현장명
          orderDate: row[2]?.toString().trim(),      // 발주일
          deliveryDate: row[3]?.toString().trim(),   // 납기일
          orderNumber: row[4]?.toString().trim(),    // 발주번호
          vendorEmail: undefined, // 엑셀에 이메일 컬럼 없음 - 나중에 거래처 마스터에서 조회
          items: [{
            itemName: row[5]?.toString().trim(),     // 품목
            specification: row[6]?.toString().trim(), // 규격
            quantity: parseFloat(row[7]) || 0,       // 수량
            unit: row[8]?.toString().trim(),         // 단위
            unitPrice: parseFloat(row[9]) || 0,      // 단가
            totalAmount: parseFloat(row[10]) || 0,   // 공급가액
            category: row[13]?.toString().trim(),    // 대분류
            subCategory1: row[14]?.toString().trim(), // 중분류
            subCategory2: row[15]?.toString().trim(), // 소분류
            remarks: row[16]?.toString().trim()      // 비고
          }],
          notes: row[16]?.toString().trim(),         // 비고를 notes에도 저장
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

  const handleRemoveOrder = (index: number, isSilent: boolean = false) => {
    const newOrders = editedOrders.filter((_, i) => i !== index);
    setEditedOrders(newOrders);
    // isSilent가 true면 임시저장 등으로 인한 제거이므로 메시지를 표시하지 않음
    if (!isSilent) {
      toast({
        title: "항목 제거",
        description: "선택한 항목이 목록에서 제거되었습니다.",
      });
    }
  };

  // 일괄 저장 Mutation
  const saveBulkOrders = useMutation({
    mutationFn: async (orders: ParsedOrderData[]) => {
      console.log('🚀 CLIENT: Starting saveBulkOrders mutation');
      console.log('📝 CLIENT: Orders to save:', orders.length);
      console.log('📁 CLIENT: File object:', file ? { name: file.name, size: file.size, type: file.type } : null);
      
      const formData = new FormData();
      
      // 원본 엑셀 파일 첨부
      if (file) {
        console.log('📁 CLIENT: Appending file to FormData:', file.name);
        formData.append('excelFile', file);
      } else {
        console.log('⚠️ CLIENT: No file to append');
      }
      
      // 발주서 데이터를 안전하게 직렬화 (순환 참조 방지)
      try {
        const cleanOrders = orders.map(order => ({
          ...order,
          // 함수나 undefined 값들 제거
          items: order.items?.map(item => ({
            itemName: item.itemName || '',
            specification: item.specification || '',
            unit: item.unit || '',
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            totalAmount: Number(item.totalAmount) || 0,
            remarks: item.remarks || ''
          })) || []
        }));
        
        console.log('🔍 CLIENT: Serializing orders data:', cleanOrders.length, 'orders');
        const serializedOrders = JSON.stringify(cleanOrders);
        console.log('✅ CLIENT: Orders serialization successful, length:', serializedOrders.length);
        console.log('📦 CLIENT: Sample serialized data (first 200 chars):', serializedOrders.substring(0, 200));
        
        formData.append('orders', serializedOrders);
      } catch (serializationError) {
        console.error('❌ CLIENT: Orders serialization failed:', serializationError);
        console.error('❌ CLIENT: Original orders data:', orders);
        throw new Error('Failed to serialize orders data');
      }
      
      formData.append('sendEmail', String(sendEmail)); // 이메일 발송 플래그 추가
      formData.append('isDraft', 'true'); // 임시저장 플래그 추가
      
      // FormData 내용 확인
      console.log('📦 CLIENT: FormData entries:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${typeof value} (length: ${String(value).length})`);
        }
      }
      
      console.log('🌐 CLIENT: Sending request to /api/orders/bulk-create-simple');
      const response = await fetch('/api/orders/bulk-create-simple', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      console.log('📨 CLIENT: Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.text();
        console.error('❌ CLIENT: Request failed:', error);
        throw new Error(error || 'Failed to save orders');
      }
      
      const result = await response.json();
      console.log('✅ CLIENT: Request successful:', result);
      return result;
    },
    onSuccess: (data) => {
      const emailMsg = data.emailsSent > 0 
        ? ` (${data.emailsSent}개 이메일 발송 완료)` 
        : '';
      toast({
        title: "저장 완료",
        description: `${data.savedCount}개의 발주서가 성공적으로 저장되었습니다${emailMsg}.`,
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
              {/* 직접승인 안내 메시지 */}
              <Alert className="mb-6 border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  <strong>직접승인 처리 안내</strong>
                  <div className="mt-2 space-y-1">
                    <p>• 엑셀 업로드로 생성되는 모든 발주서는 <strong>직접승인</strong> 방식으로 처리됩니다.</p>
                    <p>• 별도의 승인 절차 없이 바로 발주서가 생성되며, 즉시 발송 가능한 상태가 됩니다.</p>
                    <p>• 대량 발주 처리를 위해 승인 단계를 생략하고 신속하게 처리됩니다.</p>
                  </div>
                </AlertDescription>
              </Alert>
              
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
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50">
                    <input
                      type="checkbox"
                      id="sendEmail"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="sendEmail" className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                      <Mail className="h-4 w-4" />
                      이메일 발송
                    </label>
                  </div>
                  
                  <Button
                    onClick={handleSaveAll}
                    disabled={saveBulkOrders.isPending}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {sendEmail ? (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {saveBulkOrders.isPending ? '저장 및 발송 중...' : '저장 및 발송'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {saveBulkOrders.isPending ? '저장 중...' : '저장'}
                      </>
                    )}
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