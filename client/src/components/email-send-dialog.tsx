import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, X, Check, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

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
  };
  onSendEmail: (emailData: EmailData) => Promise<void>;
}

interface EmailData {
  to: string[];
  cc?: string[];
  subject: string;
  message?: string;
  attachPDF: boolean;
  attachExcel: boolean;
}

export function EmailSendDialog({ open, onOpenChange, orderData, onSendEmail }: EmailSendDialogProps) {
  const [emailData, setEmailData] = useState<EmailData>({
    to: orderData.vendorEmail ? [orderData.vendorEmail] : [''],
    cc: [],
    subject: `발주서 전송 - ${orderData.orderNumber}`,
    message: '',
    attachPDF: true,
    attachExcel: true
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newCcEmail, setNewCcEmail] = useState('');

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

          {/* 첨부파일 옵션 */}
          <div className="space-y-3">
            <Label>첨부파일</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attach-excel"
                  checked={emailData.attachExcel}
                  onCheckedChange={(checked) => 
                    setEmailData(prev => ({ ...prev, attachExcel: checked as boolean }))
                  }
                />
                <Label htmlFor="attach-excel">Excel 파일 (갑지/을지)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attach-pdf"
                  checked={emailData.attachPDF}
                  onCheckedChange={(checked) => 
                    setEmailData(prev => ({ ...prev, attachPDF: checked as boolean }))
                  }
                />
                <Label htmlFor="attach-pdf">PDF 파일</Label>
              </div>
            </div>
          </div>

          {/* 메시지 */}
          <div className="space-y-2">
            <Label htmlFor="message">메시지 (선택)</Label>
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