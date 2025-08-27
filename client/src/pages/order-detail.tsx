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
import { ExcelUploadFileInfo } from "@/components/excel-upload-file-info";
import { format } from "date-fns";
import { formatKoreanWon } from "@/lib/utils";
import { useTheme } from "@/components/ui/theme-provider";

export default function OrderDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const [showPreview, setShowPreview] = useState(false);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const orderId = parseInt(params.id);

  // Parse delivery information from notes
  const parseDeliveryInfo = (notes: string | null) => {
    if (!notes) return { deliveryPlace: null, deliveryEmail: null };
    
    const deliveryPlaceMatch = notes.match(/납품처:\s*([^\n]+)/);
    const deliveryEmailMatch = notes.match(/납품처 이메일:\s*([^\n]+)/);
    
    return {
      deliveryPlace: deliveryPlaceMatch ? deliveryPlaceMatch[1].trim() : null,
      deliveryEmail: deliveryEmailMatch ? deliveryEmailMatch[1].trim() : null,
    };
  };

  const { data: order, isLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    queryFn: () => apiRequest("GET", `/api/orders/${orderId}`),
  });
  
  // 디버깅: order 데이터 로그
  console.log('🔴 ORDER DETAIL PAGE - Full order data:', order);
  console.log('🔴 ORDER DETAIL PAGE - Attachments:', order?.attachments);
  console.log('🔴 ORDER DETAIL PAGE - Attachments count:', order?.attachments?.length);
  console.log('🔴 ORDER DETAIL PAGE - Items:', order?.items);
  console.log('Order detail - attachments check:', {
    hasOrder: !!order,
    hasAttachments: !!order?.attachments,
    attachmentsLength: order?.attachments?.length,
    attachments: order?.attachments
  });

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
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
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
    
    // Status colors with dark mode support
    const getStatusStyles = (status: string) => {
      switch (status) {
        case "pending_approval":
          return isDarkMode 
            ? "bg-yellow-900/20 text-yellow-400 border-yellow-700" 
            : "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "approved":
          return isDarkMode 
            ? "bg-green-900/20 text-green-400 border-green-700" 
            : "bg-green-100 text-green-800 border-green-200";
        case "sent":
          return isDarkMode 
            ? "bg-blue-900/20 text-blue-400 border-blue-700" 
            : "bg-blue-100 text-blue-800 border-blue-200";
        case "rejected":
          return isDarkMode 
            ? "bg-red-900/20 text-red-400 border-red-700" 
            : "bg-red-100 text-red-800 border-red-200";
        default:
          return isDarkMode 
            ? "bg-gray-700 text-gray-300 border-gray-600" 
            : "bg-gray-100 text-gray-800 border-gray-200";
      }
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border transition-colors ${getStatusStyles(status)}`}>
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
      <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1366px] mx-auto">
          <div className={`border-b transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="px-6 py-4">
              <div className="animate-pulse space-y-2">
                <div className={`h-4 rounded w-1/4 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                <div className={`h-8 rounded w-1/2 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-6">
            <div className="animate-pulse space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-20 rounded transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                ))}
              </div>
              <div className={`h-32 rounded transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
              <div className={`h-48 rounded transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1366px] mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className={`text-xl font-semibold mb-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>발주서를 찾을 수 없습니다</h2>
              <p className={`mb-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>요청하신 발주서가 존재하지 않거나 접근 권한이 없습니다.</p>
              <Button 
                onClick={() => navigate("/orders")}
                className={`shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                발주서 목록으로 돌아가기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canApprove = user?.role === "admin" && order.status === "pending_approval";
  const canSend = order.status === "approved";
  const canEdit = order.status !== "sent" && order.status !== "received";

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1366px] mx-auto">
        {/* Page Header */}
        <div className={`shadow-sm border-b transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/orders")} 
                className={`no-print h-8 px-2 transition-colors ${isDarkMode ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                aria-label="발주서 목록으로 돌아가기"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <FileText className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h1 className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.orderNumber}</h1>
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {order.vendor?.name} • {order.orderDate ? format(new Date(order.orderDate), 'MM.dd') : '날짜 미정'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {getStatusBadge(order.status)}
              <div className="text-right">
                <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>총 발주금액</p>
                <p className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatKoreanWon(order.totalAmount)}</p>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 no-print">
            {canEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/orders/${orderId}/edit`)} 
                className={`h-8 px-3 text-xs transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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
                className={`h-8 px-3 text-xs shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
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
                className={`h-8 px-3 text-xs shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                <Send className="h-4 w-4 mr-1" />
                발송
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowPreview(true)} 
              className={`h-8 px-3 text-xs transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <Eye className="h-4 w-4 mr-1" />
              미리보기
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-4 space-y-4">

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Status Card */}
          <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-3">
              <span className={`text-xs block mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>진행 상태</span>
              <div>
                {getStatusBadge(order.status)}
              </div>
            </div>
          </div>

          {/* Amount Card */}
          <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-xs block mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>발주 금액</span>
                  <span className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {formatKoreanWon(order.totalAmount)}
                  </span>
                </div>
                <DollarSign className={`h-4 w-4 mt-0.5 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>

          {/* Items Count Card */}
          <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-xs block mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>품목 수</span>
                  <span className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.items?.length || 0}개</span>
                </div>
                <Package className={`h-4 w-4 mt-0.5 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>

          {/* Delivery Date Card */}
          <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-xs block mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>납기일</span>
                  <span className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {order.deliveryDate ? format(new Date(order.deliveryDate), 'MM.dd') : "미정"}
                  </span>
                </div>
                <Calendar className={`h-4 w-4 mt-0.5 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Order Details */}
          <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-4 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center">
                <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <FileText className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>발주서 정보</h3>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>발주번호</span>
                  <span className={`font-semibold transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.orderNumber}</span>
                </div>
                <div>
                  <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>발주일</span>
                  <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {order.orderDate ? format(new Date(order.orderDate), 'yyyy.MM.dd') : "-"}
                  </span>
                </div>
                <div>
                  <span className={`block text-xs transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>시스템 등록일</span>
                  <span className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {order.createdAt ? format(new Date(order.createdAt), 'yyyy.MM.dd HH:mm') : "-"}
                  </span>
                </div>
                <div>
                  <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>담당자</span>
                  <div className="flex items-center gap-1">
                    <User className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {order.user?.firstName && order.user?.lastName 
                        ? `${order.user.lastName}${order.user.firstName}` 
                        : order.user?.email || "알 수 없음"}
                    </span>
                  </div>
                </div>
                <div>
                  <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>납기일</span>
                  <div className="flex items-center gap-1">
                    <Clock className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {order.deliveryDate ? format(new Date(order.deliveryDate), 'yyyy.MM.dd') : "-"}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Delivery Information */}
              {(() => {
                const deliveryInfo = parseDeliveryInfo(order.notes);
                return (deliveryInfo.deliveryPlace || deliveryInfo.deliveryEmail) ? (
                  <div className={`pt-3 mt-3 border-t transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <span className={`text-sm block mb-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>납품처 정보</span>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {deliveryInfo.deliveryPlace && (
                        <div>
                          <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>납품처명</span>
                          <div className="flex items-center gap-1">
                            <MapPin className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              {deliveryInfo.deliveryPlace}
                            </span>
                          </div>
                        </div>
                      )}
                      {deliveryInfo.deliveryEmail && (
                        <div>
                          <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>납품처 이메일</span>
                          <div className="flex items-center gap-1">
                            <Mail className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              {deliveryInfo.deliveryEmail}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}
              
              {order.notes && (
                <div className={`pt-4 border-t transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <span className={`text-sm block mb-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>비고</span>
                  <div className={`text-sm p-3 rounded transition-colors ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
                    {order.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vendor Information */}
          {order.vendor && (
            <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`p-4 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                    <Building2 className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>거래처 정보</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="space-y-2">
                  <div>
                    <span className={`text-xs block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>업체명</span>
                    <button
                      className={`text-sm font-medium cursor-pointer focus:outline-none focus:ring-1 rounded transition-all text-left ${isDarkMode ? 'text-blue-400 hover:text-blue-300 focus:ring-blue-400' : 'text-blue-600 hover:text-blue-700 focus:ring-blue-500'}`}
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
                      <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>담당자</span>
                      <div className="flex items-center gap-1">
                        <User className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.vendor.contact || "-"}</span>
                      </div>
                    </div>
                    <div>
                      <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>전화번호</span>
                      <div className="flex items-center gap-1">
                        <Phone className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.vendor.phone || "-"}</span>
                      </div>
                    </div>
                  </div>
                  
                  {order.vendor.email && (
                    <div>
                      <span className={`text-xs block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>이메일</span>
                      <div className="flex items-center gap-1">
                        <Mail className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className={`text-xs transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.vendor.email}</span>
                      </div>
                    </div>
                  )}
                  
                  {order.vendor.address && (
                    <div>
                      <span className={`text-xs block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>주소</span>
                      <div className="flex items-start gap-1">
                        <MapPin className={`h-3 w-3 mt-0.5 flex-shrink-0 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className={`text-xs transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.vendor.address}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Project Information */}
          {order.project && (
            <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`p-4 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                    <Building2 className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>현장 정보</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="space-y-2">
                  <div>
                    <span className={`text-xs block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>현장명</span>
                    <button
                      className={`text-sm font-medium cursor-pointer focus:outline-none focus:ring-1 rounded transition-all text-left ${isDarkMode ? 'text-blue-400 hover:text-blue-300 focus:ring-blue-400' : 'text-blue-600 hover:text-blue-700 focus:ring-blue-500'}`}
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
                    <span className={`text-xs block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>({order.project.projectCode})</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>담당자</span>
                      <div className="flex items-center gap-1">
                        <User className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.project.projectManager || "-"}</span>
                      </div>
                    </div>
                    <div>
                      <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>위치</span>
                      <div className="flex items-center gap-1">
                        <MapPin className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.project.location || "-"}</span>
                      </div>
                    </div>
                  </div>
                  
                  {order.project.description && (
                    <div>
                      <span className={`text-xs block mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>설명</span>
                      <div className={`text-xs p-2 rounded transition-colors ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
                        {order.project.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Items Section */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-4 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <Package className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>발주 품목</h3>
                  <span className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>총 {order.items?.length || 0}개 품목</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>총 발주금액</span>
                <span className={`text-sm font-semibold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {formatKoreanWon(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={`border-b transition-colors ${isDarkMode ? 'border-gray-600' : 'border-blue-100'}`}>
                    <TableHead className={`text-xs py-1.5 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>품목명</TableHead>
                    <TableHead className={`text-xs py-1.5 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>대분류</TableHead>
                    <TableHead className={`text-xs py-1.5 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>중분류</TableHead>
                    <TableHead className={`text-xs py-1.5 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>소분류</TableHead>
                    <TableHead className={`text-xs py-1.5 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>규격</TableHead>
                    <TableHead className={`text-xs text-center py-2 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>수량</TableHead>
                    <TableHead className={`text-xs text-right py-2 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>단가</TableHead>
                    <TableHead className={`text-xs text-right py-2 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>금액</TableHead>
                    <TableHead className={`text-xs py-1.5 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>비고</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item: any, index: number) => (
                    <TableRow 
                      key={index} 
                      className={`border-b transition-colors ${isDarkMode ? 'border-gray-600 hover:bg-gray-700/30' : 'border-blue-100 hover:bg-blue-50/30'}`}
                    >
                      <TableCell className="py-1.5 px-2">
                        <div className="flex items-center gap-1">
                          <Package className={`h-3 w-3 flex-shrink-0 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                          <div>
                            <span className={`font-medium text-xs block transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{item.itemName}</span>
                            {item.specification && (
                              <span className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.specification}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={`py-2 px-2 text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {item.majorCategory && item.majorCategory.trim() ? item.majorCategory : "-"}
                      </TableCell>
                      <TableCell className={`py-2 px-2 text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {item.middleCategory && item.middleCategory.trim() ? item.middleCategory : "-"}
                      </TableCell>
                      <TableCell className={`py-2 px-2 text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {item.minorCategory && item.minorCategory.trim() ? item.minorCategory : "-"}
                      </TableCell>
                      <TableCell className={`py-2 px-2 text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {item.specification || "-"}
                      </TableCell>
                      <TableCell className="text-center py-2 px-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                          {typeof item.quantity === 'number' ? item.quantity.toLocaleString() : item.quantity || "-"}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right py-2 px-2 font-medium text-xs transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {formatKoreanWon(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right py-2 px-2">
                        <span className={`font-semibold text-xs transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {formatKoreanWon(item.totalAmount)}
                        </span>
                      </TableCell>
                      <TableCell className={`py-2 px-2 text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {item.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Summary */}
            <div className={`mt-4 pt-4 border-t transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex justify-end">
                <div className={`rounded p-3 min-w-[160px] transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>총 발주금액</span>
                    <span className={`text-sm font-semibold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {formatKoreanWon(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Excel Upload File Info - Always render if attachments exist */}
        {(() => {
          console.log('🔍 ORDER DETAIL - Debug Excel Section:', {
            hasOrder: !!order,
            attachments: order?.attachments,
            attachmentsLength: order?.attachments?.length,
            orderId: orderId,
            shouldRender: !!(order?.attachments && order.attachments.length > 0)
          });
          
          if (order?.attachments && order.attachments.length > 0) {
            console.log('✅ ORDER DETAIL - Rendering ExcelUploadFileInfo with:', order.attachments);
            return <ExcelUploadFileInfo attachments={order.attachments} orderId={orderId} />;
          }
          
          console.log('⚠️ ORDER DETAIL - NOT rendering ExcelUploadFileInfo');
          return null;
        })()}

        {/* TOSS-style Compact Management Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
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

        {/* Other Attachments (non-Excel files) */}
        {order.attachments && order.attachments.length > 0 && (() => {
          // Filter out Excel files to show only other attachments
          const otherFiles = order.attachments.filter((attachment: any) => 
            !attachment.mimeType?.includes('excel') && 
            !attachment.mimeType?.includes('spreadsheet') &&
            !attachment.originalName?.toLowerCase().endsWith('.xlsx') &&
            !attachment.originalName?.toLowerCase().endsWith('.xls')
          );

          if (otherFiles.length === 0) return null;

          return (
            <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`p-6 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                    <Archive className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>기타 첨부파일</h3>
                    <span className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>총 {otherFiles.length}개 파일</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {otherFiles.map((attachment: any) => (
                    <div key={attachment.id} className={`flex items-center justify-between p-3 border rounded-lg transition-all ${isDarkMode ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <div className="min-w-0 flex-1">
                          <span className={`text-xs font-medium truncate block transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`} title={attachment.originalName || attachment.filename}>
                            {attachment.originalName || attachment.filename}
                          </span>
                          <span className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            첨부파일
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`ml-2 flex-shrink-0 h-7 px-2 text-xs transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/orders/${orderId}/attachments/${attachment.id}/download`, {
                              method: 'GET',
                              headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                              },
                            });

                            if (!response.ok) {
                              throw new Error('파일 다운로드에 실패했습니다');
                            }

                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = attachment.originalName || attachment.filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                          } catch (error) {
                            console.error('Download error:', error);
                          }
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        다운로드
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* TOSS-style Compact PDF Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className={`max-w-[1366px] max-h-[90vh] overflow-y-auto transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  <div>
                    <span className={`text-sm font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>발주서 미리보기</span>
                    <span className={`text-xs block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{order?.orderNumber}</span>
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
                    className={`h-8 px-2 text-xs transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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
    </div>
  );
}