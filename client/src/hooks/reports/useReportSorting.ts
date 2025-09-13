import { useState } from 'react';
import { type SortConfig } from '@/lib/reports/sortingHelpers';

export const useReportSorting = () => {
  // 일반 정렬 상태
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  
  // 현장별 보고서 정렬 상태
  const [projectSortConfig, setProjectSortConfig] = useState<SortConfig | null>(null);
  
  // 거래처별 보고서 정렬 상태
  const [vendorSortConfig, setVendorSortConfig] = useState<SortConfig | null>(null);

  // 정렬 함수
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 현장별 보고서 정렬 함수
  const handleProjectSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (projectSortConfig && projectSortConfig.key === key && projectSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setProjectSortConfig({ key, direction });
  };

  // 거래처별 보고서 정렬 함수
  const handleVendorSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (vendorSortConfig && vendorSortConfig.key === key && vendorSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setVendorSortConfig({ key, direction });
  };

  return {
    sortConfig,
    setSortConfig,
    handleSort,
    projectSortConfig,
    setProjectSortConfig,
    handleProjectSort,
    vendorSortConfig,
    setVendorSortConfig,
    handleVendorSort
  };
};