import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';

interface DirectInputFormProps {
  initialData?: any;
  onChange: (data: any) => void;
}

const DirectInputForm: React.FC<DirectInputFormProps> = ({ initialData = {}, onChange }) => {
  const [formData, setFormData] = useState({
    orderNumber: initialData.orderNumber || `PO-${new Date().getTime()}`,
    orderDate: initialData.orderDate || new Date(),
    deliveryDate: initialData.deliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    projectId: initialData.projectId || '',
    projectName: initialData.projectName || '',
    vendorId: initialData.vendorId || '',
    vendorName: initialData.vendorName || '',
    vendorEmail: initialData.vendorEmail || '',
    items: initialData.items || [{ 
      itemName: '', 
      specification: '', 
      unit: 'EA',
      quantity: 1, 
      unitPrice: 0, 
      totalAmount: 0,
      majorCategory: '',
      middleCategory: '',
      minorCategory: '',
      notes: ''
    }],
    notes: initialData.notes || '',
    totalAmount: initialData.totalAmount || 0
  });

  // 프로젝트 목록 조회
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      console.log('🔍 프로젝트 목록 조회 시작');
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('프로젝트 목록 조회 실패');
      }
      const data = await response.json();
      console.log('✅ 프로젝트 목록 조회 성공:', data.length, '개');
      return data;
    }
  });

  // 거래처 목록 조회
  const { data: vendors, isLoading: vendorsLoading, error: vendorsError } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      console.log('🔍 거래처 목록 조회 시작');
      const response = await fetch('/api/vendors');
      if (!response.ok) {
        throw new Error('거래처 목록 조회 실패');
      }
      const data = await response.json();
      console.log('✅ 거래처 목록 조회 성공:', data.length, '개');
      return data;
    }
  });

  // 카테고리 목록 조회
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      console.log('🔍 카테고리 목록 조회 시작');
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('카테고리 목록 조회 실패');
      }
      const data = await response.json();
      console.log('✅ 카테고리 목록 조회 성공:', data.categories?.length, '개');
      return data;
    }
  });

  // 폼 데이터 변경 시 상위 컴포넌트에 전달
  useEffect(() => {
    onChange(formData);
  }, [formData]);

  // 총액 계산
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    setFormData(prev => ({ ...prev, totalAmount: total }));
  }, [formData.items]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProjectChange = (projectId: string) => {
    const project = projects?.find((p: any) => p.id.toString() === projectId);
    if (project) {
      setFormData(prev => ({
        ...prev,
        projectId,
        projectName: project.projectName
      }));
    }
  };

  const handleVendorChange = (vendorId: string) => {
    const vendor = vendors?.find((v: any) => v.id.toString() === vendorId);
    if (vendor) {
      setFormData(prev => ({
        ...prev,
        vendorId,
        vendorName: vendor.name,
        vendorEmail: vendor.email || ''
      }));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // 금액 자동 계산
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalAmount = newItems[index].quantity * newItems[index].unitPrice;
    }
    
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { 
        itemName: '', 
        specification: '', 
        unit: 'EA',
        quantity: 1, 
        unitPrice: 0, 
        totalAmount: 0,
        majorCategory: '',
        middleCategory: '',
        minorCategory: '',
        notes: ''
      }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  // 카테고리 관련 헬퍼 함수들
  const getMajorCategories = () => {
    return categories?.categories?.filter((cat: any) => cat.categoryType === 'major') || [];
  };

  const getMiddleCategories = (majorCategoryName: string) => {
    const majorCategory = categories?.categories?.find((cat: any) => 
      cat.categoryType === 'major' && cat.categoryName === majorCategoryName
    );
    return majorCategory?.children?.filter((cat: any) => cat.categoryType === 'middle') || [];
  };

  const getMinorCategories = (middleCategoryName: string) => {
    const allMiddleCategories = categories?.categories?.flatMap((major: any) => major.children) || [];
    const middleCategory = allMiddleCategories.find((cat: any) => 
      cat.categoryType === 'middle' && cat.categoryName === middleCategoryName
    );
    return middleCategory?.children?.filter((cat: any) => cat.categoryType === 'minor') || [];
  };

  const handleCategoryChange = (index: number, categoryType: 'major' | 'middle' | 'minor', categoryId: string) => {
    const newItems = [...formData.items];
    const item = newItems[index];
    
    if (categoryType === 'major') {
      const category = getMajorCategories().find((cat: any) => cat.id.toString() === categoryId);
      item.majorCategory = category?.categoryName || '';
      item.middleCategory = ''; // 대분류 변경 시 중분류, 소분류 초기화
      item.minorCategory = '';
    } else if (categoryType === 'middle') {
      const category = getMiddleCategories(item.majorCategory).find((cat: any) => cat.id.toString() === categoryId);
      item.middleCategory = category?.categoryName || '';
      item.minorCategory = ''; // 중분류 변경 시 소분류 초기화
    } else if (categoryType === 'minor') {
      const category = getMinorCategories(item.middleCategory).find((cat: any) => cat.id.toString() === categoryId);
      item.minorCategory = category?.categoryName || '';
    }
    
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">기본 정보</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="orderNumber">발주번호</Label>
            <Input
              id="orderNumber"
              value={formData.orderNumber}
              onChange={(e) => handleFieldChange('orderNumber', e.target.value)}
              placeholder="PO-20240101-001"
            />
          </div>
          
          <div className="space-y-2">
            <Label>발주일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.orderDate, 'PPP', { locale: ko })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.orderDate}
                  onSelect={(date) => date && handleFieldChange('orderDate', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>현장</Label>
            <Select value={formData.projectId} onValueChange={handleProjectChange}>
              <SelectTrigger>
                <SelectValue placeholder={
                  projectsLoading ? "로딩 중..." : 
                  projectsError ? "로딩 실패" : 
                  "현장 선택"
                } />
              </SelectTrigger>
              <SelectContent>
                {projectsLoading && (
                  <SelectItem value="loading" disabled>로딩 중...</SelectItem>
                )}
                {projectsError && (
                  <SelectItem value="error" disabled>데이터 로딩 실패</SelectItem>
                )}
                {projects?.map((project: any) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>납기일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.deliveryDate, 'PPP', { locale: ko })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.deliveryDate}
                  onSelect={(date) => date && handleFieldChange('deliveryDate', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* 거래처 정보 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">거래처 정보</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>거래처</Label>
            <Select value={formData.vendorId} onValueChange={handleVendorChange}>
              <SelectTrigger>
                <SelectValue placeholder={
                  vendorsLoading ? "로딩 중..." : 
                  vendorsError ? "로딩 실패" : 
                  "거래처 선택"
                } />
              </SelectTrigger>
              <SelectContent>
                {vendorsLoading && (
                  <SelectItem value="loading" disabled>로딩 중...</SelectItem>
                )}
                {vendorsError && (
                  <SelectItem value="error" disabled>데이터 로딩 실패</SelectItem>
                )}
                {vendors?.map((vendor: any) => (
                  <SelectItem key={vendor.id} value={vendor.id.toString()}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="vendorEmail">이메일</Label>
            <Input
              id="vendorEmail"
              type="email"
              value={formData.vendorEmail}
              onChange={(e) => handleFieldChange('vendorEmail', e.target.value)}
              placeholder="vendor@example.com"
            />
          </div>
        </div>
      </div>

      {/* 품목 정보 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">품목 정보</h3>
          <Button onClick={addItem} size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            품목 추가
          </Button>
        </div>
        
        <div className="space-y-4">
          {formData.items.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              {/* 품목 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>품목명</Label>
                  <Input
                    value={item.itemName}
                    onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                    placeholder="품목명을 입력하세요"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>규격</Label>
                  <Input
                    value={item.specification}
                    onChange={(e) => handleItemChange(index, 'specification', e.target.value)}
                    placeholder="규격을 입력하세요"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>단위</Label>
                  <Select value={item.unit} onValueChange={(value) => handleItemChange(index, 'unit', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="단위 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EA">EA</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="M2">M²</SelectItem>
                      <SelectItem value="M3">M³</SelectItem>
                      <SelectItem value="KG">KG</SelectItem>
                      <SelectItem value="TON">TON</SelectItem>
                      <SelectItem value="SET">SET</SelectItem>
                      <SelectItem value="BOX">BOX</SelectItem>
                      <SelectItem value="ROLL">ROLL</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 카테고리 선택 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>대분류</Label>
                  <Select 
                    value={item.majorCategory ? getMajorCategories().find(cat => cat.categoryName === item.majorCategory)?.id.toString() : ''}
                    onValueChange={(value) => handleCategoryChange(index, 'major', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        categoriesLoading ? "로딩 중..." : 
                        categoriesError ? "로딩 실패" : 
                        "대분류 선택"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesLoading && (
                        <SelectItem value="loading" disabled>로딩 중...</SelectItem>
                      )}
                      {categoriesError && (
                        <SelectItem value="error" disabled>데이터 로딩 실패</SelectItem>
                      )}
                      {getMajorCategories().map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>중분류</Label>
                  <Select 
                    value={item.middleCategory ? getMiddleCategories(item.majorCategory).find(cat => cat.categoryName === item.middleCategory)?.id.toString() : ''}
                    onValueChange={(value) => handleCategoryChange(index, 'middle', value)}
                    disabled={!item.majorCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!item.majorCategory ? "대분류를 먼저 선택하세요" : "중분류 선택"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getMiddleCategories(item.majorCategory).map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>소분류</Label>
                  <Select 
                    value={item.minorCategory ? getMinorCategories(item.middleCategory).find(cat => cat.categoryName === item.minorCategory)?.id.toString() : ''}
                    onValueChange={(value) => handleCategoryChange(index, 'minor', value)}
                    disabled={!item.middleCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!item.middleCategory ? "중분류를 먼저 선택하세요" : "소분류 선택"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getMinorCategories(item.middleCategory).map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 수량, 단가, 금액 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>수량</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                    min="1"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>단가</Label>
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>금액</Label>
                  <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm font-medium">
                    {item.totalAmount.toLocaleString()}원
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>작업</Label>
                  <Button
                    onClick={() => removeItem(index)}
                    size="sm"
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    disabled={formData.items.length === 1}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                </div>
              </div>

              {/* 품목별 비고 */}
              <div className="space-y-2">
                <Label>품목 비고</Label>
                <Textarea
                  value={item.notes}
                  onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                  placeholder="이 품목에 대한 특별 요청사항이나 참고사항을 입력하세요"
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold">
            총액: {formData.totalAmount.toLocaleString()}원
          </div>
        </div>
      </div>

      {/* 비고 */}
      <div className="space-y-2">
        <Label htmlFor="notes">비고</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          placeholder="추가 요청사항이나 특이사항을 입력하세요"
          rows={3}
        />
      </div>
    </div>
  );
};

export default DirectInputForm;