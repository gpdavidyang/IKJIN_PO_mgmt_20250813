import { UnifiedOrdersList } from "@/components/unified/UnifiedOrdersList";
import type { UnifiedOrder } from "@/types/unified-orders";

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

/**
 * Legacy wrapper component for backward compatibility
 * Now uses UnifiedOrdersList internally
 */
export function RecentOrdersList({ 
  orders, 
  onOrderClick, 
  maxItems = 10 
}: RecentOrdersListProps) {
  // Transform legacy order format to unified format
  const unifiedOrders: UnifiedOrder[] = orders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    orderDate: order.createdAt,
    deliveryDate: null,
    createdAt: order.createdAt,
    userId: '',
    vendorId: null,
    projectId: null,
    vendorName: order.vendorName || null,
    projectName: null,
    userName: null,
    emailStatus: null,
    totalEmailsSent: 0,
  }));

  return (
    <UnifiedOrdersList
      mode="detailed"
      maxItems={maxItems}
      orders={unifiedOrders}
      onOrderClick={onOrderClick}
      showActions={false}
    />
  );
}