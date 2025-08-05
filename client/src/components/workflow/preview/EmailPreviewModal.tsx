import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Mail, 
  Send, 
  Edit3, 
  Eye, 
  Users, 
  Paperclip,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  Copy,
  Settings
} from 'lucide-react';
import EmailRecipientManager, { EmailRecipient } from '../email/EmailRecipientManager';

interface EmailTemplate {
  subject: string;
  body: string;
  includeAttachments: boolean;
  sendAsHTML: boolean;
}

interface EmailPreviewModalProps {
  orderData: any;
  recipients?: EmailRecipient[];
  isOpen?: boolean;
  onClose?: () => void;
  onSend?: (emailData: { recipients: EmailRecipient[]; template: EmailTemplate }) => void;
  trigger?: React.ReactNode;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  orderData,
  recipients: initialRecipients = [],
  isOpen,
  onClose,
  onSend,
  trigger
}) => {
  const [recipients, setRecipients] = useState<EmailRecipient[]>(initialRecipients);
  const [showRecipientManager, setShowRecipientManager] = useState(false);
  
  const [template, setTemplate] = useState<EmailTemplate>({
    subject: `발주서 전송 - ${orderData?.orderNumber || ''}`,
    body: generateDefaultEmailBody(orderData),
    includeAttachments: true,
    sendAsHTML: true
  });

  // 기본 이메일 본문 생성
  function generateDefaultEmailBody(data: any): string {
    return `안녕하세요,

${data?.vendorName || '거래처'}님께 발주서를 송부드립니다.

■ 발주서 정보
- 발주서 번호: ${data?.orderNumber || '미생성'}
- 프로젝트: ${data?.projectName || '미지정'}
- 발주 일자: ${new Date().toLocaleDateString('ko-KR')}
- 총 품목 수: ${data?.totalItems || data?.items?.length || 0}개
${data?.totalAmount ? `- 총 금액: ₩${data.totalAmount.toLocaleString()}` : ''}

첨부된 발주서를 확인하시고, 납기일정에 맞춰 준비해 주시기 바랍니다.

문의사항이 있으시면 언제든 연락 주시기 바랍니다.

감사합니다.

---
${data?.companyName || '회사명'}
${data?.senderName || '발신자'}
${data?.senderEmail || 'sender@company.com'}
${data?.senderPhone || '연락처'}`;
  }

  // 초기 수신자 설정
  useEffect(() => {
    if (initialRecipients.length === 0 && orderData?.vendorEmail) {
      const defaultRecipient: EmailRecipient = {
        id: 'vendor-1',
        email: orderData.vendorEmail,
        name: orderData.vendorName || '거래처',
        company: orderData.vendorName,
        type: 'vendor',
        verified: true
      };
      setRecipients([defaultRecipient]);
    }
  }, [orderData, initialRecipients]);

  // 이메일 발송
  const handleSend = () => {
    if (onSend) {
      onSend({ recipients, template });
    }
    onClose?.();
  };

  // 수신자 유형별 아이콘
  const getRecipientTypeIcon = (type: EmailRecipient['type']) => {
    switch (type) {
      case 'vendor': return <Users className="w-4 h-4 text-blue-600" />;
      case 'cc': return <Copy className="w-4 h-4 text-green-600" />;
      case 'bcc': return <Eye className="w-4 h-4 text-gray-600" />;
    }
  };

  // 수신자 유형별 라벨
  const getRecipientTypeLabel = (type: EmailRecipient['type']) => {
    switch (type) {
      case 'vendor': return '거래처';
      case 'cc': return '참조';
      case 'bcc': return '숨은참조';
    }
  };

  const modalContent = (
    <DialogContent className="max-w-4xl h-[90vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          이메일 미리보기 및 발송
          {orderData?.orderNumber && (
            <Badge variant="outline">
              {orderData.orderNumber}
            </Badge>
          )}
        </DialogTitle>
      </DialogHeader>
      
      <Tabs defaultValue="recipients" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recipients">수신자 ({recipients.length})</TabsTrigger>
          <TabsTrigger value="compose">이메일 작성</TabsTrigger>
          <TabsTrigger value="preview">미리보기</TabsTrigger>
        </TabsList>
        
        {/* 수신자 관리 탭 */}
        <TabsContent value="recipients" className="flex-1 overflow-auto space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">수신자 목록</CardTitle>
                <Button 
                  onClick={() => setShowRecipientManager(true)}
                  variant="outline"
                  size="sm"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  수신자 관리
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 기존 수신자 목록 */}
              <div className="space-y-2">
                {recipients.map((recipient) => (
                  <div 
                    key={recipient.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getRecipientTypeIcon(recipient.type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{recipient.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {getRecipientTypeLabel(recipient.type)}
                          </Badge>
                          {recipient.verified ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{recipient.email}</p>
                        {recipient.company && (
                          <p className="text-xs text-gray-500">{recipient.company}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecipients(recipients.filter(r => r.id !== recipient.id))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {recipients.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>등록된 수신자가 없습니다.</p>
                    <Button 
                      onClick={() => setShowRecipientManager(true)}
                      variant="outline"
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      수신자 추가
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 이메일 작성 탭 */}
        <TabsContent value="compose" className="flex-1 overflow-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">이메일 내용</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email-subject">제목</Label>
                <Input
                  id="email-subject"
                  value={template.subject}
                  onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="email-body">본문</Label>
                <Textarea
                  id="email-body"
                  rows={15}
                  value={template.body}
                  onChange={(e) => setTemplate({ ...template, body: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-attachments">PDF 첨부</Label>
                  <Switch
                    id="include-attachments"
                    checked={template.includeAttachments}
                    onCheckedChange={(checked) => 
                      setTemplate({ ...template, includeAttachments: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="send-html">HTML 형식으로 발송</Label>
                  <Switch
                    id="send-html"
                    checked={template.sendAsHTML}
                    onCheckedChange={(checked) => 
                      setTemplate({ ...template, sendAsHTML: checked })
                    }
                  />
                </div>
              </div>
              
              {template.includeAttachments && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Paperclip className="w-4 h-4" />
                    <span className="text-sm font-medium">첨부 예정 파일</span>
                  </div>
                  <ul className="mt-2 text-sm text-blue-700">
                    <li>• 발주서_{orderData?.orderNumber || 'unknown'}.pdf</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 미리보기 탭 */}
        <TabsContent value="preview" className="flex-1 overflow-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">발송 미리보기</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 이메일 헤더 */}
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">받는 사람:</span>
                    <div className="mt-1">
                      {recipients
                        .filter(r => r.type === 'vendor')
                        .map(r => r.email)
                        .join(', ') || '없음'}
                    </div>
                  </div>
                  
                  {recipients.some(r => r.type === 'cc') && (
                    <div>
                      <span className="font-medium text-gray-600">참조:</span>
                      <div className="mt-1">
                        {recipients
                          .filter(r => r.type === 'cc')
                          .map(r => r.email)
                          .join(', ')}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium text-gray-600">제목:</span>
                    <div className="mt-1 font-medium">{template.subject}</div>
                  </div>
                </div>
              </div>
              
              {/* 이메일 본문 */}
              <div className="p-4 border rounded-lg bg-white">
                <div className="whitespace-pre-wrap text-sm">
                  {template.body}
                </div>
              </div>
              
              {/* 첨부파일 정보 */}
              {template.includeAttachments && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-800">
                    <Paperclip className="w-4 h-4" />
                    <span className="text-sm font-medium">첨부파일</span>
                  </div>
                  <div className="mt-2 text-sm text-green-700">
                    발주서_{orderData?.orderNumber || 'unknown'}.pdf
                  </div>
                </div>
              )}
              
              {/* 발송 버튼 */}
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSend}
                  disabled={recipients.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  이메일 발송 ({recipients.length}명)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 수신자 관리 모달 */}
      <EmailRecipientManager
        recipients={recipients}
        onRecipientsChange={setRecipients}
        isOpen={showRecipientManager}
        onClose={() => setShowRecipientManager(false)}
        projectId={orderData?.projectId}
        vendorId={orderData?.vendorId}
      />
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        {modalContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {modalContent}
    </Dialog>
  );
};

export default EmailPreviewModal;