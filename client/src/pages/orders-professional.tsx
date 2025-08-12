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
      queryClient.invalidateQueries({ queryKey: ["orders-optimized"] });
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
      queryClient.invalidateQueries({ queryKey: ["orders-optimized"] });
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
        <span className="text-xs text-gray-500">미발송</span>
      );
    }

    if (order.emailStatus === 'sent') {
      return (
        <div className="flex items-center gap-1">
          <Send className="h-3 w-3 text-blue-600" />
          <span className="text-xs text-blue-600">발송됨</span>
        </div>
      );
    }

    if (order.emailStatus === 'opened') {
      return (
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3 text-green-600" />
          <span className="text-xs text-green-600">열람됨</span>
        </div>
      );
    }

    return (
      <span className="text-xs text-gray-500">미발송</span>
    );
  };

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6">
        {/* Professional Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">발주서 관리</h1>
              <p className="text-sm text-gray-500 mt-1">
                {filters.vendorId ? 
                  `${vendors?.find((v: any) => v.id.toString() === filters.vendorId)?.name || ''} 거래처 발주서` :
                  '전체 발주서를 조회하고 관리하세요'
                }
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate("/create-order")}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                새 발주서 작성
              </Button>
            </div>
          </div>
        </div>

        {/* Search & Filters Card */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-6">
            {/* Main Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="발주번호, 품목명으로 검색..."
                  value={filters.searchText}
                  onChange={(e) => handleFilterChange("searchText", e.target.value)}
                  className="pl-10 h-11 text-sm border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange("status", value)}>
                <SelectTrigger className="w-40 h-10 border-gray-200">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="pending">승인 대기</SelectItem>
                  <SelectItem value="approved">승인 완료</SelectItem>
                  <SelectItem value="sent">발송 완료</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.projectId || "all"} onValueChange={(value) => handleFilterChange("projectId", value)}>
                <SelectTrigger className="w-48 h-10 border-gray-200">
                  <SelectValue placeholder="프로젝트 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 프로젝트</SelectItem>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.vendorId || "all"} onValueChange={(value) => handleFilterChange("vendorId", value)}>
                <SelectTrigger className="w-48 h-10 border-gray-200">
                  <SelectValue placeholder="거래처 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 거래처</SelectItem>
                  {vendors?.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="h-10 px-4 border-gray-200"
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
                    className="h-10"
                  >
                    필터 초기화
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  className="h-10 border-gray-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  엑셀 다운로드
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {isFilterExpanded && (
              <div className="pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">발주일 범위</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange("startDate", e.target.value)}
                        className="h-10 text-sm"
                      />
                      <span className="text-gray-400">~</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange("endDate", e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">금액 범위</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="최소 금액"
                        value={filters.minAmount}
                        onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                        className="h-10 text-sm"
                      />
                      <span className="text-gray-400">~</span>
                      <Input
                        type="number"
                        placeholder="최대 금액"
                        value={filters.maxAmount}
                        onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">작성자</label>
                    <Select value={filters.userId || "all"} onValueChange={(value) => handleFilterChange("userId", value)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="모든 작성자" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">모든 작성자</SelectItem>
                        {users?.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
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
        <Card className="shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("orderNumber")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      발주번호
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("vendorName")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      거래처
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("projectName")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      프로젝트
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("orderDate")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      발주일
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("totalAmount")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      금액
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      상태
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ordersLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : ordersWithEmailStatus.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">발주서가 없습니다.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  ordersWithEmailStatus.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {order.orderNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.vendorName || order.vendor?.name || '-'}</div>
                        {order.vendor?.email && (
                          <div className="text-xs text-gray-500">{order.vendor.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.projectName || order.project?.projectName || '-'}</div>
                        {order.project?.projectCode && (
                          <div className="text-xs text-gray-500">{order.project.projectCode}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(order.orderDate).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-600">
                          {formatKoreanWon(order.totalAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderEmailStatus(order)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/orders/${order.id}`)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="상세보기"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          {user?.role === 'admin' && (
                            <>
                              <button
                                onClick={() => navigate(`/orders/${order.id}/edit`)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="수정"
                              >
                                <Edit className="h-5 w-5" />
                              </button>
                              {order.status === 'approved' && (
                                <button
                                  onClick={() => handleEmailSend(order)}
                                  className="text-gray-400 hover:text-green-600 transition-colors"
                                  title="이메일 발송"
                                >
                                  <Mail className="h-5 w-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadOrder(order.id)}
                                className="text-gray-400 hover:text-purple-600 transition-colors"
                                title="다운로드"
                              >
                                <Download className="h-5 w-5" />
                              </button>
                            </>
                          )}
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
      </div>
    </div>
  );
}