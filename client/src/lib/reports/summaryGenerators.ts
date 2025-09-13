// 보고서 요약 생성 유틸리티 함수들

// 상태를 한국어로 변환
const getStatusKorean = (status: string) => {
  switch (status) {
    case 'draft': return '임시 저장';
    case 'pending': return '승인 대기';
    case 'approved': return '승인 완료';
    case 'sent': return '발주완료';
    case 'completed': return '발주 완료';
    case 'rejected': return '반려';
    default: return status;
  }
};

// 발주 보고서 자동 요약 생성
export const generateAutoSummary = (orders: any[]) => {
  if (orders.length === 0) return '';
  
  const totalAmount = orders.reduce((sum, order) => {
    const amount = parseFloat(order.totalAmount) || 0;
    return sum + amount;
  }, 0);
  const avgAmount = totalAmount / orders.length;
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topVendors = Object.entries(
    orders.reduce((acc, order) => {
      const vendorName = order.vendor?.name || '알 수 없음';
      acc[vendorName] = (acc[vendorName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([,a], [,b]) => (b as number) - (a as number)).slice(0, 3);

  return `총 ${orders.length}건의 발주 데이터를 분석한 결과:
• 총 발주 금액: ₩${Math.floor(totalAmount).toLocaleString()}
• 평균 발주 금액: ₩${Math.floor(avgAmount).toLocaleString()}
• 주요 거래처: ${topVendors.map(([name, count]) => `${name}(${count}건)`).join(', ')}
• 상태 분포: ${Object.entries(statusCounts).map(([status, count]) => `${getStatusKorean(status)}(${count}건)`).join(', ')}`;
};

// 분류별 보고서 요약 생성
export const generateCategorySummary = (categories: any[]) => {
  if (categories.length === 0) return '';
  
  const totalAmount = categories.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);
  const totalItems = categories.reduce((sum, item) => sum + (parseInt(item.itemCount) || 0), 0);
  const totalOrders = categories.reduce((sum, item) => sum + (parseInt(item.orderCount) || 0), 0);
  
  const topCategory = categories.reduce((max, item) => 
    (parseFloat(item.totalAmount) || 0) > (parseFloat(max.totalAmount) || 0) ? item : max);
    
  return `총 ${categories.length}개 분류 분석 결과:
• 총 발주 금액: ₩${Math.floor(totalAmount).toLocaleString()}
• 총 품목 수: ${totalItems.toLocaleString()}개
• 총 발주 수: ${totalOrders.toLocaleString()}건
• 최대 금액 분류: ${topCategory.category} (₩${Math.floor(topCategory.totalAmount).toLocaleString()})`;
};

// 현장별 보고서 요약 생성
export const generateProjectSummary = (projects: any[]) => {
  if (projects.length === 0) return '';
  
  const totalAmount = projects.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);
  const totalVendors = projects.reduce((sum, item) => sum + (parseInt(item.vendorCount) || 0), 0);
  const totalOrders = projects.reduce((sum, item) => sum + (parseInt(item.orderCount) || 0), 0);
  
  const topProject = projects.reduce((max, item) => 
    (parseFloat(item.totalAmount) || 0) > (parseFloat(max.totalAmount) || 0) ? item : max);
    
  return `총 ${projects.length}개 현장 분석 결과:
• 총 발주 금액: ₩${Math.floor(totalAmount).toLocaleString()}
• 총 거래처 수: ${totalVendors.toLocaleString()}개
• 총 발주 수: ${totalOrders.toLocaleString()}건
• 최대 금액 현장: ${topProject.projectName} (₩${Math.floor(topProject.totalAmount).toLocaleString()})`;
};

// 거래처별 보고서 요약 생성
export const generateVendorSummary = (vendors: any[]) => {
  if (vendors.length === 0) return '';
  
  const totalAmount = vendors.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);
  const totalProjects = vendors.reduce((sum, item) => sum + (parseInt(item.projectCount) || 0), 0);
  const totalOrders = vendors.reduce((sum, item) => sum + (parseInt(item.orderCount) || 0), 0);
  
  const topVendor = vendors.reduce((max, item) => 
    (parseFloat(item.totalAmount) || 0) > (parseFloat(max.totalAmount) || 0) ? item : max);
    
  return `총 ${vendors.length}개 거래처 분석 결과:
• 총 발주 금액: ₩${Math.floor(totalAmount).toLocaleString()}
• 총 프로젝트 수: ${totalProjects.toLocaleString()}개
• 총 발주 수: ${totalOrders.toLocaleString()}건
• 최대 금액 거래처: ${topVendor.vendorName} (₩${Math.floor(topVendor.totalAmount).toLocaleString()})`;
};