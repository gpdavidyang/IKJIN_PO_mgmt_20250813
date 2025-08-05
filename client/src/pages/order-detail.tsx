import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Edit, 
  Send, 
  Check, 
  FileText, 
  Download, 
  Eye, 
  Printer,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Package,
  User,
  Clock,
  Archive
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { InvoiceManager } from "@/components/invoice-manager";
import { ReceiptManager } from "@/components/receipt-manager";
import { OrderPreviewSimple } from "@/components/order-preview-simple";
import { format } from "date-fns";
import { formatKoreanWon } from "@/lib/utils";

export default function OrderDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const [showPreview, setShowPreview] = useState(false);
  const orderId = parseInt(params.id);

  const { data: order, isLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    queryFn: () => apiRequest("GET", `/api/orders/${orderId}`),
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
    
    // TOSS-style status colors - minimal semantic colors only
    const getStatusStyles = (status: string) => {
      switch (status) {
        case "pending_approval":
          return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "approved":
          return "bg-green-100 text-green-800 border-green-200";
        case "sent":
          return "bg-blue-100 text-blue-800 border-blue-200";
        case "rejected":
          return "bg-red-100 text-red-800 border-red-200";
        default:
          return "bg-gray-100 text-gray-800 border-gray-200";
      }
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getStatusStyles(status)}`}>
        {statusLabel}
      </span>
    );
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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-3 py-3">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
        <div className="px-3 py-3 space-y-2">
          <div className="animate-pulse space-y-2">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded border border-gray-200 p-6 text-center max-w-md">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">발주서를 찾을 수 없습니다</h1>
          <p className="text-sm text-gray-600 mb-4">요청하신 발주서가 존재하지 않거나 접근 권한이 없습니다.</p>
          <Button 
            onClick={() => navigate("/orders")}
            className="h-9 px-4 text-sm"
          >
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto">
        {/* TOSS-style Clean Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/orders")} 
                className="no-print h-8 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="발주서 목록으로 돌아가기"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-600" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{order.orderNumber}</h1>
                  <p className="text-sm text-gray-500">
                    {order.vendor?.name} • {order.orderDate ? format(new Date(order.orderDate), 'MM.dd') : '날짜 미정'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {getStatusBadge(order.status)}
              <div className="text-right">
                <p className="text-sm text-gray-500">총 발주금액</p>
                <p className="text-lg font-bold text-gray-900">{formatKoreanWon(order.totalAmount)}</p>
              </div>
            </div>
          </div>
          
          {/* TOSS-style Compact Action Buttons */}
          <div className="flex gap-1 mt-2 no-print">
            {canEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/orders/${orderId}/edit`)} 
                className="h-8 px-2 text-xs"
              >
                <Edit className="h-4 w-4 mr-1" />
                수정
              </Button>
            )}
            {canApprove && (
              <Button 
                size="sm" 
                onClick={handleApprove} 
                disabled={approveMutation.isPending} 
                className="h-8 px-2 text-xs bg-blue-600 hover:bg-blue-700"
              >
                <Check className="h-4 w-4 mr-1" />
                승인
              </Button>
            )}
            {canSend && (
              <Button 
                size="sm" 
                onClick={handleSend} 
                disabled={sendMutation.isPending} 
                className="h-8 px-2 text-xs bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-1" />
                발송
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowPreview(true)} 
              className="h-8 px-2 text-xs"
            >
              <Eye className="h-4 w-4 mr-1" />
              미리보기
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 space-y-6">

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Card */}
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-600 block">진행 상태</span>
                <div className="mt-1">
                  {getStatusBadge(order.status)}
                </div>
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Amount Card */}
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600 block">발주 금액</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatKoreanWon(order.totalAmount)}
                  </span>
                </div>
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* Items Count Card */}
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600 block">품목 수</span>
                  <span className="text-lg font-bold text-gray-900">{order.items?.length || 0}개</span>
                </div>
                <Package className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Date Card */}
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600 block">납기일</span>
                  <span className="text-lg font-bold text-gray-900">
                    {order.deliveryDate ? format(new Date(order.deliveryDate), 'MM.dd') : "미정"}
                  </span>
                </div>
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <Card className="shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">발주서 정보</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 block">발주번호</span>
                <span className="font-semibold text-gray-900">{order.orderNumber}</span>
              </div>
              <div>
                <span className="text-gray-600 block">발주일</span>
                <span className="text-gray-900">
                  {order.orderDate ? format(new Date(order.orderDate), 'yyyy.MM.dd') : "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-600 block">담당자</span>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">
                    {order.user?.firstName && order.user?.lastName 
                      ? `${order.user.lastName}${order.user.firstName}` 
                      : order.user?.email || "알 수 없음"}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-600 block">납기일</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">
                    {order.deliveryDate ? format(new Date(order.deliveryDate), 'yyyy.MM.dd') : "-"}
                  </span>
                </div>
              </div>
            </div>
            
            {order.notes && (
              <div className="pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-600 block mb-2">비고</span>
                <div className="text-sm p-3 bg-gray-50 rounded text-gray-700">
                  {order.notes}
                </div>
              </div>
            )}
            </CardContent>
          </Card>

          {/* Vendor Information */}
          {order.vendor && (
            <Card className="shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">거래처 정보</h3>
                </div>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-600 block">업체명</span>
                  <button
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 rounded transition-all text-left"
                    onClick={() => order.vendor?.id && navigate(`/vendors/${order.vendor.id}`)}
                    title="거래처 상세보기"
                    aria-label={`거래처 ${order.vendor.name} 상세보기`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        order.vendor?.id && navigate(`/vendors/${order.vendor.id}`);
                      }
                    }}
                  >
                    {order.vendor.name}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600 block">담당자</span>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-900">{order.vendor.contact || "-"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 block">전화번호</span>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-900">{order.vendor.phone || "-"}</span>
                    </div>
                  </div>
                </div>
                
                {order.vendor.email && (
                  <div>
                    <span className="text-xs text-gray-600 block">이메일</span>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-900">{order.vendor.email}</span>
                    </div>
                  </div>
                )}
                
                {order.vendor.address && (
                  <div>
                    <span className="text-xs text-gray-600 block">주소</span>
                    <div className="flex items-start gap-1">
                      <MapPin className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-900">{order.vendor.address}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project Information */}
          {order.project && (
            <Card className="shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">현장 정보</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-600 block">현장명</span>
                    <button
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 rounded transition-all text-left"
                      onClick={() => navigate(`/projects/${order.project.id}`)}
                      title="현장 상세보기"
                      aria-label={`현장 ${order.project.projectName} 상세보기`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/projects/${order.project.id}`);
                        }
                      }}
                    >
                      {order.project.projectName}
                    </button>
                    <span className="text-xs text-gray-500 block">({order.project.projectCode})</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600 block">담당자</span>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-900">{order.project.projectManager || "-"}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 block">위치</span>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-900">{order.project.location || "-"}</span>
                      </div>
                    </div>
                  </div>
                  
                  {order.project.description && (
                    <div>
                      <span className="text-xs text-gray-600 block mb-1">설명</span>
                      <div className="text-xs p-2 bg-gray-50 rounded text-gray-700">
                        {order.project.description}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* TOSS-style High-Density Items Section */}
        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">발주 품목</h3>
                <span className="text-sm text-gray-500">총 {order.items?.length || 0}개 품목</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">총 발주금액</span>
              <span className="text-sm font-semibold text-blue-600">
                {formatKoreanWon(order.totalAmount)}
              </span>
            </div>
          </div>
          <div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-blue-100">
                    <TableHead className="text-xs py-2 px-2 font-medium text-gray-600">품목명</TableHead>
                    <TableHead className="text-xs py-2 px-2 font-medium text-gray-600">규격</TableHead>
                    <TableHead className="text-xs text-center py-2 px-2 font-medium text-gray-600">수량</TableHead>
                    <TableHead className="text-xs text-right py-2 px-2 font-medium text-gray-600">단가</TableHead>
                    <TableHead className="text-xs text-right py-2 px-2 font-medium text-gray-600">금액</TableHead>
                    <TableHead className="text-xs py-2 px-2 font-medium text-gray-600">비고</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item: any, index: number) => (
                    <TableRow 
                      key={index} 
                      className="border-b border-blue-100 hover:bg-blue-50/30 transition-colors"
                    >
                      <TableCell className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-xs text-gray-900 block">{item.itemName}</span>
                            {item.specification && (
                              <span className="text-xs text-gray-500">{item.specification}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2 text-xs text-gray-700">
                        {item.specification || "-"}
                      </TableCell>
                      <TableCell className="text-center py-2 px-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {typeof item.quantity === 'number' ? item.quantity.toLocaleString() : item.quantity || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2 px-2 font-medium text-xs text-blue-600">
                        {formatKoreanWon(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right py-2 px-2">
                        <span className="font-semibold text-xs text-blue-600">
                          {formatKoreanWon(item.totalAmount)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-2 text-xs text-gray-700">
                        {item.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* TOSS-style Compact Summary */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="bg-gray-50 rounded p-2 min-w-[140px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">총 발주금액</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {formatKoreanWon(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* TOSS-style Compact Management Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
          {/* Invoice Management */}
          <div>
            <InvoiceManager orderId={orderId} />
          </div>

          {/* Material Receipt Confirmation */}
          {order.items && order.items.length > 0 && (
            <div>
              <ReceiptManager orderItems={order.items} orderId={orderId} />
            </div>
          )}
        </div>

        {/* TOSS-style Compact Attachments */}
        {order.attachments && order.attachments.length > 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-gray-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">첨부파일</h3>
                  <span className="text-sm text-gray-500">총 {order.attachments.length}개 파일</span>
                </div>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {order.attachments.map((attachment: any) => (
                <div key={attachment.id} className="flex items-center justify-between p-2 border border-gray-200 rounded hover:border-gray-300 hover:bg-gray-50 transition-all">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-gray-900 truncate block" title={attachment.filename}>
                        {attachment.filename}
                      </span>
                      <span className="text-xs text-gray-500">
                        첨부파일
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="ml-2 flex-shrink-0 h-7 px-2 text-xs">
                    <Download className="h-3 w-3 mr-1" />
                    다운로드
                  </Button>
                </div>
              ))}
            </div>
            </CardContent>
          </Card>
        )}

        {/* TOSS-style Compact PDF Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-[1366px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gray-600" />
                  <div>
                    <span className="text-sm font-semibold text-gray-900">발주서 미리보기</span>
                    <span className="text-xs text-gray-500 block">{order?.orderNumber}</span>
                  </div>
                </div>
                <div className="flex space-x-1">
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
                    className="h-8 px-2 text-xs"
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    PDF 출력
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="order-preview-content mt-2">
              {order && <OrderPreviewSimple order={order} />}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}