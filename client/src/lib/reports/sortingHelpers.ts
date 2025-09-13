// 정렬 관련 유틸리티 함수들

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// 현장별 보고서 정렬된 데이터 가져오기
export const getSortedProjectData = (data: any[], sortConfig: SortConfig | null) => {
  if (!sortConfig || !data) return data;
  
  return [...data].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // 숫자 필드 처리
    if (['orderCount', 'vendorCount', 'totalAmount', 'averageOrderAmount'].includes(sortConfig.key)) {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }
    // 문자열 필드 처리 
    else if (['projectName', 'projectCode', 'projectStatus'].includes(sortConfig.key)) {
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
    }
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

// 거래처별 보고서 정렬된 데이터 가져오기
export const getSortedVendorData = (data: any[], sortConfig: SortConfig | null) => {
  if (!sortConfig || !data) return data;
  
  return [...data].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // 숫자 필드 처리
    if (['orderCount', 'projectCount', 'totalAmount', 'averageOrderAmount'].includes(sortConfig.key)) {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }
    // 문자열 필드 처리 
    else if (['vendorName', 'vendorCode', 'businessNumber'].includes(sortConfig.key)) {
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
    }
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

// 일반 발주 데이터 정렬
export const getSortedData = (data: any[], sortConfig: SortConfig | null) => {
  if (!sortConfig) return data;
  
  return [...data].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // 특별한 경우 처리
    if (sortConfig.key === 'vendor') {
      aValue = a.vendor?.name || '';
      bValue = b.vendor?.name || '';
    } else if (sortConfig.key === 'user') {
      aValue = a.user ? `${a.user.lastName || ''} ${a.user.firstName || ''}`.trim() : '';
      bValue = b.user ? `${b.user.lastName || ''} ${b.user.firstName || ''}`.trim() : '';
    } else if (sortConfig.key === 'orderDate') {
      aValue = new Date(aValue || 0);
      bValue = new Date(bValue || 0);
    } else if (sortConfig.key === 'totalAmount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};