import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  FileText,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Paperclip,
  Download,
  Eye,
  History,
  TrendingUp,
  DollarSign,
  Building,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  Shield,
  FileCheck
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatKoreanWon } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ApprovalProgressViewer } from './ApprovalProgressViewer';
import { useToast } from '@/hooks/use-toast';

interface ApprovalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  orderNumber: string;
  canApprove?: boolean;
}

interface OrderDetail {
  id: number;
  orderNumber: string;
  projectName: string;
  vendorName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  items: Array<{
    id: number;
    itemName: string;
    specification: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  attachments: Array<{
    id: number;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    url: string;
  }>;
  vendor: {
    id: number;
    vendorName: string;
    contactPerson: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
  };
}

interface ApprovalHistory {
  id: number;
  action: string;
  performedBy: {
    id: string;
    name: string;
    role: string;
  };
  performedAt: string;
  note?: string;
  changes?: Record<string, any>;
}

export function ApprovalDetailModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  canApprove = false
}: ApprovalDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Fetch order details
  const { data: orderDetail, isLoading: isLoadingOrder } = useQuery<OrderDetail>({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      
      return response.json();
    },
    enabled: isOpen
  });

  // Fetch approval history
  const { data: approvalHistory, isLoading: isLoadingHistory } = useQuery<ApprovalHistory[]>({
    queryKey: ['approval-history', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/approvals/${orderId}/history`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch approval history');
      }
      
      return response.json();
    },
    enabled: isOpen
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/approvals/${orderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note: approvalNote })
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve order');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '승인 완료',
        description: '발주서가 승인되었습니다.',
      });
      queryClient.invalidateQueries({ queryKey: ['approval-progress', orderId] });
      queryClient.invalidateQueries({ queryKey: ['approval-history', orderId] });
      setShowApprovalDialog(false);
      setApprovalNote('');
    },
    onError: (error) => {
      toast({
        title: '승인 실패',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/approvals/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note: rejectReason })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject order');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '반려 완료',
        description: '발주서가 반려되었습니다.',
      });
      queryClient.invalidateQueries({ queryKey: ['approval-progress', orderId] });
      queryClient.invalidateQueries({ queryKey: ['approval-history', orderId] });
      setShowRejectDialog(false);
      setRejectReason('');
    },
    onError: (error) => {
      toast({
        title: '반려 실패',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: ko });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'updated':
        return <FileCheck className="h-4 w-4 text-yellow-600" />;
      default:
        return <History className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: '발주서 생성',
      approved: '승인',
      rejected: '반려',
      updated: '수정',
      sent: '발송'
    };
    return labels[action] || action;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              발주서 상세 정보 - {orderNumber}
            </DialogTitle>
            <DialogDescription>
              발주서의 상세 내용과 승인 진행 상황을 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="progress">승인 진행</TabsTrigger>
              <TabsTrigger value="history">이력</TabsTrigger>
              <TabsTrigger value="attachments">첨부파일</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(90vh-200px)] mt-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {isLoadingOrder ? (
                  <div className="text-center py-8">로딩 중...</div>
                ) : orderDetail ? (
                  <>
                    {/* Order Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">발주 정보</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-gray-500">프로젝트</Label>
                            <p className="text-sm font-medium">{orderDetail.projectName}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">거래처</Label>
                            <p className="text-sm font-medium">{orderDetail.vendorName}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">총 금액</Label>
                            <p className="text-sm font-medium text-blue-600">
                              {formatKoreanWon(orderDetail.totalAmount)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">상태</Label>
                            <Badge className="mt-1">{orderDetail.status}</Badge>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">작성자</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {orderDetail.createdBy.name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{orderDetail.createdBy.name}</p>
                                <p className="text-xs text-gray-500">{orderDetail.createdBy.email}</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">작성일</Label>
                            <p className="text-sm">{formatDate(orderDetail.createdAt)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Vendor Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">거래처 정보</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-500">업체명</p>
                              <p className="text-sm font-medium">{orderDetail.vendor.vendorName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-500">담당자</p>
                              <p className="text-sm font-medium">{orderDetail.vendor.contactPerson}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-500">연락처</p>
                              <p className="text-sm">{orderDetail.vendor.contactPhone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-500">이메일</p>
                              <p className="text-sm">{orderDetail.vendor.contactEmail}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500">주소</p>
                            <p className="text-sm">{orderDetail.vendor.address}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Order Items */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">발주 품목</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2">품목명</th>
                                <th className="text-left py-2">규격</th>
                                <th className="text-right py-2">수량</th>
                                <th className="text-right py-2">단가</th>
                                <th className="text-right py-2">금액</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderDetail.items.map((item) => (
                                <tr key={item.id} className="border-b">
                                  <td className="py-2">{item.itemName}</td>
                                  <td className="py-2 text-gray-600">{item.specification}</td>
                                  <td className="py-2 text-right">{item.quantity}</td>
                                  <td className="py-2 text-right">
                                    {formatKoreanWon(item.unitPrice)}
                                  </td>
                                  <td className="py-2 text-right font-medium">
                                    {formatKoreanWon(item.totalPrice)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={4} className="py-2 text-right font-medium">
                                  총 합계:
                                </td>
                                <td className="py-2 text-right font-bold text-blue-600">
                                  {formatKoreanWon(orderDetail.totalAmount)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      발주서 정보를 불러올 수 없습니다.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress">
                <ApprovalProgressViewer
                  orderId={orderId}
                  showActions={canApprove}
                  onApprove={(stepId) => setShowApprovalDialog(true)}
                  onReject={(stepId) => setShowRejectDialog(true)}
                />
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">승인 이력</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingHistory ? (
                      <div className="text-center py-8">로딩 중...</div>
                    ) : approvalHistory && approvalHistory.length > 0 ? (
                      <div className="space-y-4">
                        {approvalHistory.map((history, index) => (
                          <div key={history.id} className="relative">
                            {index < approvalHistory.length - 1 && (
                              <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200" />
                            )}
                            <div className="flex gap-3">
                              <div className="flex-shrink-0">
                                {getActionIcon(history.action)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">
                                    {getActionLabel(history.action)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(history.performedAt), {
                                      addSuffix: true,
                                      locale: ko
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-xs">
                                      {history.performedBy.name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{history.performedBy.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {history.performedBy.role}
                                  </Badge>
                                </div>
                                {history.note && (
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                    {history.note}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        승인 이력이 없습니다.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Attachments Tab */}
              <TabsContent value="attachments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">첨부파일</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderDetail && orderDetail.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {orderDetail.attachments.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <Paperclip className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">{file.fileName}</p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(file.fileSize)} • {formatDate(file.uploadedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(file.url, '_blank')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                보기
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = file.url;
                                  a.download = file.fileName;
                                  a.click();
                                }}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                다운로드
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        첨부파일이 없습니다.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="gap-2">
            {canApprove && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  반려
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setShowApprovalDialog(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  승인
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>발주서 승인</DialogTitle>
            <DialogDescription>
              이 발주서를 승인하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>승인 메모 (선택)</Label>
              <Textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="승인과 관련된 메모를 입력하세요..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
            >
              취소
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? '처리 중...' : '승인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>발주서 반려</DialogTitle>
            <DialogDescription>
              이 발주서를 반려하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>반려 사유 (필수)</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="반려 사유를 입력하세요..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? '처리 중...' : '반려'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}