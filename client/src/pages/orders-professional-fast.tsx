import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Filter, ChevronUp, ChevronDown, FileText, Eye, Edit, Mail, Clock, CheckCircle, XCircle, AlertCircle, Calendar, Building, Users, DollarSign, Send, ChevronsUpDown, ChevronLeft, ChevronRight, Trash2, Info, Circle, PlayCircle, MailCheck, Truck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getStatusText } from "@/lib/statusUtils";
import { EmailSendDialog } from "@/components/email-send-dialog";
import { EmailService } from "@/services/emailService";
import { EmailHistoryModal } from "@/components/email-history-modal";
// import PDFPreviewModal from "@/components/workflow/preview/PDFPreviewModal"; // 모달 대신 직접 다운로드
import { BulkDeleteDialog } from "@/components/orders/bulk-delete-dialog";
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
    limit: 50, // 다양한 상태의 발주서를 표시하기 위해 50개로 증가
    sortBy: "createdAt",
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

  // PDF preview modal state - 제거 (직접 다운로드로 변경)
  // const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  // const [selectedOrderForPDF, setSelectedOrderForPDF] = useState<Order | null>(null);

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
    staleTime: 5000, // 5초로 단축하여 빠른 업데이트 지원
    gcTime: 60000, // 1분 동안 메모리에 캐시 유지
    refetchOnWindowFocus: true, // 윈도우 포커스 시 자동 refetch
    refetchOnMount: true // 컴포넌트 마운트 시 자동 refetch
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

  // 발주 상태 통계 조회
  const { data: statusStats } = useQuery({
    queryKey: ["order-status-stats"],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/order-status-stats`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch order status statistics');
      return response.json();
    },
    staleTime: 60000, // 1분 동안 캐시 유지
    gcTime: 300000, // 5분 동안 메모리에 캐시 유지
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
      return orderId; // Return the deleted order ID
    },
    onMutate: async (orderId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["orders-optimized"] });
      
      // Snapshot the previous value
      const previousOrders = queryClient.getQueriesData({ queryKey: ["orders-optimized"] });
      
      // Optimistically update all cached queries
      queryClient.setQueriesData(
        { queryKey: ["orders-optimized"] },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            orders: old.orders?.filter((order: any) => order.id.toString() !== orderId),
            totalCount: old.totalCount ? old.totalCount - 1 : 0
          };
        }
      );
      
      return { previousOrders };
    },
    onError: (err, orderId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousOrders) {
        context.previousOrders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      // Handle error messages
      if (isUnauthorizedError(err)) {
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
    onSuccess: async () => {
      // Invalidate and refetch
      await queryClient.invalidateQueries({ 
        queryKey: ["orders-optimized"],
        exact: false
      });
      toast({
        title: "성공",
        description: "발주서가 삭제되었습니다.",
      });
    }
  });

  // Bulk delete mutation for admin
  const bulkDeleteMutation = useMutation({
    mutationFn: async (orderIds: number[]) => {
      console.log('🚀 BULK DELETE: Starting mutation with orderIds:', orderIds);
      
      try {
        const response = await apiRequest("DELETE", `/api/orders/bulk-delete`, { orderIds });
        console.log('✅ BULK DELETE: API request successful, response:', response);
        return orderIds; // Return the deleted order IDs
      } catch (error) {
        console.error('❌ BULK DELETE: API request failed:', error);
        throw error;
      }
    },
    onMutate: async (orderIds: number[]) => {
      console.log('🔄 BULK DELETE: onMutate started with orderIds:', orderIds);
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["orders-optimized"] });
      console.log('🔄 BULK DELETE: Cancelled existing queries');
      
      // Snapshot the previous value
      const previousOrders = queryClient.getQueriesData({ queryKey: ["orders-optimized"] });
      console.log('🔄 BULK DELETE: Previous cached data snapshot:', previousOrders.length, 'queries found');
      
      // Log current cache state before update
      const currentCacheData = queryClient.getQueryData(["orders-optimized"]);
      console.log('🔄 BULK DELETE: Current cache data before optimistic update:', {
        totalOrders: currentCacheData?.orders?.length || 0,
        totalCount: currentCacheData?.totalCount || 0,
        firstFewOrders: currentCacheData?.orders?.slice(0, 3)?.map(o => ({ id: o.id, orderNumber: o.orderNumber })) || []
      });
      
      // Optimistically update all cached queries
      queryClient.setQueriesData(
        { queryKey: ["orders-optimized"] },
        (old: any) => {
          if (!old) {
            console.log('🔄 BULK DELETE: No cached data found, skipping optimistic update');
            return old;
          }
          
          const orderIdSet = new Set(orderIds.map(id => id.toString()));
          console.log('🔄 BULK DELETE: Created order ID set for filtering:', Array.from(orderIdSet));
          
          const filteredOrders = old.orders?.filter((order: any) => {
            const shouldKeep = !orderIdSet.has(order.id.toString());
            if (!shouldKeep) {
              console.log('🔄 BULK DELETE: Removing order from cache:', { id: order.id, orderNumber: order.orderNumber });
            }
            return shouldKeep;
          });
          
          const newData = {
            ...old,
            orders: filteredOrders,
            totalCount: old.totalCount ? old.totalCount - orderIds.length : 0
          };
          
          console.log('🔄 BULK DELETE: Optimistic update applied:', {
            originalCount: old.orders?.length || 0,
            newCount: filteredOrders?.length || 0,
            removedCount: orderIds.length,
            newTotalCount: newData.totalCount
          });
          
          return newData;
        }
      );
      
      // Verify cache was updated
      const updatedCacheData = queryClient.getQueryData(["orders-optimized"]);
      console.log('🔄 BULK DELETE: Cache data after optimistic update:', {
        totalOrders: updatedCacheData?.orders?.length || 0,
        totalCount: updatedCacheData?.totalCount || 0,
        firstFewOrders: updatedCacheData?.orders?.slice(0, 3)?.map(o => ({ id: o.id, orderNumber: o.orderNumber })) || []
      });
      
      return { previousOrders };
    },
    onError: (err, orderIds, context) => {
      console.error('❌ BULK DELETE: onError triggered:', err);
      console.log('❌ BULK DELETE: Rolling back for orderIds:', orderIds);
      
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousOrders) {
        console.log('❌ BULK DELETE: Rolling back', context.previousOrders.length, 'cached queries');
        context.previousOrders.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        console.log('❌ BULK DELETE: Rollback completed');
      } else {
        console.log('❌ BULK DELETE: No previous data found for rollback');
      }
      
      // Handle error messages
      if (isUnauthorizedError(err)) {
        console.log('❌ BULK DELETE: Unauthorized error, redirecting to login');
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
      
      console.log('❌ BULK DELETE: Showing error toast');
      toast({
        title: "오류",
        description: "발주서 일괄 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
    onSuccess: async (_, variables) => {
      console.log('✅ BULK DELETE: onSuccess triggered for orderIds:', variables);
      
      // Log cache state before invalidation
      const beforeInvalidation = queryClient.getQueryData(["orders-optimized"]);
      console.log('✅ BULK DELETE: Cache state before invalidation:', {
        totalOrders: beforeInvalidation?.orders?.length || 0,
        totalCount: beforeInvalidation?.totalCount || 0
      });
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ 
        queryKey: ["orders-optimized"],
        exact: false
      });
      console.log('✅ BULK DELETE: Cache invalidation completed');
      
      // Log cache state after invalidation (should trigger refetch)
      setTimeout(() => {
        const afterInvalidation = queryClient.getQueryData(["orders-optimized"]);
        console.log('✅ BULK DELETE: Cache state after invalidation:', {
          totalOrders: afterInvalidation?.orders?.length || 0,
          totalCount: afterInvalidation?.totalCount || 0
        });
      }, 100);
      
      toast({
        title: "성공",
        description: `${variables.length}개의 발주서가 삭제되었습니다.`,
      });
      setSelectedOrders(new Set());
      setBulkDeleteDialogOpen(false);
      
      console.log('✅ BULK DELETE: Success handling completed');
    }
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

  // Bulk selection handlers - simplified to avoid initialization issues
  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        console.log('🎯 SELECTION: Deselecting order:', orderId);
        newSet.delete(orderId);
      } else {
        console.log('🎯 SELECTION: Selecting order:', orderId);
        newSet.add(orderId);
      }
      console.log('🎯 SELECTION: Updated selected orders:', Array.from(newSet));
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length && orders.length > 0) {
      console.log('🎯 SELECTION: Deselecting all orders');
      setSelectedOrders(new Set());
    } else {
      const allOrderIds = orders.map(o => o.id);
      console.log('🎯 SELECTION: Selecting all orders:', allOrderIds);
      setSelectedOrders(new Set(allOrderIds));
    }
  };

  const handleBulkDelete = () => {
    if (selectedOrders.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    const orderIdsToDelete = Array.from(selectedOrders);
    console.log('🎯 BULK DELETE: confirmBulkDelete called with selected orders:', orderIdsToDelete);
    console.log('🎯 BULK DELETE: selectedOrders Set:', selectedOrders);
    
    bulkDeleteMutation.mutate(orderIdsToDelete);
  };

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

  // PDF 다운로드 handler (모달 대신 바로 다운로드)
  const handlePDFDownload = useCallback(async (order: Order) => {
    try {
      // attachments에서 PDF 찾기
      console.log('Fetching order details for ID:', order.id);
      const response = await apiRequest('GET', `/api/orders/${order.id}`);
      
      console.log('API Response:', response); // 디버깅용
      
      // response가 null이거나 undefined인 경우 처리
      if (!response) {
        console.error('API returned no data for order:', order.id);
        toast({
          title: "데이터 오류",
          description: "발주서 정보를 가져올 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
      
      const orderData = response;
      
      // attachments 배열 확인
      if (!orderData.attachments || !Array.isArray(orderData.attachments)) {
        console.log('No attachments array in order data');
        toast({
          title: "PDF 파일이 없습니다",
          description: "발주서 상세에서 PDF를 생성해주세요.",
          variant: "destructive",
        });
        return;
      }
      
      const pdfAttachment = orderData.attachments.find(
        (att: any) => att.mimeType?.includes('pdf') || att.originalName?.toLowerCase().endsWith('.pdf')
      );
      
      if (pdfAttachment) {
        console.log('Found PDF attachment:', pdfAttachment);
        // PDF 다운로드 - 새 탭에서 열기
        const url = `/api/attachments/${pdfAttachment.id}/download`;
        window.open(url, '_blank');
        
        toast({
          title: "PDF 다운로드",
          description: `발주서 ${order.orderNumber}의 PDF를 다운로드합니다.`,
        });
      } else {
        console.log('No PDF attachment found in:', orderData.attachments);
        toast({
          title: "PDF 파일이 없습니다",
          description: "발주서 상세에서 PDF를 생성해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('PDF download error:', error);
      // 에러 메시지 개선
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      toast({
        title: "다운로드 실패",
        description: `PDF 다운로드 중 오류가 발생했습니다: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [toast]);

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

  // Status colors optimized for dark mode visibility - 실제 status 필드에 맞게 수정
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/25 dark:text-yellow-200 dark:border-yellow-400/50';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400/50';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/25 dark:text-red-200 dark:border-red-400/50';
      case 'sent': return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/25 dark:text-indigo-200 dark:border-indigo-400/50';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-200 dark:border-green-400/50';
      case 'deleted': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/25 dark:text-red-200 dark:border-red-400/50';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50';
    }
  };

  // Get status text - 실제 status 필드에 맞게 수정
  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'draft': '임시저장',
      'pending': '결재대기',
      'approved': '승인됨',
      'rejected': '반려됨',
      'sent': '발송됨',
      'completed': '완료',
      'deleted': '삭제됨'
    };
    return statusMap[status] || status;
  };

  // 발주 상태 텍스트
  const getOrderStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'draft': '임시저장',
      'created': '발주생성',
      'sent': '발주완료',
      'delivered': '납품완료',
      'completed': '납품완료'  // legacy status 지원
    };
    return statusMap[status] || status || '-';
  };

  // 승인 상태 텍스트
  const getApprovalStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'not_required': '승인불필요',
      'pending': '승인대기',
      'approved': '승인완료',
      'rejected': '반려'
    };
    return statusMap[status] || status || '-';
  };

  // 발주 상태 색상
  const getOrderStatusColor = (status: string) => {
    switch(status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50';
      case 'created': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400/50';
      case 'sent': return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/25 dark:text-indigo-200 dark:border-indigo-400/50';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-200 dark:border-green-400/50';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-200 dark:border-green-400/50';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50';
    }
  };

  // 승인 상태 색상
  const getApprovalStatusColor = (status: string) => {
    switch(status) {
      case 'not_required': return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/25 dark:text-yellow-200 dark:border-yellow-400/50';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400/50';
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
          
          {/* 발주 상태 통계 카드 */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">발주 상태 현황</h3>
              {statusStats?.total && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  (총 {statusStats.total.toLocaleString()}건)
                </span>
              )}
            </div>
            
            {/* 통계 카드 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statusStats?.stats?.map((stat: any) => {
                const getStatusInfo = (status: string) => {
                  switch (status) {
                    case 'draft':
                      return {
                        icon: Circle,
                        iconColor: 'text-gray-500',
                        bgColor: 'bg-gray-50 dark:bg-gray-800',
                        borderColor: 'border-gray-200 dark:border-gray-700',
                        label: '임시저장',
                        description: '작성 중인 발주서'
                      };
                    case 'created':
                      return {
                        icon: PlayCircle,
                        iconColor: 'text-blue-500',
                        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                        borderColor: 'border-blue-200 dark:border-blue-800',
                        label: '발주생성',
                        description: '발주 시스템 내 생성(PDF 생성)'
                      };
                    case 'sent':
                      return {
                        icon: MailCheck,
                        iconColor: 'text-green-500',
                        bgColor: 'bg-green-50 dark:bg-green-900/20',
                        borderColor: 'border-green-200 dark:border-green-800',
                        label: '발주완료',
                        description: '거래처에 이메일 전송'
                      };
                    case 'delivered':
                      return {
                        icon: Truck,
                        iconColor: 'text-purple-500',
                        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
                        borderColor: 'border-purple-200 dark:border-purple-800',
                        label: '납품완료',
                        description: '납품(수령) 및 검수 완료'
                      };
                    default:
                      return {
                        icon: Circle,
                        iconColor: 'text-gray-500',
                        bgColor: 'bg-gray-50 dark:bg-gray-800',
                        borderColor: 'border-gray-200 dark:border-gray-700',
                        label: '기타',
                        description: '-'
                      };
                  }
                };

                const statusInfo = getStatusInfo(stat.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={stat.status}
                    className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${statusInfo.bgColor} ${statusInfo.borderColor}`}
                    onClick={() => handleFilterChange("orderStatus", stat.status)}
                    title={`${statusInfo.label} 상태의 발주서 필터링`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <StatusIcon className={`h-5 w-5 ${statusInfo.iconColor}`} />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="mb-1">
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {stat.count.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">건</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {statusInfo.description}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                stat.status === 'draft' ? 'bg-gray-500' :
                                stat.status === 'created' ? 'bg-blue-500' :
                                stat.status === 'sent' ? 'bg-green-500' : 'bg-purple-500'
                              }`}
                              style={{ width: `${stat.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {stat.percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
              {/* 발주 상태 필터 */}
              <Select value={filters.orderStatus || "all"} onValueChange={(value) => handleFilterChange("orderStatus", value)}>
                <SelectTrigger className="w-40 h-10 bg-white dark:bg-gray-700">
                  <SelectValue placeholder="발주 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 발주상태</SelectItem>
                  <SelectItem value="draft">임시저장</SelectItem>
                  <SelectItem value="created">발주생성</SelectItem>
                  <SelectItem value="sent">발주완료</SelectItem>
                  <SelectItem value="delivered">납품완료</SelectItem>
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
                {Object.values(filters).some(v => v && v !== "" && v !== 1 && v !== 50 && v !== "createdAt" && v !== "desc") && (
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
                      sortBy: "createdAt",
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
                      onClick={() => handleSort("orderStatus")}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      발주상태
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getOrderStatusColor(order.orderStatus || 'draft')}`}>
                          {getOrderStatusText(order.orderStatus || 'draft')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderEmailStatus(order)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Always show detail view button */}
                          <button
                            onClick={() => navigate(`/orders/${order.id}`)}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-md transition-all duration-200"
                            title="상세보기"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {/* Edit button - only for draft and created status */}
                          {(order.orderStatus === 'draft' || order.orderStatus === 'created' || 
                            (!order.orderStatus && order.status !== 'sent' && order.status !== 'delivered')) && (
                            <button
                              onClick={() => navigate(`/orders/${order.id}/edit`)}
                              className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20 rounded-md transition-all duration-200"
                              title="수정"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          
                          {/* PDF button - only for non-draft status (created, sent, delivered) */}
                          {(() => {
                            // orderStatus를 우선 확인 (새로운 발주 상태 필드)
                            if (order.orderStatus) {
                              // draft 상태면 PDF 버튼 숨김
                              return order.orderStatus !== 'draft' && ['created', 'sent', 'delivered'].includes(order.orderStatus);
                            }
                            // orderStatus가 없으면 기존 status 필드 확인
                            return order.status !== 'draft' && ['approved', 'sent', 'completed'].includes(order.status);
                          })() && (
                            <button
                              onClick={() => handlePDFDownload(order)}
                              className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20 rounded-md transition-all duration-200"
                              title="PDF 다운로드"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                          
                          {/* Email button - only for created status */}
                          {(order.orderStatus === 'created' || 
                            (!order.orderStatus && order.status === 'approved')) && (
                            <button
                              onClick={() => handleEmailSend(order)}
                              className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20 rounded-md transition-all duration-200"
                              title="이메일 전송"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                          )}
                          
                          {/* Email History button - for sent, delivered, and completed status */}
                          {(order.orderStatus === 'sent' || order.orderStatus === 'delivered' ||
                            (!order.orderStatus && (order.status === 'sent' || order.status === 'delivered' || order.status === 'completed'))) && (
                            <button
                              onClick={() => handleViewEmailHistory(order)}
                              className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-900/20 rounded-md transition-all duration-200"
                              title="이메일 기록"
                            >
                              <MailCheck className="h-4 w-4" />
                            </button>
                          )}
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

        {/* PDF Preview Modal - 제거 (직접 다운로드로 변경) */}

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