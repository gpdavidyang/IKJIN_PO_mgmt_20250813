// Currency formatting utility for Korean Won
export const formatKoreanWon = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '₩0';
  return `₩${numAmount.toLocaleString('ko-KR')}`;
};

// Text truncation utility with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Order number abbreviation utility
export const abbreviateOrderNumber = (orderNumber: string): string => {
  // PO-2025-0612-001 → PO-0612-001
  if (orderNumber.startsWith('PO-') && orderNumber.length > 10) {
    const parts = orderNumber.split('-');
    if (parts.length >= 4) {
      return `${parts[0]}-${parts[2]}-${parts[3]}`;
    }
  }
  return orderNumber;
};

// Date formatting utility
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Date range formatting utility
export const formatDateRange = (startDate?: string, endDate?: string): string => {
  if (!startDate && !endDate) return '';
  if (startDate && endDate) {
    return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
  }
  if (startDate) return `${formatDate(startDate)} 이후`;
  if (endDate) return `${formatDate(endDate)} 이전`;
  return '';
};

// Status badge color utility
export const getStatusColor = (status: string, statusList: any[]): string => {
  const statusObj = statusList?.find((s: any) => s.code === status);
  if (statusObj) {
    switch (statusObj.color) {
      case "gray":
        return "bg-gray-100 text-gray-800";
      case "yellow":
        return "bg-yellow-100 text-yellow-800";
      case "blue":
        return "bg-blue-100 text-blue-800";
      case "green":
        return "bg-green-100 text-green-800";
      case "purple":
        return "bg-purple-100 text-purple-800";
      case "red":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }
  return "bg-gray-100 text-gray-800";
};

// Status text utility
export const getStatusText = (status: string, statusList: any[]): string => {
  const statusObj = statusList?.find((s: any) => s.code === status);
  return statusObj ? statusObj.name : status;
};