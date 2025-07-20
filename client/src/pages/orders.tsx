import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download, Eye, Edit, FileText, Trash2, ChevronUp, ChevronDown, Filter, EyeOff, Mail, History } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

import { formatKoreanWon } from "@/lib/utils";
import { getStatusText } from "@/lib/statusUtils";
import { EmailSendDialog } from "@/components/email-send-dialog";
import { EmailService } from "@/services/emailService";

// Order number abbreviation utility
const abbreviateOrderNumber = (orderNumber: string) => {
  // PO-2025-0612-001 → PO-0612-001
  if (orderNumber.startsWith('PO-') && orderNumber.length > 10) {
    const parts = orderNumber.split('-');
    if (parts.length >= 4) {
      return `${parts[0]}-${parts[2]}-${parts[3]}`;
    }
  }
  return orderNumber;
};

// Text truncation utility with ellipsis
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export default function Orders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  // Calculate default date range (last 3 months)
  const getDefaultDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const [filters, setFilters] = useState({
    status: "all",
    vendorId: "all",
    projectId: "all",
    userId: "all",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
    searchText: "",
    page: 1,
    limit: 50,
  });

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc' | null;
  }>({
    key: '',
    direction: null,
  });

  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Column visibility toggle
  const toggleColumnVisibility = (column: string) => {
    setHiddenColumns(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  // Column definitions for better management
  const columns = [
    { key: 'orderNumber', label: '발주번호', width: 'w-32 min-w-[8rem]' },
    { key: 'project', label: '현장', width: 'w-40 min-w-[10rem]' },
    { key: 'vendor', label: '거래처', width: 'w-32 min-w-[8rem]' },
    { key: 'items', label: '주요 품목', width: 'w-36 min-w-[9rem]' },
    { key: 'orderDate', label: '발주일자', width: 'w-28 min-w-[7rem]' },
    { key: 'totalAmount', label: '총 금액', width: 'w-32 min-w-[8rem]' },
    { key: 'status', label: '상태', width: 'w-24 min-w-[6rem]' },
    { key: 'emailStatus', label: '이메일', width: 'w-24 min-w-[6rem]' },
    { key: 'user', label: '작성자', width: 'w-24 min-w-[6rem]' },
    { key: 'actions', label: '작업', width: 'w-20 min-w-[5rem]' }
  ];

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <div className="w-4 h-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  // Initialize filters based on URL parameters or defaults
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const filter = urlParams.get('filter');
    const vendorIdFromUrl = urlParams.get('vendor');
    

    
    // Start with base filters
    const newFilters: any = { 
      page: 1,
      status: "all",
      vendorId: "all", 
      projectId: "all",
      userId: "all",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
      searchText: "",
      limit: 50
    };
    
    // Handle status-only filters (승인 대기)
    if (status && !filter) {
      newFilters.status = status;
      // No date range for status-only filters
    }
    // Handle date-based filters
    else if (filter === 'monthly') {
      // 현재 달의 시작일과 마지막일 설정 (로컬 시간대 기준)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      
      // 이번 달 1일
      const startOfMonth = new Date(year, month, 1);
      // 이번 달 마지막 날 (다음 달 0일 = 이번 달 마지막 날)
      const endOfMonth = new Date(year, month + 1, 0);
      
      // YYYY-MM-DD 형식으로 변환 (로컬 시간대 유지)
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      newFilters.startDate = formatLocalDate(startOfMonth);
      newFilters.endDate = formatLocalDate(endOfMonth);
    }
    else if (filter === 'yearly') {
      // 금년 시작일부터 오늘까지 설정 (로컬 시간대 기준)
      const now = new Date();
      const year = now.getFullYear();
      
      // 올해 1월 1일
      const startOfYear = new Date(year, 0, 1);
      
      // YYYY-MM-DD 형식으로 변환 (로컬 시간대 유지)
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      newFilters.startDate = formatLocalDate(startOfYear);
      newFilters.endDate = formatLocalDate(now);
    }
    else if (filter === 'urgent') {
      // 7일 이내 배송 예정인 긴급 발주서
      const today = new Date();
      const urgentDate = new Date();
      urgentDate.setDate(today.getDate() + 7);
      
      newFilters.startDate = today.toISOString().split('T')[0];
      newFilters.endDate = urgentDate.toISOString().split('T')[0];
      newFilters.status = 'approved'; // 승인된 발주서만
    }
    // No URL parameters - use default 3-month range
    else if (!status && !filter && !vendorIdFromUrl) {
      const defaultRange = getDefaultDateRange();
      newFilters.startDate = defaultRange.startDate;
      newFilters.endDate = defaultRange.endDate;
    }
    
    if (vendorIdFromUrl) {
      newFilters.vendorId = vendorIdFromUrl;
    }
    
    // Always set the filters
    setFilters(newFilters);
  }, [location]);

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status !== "all" && filters.status) params.append("status", filters.status);
      if (filters.vendorId !== "all" && filters.vendorId) params.append("vendorId", filters.vendorId);
      if (filters.projectId !== "all" && filters.projectId) params.append("projectId", filters.projectId);
      if (filters.userId !== "all" && filters.userId) params.append("userId", filters.userId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.minAmount) params.append("minAmount", filters.minAmount);
      if (filters.maxAmount) params.append("maxAmount", filters.maxAmount);
      if (filters.searchText) params.append("searchText", filters.searchText);
      params.append("page", filters.page.toString());
      params.append("limit", filters.limit.toString());
      
      const url = `/api/orders${params.toString() ? `?${params.toString()}` : ''}`;
      return fetch(url).then(res => res.json());
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: orderStatuses } = useQuery({
    queryKey: ["/api/order-statuses"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const sortedOrders = ordersData?.orders ? [...ordersData.orders].sort((a: any, b: any) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // 특별 처리가 필요한 필드들
    if (sortConfig.key === 'vendor') {
      aValue = a.vendor?.name || '';
      bValue = b.vendor?.name || '';
    } else if (sortConfig.key === 'user') {
      aValue = a.user ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim() : '';
      bValue = b.user ? `${b.user.firstName || ''} ${b.user.lastName || ''}`.trim() : '';
    } else if (sortConfig.key === 'items') {
      aValue = a.items && a.items.length > 0 ? a.items[0].itemName || '' : '';
      bValue = b.items && b.items.length > 0 ? b.items[0].itemName || '' : '';
    } else if (sortConfig.key === 'orderDate' || sortConfig.key === 'deliveryDate') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    } else if (sortConfig.key === 'totalAmount') {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  }) : [];

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
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

  const handlePdfPreview = (orderId: number) => {
    window.open(`/orders/${orderId}/preview`, '_blank');
  };

  const orders = ordersData?.orders || [];
  const totalOrders = ordersData?.total || 0;

  const getStatusColor = (status: string) => {
    const statusObj = Array.isArray(orderStatuses) ? orderStatuses.find((s: any) => s.code === status) : null;
    if (statusObj) {
      switch (statusObj.color) {
        case "gray":
          return "bg-gray-100 text-gray-800";
        case "yellow":
          return "bg-yellow-100 text-yellow-800";
        case "blue":
          return "bg-blue-100 text-blue-800";
        case "green":
          return "bg-green-100 text-green-800";
        case "purple":
          return "bg-purple-100 text-purple-800";
        case "red":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    }
    return "bg-gray-100 text-gray-800";
  };

  const getStatusTextForOrder = (status: string) => {
    // 먼저 statusUtils의 한글 변환 함수 사용
    const koreanStatus = getStatusText(status);
    if (koreanStatus !== status) {
      return koreanStatus;
    }
    
    // 백업으로 orderStatuses 사용
    const statusObj = Array.isArray(orderStatuses) ? orderStatuses.find((s: any) => s.code === status) : null;
    return statusObj ? statusObj.name : status;
  };

  const handleFilterChange = (key: string, value: string) => {
    // searchText의 경우 빈 문자열로 변환하지 않고 그대로 유지
    let filterValue = value;
    if (key !== "searchText" && value === "all") {
      filterValue = "";
    }
    setFilters(prev => ({ ...prev, [key]: filterValue, page: 1 }));
  };

  const handleDeleteOrder = (orderId: number) => {
    if (confirm("정말로 이 발주서를 삭제하시겠습니까?")) {
      deleteOrderMutation.mutate(orderId);
    }
  };

  // 이메일 발송 버튼 클릭 핸들러
  const handleEmailSend = (order: any) => {
    setSelectedOrder(order);
    setEmailDialogOpen(true);
  };

  // 이메일 발송 실행
  const handleSendEmail = async (emailData: any) => {
    if (!selectedOrder) return;

    try {
      const orderData = {
        orderNumber: selectedOrder.orderNumber,
        vendorName: selectedOrder.vendor?.name || '',
        orderDate: selectedOrder.orderDate,
        totalAmount: selectedOrder.totalAmount,
        siteName: selectedOrder.project?.projectName,
        // 실제 파일 경로는 서버에서 처리
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          {filters.vendorId && filters.vendorId !== "all" ? (
            <p className="text-sm text-blue-600 font-semibold">
              {Array.isArray(vendors) ? vendors.find((v: any) => v.id.toString() === filters.vendorId)?.name : "거래처"} 거래처 발주서
            </p>
          ) : (
            <p className="text-sm text-gray-600">발주서 목록을 조회하고 관리하세요</p>
          )}
        </div>
        <div className="flex gap-2 mt-3 sm:mt-0">
          {filters.vendorId && filters.vendorId !== "all" && (
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-sm"
              onClick={() => handleFilterChange("vendorId", "all")}
            >
              전체 발주서 보기
            </Button>
          )}
          <Button 
            variant="outline"
            size="sm" 
            className="h-8 text-sm"
            onClick={() => navigate("/email-history")}
          >
            <History className="h-4 w-4 mr-1" />
            이메일 이력
          </Button>
          <Button 
            size="sm" 
            className="h-8 text-sm"
            onClick={() => navigate("/create-order")}
          >
            <Plus className="h-4 w-4 mr-1" />
            새 발주서
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          {/* Always Visible: Search and Project Filter */}
          <div className="space-y-4 mb-4">
            {/* Search and Project Filter in one row */}
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              {/* Search Section */}
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-2">검색</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="발주번호, 품목명으로 검색..."
                    value={filters.searchText}
                    onChange={(e) => handleFilterChange("searchText", e.target.value)}
                    className={`pl-10 h-10 ${filters.searchText ? "border-blue-500 bg-blue-50" : ""}`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleFilterChange("searchText", filters.searchText);
                      }
                    }}
                  />
                  {filters.searchText && (
                    <button
                      onClick={() => handleFilterChange("searchText", "")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="검색어 지우기"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Project Filter */}
              <div className="w-full lg:w-80">
                <label className="text-sm font-medium text-gray-700 block mb-2">현장</label>
                <Select value={filters.projectId} onValueChange={(value) => handleFilterChange("projectId", value)}>
                  <SelectTrigger className={`h-10 ${filters.projectId && filters.projectId !== "all" ? "border-blue-500 bg-blue-50" : ""}`}>
                    <SelectValue placeholder="모든 현장" />
                  </SelectTrigger>
                  <SelectContent>
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
                  className="flex items-center gap-2 h-10 px-4"
                >
                  <Filter className="h-4 w-4" />
                  상세 필터
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
            <div className="border-t pt-4">
              {/* Filters Section - 요구사항 순서: 금액 범위, 기간 범위, 거래처, 작성자 */}
              <div className="space-y-4">
                {/* 첫 번째 행: 금액 범위 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium text-gray-700">금액 범위</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="₩1,000,000"
                        value={filters.minAmount}
                        onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                        className={`h-9 flex-1 ${filters.minAmount ? "border-blue-500 bg-blue-50" : ""}`}
                      />
                      <span className="text-gray-400 text-sm">~</span>
                      <Input
                        type="number"
                        placeholder="₩10,000,000"
                        value={filters.maxAmount}
                        onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                        className={`h-9 flex-1 ${filters.maxAmount ? "border-blue-500 bg-blue-50" : ""}`}
                      />
                    </div>
                  </div>
                </div>

                {/* 두 번째 행: 기간 범위, 거래처, 상태 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">발주일 범위</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange("startDate", e.target.value)}
                        className={`h-9 w-full ${filters.startDate ? "border-blue-500 bg-blue-50" : ""}`}
                        placeholder="시작일"
                      />
                      <span className="text-gray-400 text-sm">~</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange("endDate", e.target.value)}
                        className={`h-9 w-full ${filters.endDate ? "border-blue-500 bg-blue-50" : ""}`}
                        placeholder="종료일"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">거래처</label>
                    <Select value={filters.vendorId} onValueChange={(value) => handleFilterChange("vendorId", value)}>
                      <SelectTrigger className={`h-9 ${filters.vendorId && filters.vendorId !== "all" ? "border-blue-500 bg-blue-50" : ""}`}>
                        <SelectValue placeholder="모든 거래처" />
                      </SelectTrigger>
                      <SelectContent>
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
                    <label className="text-sm font-medium text-gray-700">발주 상태</label>
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                      <SelectTrigger className={`h-9 ${filters.status && filters.status !== "all" ? "border-blue-500 bg-blue-50" : ""}`}>
                        <SelectValue placeholder="모든 상태" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">모든 상태</SelectItem>
                        {(orderStatuses as any[])?.map((status: any) => (
                          <SelectItem key={status.id} value={status.code}>
                            {getStatusTextForOrder(status.code)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 세 번째 행: 작성자 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">작성자</label>
                    <Select value={filters.userId} onValueChange={(value) => handleFilterChange("userId", value)}>
                      <SelectTrigger className={`h-9 ${filters.userId && filters.userId !== "all" ? "border-blue-500 bg-blue-50" : ""}`}>
                        <SelectValue placeholder="모든 작성자" />
                      </SelectTrigger>
                      <SelectContent>
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

          {/* Active Filters & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
            {/* Active Filters Display */}
            {(filters.projectId !== "all" || (filters.vendorId && filters.vendorId !== "all") || (filters.userId && filters.userId !== "all") || (filters.status && filters.status !== "all") || filters.startDate || filters.endDate || filters.minAmount || filters.maxAmount || filters.searchText) ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-600">적용된 필터:</span>
                
                {filters.projectId && filters.projectId !== "all" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 border border-purple-200">
                    현장: {Array.isArray(projects) ? projects.find((p: any) => p.id.toString() === filters.projectId)?.projectName || "선택된 현장" : "선택된 현장"}
                    <button
                      onClick={() => handleFilterChange("projectId", "all")}
                      className="ml-2 hover:bg-purple-200 rounded-full w-4 h-4 flex items-center justify-center text-purple-600"
                      title="필터 제거"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                {(filters.minAmount || filters.maxAmount) && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-emerald-100 text-emerald-800 border border-emerald-200">
                    금액: {filters.minAmount && filters.maxAmount 
                      ? `${Number(filters.minAmount).toLocaleString()}원 ~ ${Number(filters.maxAmount).toLocaleString()}원`
                      : filters.minAmount 
                        ? `${Number(filters.minAmount).toLocaleString()}원 이상`
                        : `${Number(filters.maxAmount).toLocaleString()}원 이하`
                    }
                    <button
                      onClick={() => {
                        handleFilterChange("minAmount", "");
                        handleFilterChange("maxAmount", "");
                      }}
                      className="ml-2 hover:bg-emerald-200 rounded-full w-4 h-4 flex items-center justify-center text-emerald-600"
                      title="필터 제거"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                {(filters.startDate || filters.endDate) && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800 border border-orange-200">
                    기간: {filters.startDate && filters.endDate 
                      ? `${filters.startDate} ~ ${filters.endDate}`
                      : filters.startDate 
                        ? `${filters.startDate} 이후`
                        : `${filters.endDate} 이전`
                    }
                    <button
                      onClick={() => {
                        handleFilterChange("startDate", "");
                        handleFilterChange("endDate", "");
                      }}
                      className="ml-2 hover:bg-orange-200 rounded-full w-4 h-4 flex items-center justify-center text-orange-600"
                      title="필터 제거"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                {filters.vendorId && filters.vendorId !== "all" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 border border-green-200">
                    거래처: {Array.isArray(vendors) ? vendors.find((v: any) => v.id.toString() === filters.vendorId)?.name || "선택된 거래처" : "선택된 거래처"}
                    <button
                      onClick={() => handleFilterChange("vendorId", "all")}
                      className="ml-2 hover:bg-green-200 rounded-full w-4 h-4 flex items-center justify-center text-green-600"
                      title="필터 제거"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                {filters.status && filters.status !== "all" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800 border border-indigo-200">
                    상태: {getStatusTextForOrder(filters.status)}
                    <button
                      onClick={() => handleFilterChange("status", "all")}
                      className="ml-2 hover:bg-indigo-200 rounded-full w-4 h-4 flex items-center justify-center text-indigo-600"
                      title="필터 제거"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                {filters.userId && filters.userId !== "all" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200">
                    작성자: {Array.isArray(users) ? (() => {
                      const user = users.find((u: any) => u.id === filters.userId);
                      return user ? (user.name || user.email) : "선택된 작성자";
                    })() : "선택된 작성자"}
                    <button
                      onClick={() => handleFilterChange("userId", "all")}
                      className="ml-2 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center text-blue-600"
                      title="필터 제거"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                {filters.searchText && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 border border-gray-200">
                    검색: "{filters.searchText}"
                    <button
                      onClick={() => handleFilterChange("searchText", "")}
                      className="ml-2 hover:bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center text-gray-600"
                      title="검색어 제거"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center text-sm text-gray-500">
                <span>모든 발주서 표시 중</span>
              </div>
            )}

            {/* Filter Actions */}
            <div className="flex items-center gap-3">
              {(filters.projectId !== "all" || (filters.vendorId && filters.vendorId !== "all") || (filters.userId && filters.userId !== "all") || filters.startDate || filters.endDate || filters.minAmount || filters.maxAmount || filters.searchText) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleFilterChange("projectId", "all");
                    handleFilterChange("vendorId", "all");
                    handleFilterChange("userId", "all");
                    handleFilterChange("startDate", "");
                    handleFilterChange("endDate", "");
                    handleFilterChange("minAmount", "");
                    handleFilterChange("maxAmount", "");
                    handleFilterChange("searchText", "");
                  }}
                  className="h-8 px-3 text-sm text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  전체 초기화
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="h-8 px-3 text-sm text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-1" />
                엑셀 다운로드
              </Button>
              <div className="text-sm text-gray-500">
                총 <span className="font-medium text-gray-900">{ordersData?.total || 0}</span>건
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-sm text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                    <EyeOff className="h-4 w-4 mr-1" />
                    열 표시/숨김
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {columns.filter(col => col.key !== 'actions').map((column) => (
                    <div key={column.key} className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        id={`column-${column.key}`}
                        checked={!hiddenColumns.includes(column.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setHiddenColumns(prev => prev.filter(col => col !== column.key));
                          } else {
                            setHiddenColumns(prev => [...prev, column.key]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`column-${column.key}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                        {column.label}
                      </label>
                    </div>
                  ))}
                  <div className="border-t mt-2 pt-2">
                    <button
                      onClick={() => setHiddenColumns([])}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-gray-50"
                    >
                      모든 열 표시
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  {columns.map((column) => (
                    !hiddenColumns.includes(column.key) && (
                      <TableHead 
                        key={column.key}
                        className={`h-11 px-4 text-sm font-semibold text-gray-700 ${column.key !== 'actions' ? 'cursor-pointer hover:bg-gray-50 select-none' : 'text-right'} ${column.width}`}
                        onClick={column.key !== 'actions' ? () => handleSort(column.key) : undefined}
                      >
                        {column.key !== 'actions' ? (
                          <div className="flex items-center space-x-1">
                            <span>{column.label}</span>
                            {getSortIcon(column.key)}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-2">
                            <span>{column.label}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHiddenColumns(prev => 
                                  prev.length > 0 ? [] : ['orderDate', 'user']
                                );
                              }}
                              className="h-6 w-6 p-0 hover:bg-gray-100"
                              title={hiddenColumns.length > 0 ? "모든 열 표시" : "일부 열 숨기기"}
                            >
                              {hiddenColumns.length > 0 ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                      </TableHead>
                    )
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    </TableRow>
                  ))
                ) : sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      발주서가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map((order: any) => (
                    <TableRow key={order.id} className="h-12 hover:bg-gray-50 border-b border-gray-100">
                      {columns.map((column) => (
                        !hiddenColumns.includes(column.key) && (
                          <TableCell key={column.key} className="py-2 px-4">
                            {column.key === 'orderNumber' && (
                              <div 
                                className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline overflow-hidden text-ellipsis whitespace-nowrap"
                                onClick={() => navigate(`/orders/${order.id}`)}
                                title={order.orderNumber}
                              >
                                {abbreviateOrderNumber(order.orderNumber)}
                              </div>
                            )}
                            
                            {column.key === 'project' && (
                              <div className="text-sm">
                                <div 
                                  className="font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline overflow-hidden text-ellipsis whitespace-nowrap"
                                  onClick={() => navigate(`/projects/${order.project?.id}`)}
                                  title={order.project?.projectName}
                                >
                                  {truncateText(order.project?.projectName || '', 20)}
                                </div>
                                <div className="text-gray-500 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                                  {order.project?.projectCode}
                                </div>
                              </div>
                            )}
                            
                            {column.key === 'vendor' && (
                              <div 
                                className="text-sm cursor-pointer text-blue-600 hover:text-blue-800 hover:underline overflow-hidden text-ellipsis whitespace-nowrap"
                                onClick={() => navigate(`/vendors/${order.vendor?.id}`)}
                                title={order.vendor?.name}
                              >
                                {truncateText(order.vendor?.name || '', 15)}
                              </div>
                            )}
                            
                            {column.key === 'items' && (
                              <div className="text-sm">
                                {order.items && order.items.length > 0 ? (
                                  <div>
                                    <div className="font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap" title={order.items[0].itemName}>
                                      {truncateText(order.items[0].itemName, 18)}
                                    </div>
                                    {order.items.length > 1 && (
                                      <div className="text-gray-500 text-xs">
                                        외 {order.items.length - 1}개 품목
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">품목 없음</span>
                                )}
                              </div>
                            )}
                            
                            {column.key === 'orderDate' && (
                              <div className="text-sm text-gray-700 whitespace-nowrap">
                                {new Date(order.orderDate).toLocaleDateString()}
                              </div>
                            )}
                            
                            {column.key === 'totalAmount' && (
                              <div className="text-sm font-semibold text-blue-600 whitespace-nowrap">
                                {formatKoreanWon(order.totalAmount)}
                              </div>
                            )}
                            
                            {column.key === 'status' && (
                              <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                                {order.statusName || getStatusTextForOrder(order.status)}
                              </Badge>
                            )}
                            
                            {column.key === 'emailStatus' && (
                              <div className="flex items-center gap-1">
                                {order.emailStatus === 'sent' ? (
                                  <Badge 
                                    className="bg-green-100 text-green-800 text-xs cursor-help" 
                                    title={order.sentAt ? `발송일시: ${new Date(order.sentAt).toLocaleString('ko-KR')}` : '발송 완료'}
                                  >
                                    <Mail className="h-3 w-3 mr-1" />
                                    발송완료
                                  </Badge>
                                ) : order.emailStatus === 'failed' ? (
                                  <Badge 
                                    className="bg-red-100 text-red-800 text-xs cursor-help" 
                                    title={order.lastEmailError || '이메일 발송 실패'}
                                  >
                                    <Mail className="h-3 w-3 mr-1" />
                                    발송실패
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-600 text-xs">
                                    <Mail className="h-3 w-3 mr-1" />
                                    미발송
                                  </Badge>
                                )}
                                {order.emailSentCount > 0 && (
                                  <span className="text-xs text-gray-500">({order.emailSentCount})</span>
                                )}
                              </div>
                            )}
                            
                            {column.key === 'user' && (
                              <div className="text-sm text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap" title={order.user ? order.user.name : '알 수 없음'}>
                                {order.user ? truncateText(order.user.name, 10) : '알 수 없음'}
                              </div>
                            )}
                            
                            {column.key === 'actions' && (
                              <div className="flex items-center justify-end space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0"
                                  title="수정"
                                  onClick={() => navigate(`/orders/${order.id}/edit`)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0"
                                  title="발주서 미리보기"
                                  onClick={() => handlePdfPreview(order.id)}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0"
                                  title="이메일 발송"
                                  onClick={() => handleEmailSend(order)}
                                >
                                  <Mail className="h-4 w-4 text-blue-500" />
                                </Button>
                                {(user?.role === "admin" || order.userId === user?.id) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0"
                                    title="삭제"
                                    onClick={() => handleDeleteOrder(order.id)}
                                    disabled={deleteOrderMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        )
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalOrders > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50/50">
              <div className="text-sm text-gray-700">
                총 <span className="font-semibold">{totalOrders}</span>건 중{" "}
                <span className="font-semibold">
                  {(filters.page - 1) * filters.limit + 1}
                </span>
                -
                <span className="font-semibold">
                  {Math.min(filters.page * filters.limit, totalOrders)}
                </span>
                번째
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-sm"
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={filters.page <= 1}
                >
                  이전
                </Button>
                
                {/* Page numbers */}
                {(() => {
                  const totalPages = Math.ceil(totalOrders / filters.limit);
                  const currentPage = filters.page;
                  const pages = [];
                  
                  // Show first page
                  if (currentPage > 3) {
                    pages.push(1);
                    if (currentPage > 4) {
                      pages.push('...');
                    }
                  }
                  
                  // Show pages around current page
                  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
                    pages.push(i);
                  }
                  
                  // Show last page
                  if (currentPage < totalPages - 2) {
                    if (currentPage < totalPages - 3) {
                      pages.push('...');
                    }
                    pages.push(totalPages);
                  }
                  
                  return pages.map((page, index) => {
                    if (page === '...') {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 py-1 text-sm text-gray-500">
                          ...
                        </span>
                      );
                    }
                    
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, page: page as number }))}
                        className="h-8 min-w-[32px] text-sm"
                      >
                        {page}
                      </Button>
                    );
                  });
                })()}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-sm"
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={filters.page * filters.limit >= totalOrders}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 이메일 발송 다이얼로그 */}
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
    </div>
  );
}
