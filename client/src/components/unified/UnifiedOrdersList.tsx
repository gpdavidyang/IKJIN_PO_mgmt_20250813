/**
 * Unified Orders List Component
 * A flexible component that can be used in dashboard, management pages, and other contexts
 */

import { useState, useMemo, useCallback } from "react";
import { Clock, FileText, Eye, Edit, Mail, Trash2, Download, Building, Users, DollarSign, CheckCircle, XCircle, AlertCircle, Circle, PlayCircle, MailCheck, Truck, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { formatKoreanWon, formatDate } from "@/lib/utils";
import { getStatusText, getStatusColor } from "@/lib/statusUtils";
import { 
  canShowPDF,
  getOrderStatusText
} from "@/lib/orderStatusUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useTheme } from "@/components/ui/theme-provider";
import type { 
  UnifiedOrder, 
  UnifiedOrdersListProps,
  OrderDisplayMode
} from "@/types/unified-orders";
import { useOrdersQuery, useRecentOrdersQuery, useOrdersWithFiltersQuery } from "@/hooks/useOrdersQuery";

/**
 * Get status icon based on order status
 */
function getStatusIcon(status: string, orderStatus?: string) {
  const currentStatus = orderStatus || status;
  
  switch (currentStatus) {
    case 'draft':
      return <Circle className="h-3 w-3" />;
    case 'pending':
      return <Clock className="h-3 w-3" />;
    case 'approved':
    case 'created':
      return <CheckCircle className="h-3 w-3" />;
    case 'sent':
      return <MailCheck className="h-3 w-3" />;
    case 'delivered':
      return <Truck className="h-3 w-3" />;
    case 'completed':
      return <CheckCircle className="h-3 w-3" />;
    case 'rejected':
      return <XCircle className="h-3 w-3" />;
    case 'urgent':
      return <AlertCircle className="h-3 w-3" />;
    default:
      return <Circle className="h-3 w-3" />;
  }
}

/**
 * Compact mode component for dashboard use
 */
function CompactOrderItem({ 
  order, 
  onOrderClick, 
  isDarkMode 
}: { 
  order: UnifiedOrder; 
  onOrderClick?: (orderId: number) => void;
  isDarkMode: boolean;
}) {
  const showPDF = useMemo(() => canShowPDF(order), [order]);

  return (
    <div 
      className={`flex items-center justify-between p-1 rounded cursor-pointer transition-colors ${
        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
      }`}
    >
      <div className="min-w-0 flex-1" onClick={() => onOrderClick?.(order.id)}>
        <div className={`text-xs font-medium truncate transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          {order.orderNumber}
        </div>
        <div className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {order.vendor?.name || order.vendorName}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className={`text-xs font-semibold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {formatKoreanWon(order.totalAmount || 0).replace('₩', '').replace(',000,000', 'M')}
          </div>
        </div>
        {/* PDF 다운로드 버튼 */}
        {showPDF && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/api/orders/${order.id}/download-pdf`, '_blank');
            }}
            className={`p-1 rounded transition-colors ${
              isDarkMode 
                ? 'text-orange-400 hover:bg-orange-900/20 hover:text-orange-300' 
                : 'text-orange-500 hover:bg-orange-50 hover:text-orange-700'
            }`}
            title="PDF 다운로드"
          >
            <FileText className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact table mode for dashboard - enhanced with sorting and status
 */
function CompactTableOrderItem({ 
  order, 
  onOrderClick, 
  isDarkMode,
  sortBy,
  sortOrder,
  onSort,
  showActions = false
}: { 
  order: UnifiedOrder; 
  onOrderClick?: (orderId: number) => void;
  isDarkMode: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  showActions?: boolean;
}) {
  const showPDF = useMemo(() => canShowPDF(order), [order]);

  const getSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-3 w-3" /> : 
      <ChevronDown className="h-3 w-3" />;
  };

  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    }`}>
      {/* 발주번호 */}
      <td className="px-3 py-2">
        <button
          onClick={() => onOrderClick?.(order.id)}
          className={`text-xs font-medium transition-colors ${
            isDarkMode 
              ? 'text-blue-400 hover:text-blue-300' 
              : 'text-blue-600 hover:text-blue-700'
          }`}
        >
          {order.orderNumber}
        </button>
      </td>
      
      {/* 거래처 */}
      <td className={`px-3 py-2 text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <div className="truncate max-w-[120px]" title={order.vendor?.name || order.vendorName}>
          {order.vendor?.name || order.vendorName || '-'}
        </div>
      </td>

      {/* 금액 */}
      <td className={`px-3 py-2 text-xs font-medium text-right ${
        isDarkMode ? 'text-gray-100' : 'text-gray-900'
      }`}>
        {formatKoreanWon(order.totalAmount || 0).replace('₩', '').replace(',000,000', 'M')}
      </td>

      {/* 발주상태 */}
      <td className="px-3 py-2">
        <Badge 
          variant="secondary"
          className={cn(
            "text-xs px-2 py-0",
            getStatusColor(order.orderStatus || order.status)
          )}
        >
          {getStatusText(order.orderStatus || order.status)}
        </Badge>
      </td>

      {/* 액션 */}
      {showActions && (
        <td className="px-3 py-2 text-center">
          {showPDF && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/api/orders/${order.id}/download-pdf`, '_blank');
              }}
              className={`p-1 rounded transition-colors ${
                isDarkMode 
                  ? 'text-orange-400 hover:bg-orange-900/20 hover:text-orange-300' 
                  : 'text-orange-500 hover:bg-orange-50 hover:text-orange-700'
              }`}
              title="PDF 다운로드"
            >
              <FileText className="h-3 w-3" />
            </button>
          )}
        </td>
      )}
    </tr>
  );
}

/**
 * Detailed mode component for general lists
 */
function DetailedOrderItem({ 
  order, 
  onOrderClick,
  isDarkMode 
}: { 
  order: UnifiedOrder; 
  onOrderClick?: (orderId: number) => void;
  isDarkMode: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between p-3 rounded-lg",
        "hover:bg-gray-50 transition-all duration-200",
        "cursor-pointer hover:shadow-sm",
        isDarkMode && "hover:bg-gray-800"
      )}
      onClick={() => onOrderClick?.(order.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={`text-sm font-medium group-hover:text-primary-600 transition-colors ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            {order.orderNumber}
          </p>
          <Badge 
            variant="secondary"
            className={cn(
              "text-xs px-2 py-0",
              getStatusColor(order.orderStatus || order.status)
            )}
          >
            {getStatusText(order.orderStatus || order.status)}
          </Badge>
        </div>
        <div className={`flex items-center gap-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDate(order.createdAt || order.orderDate)}</span>
          </div>
          {(order.vendor?.name || order.vendorName) && (
            <span className="truncate">{order.vendor?.name || order.vendorName}</span>
          )}
        </div>
      </div>
      
      <div className="text-right ml-4">
        <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          {formatKoreanWon(order.totalAmount)}
        </p>
      </div>
    </div>
  );
}

/**
 * Full mode component for management pages
 */
function FullOrderItem({ 
  order, 
  onOrderClick, 
  onStatusChange,
  onDeleteOrder,
  isDarkMode,
  showActions = true
}: { 
  order: UnifiedOrder; 
  onOrderClick?: (orderId: number) => void;
  onStatusChange?: (orderId: number, status: string) => void;
  onDeleteOrder?: (orderId: number) => void;
  isDarkMode: boolean;
  showActions?: boolean;
}) {
  const [, navigate] = useLocation();

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className={`p-4 border rounded-lg transition-colors ${
      isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
    }`}>
      {/* Order Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${
            isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
          }`}>
            {getStatusIcon(order.status, order.orderStatus)}
          </div>
          <div>
            <h3 
              className={`font-semibold cursor-pointer transition-colors ${
                isDarkMode ? 'text-gray-100 hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'
              }`}
              onClick={() => onOrderClick?.(order.id)}
            >
              {order.orderNumber}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant="secondary"
                className={cn(
                  "text-xs px-2 py-0",
                  getStatusColor(order.orderStatus || order.status)
                )}
              >
                {getStatusText(order.orderStatus || order.status)}
              </Badge>
              {order.approvalStatus && (
                <Badge 
                  variant="outline"
                  className="text-xs px-2 py-0"
                >
                  {getStatusText(order.approvalStatus)}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {formatKoreanWon(order.totalAmount)}
          </div>
          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {formatDate(order.createdAt || order.orderDate)}
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Building className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {order.project?.projectName || order.projectName || '프로젝트 없음'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {order.vendor?.name || order.vendorName || '거래처 없음'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {order.deliveryDate ? formatDate(order.deliveryDate) : '배송일 미정'}
          </span>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => handleAction(e, () => navigate(`/orders/${order.id}`))}
          >
            <Eye className="h-4 w-4 mr-1" />
            상세보기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => handleAction(e, () => navigate(`/orders/${order.id}/edit`))}
          >
            <Edit className="h-4 w-4 mr-1" />
            수정
          </Button>
          {order.vendor?.email && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleAction(e, () => {/* 이메일 발송 로직 */})}
            >
              <Mail className="h-4 w-4 mr-1" />
              이메일
            </Button>
          )}
          {order.filePath && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleAction(e, () => window.open(`/api/orders/${order.id}/download-pdf`, '_blank'))}
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => handleAction(e, () => onDeleteOrder?.(order.id))}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Main UnifiedOrdersList Component
 */
export function UnifiedOrdersList({
  mode = 'detailed',
  maxItems,
  showActions = true,
  showPagination = false,
  filters,
  orders: preloadedOrders,
  onOrderClick,
  onStatusChange,
  onDeleteOrder,
  compact = false,
  className = "",
  enableSelection = false,
  selectedOrders = [],
  onSelectionChange,
  sortBy,
  sortOrder,
  onSort
}: UnifiedOrdersListProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [, navigate] = useLocation();
  
  // compact-table 모드에서는 기본적으로 액션을 숨김
  const effectiveShowActions = mode === 'compact-table' ? false : showActions;

  // Determine which query to use based on props
  const shouldFetchData = !preloadedOrders;
  
  // Use recent orders query for dashboard/compact mode
  const recentQuery = useRecentOrdersQuery(maxItems || 10);
  
  // Use filtered query for management pages
  const filteredQuery = useOrdersWithFiltersQuery(filters || {});

  // Determine which data to use
  const queryResult = mode === 'compact' ? recentQuery : filteredQuery;
  const { data: queryData, isLoading, error } = shouldFetchData ? queryResult : { data: null, isLoading: false, error: null };

  // Final orders data
  const orders = useMemo(() => {
    if (preloadedOrders) {
      return maxItems ? preloadedOrders.slice(0, maxItems) : preloadedOrders;
    }
    
    const fetchedOrders = queryData?.orders || [];
    return maxItems ? fetchedOrders.slice(0, maxItems) : fetchedOrders;
  }, [preloadedOrders, queryData?.orders, maxItems]);

  // Handle click events
  const handleOrderClick = (orderId: number) => {
    if (onOrderClick) {
      onOrderClick(orderId);
    } else {
      navigate(`/orders/${orderId}`);
    }
  };

  // Sort icon helper for compact-table mode
  const getSortIcon = useCallback((field: string) => {
    if (sortBy !== field) {
      return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-3 w-3" /> : 
      <ChevronDown className="h-3 w-3" />;
  }, [sortBy, sortOrder]);

  // Loading state
  if (shouldFetchData && isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <FileText className={`h-12 w-12 mb-2 animate-pulse ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
        <p className="text-sm">발주서를 불러오는 중...</p>
      </div>
    );
  }

  // Error state
  if (shouldFetchData && error) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
        <AlertCircle className="h-12 w-12 mb-2" />
        <p className="text-sm">발주서를 불러오는데 실패했습니다</p>
      </div>
    );
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <FileText className={`h-12 w-12 mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
        <p className="text-sm">발주서가 없습니다</p>
      </div>
    );
  }

  // Render based on mode
  const renderOrders = () => {
    switch (mode) {
      case 'compact':
        return (
          <div className="space-y-1">
            {orders.map((order) => (
              <CompactOrderItem
                key={order.id}
                order={order}
                onOrderClick={handleOrderClick}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        );

      case 'compact-table':
        return (
          <div className={`overflow-x-auto rounded-lg border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <table className="w-full min-w-full">
              <thead className={`${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              } border-b`}>
                <tr>
                  <th className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <button
                      onClick={() => onSort?.("orderNumber")}
                      className={`flex items-center gap-1 transition-colors ${
                        isDarkMode ? 'hover:text-gray-100' : 'hover:text-gray-700'
                      }`}
                    >
                      발주번호
                      {getSortIcon("orderNumber")}
                    </button>
                  </th>
                  <th className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <button
                      onClick={() => onSort?.("vendorName")}
                      className={`flex items-center gap-1 transition-colors ${
                        isDarkMode ? 'hover:text-gray-100' : 'hover:text-gray-700'
                      }`}
                    >
                      거래처
                      {getSortIcon("vendorName")}
                    </button>
                  </th>
                  <th className={`px-3 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <button
                      onClick={() => onSort?.("totalAmount")}
                      className={`flex items-center gap-1 justify-end transition-colors ${
                        isDarkMode ? 'hover:text-gray-100' : 'hover:text-gray-700'
                      }`}
                    >
                      금액
                      {getSortIcon("totalAmount")}
                    </button>
                  </th>
                  <th className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <button
                      onClick={() => onSort?.("orderStatus")}
                      className={`flex items-center gap-1 transition-colors ${
                        isDarkMode ? 'hover:text-gray-100' : 'hover:text-gray-700'
                      }`}
                    >
                      발주상태
                      {getSortIcon("orderStatus")}
                    </button>
                  </th>
                  {effectiveShowActions && (
                    <th className={`px-3 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      액션
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'
              }`}>
                {orders.map((order) => (
                  <CompactTableOrderItem
                    key={order.id}
                    order={order}
                    onOrderClick={handleOrderClick}
                    isDarkMode={isDarkMode}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                    showActions={effectiveShowActions}
                  />
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'detailed':
        return (
          <div className="space-y-2">
            {orders.map((order) => (
              <DetailedOrderItem
                key={order.id}
                order={order}
                onOrderClick={handleOrderClick}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        );

      case 'full':
        return (
          <div className="space-y-4">
            {orders.map((order) => (
              <FullOrderItem
                key={order.id}
                order={order}
                onOrderClick={handleOrderClick}
                onStatusChange={onStatusChange}
                onDeleteOrder={onDeleteOrder}
                isDarkMode={isDarkMode}
                showActions={effectiveShowActions}
              />
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("unified-orders-list", className)}>
      {renderOrders()}
      
      {/* Show "더 보기" link for compact mode */}
      {mode === 'compact' && queryData && queryData.total > orders.length && (
        <div className="text-center pt-2">
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            외 {queryData.total - orders.length}개 발주서
          </p>
        </div>
      )}
    </div>
  );
}