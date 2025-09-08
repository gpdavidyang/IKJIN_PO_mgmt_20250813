import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Copy, Trash2 } from "lucide-react";

interface OrderItemLayout2RowsProps {
  item: any;
  index: number;
  isDarkMode: boolean;
  majorCategories: any[];
  getMiddleCategoriesForMajor: (major: string) => any[];
  getMinorCategoriesForMiddle: (middle: string) => any[];
  updateOrderItem: (index: number, field: string, value: any) => void;
  unitPriceDisplayValues: string[];
  setUnitPriceDisplayValues: (values: string[]) => void;
  formatCurrencyInput: (value: number) => string;
  parseCurrencyInput: (value: string) => number;
  formatKoreanWon: (value: number) => string;
  calculateTotalAmount: (item: any) => number;
  copyOrderItem: (index: number) => void;
  removeOrderItem: (index: number) => void;
  orderItemsLength: number;
}

export function OrderItemLayout2Rows({
  item,
  index,
  isDarkMode,
  majorCategories,
  getMiddleCategoriesForMajor,
  getMinorCategoriesForMiddle,
  updateOrderItem,
  unitPriceDisplayValues,
  setUnitPriceDisplayValues,
  formatCurrencyInput,
  parseCurrencyInput,
  formatKoreanWon,
  calculateTotalAmount,
  copyOrderItem,
  removeOrderItem,
  orderItemsLength
}: OrderItemLayout2RowsProps) {
  return (
    <div className={`p-4 rounded-lg border transition-colors ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
    }`}>
      {/* 첫 번째 행: 품목명, 규격, 비고 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <Label className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            품목명 *
          </Label>
          <Input
            className={`w-full transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
            placeholder="품목명을 입력하세요"
            value={item.itemName}
            onChange={(e) => updateOrderItem(index, "itemName", e.target.value)}
          />
        </div>
        <div>
          <Label className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            규격
          </Label>
          <Input
            className={`w-full transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
            placeholder="규격"
            value={item.specification}
            onChange={(e) => updateOrderItem(index, "specification", e.target.value)}
          />
        </div>
        <div>
          <Label className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            비고
          </Label>
          <Input
            className={`w-full transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
            placeholder="비고"
            value={item.notes}
            onChange={(e) => updateOrderItem(index, "notes", e.target.value)}
          />
        </div>
      </div>

      {/* 두 번째 행: 분류, 수량, 단가, 금액, 작업 버튼 */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
        {/* 대분류 */}
        <div>
          <Label className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            대분류
          </Label>
          <Select
            value={item.majorCategory}
            onValueChange={(value) => updateOrderItem(index, "majorCategory", value)}
          >
            <SelectTrigger className={`w-full transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
              <SelectValue placeholder="대분류 선택" />
            </SelectTrigger>
            <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
              {majorCategories?.map((category: any) => (
                <SelectItem key={category.id} value={category.categoryName}>
                  {category.categoryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* 중분류 */}
        <div>
          <Label className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            중분류
          </Label>
          <Select
            value={item.middleCategory}
            onValueChange={(value) => updateOrderItem(index, "middleCategory", value)}
            disabled={!item.majorCategory}
          >
            <SelectTrigger className={`w-full transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
              <SelectValue placeholder="중분류 선택" />
            </SelectTrigger>
            <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
              {getMiddleCategoriesForMajor(item.majorCategory)?.map((category: any) => (
                <SelectItem key={category.id} value={category.categoryName}>
                  {category.categoryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* 소분류 */}
        <div>
          <Label className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            소분류
          </Label>
          <Select
            value={item.minorCategory}
            onValueChange={(value) => updateOrderItem(index, "minorCategory", value)}
            disabled={!item.middleCategory}
          >
            <SelectTrigger className={`w-full transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
              <SelectValue placeholder="소분류 선택" />
            </SelectTrigger>
            <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
              {getMinorCategoriesForMiddle(item.middleCategory)?.map((category: any) => (
                <SelectItem key={category.id} value={category.categoryName}>
                  {category.categoryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* 수량 */}
        <div>
          <Label className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            수량 *
          </Label>
          <Input
            className={`w-full transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
            type="number"
            placeholder="수량"
            value={item.quantity || ""}
            onChange={(e) => updateOrderItem(index, "quantity", parseFloat(e.target.value) || 0)}
          />
        </div>
        
        {/* 단가 */}
        <div>
          <Label className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            단가 *
          </Label>
          <Input
            className={`w-full transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
            type="text"
            placeholder="₩0"
            value={unitPriceDisplayValues[index] || formatCurrencyInput(item.unitPrice)}
            onChange={(e) => {
              const newDisplayValues = [...unitPriceDisplayValues];
              newDisplayValues[index] = e.target.value;
              setUnitPriceDisplayValues(newDisplayValues);
              
              const numericValue = parseCurrencyInput(e.target.value);
              updateOrderItem(index, "unitPrice", numericValue);
            }}
            onBlur={(e) => {
              const numericValue = parseCurrencyInput(e.target.value);
              const formattedValue = formatCurrencyInput(numericValue);
              const newDisplayValues = [...unitPriceDisplayValues];
              newDisplayValues[index] = formattedValue;
              setUnitPriceDisplayValues(newDisplayValues);
            }}
          />
        </div>
        
        {/* 금액 */}
        <div>
          <Label className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            금액
          </Label>
          <Input
            className={`w-full transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
            readOnly
            value={formatKoreanWon(calculateTotalAmount(item))}
          />
        </div>
        
        {/* 작업 버튼 */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => copyOrderItem(index)}
            title="복사"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => removeOrderItem(index)}
            disabled={orderItemsLength === 1}
            title="삭제"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}