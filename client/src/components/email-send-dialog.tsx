import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, X, Check, AlertTriangle, FileText, File, Loader2, Info, Upload, Paperclip, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AttachmentInfo {
  id: number;
  originalName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  isSelected?: boolean;
  isCustom?: boolean; // 사용자가 업로드한 파일인지 표시
  file?: File; // 실제 File 객체 (사용자 업로드 파일용)
}

interface EmailSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: {
    orderNumber: string;
    vendorName: string;
    vendorEmail?: string;
    orderDate: string;
    totalAmount: number;
    siteName?: string;
    orderId?: number; // Added to fetch attachments
  };
  onSendEmail: (emailData: EmailData) => Promise<void>;
  attachments?: AttachmentInfo[]; // Optional: pass attachments directly to avoid API call
}

interface EmailData {
  to: string[];
  cc?: string[];
  subject: string;
  message?: string;
  selectedAttachmentIds: number[];
  customFiles?: File[]; // 사용자가 업로드한 파일들
}

export function EmailSendDialog({ open, onOpenChange, orderData, onSendEmail, attachments: providedAttachments }: EmailSendDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 기본 메시지 템플릿
  const defaultMessage = `안녕하세요.

${orderData.vendorName} 담당자님께 발주서를 전송드립니다.

■ 발주 정보
- 발주번호: ${orderData.orderNumber}
- 발주일자: ${orderData.orderDate}
- 현장명: ${orderData.siteName || 'N/A'}
- 발주금액: ${orderData.totalAmount.toLocaleString()}원

첨부된 발주서를 확인하시고, 납기일정에 맞춰 진행 부탁드립니다.

감사합니다.`;
  
  const [emailData, setEmailData] = useState<EmailData>({
    to: orderData.vendorEmail ? [orderData.vendorEmail] : [''],
    cc: [],
    subject: `발주서 전송 - ${orderData.orderNumber}`,
    message: defaultMessage, // 기본 메시지로 초기화
    selectedAttachmentIds: [],
    customFiles: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newCcEmail, setNewCcEmail] = useState('');
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [customAttachments, setCustomAttachments] = useState<AttachmentInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Use provided attachments or fetch them when dialog opens
  useEffect(() => {
    if (open) {
      if (providedAttachments) {
        // Use provided attachments directly
        console.log('📎 Using provided attachments:', providedAttachments.length);
        setAttachments(providedAttachments.map(att => ({ ...att, isSelected: false })));
      } else if (orderData.orderId) {
        // Fallback: fetch attachments from API
        console.log('📎 No provided attachments, fetching from API for order:', orderData.orderId);
        fetchAttachments();
      }
    }
  }, [open, orderData.orderId, providedAttachments]);

  const fetchAttachments = async () => {
    if (!orderData.orderId) return;
    
    setAttachmentsLoading(true);
    try {
      console.log('📎 Fetching attachments for order:', orderData.orderId);
      const response = await apiRequest("GET", `/api/orders/${orderData.orderId}/attachments`);
      
      if (Array.isArray(response)) {
        const attachmentInfos: AttachmentInfo[] = response.map((att: any) => ({
          id: att.id,
          originalName: att.originalName,
          filePath: att.filePath,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          isSelected: false
        }));
        
        setAttachments(attachmentInfos);
        
        // Auto-select all PDF and Excel files by default
        const autoSelectIds = attachmentInfos
          .filter(att => 
            att.mimeType?.includes('pdf') || 
            att.originalName?.toLowerCase().endsWith('.pdf') ||
            att.mimeType?.includes('excel') || 
            att.mimeType?.includes('spreadsheet') ||
            att.originalName?.toLowerCase().endsWith('.xlsx') ||
            att.originalName?.toLowerCase().endsWith('.xls')
          )
          .map(att => att.id);
          
        setEmailData(prev => ({
          ...prev,
          selectedAttachmentIds: autoSelectIds
        }));
        
        console.log('📎 Loaded attachments:', { 
          total: attachmentInfos.length, 
          autoSelected: autoSelectIds.length 
        });
      } else {
        setAttachments([]);
        console.log('📎 No attachments found for order:', orderData.orderId);
      }
    } catch (error) {
      console.error('❌ Failed to fetch attachments:', error);
      toast({
        title: "첨부파일 조회 실패",
        description: "첨부파일 정보를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setAttachmentsLoading(false);
    }
  };

  // 이메일 유효성 검사
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // TO 이메일 추가
  const addToEmail = () => {
    if (newEmail && isValidEmail(newEmail)) {
      if (!emailData.to.includes(newEmail)) {
        setEmailData(prev => ({
          ...prev,
          to: [...prev.to.filter(email => email !== ''), newEmail]
        }));
        setNewEmail('');
        setErrors(prev => prev.filter(err => !err.includes('수신자')));
      }
    } else {
      setErrors(prev => [...prev, '올바른 이메일 주소를 입력하세요.']);
    }
  };

  // CC 이메일 추가
  const addCcEmail = () => {
    if (newCcEmail && isValidEmail(newCcEmail)) {
      if (!emailData.cc?.includes(newCcEmail)) {
        setEmailData(prev => ({
          ...prev,
          cc: [...(prev.cc || []), newCcEmail]
        }));
        setNewCcEmail('');
      }
    }
  };

  // 이메일 제거
  const removeEmail = (email: string, type: 'to' | 'cc') => {
    setEmailData(prev => ({
      ...prev,
      [type]: prev[type]?.filter(e => e !== email) || []
    }));
  };

  // 첨부파일 선택/해제
  const toggleAttachment = (attachmentId: number) => {
    setEmailData(prev => {
      const currentSelected = prev.selectedAttachmentIds;
      const isSelected = currentSelected.includes(attachmentId);
      
      const newSelected = isSelected 
        ? currentSelected.filter(id => id !== attachmentId)
        : [...currentSelected, attachmentId];
        
      return {
        ...prev,
        selectedAttachmentIds: newSelected
      };
    });
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
  };

  // 파일 타입 아이콘 결정
  const getFileIcon = (mimeType?: string, fileName?: string) => {
    if (mimeType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet') || 
        fileName?.toLowerCase().endsWith('.xlsx') || fileName?.toLowerCase().endsWith('.xls')) {
      return <File className="h-4 w-4 text-green-600" />;
    }
    if (mimeType?.includes('image')) {
      return <File className="h-4 w-4 text-purple-500" />;
    }
    if (mimeType?.includes('word') || fileName?.toLowerCase().endsWith('.docx') || fileName?.toLowerCase().endsWith('.doc')) {
      return <File className="h-4 w-4 text-blue-500" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  // 파일 처리 공통 함수
  const processFiles = (files: FileList | File[]) => {
    const newCustomAttachments: AttachmentInfo[] = [];
    const validFiles: File[] = [];
    const maxFileSize = 10 * 1024 * 1024; // 10MB 제한
    const fileErrors: string[] = [];

    Array.from(files).forEach((file) => {
      // 파일 크기 체크
      if (file.size > maxFileSize) {
        fileErrors.push(`${file.name}: 파일 크기가 10MB를 초과합니다.`);
        return;
      }

      // 중복 체크
      const isDuplicate = customAttachments.some(att => att.originalName === file.name);
      if (isDuplicate) {
        fileErrors.push(`${file.name}: 이미 추가된 파일입니다.`);
        return;
      }

      // 고유 ID 생성 (음수로 설정하여 서버 첨부파일과 구분)
      const customId = -Date.now() - Math.random();
      
      newCustomAttachments.push({
        id: customId,
        originalName: file.name,
        filePath: '', // 사용자 업로드 파일은 filePath가 없음
        fileSize: file.size,
        mimeType: file.type,
        isSelected: true, // 기본적으로 선택됨
        isCustom: true,
        file: file
      });

      validFiles.push(file);
    });

    if (fileErrors.length > 0) {
      toast({
        title: "파일 업로드 경고",
        description: fileErrors.join('\n'),
        variant: "destructive"
      });
    }

    if (newCustomAttachments.length > 0) {
      setCustomAttachments(prev => [...prev, ...newCustomAttachments]);
      setEmailData(prev => ({
        ...prev,
        customFiles: [...(prev.customFiles || []), ...validFiles],
        selectedAttachmentIds: [
          ...prev.selectedAttachmentIds,
          ...newCustomAttachments.map(att => att.id)
        ]
      }));

      toast({
        title: "파일 추가 완료",
        description: `${newCustomAttachments.length}개의 파일이 추가되었습니다.`,
      });
    }
  };

  // 사용자 파일 업로드 처리
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    processFiles(files);

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  // 사용자 업로드 파일 제거
  const removeCustomFile = (attachmentId: number) => {
    setCustomAttachments(prev => prev.filter(att => att.id !== attachmentId));
    setEmailData(prev => ({
      ...prev,
      customFiles: prev.customFiles?.filter((_, index) => {
        const customAtt = customAttachments[index];
        return customAtt?.id !== attachmentId;
      }),
      selectedAttachmentIds: prev.selectedAttachmentIds.filter(id => id !== attachmentId)
    }));
  };

  // 유효성 검사
  const validateForm = () => {
    const newErrors: string[] = [];
    
    if (!emailData.to.length || emailData.to.every(email => !email.trim())) {
      newErrors.push('최소 하나의 수신자 이메일을 입력하세요.');
    }
    
    const invalidToEmails = emailData.to.filter(email => email && !isValidEmail(email));
    if (invalidToEmails.length > 0) {
      newErrors.push('수신자 이메일 주소가 올바르지 않습니다.');
    }
    
    const invalidCcEmails = emailData.cc?.filter(email => email && !isValidEmail(email)) || [];
    if (invalidCcEmails.length > 0) {
      newErrors.push('참조 이메일 주소가 올바르지 않습니다.');
    }
    
    if (!emailData.subject.trim()) {
      newErrors.push('제목을 입력하세요.');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // 이메일 발송
  const handleSendEmail = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors([]); // 기존 에러 메시지 초기화
    
    try {
      // 상세한 첨부파일 로깅
      console.log('📧 [UI DEBUG] 이메일 발송 시작:');
      console.log('  ├─ to:', emailData.to);
      console.log('  ├─ cc:', emailData.cc);
      console.log('  ├─ subject:', emailData.subject);
      console.log('  ├─ message 길이:', emailData.message?.length || 0);
      console.log('  ├─ selectedAttachmentIds:', emailData.selectedAttachmentIds);
      console.log('  ├─ selectedAttachmentIds 길이:', emailData.selectedAttachmentIds?.length || 0);
      console.log('  ├─ customFiles 개수:', emailData.customFiles?.length || 0);
      
      // 선택된 첨부파일 상세 분석
      console.log('📎 [UI DEBUG] 선택된 첨부파일 분석:');
      if (emailData.selectedAttachmentIds && emailData.selectedAttachmentIds.length > 0) {
        emailData.selectedAttachmentIds.forEach((attachmentId, index) => {
          // 서버 첨부파일에서 찾기
          const serverAttachment = attachments.find(att => att.id === attachmentId);
          // 커스텀 첨부파일에서 찾기  
          const customAttachment = customAttachments.find(att => att.id === attachmentId);
          
          if (serverAttachment) {
            const isExcel = serverAttachment.mimeType?.includes('excel') || 
                           serverAttachment.mimeType?.includes('spreadsheet') ||
                           serverAttachment.originalName?.toLowerCase().endsWith('.xlsx') ||
                           serverAttachment.originalName?.toLowerCase().endsWith('.xls');
            console.log(`  ├─ [${index}] 서버파일: ${serverAttachment.originalName} (ID: ${attachmentId}, Excel: ${isExcel})`);
          } else if (customAttachment) {
            const isExcel = customAttachment.mimeType?.includes('excel') || 
                           customAttachment.mimeType?.includes('spreadsheet') ||
                           customAttachment.originalName?.toLowerCase().endsWith('.xlsx') ||
                           customAttachment.originalName?.toLowerCase().endsWith('.xls');
            console.log(`  ├─ [${index}] 커스텀파일: ${customAttachment.originalName} (ID: ${attachmentId}, Excel: ${isExcel})`);
          } else {
            console.warn(`  ├─ [${index}] ⚠️ 첨부파일 ID ${attachmentId}를 찾을 수 없음!`);
          }
        });
      } else {
        console.warn('  └─ ⚠️ 선택된 첨부파일이 없음!');
      }
      
      console.log('📧 [UI DEBUG] 기존 로그와 함께 전송:', {
        to: emailData.to,
        cc: emailData.cc,
        subject: emailData.subject,
        message: emailData.message,
        selectedAttachmentIds: emailData.selectedAttachmentIds
      });
      
      await onSendEmail(emailData);
      onOpenChange(false);
      // 성공 알림은 부모 컴포넌트에서 처리
    } catch (error: any) {
      console.error('❌ Email sending error:', error);
      
      // 구체적인 에러 메시지 처리
      let errorMessage = '이메일 발송 중 오류가 발생했습니다.';
      let specificErrors: string[] = [];
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        
        // 서버에서 반환한 구체적인 에러 메시지 처리
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        // 여러 에러가 있을 경우
        if (errorData.errors && Array.isArray(errorData.errors)) {
          specificErrors = errorData.errors;
        } else if (errorData.details) {
          specificErrors = [errorData.details];
        }
        
        // SMTP 관련 에러 처리
        if (errorData.code) {
          switch (errorData.code) {
            case 'EAUTH':
              specificErrors.push('이메일 계정 인증에 실패했습니다. 관리자에게 문의하세요.');
              break;
            case 'ECONNECTION':
            case 'ETIMEDOUT':
              specificErrors.push('이메일 서버에 연결할 수 없습니다. 네트워크 상태를 확인하세요.');
              break;
            case 'EMESSAGE':
              specificErrors.push('이메일 내용에 오류가 있습니다. 입력 내용을 확인하세요.');
              break;
            case 'EENVELOPE':
              specificErrors.push('수신자 또는 발신자 이메일 주소에 오류가 있습니다.');
              break;
            default:
              if (errorData.code) {
                specificErrors.push(`이메일 서버 오류: ${errorData.code}`);
              }
          }
        }
        
        // 첨부파일 관련 에러
        if (errorMessage.includes('attachment') || errorMessage.includes('첨부')) {
          specificErrors.push('첨부파일 처리 중 문제가 발생했습니다. 파일 크기나 형식을 확인하세요.');
        }
        
        // 이메일 주소 관련 에러
        if (errorMessage.includes('invalid') && errorMessage.includes('email')) {
          specificErrors.push('유효하지 않은 이메일 주소가 포함되어 있습니다.');
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // 네트워크 에러 처리
      if (error?.code === 'NETWORK_ERROR' || error?.name === 'NetworkError') {
        errorMessage = '네트워크 연결에 문제가 있습니다.';
        specificErrors.push('인터넷 연결을 확인하고 다시 시도하세요.');
      }
      
      // 타임아웃 에러
      if (error?.code === 'TIMEOUT_ERROR' || error?.message?.includes('timeout')) {
        errorMessage = '이메일 발송 시간이 초과되었습니다.';
        specificErrors.push('서버가 응답하지 않습니다. 잠시 후 다시 시도하세요.');
      }
      
      // 에러 메시지 설정
      const allErrors = [errorMessage, ...specificErrors].filter(Boolean);
      setErrors(allErrors);
      
      // 사용자 친화적인 토스트 메시지도 표시
      toast({
        title: "이메일 발송 실패",
        description: specificErrors.length > 0 ? specificErrors[0] : errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            발주서 이메일 발송
          </DialogTitle>
          <DialogDescription>
            {orderData.vendorName}에게 발주서 {orderData.orderNumber}를 이메일로 전송합니다.
          </DialogDescription>
        </DialogHeader>

        {/* 발주서 상태 안내 문구 */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>📧 안내:</strong> 발주생성이 되었더라도 발주 이메일 전송 버튼이 클릭되어야 '발주완료' 상태로 변경됩니다.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* 오류 메시지 */}
          {errors.length > 0 && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-1">
                  <div className="font-semibold text-sm">⚠️ 이메일 발송 실패</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {errors.map((error, index) => (
                      <li key={index} className="break-words">{error}</li>
                    ))}
                  </ul>
                  <div className="text-xs text-red-600 mt-2 pt-1 border-t border-red-200">
                    💡 문제가 지속되면 관리자에게 문의하세요.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 수신자 (TO) */}
          <div className="space-y-2">
            <Label htmlFor="to-email">수신자 *</Label>
            <div className="flex gap-2">
              <Input
                id="to-email"
                type="email"
                placeholder="example@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addToEmail()}
              />
              <Button type="button" onClick={addToEmail} variant="outline" size="sm">
                추가
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {emailData.to.filter(email => email.trim()).map((email, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {email}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeEmail(email, 'to')}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* 참조 (CC) */}
          <div className="space-y-2">
            <Label htmlFor="cc-email">참조 (선택)</Label>
            <div className="flex gap-2">
              <Input
                id="cc-email"
                type="email"
                placeholder="cc@company.com"
                value={newCcEmail}
                onChange={(e) => setNewCcEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCcEmail()}
              />
              <Button type="button" onClick={addCcEmail} variant="outline" size="sm">
                추가
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {emailData.cc?.map((email, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  {email}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeEmail(email, 'cc')}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="subject">제목 *</Label>
            <Input
              id="subject"
              value={emailData.subject}
              onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="발주서 전송 - PO-XXXX-XXX"
            />
          </div>

          {/* 첨부파일 선택 */}
          <div className="space-y-3">
            <Label className="text-base font-medium">첨부파일</Label>
            
            {/* 탭 형식 UI */}
            <div className="border rounded-lg">
              {/* 기존 첨부파일 섹션 */}
              <div className="border-b p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">발주서 첨부파일</span>
                    <Badge variant="secondary" className="text-xs">
                      {attachments.length}개
                    </Badge>
                  </div>
                </div>
              </div>
              
              {attachmentsLoading ? (
                <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  첨부파일 정보를 불러오는 중...
                </div>
              ) : attachments.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  발주서에 첨부된 파일이 없습니다.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto p-3 space-y-2">
                  {attachments.map((attachment) => {
                    const isSelected = emailData.selectedAttachmentIds.includes(attachment.id);
                    return (
                      <div 
                        key={attachment.id} 
                        className={`flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : 'border border-gray-200'
                        }`}
                      >
                        <Checkbox
                          id={`attach-${attachment.id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleAttachment(attachment.id)}
                        />
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {getFileIcon(attachment.mimeType, attachment.originalName)}
                          <div className="flex-1 min-w-0">
                            <Label 
                              htmlFor={`attach-${attachment.id}`}
                              className="text-sm font-medium cursor-pointer block truncate"
                              title={attachment.originalName}
                            >
                              {attachment.originalName}
                            </Label>
                            {attachment.fileSize && (
                              <div className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.fileSize)}
                                {attachment.mimeType && (
                                  <span className="ml-2">• {attachment.mimeType.split('/')[1]?.toUpperCase()}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 사용자 업로드 파일 섹션 */}
              <div 
                className="border-t"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">추가 파일 첨부</span>
                      {customAttachments.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {customAttachments.length}개
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      파일 선택
                    </Button>
                  </div>
                </div>
                
                {/* 숨겨진 파일 입력 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.zip,.rar"
                />
                
                {/* 업로드된 파일 목록 */}
                {customAttachments.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto p-3 space-y-2">
                    {customAttachments.map((attachment) => {
                      const isSelected = emailData.selectedAttachmentIds.includes(attachment.id);
                      return (
                        <div 
                          key={attachment.id} 
                          className={`flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-green-50 border border-green-200' : 'border border-gray-200'
                          }`}
                        >
                          <Checkbox
                            id={`custom-${attachment.id}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleAttachment(attachment.id)}
                          />
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {getFileIcon(attachment.mimeType, attachment.originalName)}
                            <div className="flex-1 min-w-0">
                              <Label 
                                htmlFor={`custom-${attachment.id}`}
                                className="text-sm font-medium cursor-pointer block truncate"
                                title={attachment.originalName}
                              >
                                {attachment.originalName}
                                <Badge variant="outline" className="ml-2 text-xs">새 파일</Badge>
                              </Label>
                              {attachment.fileSize && (
                                <div className="text-xs text-muted-foreground">
                                  {formatFileSize(attachment.fileSize)}
                                  {attachment.mimeType && (
                                    <span className="ml-2">• {attachment.mimeType.split('/')[1]?.toUpperCase()}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomFile(attachment.id)}
                              className="h-6 w-6 p-0 hover:bg-red-100"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div 
                    className="p-4 text-center text-sm text-muted-foreground"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div 
                      className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                        isDragging 
                          ? 'border-blue-400 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                      <p className={isDragging ? 'text-blue-600 font-medium' : ''}>
                        {isDragging ? '파일을 놓으세요' : '추가로 첨부할 파일을 선택하세요'}
                      </p>
                      <p className="text-xs mt-1">
                        {isDragging 
                          ? '여기에 파일을 드롭하세요' 
                          : '드래그 앤 드롭 또는 클릭하여 파일 선택'}
                      </p>
                      <p className="text-xs mt-1 text-gray-500">최대 10MB, 여러 파일 선택 가능</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 전체 선택 상태 표시 */}
              {(emailData.selectedAttachmentIds.length > 0) && (
                <div className="p-3 bg-blue-50 border-t border-blue-200">
                  <div className="text-sm text-blue-700 font-medium flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    총 {emailData.selectedAttachmentIds.length}개 파일이 선택되었습니다
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 메시지 */}
          <div className="space-y-2">
            <Label htmlFor="message">메시지 (선택)</Label>
            <div className="text-xs text-muted-foreground mb-1">
              이 메시지는 이메일 본문에 포함되어 수신자에게 전달됩니다.
            </div>
            <Textarea
              id="message"
              value={emailData.message}
              onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="추가 메시지를 입력하세요..."
              rows={8}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            취소
          </Button>
          <Button onClick={handleSendEmail} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                발송 중...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                이메일 발송
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}