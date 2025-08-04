/**
 * Virtualized Orders List - Example implementation
 * Demonstrates virtualization for the purchase orders list
 */

import React from 'react';
import { VirtualScrollList, InfiniteVirtualList } from './VirtualScrollList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatKoreanWon, formatDate } from '@/lib/utils';
import { FileText, Building, Calendar, DollarSign, User, ChevronRight } from 'lucide-react';

interface Order {
  id: number;
  title: string;
  status: 'pending' | 'approved' | 'sent' | 'cancelled' | 'draft';
  amount: number;
  projectName?: string;
  vendorName?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  priority?: 'high' | 'medium' | 'low';
}

interface VirtualOrdersListProps {
  orders: Order[];
  onOrderClick?: (order: Order) => void;
  onOrderAction?: (order: Order, action: string) => void;
  containerHeight?: number;
  enableInfiniteScroll?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
  isLoading?: boolean;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200', 
  sent: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusLabels = {
  pending: '승인대기',
  approved: '승인완료',
  sent: '발송완료',
  cancelled: '취소됨',
  draft: '임시저장',
};

const priorityColors = {
  high: 'text-red-600',
  medium: 'text-yellow-600',
  low: 'text-green-600',
};

function OrderListItem({ 
  order, 
  onClick, 
  onAction, 
  isVisible = true 
}: { 
  order: Order; 
  onClick?: (order: Order) => void;
  onAction?: (order: Order, action: string) => void;
  isVisible?: boolean;
}) {
  // Skeleton loading state when not visible
  if (!isVisible) {
    return (
      <div className="p-4 border-b border-gray-200 animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="mt-2 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer group"
      onClick={() => onClick?.(order)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {order.title}
              </h3>
              {order.priority && (
                <span className={`text-xs font-medium ${priorityColors[order.priority]}`}>
                  {order.priority === 'high' ? '긴급' : order.priority === 'medium' ? '보통' : '낮음'}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {order.projectName && (
                <div className="flex items-center space-x-1">
                  <Building className="h-3 w-3" />
                  <span className="truncate max-w-32">{order.projectName}</span>
                </div>
              )}
              {order.vendorName && (
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-32">{order.vendorName}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(order.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="flex items-center space-x-1 text-sm font-medium text-gray-900">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span>{formatKoreanWon(order.amount)}</span>
            </div>
            <Badge 
              variant="outline" 
              className={`text-xs mt-1 ${statusColors[order.status]}`}
            >
              {statusLabels[order.status]}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-1">
            {order.status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.(order, 'approve');
                }}
              >
                승인
              </Button>
            )}
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function VirtualOrdersList({
  orders,
  onOrderClick,
  onOrderAction,
  containerHeight = 600,
  enableInfiniteScroll = false,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isLoading = false,
}: VirtualOrdersListProps) {
  const renderOrderItem = (order: Order, index: number, isVisible: boolean = true) => (
    <OrderListItem
      key={order.id}
      order={order}
      onClick={onOrderClick}
      onAction={onOrderAction}
      isVisible={isVisible}
    />
  );

  const emptyMessage = "발주서가 없습니다";
  
  const EmptyComponent = () => (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
      <FileText className="h-12 w-12 text-gray-300 mb-4" />
      <p className="text-sm">{emptyMessage}</p>
      <p className="text-xs text-gray-400 mt-1">새 발주서를 생성해보세요</p>
    </div>
  );

  const LoadingComponent = ({ count }: { count: number }) => (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-200 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="space-y-1 text-right">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-5 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (enableInfiniteScroll) {
    return (
      <InfiniteVirtualList
        items={orders}
        renderItem={renderOrderItem}
        itemHeight={88} // Approximately 88px per order item
        containerHeight={containerHeight}
        className="border rounded-lg bg-white"
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        emptyMessage={emptyMessage}
        EmptyComponent={EmptyComponent}
        LoadingComponent={LoadingComponent}
        scrollEndThreshold={200}
        overscan={3}
      />
    );
  }

  return (
    <VirtualScrollList
      items={orders}
      renderItem={renderOrderItem}
      itemHeight={88} // Approximately 88px per order item
      containerHeight={containerHeight}
      className="border rounded-lg bg-white"
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      EmptyComponent={EmptyComponent}
      LoadingComponent={LoadingComponent}
      overscan={3}
    />
  );
}

/**
 * Virtualized Orders Grid for card-based layout
 */
interface VirtualOrdersGridProps {
  orders: Order[];
  onOrderClick?: (order: Order) => void;
  columnCount?: number;
  containerHeight?: number;
}

export function VirtualOrdersGrid({
  orders,
  onOrderClick,
  columnCount = 3,
  containerHeight = 600,
}: VirtualOrdersGridProps) {
  const renderOrderCard = (order: Order, index: number) => (
    <div 
      key={order.id}
      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onOrderClick?.(order)}
    >
      <div className="flex items-center justify-between mb-3">
        <Badge 
          variant="outline" 
          className={`text-xs ${statusColors[order.status]}`}
        >
          {statusLabels[order.status]}
        </Badge>
        <span className="text-xs text-gray-500">#{order.id}</span>
      </div>
      
      <h3 className="font-medium text-sm text-gray-900 mb-2 line-clamp-2">
        {order.title}
      </h3>
      
      <div className="space-y-1 text-xs text-gray-500 mb-3">
        {order.projectName && (
          <div className="flex items-center space-x-1">
            <Building className="h-3 w-3" />
            <span className="truncate">{order.projectName}</span>
          </div>
        )}
        <div className="flex items-center space-x-1">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(order.createdAt)}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">
          {formatKoreanWon(order.amount)}
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          gap: '1rem',
          height: containerHeight,
          overflow: 'auto'
        }}
      >
        {orders.map(renderOrderCard)}
      </div>
    </div>
  );
}