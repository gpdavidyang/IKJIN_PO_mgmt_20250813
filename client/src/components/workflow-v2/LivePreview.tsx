import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Eye,
  Plus,
  X,
  Download,
  Upload,
  Paperclip,
  Trash2
} from 'lucide-react';

interface LivePreviewProps {
  orderData: any;
  pdfUrl: string | null;
  processingStatus: {
    pdf: 'idle' | 'processing' | 'completed' | 'error';
    vendor: 'idle' | 'processing' | 'completed' | 'error';
    email: 'idle' | 'processing' | 'completed' | 'error';
  };
}

interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  file?: File;
  isDefault: boolean;
  isSelected: boolean;
}

const LivePreview: React.FC<LivePreviewProps> = ({ orderData, pdfUrl, processingStatus }) => {
  const [emailRecipients, setEmailRecipients] = useState<string[]>([orderData.vendorEmail || '']);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState(`발주서 - ${orderData.orderNumber || ''}`);
  const [activeTab, setActiveTab] = useState('info'); // 기본 탭을 '발주서 정보'로 변경
  const [pdfLoadError, setPdfLoadError] = useState(false);
  
  // 첨부파일 상태
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  
  // 이메일 본문 상태 추가
  const [emailBody, setEmailBody] = useState(() => {
    return `안녕하세요,

${orderData.vendorName || '거래처'} 담당자님

발주서를 첨부하여 보내드립니다.

발주번호: ${orderData.orderNumber || '-'}
프로젝트: ${orderData.projectName || '-'}
납기일: ${orderData.deliveryDate ? new Date(orderData.deliveryDate).toLocaleDateString('ko-KR') : '-'}

확인 후 회신 부탁드립니다.

감사합니다.`;
  });

  // orderData가 변경될 때 이메일 본문 업데이트
  useEffect(() => {
    setEmailBody(`안녕하세요,

${orderData.vendorName || '거래처'} 담당자님

발주서를 첨부하여 보내드립니다.

발주번호: ${orderData.orderNumber || '-'}
프로젝트: ${orderData.projectName || '-'}
납기일: ${orderData.deliveryDate ? new Date(orderData.deliveryDate).toLocaleDateString('ko-KR') : '-'}

확인 후 회신 부탁드립니다.

감사합니다.`);
  }, [orderData.vendorName, orderData.orderNumber, orderData.projectName, orderData.deliveryDate]);

  // 기본 첨부파일들 설정 (PDF와 처리된 Excel 파일)
  useEffect(() => {
    const defaultAttachments: AttachmentFile[] = [];
    
    // 처리된 Excel 파일 (Input 시트 제거된 파일)
    if (orderData.processedExcelUrl) {
      defaultAttachments.push({
        id: 'processed-excel',
        name: orderData.originalFileName || '처리된_Excel_파일.xlsx',
        size: 0, // 실제 크기는 서버에서 가져와야 함
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        url: orderData.processedExcelUrl,
        isDefault: true,
        isSelected: true
      });
    }
    
    // PDF 파일
    if (pdfUrl && processingStatus.pdf === 'completed') {
      defaultAttachments.push({
        id: 'generated-pdf',
        name: `발주서_${orderData.orderNumber || 'generated'}.pdf`,
        size: 0, // 실제 크기는 서버에서 가져와야 함
        type: 'application/pdf',
        url: pdfUrl,
        isDefault: true,
        isSelected: true
      });
    }
    
    setAttachments(prev => {
      // 기존 기본 파일들 제거하고 새로 추가
      const customFiles = prev.filter(f => !f.isDefault);
      return [...defaultAttachments, ...customFiles];
    });
  }, [orderData.processedExcelUrl, pdfUrl, processingStatus.pdf, orderData.orderNumber]);

  const addRecipient = (type: 'to' | 'cc') => {
    if (type === 'to') {
      setEmailRecipients([...emailRecipients, '']);
    } else {
      setCcRecipients([...ccRecipients, '']);
    }
  };

  const removeRecipient = (type: 'to' | 'cc', index: number) => {
    if (type === 'to' && emailRecipients.length > 1) {
      setEmailRecipients(emailRecipients.filter((_, i) => i !== index));
    } else if (type === 'cc') {
      setCcRecipients(ccRecipients.filter((_, i) => i !== index));
    }
  };

  const updateRecipient = (type: 'to' | 'cc', index: number, value: string) => {
    if (type === 'to') {
      const newRecipients = [...emailRecipients];
      newRecipients[index] = value;
      setEmailRecipients(newRecipients);
    } else {
      const newRecipients = [...ccRecipients];
      newRecipients[index] = value;
      setCcRecipients(newRecipients);
    }
  };

  // 첨부파일 관리 함수들
  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const fileId = `custom-${Date.now()}-${Math.random()}`;
      setUploadingFiles(prev => [...prev, fileId]);
      
      try {
        // 파일 업로드 (실제 구현 시 서버 API 호출)
        const newAttachment: AttachmentFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
          isDefault: false,
          isSelected: true
        };
        
        setAttachments(prev => [...prev, newAttachment]);
      } catch (error) {
        console.error('파일 업로드 실패:', error);
      } finally {
        setUploadingFiles(prev => prev.filter(id => id !== fileId));
      }
    }
  };

  const toggleAttachmentSelection = (attachmentId: string) => {
    setAttachments(prev =>
      prev.map(att =>
        att.id === attachmentId
          ? { ...att, isSelected: !att.isSelected }
          : att
      )
    );
  };

  const removeCustomAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-600" />;
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileText className="w-4 h-4 text-green-600" />;
    return <Paperclip className="w-4 h-4 text-gray-600" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>실시간 미리보기</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={processingStatus.pdf === 'completed' ? 'success' : 'secondary'}>
              {getStatusIcon(processingStatus.pdf)}
              <span className="ml-1">PDF</span>
            </Badge>
            <Badge variant={processingStatus.vendor === 'completed' ? 'success' : 'secondary'}>
              {getStatusIcon(processingStatus.vendor)}
              <span className="ml-1">거래처</span>
            </Badge>
            <Badge variant={processingStatus.email === 'completed' ? 'success' : 'secondary'}>
              {getStatusIcon(processingStatus.email)}
              <span className="ml-1">이메일</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="h-[calc(100%-5rem)]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">
              <Eye className="w-4 h-4 mr-2" />
              발주서 정보
            </TabsTrigger>
            <TabsTrigger value="pdf">
              <FileText className="w-4 h-4 mr-2" />
              PDF 미리보기
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              이메일 설정
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pdf" className="h-[calc(100%-3rem)]">
            {processingStatus.pdf === 'processing' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
                  <p className="text-sm text-gray-600">PDF를 생성하고 있습니다...</p>
                </div>
              </div>
            ) : processingStatus.pdf === 'error' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <AlertCircle className="w-12 h-12 mx-auto text-red-600" />
                  <p className="text-sm text-red-600">PDF 생성 실패</p>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    다시 시도
                  </Button>
                </div>
              </div>
            ) : pdfUrl && processingStatus.pdf === 'completed' ? (
              <div className="w-full h-full flex flex-col">
                {/* PDF Preview Status */}
                <div className="flex-1 bg-gray-50 rounded-lg p-8 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
                    <h3 className="text-lg font-medium">PDF가 생성되었습니다</h3>
                    <p className="text-sm text-gray-600">
                      아래 버튼을 클릭하여 PDF를 확인하세요
                    </p>
                    
                    {/* Action buttons */}
                    <div className="flex items-center justify-center gap-3 mt-6">
                      <Button
                        variant="default"
                        onClick={() => window.open(pdfUrl, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        PDF 미리보기
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(`${pdfUrl}?download=true`, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF 다운로드
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <FileText className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">
                    발주서 정보가 완성되면 PDF가 자동으로 생성됩니다
                  </p>
                  <p className="text-xs text-gray-500">
                    먼저 '발주서 정보' 탭에서 내용을 확인해주세요
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-600">발주번호</Label>
                <p className="font-medium">{orderData.orderNumber || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">발주일</Label>
                <p className="font-medium">
                  {orderData.orderDate ? new Date(orderData.orderDate).toLocaleDateString('ko-KR') : '-'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">프로젝트</Label>
                <p className="font-medium">{orderData.projectName || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">거래처</Label>
                <p className="font-medium">{orderData.vendorName || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">납기일</Label>
                <p className="font-medium">
                  {orderData.deliveryDate ? new Date(orderData.deliveryDate).toLocaleDateString('ko-KR') : '-'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">총액</Label>
                <p className="font-medium text-lg text-blue-600">
                  {orderData.totalAmount ? `${Math.floor(orderData.totalAmount).toLocaleString()}원` : '-'}
                </p>
              </div>
            </div>
            
            {orderData.items && orderData.items.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">품목 목록</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">품목명</th>
                        <th className="text-right p-2">수량</th>
                        <th className="text-right p-2">단가</th>
                        <th className="text-right p-2">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderData.items.map((item: any, index: number) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{item.itemName || item.name}</td>
                          <td className="text-right p-2">{Math.floor(item.quantity || 0).toLocaleString()}</td>
                          <td className="text-right p-2">{Math.floor(item.unitPrice || 0).toLocaleString()}원</td>
                          <td className="text-right p-2">{Math.floor((item.totalAmount || (item.quantity * item.unitPrice)) || 0).toLocaleString()}원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="email" className="space-y-4">
            <div className="space-y-4">
              {/* 받는 사람 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>받는 사람</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addRecipient('to')}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {emailRecipients.map((email, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => updateRecipient('to', index, e.target.value)}
                      placeholder="email@example.com"
                    />
                    {emailRecipients.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecipient('to', index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              {/* 참조 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>참조 (CC)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addRecipient('cc')}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {ccRecipients.map((email, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => updateRecipient('cc', index, e.target.value)}
                      placeholder="cc@example.com"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecipient('cc', index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* 제목 */}
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="이메일 제목"
                />
              </div>
              
              {/* 메일 본문 */}
              <div className="space-y-2">
                <Label>메일 본문</Label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="이메일 본문을 입력하세요"
                  className="min-h-[200px] font-mono text-sm"
                  rows={10}
                />
              </div>

              {/* 첨부파일 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>첨부파일</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = '.pdf,.xlsx,.xls,.doc,.docx,.txt';
                      input.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files && target.files.length > 0) {
                          handleFileUpload(target.files);
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    파일 추가
                  </Button>
                </div>

                {/* 첨부파일 목록 */}
                <div className="space-y-3">
                  {attachments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      첨부할 파일이 없습니다
                    </p>
                  ) : (
                    attachments.map((attachment) => (
                      <div 
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
                      >
                        <Checkbox
                          checked={attachment.isSelected}
                          onCheckedChange={() => toggleAttachmentSelection(attachment.id)}
                        />
                        
                        <div className="flex items-center gap-2 flex-1">
                          {getFileIcon(attachment.type)}
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {attachment.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{formatFileSize(attachment.size)}</span>
                              {attachment.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  기본파일
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 업로드 진행 상태 */}
                        {uploadingFiles.includes(attachment.id) && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        )}

                        {/* 커스텀 파일 삭제 버튼 */}
                        {!attachment.isDefault && !uploadingFiles.includes(attachment.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomAttachment(attachment.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* 선택된 첨부파일 요약 */}
                {attachments.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      선택된 파일: {attachments.filter(f => f.isSelected).length}/{attachments.length}개
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LivePreview;