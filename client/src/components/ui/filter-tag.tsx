import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

const filterTagVariants = cva(
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border select-none",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
        primary: "bg-primary-100 text-primary-800 border-primary-200 hover:bg-primary-200",
        success: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
        warning: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
        danger: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
        info: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
        outline: "bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50",
      },
      size: {
        sm: "text-xs px-2 py-1",
        md: "text-sm px-3 py-1.5",
        lg: "text-base px-4 py-2",
      },
      active: {
        true: "ring-2 ring-primary-500 ring-offset-1",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      active: false,
    },
  }
);

export interface FilterTagProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof filterTagVariants> {
  icon?: LucideIcon;
  removable?: boolean;
  onRemove?: () => void;
  count?: number;
  children: React.ReactNode;
}

export function FilterTag({
  className,
  variant,
  size,
  active,
  icon: Icon,
  removable = false,
  onRemove,
  count,
  children,
  onClick,
  disabled,
  ...props
}: FilterTagProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onClick?.(e);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  return (
    <button
      className={cn(
        filterTagVariants({ variant, size, active }),
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer hover:scale-105 active:scale-95",
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{children}</span>
      {count !== undefined && (
        <span className="ml-1 px-1.5 py-0.5 bg-black/10 rounded-full text-xs">
          {count}
        </span>
      )}
      {removable && onRemove && (
        <button
          onClick={handleRemove}
          className="ml-1 -mr-1 hover:bg-black/20 rounded-full p-1 transition-colors"
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </button>
  );
}

// Filter tag group for managing multiple filters
export interface FilterTagGroupProps {
  filters: Array<{
    id: string;
    label: string;
    value: any;
    icon?: LucideIcon;
    variant?: VariantProps<typeof filterTagVariants>["variant"];
    count?: number;
  }>;
  onRemove: (id: string) => void;
  onClearAll?: () => void;
  className?: string;
  size?: VariantProps<typeof filterTagVariants>["size"];
}

export function FilterTagGroup({
  filters,
  onRemove,
  onClearAll,
  className,
  size = "md",
}: FilterTagGroupProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm text-gray-600 mr-1">필터:</span>
      
      {filters.map((filter) => (
        <FilterTag
          key={filter.id}
          variant={filter.variant || "default"}
          size={size}
          icon={filter.icon}
          count={filter.count}
          removable
          onRemove={() => onRemove(filter.id)}
        >
          {filter.label}
        </FilterTag>
      ))}
      
      {filters.length > 1 && onClearAll && (
        <button
          onClick={onClearAll}
          className="text-xs text-gray-500 hover:text-gray-700 underline ml-2 transition-colors"
        >
          전체 해제
        </button>
      )}
    </div>
  );
}

// Compound filter display for complex filters
export interface CompoundFilter {
  id: string;
  type: "single" | "range" | "multi";
  label: string;
  value: any;
  displayValue?: string;
  icon?: LucideIcon;
  variant?: VariantProps<typeof filterTagVariants>["variant"];
  removable?: boolean;
}

export interface CompoundFilterDisplayProps {
  title?: string;
  filters: CompoundFilter[];
  onFilterChange: (filterId: string, value: any) => void;
  onFilterRemove: (filterId: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export function CompoundFilterDisplay({
  title = "활성 필터",
  filters,
  onFilterChange,
  onFilterRemove,
  onClearAll,
  className,
}: CompoundFilterDisplayProps) {
  const activeFilters = filters.filter(f => 
    f.value !== null && 
    f.value !== undefined && 
    f.value !== "" && 
    (Array.isArray(f.value) ? f.value.length > 0 : true)
  );

  if (activeFilters.length === 0) return null;

  return (
    <div className={cn("space-y-3 p-4 bg-gray-50 rounded-lg border", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        {onClearAll && activeFilters.length > 1 && (
          <button
            onClick={onClearAll}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            전체 초기화
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter) => {
          const displayValue = filter.displayValue || 
            (Array.isArray(filter.value) 
              ? `${filter.value.length}개 선택`
              : String(filter.value)
            );
          
          return (
            <FilterTag
              key={filter.id}
              variant={filter.variant || "primary"}
              icon={filter.icon}
              removable={filter.removable !== false}
              onRemove={() => onFilterRemove(filter.id)}
            >
              <span className="font-medium">{filter.label}:</span>
              <span className="ml-1">{displayValue}</span>
            </FilterTag>
          );
        })}
      </div>
    </div>
  );
}