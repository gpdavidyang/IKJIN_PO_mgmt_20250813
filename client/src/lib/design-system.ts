/**
 * Design System Utilities
 * Centralized utilities for the enterprise design system
 */

// Status color mappings
export const statusColors = {
  draft: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-200",
  },
  pending: {
    bg: "bg-warning-100",
    text: "text-warning-800",
    border: "border-warning-200",
  },
  approved: {
    bg: "bg-success-100",
    text: "text-success-800",
    border: "border-success-200",
  },
  sent: {
    bg: "bg-primary-100",
    text: "text-primary-800",
    border: "border-primary-200",
  },
  completed: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-200",
  },
  rejected: {
    bg: "bg-error-100",
    text: "text-error-800",
    border: "border-error-200",
  },
};

// Filter tag colors
export const filterTagColors = {
  project: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-200",
  },
  amount: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  date: {
    bg: "bg-primary-100",
    text: "text-primary-800",
    border: "border-primary-200",
  },
  vendor: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-200",
  },
};

// Common shadow classes
export const shadows = {
  xs: "shadow-xs",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  "2xl": "shadow-2xl",
  inner: "shadow-inner",
  none: "shadow-none",
};

// Common spacing patterns
export const spacing = {
  page: "p-6 space-y-6",
  card: "p-4",
  section: "space-y-6",
  formFields: "space-y-4",
  inline: "space-x-2",
};

// Typography helpers
export const typography = {
  h1: "text-3xl font-bold tracking-tight text-gray-900",
  h2: "text-2xl font-semibold tracking-tight text-gray-900",
  h3: "text-xl font-semibold text-gray-900",
  h4: "text-lg font-semibold text-gray-900",
  body: "text-base text-gray-700 leading-relaxed",
  small: "text-sm text-gray-600",
  caption: "text-xs text-gray-500",
  lead: "text-lg text-gray-700 leading-relaxed",
  muted: "text-sm text-gray-500",
  label: "text-sm font-medium text-gray-700",
};

// Get status badge classes
export function getStatusBadgeClasses(status: string): string {
  const colors = statusColors[status as keyof typeof statusColors] || statusColors.draft;
  return `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text} ${colors.border} border`;
}

// Get filter tag classes
export function getFilterTagClasses(type: string): string {
  const colors = filterTagColors[type as keyof typeof filterTagColors] || filterTagColors.project;
  return `inline-flex items-center px-3 py-1 rounded-full text-sm ${colors.bg} ${colors.text} ${colors.border} border`;
}

// Format amount with proper styling
export function formatStyledAmount(amount: number | string): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "₩0";
  return `₩${numAmount.toLocaleString("ko-KR")}`;
}

// Get card hover classes
export function getCardHoverClasses(): string {
  return "transition-shadow duration-200 hover:shadow-md";
}

// Get input field active state classes
export function getInputActiveClasses(hasValue: boolean): string {
  return hasValue ? "border-primary-500 bg-primary-50" : "";
}