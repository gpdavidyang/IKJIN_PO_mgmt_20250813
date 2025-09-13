import { useState } from 'react';

export interface ReportFilters {
  year: string;
  startDate: string;
  endDate: string;
  vendorId: string;
  status: string;
  templateId: string;
  amountRange: string;
  userId: string;
  search: string;
  month: string;
  projectId: string;
  emailStatus: string;
  recipientEmail: string;
  orderNumber: string;
}

export interface CategoryFilters {
  majorCategory: string;
  middleCategory: string;
  minorCategory: string;
}

export const useReportFilters = () => {
  // 필터 상태
  const [filters, setFilters] = useState<ReportFilters>({
    year: 'all',
    startDate: '',
    endDate: '',
    vendorId: 'all',
    status: 'all',
    templateId: 'all',
    amountRange: 'all',
    userId: 'all',
    search: '',
    month: 'all',
    projectId: 'all',
    emailStatus: 'all',
    recipientEmail: '',
    orderNumber: ''
  });

  const [activeFilters, setActiveFilters] = useState<ReportFilters | null>(null);

  // 계층적 카테고리 필터 상태
  const [categoryFilters, setCategoryFilters] = useState<CategoryFilters>({
    majorCategory: 'all',
    middleCategory: 'all',
    minorCategory: 'all'
  });

  // 카테고리 타입 상태
  const [categoryType, setCategoryType] = useState<'major' | 'middle' | 'minor'>('major');

  return {
    filters,
    setFilters,
    activeFilters,
    setActiveFilters,
    categoryFilters,
    setCategoryFilters,
    categoryType,
    setCategoryType
  };
};