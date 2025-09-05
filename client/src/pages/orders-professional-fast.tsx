import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Filter, ChevronUp, ChevronDown, FileText, Eye, Edit, Mail, Clock, CheckCircle, XCircle, AlertCircle, Calendar, Building, Users, DollarSign, Send, ChevronsUpDown, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getStatusText } from "@/lib/statusUtils";
import { EmailSendDialog } from "@/components/email-send-dialog";
import { EmailService } from "@/services/emailService";
import { EmailHistoryModal } from "@/components/email-history-modal";
import PDFPreviewModal from "@/components/workflow/preview/PDFPreviewModal";
import { formatKoreanWon } from "@/lib/utils";
import { debounce } from "lodash";

// 타입 정의
interface Order {
  id: number;
  orderNumber: string;
  status: string;
  orderStatus?: string; // 발주 상태: draft, created, sent, delivered
  approvalStatus?: string; // 승인 상태: not_required, pending, approved, rejected
  totalAmount: number;
  orderDate: string;
  deliveryDate: string | null;
  createdAt?: string; // 등록일
  userId: string;
  vendorId: number | null;
  projectId: number | null;
  vendorName: string | null;
  projectName: string | null;
  userName: string | null;
  emailStatus: string | null;
  totalEmailsSent: number;
  vendor?: { id: number; name: string; email?: string };
  project?: { id: number; projectName: string; projectCode?: string };
  user?: { name: string };
  filePath?: string;
  notes?: string;
  remarks?: string;
  items?: any[];
  createdBy?: string;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  metadata?: {
    vendors: any[];
    projects: any[];
    users: any[];
  };
  performance?: {
    queryTime: string;
    cacheHit: boolean;
  };
}

export default function OrdersProfessionalFast() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  const [filters, setFilters] = useState({
    status: "",
    orderStatus: "", // 발주 상태 필터 추가
    approvalStatus: "", // 승인 상태 필터 추가
    vendorId: "",
    projectId: "",
    userId: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
    searchText: "",
    page: 1,
    limit: 20, // 초기 로딩 속도를 위해 20개로 제한
    sortBy: "orderDate",
    sortOrder: "desc" as "asc" | "desc",
  });

  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Email history modal state
  const [emailHistoryModalOpen, setEmailHistoryModalOpen] = useState(false);
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<Order | null>(null);

  // PDF preview modal state
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [selectedOrderForPDF, setSelectedOrderForPDF] = useState<Order | null>(null);

  // For bulk selection - moved after other state declarations to avoid initialization issues
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  // Initialize filters based on URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const filter = urlParams.get('filter');
    const vendorIdFromUrl = urlParams.get('vendor');
    
    const newFilters: any = { 
      ...filters,
      page: 1,
      status: "",
      vendorId: "", 
      projectId: "",
      userId: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
      searchText: ""
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

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((searchText: string) => {
      setDebouncedSearchText(searchText);
    }, 500),
    []
  );

  // Update debounced search when searchText changes
  useEffect(() => {
    debouncedSearch(filters.searchText);
  }, [filters.searchText, debouncedSearch]);

  // 최적화된 단일 API 호출
  const { data, isLoading, error } = useQuery<OrdersResponse>({
    queryKey: ["orders-optimized", { ...filters, searchText: debouncedSearchText }],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries({ ...filters, searchText: debouncedSearchText }).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/orders-optimized?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    staleTime: 30000, // 30초 동안 캐시 유지
    gcTime: 60000, // 1분 동안 메모리에 캐시 유지
  });

  // 메타데이터 prefetch (드롭다운 데이터)
  const { data: metadata } = useQuery({
    queryKey: ["orders-metadata"],
    queryFn: async () => {
      const response = await fetch(`/api/orders-metadata`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch metadata');
      return response.json();
    },
    staleTime: 300000, // 5분 동안 캐시 유지
    gcTime: 600000, // 10분 동안 메모리에 캐시 유지
  });

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

  // Bulk delete mutation for admin
  const bulkDeleteMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      await apiRequest("DELETE", `/api/orders/bulk-delete`, { orderIds });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders-optimized"] });
      toast({
        title: "성공",
        description: `${variables.length}개의 발주서가 삭제되었습니다.`,
      });
      setSelectedOrders(new Set());
      setBulkDeleteDialogOpen(false);
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
        description: "발주서 일괄 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      Object.entries({ ...filters, searchText: debouncedSearchText }).forEach(([key, value]) => {
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

  const handleFilterChange = useCallback((key: string, value: string) => {
    const filterValue = (value === "all") ? "" : value;
    setFilters(prev => ({ ...prev, [key]: filterValue, page: 1 }));
  }, []);

  // Bulk selection handlers
  const toggleOrderSelection = useCallback((orderId: number) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedOrders.size === orders.length && orders.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  }, [orders, selectedOrders.size]);

  const handleBulkDelete = useCallback(() => {
    if (selectedOrders.size === 0) return;
    setBulkDeleteDialogOpen(true);
  }, [selectedOrders.size]);

  const confirmBulkDelete = useCallback(() => {
    bulkDeleteMutation.mutate(Array.from(selectedOrders));
  }, [selectedOrders, bulkDeleteMutation]);

  // 정렬 처리 함수
  const handleSort = useCallback((field: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc",
      page: 1
    }));
  }, []);

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    // Scroll to top of table
    document.querySelector('.orders-table')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Email handlers
  const handleEmailSend = useCallback((order: Order) => {
    setSelectedOrder(order);
    setEmailDialogOpen(true);
  }, []);

  const handleSendEmail = useCallback(async (emailData: any) => {
    if (!selectedOrder) return;

    try {
      const orderData = {
        orderNumber: selectedOrder.orderNumber,
        vendorName: selectedOrder.vendorName || '',
        orderDate: selectedOrder.orderDate,
        totalAmount: selectedOrder.totalAmount,
        siteName: selectedOrder.projectName,
        filePath: selectedOrder.filePath || ''
      };

      await EmailService.sendPurchaseOrderEmail(orderData, emailData);
      
      toast({
        title: "이메일 발송 완료",
        description: `${selectedOrder.vendorName}에게 발주서 ${selectedOrder.orderNumber}를 전송했습니다.`,
      });
    } catch (error) {
      toast({
        title: "이메일 발송 실패",
        description: error instanceof Error ? error.message : "이메일 발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  }, [selectedOrder, toast]);

  const handleViewEmailHistory = useCallback((order: Order) => {
    setSelectedOrderForHistory(order);
    setEmailHistoryModalOpen(true);
  }, []);

  // PDF preview handler
  const handlePDFPreview = useCallback((order: Order) => {
    setSelectedOrderForPDF(order);
    setPdfPreviewOpen(true);
  }, []);

  // Download handler
  const handleDownloadOrder = useCallback(async (orderId: string) => {
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
  }, [toast]);

  // 데이터 준비
  const orders = data?.orders || [];
  const vendors = metadata?.vendors || data?.metadata?.vendors || [];
  const projects = metadata?.projects || data?.metadata?.projects || [];
  const users = metadata?.users || data?.metadata?.users || [];
  
  // Email status rendering
  const renderEmailStatus = (order: Order) => {
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
              {data?.performance && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Query: {data.performance.queryTime} {data.performance.cacheHit && '(cached)'}
                </p>
              )}
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
                  className="pl-10 h-11 text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                />
                {filters.searchText && filters.searchText !== debouncedSearchText && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              {/* 발주 상태 필터 (신규 추가) */}
              <Select value={filters.orderStatus || "all"} onValueChange={(value) => handleFilterChange("orderStatus", value)}>
                <SelectTrigger className="w-40 h-10 bg-white dark:bg-gray-700">
                  <SelectValue placeholder="발주 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 발주 상태</SelectItem>
                  <SelectItem value="draft">초안</SelectItem>
                  <SelectItem value="created">발주생성</SelectItem>
                  <SelectItem value="sent">발주발송</SelectItem>
                  <SelectItem value="delivered">납품완료</SelectItem>
                </SelectContent>
              </Select>

              {/* 승인 상태 필터 (기존 status를 approvalStatus로 변경) */}
              <Select value={filters.approvalStatus || "all"} onValueChange={(value) => handleFilterChange("approvalStatus", value)}>
                <SelectTrigger className="w-40 h-10 bg-white dark:bg-gray-700">
                  <SelectValue placeholder="승인 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 승인 상태</SelectItem>
                  <SelectItem value="not_required">승인불필요</SelectItem>
                  <SelectItem value="pending">승인 대기</SelectItem>
                  <SelectItem value="approved">승인 완료</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.projectId || "all"} onValueChange={(value) => handleFilterChange("projectId", value)}>
                <SelectTrigger className="w-48 h-10 bg-white dark:bg-gray-700">
                  <SelectValue placeholder="현장 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 현장</SelectItem>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.vendorId || "all"} onValueChange={(value) => handleFilterChange("vendorId", value)}>
                <SelectTrigger className="w-48 h-10 bg-white dark:bg-gray-700">
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
                className="h-10 px-4"
              >
                <Filter className="h-4 w-4 mr-2" />
                고급 필터
                {isFilterExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>

              <div className="ml-auto flex gap-2">
                {Object.values(filters).some(v => v && v !== "" && v !== 1 && v !== 20 && v !== "orderDate" && v !== "desc") && (
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
                      limit: 20,
                      sortBy: "orderDate",
                      sortOrder: "desc"
                    })}
                    className="h-10"
                  >
                    필터 초기화
                  </Button>
                )}
                {isAdmin && selectedOrders.size > 0 && (
                  <Button
                    variant="destructive"
                    onClick={handleBulkDelete}
                    className="h-10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    선택한 {selectedOrders.size}개 삭제
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  className="h-10"
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
                        className="h-10 text-sm"
                      />
                      <span className="text-gray-400 dark:text-gray-500">~</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange("endDate", e.target.value)}
                        className="h-10 text-sm"
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
                        className="h-10 text-sm"
                      />
                      <span className="text-gray-400 dark:text-gray-500">~</span>
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
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">작성자</label>
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
        <Card className="shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 orders-table">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {isAdmin && (
                    <th className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedOrders.size === orders.length && orders.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </th>
                  )}
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
                      onClick={() => handleSort("createdAt")}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      등록일
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
                {isLoading ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} className="px-6 py-12 text-center">
                      <div className="text-gray-500 dark:text-gray-400">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm">발주서가 없습니다.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      {isAdmin && (
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          {order.orderNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.vendorName && order.vendorId ? (
                          <button
                            onClick={() => navigate(`/vendors/${order.vendorId}`)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
                            title="거래처 상세 정보 보기"
                          >
                            {order.vendorName}
                          </button>
                        ) : (
                          <div className="text-sm text-gray-900 dark:text-gray-100">{order.vendorName || '-'}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.projectName && order.projectId ? (
                          <button
                            onClick={() => navigate(`/projects/${order.projectId}`)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
                            title="현장 상세 정보 보기"
                          >
                            {order.projectName}
                          </button>
                        ) : (
                          <div className="text-sm text-gray-900 dark:text-gray-100">{order.projectName || '-'}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {new Date(order.orderDate).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
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
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/orders/${order.id}`)}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-md transition-all duration-200"
                            title="상세보기"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => navigate(`/orders/${order.id}/edit`)}
                            className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20 rounded-md transition-all duration-200"
                            title="수정"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handlePDFPreview(order)}
                            className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20 rounded-md transition-all duration-200"
                            title="PDF 보기"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          
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
          
          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  총 {data.total}개 중 {((data.page - 1) * data.limit) + 1}-{Math.min(data.page * data.limit, data.total)}개 표시
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.page - 1)}
                    disabled={!data.hasPreviousPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                      let pageNumber;
                      if (data.totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (data.page <= 3) {
                        pageNumber = i + 1;
                      } else if (data.page >= data.totalPages - 2) {
                        pageNumber = data.totalPages - 4 + i;
                      } else {
                        pageNumber = data.page - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNumber}
                          variant={pageNumber === data.page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNumber)}
                          className="min-w-[40px]"
                        >
                          {pageNumber}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.page + 1)}
                    disabled={!data.hasNextPage}
                  >
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Email Send Dialog */}
        {selectedOrder && (
          <EmailSendDialog
            open={emailDialogOpen}
            onOpenChange={setEmailDialogOpen}
            orderData={{
              orderNumber: selectedOrder.orderNumber,
              vendorName: selectedOrder.vendorName || '',
              vendorEmail: selectedOrder.vendor?.email,
              orderDate: new Date(selectedOrder.orderDate).toLocaleDateString(),
              totalAmount: selectedOrder.totalAmount,
              siteName: selectedOrder.projectName
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
              projectName: selectedOrderForPDF.projectName,
              vendorName: selectedOrderForPDF.vendorName,
              totalAmount: selectedOrderForPDF.totalAmount,
              orderDate: selectedOrderForPDF.orderDate,
              deliveryDate: selectedOrderForPDF.deliveryDate,
              status: selectedOrderForPDF.status,
              filePath: selectedOrderForPDF.filePath,
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

        {/* Bulk Delete Dialog */}
        {isAdmin && (
          <BulkDeleteDialog
            open={bulkDeleteDialogOpen}
            onOpenChange={setBulkDeleteDialogOpen}
            selectedOrders={Array.from(selectedOrders).map(id => {
              const order = orders.find(o => o.id === id);
              return {
                id: String(id),
                orderNumber: order?.orderNumber || '',
                status: order?.status || '',
                vendorName: order?.vendorName,
                totalAmount: order?.totalAmount || 0
              };
            })}
            onConfirm={confirmBulkDelete}
            isLoading={bulkDeleteMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}