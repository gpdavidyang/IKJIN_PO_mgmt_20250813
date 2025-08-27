import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  X, 
  Plus, 
  Mail, 
  Send, 
  Paperclip,
  FileText,
  User,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Recipient {
  email: string;
  name?: string;
}

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (emailData: EmailData) => void;
  orderData?: any;
  initialTo?: Recipient[];
  initialCc?: Recipient[];
}

interface EmailData {
  to: Recipient[];
  cc: Recipient[];
  subject: string;
  body: string;
  attachPdf: boolean;
  attachExcel: boolean;
}

export function EmailComposeModal({ 
  isOpen, 
  onClose, 
  onSend, 
  orderData,
  initialTo = [],
  initialCc = []
}: EmailComposeModalProps) {
  const [to, setTo] = useState<Recipient[]>(initialTo);
  const [cc, setCc] = useState<Recipient[]>(initialCc);
  const [subject, setSubject] = useState(`발주서: ${orderData?.projectName || ''} - ${orderData?.vendorName || ''}`);
  const [body, setBody] = useState(`안녕하세요.

${orderData?.projectName || '[프로젝트명]'} 관련 발주서를 송부드립니다.

발주 내역:
- 거래처: ${orderData?.vendorName || '[거래처명]'}
- 납기일: ${orderData?.deliveryDate || '[납기일]'}
- 품목: ${orderData?.items?.[0]?.itemName || '[품목명]'}
- 수량: ${orderData?.items?.[0]?.quantity || '[수량]'}
- 금액: ${((orderData?.items?.[0]?.quantity || 0) * (orderData?.items?.[0]?.unitPrice || 0)).toLocaleString()}원

첨부된 발주서를 확인하시고 문의사항이 있으시면 연락 부탁드립니다.

감사합니다.`);
  
  const [attachPdf, setAttachPdf] = useState(true);
  const [attachExcel, setAttachExcel] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [addType, setAddType] = useState<'to' | 'cc'>('to');

  const handleAddRecipient = () => {
    if (!newEmail) {
      toast({
        title: "이메일 주소를 입력하세요",
        variant: "destructive"
      });
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "올바른 이메일 형식이 아닙니다",
        variant: "destructive"
      });
      return;
    }

    const newRecipient: Recipient = {
      email: newEmail,
      name: newName || undefined
    };

    if (addType === 'to') {
      // 중복 체크
      if (to.some(r => r.email === newEmail)) {
        toast({
          title: "이미 추가된 수신자입니다",
          variant: "destructive"
        });
        return;
      }
      setTo([...to, newRecipient]);
    } else {
      // 중복 체크
      if (cc.some(r => r.email === newEmail)) {
        toast({
          title: "이미 추가된 참조자입니다",
          variant: "destructive"
        });
        return;
      }
      setCc([...cc, newRecipient]);
    }

    setNewEmail('');
    setNewName('');
  };

  const handleRemoveRecipient = (email: string, type: 'to' | 'cc') => {
    if (type === 'to') {
      setTo(to.filter(r => r.email !== email));
    } else {
      setCc(cc.filter(r => r.email !== email));
    }
  };

  const handleSend = () => {
    if (to.length === 0) {
      toast({
        title: "수신자를 추가해주세요",
        variant: "destructive"
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: "제목을 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    if (!body.trim()) {
      toast({
        title: "내용을 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    onSend({
      to,
      cc,
      subject,
      body,
      attachPdf,
      attachExcel
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            이메일 작성
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 수신자 */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4" />
              수신자 (To)
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {to.map((recipient) => (
                <Badge key={recipient.email} variant="secondary" className="px-2 py-1">
                  {recipient.name && `${recipient.name} `}
                  &lt;{recipient.email}&gt;
                  <button
                    onClick={() => handleRemoveRecipient(recipient.email, 'to')}
                    className="ml-2 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {to.length === 0 && (
                <span className="text-sm text-gray-500">수신자를 추가해주세요</span>
              )}
            </div>
          </div>

          {/* 참조자 */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" />
              참조 (CC)
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {cc.map((recipient) => (
                <Badge key={recipient.email} variant="outline" className="px-2 py-1">
                  {recipient.name && `${recipient.name} `}
                  &lt;{recipient.email}&gt;
                  <button
                    onClick={() => handleRemoveRecipient(recipient.email, 'cc')}
                    className="ml-2 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {cc.length === 0 && (
                <span className="text-sm text-gray-500">참조자 없음 (선택사항)</span>
              )}
            </div>
          </div>

          {/* 수신자/참조자 추가 */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <Input
                  placeholder="이름 (선택사항)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="이메일 주소"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                />
              </div>
              <select
                className="px-3 py-2 border rounded-md"
                value={addType}
                onChange={(e) => setAddType(e.target.value as 'to' | 'cc')}
              >
                <option value="to">수신자</option>
                <option value="cc">참조</option>
              </select>
              <Button
                type="button"
                onClick={handleAddRecipient}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            </div>
          </div>

          {/* 제목 */}
          <div>
            <Label htmlFor="subject">제목</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="이메일 제목을 입력하세요"
              className="mt-1"
            />
          </div>

          {/* 본문 */}
          <div>
            <Label htmlFor="body">내용</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="이메일 내용을 입력하세요"
              className="mt-1 min-h-[200px]"
            />
          </div>

          {/* 첨부파일 옵션 */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Paperclip className="h-4 w-4" />
              첨부파일
            </Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="attach-pdf"
                  checked={attachPdf}
                  onCheckedChange={(checked) => setAttachPdf(checked as boolean)}
                />
                <label 
                  htmlFor="attach-pdf"
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-red-600" />
                  발주서 PDF 첨부
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="attach-excel"
                  checked={attachExcel}
                  onCheckedChange={(checked) => setAttachExcel(checked as boolean)}
                />
                <label 
                  htmlFor="attach-excel"
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-green-600" />
                  원본 엑셀 파일 첨부
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4 mr-2" />
            이메일 발송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}