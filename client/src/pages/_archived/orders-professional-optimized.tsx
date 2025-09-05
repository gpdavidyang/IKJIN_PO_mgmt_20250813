import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Filter, ChevronUp, ChevronDown, FileText, Eye, Edit, Mail, Clock, CheckCircle, XCircle, AlertCircle, Calendar, Building, Users, DollarSign, Zap, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

// Performance indicator component
const PerformanceIndicator = ({ queryTime, cacheHit }: { queryTime?: string; cacheHit?: boolean }) => (
  <div className="flex items-center gap-2 text-xs text-gray-500">
    <Zap className="h-3 w-3 text-yellow-500" />
    <span>Query: {queryTime || 'N/A'}</span>
    {cacheHit && <Badge variant="secondary" className="text-xs">Cached</Badge>}
  </div>
);

export default function OrdersProfessionalOptimized() {
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
    limit: 20, // Reduced for better performance
    sortBy: "", // 정렬 필드
    sortOrder: "desc" // 정렬 방향 (asc, desc)
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
      limit: 20,
      sortBy: "",
      sortOrder: "desc"
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

  // Single optimized query replaces multiple API calls
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
    isLoading,
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
      a.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "발주서 목록이 엑셀 파일로 다운로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "엑셀 파일 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    const filterValue = (value === "all") ? "" : value;
    setFilters(prev => ({ ...prev, [key]: filterValue, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // 정렬 처리 함수
  const handleSort = (sortField: string) => {
    setFilters(prev => {
      const newSortOrder = 
        prev.sortBy === sortField && prev.sortOrder === "asc" ? "desc" : "asc";
      
      const newFilters = {
        ...prev,
        sortBy: sortField,
        sortOrder: newSortOrder,
        page: 1 // 정렬 시 첫 페이지로 이동
      };
      
      console.log('🔄 Sorting changed:', { sortField, newSortOrder, newFilters });
      return newFilters;
    });
  };

  // 정렬 아이콘 표시 함수
  const getSortIcon = (field: string) => {
    if (filters.sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return filters.sortOrder === "asc" ? 
      <ArrowUp className="h-4 w-4 text-blue-600" /> : 
      <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  const handleEmailSend = async (order: any) => {
    setSelectedOrder(order);
    setEmailDialogOpen(true);
  };

  const handleViewEmailHistory = (order: any) => {
    setSelectedOrderForHistory(order);
    setEmailHistoryModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-700", icon: FileText },
      pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
      approved: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
      rejected: { color: "bg-red-100 text-red-700", icon: XCircle },
      sent: { color: "bg-green-100 text-green-700", icon: Mail },
      completed: { color: "bg-purple-100 text-purple-700", icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {getStatusText(status)}
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1366px] mx-auto p-6">
          <Card className="shadow-sm">
            <CardContent className="p-6 text-center">
              <h2 className="text-lg font-semibold text-red-600 mb-2">오류 발생</h2>
              <p className="text-gray-600 mb-4">발주서 데이터를 불러오는 중 오류가 발생했습니다.</p>
              <Button onClick={() => window.location.reload()}>새로고침</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">발주서 관리</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-600">전체 {total.toLocaleString()}개의 발주서</p>
              <PerformanceIndicator queryTime={queryTime} cacheHit={cacheHit} />
            </div>
          </div>
          <Button 
            onClick={() => navigate("/create-order")}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            새 발주서 작성
          </Button>
        </div>

        {/* Search and Filters Card */}
        <Card className="mb-6 shadow-sm bg-white">
          <CardContent className="p-6 bg-blue-50/30">
            {/* Main Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="발주번호, 품목명으로 검색..."
                  value={filters.searchText}
                  onChange={(e) => handleFilterChange("searchText", e.target.value)}
                  className="pl-10 pr-4 py-2 w-full"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="발주 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="draft">{getStatusText("draft")}</SelectItem>
                  <SelectItem value="pending">{getStatusText("pending")}</SelectItem>
                  <SelectItem value="approved">{getStatusText("approved")}</SelectItem>
                  <SelectItem value="sent">{getStatusText("sent")}</SelectItem>
                  <SelectItem value="completed">{getStatusText("completed")}</SelectItem>
                  <SelectItem value="rejected">{getStatusText("rejected")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.vendorId || "all"} onValueChange={(value) => handleFilterChange("vendorId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="거래처" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 거래처</SelectItem>
                  {vendors.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.projectId || "all"} onValueChange={(value) => handleFilterChange("projectId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="현장" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 현장</SelectItem>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.projectName} ({project.projectCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="flex items-center justify-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                고급 필터
                {isFilterExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </div>

            {/* Advanced Filters */}
            {isFilterExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
                <Select value={filters.userId || "all"} onValueChange={(value) => handleFilterChange("userId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="작성자" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 작성자</SelectItem>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="시작일"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="종료일"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="최소 금액"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="최대 금액"
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6">
              <Button
                variant="outline"
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
                    limit: 20,
                    sortBy: "",
                    sortOrder: "desc"
                  });
                }}
              >
                필터 초기화
              </Button>
              <Button
                variant="outline"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                엑셀 다운로드
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="shadow-sm bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-50 border-b border-blue-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('orderNumber')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      발주번호
                      {getSortIcon('orderNumber')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      상태
                      {getSortIcon('status')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('vendorName')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      거래처
                      {getSortIcon('vendorName')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('projectName')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      현장
                      {getSortIcon('projectName')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('userName')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      작성자
                      {getSortIcon('userName')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('orderDate')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      발주일
                      {getSortIcon('orderDate')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('totalAmount')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      금액
                      {getSortIcon('totalAmount')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">발주서가 없습니다</p>
                      <p className="text-sm mt-2">필터를 조정하거나 새 발주서를 작성해보세요.</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.vendorName || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.projectName || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.userName || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(order.orderDate).toLocaleDateString('ko-KR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatKoreanWon(order.totalAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.emailStatus ? (
                          <div className="flex items-center gap-1">
                            {order.emailStatus === 'sent' ? (
                              <Mail className="h-4 w-4 text-green-500" />
                            ) : (
                              <Mail className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-xs text-gray-600">
                              {order.totalEmailsSent || 0}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/order/${order.id}`)}
                            className="p-1"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEmailSend(order)}
                              className="p-1"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          {(order.totalEmailsSent || 0) > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewEmailHistory(order)}
                              className="p-1"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          )}
                          {(user?.role === 'admin' || user?.id === order.userId) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/order/${order.id}/edit`)}
                                className="p-1"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("정말 삭제하시겠습니까?")) {
                                    deleteOrderMutation.mutate(order.id.toString());
                                  }
                                }}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t bg-blue-50/50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  총 {total}개 중 {((page - 1) * filters.limit) + 1}-{Math.min(page * filters.limit, total)}개 표시
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!hasPreviousPage}
                  >
                    이전
                  </Button>
                  <div className="flex items-center px-3 text-sm">
                    {page} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!hasNextPage}
                  >
                    다음
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
            order={selectedOrder}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["orders-optimized"] });
              queryClient.invalidateQueries({ queryKey: ["email-history"] });
            }}
          />
        )}

        {/* Email History Modal */}
        {selectedOrderForHistory && (
          <EmailHistoryModal
            open={emailHistoryModalOpen}
            onOpenChange={setEmailHistoryModalOpen}
            orderId={selectedOrderForHistory.id}
            orderNumber={selectedOrderForHistory.orderNumber}
          />
        )}
      </div>
    </div>
  );
}