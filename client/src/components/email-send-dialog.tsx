import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, X, Check, AlertTriangle, FileText, File, Loader2, Info } from 'lucide-react';
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
}

interface EmailData {
  to: string[];
  cc?: string[];
  subject: string;
  message?: string;
  selectedAttachmentIds: number[];
}

export function EmailSendDialog({ open, onOpenChange, orderData, onSendEmail }: EmailSendDialogProps) {
  const { toast } = useToast();
  const [emailData, setEmailData] = useState<EmailData>({
    to: orderData.vendorEmail ? [orderData.vendorEmail] : [''],
    cc: [],
    subject: `발주서 전송 - ${orderData.orderNumber}`,
    message: '',
    selectedAttachmentIds: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newCcEmail, setNewCcEmail] = useState('');
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  // Fetch attachments when dialog opens
  useEffect(() => {
    if (open && orderData.orderId) {
      fetchAttachments();
    }
  }, [open, orderData.orderId]);

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
    return <File className="h-4 w-4 text-gray-500" />;
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
    try {
      console.log('📧 Sending email with data:', {
        to: emailData.to,
        cc: emailData.cc,
        subject: emailData.subject,
        message: emailData.message,
        selectedAttachmentIds: emailData.selectedAttachmentIds
      });
      
      await onSendEmail(emailData);
      onOpenChange(false);
      // 성공 알림은 부모 컴포넌트에서 처리
    } catch (error) {
      setErrors(['이메일 발송 중 오류가 발생했습니다.']);
    } finally {
      setIsLoading(false);
    }
  };

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
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
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
            
            {attachmentsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                첨부파일 정보를 불러오는 중...
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                이 발주서에 첨부된 파일이 없습니다.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  총 {attachments.length}개의 파일이 첨부되어 있습니다
                </div>
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
                
                {/* 선택된 파일 개수 표시 */}
                {emailData.selectedAttachmentIds.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="text-xs text-blue-600 font-medium">
                      ✓ {emailData.selectedAttachmentIds.length}개 파일이 선택되었습니다
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 메시지 */}
          <div className="space-y-2">
            <Label htmlFor="message">메시지 (선택)</Label>
            <div className="text-xs text-muted-foreground mb-1">
              이 메시지는 이메일 본문에 포함되어 수신자에게 전달됩니다.
            </div>
            <Textarea
              id="message"
              value={emailData.message || defaultMessage}
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