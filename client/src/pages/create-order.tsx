import { useState } from "react";
import { useLocation } from "wouter";
import { OrderForm } from "@/components/order-form";
import { SimpleExcelUpload } from "@/components/simple-excel-upload";
import { FileText, FileSpreadsheet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default function CreateOrder() {
  const [, navigate] = useLocation();
  const [excelData, setExcelData] = useState<any[]>([]);
  
  // Feature flag check for Excel upload
  const isExcelUploadEnabled = isFeatureEnabled('EXCEL_UPLOAD');

  const handleSuccess = () => {
    navigate("/orders");
  };

  const handleCancel = () => {
    navigate("/orders");
  };

  const handleExcelDataParsed = (data: any[]) => {
    setExcelData(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">발주서 작성</h1>
              <p className="text-sm text-gray-600 mt-1">
                새로운 발주서를 작성하거나 Excel 파일을 업로드해주세요
              </p>
            </div>
          </div>
        </div>
        {isExcelUploadEnabled ? (
          <Tabs defaultValue="form" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                일반 폼 작성
              </TabsTrigger>
              <TabsTrigger value="excel" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel 업로드 (베타)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="mt-6">
              <OrderForm onSuccess={handleSuccess} onCancel={handleCancel} />
            </TabsContent>

            <TabsContent value="excel" className="mt-6">
            <div className="space-y-6">
              <SimpleExcelUpload onDataParsed={handleExcelDataParsed} />
              
              {excelData.length > 0 && (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Excel 데이터를 불러왔습니다. "일반 폼 작성" 탭으로 이동하여 발주서를 완성해주세요.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">미리보기 ({excelData.length}개 행)</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <tbody>
                          {excelData.slice(0, 5).map((row, index) => (
                            <tr key={index} className="border-b border-gray-100">
                              {row.slice(0, 6).map((cell: any, cellIndex: number) => (
                                <td key={cellIndex} className="py-2 px-3">
                                  {cell || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {excelData.length > 5 && (
                            <tr>
                              <td colSpan={6} className="py-2 px-3 text-center text-gray-500">
                                ... 외 {excelData.length - 5}개 행
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        ) : (
          // Production mode: Only show standard form
          <OrderForm onSuccess={handleSuccess} onCancel={handleCancel} />
        )}
      </div>
    </div>
  );
}
