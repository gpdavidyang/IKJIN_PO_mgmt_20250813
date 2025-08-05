import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useOrders, useVendors, useProjects, useUsers } from "@/hooks/use-enhanced-queries";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getStatusText } from "@/lib/statusUtils";
import { EmailSendDialog } from "@/components/email-send-dialog";
import { EmailService } from "@/services/emailService";
import { EnhancedOrdersTable } from "@/components/orders/enhanced-orders-table";

export default function Orders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();

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

  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Initialize filters based on URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const filter = urlParams.get('filter');
    const vendorIdFromUrl = urlParams.get('vendor');
    
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
    
    if (status && !filter) {
      newFilters.status = status;
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
    let filterValue = value;
    if (key !== "searchText" && value === "all") {
      filterValue = "";
    }
    setFilters(prev => ({ ...prev, [key]: filterValue, page: 1 }));
  };

  // Email handlers
  const handleEmailSend = (order: any) => {
    setSelectedOrder(order);
    setEmailDialogOpen(true);
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

  const orders = ordersData?.orders || [];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">발주서 관리</h1>
          {filters.vendorId && filters.vendorId !== "all" ? (
            <p className="text-sm text-primary-600 font-medium mt-1">
              {Array.isArray(vendors) ? vendors.find((v: any) => v.id.toString() === filters.vendorId)?.name : "거래처"} 거래처 발주서
            </p>
          ) : (
            <p className="text-sm text-gray-600 mt-1">발주서 목록을 조회하고 관리하세요</p>
          )}
        </div>
        <div className="flex gap-2 mt-3 sm:mt-0">
          {filters.vendorId && filters.vendorId !== "all" && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleFilterChange("vendorId", "all")}
            >
              전체 발주서 보기
            </Button>
          )}
          <Button 
            onClick={() => navigate("/create-order")}
            className="bg-primary-500 hover:bg-primary-600"
          >
            <Plus className="h-4 w-4 mr-1" />
            새 발주서
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          {/* Always Visible: Search and Project Filter */}
          <div className="space-y-4 mb-4">
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
                    className={`pl-10 ${filters.searchText ? "border-primary-500 bg-primary-50" : ""}`}
                  />
                </div>
              </div>

              {/* Project Filter */}
              <div className="w-full lg:w-80">
                <label className="text-sm font-medium text-gray-700 block mb-2">현장</label>
                <Select value={filters.projectId} onValueChange={(value) => handleFilterChange("projectId", value)}>
                  <SelectTrigger className={filters.projectId && filters.projectId !== "all" ? "border-primary-500 bg-primary-50" : ""}>
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
                  className="flex items-center gap-2"
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
              <div className="space-y-4">
                {/* Amount Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium text-gray-700">금액 범위</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="₩1,000,000"
                        value={filters.minAmount}
                        onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                        className={filters.minAmount ? "border-primary-500 bg-primary-50" : ""}
                      />
                      <span className="text-gray-400 text-sm">~</span>
                      <Input
                        type="number"
                        placeholder="₩10,000,000"
                        value={filters.maxAmount}
                        onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                        className={filters.maxAmount ? "border-primary-500 bg-primary-50" : ""}
                      />
                    </div>
                  </div>
                </div>

                {/* Date Range, Vendor, Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">발주일 범위</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange("startDate", e.target.value)}
                        className={filters.startDate ? "border-primary-500 bg-primary-50" : ""}
                      />
                      <span className="text-gray-400 text-sm">~</span>
                      <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange("endDate", e.target.value)}
                        className={filters.endDate ? "border-primary-500 bg-primary-50" : ""}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">거래처</label>
                    <Select value={filters.vendorId} onValueChange={(value) => handleFilterChange("vendorId", value)}>
                      <SelectTrigger className={filters.vendorId && filters.vendorId !== "all" ? "border-primary-500 bg-primary-50" : ""}>
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
                      <SelectTrigger className={filters.status && filters.status !== "all" ? "border-primary-500 bg-primary-50" : ""}>
                        <SelectValue placeholder="모든 상태" />
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
                  </div>
                </div>

                {/* User Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">작성자</label>
                    <Select value={filters.userId} onValueChange={(value) => handleFilterChange("userId", value)}>
                      <SelectTrigger className={filters.userId && filters.userId !== "all" ? "border-primary-500 bg-primary-50" : ""}>
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
            <div className="flex flex-wrap items-center gap-2">
              {(filters.projectId !== "all" || filters.vendorId !== "all" || filters.userId !== "all" || 
                filters.status !== "all" || filters.startDate || filters.endDate || 
                filters.minAmount || filters.maxAmount || filters.searchText) && (
                <>
                  <span className="text-sm font-medium text-gray-600">적용된 필터:</span>
                  
                  {filters.searchText && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 border border-gray-200">
                      검색: "{filters.searchText}"
                      <button
                        onClick={() => handleFilterChange("searchText", "")}
                        className="ml-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  
                  {filters.projectId && filters.projectId !== "all" && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 border border-purple-200">
                      현장: {Array.isArray(projects) ? projects.find((p: any) => p.id.toString() === filters.projectId)?.projectName || "선택된 현장" : "선택된 현장"}
                      <button
                        onClick={() => handleFilterChange("projectId", "all")}
                        className="ml-2 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full w-4 h-4 flex items-center justify-center text-purple-600 dark:text-purple-400"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {(filters.projectId !== "all" || filters.vendorId !== "all" || filters.userId !== "all" || 
                filters.status !== "all" || filters.startDate || filters.endDate || 
                filters.minAmount || filters.maxAmount || filters.searchText) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({
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
                  }}
                >
                  전체 초기화
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
              >
                <Download className="h-4 w-4 mr-1" />
                엑셀 다운로드
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Orders Table */}
      <EnhancedOrdersTable
        orders={orders.map((order: any) => ({
          ...order,
          vendorName: order.vendor?.vendorName || order.vendor?.name,
          projectName: order.project?.projectName,
          userName: order.user?.name,
        }))}
        isLoading={ordersLoading}
        onStatusChange={(orderId, newStatus) => statusChangeMutation.mutate({ orderId, status: newStatus })}
        onDelete={(orderId) => deleteOrderMutation.mutate(orderId)}
      />

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
    </div>
  );
}