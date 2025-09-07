import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Send, Download, Loader2, FileText, Mail, Plus, X, Paperclip, List, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { apiRequest } from '@/lib/queryClient';

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
  const [availableAttachments, setAvailableAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [emailSettings, setEmailSettings] = useState({
    to: [orderData.vendorEmail || ''].filter(Boolean),
    cc: [],
    subject: `발주서 - ${orderData.orderNumber || ''} (${new Date().toLocaleDateString('ko-KR')})`,
    message: `안녕하세요,\n\n첨부된 발주서를 확인해 주시기 바랍니다.\n\n감사합니다.`,
    attachments: {
      selectedAttachmentIds: [] as number[],
      additionalFiles: [] as File[]
    }
  });
  
  // 임시 입력값들
  const [newToEmail, setNewToEmail] = useState('');
  const [newCcEmail, setNewCcEmail] = useState('');

  // orderData 변경 시 이메일 설정 업데이트
  useEffect(() => {
    const vendorEmail = orderData.vendorEmail || '';
    const newToEmails = vendorEmail ? [vendorEmail] : [];
    
    console.log('🔍 orderData 변경 감지:', { vendorEmail, newToEmails });
    
    setEmailSettings(prev => ({
      ...prev,
      to: newToEmails,
      subject: `발주서 - ${orderData.orderNumber || ''} (${new Date().toLocaleDateString('ko-KR')})`
    }));
  }, [orderData.vendorEmail, orderData.orderNumber]);

  // 이메일 모달이 열릴 때 첨부파일 목록 가져오기
  useEffect(() => {
    const fetchAttachments = async () => {
      if (!showEmailSettings || !orderData.id || loadingAttachments) return;
      
      setLoadingAttachments(true);
      try {
        const response = await apiRequest("GET", `/api/orders/${orderData.id}/attachments`);
        setAvailableAttachments(response);
        
        // 기본적으로 모든 PDF와 Excel 파일을 선택된 상태로 설정
        const allAttachmentIds = response.map((att: any) => att.id);
        setEmailSettings(prev => ({
          ...prev,
          attachments: {
            ...prev.attachments,
            selectedAttachmentIds: allAttachmentIds
          }
        }));
      } catch (error) {
        console.error('첨부파일 목록을 가져오는 중 오류:', error);
        setAvailableAttachments([]);
      } finally {
        setLoadingAttachments(false);
      }
    };

    fetchAttachments();
  }, [showEmailSettings, orderData.id]);

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

  const toggleAttachmentSelection = (attachmentId: number) => {
    setEmailSettings(prev => ({
      ...prev,
      attachments: {
        ...prev.attachments,
        selectedAttachmentIds: prev.attachments.selectedAttachmentIds.includes(attachmentId)
          ? prev.attachments.selectedAttachmentIds.filter(id => id !== attachmentId)
          : [...prev.attachments.selectedAttachmentIds, attachmentId]
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
            
            {/* 발주서 관리 페이지 이동 버튼 */}
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/orders'}
              disabled={isProcessing}
              size="sm"
              className="text-xs px-3 py-2 h-8 text-muted-foreground hover:text-foreground"
            >
              <List className="w-3 h-3 mr-1" />
              발주서 관리
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
                
                {/* 첨부 가능한 파일 목록 */}
                {loadingAttachments ? (
                  <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    첨부파일 목록을 불러오는 중...
                  </div>
                ) : availableAttachments.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">첨부 가능한 파일:</div>
                    {availableAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`attachment-${attachment.id}`}
                          checked={emailSettings.attachments.selectedAttachmentIds.includes(attachment.id)}
                          onCheckedChange={() => toggleAttachmentSelection(attachment.id)}
                        />
                        <Label 
                          htmlFor={`attachment-${attachment.id}`} 
                          className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                        >
                          <File className="w-4 h-4 text-muted-foreground" />
                          <span>{attachment.originalName}</span>
                          <span className="text-xs text-muted-foreground">
                            ({attachment.type === 'pdf' ? 'PDF' : attachment.type === 'excel' ? 'Excel' : 'File'})
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                    📎 아직 첨부 가능한 파일이 없습니다. 발주서 생성 후 PDF와 Excel 파일을 첨부할 수 있습니다.
                  </div>
                )}

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
              📎 선택한 첨부파일과 추가 파일이 이메일과 함께 발송됩니다.
              {availableAttachments.length > 0 && (
                <div className="mt-1">
                  현재 {emailSettings.attachments.selectedAttachmentIds.length}개의 파일이 선택되었습니다.
                </div>
              )}
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
          
          {/* 디버깅 정보 */}
          <div className="mt-2 p-2 bg-gray-100 text-xs text-gray-600 rounded">
            🔍 Debug: to.length={emailSettings.to.length}, subject="{emailSettings.subject}", disabled={emailSettings.to.length === 0 || !emailSettings.subject}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActionBar;