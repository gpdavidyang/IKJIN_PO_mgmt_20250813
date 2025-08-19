import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  CheckCircle, 
  Info,
  Plus,
  Trash2,
  Calculator,
  Building2,
  Calendar,
  User,
  Package
} from 'lucide-react';
import { formatNumberWithCommas, removeCommas, generatePONumber } from '@/lib/order-utils';
import type { Project, User as DatabaseUser } from '@shared/schema';

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
  vendorId?: string;
  deliveryLocation?: string;
  deliveryToSite?: boolean;
}

interface StandardFormComponentProps {
  onFormComplete: (data: any) => void;
  disabled?: boolean;
}

const StandardFormComponent: React.FC<StandardFormComponentProps> = ({ 
  onFormComplete, 
  disabled 
}) => {
  const [poNumber] = useState(generatePONumber());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
        remarks: '',
        vendorId: '',
        deliveryLocation: '',
        deliveryToSite: false
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

  // Fetch vendors for vendor and delivery location selection
  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    select: (data: any) => data?.filter((vendor: any) => vendor.isActive) || []
  });

  // Dynamic item categories queries
  const { data: majorCategories = [] } = useQuery({
    queryKey: ["/api/item-categories/major"],
    queryFn: () => fetch("/api/item-categories/major").then(res => res.json()),
  });

  const { data: middleCategories = [] } = useQuery({
    queryKey: ["/api/item-categories/middle"], 
    queryFn: () => fetch("/api/item-categories/middle").then(res => res.json()),
  });

  const { data: minorCategories = [] } = useQuery({
    queryKey: ["/api/item-categories/minor"],
    queryFn: () => fetch("/api/item-categories/minor").then(res => res.json()),
  });

  // 대분류에 따른 중분류 필터링 함수
  const getFilteredMiddleCategories = (majorCategory: string) => {
    if (!majorCategory) return middleCategories;
    // 현재는 모든 중분류를 반환하지만, 실제로는 대분류에 따라 필터링해야 함
    return middleCategories;
  };

  // 중분류에 따른 소분류 필터링 함수
  const getFilteredMinorCategories = (middleCategory: string) => {
    if (!middleCategory) return minorCategories;
    // 현재는 모든 소분류를 반환하지만, 실제로는 중분류에 따라 필터링해야 함
    return minorCategories;
  };

  // Handle form field updates
  const updateFormField = (field: keyof StandardOrderForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle item updates
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Auto-calculate total price when quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? value : updatedItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? value : updatedItems[index].unitPrice;
      updatedItems[index].totalPrice = quantity * unitPrice;
    }

    // 카테고리 계층 구조 로직: 상위 카테고리 변경 시 하위 카테고리 초기화
    if (field === 'majorCategory') {
      // 대분류 변경 시 중분류, 소분류 초기화
      updatedItems[index].middleCategory = '';
      updatedItems[index].minorCategory = '';
    } else if (field === 'middleCategory') {
      // 중분류 변경 시 소분류 초기화
      updatedItems[index].minorCategory = '';
    }

    // 납품처 체크박스 처리
    if (field === 'deliveryToSite' && value === true) {
      updatedItems[index].deliveryLocation = '현장';
    }

    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  // Add new item
  const addItem = () => {
    setFormData(prev => ({
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
          remarks: '',
          vendorId: '',
          deliveryLocation: '',
          deliveryToSite: false
        }
      ]
    }));
  };

  // Remove item
  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    if (!formData.site) {
      alert('현장을 선택해주세요.');
      return false;
    }
    if (!formData.deliveryDate) {
      alert('희망 납기일을 입력해주세요.');
      return false;
    }
    if (formData.items.some(item => !item.name || item.quantity <= 0)) {
      alert('모든 품목의 이름과 수량을 입력해주세요.');
      return false;
    }
    // 최소한 첫 번째 품목에 거래처가 선택되어 있어야 함
    if (!formData.items[0]?.vendorId) {
      alert('최소한 하나의 품목에 거래처를 선택해주세요.');
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      // Format data for submission
      const selectedProject = projects.find(p => p.projectName === formData.site);
      const firstItemVendorId = formData.items[0]?.vendorId || '';
      
      const orderData = {
        type: 'standard',
        orderNumber: poNumber,
        projectId: selectedProject?.id?.toString() || '', // workflow-utils.ts에서 요구하는 필드
        vendorId: firstItemVendorId, // workflow-utils.ts에서 요구하는 필드
        siteName: formData.site,
        orderDate: new Date().toISOString().split('T')[0], // workflow-utils.ts에서 요구하는 필드
        deliveryDate: formData.deliveryDate,
        isNegotiable: formData.isNegotiable,
        receiver: formData.receiver,
        manager: formData.manager,
        notes: formData.notes,
        totalAmount: calculateTotal(),
        items: formData.items.map(item => ({
          itemName: item.name,
          specification: item.specs,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalAmount: item.totalPrice,
          category: item.category,
          majorCategory: item.majorCategory,
          middleCategory: item.middleCategory,
          minorCategory: item.minorCategory,
          remarks: item.remarks,
          vendorId: item.vendorId,
          deliveryLocation: item.deliveryLocation,
          deliveryToSite: item.deliveryToSite
        }))
      };

      // Call parent callback
      onFormComplete(orderData);
      
    } catch (error) {
      console.error('Form submission error:', error);
      alert('발주서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 안내 메시지 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              표준 발주서 작성 안내
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>단계별 입력으로 정확한 발주서 작성</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>실시간 데이터 검증 및 자동 완성</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>자동 저장으로 안전한 데이터 보관</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 발주서 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            발주서 기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="poNumber">발주서 번호</Label>
              <Input
                id="poNumber"
                value={poNumber}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="site">현장 선택 *</Label>
              <Select
                value={formData.site}
                onValueChange={(value) => updateFormField('site', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="현장을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.projectName}>
                      {project.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deliveryDate">희망 납기일 *</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => updateFormField('deliveryDate', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="isNegotiable"
                checked={formData.isNegotiable}
                onCheckedChange={(checked) => updateFormField('isNegotiable', checked)}
                disabled={disabled}
              />
              <Label htmlFor="isNegotiable">납기 협의 가능</Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="receiver">수신자</Label>
              <Select
                value={formData.receiver}
                onValueChange={(value) => updateFormField('receiver', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="수신자를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.name}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="manager">담당자</Label>
              <Input
                id="manager"
                value={formData.manager}
                onChange={(e) => updateFormField('manager', e.target.value)}
                placeholder="담당자명을 입력하세요"
                disabled={disabled}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">특이사항</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateFormField('notes', e.target.value)}
              placeholder="특이사항이나 요청사항을 입력하세요"
              rows={3}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* 품목 리스트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              발주 품목
            </div>
            <Button
              onClick={addItem}
              variant="outline"
              size="sm"
              disabled={disabled}
            >
              <Plus className="w-4 h-4 mr-2" />
              품목 추가
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <Card key={index} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline">품목 {index + 1}</Badge>
                    {formData.items.length > 1 && (
                      <Button
                        onClick={() => removeItem(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={disabled}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* 품목 정보 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label>품목명 *</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(index, 'name', e.target.value)}
                          placeholder="품목명을 입력하세요"
                          disabled={disabled}
                        />
                      </div>
                      <div>
                        <Label>규격</Label>
                        <Input
                          value={item.specs}
                          onChange={(e) => updateItem(index, 'specs', e.target.value)}
                          placeholder="규격을 입력하세요"
                          disabled={disabled}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label>대분류</Label>
                          <Select
                            value={item.majorCategory}
                            onValueChange={(value) => updateItem(index, 'majorCategory', value)}
                            disabled={disabled}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {majorCategories.map((category: any) => (
                                <SelectItem key={category.id} value={category.categoryValue || category.categoryName}>
                                  {category.categoryValue || category.categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>중분류</Label>
                          <Select
                            value={item.middleCategory}
                            onValueChange={(value) => updateItem(index, 'middleCategory', value)}
                            disabled={disabled || !item.majorCategory}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFilteredMiddleCategories(item.majorCategory).map((category: any) => (
                                <SelectItem key={category.id} value={category.categoryValue || category.categoryName}>
                                  {category.categoryValue || category.categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>소분류</Label>
                          <Select
                            value={item.minorCategory}
                            onValueChange={(value) => updateItem(index, 'minorCategory', value)}
                            disabled={disabled || !item.middleCategory}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFilteredMinorCategories(item.middleCategory).map((category: any) => (
                                <SelectItem key={category.id} value={category.categoryValue || category.categoryName}>
                                  {category.categoryValue || category.categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <Label>수량 *</Label>
                      <Input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <Label>단위</Label>
                      <Select
                        value={item.unit}
                        onValueChange={(value) => updateItem(index, 'unit', value)}
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="단위 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ea">ea</SelectItem>
                          <SelectItem value="set">set</SelectItem>
                          <SelectItem value="ton">ton</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="cm">cm</SelectItem>
                          <SelectItem value="mm">mm</SelectItem>
                          <SelectItem value="m²">m²</SelectItem>
                          <SelectItem value="m³">m³</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="mL">mL</SelectItem>
                          <SelectItem value="기타">기타</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>단가</Label>
                      <Input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <Label>총액</Label>
                      <Input
                        value={formatNumberWithCommas(item.totalPrice)}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  {/* 거래처 및 납품처 정보 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label>거래처</Label>
                      <Select
                        value={item.vendorId || ''}
                        onValueChange={(value) => updateItem(index, 'vendorId', value)}
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="거래처를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((vendor: any) => (
                            <SelectItem key={vendor.id} value={vendor.id.toString()}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>납품처</Label>
                      <div className="flex gap-2">
                        <Select
                          value={item.deliveryLocation || ''}
                          onValueChange={(value) => updateItem(index, 'deliveryLocation', value)}
                          disabled={disabled || item.deliveryToSite}
                          className="flex-1"
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="납품처를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors.map((vendor: any) => (
                              <SelectItem key={vendor.id} value={vendor.name}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`deliveryToSite-${index}`}
                            checked={item.deliveryToSite || false}
                            onCheckedChange={(checked) => {
                              updateItem(index, 'deliveryToSite', checked);
                              if (checked) {
                                updateItem(index, 'deliveryLocation', '현장');
                              }
                            }}
                            disabled={disabled}
                          />
                          <Label htmlFor={`deliveryToSite-${index}`} className="text-sm cursor-pointer">
                            현장
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label>비고</Label>
                    <Textarea
                      value={item.remarks}
                      onChange={(e) => updateItem(index, 'remarks', e.target.value)}
                      placeholder="추가 설명이나 요청사항"
                      rows={2}
                      disabled={disabled}
                    />
                  </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 주문 요약 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            주문 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">총 주문 금액</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatNumberWithCommas(calculateTotal())}원
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              총 {formData.items.length}개 품목
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 제출 버튼 */}
      <div className="flex gap-4">
        <Button
          onClick={handleSubmit}
          disabled={disabled || isSubmitting}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              처리 중...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              발주서 생성
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default StandardFormComponent;