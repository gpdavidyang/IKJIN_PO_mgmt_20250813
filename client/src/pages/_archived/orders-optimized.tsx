/**
 * Optimized Orders Page
 * High-performance version of the order management page
 * Uses single API call instead of multiple queries
 */

import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Filter, ChevronUp, ChevronDown, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useOptimizedOrdersWithPrefetch } from "@/hooks/use-optimized-orders";
import { getStatusText } from "@/lib/statusUtils";
import { Badge } from "@/components/ui/badge";

// Lazy load the enhanced table for better initial bundle size
const EnhancedOrdersTable = lazy(() => 
  import("@/components/orders/enhanced-orders-table").then(module => ({
    default: module.EnhancedOrdersTable
  }))
);

// Performance indicator component
const PerformanceIndicator = ({ queryTime, cacheHit }: { queryTime?: string; cacheHit?: boolean }) => (
  <div className="flex items-center gap-2 text-xs text-gray-500">
    <Zap className="h-3 w-3" />
    <span>Query: {queryTime || 'N/A'}</span>
    {cacheHit && <Badge variant="secondary" className="text-xs">Cached</Badge>}
  </div>
);

export default function OptimizedOrders() {
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
    limit: 20, // Reduced from 50 for better performance
  });

  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Initialize filters from URL parameters
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
      limit: 20
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
    performance,
    cacheHit,
    queryTime,
    prefetchRelatedData
  } = useOptimizedOrdersWithPrefetch(filters);

  // Prefetch related data when component mounts
  useEffect(() => {
    prefetchRelatedData();
  }, [prefetchRelatedData]);

  const handleFilterChange = (key: string, value: string) => {
    const filterValue = (value === "all") ? "" : value;
    setFilters(prev => ({ ...prev, [key]: filterValue, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Transform orders for the table component
  const ordersWithEmailStatus = orders.map((order: any) => ({
    ...order,
    vendorName: order.vendorName,
    projectName: order.projectName,
    userName: order.userName,
  }));

  if (error) {
    return (
      <div className="p-3 space-y-3 bg-gray-50 min-h-screen">
        <Card className="shadow-sm">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-2">오류 발생</h2>
            <p className="text-gray-600 mb-4">발주서 데이터를 불러오는 중 오류가 발생했습니다.</p>
            <Button onClick={() => window.location.reload()}>새로고침</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 bg-gray-50 min-h-screen">
      {/* Page Header with Performance Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">발주서 관리</h1>
            <Badge variant="secondary" className="text-xs">최적화됨</Badge>
          </div>
          {filters.vendorId && filters.vendorId !== "" ? (
            <p className="text-xs text-blue-600 font-medium mt-1">
              {vendors.find((v: any) => v.id.toString() === filters.vendorId)?.name} 거래처 발주서
            </p>
          ) : (
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-gray-500">발주서 목록을 조회하고 관리하세요</p>
              <PerformanceIndicator queryTime={queryTime} cacheHit={cacheHit} />
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-2 sm:mt-0">
          {filters.vendorId && filters.vendorId !== "" && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleFilterChange("vendorId", "")}
              className="h-8 text-xs"
            >
              전체 발주서 보기
            </Button>
          )}
          <Button 
            onClick={() => navigate("/create-order")}
            className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
          >
            <Plus className="h-4 w-4 mr-1" />
            새 발주서
          </Button>
        </div>
      </div>

      {/* Search & Filters - Same as original but more responsive */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <div className="space-y-3 mb-3">
            <div className="flex flex-col xl:flex-row xl:items-end gap-3">
              {/* Search Section */}
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-700 block mb-1">검색</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="발주번호, 품목명으로 검색..."
                    value={filters.searchText}
                    onChange={(e) => handleFilterChange("searchText", e.target.value)}
                    className={`pl-8 h-8 text-xs ${filters.searchText ? "border-blue-500 bg-blue-50" : ""}`}
                  />
                </div>
              </div>

              {/* Project Filter */}
              <div className="w-full xl:w-64">
                <label className="text-xs font-medium text-gray-700 block mb-1">현장</label>
                <Select value={filters.projectId || "all"} onValueChange={(value) => handleFilterChange("projectId", value)}>
                  <SelectTrigger className={`h-8 text-xs ${filters.projectId && filters.projectId !== "" ? "border-blue-500 bg-blue-50" : ""}`}>
                    <SelectValue placeholder="모든 현장" />
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
              </div>

              {/* Filter Toggle Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className="flex items-center gap-1 h-8 text-xs"
                  size="sm"
                >
                  <Filter className="h-3 w-3" />
                  필터
                  {isFilterExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Collapsible Filter Section - Same as original */}
          {isFilterExpanded && (
            <div className="border-t pt-3">
              <div className="space-y-3">
                {/* Vendor and Status Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">거래처</label>
                    <Select value={filters.vendorId || "all"} onValueChange={(value) => handleFilterChange("vendorId", value)}>
                      <SelectTrigger className={`h-8 text-xs ${filters.vendorId && filters.vendorId !== "" ? "border-blue-500 bg-blue-50" : ""}`}>
                        <SelectValue placeholder="모든 거래처" />
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
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">발주 상태</label>
                    <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange("status", value)}>
                      <SelectTrigger className={`h-8 text-xs ${filters.status && filters.status !== "" ? "border-blue-500 bg-blue-50" : ""}`}>
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

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">작성자</label>
                    <Select value={filters.userId || "all"} onValueChange={(value) => handleFilterChange("userId", value)}>
                      <SelectTrigger className={`h-8 text-xs ${filters.userId && filters.userId !== "" ? "border-blue-500 bg-blue-50" : ""}`}>
                        <SelectValue placeholder="모든 작성자" />
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
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t">
            <div className="text-xs text-gray-500">
              총 {total.toLocaleString()}개 중 {((page - 1) * filters.limit + 1).toLocaleString()}-{Math.min(page * filters.limit, total).toLocaleString()}개 표시
            </div>
            <div className="flex items-center gap-2">
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
                    limit: 20,
                  });
                }}
                className="h-7 text-xs"
              >
                초기화
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                엑셀
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Orders Table with Suspense */}
      <Suspense fallback={
        <Card className="shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">테이블 로딩 중...</span>
            </div>
          </CardContent>
        </Card>
      }>
        <EnhancedOrdersTable
          orders={ordersWithEmailStatus}
          isLoading={isLoading}
          onStatusChange={(orderId, newStatus) => {
            // TODO: Implement optimized status change
            console.log('Status change:', orderId, newStatus);
          }}
          onDelete={(orderId) => {
            // TODO: Implement optimized delete
            console.log('Delete:', orderId);
          }}
          onEmailSend={(order) => {
            // TODO: Implement email send
            console.log('Email send:', order);
          }}
          onViewEmailHistory={(order) => {
            // TODO: Implement email history
            console.log('Email history:', order);
          }}
        />
      </Suspense>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={!hasPreviousPage}
                className="h-8 text-xs"
              >
                이전
              </Button>
              
              <div className="flex items-center gap-2 text-xs">
                <span>페이지 {page} / {totalPages}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={!hasNextPage}
                className="h-8 text-xs"
              >
                다음
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && performance && (
        <Card className="shadow-sm border-dashed">
          <CardContent className="p-3">
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Query Time:</span>
                <span className={queryTime && parseFloat(queryTime) > 500 ? 'text-red-500' : 'text-green-500'}>
                  {queryTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cache Hit:</span>
                <span className={cacheHit ? 'text-green-500' : 'text-yellow-500'}>
                  {cacheHit ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Orders Loaded:</span>
                <span>{orders.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}