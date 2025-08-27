import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Edit3, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Calendar,
  Mail,
  Building,
  Package,
  Hash,
  DollarSign
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

interface BulkOrderEditorProps {
  orders: OrderData[];
  onOrderUpdate: (index: number, order: OrderData) => void;
  onOrderRemove: (index: number) => void;
}

export function BulkOrderEditor({ orders, onOrderUpdate, onOrderRemove }: BulkOrderEditorProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>('');

  const handleFieldClick = (fieldId: string, value: any) => {
    setEditingField(fieldId);
    setTempValue(value || '');
  };

  const handleFieldSave = (orderIndex: number, fieldPath: string, value: any) => {
    const order = orders[orderIndex];
    const updatedOrder = { ...order };
    
    // Handle nested path (e.g., "items.0.itemName")
    const pathParts = fieldPath.split('.');
    let target: any = updatedOrder;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (part === 'items') {
        const itemIndex = parseInt(pathParts[i + 1]);
        target = updatedOrder.items[itemIndex];
        i++; // Skip the index part
      } else {
        target = target[part];
      }
    }
    
    const lastKey = pathParts[pathParts.length - 1];
    
    // Convert to appropriate type
    if (['quantity', 'unitPrice', 'totalAmount'].includes(lastKey)) {
      target[lastKey] = parseFloat(value) || 0;
    } else {
      target[lastKey] = value;
    }
    
    // Auto-calculate total amount if quantity or unit price changed
    if (lastKey === 'quantity' || lastKey === 'unitPrice') {
      const item = target as OrderItem;
      if (item.quantity && item.unitPrice) {
        item.totalAmount = item.quantity * item.unitPrice;
      }
    }
    
    // Validate order
    updatedOrder.errors = [];
    if (!updatedOrder.projectName) updatedOrder.errors.push('프로젝트명 필수');
    if (!updatedOrder.vendorName) updatedOrder.errors.push('거래처명 필수');
    if (!updatedOrder.vendorEmail) updatedOrder.errors.push('거래처 이메일 필수');
    if (updatedOrder.items.length === 0) updatedOrder.errors.push('품목 필수');
    
    updatedOrder.isValid = updatedOrder.errors.length === 0;
    
    onOrderUpdate(orderIndex, updatedOrder);
    setEditingField(null);
  };

  const handleFieldCancel = () => {
    setEditingField(null);
    setTempValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, orderIndex: number, fieldPath: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFieldSave(orderIndex, fieldPath, tempValue);
    } else if (e.key === 'Escape') {
      handleFieldCancel();
    }
  };

  const EditableField = ({ 
    fieldId, 
    value, 
    orderIndex, 
    fieldPath, 
    placeholder, 
    type = 'text',
    multiline = false,
    icon,
    className = ''
  }: {
    fieldId: string;
    value: any;
    orderIndex: number;
    fieldPath: string;
    placeholder: string;
    type?: string;
    multiline?: boolean;
    icon?: React.ReactNode;
    className?: string;
  }) => {
    const isEditing = editingField === fieldId;
    
    if (isEditing) {
      const InputComponent = multiline ? Textarea : Input;
      return (
        <div className="flex items-start gap-2">
          {icon && <div className="mt-2 text-gray-400">{icon}</div>}
          <InputComponent
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, orderIndex, fieldPath)}
            onBlur={() => handleFieldSave(orderIndex, fieldPath, tempValue)}
            placeholder={placeholder}
            className={cn("flex-1", className)}
            autoFocus
          />
        </div>
      );
    }
    
    return (
      <div 
        className={cn(
          "flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors group",
          !value && "text-gray-400"
        )}
        onClick={() => handleFieldClick(fieldId, value)}
      >
        {icon && <div className="text-gray-400 group-hover:text-gray-600">{icon}</div>}
        <div className="flex-1">
          <span className={cn(!value && "italic")}>
            {value || placeholder}
          </span>
        </div>
        <Edit3 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {orders.map((order, orderIndex) => (
        <Card key={orderIndex} className={cn(
          "relative transition-all",
          order.isValid === false && "border-red-300 bg-red-50"
        )}>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    #{orderIndex + 1}
                  </Badge>
                  <Badge variant={order.isValid ? "default" : "destructive"}>
                    {order.isValid ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        유효
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        검증 필요
                      </>
                    )}
                  </Badge>
                  {order.items.length > 0 && (
                    <Badge variant="secondary">
                      <Package className="h-3 w-3 mr-1" />
                      {order.items.length}개 품목
                    </Badge>
                  )}
                </div>
                {order.errors && order.errors.length > 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    {order.errors.join(', ')}
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOrderRemove(orderIndex)}
                className="text-gray-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField
                fieldId={`order-${orderIndex}-project`}
                value={order.projectName}
                orderIndex={orderIndex}
                fieldPath="projectName"
                placeholder="프로젝트명 입력"
                icon={<Building className="h-4 w-4" />}
              />
              
              <EditableField
                fieldId={`order-${orderIndex}-vendor`}
                value={order.vendorName}
                orderIndex={orderIndex}
                fieldPath="vendorName"
                placeholder="거래처명 입력"
                icon={<Building className="h-4 w-4" />}
              />
              
              <EditableField
                fieldId={`order-${orderIndex}-email`}
                value={order.vendorEmail}
                orderIndex={orderIndex}
                fieldPath="vendorEmail"
                placeholder="거래처 이메일 입력"
                type="email"
                icon={<Mail className="h-4 w-4" />}
              />
              
              <EditableField
                fieldId={`order-${orderIndex}-delivery`}
                value={order.deliveryDate}
                orderIndex={orderIndex}
                fieldPath="deliveryDate"
                placeholder="납기일 입력"
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>
            
            {/* 품목 정보 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Package className="h-4 w-4" />
                품목 정보
              </h4>
              
              {order.items.map((item, itemIndex) => (
                <div key={itemIndex} className="border rounded-lg p-3 space-y-3 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <EditableField
                      fieldId={`order-${orderIndex}-item-${itemIndex}-name`}
                      value={item.itemName}
                      orderIndex={orderIndex}
                      fieldPath={`items.${itemIndex}.itemName`}
                      placeholder="품목명"
                    />
                    
                    <EditableField
                      fieldId={`order-${orderIndex}-item-${itemIndex}-spec`}
                      value={item.specification}
                      orderIndex={orderIndex}
                      fieldPath={`items.${itemIndex}.specification`}
                      placeholder="규격"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <EditableField
                      fieldId={`order-${orderIndex}-item-${itemIndex}-unit`}
                      value={item.unit}
                      orderIndex={orderIndex}
                      fieldPath={`items.${itemIndex}.unit`}
                      placeholder="단위"
                    />
                    
                    <EditableField
                      fieldId={`order-${orderIndex}-item-${itemIndex}-qty`}
                      value={item.quantity}
                      orderIndex={orderIndex}
                      fieldPath={`items.${itemIndex}.quantity`}
                      placeholder="수량"
                      type="number"
                      icon={<Hash className="h-4 w-4" />}
                    />
                    
                    <EditableField
                      fieldId={`order-${orderIndex}-item-${itemIndex}-price`}
                      value={item.unitPrice}
                      orderIndex={orderIndex}
                      fieldPath={`items.${itemIndex}.unitPrice`}
                      placeholder="단가"
                      type="number"
                      icon={<DollarSign className="h-4 w-4" />}
                    />
                    
                    <div className="p-2 bg-white rounded border">
                      <div className="flex items-center gap-1 text-sm">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {item.remarks && (
                    <EditableField
                      fieldId={`order-${orderIndex}-item-${itemIndex}-remarks`}
                      value={item.remarks}
                      orderIndex={orderIndex}
                      fieldPath={`items.${itemIndex}.remarks`}
                      placeholder="비고"
                      multiline
                    />
                  )}
                </div>
              ))}
            </div>
            
            {/* 비고 */}
            {order.notes && (
              <EditableField
                fieldId={`order-${orderIndex}-notes`}
                value={order.notes}
                orderIndex={orderIndex}
                fieldPath="notes"
                placeholder="전체 비고"
                multiline
                className="min-h-[60px]"
              />
            )}
          </CardContent>
        </Card>
      ))}
      
      {orders.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          업로드된 발주서가 없습니다.
        </div>
      )}
    </div>
  );
}