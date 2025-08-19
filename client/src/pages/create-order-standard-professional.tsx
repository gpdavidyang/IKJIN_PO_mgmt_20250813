import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Eye, 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Building, 
  Save, 
  Mail, 
  Upload, 
  Trash2, 
  Plus,
  Package,
  Calendar,
  User,
  ChevronRight,
  DollarSign,
  Loader2,
  Building2,
  Calculator
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Project, User as DatabaseUser } from "@shared/schema";
import { formatNumberWithCommas, removeCommas, generatePONumber } from "@/lib/order-utils";

interface StandardOrderForm {
  site: string;
  deliveryDate: string;
  isNegotiable: boolean;
  receiver: string;
  manager: string;
  notes: string;
  items: OrderItem[];
}

interface OrderItem {
  name: string;
  category: string;
  majorCategory: string;
  middleCategory: string;
  minorCategory: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  specs: string;
  remarks: string;
}

export default function CreateStandardOrderProfessional() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [poNumber] = useState(generatePONumber());
  
  // Form State
  const [formData, setFormData] = useState<StandardOrderForm>({
    site: "",
    deliveryDate: "",
    isNegotiable: false,
    receiver: "",
    manager: "",
    notes: "",
    items: [
      {
        name: '',
        category: '',
        majorCategory: '',
        middleCategory: '',
        minorCategory: '',
        quantity: 0,
        unit: '',
        unitPrice: 0,
        totalPrice: 0,
        specs: '',
        remarks: ''
      }
    ]
  });
  
  // Calculate total for order summary
  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  // Fetch projects for site selection
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    select: (data) => data?.filter((project: Project) => project.isActive) || []
  });

  // Use auth hook instead of direct query
  const { user: currentUser } = useAuth();

  // Fetch users for receiver and manager selection
  const { data: users = [] } = useQuery<DatabaseUser[]>({
    queryKey: ["/api/users"],
    select: (data) => data?.filter((user: DatabaseUser) => user.isActive) || []
  });

  // Dynamic item categories queries with hierarchical filtering
  const { data: majorCategories = [] } = useQuery({
    queryKey: ["/api/item-categories/major"],
    queryFn: () => fetch("/api/item-categories/major").then(res => res.json()),
  });

  // Create state to track currently needed category queries
  const [categoryQueries, setCategoryQueries] = useState<{
    middleQueries: {[majorId: number]: any[]},
    minorQueries: {[middleId: number]: any[]}
  }>({
    middleQueries: {},
    minorQueries: {}
  });

  // Helper functions to fetch and cache categories
  const fetchMiddleCategories = async (majorId: number) => {
    if (categoryQueries.middleQueries[majorId]) {
      return categoryQueries.middleQueries[majorId];
    }
    
    try {
      const response = await fetch(`/api/item-categories/middle?majorId=${majorId}`);
      const categories = await response.json();
      
      setCategoryQueries(prev => ({
        ...prev,
        middleQueries: {
          ...prev.middleQueries,
          [majorId]: categories
        }
      }));
      
      return categories;
    } catch (error) {
      console.error('Error fetching middle categories:', error);
      return [];
    }
  };

  const fetchMinorCategories = async (middleId: number) => {
    if (categoryQueries.minorQueries[middleId]) {
      return categoryQueries.minorQueries[middleId];
    }
    
    try {
      const response = await fetch(`/api/item-categories/minor?middleId=${middleId}`);
      const categories = await response.json();
      
      setCategoryQueries(prev => ({
        ...prev,
        minorQueries: {
          ...prev.minorQueries,
          [middleId]: categories
        }
      }));
      
      return categories;
    } catch (error) {
      console.error('Error fetching minor categories:', error);
      return [];
    }
  };

  // Helper functions to get categories for specific items
  const getMiddleCategoriesForItem = (item: OrderItem) => {
    if (!item.majorCategory) return [];
    
    const majorCategory = majorCategories.find(cat => cat.categoryName === item.majorCategory);
    if (!majorCategory) return [];
    
    return categoryQueries.middleQueries[majorCategory.id] || [];
  };

  const getMinorCategoriesForItem = (item: OrderItem) => {
    if (!item.middleCategory || !item.majorCategory) return [];
    
    const majorCategory = majorCategories.find(cat => cat.categoryName === item.majorCategory);
    if (!majorCategory) return [];
    
    const middleCategories = categoryQueries.middleQueries[majorCategory.id] || [];
    const middleCategory = middleCategories.find(cat => cat.categoryName === item.middleCategory);
    if (!middleCategory) return [];
    
    return categoryQueries.minorQueries[middleCategory.id] || [];
  };

  // Fetch vendors for vendor selection
  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    select: (data: any) => data?.filter((vendor: any) => vendor.isActive) || []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.site) {
      toast({
        title: "필수 정보 누락",
        description: "현장을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.receiver) {
      toast({
        title: "필수 정보 누락", 
        description: "자재 인수자를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    const validItems = formData.items.filter(item => item.name.trim());
    if (validItems.length === 0) {
      toast({
        title: "필수 정보 누락",
        description: "최소 하나의 품목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Prepare order data
      const orderData = {
        orderNumber: poNumber,
        projectId: parseInt(formData.site),
        userId: currentUser?.id,
        orderDate: new Date(),
        deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : undefined,
        totalAmount: calculateTotal(),
        notes: formData.notes || undefined,
        status: 'pending',
        items: validItems.map(item => ({
          itemName: item.name,
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          totalAmount: item.totalPrice || 0,
          specification: item.specs || undefined,
          notes: item.remarks || undefined
        }))
      };

      // API call to create order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const data = await response.json();
      
      toast({
        title: "발주서 생성 완료",
        description: "발주서가 성공적으로 생성되었습니다.",
      });
      
      // Redirect to order detail page
      if (data?.id) {
        navigate(`/orders/${data.id}`);
      }
      
    } catch (error) {
      console.error('Order creation error:', error);
      toast({
        title: "저장 실패",
        description: "발주서 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add new item row
  const addItemRow = () => {
    if (formData.items.length >= 10) {
      toast({
        title: "품목 추가 제한",
        description: "최대 10개까지 추가 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          name: '',
          category: '',
          majorCategory: '',
          middleCategory: '',
          minorCategory: '',
          quantity: 0,
          unit: '',
          unitPrice: 0,
          totalPrice: 0,
          specs: '',
          remarks: ''
        }
      ]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6">
        {/* Professional Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate("/orders")}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            발주서 목록으로
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">표준 발주서 작성</h1>
              <p className="text-sm text-gray-500 mt-1">새로운 발주서를 작성하고 관리하세요</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm px-3 py-1">
                <FileText className="h-4 w-4 mr-1" />
                {poNumber}
              </Badge>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Info Card */}
          <Card className="shadow-sm bg-white">
            <div className="p-6 border-b border-blue-200 bg-blue-50/30">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">발주 정보</h2>
              </div>
            </div>
            <CardContent className="p-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="site" className="text-sm font-medium text-gray-700 mb-2 block">
                    현장 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.site}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, site: value }))}
                  >
                    <SelectTrigger id="site" className="h-11">
                      <SelectValue placeholder="현장을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.projectName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="deliveryDate" className="text-sm font-medium text-gray-700 mb-2 block">
                    납기일
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                      className="pl-10 h-11"
                    />
                  </div>
                  <div className="mt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <Checkbox
                        checked={formData.isNegotiable}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, isNegotiable: checked as boolean }))
                        }
                      />
                      협의 가능
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="receiver" className="text-sm font-medium text-gray-700 mb-2 block">
                    자재 인수자 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.receiver}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, receiver: value }))}
                  >
                    <SelectTrigger id="receiver" className="h-11">
                      <SelectValue placeholder="인수자를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName && user.lastName 
                            ? `${user.lastName}${user.firstName}` 
                            : user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="manager" className="text-sm font-medium text-gray-700 mb-2 block">
                    현장 책임자
                  </Label>
                  <Select
                    value={formData.manager}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, manager: value }))}
                  >
                    <SelectTrigger id="manager" className="h-11">
                      <SelectValue placeholder="책임자를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName && user.lastName 
                            ? `${user.lastName}${user.firstName}` 
                            : user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table Card */}
          <Card className="shadow-sm bg-white">
            <div className="p-6 border-b border-blue-200 bg-blue-50/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">품목 정보</h2>
                  <span className="text-sm text-gray-500">
                    {formData.items.filter(item => item.name).length} / 10 품목
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItemRow}
                  disabled={formData.items.length >= 10}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  품목 추가
                </Button>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-50 border-b border-blue-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">품목명</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대분류</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">중분류</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">소분류</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">수량</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">단위</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">단가</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Input
                            value={item.name}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index] = { ...item, name: e.target.value };
                              setFormData((prev) => ({ ...prev, items: newItems }));
                            }}
                            placeholder="품목명"
                            className="h-9 border-gray-200"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={item.majorCategory}
                            onValueChange={async (value) => {
                              const selectedCategory = majorCategories.find(cat => cat.categoryName === value);
                              
                              const newItems = [...formData.items];
                              newItems[index] = { 
                                ...item, 
                                majorCategory: value,
                                middleCategory: '',
                                minorCategory: ''
                              };
                              setFormData((prev) => ({ ...prev, items: newItems }));
                              
                              if (selectedCategory) {
                                await fetchMiddleCategories(selectedCategory.id);
                              }
                            }}
                          >
                            <SelectTrigger className="h-9 border-gray-200">
                              <SelectValue placeholder="대분류" />
                            </SelectTrigger>
                            <SelectContent>
                              {majorCategories.map((category: any) => (
                                <SelectItem key={category.id} value={category.categoryName}>
                                  {category.categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={item.middleCategory}
                            onValueChange={async (value) => {
                              const middleCategories = getMiddleCategoriesForItem(item);
                              const selectedCategory = middleCategories.find(cat => cat.categoryName === value);
                              
                              const newItems = [...formData.items];
                              newItems[index] = { 
                                ...item, 
                                middleCategory: value,
                                minorCategory: ''
                              };
                              setFormData((prev) => ({ ...prev, items: newItems }));
                              
                              if (selectedCategory) {
                                await fetchMinorCategories(selectedCategory.id);
                              }
                            }}
                            disabled={!item.majorCategory}
                          >
                            <SelectTrigger className="h-9 border-gray-200">
                              <SelectValue placeholder={item.majorCategory ? "중분류" : "대분류 먼저"} />
                            </SelectTrigger>
                            <SelectContent>
                              {getMiddleCategoriesForItem(item).map((category: any) => (
                                <SelectItem key={category.id} value={category.categoryName}>
                                  {category.categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={item.minorCategory}
                            onValueChange={(value) => {
                              const newItems = [...formData.items];
                              newItems[index] = { ...item, minorCategory: value };
                              setFormData((prev) => ({ ...prev, items: newItems }));
                            }}
                            disabled={!item.middleCategory}
                          >
                            <SelectTrigger className="h-9 border-gray-200">
                              <SelectValue placeholder={item.middleCategory ? "소분류" : "중분류 먼저"} />
                            </SelectTrigger>
                            <SelectContent>
                              {getMinorCategoriesForItem(item).map((category: any) => (
                                <SelectItem key={category.id} value={category.categoryName}>
                                  {category.categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index] = { 
                                ...item, 
                                quantity: parseInt(e.target.value) || 0,
                                totalPrice: (parseInt(e.target.value) || 0) * (item.unitPrice || 0)
                              };
                              setFormData((prev) => ({ ...prev, items: newItems }));
                            }}
                            placeholder="0"
                            className="h-9 text-center w-20 border-gray-200"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={item.unit || ''}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index] = { ...item, unit: e.target.value };
                              setFormData((prev) => ({ ...prev, items: newItems }));
                            }}
                            placeholder="개"
                            className="h-9 text-center w-16 border-gray-200"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index] = { 
                                ...item, 
                                unitPrice: parseInt(e.target.value) || 0,
                                totalPrice: (item.quantity || 0) * (parseInt(e.target.value) || 0)
                              };
                              setFormData((prev) => ({ ...prev, items: newItems }));
                            }}
                            placeholder="0"
                            className="h-9 text-right border-gray-200"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-blue-600">
                            {(item.totalPrice || 0).toLocaleString()}원
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newItems = formData.items.filter((_, i) => i !== index);
                              setFormData((prev) => ({ ...prev, items: newItems }));
                            }}
                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-blue-50">
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                        총 발주금액
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-lg font-bold text-blue-600">
                          {calculateTotal().toLocaleString()}원
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="shadow-sm bg-white">
            <div className="p-6 border-b border-blue-200 bg-blue-50/30">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">추가 정보</h2>
              </div>
            </div>
            <CardContent className="p-6 bg-white">
              <div>
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-2 block">
                  비고사항
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="추가 요청사항이나 특이사항을 입력하세요..."
                  className="min-h-[100px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/orders")}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  발주서 저장
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}