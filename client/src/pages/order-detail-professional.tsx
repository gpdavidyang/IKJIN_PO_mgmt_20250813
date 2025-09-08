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
  ExternalLink, 
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
  AlertCircle,
  MailCheck
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { downloadAttachment, showDownloadSuccessMessage } from "@/lib/downloadUtils";
import { InvoiceManager } from "@/components/invoice-manager";
import { ReceiptManager } from "@/components/receipt-manager";
import { EmailSendDialog } from "@/components/email-send-dialog";
import { EmailHistoryModal } from "@/components/email-history-modal";
import { AttachedFilesInfo } from "@/components/attached-files-info";
import { format } from "date-fns";
import { formatKoreanWon } from "@/lib/utils";
import { 
  OrderStatus, 
  ApprovalStatus,
  canGeneratePDF as canGeneratePDFBase,
  canSendEmail as canSendEmailBase,
  canViewEmailHistory as canViewEmailHistoryBase,
  canEditOrder as canEditOrderBase,
  canApproveOrder as canApproveOrderBase,
  canCompleteDelivery as canCompleteDeliveryBase,
  getDisplayStatus,
  getDisplayStatusColor
} from "@/lib/statusUtils";

export default function OrderDetailProfessional() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [emailHistoryModalOpen, setEmailHistoryModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const orderId = parseInt(params.id);

  const { data: order, isLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    queryFn: async () => {
      console.log('📘 OrderDetailProfessional - Fetching order:', orderId);
      const result = await apiRequest("GET", `/api/orders/${orderId}`);
      console.log('📘 OrderDetailProfessional - Order data received:', result);
      console.log('📘 OrderDetailProfessional - Attachments:', result?.attachments);
      return result;
    },
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
      // Invalidate all order-related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: ["orders-optimized"] });
      queryClient.invalidateQueries({ queryKey: ["orders-metadata"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Force refetch with no cache for critical queries
      queryClient.refetchQueries({ 
        queryKey: ["orders-optimized"], 
        type: 'active',
        exact: false 
      });
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
      // Invalidate all order-related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: ["orders-optimized"] });
      queryClient.invalidateQueries({ queryKey: ["orders-metadata"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Force refetch with no cache for critical queries
      queryClient.refetchQueries({ 
        queryKey: ["orders-optimized"], 
        type: 'active',
        exact: false 
      });
    },
    onError: (error) => {
      toast({
        title: "발송 실패", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/orders/${orderId}/create-order`);
    },
    onSuccess: (data) => {
      toast({
        title: "발주서 생성 완료",
        description: "발주서가 성공적으로 생성되었습니다. PDF가 첨부되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
    },
    onError: (error) => {
      toast({
        title: "발주서 생성 실패",
        description: error.message || "발주서 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const completeDeliveryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/orders/${orderId}/complete-delivery`);
    },
    // Optimistic update - 즉시 UI 업데이트
    onMutate: async () => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: [`/api/orders/${orderId}`] });
      
      // Snapshot the previous value
      const previousOrder = queryClient.getQueryData([`/api/orders/${orderId}`]);
      
      // Optimistically update the cache
      queryClient.setQueryData([`/api/orders/${orderId}`], (old: any) => ({
        ...old,
        status: 'completed',
        orderStatus: 'delivered'
      }));
      
      // Return a context object with the snapshotted value
      return { previousOrder };
    },
    onSuccess: (data) => {
      toast({
        title: "납품검수완료",
        description: "발주서가 납품완료 상태로 변경되었습니다.",
      });
      
      // Invalidate all order-related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/unified"] });
      queryClient.invalidateQueries({ queryKey: ["orders-optimized"] });
      queryClient.invalidateQueries({ queryKey: ["orders-metadata"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Force refetch with no cache for critical queries
      queryClient.refetchQueries({ 
        queryKey: ["orders-optimized"], 
        type: 'active',
        exact: false 
      });
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (error: any, newOrder, context: any) => {
      queryClient.setQueryData([`/api/orders/${orderId}`], context?.previousOrder);
      toast({
        title: "납품검수완료 실패",
        description: error.message || "납품검수완료 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
    }
  });

  // Professional status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'created':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending_approval':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sent':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered':
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    // Handle new status values
    const statusMap: { [key: string]: string } = {
      'draft': '임시저장',
      'created': '발주서 생성완료',
      'sent': '발송완료',
      'delivered': '납품완료',
      'pending_approval': '승인대기',
      'pending': '승인대기',
      'approved': '승인완료',
      'rejected': '반려',
      'completed': '완료'
    };
    
    return statusMap[status] || status;
  };

  // PDF 생성 전용 함수 - 단계별 진행 상황 표시
  const handlePdfGeneration = async () => {
    setIsGeneratingPdf(true);
    
    // Step 1: PDF 생성 시작
    toast({
      title: "PDF 생성 시작",
      description: "발주서 데이터를 준비하고 있습니다...",
    });
    
    try {
      // Step 2: PDF 생성 중
      setTimeout(() => {
        toast({
          title: "PDF 생성 중",
          description: "ProfessionalPDFGenerationService를 사용하여 PDF를 생성하고 있습니다...",
        });
      }, 1000);
      
      // ProfessionalPDFGenerationService를 사용하여 PDF 생성 및 DB 저장
      const result = await apiRequest("POST", `/api/orders/${orderId}/regenerate-pdf`);
      
      if (result.success) {
        // Step 3: DB 저장 완료
        toast({
          title: "데이터베이스 저장 완료",
          description: "생성된 PDF가 첨부파일로 저장되었습니다.",
        });
        
        // 발주서 데이터 새로고침 - 새로 생성된 PDF가 첨부파일 목록에 나타나도록
        await queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
        
        // Step 4: 최종 완료
        setTimeout(() => {
          toast({
            title: "✅ PDF 발주서 생성 완료",
            description: "PDF 발주서가 성공적으로 생성되었습니다. 하단 첨부파일에서 확인하세요.",
            duration: 5000,
          });
        }, 500);
        
      } else {
        throw new Error(result.message || "PDF 생성 실패");
      }
    } catch (error: any) {
      toast({
        title: "❌ PDF 생성 실패",
        description: error.message || "PDF 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
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

  const handleCompleteDelivery = () => {
    if (confirm(
      "납품검수를 완료하시겠습니까?\n\n" +
      "• 발주서 상태가 '납품완료'로 변경됩니다\n" +
      "• 이 작업은 되돌릴 수 없습니다\n" +
      "• 납품이 완전히 검수되었을 때만 진행하세요"
    )) {
      completeDeliveryMutation.mutate();
    }
  };

  const handleSendEmail = async (emailData: any) => {
    if (!order) return;

    try {
      // 사용자 업로드 파일과 서버 첨부파일 분리
      const serverAttachmentIds: number[] = [];
      const customFiles: File[] = emailData.customFiles || [];
      
      // 선택된 첨부파일 ID에서 서버 파일만 필터링 (양수 ID)
      if (emailData.selectedAttachmentIds && emailData.selectedAttachmentIds.length > 0) {
        console.log('📎 선택된 첨부파일 ID:', emailData.selectedAttachmentIds);
        
        for (const attachmentId of emailData.selectedAttachmentIds) {
          if (attachmentId > 0) {
            // 서버에 있는 파일 (양수 ID)
            serverAttachmentIds.push(attachmentId);
          }
          // 음수 ID는 사용자 업로드 파일이므로 customFiles에서 처리됨
        }
      }
      
      // 서버 첨부파일 URL 생성
      const attachmentUrls: string[] = [];
      for (const attachmentId of serverAttachmentIds) {
        const attachmentUrl = `/api/attachments/${attachmentId}/download`;
        attachmentUrls.push(attachmentUrl);
        console.log('📎 서버 첨부파일 URL 생성:', attachmentUrl);
      }

      // FormData 사용 여부 결정 (사용자 업로드 파일이 있는 경우)
      if (customFiles.length > 0) {
        console.log('📎 사용자 업로드 파일 포함:', customFiles.length, '개');
        
        // FormData로 전송
        const formData = new FormData();
        
        // 기본 데이터
        formData.append('orderData', JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          vendorName: order.vendor?.name || order.vendorName || '',
          orderDate: order.orderDate,
          totalAmount: order.totalAmount,
          siteName: order.project?.projectName || order.projectName || '',
          attachmentUrls: attachmentUrls
        }));
        
        formData.append('to', JSON.stringify(emailData.to));
        if (emailData.cc) formData.append('cc', JSON.stringify(emailData.cc));
        formData.append('subject', emailData.subject);
        if (emailData.message) formData.append('message', emailData.message);
        formData.append('selectedAttachmentIds', JSON.stringify(serverAttachmentIds));
        formData.append('orderId', order.id.toString());
        
        // 사용자 업로드 파일 추가
        customFiles.forEach((file, index) => {
          formData.append(`customFiles`, file);
        });
        
        const response = await fetch('/api/orders/send-email', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          toast({
            title: "이메일 발송 완료",
            description: "발주서가 성공적으로 전송되었습니다.",
          });
          
          // 발주상태 업데이트
          queryClient.invalidateQueries({
            queryKey: ['order', Number(orderId)]
          });
          
          sendEmailMutation.mutate();
        } else {
          throw new Error('Failed to send email');
        }
        
      } else {
        // 사용자 업로드 파일이 없는 경우 기존 JSON 방식
        const orderData = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          vendorName: order.vendor?.name || order.vendorName || '',
          orderDate: order.orderDate,
          totalAmount: order.totalAmount,
          siteName: order.project?.projectName || order.projectName || '',
          attachmentUrls: attachmentUrls
        };

        console.log('📧 이메일 발송 데이터 (JSON):', { 
          orderData, 
          emailData,
          selectedAttachmentIds: serverAttachmentIds,
          attachmentUrls: attachmentUrls,
          hasAttachments: order.attachments?.length || 0
        });

        const response = await fetch('/api/orders/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderData,
            ...emailData,
            orderId: order.id,
            attachmentUrls: attachmentUrls,
            selectedAttachmentIds: serverAttachmentIds
          })
        });

        if (response.ok) {
          toast({
            title: "이메일 발송 완료",
            description: `${order.vendor?.name || order.vendorName}에게 발주서 ${order.orderNumber}를 전송했습니다.`,
          });
          setEmailDialogOpen(false);
          setSelectedOrder(null);

          // 🔄 Cache invalidation after successful email sending
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
          queryClient.invalidateQueries({ queryKey: ["orders-optimized"] });
          queryClient.invalidateQueries({ queryKey: ["orders-metadata"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });

          // Force refetch with no cache for critical queries to immediately update UI
          queryClient.refetchQueries({ 
            queryKey: [`/api/orders/${orderId}`], 
            type: 'active' 
          });
        } else {
          throw new Error('이메일 발송 실패');
        }
      }
    } catch (error) {
      toast({
        title: "이메일 발송 실패",
        description: error instanceof Error ? error.message : "이메일 발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleViewEmailHistory = () => {
    setEmailHistoryModalOpen(true);
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

  // 새로운 상태 관리 시스템 사용 (STATUS_MANAGEMENT.md 기준)
  const orderStatus = (order.orderStatus || order.status) as OrderStatus;
  const approvalStatus = order.approvalStatus as ApprovalStatus;
  
  // Permission checks based on separate order and approval statuses
  const canCreateOrder = orderStatus === 'draft' && (user?.role === "admin" || order.userId === user?.id);
  // PDF 생성 가능 조건: draft 또는 created 상태일 때만
  const canGeneratePDF = orderStatus === 'draft' || orderStatus === 'created';
  const canSendEmail = canSendEmailBase(orderStatus, approvalStatus) && (user?.role === "admin" || order.userId === user?.id);
  const canViewEmailHistory = canViewEmailHistoryBase(orderStatus) && (user?.role === "admin" || order.userId === user?.id);
  const canEdit = canEditOrderBase(orderStatus, approvalStatus) && (user?.role === "admin" || order.userId === user?.id);
  const canApprove = canApproveOrderBase(approvalStatus, user?.role);
  const canCompleteDelivery = canCompleteDeliveryBase(orderStatus, approvalStatus) && (user?.role === "admin" || order.userId === user?.id);

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
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getDisplayStatusColor(orderStatus, approvalStatus)}`}>
                  {getDisplayStatus(orderStatus, approvalStatus)}
                </span>
                {orderStatus === 'draft' && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    ⚠️ 임시저장 상태 - 발주서 생성 필요
                  </span>
                )}
                <p className="text-sm text-gray-500">
                  {order.vendor?.name} • {order.orderDate ? format(new Date(order.orderDate), 'yyyy년 MM월 dd일') : '날짜 미정'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Edit button - only for draft and created status */}
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
              
              {/* Create Order button - only for draft status */}
              {canCreateOrder && (
                <Button 
                  onClick={() => {
                    if (confirm(
                      "발주서를 생성하시겠습니까?\n\n" +
                      "• PDF 파일이 자동으로 생성됩니다\n" +
                      "• 상태가 '생성됨'으로 변경됩니다\n" +
                      "• 생성 후 PDF 보기 및 이메일 발송이 가능합니다"
                    )) {
                      createOrderMutation.mutate();
                    }
                  }}
                  disabled={createOrderMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {createOrderMutation.isPending ? '생성 중...' : '발주서 생성'}
                </Button>
              )}
              
              {/* Approval button - for pending approval */}
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
              
              {/* PDF Generation button - only for draft/created status */}
              {canGeneratePDF && (
                <Button 
                  variant="outline" 
                  onClick={handlePdfGeneration}
                  disabled={isGeneratingPdf || !canGeneratePDF}
                  className={`flex items-center gap-2 ${
                    !canGeneratePDF 
                      ? 'opacity-50 cursor-not-allowed' 
                      : ''
                  }`}
                  title={!canGeneratePDF ? "발주완료 또는 납품완료 상태에서는 PDF를 재생성할 수 없습니다" : "PDF 발주서를 새로 생성합니다"}
                >
                  {isGeneratingPdf ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-transparent rounded-full"></div>
                      생성 중...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      PDF 발주서 생성
                    </>
                  )}
                </Button>
              )}
              
              {/* Email button - only for created status */}
              {canSendEmail && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedOrder(order);
                    setEmailDialogOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  이메일 발송
                </Button>
              )}

              {/* Email History button - for sent and delivered status */}
              {canViewEmailHistory && (
                <Button 
                  variant="outline" 
                  onClick={handleViewEmailHistory}
                  className="flex items-center gap-2"
                >
                  <MailCheck className="h-4 w-4" />
                  이메일 기록
                </Button>
              )}
              
              {/* Complete Delivery button - for created and sent status */}
              {canCompleteDelivery && (
                <Button 
                  onClick={handleCompleteDelivery}
                  disabled={completeDeliveryMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {completeDeliveryMutation.isPending ? '처리 중...' : '납품검수완료'}
                </Button>
              )}
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
                {(() => {
                  const deliveryPlace = order.notes?.split('\n').find((line: string) => line.startsWith('납품처: '))?.replace('납품처: ', '').trim();
                  return deliveryPlace ? (
                    <p className="text-xs text-gray-500 mt-1">📍 {deliveryPlace}</p>
                  ) : null;
                })()}
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
                {(() => {
                  // Extract delivery place from notes if exists
                  const deliveryPlace = order.notes?.split('\n').find((line: string) => line.startsWith('납품처: '))?.replace('납품처: ', '').trim();
                  return deliveryPlace ? (
                    <div>
                      <p className="text-sm text-gray-600">납품장소</p>
                      <p className="text-sm text-gray-900">{deliveryPlace}</p>
                    </div>
                  ) : null;
                })()}
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

        {/* Excel Upload File Info - Display Excel files separately */}
        {order.attachments && order.attachments.length > 0 && (
          <AttachedFilesInfo 
            attachments={order.attachments} 
            orderId={orderId} 
          />
        )}


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
              siteName: order.project?.projectName || order.projectName || '',
              orderId: order.id
            }}
            attachments={order.attachments?.map(att => ({
              id: att.id,
              originalName: att.originalName,
              filePath: att.filePath,
              fileSize: att.fileSize,
              mimeType: att.mimeType,
              isSelected: false
            }))}
            onSendEmail={handleSendEmail}
          />
        )}

        {/* Email History Modal */}
        {order && (
          <EmailHistoryModal
            orderId={order.id}
            orderNumber={order.orderNumber}
            isOpen={emailHistoryModalOpen}
            onClose={() => setEmailHistoryModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}