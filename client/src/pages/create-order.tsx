import { useLocation } from "wouter";
import { OrderForm } from "@/components/order-form";
import { SimpleExcelBulkUpload } from "@/components/simple-excel-bulk-upload";
import { FileText, Upload, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { useTheme } from "@/components/ui/theme-provider";

export default function CreateOrder() {
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Feature flag check for Excel upload
  const isExcelUploadEnabled = isFeatureEnabled('EXCEL_UPLOAD');
  
  // Debug info for environment variables
  console.log('🔍 Create Order Debug Info:', {
    isExcelUploadEnabled,
    VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
    VITE_ENABLE_EXCEL_UPLOAD: import.meta.env.VITE_ENABLE_EXCEL_UPLOAD,
    NODE_ENV: import.meta.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });

  const handleSuccess = () => {
    navigate("/orders");
  };

  const handleCancel = () => {
    navigate("/orders");
  };


  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1366px] mx-auto p-6 space-y-6 pb-20">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <h1 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>발주서 작성</h1>
              <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                새로운 발주서를 작성하거나 Excel 파일을 업로드해주세요
              </p>
            </div>
          </div>
        </div>

        {/* 사용팁 및 템플릿 다운로드 */}
        {isExcelUploadEnabled && (
          <Alert className={`mb-6 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <Info className={`h-4 w-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <AlertDescription className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              <div className="space-y-2">
                <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>📋 사용팁</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className={`font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Excel 업로드:</span> 대량 발주서, 템플릿 기반 입력에 적합 (10-50건 권장)
                  </div>
                  <div>
                    <span className={`font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>직접 입력:</span> 소량 발주서, 세밀한 조정, 즉시 처리에 적합 (10건 이하 권장)
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {isExcelUploadEnabled ? (
          <Tabs defaultValue="form" className="w-full">
            <TabsList className={`grid w-full grid-cols-2 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100'}`}>
              <TabsTrigger 
                value="form" 
                className={`flex items-center gap-2 transition-colors ${
                  isDarkMode 
                    ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white hover:bg-gray-750' 
                    : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                직접 입력
              </TabsTrigger>
              <TabsTrigger 
                value="simple" 
                className={`flex items-center gap-2 transition-colors ${
                  isDarkMode 
                    ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white hover:bg-gray-750' 
                    : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
                }`}
              >
                <Upload className="h-4 w-4" />
                엑셀 업로드 입력
              </TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="mt-6">
              <OrderForm onSuccess={handleSuccess} onCancel={handleCancel} />
            </TabsContent>

            <TabsContent value="simple" className="mt-6">
              <SimpleExcelBulkUpload />
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
