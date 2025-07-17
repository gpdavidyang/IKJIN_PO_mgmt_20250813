import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Edit, Send, Check, FileText, Download, Eye, Printer } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { InvoiceManager } from "@/components/invoice-manager";
import { ReceiptManager } from "@/components/receipt-manager";
import { OrderPreviewSimple } from "@/components/order-preview-simple";
import { format } from "date-fns";
import { formatKoreanWon } from "@/lib/utils";

interface OrderDetailProps {
  params: { id: string };
}

export default function OrderDetail({ params }: OrderDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showPreview, setShowPreview] = useState(false);
  const orderId = parseInt(params.id);

  const { data: order, isLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
  });
  
  // 디버깅: order 데이터 로그
  console.log('Order detail - full order data:', order);
  console.log('Order detail - items:', order?.items);

  const { data: orderStatuses } = useQuery({
    queryKey: ["/api/order-statuses"],
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/orders/${orderId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "발주서 승인",
        description: "발주서가 성공적으로 승인되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error) => {
      toast({
        title: "승인 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/orders/${orderId}/send`);
    },
    onSuccess: () => {
      toast({
        title: "발주서 발송",
        description: "발주서가 성공적으로 발송되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error) => {
      toast({
        title: "발송 실패", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusObj = orderStatuses?.find((s: any) => s.code === status);
    const statusLabel = statusObj ? statusObj.name : status;
    
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    if (statusObj) {
      switch (statusObj.color) {
        case "yellow":
          variant = "secondary";
          break;
        case "blue":
        case "green":
          variant = "default";
          break;
        case "red":
          variant = "destructive";
          break;
        default:
          variant = "outline";
          break;
      }
    }
    
    return <Badge variant={variant}>{statusLabel}</Badge>;
  };



  const handleApprove = () => {
    if (confirm("이 발주서를 승인하시겠습니까?")) {
      approveMutation.mutate();
    }
  };

  const handleSend = () => {
    if (confirm("이 발주서를 거래처에 발송하시겠습니까?")) {
      sendMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">발주서를 찾을 수 없습니다</h1>
          <Button onClick={() => navigate("/orders")}>
            발주서 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const canApprove = user?.role === "admin" && order.status === "pending_approval";
  const canSend = order.status === "approved";
  const canEdit = order.status !== "sent" && order.status !== "received";

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/orders")} className="no-print">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록
            </Button>
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              <p className="text-sm text-gray-600 mt-1">
                발주서 상세 정보
              </p>
            </div>
            {getStatusBadge(order.status)}
          </div>
          
          <div className="flex space-x-2 no-print">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/orders/${orderId}/edit`)}>
                <Edit className="h-3 w-3 mr-1" />
                수정
              </Button>
            )}
            {canApprove && (
              <Button size="sm" onClick={handleApprove} disabled={approveMutation.isPending}>
                <Check className="h-3 w-3 mr-1" />
                승인
              </Button>
            )}
            {canSend && (
              <Button size="sm" onClick={handleSend} disabled={sendMutation.isPending}>
                <Send className="h-3 w-3 mr-1" />
                발송
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
              <Eye className="h-3 w-3 mr-1" />
              미리보기
            </Button>
          </div>
        </div>
      </div>

      {/* Order Information */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">발주서 정보</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500">발주번호</label>
              <p className="text-xs font-semibold">{order.orderNumber}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">거래처</label>
              <p 
                className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                onClick={() => order.vendor?.id && navigate(`/vendors/${order.vendor.id}`)}
              >
                {order.vendor?.name || "알 수 없음"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">발주일</label>
              <p className="text-xs">{order.orderDate ? format(new Date(order.orderDate), 'yyyy-MM-dd') : "-"}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">납기일</label>
              <p className="text-xs">{order.deliveryDate ? format(new Date(order.deliveryDate), 'yyyy-MM-dd') : "-"}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">총금액</label>
              <p className="text-xs font-bold text-blue-600">{formatKoreanWon(order.totalAmount)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">발주담당자</label>
              <p className="text-xs">
                {order.user?.firstName && order.user?.lastName 
                  ? `${order.user.lastName}${order.user.firstName}` 
                  : order.user?.email || "알 수 없음"}
              </p>
            </div>
            {order.project && (
              <div>
                <label className="text-xs font-medium text-gray-500">현장</label>
                <p 
                  className="text-xs font-medium text-green-600 hover:text-green-800 cursor-pointer"
                  onClick={() => navigate(`/projects/${order.project.id}`)}
                >
                  {order.project.projectName}
                </p>
                <p className="text-xs text-gray-500">({order.project.projectCode})</p>
              </div>
            )}
          </div>
          
          {order.notes && (
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-500">비고</label>
              <p className="text-xs mt-1 p-2 bg-gray-50 rounded border">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">발주 품목</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs py-1">품목명</TableHead>
                  <TableHead className="text-xs py-1">규격</TableHead>
                  <TableHead className="text-xs text-right py-1">수량</TableHead>
                  <TableHead className="text-xs text-right py-1">단가</TableHead>
                  <TableHead className="text-xs text-right py-1">금액</TableHead>
                  <TableHead className="text-xs py-1">비고</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-xs py-1 px-2">{item.itemName}</TableCell>
                    <TableCell className="text-xs py-1 px-2">{item.specification || "-"}</TableCell>
                    <TableCell className="text-right text-xs py-1 px-2">{typeof item.quantity === 'number' ? item.quantity.toLocaleString() : item.quantity || "-"}</TableCell>
                    <TableCell className="text-right text-xs py-1 px-2 font-semibold text-blue-600">{formatKoreanWon(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-semibold text-xs py-1 px-2 text-blue-600">{formatKoreanWon(item.totalAmount)}</TableCell>
                    <TableCell className="text-xs py-1 px-2">{item.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-end mt-1 pt-1 border-t">
            <div className="text-right">
              <p className="text-xs font-bold">
                총 합계: {formatKoreanWon(order.totalAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Information */}
      {order.vendor && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">거래처 정보</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">업체명</label>
                <p className="text-xs">{order.vendor.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">담당자</label>
                <p className="text-xs">{order.vendor.contact || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">전화번호</label>
                <p className="text-xs">{order.vendor.phone || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">이메일</label>
                <p className="text-xs">{order.vendor.email || "-"}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500">주소</label>
                <p className="text-xs">{order.vendor.address || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Information */}
      {order.project && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">현장 정보</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">현장명</label>
                <p 
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  onClick={() => navigate(`/projects/${order.project.id}`)}
                >
                  {order.project.projectName}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">현장 코드</label>
                <p className="text-sm">{order.project.projectCode}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">발주담당자</label>
                <p className="text-sm">{order.project.projectManager || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">위치</label>
                <p className="text-sm">{order.project.location || "-"}</p>
              </div>
              {order.project.description && (
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-500">현장 설명</label>
                  <p className="text-xs mt-1 p-2 bg-gray-50 rounded border">{order.project.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {/* Invoice Management */}
      <InvoiceManager orderId={orderId} />

      {/* Material Receipt Confirmation */}
      {order.items && order.items.length > 0 && (
        <ReceiptManager orderItems={order.items} orderId={orderId} />
      )}

      {order.attachments && order.attachments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">첨부파일</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-1">
              {order.attachments.map((attachment: any) => (
                <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-xs">{attachment.filename}</span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    <span className="text-xs">다운로드</span>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>발주서 미리보기</span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>발주서 - ${order?.orderNumber}</title>
                            <style>
                              body { margin: 0; font-family: Arial, sans-serif; }
                              @media print {
                                body { margin: 0; }
                                .no-print { display: none !important; }
                              }
                            </style>
                          </head>
                          <body>
                            ${document.querySelector('.order-preview-content')?.innerHTML || ''}
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  PDF 출력
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="order-preview-content">
            {order && <OrderPreviewSimple order={order} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}