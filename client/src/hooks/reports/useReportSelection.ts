import { useState } from 'react';

export const useReportSelection = () => {
  // 선택된 항목 상태 (발주 내역용)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  
  // 선택된 항목 상태 (분류별 보고서용)
  const [selectedCategoryItems, setSelectedCategoryItems] = useState<Set<string>>(new Set());
  
  // 선택된 항목 상태 (현장별 보고서용)
  const [selectedProjectItems, setSelectedProjectItems] = useState<Set<number>>(new Set());
  
  // 선택된 항목 상태 (거래처별 보고서용)
  const [selectedVendorItems, setSelectedVendorItems] = useState<Set<number>>(new Set());

  // 체크박스 관련 함수들
  const handleSelectAll = (checked: boolean, orders: any[]) => {
    if (checked) {
      const allIds = new Set(orders.map(order => order.id));
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (orderId: number, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedItems(newSelected);
  };

  const isAllSelected = (orders: any[]) => {
    return orders.length > 0 && orders.every(order => selectedItems.has(order.id));
  };

  const isIndeterminate = (orders: any[]) => {
    const selectedCount = orders.filter(order => selectedItems.has(order.id)).length;
    return selectedCount > 0 && selectedCount < orders.length;
  };

  return {
    selectedItems,
    setSelectedItems,
    selectedCategoryItems,
    setSelectedCategoryItems,
    selectedProjectItems,
    setSelectedProjectItems,
    selectedVendorItems,
    setSelectedVendorItems,
    handleSelectAll,
    handleSelectItem,
    isAllSelected,
    isIndeterminate
  };
};