/**
 * TOSS Design System Components
 * Ultra-high density UI components inspired by Korean fintech design
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// ================================
// Card Components
// ================================

interface TossCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'compact' | 'ultra-compact';
  hoverable?: boolean;
}

export const TossCard = React.forwardRef<HTMLDivElement, TossCardProps>(
  ({ className, variant = 'default', hoverable = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded border border-gray-200 transition-all',
          variant === 'default' && 'p-3',
          variant === 'compact' && 'p-2',
          variant === 'ultra-compact' && 'p-1.5',
          hoverable && 'hover:shadow-sm cursor-pointer',
          className
        )}
        {...props}
      />
    );
  }
);
TossCard.displayName = 'TossCard';

// ================================
// KPI Widget Component
// ================================

interface TossKPIProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  value: string | number;
  label: string;
  onClick?: () => void;
  trend?: {
    direction: 'up' | 'down';
    value: string;
  };
}

export const TossKPI: React.FC<TossKPIProps> = ({
  icon: Icon,
  iconColor,
  iconBg,
  value,
  label,
  onClick,
  trend
}) => {
  return (
    <div
      className="bg-white rounded border border-gray-200 p-2 hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className={`w-6 h-6 ${iconBg} rounded-full flex items-center justify-center`}>
          <Icon className={`h-3 w-3 ${iconColor}`} />
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
          {trend && (
            <div className={`text-xs ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ================================
// List Item Component
// ================================

interface TossListItemProps {
  title: string;
  subtitle?: string;
  value?: string | React.ReactNode;
  onClick?: () => void;
  index?: number;
  icon?: LucideIcon;
}

export const TossListItem: React.FC<TossListItemProps> = ({
  title,
  subtitle,
  value,
  onClick,
  index,
  icon: Icon
}) => {
  return (
    <div
      className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {index !== undefined && (
          <span className="text-xs font-medium text-gray-600 w-4 text-center">{index}</span>
        )}
        {Icon && <Icon className="h-3 w-3 text-gray-400" />}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-gray-900 truncate" title={title}>
            {title}
          </div>
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </div>
      </div>
      {value && (
        <div className="text-right">
          {typeof value === 'string' ? (
            <div className="text-xs font-semibold text-blue-600">{value}</div>
          ) : (
            value
          )}
        </div>
      )}
    </div>
  );
};

// ================================
// Chart Container Component
// ================================

interface TossChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: LucideIcon;
  height?: 'small' | 'medium' | 'large';
  action?: React.ReactNode;
}

export const TossChartContainer: React.FC<TossChartContainerProps> = ({
  title,
  icon: Icon,
  height = 'small',
  action,
  children,
  className,
  ...props
}) => {
  const heightClass = {
    small: 'h-[140px]',
    medium: 'h-[200px]',
    large: 'h-[280px]'
  }[height];

  return (
    <div className={cn('bg-white rounded border border-gray-200 p-2', className)} {...props}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          {Icon && <Icon className="h-3 w-3 text-gray-600" />}
          <h3 className="text-xs font-semibold text-gray-900">{title}</h3>
        </div>
        {action}
      </div>
      <div className={cn('w-full', heightClass)}>{children}</div>
    </div>
  );
};

// ================================
// Section Header Component
// ================================

interface TossSectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const TossSectionHeader: React.FC<TossSectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className
}) => {
  return (
    <div className={cn('flex items-center justify-between mb-2', className)}>
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
};

// ================================
// Badge Component
// ================================

interface TossBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'pending' | 'approved' | 'sent' | 'completed' | 'rejected';
  size?: 'xs' | 'sm';
}

export const TossBadge: React.FC<TossBadgeProps> = ({
  variant = 'default',
  size = 'xs',
  className,
  children,
  ...props
}) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    sent: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-purple-100 text-purple-800 border-purple-200',
    rejected: 'bg-red-100 text-red-800 border-red-200'
  };

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-1'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// ================================
// Empty State Component
// ================================

interface TossEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const TossEmptyState: React.FC<TossEmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="h-8 w-8 text-gray-300 mb-2" />
      <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-500 mb-3">{description}</p>}
      {action}
    </div>
  );
};

// ================================
// Loading Skeleton Component
// ================================

interface TossSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
  width?: string;
  height?: string;
}

export const TossSkeleton: React.FC<TossSkeletonProps> = ({
  variant = 'rect',
  width,
  height,
  className,
  ...props
}) => {
  const variantClasses = {
    text: 'h-3 rounded',
    rect: 'rounded',
    circle: 'rounded-full'
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200',
        variantClasses[variant],
        className
      )}
      style={{ width, height }}
      {...props}
    />
  );
};

// ================================
// Compact Table Component
// ================================

interface TossTableProps extends React.HTMLAttributes<HTMLTableElement> {
  size?: 'xs' | 'sm' | 'md';
}

export const TossTable: React.FC<TossTableProps> = ({
  size = 'sm',
  className,
  children,
  ...props
}) => {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm'
  };

  return (
    <table
      className={cn(
        'w-full border-collapse',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </table>
  );
};

interface TossTableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TossTableHeader: React.FC<TossTableHeaderProps> = ({
  className,
  ...props
}) => {
  return (
    <thead className={cn('bg-gray-50', className)} {...props} />
  );
};

interface TossTableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TossTableBody: React.FC<TossTableBodyProps> = ({
  className,
  ...props
}) => {
  return (
    <tbody className={cn('divide-y divide-gray-100', className)} {...props} />
  );
};

interface TossTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
}

export const TossTableRow: React.FC<TossTableRowProps> = ({
  hoverable = true,
  className,
  ...props
}) => {
  return (
    <tr
      className={cn(
        hoverable && 'hover:bg-gray-50 transition-colors',
        className
      )}
      {...props}
    />
  );
};

interface TossTableCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  as?: 'td' | 'th';
}

export const TossTableCell: React.FC<TossTableCellProps> = ({
  as: Component = 'td',
  className,
  ...props
}) => {
  const baseClasses = Component === 'th' 
    ? 'px-2 py-1.5 text-left font-medium text-gray-600 uppercase tracking-wider'
    : 'px-2 py-2 text-gray-900';

  return (
    <Component
      className={cn(baseClasses, className)}
      {...props}
    />
  );
};