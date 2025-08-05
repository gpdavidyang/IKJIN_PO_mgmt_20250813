import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "@/styles/compact-form.css";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Eye, 
  ArrowLeft, 
  ZoomOut, 
  ZoomIn, 
  RotateCcw, 
  Download,
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Building, 
  Save, 
  Mail, 
  Upload, 
  Trash2, 
  PlusCircle, 
  Copy,
  X,
  Plus,
  Loader2
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

export default function CreateStandardOrderCompact() {
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

  // Fetch current user info
  const { data: currentUser } = useQuery<DatabaseUser>({
    queryKey: ["/api/auth/user"],
  });

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

  return (
    <form onSubmit={handleSubmit}>
    <div className="compact-order-form">
      {/* Main Form Area */}
      <div className="main-form-area">
        {/* Page Header - Compact */}
        <div className="compact-card bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-lg font-bold">표준 발주서 작성</h1>
                <p className="text-xs text-muted-foreground">효율적인 레이아웃으로 빠른 입력</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {poNumber}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {new Date().toLocaleDateString("ko-KR")}
              </Badge>
            </div>
          </div>
        </div>

        {/* 기본 정보 입력 - Compact Grid Layout */}
        <Card className="compact-card">
          <div className="section-header">
            <h3 className="section-title">기본 정보</h3>
          </div>
          <CardContent>
            <div className="form-grid-2col">
              <div className="inline-field">
                <label>현장</label>
                <Select value={formData.site} onValueChange={(value) => setFormData({...formData, site: value})}>
                  <SelectTrigger className="compact-select">
                    <SelectValue placeholder="현장 선택" />
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

              <div className="inline-field">
                <label>납기일</label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="date" 
                    className="compact-input" 
                    disabled={formData.isNegotiable}
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                  />
                  <div className="flex items-center gap-1">
                    <Checkbox
                      id="negotiable"
                      checked={formData.isNegotiable}
                      onCheckedChange={(checked) => setFormData({...formData, isNegotiable: checked as boolean})}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="negotiable" className="text-xs cursor-pointer">협의</Label>
                  </div>
                </div>
              </div>

              <div className="inline-field">
                <label>인수자</label>
                <Select value={formData.receiver} onValueChange={(value) => setFormData({...formData, receiver: value})}>
                  <SelectTrigger className="compact-select">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="inline-field">
                <label>담당자</label>
                <Select value={formData.manager} onValueChange={(value) => setFormData({...formData, manager: value})}>
                  <SelectTrigger className="compact-select">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 품목 정보 - Compact Table */}
        <Card className="compact-card">
          <div className="section-header">
            <h3 className="section-title">품목 정보</h3>
            <span className="text-sm text-muted-foreground">
              {formData.items.filter(item => item.name).length} / 10 품목
            </span>
          </div>
          <CardContent className="p-0">
            <div className="compact-items-container">
              <table className="w-full compact-items-table">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground">품목명</th>
                    <th className="text-left text-xs font-medium text-muted-foreground">대분류</th>
                    <th className="text-left text-xs font-medium text-muted-foreground">중분류</th>
                    <th className="text-left text-xs font-medium text-muted-foreground">소분류</th>
                    <th className="text-center text-xs font-medium text-muted-foreground">수량</th>
                    <th className="text-center text-xs font-medium text-muted-foreground">단위</th>
                    <th className="text-right text-xs font-medium text-muted-foreground">단가</th>
                    <th className="text-right text-xs font-medium text-muted-foreground">금액</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">
                        <Input
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index] = { ...item, name: e.target.value };
                            setFormData((prev) => ({ ...prev, items: newItems }));
                          }}
                          placeholder="품목명"
                          className="compact-input border-0 bg-transparent"
                        />
                      </td>
                      {/* 대분류 */}
                      <td className="py-2">
                        <Select
                          value={item.majorCategory}
                          onValueChange={async (value) => {
                            const selectedCategory = majorCategories.find(cat => cat.categoryName === value);
                            
                            // Update form data
                            const newItems = [...formData.items];
                            newItems[index] = { 
                              ...item, 
                              majorCategory: value,
                              middleCategory: '', // 대분류 변경 시 중분류 초기화
                              minorCategory: ''   // 대분류 변경 시 소분류 초기화
                            };
                            setFormData((prev) => ({ ...prev, items: newItems }));
                            
                            // Fetch middle categories for the selected major category
                            if (selectedCategory) {
                              await fetchMiddleCategories(selectedCategory.id);
                            }
                          }}
                        >
                          <SelectTrigger className="compact-select border-0 bg-transparent">
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
                      {/* 중분류 */}
                      <td className="py-2">
                        <Select
                          value={item.middleCategory}
                          onValueChange={async (value) => {
                            const middleCategories = getMiddleCategoriesForItem(item);
                            const selectedCategory = middleCategories.find(cat => cat.categoryName === value);
                            
                            // Update form data
                            const newItems = [...formData.items];
                            newItems[index] = { 
                              ...item, 
                              middleCategory: value,
                              minorCategory: '' // 중분류 변경 시 소분류 초기화
                            };
                            setFormData((prev) => ({ ...prev, items: newItems }));
                            
                            // Fetch minor categories for the selected middle category
                            if (selectedCategory) {
                              await fetchMinorCategories(selectedCategory.id);
                            }
                          }}
                          disabled={!item.majorCategory}
                        >
                          <SelectTrigger className="compact-select border-0 bg-transparent">
                            <SelectValue placeholder={item.majorCategory ? "중분류" : "먼저 대분류 선택"} />
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
                      {/* 소분류 */}
                      <td className="py-2">
                        <Select
                          value={item.minorCategory}
                          onValueChange={(value) => {
                            const newItems = [...formData.items];
                            newItems[index] = { ...item, minorCategory: value };
                            setFormData((prev) => ({ ...prev, items: newItems }));
                          }}
                          disabled={!item.middleCategory}
                        >
                          <SelectTrigger className="compact-select border-0 bg-transparent">
                            <SelectValue placeholder={item.middleCategory ? "소분류" : "먼저 중분류 선택"} />
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
                      <td className="py-2">
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
                          className="compact-input border-0 bg-transparent text-center w-20"
                        />
                      </td>
                      <td className="py-2">
                        <Input
                          value={item.unit || ''}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index] = { ...item, unit: e.target.value };
                            setFormData((prev) => ({ ...prev, items: newItems }));
                          }}
                          placeholder="개"
                          className="compact-input border-0 bg-transparent text-center w-16"
                        />
                      </td>
                      <td className="py-2">
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
                          className="compact-input border-0 bg-transparent text-right"
                        />
                      </td>
                      <td className="py-2 text-right font-medium">
                        {(item.totalPrice || 0).toLocaleString()}원
                      </td>
                      <td className="py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newItems = formData.items.filter((_, i) => i !== index);
                            setFormData((prev) => ({ ...prev, items: newItems }));
                          }}
                          className="h-8 w-8"
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {formData.items.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
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
                  }}
                  className="w-full mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  품목 추가
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 비고 */}
        <Card className="compact-card">
          <div className="section-header">
            <h3 className="section-title">비고</h3>
          </div>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="추가 요청사항이나 특별 지시사항을 입력하세요"
              rows={3}
              className="compact-textarea"
            />
          </CardContent>
        </Card>
      </div>

      {/* 우측 액션 패널 */}
      <div className="action-panel">
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">발주 요약</h3>
          
          <div className="order-summary">
            <div className="summary-item">
              <span className="text-muted-foreground">품목 수</span>
              <span>{formData.items.filter(item => item.name).length}개</span>
            </div>
            <div className="summary-item">
              <span className="text-muted-foreground">소계</span>
              <span>{calculateTotal().toLocaleString()}원</span>
            </div>
            <div className="summary-item">
              <span className="text-muted-foreground">부가세</span>
              <span>{Math.floor(calculateTotal() * 0.1).toLocaleString()}원</span>
            </div>
            <div className="summary-total">
              <span>총 금액</span>
              <span>{Math.floor(calculateTotal() * 1.1).toLocaleString()}원</span>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t">
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                '발주서 작성'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/orders')}
              className="w-full"
              size="sm"
            >
              취소
            </Button>
          </div>

          <div className="pt-3 border-t space-y-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start"
              size="sm"
              onClick={() => {
                // 임시 저장 기능
                localStorage.setItem('draft-order', JSON.stringify(formData));
                toast({
                  title: "임시 저장됨",
                  description: "발주서가 임시 저장되었습니다.",
                });
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              임시 저장
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start"
              size="sm"
              onClick={() => {
                // 미리보기 기능
                console.log('Preview order:', formData);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              미리보기
            </Button>
          </div>
        </div>
      </div>
    </div>
    </form>
  );
}