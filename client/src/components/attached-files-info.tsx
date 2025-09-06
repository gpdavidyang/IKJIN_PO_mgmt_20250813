import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileSpreadsheet, 
  Download, 
  Eye, 
  Calendar,
  User,
  FileText,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ui/theme-provider";

interface AttachedFilesInfoProps {
  attachments: Array<{
    id: number;
    originalName: string;
    storedName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string;
    uploadedAt: string;
  }>;
  orderId: number;
}

export function AttachedFilesInfo({ attachments, orderId }: AttachedFilesInfoProps) {
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [downloading, setDownloading] = useState<number | null>(null);

  console.log('🔍 AttachedFilesInfo - COMPONENT CALLED!', { attachments, orderId });
  console.log('🔍 AttachedFilesInfo - received attachments:', attachments);
  
  // Get all attachments including Excel, PDF, and other files
  const attachedFiles = attachments.map(attachment => {
    const mimeType = attachment.mimeType?.toLowerCase() || '';
    const fileName = attachment.originalName?.toLowerCase() || '';
    
    // Determine file type and icon
    let fileType = 'other';
    let icon = FileText;
    
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || 
        fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlsm')) {
      fileType = 'excel';
      icon = FileSpreadsheet;
    } else if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
      fileType = 'pdf';
      icon = FileText;
    }
    
    console.log('🔍 Processing attachment:', {
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      fileName,
      fileType
    });
    
    return {
      ...attachment,
      fileType,
      icon
    };
  });

  console.log('📊 AttachedFilesInfo - attached files:', attachedFiles);

  // If no attached files found, don't render the component
  if (attachedFiles.length === 0) {
    console.log('⚠️ AttachedFilesInfo - No attached files found, component will not render');
    return null;
  }
  
  console.log('✅ AttachedFilesInfo - Rendering component with', attachedFiles.length, 'attached files');

  const handleDownload = async (attachment: any) => {
    setDownloading(attachment.id);
    try {
      // Get token from localStorage or cookie
      const token = localStorage.getItem('token') || document.cookie.match(/auth_token=([^;]+)/)?.[1];
      
      const response = await fetch(`/api/attachments/${attachment.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        throw new Error('파일 다운로드에 실패했습니다');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "다운로드 완료",
        description: `${attachment.originalName} 파일이 다운로드되었습니다.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "다운로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className={`p-6 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
              <FileSpreadsheet className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>첨부 된 파일</h3>
              <span className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                발주서와 관련된 첨부 파일 ({attachedFiles.length}개)
              </span>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`transition-colors ${
              isDarkMode 
                ? 'border-blue-600 text-blue-400' 
                : 'border-blue-200 text-blue-700 bg-blue-50'
            }`}
          >
            <FileText className="h-3 w-3 mr-1" />
            첨부파일
          </Badge>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {attachedFiles.map((file) => (
          <div 
            key={file.id} 
            className={`border rounded-lg p-4 transition-all hover:shadow-md ${
              isDarkMode 
                ? 'border-gray-600 hover:border-gray-500 bg-gray-750' 
                : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`p-2 rounded-lg transition-colors ${
                  file.fileType === 'excel' ? 
                    (isDarkMode ? 'bg-green-900/30' : 'bg-green-100') :
                    file.fileType === 'pdf' ?
                    (isDarkMode ? 'bg-red-900/30' : 'bg-red-100') :
                    (isDarkMode ? 'bg-gray-900/30' : 'bg-gray-100')
                }`}>
                  <file.icon className={`h-5 w-5 transition-colors ${
                    file.fileType === 'excel' ?
                    (isDarkMode ? 'text-green-400' : 'text-green-600') :
                    file.fileType === 'pdf' ?
                    (isDarkMode ? 'text-red-400' : 'text-red-600') :
                    (isDarkMode ? 'text-gray-400' : 'text-gray-600')
                  }`} />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium text-sm truncate transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-900'
                    }`} title={file.originalName}>
                      {file.originalName}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {file.fileType === 'excel' ? 'Excel' : file.fileType === 'pdf' ? 'PDF' : '파일'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <FileText className={`h-3 w-3 transition-colors ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                      <span className={`transition-colors ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {formatFileSize(file.fileSize)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <User className={`h-3 w-3 transition-colors ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                      <span className={`transition-colors ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {file.uploadedBy || '알 수 없음'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className={`h-3 w-3 transition-colors ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                      <span className={`transition-colors ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {format(new Date(file.uploadedAt), 'yyyy.MM.dd HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownload(file)}
                  disabled={downloading === file.id}
                  className={`h-8 px-3 text-xs transition-colors ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-green-500 hover:text-green-400' 
                      : 'border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-300 hover:text-green-700'
                  }`}
                >
                  {downloading === file.id ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                      다운로드 중...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-1" />
                      다운로드
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* 안내 메시지 */}
        <div className={`mt-4 p-3 rounded-lg border border-dashed transition-colors ${
          isDarkMode 
            ? 'border-gray-600 bg-gray-750' 
            : 'border-gray-300 bg-gray-50'
        }`}>
          <div className="flex items-start gap-2">
            <Info className={`h-4 w-4 mt-0.5 flex-shrink-0 transition-colors ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`} />
            <div className="text-xs space-y-1">
              <p className={`font-medium transition-colors ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                첨부 파일 정보
              </p>
              <p className={`transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                이 섹션에는 발주서와 관련된 모든 첨부 파일이 표시됩니다. 
                Excel 파일, PDF 문서 등 다양한 형태의 파일을 다운로드하여 사용할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}