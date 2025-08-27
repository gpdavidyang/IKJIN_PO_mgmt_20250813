import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Edit3, 
  AlertCircle, 
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderItem {
  itemName?: string;
  specification?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  remarks?: string;
}

interface OrderData {
  rowIndex: number;
  projectName?: string;
  vendorName?: string;
  vendorEmail?: string;
  deliveryDate?: string;
  items: OrderItem[];
  notes?: string;
  isValid?: boolean;
  errors?: string[];
}

interface BulkOrderEditorCompactProps {
  orders: OrderData[];
  onOrderUpdate: (index: number, order: OrderData) => void;
  onOrderRemove: (index: number) => void;
}

export function BulkOrderEditorCompact({ orders, onOrderUpdate, onOrderRemove }: BulkOrderEditorCompactProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>('');

  const handleCellClick = (cellId: string, value: any) => {
    setEditingCell(cellId);
    setTempValue(value || '');
  };

  const handleCellSave = (orderIndex: number, field: string, value: any) => {
    const order = orders[orderIndex];
    const updatedOrder = { ...order };
    
    // Handle nested path for items
    if (field.startsWith('item.')) {
      const [, itemField] = field.split('.');
      const item = updatedOrder.items[0] || {};
      
      if (['quantity', 'unitPrice'].includes(itemField)) {
        item[itemField as keyof OrderItem] = parseFloat(value) || 0;
        // Auto-calculate total
        if (item.quantity && item.unitPrice) {
          item.totalAmount = item.quantity * item.unitPrice;
        }
      } else {
        item[itemField as keyof OrderItem] = value as any;
      }
      
      updatedOrder.items = [item];
    } else {
      // Handle top-level fields
      (updatedOrder as any)[field] = value;
    }
    
    // Validate order
    updatedOrder.errors = [];
    if (!updatedOrder.projectName) updatedOrder.errors.push('프로젝트명 필수');
    if (!updatedOrder.vendorName) updatedOrder.errors.push('거래처명 필수');
    if (!updatedOrder.vendorEmail) updatedOrder.errors.push('이메일 필수');
    
    updatedOrder.isValid = updatedOrder.errors.length === 0;
    
    onOrderUpdate(orderIndex, updatedOrder);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, orderIndex: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave(orderIndex, field, tempValue);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const EditableCell = ({ 
    cellId, 
    value, 
    orderIndex, 
    field,
    type = 'text',
    className = ''
  }: {
    cellId: string;
    value: any;
    orderIndex: number;
    field: string;
    type?: string;
    className?: string;
  }) => {
    const isEditing = editingCell === cellId;
    
    if (isEditing) {
      return (
        <Input
          type={type}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, orderIndex, field)}
          onBlur={() => handleCellSave(orderIndex, field, tempValue)}
          className={cn("h-7 px-2 py-0 text-xs", className)}
          autoFocus
        />
      );
    }
    
    return (
      <div 
        className={cn(
          "px-2 py-1 text-xs cursor-pointer hover:bg-gray-50 rounded min-h-[28px] flex items-center",
          !value && "text-gray-400 italic"
        )}
        onClick={() => handleCellClick(cellId, value)}
      >
        {value || '-'}
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left p-2 font-medium text-xs w-10">#</th>
            <th className="text-left p-2 font-medium text-xs">상태</th>
            <th className="text-left p-2 font-medium text-xs">프로젝트</th>
            <th className="text-left p-2 font-medium text-xs">거래처명</th>
            <th className="text-left p-2 font-medium text-xs">이메일</th>
            <th className="text-left p-2 font-medium text-xs">납기일</th>
            <th className="text-left p-2 font-medium text-xs">품목명</th>
            <th className="text-left p-2 font-medium text-xs">규격</th>
            <th className="text-left p-2 font-medium text-xs">단위</th>
            <th className="text-right p-2 font-medium text-xs">수량</th>
            <th className="text-right p-2 font-medium text-xs">단가</th>
            <th className="text-right p-2 font-medium text-xs">금액</th>
            <th className="text-left p-2 font-medium text-xs">비고</th>
            <th className="text-center p-2 font-medium text-xs w-10"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, orderIndex) => {
            const item = order.items[0] || {};
            const totalAmount = (item.quantity || 0) * (item.unitPrice || 0);
            
            return (
              <tr key={orderIndex} className={cn(
                "border-b hover:bg-gray-50/50 transition-colors",
                order.isValid === false && "bg-red-50/30"
              )}>
                <td className="p-2 text-xs text-gray-500">
                  {orderIndex + 1}
                </td>
                <td className="p-2">
                  <Badge 
                    variant={order.isValid ? "default" : "destructive"} 
                    className="text-xs h-5"
                  >
                    {order.isValid ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    )}
                    {order.isValid ? '유효' : '검증'}
                  </Badge>
                </td>
                <td className="p-1">
                  <EditableCell
                    cellId={`${orderIndex}-project`}
                    value={order.projectName}
                    orderIndex={orderIndex}
                    field="projectName"
                  />
                </td>
                <td className="p-1">
                  <EditableCell
                    cellId={`${orderIndex}-vendor`}
                    value={order.vendorName}
                    orderIndex={orderIndex}
                    field="vendorName"
                  />
                </td>
                <td className="p-1">
                  <EditableCell
                    cellId={`${orderIndex}-email`}
                    value={order.vendorEmail}
                    orderIndex={orderIndex}
                    field="vendorEmail"
                    type="email"
                  />
                </td>
                <td className="p-1">
                  <EditableCell
                    cellId={`${orderIndex}-delivery`}
                    value={order.deliveryDate}
                    orderIndex={orderIndex}
                    field="deliveryDate"
                  />
                </td>
                <td className="p-1">
                  <EditableCell
                    cellId={`${orderIndex}-itemName`}
                    value={item.itemName}
                    orderIndex={orderIndex}
                    field="item.itemName"
                  />
                </td>
                <td className="p-1">
                  <EditableCell
                    cellId={`${orderIndex}-spec`}
                    value={item.specification}
                    orderIndex={orderIndex}
                    field="item.specification"
                  />
                </td>
                <td className="p-1">
                  <EditableCell
                    cellId={`${orderIndex}-unit`}
                    value={item.unit}
                    orderIndex={orderIndex}
                    field="item.unit"
                  />
                </td>
                <td className="p-1 text-right">
                  <EditableCell
                    cellId={`${orderIndex}-qty`}
                    value={item.quantity}
                    orderIndex={orderIndex}
                    field="item.quantity"
                    type="number"
                  />
                </td>
                <td className="p-1 text-right">
                  <EditableCell
                    cellId={`${orderIndex}-price`}
                    value={item.unitPrice}
                    orderIndex={orderIndex}
                    field="item.unitPrice"
                    type="number"
                  />
                </td>
                <td className="p-2 text-right text-xs font-medium">
                  {totalAmount.toLocaleString()}
                </td>
                <td className="p-1">
                  <EditableCell
                    cellId={`${orderIndex}-remarks`}
                    value={item.remarks}
                    orderIndex={orderIndex}
                    field="item.remarks"
                  />
                </td>
                <td className="p-2 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-red-600"
                    onClick={() => onOrderRemove(orderIndex)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {orders.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          업로드된 발주서가 없습니다.
        </div>
      )}
    </div>
  );
}