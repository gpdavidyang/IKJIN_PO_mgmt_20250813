import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2 } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  vendorName?: string | null;
  totalAmount: number;
}

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: Order[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  selectedOrders,
  onConfirm,
  isLoading = false,
}: BulkDeleteDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const totalAmount = selectedOrders.reduce((sum, order) => {
    const amount = Number(order.totalAmount) || 0;
    console.log('💰 Processing order amount:', { orderId: order.id, orderNumber: order.orderNumber, totalAmount: order.totalAmount, parsed: amount });
    return sum + amount;
  }, 0);
  const formatKoreanWon = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                발주서 일괄 삭제
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                선택된 발주서를 삭제하시겠습니까?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Message */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>주의:</strong> 삭제된 발주서는 복구할 수 없습니다.
            </p>
          </div>

          {/* Selected Orders Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                선택된 발주서
              </span>
              <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {selectedOrders.length}개
              </Badge>
            </div>

            {/* Orders List (max 5 visible) */}
            <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-md p-3">
              {selectedOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {order.orderNumber}
                    </span>
                    {order.vendorName && (
                      <span className="text-gray-500 dark:text-gray-400">
                        ({order.vendorName})
                      </span>
                    )}
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatKoreanWon(order.totalAmount)}
                  </span>
                </div>
              ))}
              {selectedOrders.length > 5 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-600">
                  외 {selectedOrders.length - 5}개 더...
                </div>
              )}
            </div>

            {/* Total Amount */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                총 금액
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatKoreanWon(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="text-gray-600 dark:text-gray-400"
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                삭제 중...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {selectedOrders.length}개 발주서 삭제
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}