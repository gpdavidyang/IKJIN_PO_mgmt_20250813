import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Send, Download, Loader2, FileText, Mail, Plus, X, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';

interface ActionBarProps {
  orderData: any;
  pdfUrl: string | null;
  processingStatus: {
    pdf: 'idle' | 'processing' | 'completed' | 'error';
    vendor: 'idle' | 'processing' | 'completed' | 'error';
    email: 'idle' | 'processing' | 'completed' | 'error';
    order: 'idle' | 'processing' | 'completed' | 'error';
  };
  onSave: () => void;
  onSend: () => void;
  onDownload: () => void;
  onCreateOrder: () => void;
  onCreateOrderWithEmail?: (emailSettings: any) => void;
}

const ActionBar: React.FC<ActionBarProps> = ({
  orderData,
  pdfUrl,
  processingStatus,
  onSave,
  onSend,
  onDownload,
  onCreateOrder,
  onCreateOrderWithEmail
}) => {
  const { isCollapsed } = useSidebar();
  const [sendEmailAfterCreate, setSendEmailAfterCreate] = useState(true);
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [emailSettings, setEmailSettings] = useState({
    to: [orderData.vendorEmail || ''].filter(Boolean),
    cc: [],
    subject: `발주서 - ${orderData.orderNumber || ''} (${new Date().toLocaleDateString('ko-KR')})`,
    message: `안녕하세요,\n\n첨부된 발주서를 확인해 주시기 바랍니다.\n\n감사합니다.`,
    attachments: {
      includeExcel: true,
      includePdf: true,
      additionalFiles: []
    }
  });
  
  // 임시 입력값들
  const [newToEmail, setNewToEmail] = useState('');
  const [newCcEmail, setNewCcEmail] = useState('');

  // 이메일 관련 헬퍼 함수들
  const addToEmail = () => {
    if (newToEmail.trim() && !emailSettings.to.includes(newToEmail.trim())) {
      setEmailSettings(prev => ({
        ...prev,
        to: [...prev.to, newToEmail.trim()]
      }));
      setNewToEmail('');
    }
  };

  const removeToEmail = (email: string) => {
    setEmailSettings(prev => ({
      ...prev,
      to: prev.to.filter(e => e !== email)
    }));
  };

  const addCcEmail = () => {
    if (newCcEmail.trim() && !emailSettings.cc.includes(newCcEmail.trim())) {
      setEmailSettings(prev => ({
        ...prev,
        cc: [...prev.cc, newCcEmail.trim()]
      }));
      setNewCcEmail('');
    }
  };

  const removeCcEmail = (email: string) => {
    setEmailSettings(prev => ({
      ...prev,
      cc: prev.cc.filter(e => e !== email)
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setEmailSettings(prev => ({
      ...prev,
      attachments: {
        ...prev.attachments,
        additionalFiles: [...prev.attachments.additionalFiles, ...files]
      }
    }));
  };

  const removeAdditionalFile = (index: number) => {
    setEmailSettings(prev => ({
      ...prev,
      attachments: {
        ...prev.attachments,
        additionalFiles: prev.attachments.additionalFiles.filter((_, i) => i !== index)
      }
    }));
  };

  const canSend = 
    processingStatus.pdf === 'completed' && 
    processingStatus.vendor === 'completed' &&
    emailSettings.to.length > 0;

  const canCreateOrder = 
    orderData.orderNumber && 
    orderData.vendorName && 
    orderData.projectName && 
    orderData.items?.length > 0;

  const isProcessing = Object.values(processingStatus).some(status => status === 'processing');

  const handleCreateOrderClick = () => {
    if (sendEmailAfterCreate && onCreateOrderWithEmail) {
      // 이메일 설정 모달 표시
      setShowEmailSettings(true);
    } else {
      // 일반 발주서 생성
      onCreateOrder();
    }
  };

  const handleConfirmEmailSettings = () => {
    setShowEmailSettings(false);
    if (onCreateOrderWithEmail) {
      onCreateOrderWithEmail(emailSettings);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-30">
      <div className={cn(
        "container mx-auto px-6 py-4 transition-all duration-300",
        isCollapsed ? "xl:ml-16" : "xl:ml-64"
      )}>
        <div className="flex flex-col gap-3 items-center">
          {/* 상단: 이메일 발송 옵션 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
            <Checkbox
              id="send-email"
              checked={sendEmailAfterCreate}
              onCheckedChange={(checked) => setSendEmailAfterCreate(!!checked)}
              className="h-4 w-4"
            />
            <label htmlFor="send-email" className="font-medium cursor-pointer text-foreground whitespace-nowrap text-xs">
              발주서 생성 후 이메일 자동 발송
            </label>
            {isProcessing && (
              <div className="flex items-center gap-1 ml-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                처리 중
              </div>
            )}
          </div>
          
          {/* 하단: 모든 버튼들을 중앙에 집중 */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={onSave}
              disabled={isProcessing}
              size="sm"
              className="text-xs px-3 py-2 h-8"
            >
              <Save className="w-3 h-3 mr-1" />
              임시저장
            </Button>
            
            <Button
              variant="outline"
              onClick={onDownload}
              disabled={!pdfUrl || processingStatus.pdf !== 'completed'}
              size="sm"
              className="text-xs px-3 py-2 h-8"
            >
              <Download className="w-3 h-3 mr-1" />
              다운로드
            </Button>
            
            {/* 별도 이메일 발송 버튼 (발주서 생성 후) */}
            {!sendEmailAfterCreate && (
              <Button
                onClick={onSend}
                disabled={!canSend || processingStatus.email === 'processing'}
                size="sm"
                className={cn(
                  "text-xs px-3 py-2 h-8",
                  canSend ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700" : ""
                )}
              >
                {processingStatus.email === 'processing' ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    발송중
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3 mr-1" />
                    이메일 발송
                  </>
                )}
              </Button>
            )}
            
            {/* 통합 발주서 생성 버튼 */}
            <Button
              variant="default"
              onClick={handleCreateOrderClick}
              disabled={!canCreateOrder || processingStatus.order === 'processing'}
              size="sm"
              className={cn(
                "text-xs px-4 py-2 h-8 font-medium",
                canCreateOrder ? (sendEmailAfterCreate ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700" : "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700") : ""
              )}
            >
              {processingStatus.order === 'processing' ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  {sendEmailAfterCreate ? '생성 및 발송 중' : '생성 중'}
                </>
              ) : (
                <>
                  {sendEmailAfterCreate ? (
                    <>
                      <Mail className="w-3 h-3 mr-1" />
                      발주서 생성 및 발송
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3 mr-1" />
                      발주서 생성
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* 진행 상태 표시 */}
        <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              processingStatus.pdf === 'completed' ? "bg-green-500" :
              processingStatus.pdf === 'processing' ? "bg-blue-500 animate-pulse" :
              processingStatus.pdf === 'error' ? "bg-red-500" : "bg-muted-foreground"
            )} />
            PDF 생성
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              processingStatus.vendor === 'completed' ? "bg-green-500" :
              processingStatus.vendor === 'processing' ? "bg-blue-500 animate-pulse" :
              processingStatus.vendor === 'error' ? "bg-red-500" : "bg-muted-foreground"
            )} />
            거래처 확인
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              processingStatus.order === 'completed' ? "bg-green-500" :
              processingStatus.order === 'processing' ? "bg-blue-500 animate-pulse" :
              processingStatus.order === 'error' ? "bg-red-500" : "bg-muted-foreground"
            )} />
            발주서 생성
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              processingStatus.email === 'completed' ? "bg-green-500" :
              processingStatus.email === 'processing' ? "bg-blue-500 animate-pulse" :
              processingStatus.email === 'error' ? "bg-red-500" : "bg-muted-foreground"
            )} />
            이메일 준비
          </div>
        </div>
      </div>

      {/* 이메일 설정 모달 */}
      <Dialog open={showEmailSettings} onOpenChange={setShowEmailSettings}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>이메일 발송 설정</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            
            {/* 받는 사람 */}
            <div>
              <Label className="text-sm font-medium">받는 사람 *</Label>
              <div className="mt-2 space-y-2">
                {/* 추가된 이메일 목록 */}
                {emailSettings.to.map((email, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <span className="flex-1 text-sm text-foreground">{email}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeToEmail(email)}
                      className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                
                {/* 새 이메일 추가 */}
                <div className="flex gap-2">
                  <Input
                    value={newToEmail}
                    onChange={(e) => setNewToEmail(e.target.value)}
                    placeholder="example@company.com"
                    onKeyPress={(e) => e.key === 'Enter' && addToEmail()}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addToEmail}
                    disabled={!newToEmail.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 참조 */}
            <div>
              <Label className="text-sm font-medium">참조 (CC)</Label>
              <div className="mt-2 space-y-2">
                {/* 추가된 참조 이메일 목록 */}
                {emailSettings.cc.map((email, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <span className="flex-1 text-sm text-foreground">{email}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCcEmail(email)}
                      className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                
                {/* 새 참조 이메일 추가 */}
                <div className="flex gap-2">
                  <Input
                    value={newCcEmail}
                    onChange={(e) => setNewCcEmail(e.target.value)}
                    placeholder="manager@company.com (선택사항)"
                    onKeyPress={(e) => e.key === 'Enter' && addCcEmail()}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCcEmail}
                    disabled={!newCcEmail.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 제목 */}
            <div>
              <Label htmlFor="email-subject" className="text-sm font-medium">제목 *</Label>
              <Input
                id="email-subject"
                value={emailSettings.subject}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, subject: e.target.value }))}
                className="mt-2"
              />
            </div>

            {/* 메시지 */}
            <div>
              <Label htmlFor="email-message" className="text-sm font-medium">메시지</Label>
              <Textarea
                id="email-message"
                value={emailSettings.message}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
                className="mt-2"
              />
            </div>

            {/* 첨부파일 설정 */}
            <div>
              <Label className="text-sm font-medium">첨부파일</Label>
              <div className="mt-2 space-y-3">
                
                {/* 기본 첨부파일 옵션 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-excel"
                      checked={emailSettings.attachments.includeExcel}
                      onCheckedChange={(checked) => 
                        setEmailSettings(prev => ({
                          ...prev,
                          attachments: { ...prev.attachments, includeExcel: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="include-excel" className="text-sm">Excel 파일 첨부</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-pdf"
                      checked={emailSettings.attachments.includePdf}
                      onCheckedChange={(checked) => 
                        setEmailSettings(prev => ({
                          ...prev,
                          attachments: { ...prev.attachments, includePdf: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="include-pdf" className="text-sm">PDF 파일 첨부</Label>
                  </div>
                </div>

                {/* 추가 파일 첨부 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm">추가 파일</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('additional-files')?.click()}
                      className="h-8"
                    >
                      <Paperclip className="h-3 w-3 mr-1" />
                      파일 선택
                    </Button>
                  </div>
                  
                  <input
                    id="additional-files"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {/* 추가된 파일 목록 */}
                  {emailSettings.attachments.additionalFiles.length > 0 && (
                    <div className="space-y-1">
                      {emailSettings.attachments.additionalFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Paperclip className="h-3 w-3 text-muted-foreground" />
                          <span className="flex-1 text-sm text-foreground">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdditionalFile(index)}
                            className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
              📎 선택한 첨부파일이 이메일과 함께 발송됩니다.
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowEmailSettings(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmEmailSettings}
              disabled={emailSettings.to.length === 0 || !emailSettings.subject}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              발주서 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActionBar;