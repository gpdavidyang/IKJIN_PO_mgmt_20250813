import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  
  console.log('OrderEdit params:', params);
  console.log('OrderEdit orderId:', orderId, typeof orderId);

  const [formData, setFormData] = useState({
    projectId: "",
    vendorId: "",
    orderDate: "",
    deliveryDate: "",
    notes: "",
    templateId: "",
    items: [] as any[],
  });

  // Fetch order data
  const { data: order, isLoading: orderLoading, error: orderError } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    queryFn: () => apiRequest("GET", `/api/orders/${orderId}`),
    enabled: !!orderId,
  });

  // Debug logs
  console.log('OrderEdit Debug:', {
    orderId,
    order,
    orderLoading,
    orderError,
    enabled: !!orderId
  });

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: () => apiRequest("GET", "/api/vendors"),
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => apiRequest("GET", "/api/projects"),
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("GET", "/api/categories"),
  });

  const categories = categoriesData?.categories || [];
  const flatCategories = categoriesData?.flatCategories || [];

  // Debug category data
  console.log('Categories data:', categoriesData);
  console.log('Categories (hierarchical):', categories);
  console.log('Flat categories:', flatCategories);

  // Fetch items
  const { data: itemsData } = useQuery({
    queryKey: ["/api/items"],
    queryFn: () => apiRequest("GET", "/api/items"),
  });

  const items = itemsData?.items || [];

  useEffect(() => {
    if (order && items.length > 0) {
      // Map existing order items to include proper itemId based on itemName and add category fields
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
          unit: item.unit || "EA",
          majorCategory: item.majorCategory || "",
          middleCategory: item.middleCategory || "",
          minorCategory: item.minorCategory || "",
        };
      });

      setFormData({
        projectId: order.projectId?.toString() || "",
        vendorId: order.vendorId?.toString() || "",
        orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : "",
        deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : "",
        notes: order.notes || "",
        templateId: order.templateId?.toString() || "",
        items: mappedItems,
      });
    } else if (order && items.length === 0) {
      // If items haven't loaded yet, set basic form data without items
      setFormData({
        projectId: order.projectId?.toString() || "",
        vendorId: order.vendorId?.toString() || "",
        orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : "",
        deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : "",
        notes: order.notes || "",
        templateId: order.templateId?.toString() || "",
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
      projectId: formData.projectId ? parseInt(formData.projectId) : null,
      vendorId: parseInt(formData.vendorId),
      orderDate: new Date(formData.orderDate),
      deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : null,
      notes: formData.notes,
      templateId: formData.templateId ? parseInt(formData.templateId) : null,
      items: formData.items.map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        specification: item.specification || "",
        notes: item.notes || "",
        unit: item.unit || "EA",
        majorCategory: item.majorCategory || "",
        middleCategory: item.middleCategory || "",
        minorCategory: item.minorCategory || "",
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
        unit: "EA",
        majorCategory: "",
        middleCategory: "",
        minorCategory: "",
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

  // Category selection helpers
  const getMajorCategories = () => {
    // Filter only major categories from flat categories
    const majorCats = flatCategories.filter((cat: any) => cat.categoryType === 'major');
    console.log('getMajorCategories result:', majorCats);
    return majorCats;
  };

  const getMiddleCategories = (majorCategoryName: string) => {
    if (!majorCategoryName || majorCategoryName === "none") return [];
    
    // Find the major category by name
    const majorCategory = flatCategories.find((cat: any) => 
      cat.categoryType === 'major' && cat.categoryName === majorCategoryName
    );
    
    if (!majorCategory) {
      console.log(`Major category not found: ${majorCategoryName}`);
      return [];
    }
    
    // Get all middle categories that belong to this major category
    const middleCats = flatCategories.filter((cat: any) => 
      cat.categoryType === 'middle' && cat.parentId === majorCategory.id
    );
    
    console.log(`Middle categories for ${majorCategoryName}:`, middleCats);
    return middleCats;
  };

  const getMinorCategories = (middleCategoryName: string) => {
    if (!middleCategoryName || middleCategoryName === "none") return [];
    
    // Find the middle category by name
    const middleCategory = flatCategories.find((cat: any) => 
      cat.categoryType === 'middle' && cat.categoryName === middleCategoryName
    );
    
    if (!middleCategory) {
      console.log(`Middle category not found: ${middleCategoryName}`);
      return [];
    }
    
    // Get all minor categories that belong to this middle category
    const minorCats = flatCategories.filter((cat: any) => 
      cat.categoryType === 'minor' && cat.parentId === middleCategory.id
    );
    
    console.log(`Minor categories for ${middleCategoryName}:`, minorCats);
    return minorCats;
  };

  const handleCategoryChange = (index: number, categoryType: 'major' | 'middle' | 'minor', value: string) => {
    console.log(`Category change: index=${index}, type=${categoryType}, value=${value}`);
    const updates: any = {};
    
    // Convert "none" to empty string
    const actualValue = value === "none" ? "" : value;
    console.log(`Actual value after conversion: ${actualValue}`);
    
    if (categoryType === 'major') {
      updates.majorCategory = actualValue;
      updates.middleCategory = ""; // Reset dependent categories
      updates.minorCategory = "";
    } else if (categoryType === 'middle') {
      updates.middleCategory = actualValue;
      updates.minorCategory = ""; // Reset dependent categories
    } else if (categoryType === 'minor') {
      updates.minorCategory = actualValue;
    }

    console.log(`Updates to apply:`, updates);

    // Update multiple fields at once
    setFormData(prev => {
      const newItems = prev.items.map((item, i) => 
        i === index ? { ...item, ...updates } : item
      );
      console.log(`Updated item ${index}:`, newItems[index]);
      return {
        ...prev,
        items: newItems,
      };
    });
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

  if (orderError) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">발주서 로드 중 오류가 발생했습니다</h1>
          <p className="mb-4 text-red-600">{orderError.message}</p>
          <Button onClick={() => navigate("/orders")}>
            발주서 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">발주서를 찾을 수 없습니다</h1>
          <p className="mb-4 text-gray-600">OrderID: {orderId}</p>
          <Button onClick={() => navigate("/orders")}>
            발주서 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1366px] mx-auto p-6">
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
        {/* Order Information Summary */}
        {order && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-blue-600">발주서 번호</h3>
                  <p className="text-lg font-semibold text-blue-900">{order.orderNumber || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-600">현재 상태</h3>
                  <p className="text-lg font-semibold text-blue-900">{order.status || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-600">생성일시</h3>
                  <p className="text-lg font-semibold text-blue-900">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString('ko-KR') : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="project">프로젝트</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="프로젝트를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <Card key={index} className="p-4 border bg-gradient-to-br from-gray-50 to-white hover:shadow-md transition-shadow">
                    {/* 헤더: 순번과 삭제 버튼 */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-200">
                          품목 #{index + 1}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {item.itemName ? `• ${item.itemName}` : ''}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* 첫 번째 행: 기본 정보 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-3">
                      <div className="col-span-2 sm:col-span-3 md:col-span-2">
                        <Label className="text-xs font-medium text-gray-700 mb-1 block">품목명 *</Label>
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
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1 block">수량 *</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = value === "" ? 0 : Number(value);
                            console.log(`Quantity changed: ${value} -> ${numValue}`);
                            updateItem(index, "quantity", numValue);
                          }}
                          onBlur={(e) => {
                            if (Number(e.target.value) < 1) {
                              updateItem(index, "quantity", 1);
                            }
                          }}
                          min="0.01"
                          step="0.01"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1 block">단위</Label>
                        <Select
                          value={item.unit || "EA"}
                          onValueChange={(value) => {
                            console.log(`Unit selected: ${value}`);
                            updateItem(index, "unit", value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="단위 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EA">EA</SelectItem>
                            <SelectItem value="개">개</SelectItem>
                            <SelectItem value="박스">박스</SelectItem>
                            <SelectItem value="세트">세트</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="mL">mL</SelectItem>
                            <SelectItem value="m">m</SelectItem>
                            <SelectItem value="cm">cm</SelectItem>
                            <SelectItem value="mm">mm</SelectItem>
                            <SelectItem value="㎡">㎡</SelectItem>
                            <SelectItem value="㎥">㎥</SelectItem>
                            <SelectItem value="매">매</SelectItem>
                            <SelectItem value="장">장</SelectItem>
                            <SelectItem value="권">권</SelectItem>
                            <SelectItem value="부">부</SelectItem>
                            <SelectItem value="대">대</SelectItem>
                            <SelectItem value="식">식</SelectItem>
                            <SelectItem value="조">조</SelectItem>
                            <SelectItem value="타">타</SelectItem>
                            <SelectItem value="켤레">켤레</SelectItem>
                            <SelectItem value="통">통</SelectItem>
                            <SelectItem value="병">병</SelectItem>
                            <SelectItem value="캔">캔</SelectItem>
                            <SelectItem value="포">포</SelectItem>
                            <SelectItem value="봉">봉</SelectItem>
                            <SelectItem value="팩">팩</SelectItem>
                            <SelectItem value="롤">롤</SelectItem>
                            <SelectItem value="쌍">쌍</SelectItem>
                            <SelectItem value="톤">톤</SelectItem>
                            <SelectItem value="되">되</SelectItem>
                            <SelectItem value="말">말</SelectItem>
                            <SelectItem value="자루">자루</SelectItem>
                            <SelectItem value="마리">마리</SelectItem>
                            <SelectItem value="모">모</SelectItem>
                            <SelectItem value="평">평</SelectItem>
                            <SelectItem value="보루">보루</SelectItem>
                            <SelectItem value="묶음">묶음</SelectItem>
                            <SelectItem value="다스">다스</SelectItem>
                            <SelectItem value="갑">갑</SelectItem>
                            <SelectItem value="곽">곽</SelectItem>
                            <SelectItem value="판">판</SelectItem>
                            <SelectItem value="그루">그루</SelectItem>
                            <SelectItem value="주">주</SelectItem>
                            <SelectItem value="본">본</SelectItem>
                            <SelectItem value="줄">줄</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1 block">단가</Label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                          min="0"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1 block">총액</Label>
                        <div className="h-10 px-3 py-2 border rounded-md bg-blue-50 border-blue-200 flex items-center font-semibold text-blue-700">
                          ₩{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    </div>

                    {/* 두 번째 행: 상세 정보 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 border-t border-gray-200 pt-3 mt-3">
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1 block">대분류</Label>
                        <Select
                          value={item.majorCategory || "none"}
                          onValueChange={(value) => {
                            console.log(`Major category selected: ${value}`);
                            handleCategoryChange(index, "major", value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="대분류 선택">
                              {item.majorCategory && item.majorCategory !== "none" ? item.majorCategory : "대분류 선택"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">선택 해제</SelectItem>
                            {getMajorCategories().map((category: any) => (
                              <SelectItem key={`major-${category.id}`} value={category.categoryName}>
                                {category.categoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1 block">중분류</Label>
                        <Select
                          value={item.middleCategory || "none"}
                          onValueChange={(value) => {
                            console.log(`Middle category selected: ${value}`);
                            handleCategoryChange(index, "middle", value);
                          }}
                          disabled={!item.majorCategory || item.majorCategory === "none"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={item.majorCategory && item.majorCategory !== "none" ? "중분류 선택" : "대분류 먼저 선택"}>
                              {item.middleCategory && item.middleCategory !== "none" ? item.middleCategory : (item.majorCategory && item.majorCategory !== "none" ? "중분류 선택" : "대분류 먼저 선택")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">선택 해제</SelectItem>
                            {getMiddleCategories(item.majorCategory || "").map((category: any) => (
                              <SelectItem key={`middle-${category.id}`} value={category.categoryName}>
                                {category.categoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1 block">소분류</Label>
                        <Select
                          value={item.minorCategory || "none"}
                          onValueChange={(value) => {
                            console.log(`Minor category selected: ${value}`);
                            handleCategoryChange(index, "minor", value);
                          }}
                          disabled={!item.middleCategory || item.middleCategory === "none"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={item.middleCategory && item.middleCategory !== "none" ? "소분류 선택" : "중분류 먼저 선택"}>
                              {item.minorCategory && item.minorCategory !== "none" ? item.minorCategory : (item.middleCategory && item.middleCategory !== "none" ? "소분류 선택" : "중분류 먼저 선택")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">선택 해제</SelectItem>
                            {getMinorCategories(item.middleCategory || "").map((category: any) => (
                              <SelectItem key={`minor-${category.id}`} value={category.categoryName}>
                                {category.categoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1 block">규격</Label>
                        <Input
                          value={item.specification}
                          onChange={(e) => updateItem(index, "specification", e.target.value)}
                          placeholder="규격 입력"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-1 block">비고</Label>
                        <Input
                          value={item.notes}
                          onChange={(e) => updateItem(index, "notes", e.target.value)}
                          placeholder="비고 입력"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Items Summary */}
            {formData.items.length > 0 && (
              <div className="mt-6 space-y-4">
                {/* Category Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 mb-1">총 품목 수</div>
                    <div className="text-xl font-bold text-blue-700">{formData.items.length}개</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-green-600 mb-1">총 수량</div>
                    <div className="text-xl font-bold text-green-700">
                      {formData.items.reduce((total, item) => total + (Number(item.quantity) || 0), 0)}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-purple-600 mb-1">대분류 수</div>
                    <div className="text-xl font-bold text-purple-700">
                      {new Set(formData.items.map(item => item.majorCategory).filter(cat => cat)).size}개
                    </div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm text-orange-600 mb-1">총 합계 금액</div>
                    <div className="text-xl font-bold text-orange-700">
                      ₩{formData.items.reduce((total, item) => {
                        const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                        return total + itemTotal;
                      }, 0).toLocaleString()}
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