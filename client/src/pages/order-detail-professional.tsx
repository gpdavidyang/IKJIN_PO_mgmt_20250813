import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Edit, 
  Send, 
  Check, 
  CheckCircle,
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
  Archive,
  ChevronRight,
  TrendingUp,
  X,
  AlertCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { InvoiceManager } from "@/components/invoice-manager";
import { ReceiptManager } from "@/components/receipt-manager";
import { OrderPreviewSimple } from "@/components/order-preview-simple";
import { EmailSendDialog } from "@/components/email-send-dialog";
import { format } from "date-fns";
import { formatKoreanWon } from "@/lib/utils";

export default function OrderDetailProfessional() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const [showPreview, setShowPreview] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const orderId = parseInt(params.id);

  const { data: order, isLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    queryFn: () => apiRequest("GET", `/api/orders/${orderId}`),
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

  // Professional status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    const statusObj = orderStatuses?.find((s: any) => s.code === status);
    return statusObj ? statusObj.name : status;
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

  const handleSendEmail = async (emailData: any) => {
    if (!order) return;

    try {
      const orderData = {
        orderNumber: order.orderNumber,
        vendorName: order.vendor?.name || order.vendorName || '',
        orderDate: order.orderDate,
        totalAmount: order.totalAmount,
        siteName: order.project?.projectName || order.projectName || '',
        filePath: order.filePath || ''
      };

      // EmailService를 import하고 사용 (기존 orders-professional.tsx에서 사용하는 방식과 동일)
      const response = await fetch('/api/orders/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderData,
          ...emailData,
          orderId: order.id
        })
      });

      if (response.ok) {
        toast({
          title: "이메일 발송 완료",
          description: `${order.vendor?.name || order.vendorName}에게 발주서 ${order.orderNumber}를 전송했습니다.`,
        });
        setEmailDialogOpen(false);
        setSelectedOrder(null);
      } else {
        throw new Error('이메일 발송 실패');
      }
    } catch (error) {
      toast({
        title: "이메일 발송 실패",
        description: error instanceof Error ? error.message : "이메일 발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1366px] mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md shadow-sm">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-gray-900 mb-2">발주서를 찾을 수 없습니다</h1>
            <p className="text-sm text-gray-600 mb-6">요청하신 발주서가 존재하지 않거나 접근 권한이 없습니다.</p>
            <Button 
              onClick={() => navigate("/orders")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              발주서 목록으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canApprove = user?.role === "admin" && (order.status === "pending_approval" || order.status === "pending");
  const canSend = order.status === "approved";
  const canEdit = order.status !== "sent" && order.status !== "received";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6">
        {/* Professional Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate("/orders")}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            발주서 목록으로
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              <div className="flex items-center gap-4 mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
                <p className="text-sm text-gray-500">
                  {order.vendor?.name} • {order.orderDate ? format(new Date(order.orderDate), 'yyyy년 MM월 dd일') : '날짜 미정'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {canEdit && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/orders/${orderId}/edit`)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  수정
                </Button>
              )}
              {canApprove && (
                <Button 
                  onClick={handleApprove} 
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  승인
                </Button>
              )}
              {canSend && (
                <Button 
                  onClick={handleSend} 
                  disabled={sendMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  발송
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                PDF 미리보기
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedOrder(order);
                  setEmailDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                이메일
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50/30 rounded-xl shadow-sm p-6 border border-blue-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 발주금액</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {formatKoreanWon(order.totalAmount)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50/30 rounded-xl shadow-sm p-6 border border-blue-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">발주 품목</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{order.items?.length || 0}개</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50/30 rounded-xl shadow-sm p-6 border border-blue-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">납기일</p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  {order.deliveryDate ? format(new Date(order.deliveryDate), 'MM월 dd일') : "미정"}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50/30 rounded-xl shadow-sm p-6 border border-blue-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">작성자</p>
                <p className="text-sm font-medium text-gray-900 mt-2">
                  {order.user?.firstName && order.user?.lastName 
                    ? `${order.user.lastName}${order.user.firstName}` 
                    : order.user?.email || "알 수 없음"}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <User className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Order Information */}
          <Card className="shadow-sm bg-white border-blue-200">
            <CardContent className="p-6 bg-blue-50/20">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">발주서 정보</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">발주번호</p>
                  <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">발주일</p>
                  <p className="text-sm text-gray-900">
                    {order.orderDate ? format(new Date(order.orderDate), 'yyyy년 MM월 dd일') : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">납기일</p>
                  <p className="text-sm text-gray-900">
                    {order.deliveryDate ? format(new Date(order.deliveryDate), 'yyyy년 MM월 dd일') : "-"}
                  </p>
                </div>
                {order.templateId && (
                  <div>
                    <p className="text-sm text-gray-600">사용 템플릿</p>
                    <p className="text-sm text-gray-900">
                      Template ID: {order.templateId}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">작성일시</p>
                  <p className="text-sm text-gray-900">
                    {order.createdAt ? format(new Date(order.createdAt), 'yyyy년 MM월 dd일 HH:mm') : "-"}
                  </p>
                </div>
                {order.updatedAt && order.updatedAt !== order.createdAt && (
                  <div>
                    <p className="text-sm text-gray-600">최종 수정일시</p>
                    <p className="text-sm text-gray-900">
                      {format(new Date(order.updatedAt), 'yyyy년 MM월 dd일 HH:mm')}
                    </p>
                  </div>
                )}
              </div>
              {order.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600 mb-2">비고</p>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                    {order.notes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendor Information */}
          {order.vendor && (
            <Card className="shadow-sm bg-white border-blue-200">
              <CardContent className="p-6 bg-blue-50/20">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">거래처 정보</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">업체명</p>
                    <button
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      onClick={() => order.vendor?.id && navigate(`/vendors/${order.vendor.id}`)}
                    >
                      {order.vendor.name}
                    </button>
                  </div>
                  
                  {order.vendor.contact && (
                    <div>
                      <p className="text-sm text-gray-600">담당자</p>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{order.vendor.contact}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.vendor.phone && (
                    <div>
                      <p className="text-sm text-gray-600">전화번호</p>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{order.vendor.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.vendor.email && (
                    <div>
                      <p className="text-sm text-gray-600">이메일</p>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{order.vendor.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.vendor.address && (
                    <div>
                      <p className="text-sm text-gray-600">주소</p>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <p className="text-sm text-gray-900">{order.vendor.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Information */}
          {order.project && (
            <Card className="shadow-sm bg-white border-blue-200">
              <CardContent className="p-6 bg-blue-50/20">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">현장 정보</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">현장명</p>
                    <button
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      onClick={() => navigate(`/projects/${order.project.id}`)}
                    >
                      {order.project.projectName}
                    </button>
                    <p className="text-xs text-gray-500">({order.project.projectCode})</p>
                  </div>
                  
                  {order.project.projectManager && (
                    <div>
                      <p className="text-sm text-gray-600">담당자</p>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{order.project.projectManager}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.project.location && (
                    <div>
                      <p className="text-sm text-gray-600">위치</p>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{order.project.location}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.project.description && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">설명</p>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                        {order.project.description}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Approval Information */}
        {(order.approvedBy || order.approvedAt || order.currentApproverRole) && (
          <Card className="shadow-sm mb-8 bg-white border-blue-200">
            <CardContent className="p-6 bg-blue-50/20">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">승인 정보</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {order.approvedBy && (
                  <div>
                    <p className="text-sm text-gray-600">승인자</p>
                    <p className="text-sm font-medium text-gray-900">{order.approvedBy}</p>
                  </div>
                )}
                {order.approvedAt && (
                  <div>
                    <p className="text-sm text-gray-600">승인일시</p>
                    <p className="text-sm text-gray-900">
                      {format(new Date(order.approvedAt), 'yyyy년 MM월 dd일 HH:mm')}
                    </p>
                  </div>
                )}
                {order.currentApproverRole && (
                  <div>
                    <p className="text-sm text-gray-600">현재 승인 단계</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {order.currentApproverRole === 'admin' ? '관리자' :
                         order.currentApproverRole === 'executive' ? '임원' :
                         order.currentApproverRole === 'hq_management' ? '본부장' :
                         order.currentApproverRole === 'project_manager' ? '프로젝트매니저' :
                         order.currentApproverRole}
                      </span>
                      {order.approvalLevel && (
                        <span className="text-xs text-gray-500">
                          (Level {order.approvalLevel})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Summary */}
        {order.items?.some((item: any) => item.majorCategory || item.middleCategory || item.minorCategory) && (
          <Card className="shadow-sm mb-6 bg-white border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">품목 분류 요약</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 대분류별 집계 */}
                {(() => {
                  const majorCategories = order.items?.reduce((acc: any, item: any) => {
                    if (item.majorCategory) {
                      acc[item.majorCategory] = (acc[item.majorCategory] || 0) + 1;
                    }
                    return acc;
                  }, {});
                  return Object.keys(majorCategories || {}).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">대분류</p>
                      <div className="space-y-1">
                        {Object.entries(majorCategories || {}).map(([category, count]) => (
                          <div key={category} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{category}</span>
                            <span className="text-blue-600 font-medium">{count}개</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                
                {/* 중분류별 집계 */}
                {(() => {
                  const middleCategories = order.items?.reduce((acc: any, item: any) => {
                    if (item.middleCategory) {
                      acc[item.middleCategory] = (acc[item.middleCategory] || 0) + 1;
                    }
                    return acc;
                  }, {});
                  return Object.keys(middleCategories || {}).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">중분류</p>
                      <div className="space-y-1">
                        {Object.entries(middleCategories || {}).map(([category, count]) => (
                          <div key={category} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{category}</span>
                            <span className="text-blue-600 font-medium">{count}개</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                
                {/* 소분류별 집계 */}
                {(() => {
                  const minorCategories = order.items?.reduce((acc: any, item: any) => {
                    if (item.minorCategory) {
                      acc[item.minorCategory] = (acc[item.minorCategory] || 0) + 1;
                    }
                    return acc;
                  }, {});
                  return Object.keys(minorCategories || {}).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">소분류</p>
                      <div className="space-y-1">
                        {Object.entries(minorCategories || {}).map(([category, count]) => (
                          <div key={category} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{category}</span>
                            <span className="text-blue-600 font-medium">{count}개</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items Section */}
        <Card className="shadow-sm mb-8 bg-white border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">발주 품목</h3>
                <span className="text-sm text-gray-500">총 {order.items?.length || 0}개 품목</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">총 발주금액</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatKoreanWon(order.totalAmount)}
                </p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-50 border-b border-blue-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">품목명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대분류</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">중분류</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">소분류</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">규격</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">수량</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">단위</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">단가</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비고</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items?.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {item.majorCategory || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {item.middleCategory || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {item.minorCategory || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.specification || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {typeof item.quantity === 'number' ? item.quantity.toLocaleString() : item.quantity || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.unit || "EA"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatKoreanWon(item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-blue-600">
                          {formatKoreanWon(item.totalAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50">
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                      총 발주금액
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-lg font-bold text-blue-600">
                        {formatKoreanWon(order.totalAmount)}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Management Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
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

        {/* Attachments */}
        {order.attachments && order.attachments.length > 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Archive className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">첨부파일</h3>
                <span className="text-sm text-gray-500">총 {order.attachments.length}개 파일</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {order.attachments.map((attachment: any) => (
                  <div key={attachment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate" title={attachment.filename}>
                          {attachment.filename}
                        </p>
                        <p className="text-xs text-gray-500">첨부파일</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="ml-2 flex-shrink-0">
                      <Download className="h-4 w-4 mr-1" />
                      다운로드
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-[1366px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-gray-600" />
                  <span className="text-lg font-semibold text-gray-900">발주서 미리보기</span>
                </div>
                <div className="flex items-center gap-2">
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
                    <Printer className="h-4 w-4 mr-1" />
                    PDF 출력
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="order-preview-content mt-4">
              {order && <OrderPreviewSimple order={order} />}
            </div>
          </DialogContent>
        </Dialog>

        {/* Email Send Dialog */}
        {order && (
          <EmailSendDialog
            open={emailDialogOpen}
            onOpenChange={(open) => {
              setEmailDialogOpen(open);
              if (!open) setSelectedOrder(null);
            }}
            orderData={{
              orderNumber: order.orderNumber,
              vendorName: order.vendor?.name || order.vendorName || '',
              vendorEmail: order.vendor?.email,
              orderDate: order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '',
              totalAmount: order.totalAmount,
              siteName: order.project?.projectName || order.projectName || ''
            }}
            onSendEmail={handleSendEmail}
          />
        )}
      </div>
    </div>
  );
}