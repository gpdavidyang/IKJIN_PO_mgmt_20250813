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
    items: initialData.items || [{ itemName: '', specification: '', quantity: 1, unitPrice: 0, totalAmount: 0 }],
    notes: initialData.notes || '',
    totalAmount: initialData.totalAmount || 0
  });

  // 프로젝트 목록 조회
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      return response.json();
    }
  });

  // 거래처 목록 조회
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await fetch('/api/vendors');
      return response.json();
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
    const project = projects?.find((p: any) => p.id === projectId);
    if (project) {
      setFormData(prev => ({
        ...prev,
        projectId,
        projectName: project.name
      }));
    }
  };

  const handleVendorChange = (vendorId: string) => {
    const vendor = vendors?.find((v: any) => v.id === vendorId);
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
      items: [...prev.items, { itemName: '', specification: '', quantity: 1, unitPrice: 0, totalAmount: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: newItems }));
    }
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
            <Label>프로젝트</Label>
            <Select value={formData.projectId} onValueChange={handleProjectChange}>
              <SelectTrigger>
                <SelectValue placeholder="프로젝트 선택" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project: any) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
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
                <SelectValue placeholder="거래처 선택" />
              </SelectTrigger>
              <SelectContent>
                {vendors?.map((vendor: any) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
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
        
        <div className="space-y-3">
          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 border rounded-lg">
              <div className="col-span-3 space-y-2">
                <Label>품목명</Label>
                <Input
                  value={item.itemName}
                  onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                  placeholder="품목명"
                />
              </div>
              
              <div className="col-span-3 space-y-2">
                <Label>규격</Label>
                <Input
                  value={item.specification}
                  onChange={(e) => handleItemChange(index, 'specification', e.target.value)}
                  placeholder="규격"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>수량</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                  min="1"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>단가</Label>
                <Input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                  min="0"
                />
              </div>
              
              <div className="col-span-1 space-y-2">
                <Label>금액</Label>
                <div className="text-sm font-medium py-2">
                  {item.totalAmount.toLocaleString()}원
                </div>
              </div>
              
              <div className="col-span-1">
                <Button
                  onClick={() => removeItem(index)}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  disabled={formData.items.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
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