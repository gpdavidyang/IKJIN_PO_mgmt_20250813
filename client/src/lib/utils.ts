import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₩0';
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatKoreanWon(amount: number | string | null): string {
  if (!amount || amount === null) return '₩0';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
  if (isNaN(num)) return '₩0';
  
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// Parse Korean Won formatted string back to number
export function parseKoreanWon(formattedAmount: string): number {
  if (!formattedAmount) return 0;
  const num = parseFloat(formattedAmount.replace(/[^\d.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

// Format number with thousand separators (no currency symbol)
export function formatNumber(amount: number | string | null): string {
  if (!amount || amount === null) return '0';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('ko-KR').format(num);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// Common table actions for standardized UI
export const commonTableActions = {
  view: (onClick: (row: any) => void) => ({
    label: '보기',
    icon: 'Eye',
    onClick,
    variant: 'ghost' as const
  }),
  edit: (onClick: (row: any) => void) => ({
    label: '수정',
    icon: 'Edit',
    onClick,
    variant: 'ghost' as const
  }),
  delete: (onClick: (row: any) => void) => ({
    label: '삭제',
    icon: 'Trash2',
    onClick,
    variant: 'ghost' as const,
    destructive: true
  })
};
