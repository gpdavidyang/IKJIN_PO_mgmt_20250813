import React from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { useOrderEmailHistory } from "@/hooks/use-email-history";
import {
  Mail,
  Send,
  MailOpen,
  MailX,
  Clock,
  User,
  Paperclip,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer
} from "lucide-react";

interface EmailHistoryModalProps {
  orderId: number;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onResend?: (emailId: number) => void;
}

export function EmailHistoryModal({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  onResend
}: EmailHistoryModalProps) {
  const { data: emailHistory, isLoading } = useOrderEmailHistory(orderId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'opened':
        return <MailOpen className="h-4 w-4" />;
      case 'clicked':
        return <MousePointer className="h-4 w-4" />;
      case 'failed':
        return <MailX className="h-4 w-4" />;
      case 'bounced':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sent: { variant: "default" as const, label: "발주완료" },
      opened: { variant: "success" as const, label: "열람됨" },
      clicked: { variant: "secondary" as const, label: "클릭됨" },
      failed: { variant: "destructive" as const, label: "실패" },
      bounced: { variant: "warning" as const, label: "반송됨" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.sent;
    
    return (
      <Badge variant={config.variant}>
        {getStatusIcon(status)}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>이메일 발송 이력</DialogTitle>
          <DialogDescription>
            발주서 {orderNumber}의 이메일 발송 내역입니다.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : emailHistory && emailHistory.length > 0 ? (
          <Tabs defaultValue="0" className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(emailHistory.length, 5)}, 1fr)` }}>
              {emailHistory.slice(0, 5).map((email, index) => (
                <TabsTrigger key={email.id} value={index.toString()}>
                  {format(new Date(email.sentAt), "MM/dd HH:mm")}
                </TabsTrigger>
              ))}
              {emailHistory.length > 5 && (
                <TabsTrigger value="more" disabled>
                  +{emailHistory.length - 5} more
                </TabsTrigger>
              )}
            </TabsList>

            {emailHistory.map((email, index) => (
              <TabsContent key={email.id} value={index.toString()} className="space-y-4">
                {/* Email Header Info */}
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">발송 시간:</span>
                        <span className="font-medium">
                          {format(new Date(email.sentAt), "yyyy년 MM월 dd일 HH:mm:ss", { locale: ko })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">발송자:</span>
                        <span className="font-medium">{email.sentByName} ({email.sentByEmail})</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">수신자:</span>
                        <span className="font-medium">
                          {email.recipientName ? `${email.recipientName} <${email.recipientEmail}>` : email.recipientEmail}
                        </span>
                      </div>
                      {email.ccEmails && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">참조:</span>
                          <span className="font-medium">{email.ccEmails}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">상태:</span>
                        {getStatusBadge(email.status)}
                      </div>
                      
                      {email.openedAt && (
                        <div className="flex items-center gap-2 text-sm">
                          <Eye className="h-4 w-4 text-green-500" />
                          <span className="text-gray-600">열람 시간:</span>
                          <span className="font-medium">
                            {format(new Date(email.openedAt), "yyyy년 MM월 dd일 HH:mm:ss", { locale: ko })}
                          </span>
                        </div>
                      )}
                      
                      {email.clickedAt && (
                        <div className="flex items-center gap-2 text-sm">
                          <MousePointer className="h-4 w-4 text-purple-500" />
                          <span className="text-gray-600">클릭 시간:</span>
                          <span className="font-medium">
                            {format(new Date(email.clickedAt), "yyyy년 MM월 dd일 HH:mm:ss", { locale: ko })}
                          </span>
                        </div>
                      )}

                      {email.errorMessage && (
                        <div className="flex items-start gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                          <div>
                            <span className="text-gray-600">오류 메시지:</span>
                            <p className="text-red-600 text-xs mt-1">{email.errorMessage}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {email.attachments && email.attachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">첨부 파일:</span>
                      </div>
                      <div className="space-y-1">
                        {email.attachments.map((attachment, idx) => (
                          <div key={idx} className="text-sm text-gray-700">
                            {attachment.filename} ({(attachment.size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Email Content */}
                <Card className="p-4">
                  <h4 className="font-medium mb-2">제목</h4>
                  <p className="text-sm text-gray-700 mb-4">{email.subject}</p>
                  
                  <Separator />
                  
                  <h4 className="font-medium mt-4 mb-2">내용</h4>
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: email.body }}
                    />
                  </ScrollArea>
                </Card>

                {/* Actions */}
                {onResend && email.status === 'failed' && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onResend(email.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      재발송
                    </Button>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">이메일 발송 이력이 없습니다.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}