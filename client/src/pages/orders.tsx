import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Filter, ChevronUp, ChevronDown, ChevronsUpDown, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useOrders, useVendors, useProjects, useUsers } from "@/hooks/use-enhanced-queries";
import { useOrdersEmailStatus } from "@/hooks/use-email-history";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getStatusText } from "@/lib/statusUtils";
import { EmailSendDialog } from "@/components/email-send-dialog";
import { EmailService } from "@/services/emailService";
import { EnhancedOrdersTable } from "@/components/orders/enhanced-orders-table";
import { EmailHistoryModal } from "@/components/email-history-modal";
import { useTheme } from "@/components/ui/theme-provider";

export default function Orders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

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

  // Enhanced queries with optimized caching
  const { data: ordersData, isLoading: ordersLoading } = useOrders(filters);
  const { data: vendors } = useVendors();
  const { data: projects } = useProjects();
  const { data: users } = useUsers();
  const { data: emailStatusData } = useOrdersEmailStatus();

  const statusChangeMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await apiRequest("PUT", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
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
    // "all"을 빈 문자열로 변환하여 필터링하지 않도록 함
    const filterValue = (value === "all") ? "" : value;
    setFilters(prev => ({ ...prev, [key]: filterValue, page: 1 }));
  };

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
    // Find the full order data from the orders array
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
        vendorName: selectedOrder.vendor?.name || '',
        orderDate: selectedOrder.orderDate,
        totalAmount: selectedOrder.totalAmount,
        siteName: selectedOrder.project?.projectName,
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

  // Email history handlers
  const handleViewEmailHistory = (order: any) => {
    const fullOrder = orders.find((o: any) => o.id === order.id);
    if (fullOrder) {
      setSelectedOrderForHistory(fullOrder);
      setEmailHistoryModalOpen(true);
    }
  };

  // PDF view handler
  const handleViewPdf = (order: any) => {
    const fullOrder = orders.find((o: any) => o.id === order.id);
    if (fullOrder) {
      if (fullOrder.filePath) {
        // 파일 경로가 있는 경우 PDF 다운로드/보기
        window.open(`/api/orders/${fullOrder.id}/download`, '_blank');
      } else {
        // 파일이 없는 경우 PDF 생성 요청
        toast({
          title: "PDF 생성 중",
          description: "발주서 PDF를 생성하고 있습니다. 잠시 후 다시 시도해주세요.",
        });
        // TODO: PDF 생성 API 호출 후 다운로드
      }
    }
  };

  const orders = ordersData?.orders || [];
  
  // Merge email status data with orders
  const ordersWithEmailStatus = orders.map((order: any) => {
    const emailStatus = emailStatusData?.find((status: any) => status.id === order.id);
    return {
      ...order,
      emailStatus: emailStatus?.email_status || null,
      lastSentAt: emailStatus?.last_sent_at || null,
      totalEmailsSent: emailStatus?.total_emails_sent || 0,
      openedAt: emailStatus?.opened_at || null,
    };
  });
  
  // Debug logging - Enable temporarily
  console.log('🔍 Orders Page - ordersData:', ordersData);
  console.log('🔍 Orders Page - orders array:', orders);
  console.log('🔍 Orders Page - first order:', orders[0]);
  console.log('🔍 Orders Page - emailStatusData:', emailStatusData);
  console.log('🔍 Orders Page - isLoading:', ordersLoading);
  console.log('🔍 Orders Page - filters:', filters);

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <ShoppingCart className={`h-6 w-6 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>발주서 관리</h1>
                  {filters.vendorId && filters.vendorId !== "" ? (
                    <p className={`text-sm font-medium mt-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {Array.isArray(vendors) ? vendors.find((v: any) => v.id.toString() === filters.vendorId)?.name : "거래처"} 거래처 발주서
                    </p>
                  ) : (
                    <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>전체 발주서를 조회하고 관리하세요</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {filters.vendorId && filters.vendorId !== "" && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleFilterChange("vendorId", "")}
                    className={`transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    전체 발주서 보기
                  </Button>
                )}
                <Button 
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  variant="outline"
                  size="sm"
                  className={`transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportMutation.isPending ? "내보내는 중..." : "엑셀 다운로드"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
          {/* Always Visible: Search and Project Filter */}
          <div className="space-y-3 mb-3">
            <div className="flex flex-col xl:flex-row xl:items-end gap-3">
              {/* Search Section */}
              <div className="flex-1">
                <label className={`text-sm font-medium block mb-2 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>검색</label>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <Input
                    placeholder="발주번호, 거래처명으로 검색..."
                    value={filters.searchText}
                    onChange={(e) => handleFilterChange("searchText", e.target.value)}
                    className={`pl-10 h-11 text-sm rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${filters.searchText ? `${isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}` : ""}`}
                  />
                </div>
              </div>

              {/* Project Filter */}
              <div className="w-full xl:w-72">
                <label className={`text-sm font-medium block mb-2 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>현장</label>
                <Select value={filters.projectId || "all"} onValueChange={(value) => handleFilterChange("projectId", value)}>
                  <SelectTrigger className={`h-11 text-sm rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${filters.projectId && filters.projectId !== "" ? `${isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}` : ""}`}>
                    <SelectValue placeholder="모든 현장" />
                  </SelectTrigger>
                  <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                    <SelectItem value="all">모든 현장</SelectItem>
                    {(projects as any[])?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.projectName} ({project.projectCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Toggle Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className={`flex items-center gap-2 h-11 text-sm px-4 rounded-lg transition-colors ${isDarkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  size="sm"
                >
                  <Filter className="h-4 w-4" />
                  고급 필터
                  {isFilterExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Collapsible Filter Section */}
          {isFilterExpanded && (
            <div className={`border-t pt-6 mt-4 transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="space-y-6">
                {/* Amount Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="space-y-2 xl:col-span-2">
                    <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>금액 범위</label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        placeholder="최소금액"
                        value={filters.minAmount}
                        onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                        className={`h-11 text-sm rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${filters.minAmount ? `${isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}` : ""}`}
                      />
                      <span className={`text-sm transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>~</span>
                      <Input
                        type="number"
                        placeholder="최대금액"
                        value={filters.maxAmount}
                        onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                        className={`h-11 text-sm rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${filters.maxAmount ? `${isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}` : ""}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Date Range, Vendor, Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>발주일 범위</label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange("startDate", e.target.value)}
                        className={`h-11 text-sm rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${filters.startDate ? `${isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}` : ""}`}
                      />
                      <span className={`text-sm transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>~</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange("endDate", e.target.value)}
                        className={`h-11 text-sm rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${filters.endDate ? `${isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}` : ""}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>거래처</label>
                    <Select value={filters.vendorId || "all"} onValueChange={(value) => handleFilterChange("vendorId", value)}>
                      <SelectTrigger className={`h-11 text-sm rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${filters.vendorId && filters.vendorId !== "" ? `${isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}` : ""}`}>
                        <SelectValue placeholder="모든 거래처" />
                      </SelectTrigger>
                      <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <SelectItem value="all">모든 거래처</SelectItem>
                        {Array.isArray(vendors) ? vendors.map((vendor: any) => (
                          <SelectItem key={vendor.id} value={vendor.id.toString()}>
                            {vendor.name}
                          </SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>발주 상태</label>
                    <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange("status", value)}>
                      <SelectTrigger className={`h-11 text-sm rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${filters.status && filters.status !== "" ? `${isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}` : ""}`}>
                        <SelectValue placeholder="모든 상태" />
                      </SelectTrigger>
                      <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <SelectItem value="all">모든 상태</SelectItem>
                        <SelectItem value="draft">{getStatusText("draft")}</SelectItem>
                        <SelectItem value="pending">{getStatusText("pending")}</SelectItem>
                        <SelectItem value="approved">{getStatusText("approved")}</SelectItem>
                        <SelectItem value="sent">{getStatusText("sent")}</SelectItem>
                        <SelectItem value="completed">{getStatusText("completed")}</SelectItem>
                        <SelectItem value="rejected">{getStatusText("rejected")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* User Filter */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>작성자</label>
                    <Select value={filters.userId || "all"} onValueChange={(value) => handleFilterChange("userId", value)}>
                      <SelectTrigger className={`h-11 text-sm rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${filters.userId && filters.userId !== "" ? `${isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}` : ""}`}>
                        <SelectValue placeholder="모든 작성자" />
                      </SelectTrigger>
                      <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <SelectItem value="all">모든 작성자</SelectItem>
                        {Array.isArray(users) ? users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters & Actions - Professional Style */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-4 border-t transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            {/* Active Filters Display */}
            <div className="flex flex-wrap items-center gap-2">
              {(filters.projectId !== "" || filters.vendorId !== "" || filters.userId !== "" || 
                filters.status !== "" || filters.startDate || filters.endDate || 
                filters.minAmount || filters.maxAmount || filters.searchText) && (
                <>
                  <span className={`text-xs font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>적용된 필터:</span>
                  
                  {filters.searchText && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs border transition-colors ${isDarkMode ? 'bg-blue-900/20 text-blue-300 border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      검색: "{filters.searchText}"
                      <button
                        onClick={() => handleFilterChange("searchText", "")}
                        className={`ml-2 rounded-full w-4 h-4 flex items-center justify-center transition-colors ${isDarkMode ? 'hover:bg-blue-800 text-blue-400' : 'hover:bg-blue-100 text-blue-600'}`}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  
                  {filters.projectId && filters.projectId !== "all" && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs border transition-colors ${isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                      현장: {Array.isArray(projects) ? projects.find((p: any) => p.id.toString() === filters.projectId)?.projectName || "선택된 현장" : "선택된 현장"}
                      <button
                        onClick={() => handleFilterChange("projectId", "all")}
                        className={`ml-2 rounded-full w-4 h-4 flex items-center justify-center transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                      >
                        ×
                      </button>
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {(filters.projectId !== "" || filters.vendorId !== "" || filters.userId !== "" || 
                filters.status !== "" || filters.startDate || filters.endDate || 
                filters.minAmount || filters.maxAmount || filters.searchText) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({
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
                  }}
                  className={`h-9 text-sm px-4 rounded-lg transition-colors ${isDarkMode ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}
                >
                  필터 초기화
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className={`h-9 text-sm px-4 rounded-lg transition-colors ${isDarkMode ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}
              >
                <Download className="h-4 w-4 mr-2" />
                {exportMutation.isPending ? "내보내는 중..." : "엑셀 다운로드"}
              </Button>
            </div>
          </div>
          </div>
        </div>

      {/* Enhanced Orders Table */}
      <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <EnhancedOrdersTable
          orders={ordersWithEmailStatus.map((order: any) => {
            const mappedOrder = {
              ...order,
              vendorName: order.vendor?.name || order.vendorName,
              vendorId: order.vendor?.id || order.vendorId,
              projectName: order.project?.projectName || order.projectName,
              userName: order.user?.name || order.userName,
            };
            console.log('🔍 Mapped order:', mappedOrder);
            return mappedOrder;
          })}
          isLoading={ordersLoading}
          onStatusChange={(orderId, newStatus) => statusChangeMutation.mutate({ orderId, status: newStatus })}
          onDelete={(orderId) => deleteOrderMutation.mutate(orderId)}
          onEmailSend={handleEmailSend}
          onViewEmailHistory={handleViewEmailHistory}
          onViewPdf={handleViewPdf}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSort={handleSort}
        />
      </div>

      {/* Email Send Dialog */}
      {selectedOrder && (
        <EmailSendDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          orderData={{
            orderNumber: selectedOrder.orderNumber,
            vendorName: selectedOrder.vendor?.name || '',
            vendorEmail: selectedOrder.vendor?.email,
            orderDate: new Date(selectedOrder.orderDate).toLocaleDateString(),
            totalAmount: selectedOrder.totalAmount,
            siteName: selectedOrder.project?.projectName
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