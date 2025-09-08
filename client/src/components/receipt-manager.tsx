import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSmartQuery } from "@/hooks/use-enhanced-queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Package, Plus, Check, Clock, AlertTriangle, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface ReceiptManagerProps {
  orderItems: any[];
  orderId: number;
}

export function ReceiptManager({ orderItems, orderId }: ReceiptManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [, forceUpdate] = useState(0);

  // Fetch item receipts for this order using optimized query
  const receiptQuery = useSmartQuery(
    ["/api/item-receipts", orderId],
    {
      queryFn: async () => {
        const allReceipts = await apiRequest("GET", "/api/item-receipts");
        
        // Filter receipts to only include those for items in this order
        const orderItemIds = orderItems.map((item: any) => item.id);
        const filteredReceipts = allReceipts.filter((receipt: any) => 
          orderItemIds.includes(receipt.orderItemId)
        );
        
        return filteredReceipts;
      },
      cacheType: "DYNAMIC",
      enabled: orderItems.length > 0,
    }
  );


  // Create item receipt mutation
  const createReceiptMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Sending receipt data to API:", data);
      try {
        const response = await apiRequest("POST", "/api/item-receipts", data);
        console.log("API response:", response);
        return response;
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log("💥 Receipt creation successful, forcing refetch:", data);
      
      // Reset query error state and force fresh data fetch
      queryClient.resetQueries({ queryKey: ["/api/item-receipts", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/item-receipts"] });
      
      // Force immediate refetch with fresh state
      await receiptQuery.refetch();
      
      // Force component refresh
      forceUpdate(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["/api/verification-logs", orderId] });
      
      setIsReceiptDialogOpen(false);
      setSelectedOrderItem(null);
      toast({
        title: "성공",
        description: "수령 확인이 등록되었습니다.",
      });
    },
    onError: (error: any) => {
      console.error("Receipt creation mutation error:", error);
      const message = error?.message || "수령 확인 등록에 실패했습니다.";
      toast({
        title: "오류",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Update receipt mutation
  const updateReceiptMutation = useMutation({
    mutationFn: async (receiptData: any) => {
      const { id, ...updateData } = receiptData;
      const res = await apiRequest("PATCH", `/api/item-receipts/${id}`, updateData);
      return await res.json();
    },
    onSuccess: async (data) => {
      console.log("💥 Receipt update successful:", data);
      
      // Reset query error state and force fresh data fetch
      queryClient.resetQueries({ queryKey: ["/api/item-receipts", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/item-receipts"] });
      
      // Force immediate refetch with fresh state
      await receiptQuery.refetch();
      
      // Force component refresh
      forceUpdate(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["/api/verification-logs", orderId] });
      
      setIsEditDialogOpen(false);
      setSelectedReceipt(null);
      
      toast({
        title: "수령 정보 수정 완료",
        description: "수령 정보가 성공적으로 수정되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "수정 실패",
        description: error.message || "수령 정보 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete receipt mutation
  const deleteReceiptMutation = useMutation({
    mutationFn: async (receiptId: number) => {
      const res = await apiRequest("DELETE", `/api/item-receipts/${receiptId}`);
      return res;
    },
    onSuccess: async () => {
      console.log("💥 Receipt deletion successful");
      
      // Reset query error state and force fresh data fetch
      queryClient.resetQueries({ queryKey: ["/api/item-receipts", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/item-receipts"] });
      
      // Force immediate refetch with fresh state
      await receiptQuery.refetch();
      
      // Force component refresh
      forceUpdate(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["/api/verification-logs", orderId] });
      
      toast({
        title: "수령 정보 삭제 완료",
        description: "수령 정보가 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "수령 정보 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Bulk receipt registration mutation
  const bulkReceiptMutation = useMutation({
    mutationFn: async (receipts: any[]) => {
      const promises = receipts.map(receipt => 
        apiRequest("POST", "/api/item-receipts", receipt)
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/item-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-logs", orderId] });
      toast({
        title: "성공",
        description: "일괄 수령 등록이 완료되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "일괄 수령 등록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleReceiptSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      orderItemId: selectedOrderItem.id,
      receivedQuantity: parseFloat(formData.get("receivedQuantity") as string),
      receivedDate: formData.get("receivedDate"),
      qualityCheck: formData.get("qualityCheck") === "on",
      qualityNotes: formData.get("qualityNotes") || "",
      status: "approved",
      notes: formData.get("notes") || "",
    };

    console.log("Submitting receipt data:", data);
    createReceiptMutation.mutate(data);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedReceipt) {
      toast({
        title: "오류",
        description: "선택된 수령 정보가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData(e.currentTarget);
    
    const data = {
      id: selectedReceipt.id,
      receivedQuantity: parseFloat(formData.get("receivedQuantity") as string),
      receivedDate: formData.get("receivedDate"),
      qualityCheck: formData.get("qualityCheck") === "on",
      qualityNotes: formData.get("qualityNotes") || "",
      status: selectedReceipt.status || "approved",
      notes: formData.get("notes") || "",
    };

    console.log("Submitting updated receipt data:", data);
    updateReceiptMutation.mutate(data);
  };

  const handleBulkReceipt = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // 아직 수령되지 않은 항목들만 필터링
    const pendingItems = orderItems.filter(item => {
      const totalReceived = getTotalReceived(item.id);
      return totalReceived < item.quantity;
    });

    if (pendingItems.length === 0) {
      toast({
        title: "알림",
        description: "모든 항목이 이미 수령 완료되었습니다.",
      });
      return;
    }

    // 각 항목에 대해 남은 수량만큼 수령 등록
    const receipts = pendingItems.map(item => ({
      orderItemId: item.id,
      receivedQuantity: item.quantity - getTotalReceived(item.id),
      receivedDate: today,
      qualityCheck: true,
      status: "approved",
      notes: "일괄 수령 등록"
    }));

    bulkReceiptMutation.mutate(receipts);
  };

  const getItemReceipts = (orderItemId: number) => {
    // If query is in error state, return empty array and trigger refresh
    if (receiptQuery.status === 'error') {
      console.log(`❌ Query in error state for item ${orderItemId}, triggering fresh fetch`);
      receiptQuery.refetch();
      return [];
    }
    
    // Use current query data
    const currentData = receiptQuery.data || [];
    console.log(`🔍 Looking for receipts for item ${orderItemId}`);
    console.log(`🔍 Current query data length: ${currentData.length}`);
    console.log(`🔍 Query status: ${receiptQuery.status}, isFetching: ${receiptQuery.isFetching}`);
    
    // Filter for specific order item
    const filtered = currentData.filter((receipt: any) => receipt.orderItemId === orderItemId);
    console.log(`📋 Found ${filtered.length} receipts for item ${orderItemId}:`, filtered);
    return filtered;
  };

  const getTotalReceived = (orderItemId: number) => {
    const receipts = getItemReceipts(orderItemId);
    const total = receipts.reduce((total: number, receipt: any) => {
      const quantity = typeof receipt.receivedQuantity === 'string' 
        ? parseFloat(receipt.receivedQuantity) 
        : receipt.receivedQuantity;
      return total + (quantity || 0);
    }, 0);
    console.log(`💯 Total received for item ${orderItemId}: ${total}`);
    return total;
  };

  const getReceiptStatus = (orderItem: any) => {
    // Direct access to avoid stale closure issues
    const currentData = receiptQuery.data || [];
    const receipts = currentData.filter((receipt: any) => receipt.orderItemId === orderItem.id);
    const totalReceived = receipts.reduce((total: number, receipt: any) => {
      const quantity = typeof receipt.receivedQuantity === 'string' 
        ? parseFloat(receipt.receivedQuantity) 
        : receipt.receivedQuantity;
      return total + (quantity || 0);
    }, 0);
    const totalOrdered = orderItem.quantity;
    
    if (totalReceived === 0) {
      return { status: "pending", label: "미수령", icon: Clock, color: "secondary" };
    } else if (totalReceived < totalOrdered) {
      return { status: "partial", label: "부분수령", icon: AlertTriangle, color: "warning" };
    } else {
      return { status: "complete", label: "수령완료", icon: Check, color: "default" };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">대기중</Badge>;
      case "approved":
        return <Badge variant="default">승인됨</Badge>;
      case "rejected":
        return <Badge variant="destructive">반려됨</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1 text-sm">
            <Package className="h-4 w-4" />
            자재 수령 확인
          </CardTitle>
          <Button
            onClick={handleBulkReceipt}
            disabled={bulkReceiptMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Package className="h-3 w-3 mr-1" />
            <span className="text-xs">일괄 수령 등록</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="space-y-2">
          {orderItems.map((item: any) => {
            const receipts = getItemReceipts(item.id);
            const totalReceived = getTotalReceived(item.id);
            const receiptStatus = getReceiptStatus(item);
            const StatusIcon = receiptStatus.icon;

            return (
              <div key={item.id} className="border rounded-lg p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      <h4 className="font-medium text-xs">{item.itemName}</h4>
                      <Badge variant={receiptStatus.color as any} className="flex items-center gap-1 text-xs">
                        <StatusIcon className="h-3 w-3" />
                        {receiptStatus.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <div>발주수량: {item.quantity.toLocaleString()}{item.unit}</div>
                      <div>수령수량: {totalReceived.toLocaleString()}{item.unit}</div>
                      <div>미수령: {(item.quantity - totalReceived).toLocaleString()}{item.unit}</div>
                      <div>단가: ₩{Math.round(item.unitPrice || 0).toLocaleString('ko-KR')}</div>
                    </div>
                    {item.notes && (
                      <div className="text-xs text-muted-foreground mt-1">{item.notes}</div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedOrderItem(item);
                      setIsReceiptDialogOpen(true);
                    }}
                    disabled={totalReceived >= item.quantity}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    <span className="text-xs">수령등록</span>
                  </Button>
                </div>

                {receipts.length > 0 && (
                  <div className="mt-2">
                    <h5 className="text-xs font-medium mb-1">수령 이력</h5>
                    <div className="space-y-1">
                      {receipts.map((receipt: any) => (
                        <div key={receipt.id} className="bg-muted p-2 rounded text-xs">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-xs">
                                  {(typeof receipt.receivedQuantity === 'string' 
                                    ? parseFloat(receipt.receivedQuantity) 
                                    : receipt.receivedQuantity).toLocaleString()}{item.unit} 수령
                                </span>
                                {getStatusBadge(receipt.status)}
                                {receipt.qualityCheck && (
                                  <Badge variant="outline" className="text-xs">
                                    <Check className="h-2 w-2 mr-1" />
                                    품질검사
                                  </Badge>
                                )}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                수령일: {format(new Date(receipt.receivedDate), "yyyy-MM-dd", { locale: ko })}
                              </div>
                              {receipt.qualityNotes && (
                                <div className="text-muted-foreground text-xs">
                                  품질메모: {receipt.qualityNotes}
                                </div>
                              )}
                              {receipt.notes && (
                                <div className="text-muted-foreground text-xs">
                                  메모: {receipt.notes}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedReceipt(receipt);
                                    setIsEditDialogOpen(true);
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-blue-50"
                                >
                                  <Edit2 className="h-3 w-3 text-blue-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('이 수령 기록을 삭제하시겠습니까?')) {
                                      deleteReceiptMutation.mutate(receipt.id);
                                    }
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-red-50"
                                  disabled={deleteReceiptMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground text-right">
                                <div>등록자: {receipt.verifiedBy}</div>
                                <div>{format(new Date(receipt.createdAt), "MM-dd HH:mm", { locale: ko })}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>자재 수령 등록</DialogTitle>
            </DialogHeader>
            {selectedOrderItem && (
              <form onSubmit={handleReceiptSubmit} className="space-y-4">
                <div className="bg-muted p-3 rounded">
                  <div className="font-medium">{selectedOrderItem.itemName}</div>
                  <div className="text-sm text-muted-foreground">
                    발주수량: {selectedOrderItem.quantity.toLocaleString()}{selectedOrderItem.unit} |
                    수령가능: {(selectedOrderItem.quantity - getTotalReceived(selectedOrderItem.id)).toLocaleString()}{selectedOrderItem.unit}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receivedQuantity">수령 수량</Label>
                  <Input
                    id="receivedQuantity"
                    name="receivedQuantity"
                    type="number"
                    step="0.01"
                    max={selectedOrderItem.quantity - getTotalReceived(selectedOrderItem.id)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receivedDate">수령 일자</Label>
                  <Input
                    id="receivedDate"
                    name="receivedDate"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>


                <div className="flex items-center space-x-2">
                  <Checkbox id="qualityCheck" name="qualityCheck" />
                  <Label htmlFor="qualityCheck" className="text-sm">
                    품질 검사 완료
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualityNotes">품질 검사 메모</Label>
                  <Textarea
                    id="qualityNotes"
                    name="qualityNotes"
                    rows={2}
                    placeholder="품질 검사 결과나 특이사항을 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">추가 메모</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    placeholder="기타 메모사항을 입력하세요"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsReceiptDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={createReceiptMutation.isPending}>
                    {createReceiptMutation.isPending ? "등록 중..." : "등록"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Receipt Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>수령 정보 수정</DialogTitle>
            </DialogHeader>
            {selectedReceipt && (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="bg-muted p-3 rounded">
                  <div className="text-sm text-muted-foreground">
                    수령 기록 ID: {selectedReceipt.id}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-receivedQuantity">수령 수량</Label>
                  <Input
                    id="edit-receivedQuantity"
                    name="receivedQuantity"
                    type="number"
                    step="0.01"
                    defaultValue={selectedReceipt.receivedQuantity}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-receivedDate">수령 일자</Label>
                  <Input
                    id="edit-receivedDate"
                    name="receivedDate"
                    type="date"
                    defaultValue={new Date(selectedReceipt.receivedDate).toISOString().split('T')[0]}
                    required
                  />
                </div>


                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-qualityCheck" 
                    name="qualityCheck" 
                    defaultChecked={selectedReceipt.qualityCheck}
                  />
                  <Label htmlFor="edit-qualityCheck" className="text-sm">
                    품질 검사 완료
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-qualityNotes">품질 검사 메모</Label>
                  <Textarea
                    id="edit-qualityNotes"
                    name="qualityNotes"
                    rows={2}
                    defaultValue={selectedReceipt.qualityNotes}
                    placeholder="품질 검사 결과나 특이사항을 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-notes">추가 메모</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    rows={2}
                    defaultValue={selectedReceipt.notes}
                    placeholder="기타 메모사항을 입력하세요"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={updateReceiptMutation.isPending}>
                    {updateReceiptMutation.isPending ? "수정 중..." : "수정 완료"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}