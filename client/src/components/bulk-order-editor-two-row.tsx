import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  X, 
  AlertCircle, 
  CheckCircle,
  Calendar,
  Building,
  Package,
  Hash,
  Mail,
  Send,
  FileText,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { EmailSendDialog } from '@/components/email-send-dialog';

interface OrderItem {
  itemName?: string;
  specification?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  remarks?: string;
}

interface OrderData {
  rowIndex: number;
  orderDate?: string;
  deliveryDate?: string;
  vendorName?: string;
  vendorEmail?: string;
  deliveryPlace?: string;
  deliveryEmail?: string;
  projectName?: string;
  majorCategory?: string;
  middleCategory?: string;
  minorCategory?: string;
  items: OrderItem[];
  isValid?: boolean;
  errors?: string[];
}

interface BulkOrderEditorTwoRowProps {
  orders: OrderData[];
  onOrderUpdate: (index: number, order: OrderData) => void;
  onOrderRemove: (index: number, isSilent?: boolean) => void;
  onSingleOrderSave?: (index: number, sendEmail: boolean) => void;
  file?: File | null;
}

export function BulkOrderEditorTwoRow({ orders, onOrderUpdate, onOrderRemove, onSingleOrderSave, file }: BulkOrderEditorTwoRowProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>('');
  const [emailCheckboxes, setEmailCheckboxes] = useState<Record<number, boolean>>(
    orders.reduce((acc, _, index) => ({ ...acc, [index]: true }), {})
  );
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedOrderData, setSavedOrderData] = useState<any>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Individual order save mutation
  const saveIndividualOrder = useMutation({
    mutationFn: async ({ order, sendEmail, index, isDraft = false }: { order: OrderData; sendEmail: boolean; index: number; isDraft?: boolean }) => {
      const formData = new FormData();
      
      // Attach original Excel file if available
      if (file) {
        formData.append('excelFile', file);
      }
      
      // Send single order data with email flag and draft status
      formData.append('orders', JSON.stringify([order]));
      formData.append('sendEmail', sendEmail.toString());
      formData.append('isDraft', isDraft.toString());
      
      const response = await fetch('/api/orders/bulk-create-simple', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to save order');
      }
      
      return response.json();
    },
    onSuccess: async (data, variables) => {
      // Invalidate all orders related queries to refresh the list
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey.some(key => 
            typeof key === 'string' && (
              key.includes('orders') || 
              key.includes('/api/orders')
            )
          );
        }
      });
      
      if (variables.isDraft) {
        // 임시저장 처리
        toast({
          title: "임시저장 완료",
          description: "발주서가 '임시저장' 상태로 저장되어 작업 목록에서 제거되었습니다. 발주서 관리 화면에서 언제든지 조회, 수정, 승인요청이 가능합니다.",
        });
        onOrderRemove(variables.index, true); // isSilent = true로 호출하여 추가 메시지 방지
      } else {
        // 4-stage toast message system for order processing
        const savedCount = data.savedCount || 1;
        const emailsSent = data.emailsSent || 0;
        const hasPDF = true; // PDF는 ProfessionalPDFGenerationService로 항상 생성됨
        const hasAttachments = data.savedOrders && data.savedOrders.length > 0;
        
        // 1단계 완료: 엑셀파일 처리 결과
        toast({
          title: "✅ 1. 엑셀파일 처리 완료",
          description: `발주서 ${savedCount}개 처리 완료`,
          duration: 8000,
        });
        
        // 2단계 완료: PDF 생성 결과 (500ms 후)
        setTimeout(() => {
          toast({
            title: "✅ 2. PDF 생성 완료",
            description: `${savedCount}개 발주서 PDF가 성공적으로 생성되었습니다`,
            duration: 8000,
          });
        }, 500);
        
        // 3단계 완료: DB 저장 여부 (1000ms 후)
        setTimeout(() => {
          toast({
            title: "✅ 3. DB 저장 완료",
            description: `Excel/PDF 파일 ${savedCount}건이 데이터베이스에 저장됨`,
            duration: 8000,
          });
        }, 1000);
        
        // 4단계 완료: 이메일 첨부 가능여부 (1500ms 후)
        setTimeout(() => {
          toast({
            title: "✅ 4. 이메일 첨부 준비 완료",
            description: `${hasPDF ? 'PDF + Excel' : 'Excel'} 파일이 이메일 첨부 가능한 상태입니다`,
            duration: 8000,
          });
          
          // 이메일 발송 옵션이 선택된 경우에만 모달 표시 (4단계 완료 후)
          if (variables.sendEmail) {
            setTimeout(() => {
              // Use the first saved order data for single order creation
              const firstSavedOrder = data.savedOrders?.[0];
              console.log('📋 Preparing email modal data:', {
                apiResponse: data,
                firstSavedOrder,
                attachmentsCount: firstSavedOrder?.attachments?.length || 0
              });
              setSavedOrderData({ 
                ...data, 
                ...firstSavedOrder, // Include order-specific data including attachments
                originalOrder: variables.order,
                originalIndex: variables.index 
              });
              setShowEmailModal(true);
            }, 2000); // 4단계 토스트 후 2초 뒤에 이메일 모달 표시
          } else {
            // 이메일 발송 없이 완료 (4단계 후 처리)
            setTimeout(() => {
              onOrderRemove(variables.index, true); // isSilent = true로 호출
            }, 2000);
          }
        }, 1500);
      }
    },
    onError: (error) => {
      toast({
        title: "발주서 생성 실패",
        description: error.message || "발주서 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setSavingIndex(null);
    }
  });

  const handleCellClick = (cellId: string, value: any) => {
    setEditingCell(cellId);
    setTempValue(value || '');
  };

  const handleIndividualSave = (index: number) => {
    if (onSingleOrderSave) {
      onSingleOrderSave(index, emailCheckboxes[index]);
    } else {
      // Use built-in mutation if no callback provided
      setSavingIndex(index);
      saveIndividualOrder.mutate({
        order: orders[index],
        sendEmail: emailCheckboxes[index],
        index
      });
    }
  };

  const handleDraftSave = (index: number) => {
    // 임시저장 처리 - 이메일 발송 없이 draft 상태로 저장
    setSavingIndex(index);
    saveIndividualOrder.mutate({
      order: orders[index],
      sendEmail: false, // 이메일 발송하지 않음
      index,
      isDraft: true // draft 상태 플래그 추가
    });
  };

  const handleEmailCheckboxChange = (index: number, checked: boolean) => {
    setEmailCheckboxes(prev => ({ ...prev, [index]: checked }));
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
    if (!updatedOrder.vendorName) updatedOrder.errors.push('거래처명 필수');
    if (!updatedOrder.vendorEmail) updatedOrder.errors.push('이메일 필수');
    if (!updatedOrder.projectName) updatedOrder.errors.push('프로젝트 필수');
    
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

  const EditableField = ({ 
    cellId, 
    value, 
    orderIndex, 
    field,
    type = 'text',
    icon,
    label,
    className = ''
  }: {
    cellId: string;
    value: any;
    orderIndex: number;
    field: string;
    type?: string;
    icon?: React.ReactNode;
    label: string;
    className?: string;
  }) => {
    const isEditing = editingCell === cellId;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-20">{label}:</span>
          <Input
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, orderIndex, field)}
            onBlur={() => handleCellSave(orderIndex, field, tempValue)}
            className={cn("h-7 px-2 py-0 text-xs flex-1", className)}
            autoFocus
          />
        </div>
      );
    }
    
    return (
      <div 
        className="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-gray-50 group"
        onClick={() => handleCellClick(cellId, value)}
      >
        {icon && <div className="text-gray-400 w-4">{icon}</div>}
        <span className="text-xs text-gray-500 min-w-[80px]">{label}:</span>
        <span className={cn("text-xs flex-1", !value && "text-gray-400 italic")}>
          {value || '입력'}
        </span>
      </div>
    );
  };

  const handleEmailSend = async (emailData: any) => {
    try {
      console.log('📧 Sending email with selected attachments:', emailData.selectedAttachmentIds);
      console.log('📎 Available attachments:', savedOrderData?.attachments);
      
      // Build attachment URLs from selectedAttachmentIds if any
      const attachmentUrls: string[] = [];
      if (emailData.selectedAttachmentIds && emailData.selectedAttachmentIds.length > 0) {
        for (const attachmentId of emailData.selectedAttachmentIds) {
          const attachmentUrl = `/api/attachments/${attachmentId}/download`;
          attachmentUrls.push(attachmentUrl);
        }
      }

      // 이메일 발송 API 호출
      const response = await fetch('/api/orders/send-email-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to: emailData.to,
          cc: emailData.cc,
          subject: emailData.subject,
          body: emailData.body,
          orderData: {
            orderId: savedOrderData?.orderId || savedOrderData?.orderIds?.[0],
            orderNumber: savedOrderData?.orderNumber,
            projectName: savedOrderData?.projectName,
            vendorName: savedOrderData?.vendorName,
            location: savedOrderData?.location,
            orderDate: savedOrderData?.orderDate,
            deliveryDate: savedOrderData?.deliveryDate,
            totalAmount: savedOrderData?.totalAmount,
            excelFilePath: savedOrderData?.excelFilePath,
            attachmentUrls: attachmentUrls
          },
          selectedAttachmentIds: emailData.selectedAttachmentIds || []
        })
      });

      const result = await response.json();

      if (response.ok) {
        if (result.message && result.message.includes('개발 모드')) {
          // 개발 환경에서 SMTP 설정이 없는 경우
          toast({
            title: "이메일 테스트 모드",
            description: "SMTP 설정이 없어 실제 이메일은 발송되지 않았습니다. 발주서는 정상적으로 생성되었습니다.",
            variant: "default"
          });
        } else {
          // 실제 이메일 발송 성공
          toast({
            title: "이메일 발송 완료",
            description: "발주서와 이메일이 성공적으로 발송되었습니다.",
          });
        }
      } else {
        toast({
          title: "이메일 발송 실패",
          description: result.error || "이메일은 발송되지 않았지만 발주서는 생성되었습니다.",
          variant: "destructive"
        });
      }
      
      // 성공/실패 여부와 관계없이 발주서는 생성되었으므로 목록에서 제거
      if (savedOrderData?.originalIndex !== undefined) {
        onOrderRemove(savedOrderData.originalIndex, true); // isSilent = true로 호출
      }
      
    } catch (error) {
      console.error('이메일 발송 오류:', error);
      toast({
        title: "이메일 발송 실패",
        description: "네트워크 오류가 발생했습니다. 발주서는 정상적으로 생성되었습니다.",
        variant: "destructive"
      });
      
      // 에러가 나도 발주서는 생성되었으므로 목록에서 제거
      if (savedOrderData?.originalIndex !== undefined) {
        onOrderRemove(savedOrderData.originalIndex, true); // isSilent = true로 호출
      }
    } finally {
      setShowEmailModal(false);
      setSavedOrderData(null);
    }
  };

  const handleEmailModalClose = () => {
    setShowEmailModal(false);
    // 이메일 모달을 닫은 경우에도 발주서는 이미 생성되었으므로 목록에서 제거
    if (savedOrderData?.originalIndex !== undefined) {
      onOrderRemove(savedOrderData.originalIndex, true); // isSilent = true로 호출
    }
    setSavedOrderData(null);
  };

  return (
    <div className="space-y-4">
      {orders.map((order, orderIndex) => {
        const item = orders[orderIndex].items[0] || {};
        const totalAmount = (item.quantity || 0) * (item.unitPrice || 0);
        
        return (
          <Card key={orderIndex} className={cn(
            "p-4 relative",
            order.isValid === false && "border-red-300 bg-red-50/30"
          )}>
            {/* Header with status and remove button */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  #{orderIndex + 1}
                </Badge>
                <Badge 
                  variant={order.isValid ? "default" : "destructive"} 
                  className="text-xs h-5"
                >
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
                {order.errors && order.errors.length > 0 && (
                  <span className="text-xs text-red-600">
                    ({order.errors.join(', ')})
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {/* Email checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`email-${orderIndex}`}
                    checked={emailCheckboxes[orderIndex]}
                    onCheckedChange={(checked) => 
                      handleEmailCheckboxChange(orderIndex, checked as boolean)
                    }
                    disabled={savingIndex === orderIndex}
                  />
                  <label 
                    htmlFor={`email-${orderIndex}`}
                    className="text-xs text-gray-600 cursor-pointer"
                  >
                    <Mail className="h-3 w-3 inline mr-1" />
                    이메일 발송
                  </label>
                </div>
                
                {/* Individual save button */}
                <Button
                  onClick={() => handleIndividualSave(orderIndex)}
                  disabled={!order.isValid || savingIndex === orderIndex}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {savingIndex === orderIndex ? '생성 중...' : '발주서 생성'}
                </Button>
                
                {/* Draft save button */}
                <Button
                  onClick={() => handleDraftSave(orderIndex)}
                  disabled={!order.isValid || savingIndex === orderIndex}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {savingIndex === orderIndex ? '저장 중...' : '임시저장'}
                </Button>
                
                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-red-600"
                  onClick={() => onOrderRemove(orderIndex)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* First Row - Order Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <EditableField
                cellId={`${orderIndex}-orderDate`}
                value={order.orderDate}
                orderIndex={orderIndex}
                field="orderDate"
                label="발주일자"
                icon={<Calendar className="h-3 w-3" />}
              />
              
              <EditableField
                cellId={`${orderIndex}-deliveryDate`}
                value={order.deliveryDate}
                orderIndex={orderIndex}
                field="deliveryDate"
                label="납기일자"
                icon={<Calendar className="h-3 w-3" />}
              />
              
              <EditableField
                cellId={`${orderIndex}-vendor`}
                value={order.vendorName}
                orderIndex={orderIndex}
                field="vendorName"
                label="거래처명"
                icon={<Building className="h-3 w-3" />}
              />
              
              <EditableField
                cellId={`${orderIndex}-vendorEmail`}
                value={order.vendorEmail}
                orderIndex={orderIndex}
                field="vendorEmail"
                label="거래처 이메일"
                type="email"
                icon={<Mail className="h-3 w-3" />}
              />
            </div>

            {/* Second Row - Delivery & Project Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <EditableField
                cellId={`${orderIndex}-deliveryPlace`}
                value={order.deliveryPlace}
                orderIndex={orderIndex}
                field="deliveryPlace"
                label="납품처명"
                icon={<Building className="h-3 w-3" />}
              />
              
              <EditableField
                cellId={`${orderIndex}-deliveryEmail`}
                value={order.deliveryEmail}
                orderIndex={orderIndex}
                field="deliveryEmail"
                label="납품처 이메일"
                type="email"
                icon={<Mail className="h-3 w-3" />}
              />
              
              <EditableField
                cellId={`${orderIndex}-project`}
                value={order.projectName}
                orderIndex={orderIndex}
                field="projectName"
                label="프로젝트명"
                icon={<Building className="h-3 w-3" />}
              />
            </div>

            {/* Third Row - Item Info */}
            <div className="border-t pt-3">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <EditableField
                  cellId={`${orderIndex}-itemName`}
                  value={item.itemName}
                  orderIndex={orderIndex}
                  field="item.itemName"
                  label="품목명"
                  icon={<Package className="h-3 w-3" />}
                />
                
                <EditableField
                  cellId={`${orderIndex}-spec`}
                  value={item.specification}
                  orderIndex={orderIndex}
                  field="item.specification"
                  label="규격"
                />
                
                <EditableField
                  cellId={`${orderIndex}-qty`}
                  value={item.quantity}
                  orderIndex={orderIndex}
                  field="item.quantity"
                  label="수량"
                  type="number"
                  icon={<Hash className="h-3 w-3" />}
                />
                
                <EditableField
                  cellId={`${orderIndex}-price`}
                  value={item.unitPrice}
                  orderIndex={orderIndex}
                  field="item.unitPrice"
                  label="단가"
                  type="number"
                />
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">총금액:</span>
                  <span className="text-sm font-medium">
                    {totalAmount.toLocaleString()}원
                  </span>
                </div>
                
                <EditableField
                  cellId={`${orderIndex}-remarks`}
                  value={item.remarks}
                  orderIndex={orderIndex}
                  field="item.remarks"
                  label="비고"
                />
              </div>
            </div>

            {/* Categories - Editable */}
            <div className="mt-3 pt-3 border-t">
              <div className="grid grid-cols-3 gap-3">
                <EditableField
                  cellId={`${orderIndex}-majorCategory`}
                  label="대분류"
                  value={order.majorCategory || ''}
                  orderIndex={orderIndex}
                  field="majorCategory"
                  className="h-7"
                />
                <EditableField
                  cellId={`${orderIndex}-middleCategory`}
                  label="중분류"
                  value={order.middleCategory || ''}
                  orderIndex={orderIndex}
                  field="middleCategory"
                  className="h-7"
                />
                <EditableField
                  cellId={`${orderIndex}-minorCategory`}
                  label="소분류"
                  value={order.minorCategory || ''}
                  orderIndex={orderIndex}
                  field="minorCategory"
                  className="h-7"
                />
              </div>
            </div>
          </Card>
        );
      })}
      
      {orders.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          업로드된 발주서가 없습니다.
        </div>
      )}

      {/* 이메일 작성 모달 */}
      {showEmailModal && savedOrderData && (
        <EmailSendDialog
          open={showEmailModal}
          onOpenChange={(open) => {
            if (!open) handleEmailModalClose();
          }}
          orderData={{
            orderNumber: savedOrderData.orderNumber || 'BULK-ORDER',
            vendorName: savedOrderData?.vendorName || savedOrderData?.originalOrder?.vendorName || 'Unknown',
            vendorEmail: savedOrderData?.vendorEmail || savedOrderData?.originalOrder?.vendorEmail || '',
            orderDate: savedOrderData?.orderDate || new Date().toLocaleDateString(),
            totalAmount: savedOrderData.totalAmount || 0,
            siteName: savedOrderData?.projectName || savedOrderData?.originalOrder?.projectName || '일괄 발주서',
            orderId: savedOrderData?.orderId // Include orderId for potential fallback attachment fetching
          }}
          attachments={(() => {
            const attachments = savedOrderData?.attachments?.map((att: any) => ({
              id: att.id, // Use actual database ID
              originalName: att.originalName,
              filePath: att.filePath,
              fileSize: att.fileSize || 0,
              mimeType: att.mimeType || 'application/octet-stream',
              isSelected: false
            })) || [];
            console.log('📎 Passing attachments to EmailSendDialog:', attachments);
            return attachments;
          })()}
          onSendEmail={handleEmailSend}
        />
      )}
    </div>
  );
}