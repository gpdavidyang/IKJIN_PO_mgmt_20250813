import { Clock, FileText } from "lucide-react";
import { formatKoreanWon, formatDate } from "@/lib/utils";
import { getStatusText, getStatusColor } from "@/lib/statusUtils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RecentOrder {
  id: number;
  orderNumber: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  vendorName?: string;
}

interface RecentOrdersListProps {
  orders: RecentOrder[];
  onOrderClick?: (orderId: number) => void;
  maxItems?: number;
}

export function RecentOrdersList({ 
  orders, 
  onOrderClick, 
  maxItems = 10 
}: RecentOrdersListProps) {
  const displayOrders = orders.slice(0, maxItems);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mb-2 text-gray-300" />
        <p className="text-sm">아직 발주서가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayOrders.map((order) => (
        <div
          key={order.orderNumber}
          className={cn(
            "group flex items-center justify-between p-3 rounded-lg",
            "hover:bg-gray-50 transition-all duration-200",
            "cursor-pointer hover:shadow-sm"
          )}
          onClick={() => onOrderClick?.(order.id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                {order.orderNumber}
              </p>
              <Badge 
                variant="secondary"
                className={cn(
                  "text-xs px-2 py-0",
                  getStatusColor(order.status)
                )}
              >
                {getStatusText(order.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDate(order.createdAt)}</span>
              </div>
              {order.vendorName && (
                <span className="truncate">{order.vendorName}</span>
              )}
            </div>
          </div>
          
          <div className="text-right ml-4">
            <p className="text-sm font-semibold text-gray-900">
              {formatKoreanWon(order.totalAmount)}
            </p>
          </div>
        </div>
      ))}
      
      {orders.length > maxItems && (
        <div className="text-center pt-2">
          <p className="text-xs text-gray-500">
            외 {orders.length - maxItems}개 발주서
          </p>
        </div>
      )}
    </div>
  );
}