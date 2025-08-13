import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Filter, ChevronUp, ChevronDown, FileText, Eye, Edit, Mail, Clock, CheckCircle, XCircle, AlertCircle, Calendar, Building, Users, DollarSign, Send, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useOptimizedOrdersWithPrefetch } from "@/hooks/use-optimized-orders";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getStatusText } from "@/lib/statusUtils";
import { EmailSendDialog } from "@/components/email-send-dialog";
import { EmailService } from "@/services/emailService";
import { EmailHistoryModal } from "@/components/email-history-modal";
import PDFPreviewModal from "@/components/workflow/preview/PDFPreviewModal";
import { formatKoreanWon } from "@/lib/utils";

export default function OrdersProfessional() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  const [filters, setFilters] = useState({
    status: "",
    vendorId: "",
    projectId: "",
    userId: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
    searchText: "",
    page: 1,
    limit: 50,
    sortBy: "orderDate",
    sortOrder: "desc" as "asc" | "desc",
  });

  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Email history modal state
  const [emailHistoryModalOpen, setEmailHistoryModalOpen] = useState(false);
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<any>(null);

  // PDF preview modal state
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [selectedOrderForPDF, setSelectedOrderForPDF] = useState<any>(null);

  // Initialize filters based on URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const filter = urlParams.get('filter');
    const vendorIdFromUrl = urlParams.get('vendor');
    
    const newFilters: any = { 
      page: 1,
      status: "",
      vendorId: "", 
      projectId: "",
      userId: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
      searchText: "",
      limit: 50
    };
    
    if (status && !filter) {
      newFilters.status = status === "all" ? "" : status;
    }
    else if (filter === 'monthly') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      newFilters.startDate = formatLocalDate(startOfMonth);
      newFilters.endDate = formatLocalDate(endOfMonth);
    }
    else if (filter === 'urgent') {
      const today = new Date();
      const urgentDate = new Date();
      urgentDate.setDate(today.getDate() + 7);
      
      newFilters.startDate = today.toISOString().split('T')[0];
      newFilters.endDate = urgentDate.toISOString().split('T')[0];
      newFilters.status = 'approved';
    }
    
    if (vendorIdFromUrl) {
      newFilters.vendorId = vendorIdFromUrl;
    }
    
    setFilters(newFilters);
  }, [location]);

  // Optimized single query
  const {
    orders,
    vendors,
    projects, 
    users,
    total,
    page,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    isLoading: ordersLoading,
    error,
    cacheHit,
    queryTime,
    prefetchRelatedData
  } = useOptimizedOrdersWithPrefetch(filters);

  // Prefetch related data when component mounts
  useEffect(() => {
    prefetchRelatedData();
  }, [prefetchRelatedData]);

  const statusChangeMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await apiRequest("PUT", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      // Optimized invalidation - use query key factory for consistency
      queryClient.invalidateQueries({ queryKey: ["orders-optimized"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/unified"], exact: false });
      toast({
        title: "성공",
        description: "발주서 상태가 변경되었습니다.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "발주서 상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await apiRequest("DELETE", `/api/orders/${orderId}`);
    },
    onSuccess: () => {
      // Optimized invalidation - broader scope for related data
      queryClient.invalidateQueries({ queryKey: ["orders-optimized"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/unified"], exact: false });
      toast({
        title: "성공",
        description: "발주서가 삭제되었습니다.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "발주서 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/orders/export?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orders.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "엑셀 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    const filterValue = (value === "all") ? "" : value;
    setFilters(prev => ({ ...prev, [key]: filterValue, page: 1 }));
  };

  // 정렬 처리 함수
  const handleSort = (field: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc",
      page: 1
    }));
  };

  // Email handlers
  const handleEmailSend = (order: any) => {
    const fullOrder = orders.find((o: any) => o.id === order.id);
    if (fullOrder) {
      setSelectedOrder(fullOrder);
      setEmailDialogOpen(true);
    }
  };

  const handleSendEmail = async (emailData: any) => {
    if (!selectedOrder) return;

    try {
      const orderData = {
        orderNumber: selectedOrder.orderNumber,
        vendorName: selectedOrder.vendorName || selectedOrder.vendor?.name || '',
        orderDate: selectedOrder.orderDate,
        totalAmount: selectedOrder.totalAmount,
        siteName: selectedOrder.projectName || selectedOrder.project?.projectName,
        filePath: selectedOrder.filePath || ''
      };

      await EmailService.sendPurchaseOrderEmail(orderData, emailData);
      
      toast({
        title: "이메일 발송 완료",
        description: `${selectedOrder.vendor?.name}에게 발주서 ${selectedOrder.orderNumber}를 전송했습니다.`,
      });
    } catch (error) {
      toast({
        title: "이메일 발송 실패",
        description: error instanceof Error ? error.message : "이메일 발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleViewEmailHistory = (order: any) => {
    const fullOrder = orders.find((o: any) => o.id === order.id);
    if (fullOrder) {
      setSelectedOrderForHistory(fullOrder);
      setEmailHistoryModalOpen(true);
    }
  };

  // PDF preview handler
  const handlePDFPreview = (order: any) => {
    const fullOrder = orders.find((o: any) => o.id === order.id);
    if (fullOrder) {
      setSelectedOrderForPDF(fullOrder);
      setPdfPreviewOpen(true);
    }
  };

  // Download handler
  const handleDownloadOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/download`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: "발주서 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // orders is already available from useOptimizedOrdersWithPrefetch
  
  // Debug logging
  console.log('🔍 Orders Professional - orders data:', orders);
  console.log('🔍 Orders Professional - first order:', orders[0]);
  if (orders[0]) {
    console.log('🔍 Orders Professional - vendor info:', {
      vendor: orders[0].vendor,
      vendorName: orders[0].vendorName,
      vendorFromVendor: orders[0].vendor?.name
    });
    console.log('🔍 Orders Professional - project info:', {
      project: orders[0].project,
      projectName: orders[0].projectName,
      projectFromProject: orders[0].project?.projectName
    });
  }
  
  // orders already include email status from optimized query
  const ordersWithEmailStatus = orders;

  // Email status rendering
  const renderEmailStatus = (order: any) => {
    if (!order.emailStatus || order.totalEmailsSent === 0) {
      return (
        <span className="text-xs text-gray-500 dark:text-gray-400">미발송</span>
      );
    }

    if (order.emailStatus === 'sent') {
      return (
        <div className="flex items-center gap-1">
          <Send className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          <span className="text-xs text-blue-600 dark:text-blue-400">발송됨</span>
        </div>
      );
    }

    if (order.emailStatus === 'opened') {
      return (
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-600 dark:text-green-400">열람됨</span>
        </div>
      );
    }

    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">미발송</span>
    );
  };

  // Status colors optimized for dark mode visibility
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/25 dark:text-yellow-200 dark:border-yellow-400/50';
      case 'approved': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-200 dark:border-green-400/50';
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400/50';
      case 'completed': return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/25 dark:text-purple-200 dark:border-purple-400/50';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/25 dark:text-red-200 dark:border-red-400/50';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-[1366px] mx-auto p-6">
        {/* Professional Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">발주서 관리</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {filters.vendorId ? 
                  `${vendors?.find((v: any) => v.id.toString() === filters.vendorId)?.name || ''} 거래처 발주서` :
                  '전체 발주서를 조회하고 관리하세요'
                }
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* 새 발주서 작성 버튼 제거됨 */}
            </div>
          </div>
        </div>

        {/* Search & Filters Card */}
        <Card className="mb-6 shadow-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="p-6 dark:text-gray-100">
            {/* Main Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 h-5 w-5" />
                <Input
                  placeholder="발주번호, 품목명으로 검색..."
                  value={filters.searchText}
                  onChange={(e) => handleFilterChange("searchText", e.target.value)}
                  className="pl-10 h-11 text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange("status", value)}>
                <SelectTrigger className="w-40 h-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  <SelectItem value="all" className="dark:focus:bg-gray-700 dark:hover:bg-gray-700">모든 상태</SelectItem>
                  <SelectItem value="pending" className="dark:focus:bg-gray-700 dark:hover:bg-gray-700">승인 대기</SelectItem>
                  <SelectItem value="approved" className="dark:focus:bg-gray-700 dark:hover:bg-gray-700">승인 완료</SelectItem>
                  <SelectItem value="sent" className="dark:focus:bg-gray-700 dark:hover:bg-gray-700">발송 완료</SelectItem>
                  <SelectItem value="completed" className="dark:focus:bg-gray-700 dark:hover:bg-gray-700">완료</SelectItem>
                  <SelectItem value="rejected" className="dark:focus:bg-gray-700 dark:hover:bg-gray-700">반려</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.projectId || "all"} onValueChange={(value) => handleFilterChange("projectId", value)}>
                <SelectTrigger className="w-48 h-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="현장 선택" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  <SelectItem value="all" className="dark:focus:bg-gray-700 dark:hover:bg-gray-700">모든 현장</SelectItem>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()} className="dark:focus:bg-gray-700 dark:hover:bg-gray-700">
                      {project.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.vendorId || "all"} onValueChange={(value) => handleFilterChange("vendorId", value)}>
                <SelectTrigger className="w-48 h-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="거래처 선택" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  <SelectItem value="all" className="dark:focus:bg-gray-700 dark:hover:bg-gray-700">모든 거래처</SelectItem>
                  {vendors?.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()} className="dark:focus:bg-gray-700 dark:hover:bg-gray-700">
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="h-10 px-4 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Filter className="h-4 w-4 mr-2" />
                고급 필터
                {isFilterExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>

              <div className="ml-auto flex gap-2">
                {Object.values(filters).some(v => v && v !== "") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({
                      status: "",
                      vendorId: "",
                      projectId: "",
                      userId: "",
                      startDate: "",
                      endDate: "",
                      minAmount: "",
                      maxAmount: "",
                      searchText: "",
                      page: 1,
                      limit: 50,
                    })}
                    className="h-10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    필터 초기화
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  className="h-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Download className="h-4 w-4 mr-2" />
                  엑셀 다운로드
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {isFilterExpanded && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">발주일 범위</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange("startDate", e.target.value)}
                        className="h-10 text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                      />
                      <span className="text-gray-400 dark:text-gray-500">~</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange("endDate", e.target.value)}
                        className="h-10 text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">금액 범위</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="최소 금액"
                        value={filters.minAmount}
                        onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                        className="h-10 text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      <span className="text-gray-400 dark:text-gray-500">~</span>
                      <Input
                        type="number"
                        placeholder="최대 금액"
                        value={filters.maxAmount}
                        onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                        className="h-10 text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">작성자</label>
                    <Select value={filters.userId || "all"} onValueChange={(value) => handleFilterChange("userId", value)}>
                      <SelectTrigger className="h-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                        <SelectValue placeholder="모든 작성자" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                        <SelectItem value="all" className="dark:focus:bg-gray-700 dark:hover:bg-gray-700">모든 작성자</SelectItem>
                        {users?.map((user: any) => (
                          <SelectItem key={user.id} value={user.id} className="dark:focus:bg-gray-700 dark:hover:bg-gray-700">
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full bg-white dark:bg-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("orderNumber")}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      발주번호
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("vendorName")}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      거래처
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("projectName")}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      현장
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("orderDate")}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      발주일
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("totalAmount")}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      금액
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      상태
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">이메일</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">액션</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {ordersLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                      </div>
                    </td>
                  </tr>
                ) : ordersWithEmailStatus.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="text-gray-500 dark:text-gray-400">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm">발주서가 없습니다.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  ordersWithEmailStatus.map((order: any) => (
                    <tr key={order.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap bg-white dark:bg-gray-800">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          {order.orderNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap bg-white dark:bg-gray-800">
                        {(order.vendorName || order.vendor?.name) && (order.vendor?.id || order.vendorId) ? (
                          <button
                            onClick={() => navigate(`/vendors/${order.vendor?.id || order.vendorId}`)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
                            title="거래처 상세 정보 보기"
                          >
                            {order.vendorName || order.vendor?.name}
                          </button>
                        ) : (
                          <div className="text-sm text-gray-900 dark:text-gray-100">{order.vendorName || order.vendor?.name || '-'}</div>
                        )}
                        {order.vendor?.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{order.vendor.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap bg-white dark:bg-gray-800">
                        {(order.projectName || order.project?.projectName) && (order.project?.id || order.projectId) ? (
                          <button
                            onClick={() => navigate(`/projects/${order.project?.id || order.projectId}`)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
                            title="현장 상세 정보 보기"
                          >
                            {order.projectName || order.project?.projectName}
                          </button>
                        ) : (
                          <div className="text-sm text-gray-900 dark:text-gray-100">{order.projectName || order.project?.projectName || '-'}</div>
                        )}
                        {order.project?.projectCode && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{order.project.projectCode}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100">
                        {new Date(order.orderDate).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap bg-white dark:bg-gray-800">
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {formatKoreanWon(order.totalAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap bg-white dark:bg-gray-800">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap bg-white dark:bg-gray-800">
                        {renderEmailStatus(order)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap bg-white dark:bg-gray-800 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* 상세보기 */}
                          <button
                            onClick={() => navigate(`/orders/${order.id}`)}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-md transition-all duration-200"
                            title="상세보기"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {/* 수정 */}
                          <button
                            onClick={() => navigate(`/orders/${order.id}/edit`)}
                            className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20 rounded-md transition-all duration-200"
                            title="수정"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          {/* PDF 보기 */}
                          <button
                            onClick={() => handlePDFPreview(order)}
                            className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20 rounded-md transition-all duration-200"
                            title="PDF 보기"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          
                          {/* 이메일 */}
                          <button
                            onClick={() => handleEmailSend(order)}
                            className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20 rounded-md transition-all duration-200"
                            title="이메일 전송"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Email Send Dialog */}
        {selectedOrder && (
          <EmailSendDialog
            open={emailDialogOpen}
            onOpenChange={setEmailDialogOpen}
            orderData={{
              orderNumber: selectedOrder.orderNumber,
              vendorName: selectedOrder.vendorName || selectedOrder.vendor?.name || '',
              vendorEmail: selectedOrder.vendor?.email,
              orderDate: new Date(selectedOrder.orderDate).toLocaleDateString(),
              totalAmount: selectedOrder.totalAmount,
              siteName: selectedOrder.projectName || selectedOrder.project?.projectName
            }}
            onSendEmail={handleSendEmail}
          />
        )}

        {/* Email History Modal */}
        {selectedOrderForHistory && (
          <EmailHistoryModal
            orderId={selectedOrderForHistory.id}
            orderNumber={selectedOrderForHistory.orderNumber}
            isOpen={emailHistoryModalOpen}
            onClose={() => {
              setEmailHistoryModalOpen(false);
              setSelectedOrderForHistory(null);
            }}
          />
        )}

        {/* PDF Preview Modal */}
        {selectedOrderForPDF && (
          <PDFPreviewModal
            orderData={{
              id: selectedOrderForPDF.id,
              orderNumber: selectedOrderForPDF.orderNumber,
              projectName: selectedOrderForPDF.projectName || selectedOrderForPDF.project?.projectName,
              vendorName: selectedOrderForPDF.vendorName || selectedOrderForPDF.vendor?.name,
              totalAmount: selectedOrderForPDF.totalAmount,
              orderDate: selectedOrderForPDF.orderDate,
              deliveryDate: selectedOrderForPDF.deliveryDate,
              status: selectedOrderForPDF.status,
              filePath: selectedOrderForPDF.filePath,
              // Additional data that might be needed for PDF generation
              items: selectedOrderForPDF.items || [],
              notes: selectedOrderForPDF.notes || selectedOrderForPDF.remarks,
              createdBy: selectedOrderForPDF.user?.name || selectedOrderForPDF.createdBy
            }}
            isOpen={pdfPreviewOpen}
            onClose={() => {
              setPdfPreviewOpen(false);
              setSelectedOrderForPDF(null);
            }}
            onDownload={(pdfUrl) => {
              // Custom download handler if needed
              const link = document.createElement('a');
              link.href = pdfUrl;
              link.download = `발주서_${selectedOrderForPDF.orderNumber}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              toast({
                title: "PDF 다운로드 완료",
                description: `발주서 ${selectedOrderForPDF.orderNumber}의 PDF가 다운로드되었습니다.`,
              });
            }}
          />
        )}
      </div>
    </div>
  );
}