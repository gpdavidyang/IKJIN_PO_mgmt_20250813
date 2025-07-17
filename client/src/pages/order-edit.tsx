import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Plus, Save, ArrowLeft, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function OrderEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const params = useParams();
  const orderId = params.id;

  const [formData, setFormData] = useState({
    vendorId: "",
    orderDate: "",
    deliveryDate: "",
    notes: "",
    items: [] as any[],
  });

  // Fetch order data
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId,
  });

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  // Fetch items
  const { data: itemsData } = useQuery({
    queryKey: ["/api/items"],
  });

  const items = itemsData?.items || [];

  useEffect(() => {
    if (order && items.length > 0) {
      // Map existing order items to include proper itemId based on itemName
      const mappedItems = (order.items || []).map((item: any) => {
        // Try multiple matching strategies
        let matchingItem = null;
        
        // 1. Exact name match
        matchingItem = items.find((availableItem: any) => 
          availableItem.name === item.itemName
        );
        
        // 2. If no exact match, try partial name match
        if (!matchingItem) {
          matchingItem = items.find((availableItem: any) => 
            availableItem.name.includes(item.itemName) || item.itemName.includes(availableItem.name)
          );
        }
        
        // 3. If still no match, try by existing itemId
        if (!matchingItem && item.itemId) {
          matchingItem = items.find((availableItem: any) => 
            availableItem.id === item.itemId
          );
        }
        
        return {
          itemId: matchingItem?.id || null,
          itemName: item.itemName || "",
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          specification: item.specification || "",
          notes: item.notes || "",
        };
      });

      setFormData({
        vendorId: order.vendorId?.toString() || "",
        orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : "",
        deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : "",
        notes: order.notes || "",
        items: mappedItems,
      });
    } else if (order && items.length === 0) {
      // If items haven't loaded yet, set basic form data without items
      setFormData({
        vendorId: order.vendorId?.toString() || "",
        orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : "",
        deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : "",
        notes: order.notes || "",
        items: order.items || [],
      });
    }
  }, [order, items]);

  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "발주서가 수정되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      navigate(`/orders/${orderId}`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "발주서 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vendorId || !formData.orderDate || formData.items.length === 0) {
      toast({
        title: "오류",
        description: "모든 필수 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      vendorId: parseInt(formData.vendorId),
      orderDate: new Date(formData.orderDate),
      deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : null,
      notes: formData.notes,
      items: formData.items.map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        specification: item.specification || "",
        notes: item.notes || "",
      })),
    };

    updateOrderMutation.mutate(submitData);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        itemId: null,
        itemName: "",
        quantity: 1,
        unitPrice: 0,
        specification: "",
        notes: "",
      }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selectedItem = items.find((item: any) => item.id.toString() === itemId);
    if (selectedItem) {
      updateItem(index, "itemId", selectedItem.id);
      updateItem(index, "itemName", selectedItem.name);
      updateItem(index, "unitPrice", selectedItem.unitPrice || 0);
      updateItem(index, "specification", selectedItem.specification || "");
    }
  };

  if (orderLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">발주서를 찾을 수 없습니다</h1>
          <Button onClick={() => navigate("/orders")}>
            발주서 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/orders/${orderId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
            <Edit className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">발주서 수정</h1>
              <p className="text-sm text-gray-600 mt-1">
                발주서 정보를 수정합니다
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">거래처 *</Label>
                <Select
                  value={formData.vendorId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vendorId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="거래처를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors?.map((vendor: any) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderDate">발주일자 *</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, orderDate: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate">납품희망일</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">비고</Label>
              <Textarea
                id="notes"
                placeholder="추가 정보나 요청사항을 입력하세요"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>발주 품목</CardTitle>
              <Button type="button" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                품목 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {formData.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                발주할 품목을 추가해주세요
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>품목명 *</TableHead>
                    <TableHead>수량 *</TableHead>
                    <TableHead>단가</TableHead>
                    <TableHead>규격</TableHead>
                    <TableHead>비고</TableHead>
                    <TableHead>총액</TableHead>
                    <TableHead className="w-[100px]">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={item.itemId?.toString() || ""}
                          onValueChange={(value) => handleItemSelect(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={item.itemName || "품목 선택"} />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((availableItem: any) => (
                              <SelectItem key={availableItem.id} value={availableItem.id.toString()}>
                                {availableItem.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                          min="1"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                          min="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.specification}
                          onChange={(e) => updateItem(index, "specification", e.target.value)}
                          placeholder="규격 입력"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.notes}
                          onChange={(e) => updateItem(index, "notes", e.target.value)}
                          placeholder="비고 입력"
                        />
                      </TableCell>
                      <TableCell>
                        ₩{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {/* Total Amount Display */}
            {formData.items.length > 0 && (
              <div className="mt-4 pt-4 border-t mx-6 mb-6">
                <div className="flex justify-end">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">총 합계 금액</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ₩{formData.items.reduce((total, item) => {
                          const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
                          return total + itemTotal;
                        }, 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/orders/${orderId}`)}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={updateOrderMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateOrderMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </div>
  );
}