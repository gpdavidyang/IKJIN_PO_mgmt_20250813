import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Trash2, Copy, PlusCircle, Package, Building, Check, ChevronsUpDown } from "lucide-react";
import { formatKoreanWon, removeCommas, calculateItemPrice } from "@/lib/order-utils";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { PurchaseItem, Vendor } from "@shared/order-types";

interface ItemsTableProps {
  items: PurchaseItem[];
  onItemChange: (index: number, field: keyof PurchaseItem, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onCopyItem: (index: number) => void;
  vendors: any[];
}

// 품목명 콤보박스 컴포넌트
function ItemNameCombobox({ 
  value, 
  onChange, 
  placeholder = "품목명을 입력하세요" 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string; 
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // 품목 데이터 조회
  const { data: itemsData } = useQuery({
    queryKey: ['/api/items'],
    enabled: true
  });

  const items = itemsData?.items || [];

  const filteredItems = Array.isArray(items) ? items.filter((item: any) =>
    item.name && item.name.toLowerCase().includes(inputValue.toLowerCase())
  ) : [];

  const handleSelect = (itemName: string) => {
    setInputValue(itemName);
    onChange(itemName);
    setOpen(false);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    onChange(value);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className="h-8 text-sm pr-8"
            onFocus={() => setOpen(true)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-8 w-8 p-0 hover:bg-transparent"
            onClick={() => setOpen(!open)}
          >
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="품목명 검색..." 
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandEmpty>
            <div className="p-2 text-sm text-gray-500">
              검색 결과가 없습니다. 직접 입력하시면 새 품목으로 추가됩니다.
            </div>
          </CommandEmpty>
          <CommandGroup className="max-h-48 overflow-auto">
            {filteredItems.map((item: any) => (
              <CommandItem
                key={item.id}
                value={item.name}
                onSelect={() => handleSelect(item.name)}
                className="flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-gray-500">{item.category}</span>
                </div>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    inputValue === item.name ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ItemsTable({ 
  items, 
  onItemChange, 
  onAddItem, 
  onRemoveItem, 
  onCopyItem,
  vendors 
}: ItemsTableProps) {
  const totalAmount = items.reduce((total, item) => total + (item.price || 0), 0);

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: string) => {
    if (field === "quantity" || field === "unitPrice") {
      // Auto-calculate price when quantity or unit price changes
      const newItems = [...items];
      const cleanValue = removeCommas(value);
      newItems[index] = { ...newItems[index], [field]: cleanValue };
      
      const price = calculateItemPrice(
        field === "quantity" ? cleanValue : newItems[index].quantity,
        field === "unitPrice" ? cleanValue : newItems[index].unitPrice
      );
      newItems[index].price = price;
      
      onItemChange(index, field, cleanValue);
    } else {
      onItemChange(index, field, value);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div />
        <Button onClick={onAddItem} variant="outline" size="sm" className="gap-2 h-8 px-3 text-sm bg-transparent">
          <PlusCircle className="w-3 h-3" />
          품목 추가
        </Button>
      </div>
      
      {items.map((item, index) => (
        <div key={index} className="border rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-xs font-medium text-gray-700">품목 #{index + 1}</h4>
            <div className="flex gap-1 -space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCopyItem(index)}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                title="품목 복사"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemoveItem(index)}
                disabled={items.length === 1}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50 disabled:opacity-50"
                title="품목 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 분류 정보 */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-700 border-b pb-1 flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-blue-600" />
                분류 정보
              </h5>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-600">대분류</Label>
                  <Select
                    value={item.category}
                    onValueChange={(value) => handleItemChange(index, "category", value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.원자재">1.원자재</SelectItem>
                      <SelectItem value="2.부자재">2.부자재</SelectItem>
                      <SelectItem value="3.시공노무비">3.시공노무비</SelectItem>
                      <SelectItem value="4.장비비">4.장비비</SelectItem>
                      <SelectItem value="5.운반비">5.운반비</SelectItem>
                      <SelectItem value="6.안전관리비">6.안전관리비</SelectItem>
                      <SelectItem value="7.폐기물처리비">7.폐기물처리비</SelectItem>
                      <SelectItem value="8.현장관리비">8.현장관리비</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">중분류</Label>
                  <Select
                    value={item.subCategory1}
                    onValueChange={(value) => handleItemChange(index, "subCategory1", value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALUM.SHEET">ALUM.SHEET</SelectItem>
                      <SelectItem value="ALUM.창호">ALUM.창호</SelectItem>
                      <SelectItem value="판넬">판넬</SelectItem>
                      <SelectItem value="창호">창호</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                      <SelectItem value="창호,판넬">창호,판넬</SelectItem>
                      <SelectItem value="조립비">조립비</SelectItem>
                      <SelectItem value="유리">유리</SelectItem>
                      <SelectItem value="장비비">장비비</SelectItem>
                      <SelectItem value="신호수 외">신호수 외</SelectItem>
                      <SelectItem value="안전장비">안전장비</SelectItem>
                      <SelectItem value="건강검진">건강검진</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">소분류</Label>
                  <Select
                    value={item.subCategory2}
                    onValueChange={(value) => handleItemChange(index, "subCategory2", value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="원자재">원자재</SelectItem>
                      <SelectItem value="가공">가공</SelectItem>
                      <SelectItem value="도장">도장</SelectItem>
                      <SelectItem value="압출">압출</SelectItem>
                      <SelectItem value="단열">단열</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 품목 및 수량 */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-700 border-b pb-1 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                품목 및 수량
              </h5>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-600">품목명</Label>
                  <ItemNameCombobox
                    value={item.name}
                    onChange={(value) => handleItemChange(index, "name", value)}
                    placeholder="품목명을 선택하거나 입력하세요"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">수량</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                    placeholder="수량"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">단위</Label>
                  <Select
                    value={item.unit}
                    onValueChange={(value) => handleItemChange(index, "unit", value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="단위" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EA">EA</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="SET">SET</SelectItem>
                      <SelectItem value="KG">KG</SelectItem>
                      <SelectItem value="TON">TON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">단가</Label>
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                    placeholder="단가"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">금액</Label>
                  <div className="h-8 px-3 py-1 text-sm font-semibold text-blue-600 bg-gray-50 border rounded-md flex items-center">
                    {formatKoreanWon(item.price || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* 거래처 및 납품 정보 */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-700 border-b pb-1 flex items-center gap-2">
                <Building className="h-4 w-4 text-blue-600" />
                거래처 및 납품 정보
              </h5>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-600">거래처</Label>
                  <Select
                    value={item.vendorId?.toString()}
                    onValueChange={(value) => handleItemChange(index, "vendorId", value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="거래처 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">납품장소</Label>
                  <Input
                    value={item.deliveryLocation || ""}
                    onChange={(e) => handleItemChange(index, "deliveryLocation", e.target.value)}
                    placeholder="납품장소"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* 총 금액 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-900">총 금액</span>
          <span className="text-lg font-bold text-blue-600">
            {formatKoreanWon(items.reduce((sum, item) => sum + (item.price || 0), 0))}
          </span>
        </div>
      </div>
    </div>
  );
}