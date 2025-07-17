import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VendorValidationModal } from "./vendor-validation-modal";

interface ExcelRow {
  orderDate: string;
  deliveryDate: string;
  vendorName: string;
  vendorEmail: string;
  deliveryName: string;
  deliveryEmail: string;
  projectName: string;
  itemName: string;
  specification: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes: string;
}

interface VendorValidationData {
  vendorValidations: any[];
  deliveryValidations: any[];
  emailConflicts: any[];
  summary: {
    totalVendors: number;
    totalDeliveries: number;
    unregisteredVendors: number;
    unregisteredDeliveries: number;
    emailConflicts: number;
    needsAction: boolean;
  };
}

interface ExcelUploadWithValidationProps {
  onDataConfirmed: (data: ExcelRow[]) => void;
}

export function ExcelUploadWithValidation({ onDataConfirmed }: ExcelUploadWithValidationProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsed' | 'validated' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [parsedData, setParsedData] = useState<ExcelRow[]>([]);
  const [validationData, setValidationData] = useState<VendorValidationData | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    setUploadStatus('idle');
    setStatusMessage('');

    try {
      // 1단계: 엑셀 파일 파싱
      const formData = new FormData();
      formData.append('excel', file);

      const parseResponse = await fetch('/api/excel-automation/parse-input-sheet', {
        method: 'POST',
        body: formData,
      });

      if (!parseResponse.ok) {
        throw new Error('파일 파싱에 실패했습니다.');
      }

      const parseResult = await parseResponse.json();
      
      if (!parseResult.success) {
        throw new Error(parseResult.error || '파일 파싱에 실패했습니다.');
      }

      const rows = parseResult.data.rows as ExcelRow[];
      setParsedData(rows);
      setUploadStatus('parsed');
      setStatusMessage(`${rows.length}개의 행을 파싱했습니다. 거래처 검증을 진행합니다...`);

      // 2단계: 거래처/납품처 검증
      const vendorData = rows.map(row => ({
        vendorName: row.vendorName,
        deliveryName: row.deliveryName,
        email: row.vendorEmail,
      }));

      const validateResponse = await fetch('/api/excel-automation/validate-vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vendorData }),
      });

      if (!validateResponse.ok) {
        throw new Error('거래처 검증에 실패했습니다.');
      }

      const validateResult = await validateResponse.json();
      
      if (!validateResult.success) {
        throw new Error(validateResult.error || '거래처 검증에 실패했습니다.');
      }

      const validation = validateResult.data as VendorValidationData;
      setValidationData(validation);
      setUploadStatus('validated');

      if (validation.summary.needsAction) {
        setStatusMessage(`거래처 검증 완료. ${validation.summary.unregisteredVendors + validation.summary.unregisteredDeliveries}개의 미등록 업체가 발견되었습니다.`);
        setShowValidationModal(true);
      } else {
        setStatusMessage('모든 거래처가 확인되었습니다. 데이터를 사용할 수 있습니다.');
        onDataConfirmed(rows);
      }

    } catch (error) {
      setUploadStatus('error');
      setStatusMessage(error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
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

  const handleValidationConfirm = async (resolvedVendors: any[]) => {
    try {
      setIsProcessing(true);
      setStatusMessage('신규 업체를 등록하고 데이터를 처리하는 중...');

      // 신규 업체 등록
      for (const resolved of resolvedVendors) {
        if (resolved.action === 'create_new' && resolved.newVendorData) {
          const createResponse = await fetch('/api/vendors', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...resolved.newVendorData,
              type: resolved.type,
            }),
          });

          if (!createResponse.ok) {
            console.error(`Failed to create vendor: ${resolved.newVendorData.name}`);
          }
        }
      }

      setStatusMessage('처리가 완료되었습니다.');
      onDataConfirmed(parsedData);
      setShowValidationModal(false);

    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '업체 등록 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const proceedWithoutValidation = () => {
    onDataConfirmed(parsedData);
    setShowValidationModal(false);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel 발주서 업로드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center border-gray-300 hover:border-gray-400">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              
              <div className="space-y-2">
                <p className="font-medium text-gray-700">
                  Excel 발주서 파일을 업로드하여 자동 처리
                </p>
                <p className="text-sm text-gray-500">
                  .xlsx, .xls 파일을 지원합니다. Input 시트의 A:M 열 데이터를 자동으로 파싱합니다.
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

            {/* 진행 상태 표시 */}
            {uploadStatus !== 'idle' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>진행 상태</span>
                  <span>
                    {uploadStatus === 'parsed' && '1/2 파싱 완료'}
                    {uploadStatus === 'validated' && '2/2 검증 완료'}
                    {uploadStatus === 'error' && '오류 발생'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      uploadStatus === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ 
                      width: uploadStatus === 'parsed' ? '50%' : 
                             uploadStatus === 'validated' ? '100%' : 
                             uploadStatus === 'error' ? '100%' : '0%' 
                    }}
                  />
                </div>
              </div>
            )}

            {uploadStatus === 'validated' && validationData && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>{statusMessage}</div>
                    {validationData.summary.needsAction && (
                      <div className="flex space-x-2 mt-2">
                        <Button 
                          size="sm" 
                          onClick={() => setShowValidationModal(true)}
                          className="flex items-center gap-1"
                        >
                          <Search className="h-3 w-3" />
                          업체 검증 및 등록
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={proceedWithoutValidation}
                        >
                          검증 없이 진행
                        </Button>
                      </div>
                    )}
                  </div>
                </AlertDescription>
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
                <strong>업로드 프로세스:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Excel 파일의 Input 시트에서 발주 데이터를 파싱합니다</li>
                  <li>거래처명과 납품처명이 시스템에 등록되어 있는지 확인합니다</li>
                  <li>미등록 업체는 유사 업체 추천 또는 신규 등록을 진행합니다</li>
                  <li>검증 완료 후 발주서 데이터를 시스템에 등록합니다</li>
                </ol>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* 거래처 검증 모달 */}
      {showValidationModal && validationData && (
        <VendorValidationModal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          validationData={validationData}
          onConfirm={handleValidationConfirm}
        />
      )}
    </>
  );
}