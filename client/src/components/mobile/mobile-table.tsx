import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  MoreVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface MobileTableColumn<T> {
  key: keyof T | string;
  label: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  primary?: boolean; // Main display field
  secondary?: boolean; // Secondary info
}

export interface MobileTableAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (row: T) => void;
  variant?: "default" | "destructive";
}

interface MobileTableProps<T> {
  data: T[];
  columns: MobileTableColumn<T>[];
  actions?: MobileTableAction<T>[];
  searchable?: boolean;
  sortable?: boolean;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
}

export function MobileTable<T>({
  data,
  columns,
  actions = [],
  searchable = true,
  sortable = true,
  onRowClick,
  rowKey,
  emptyMessage = "데이터가 없습니다",
  isLoading = false,
  className,
}: MobileTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

  // Filter data based on search
  const filteredData = React.useMemo(() => {
    if (!searchQuery) return data;

    const searchableColumns = columns.filter(col => col.searchable !== false);
    
    return data.filter(row => {
      return searchableColumns.some(col => {
        const value = col.accessor(row);
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchQuery.toLowerCase());
      });
    });
  }, [data, searchQuery, columns]);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    const column = columns.find(col => col.key === sortColumn);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = column.accessor(a);
      const bValue = column.accessor(b);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection, columns]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const toggleRowExpansion = (key: string | number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const primaryColumn = columns.find(col => col.primary);
  const secondaryColumns = columns.filter(col => col.secondary);
  const detailColumns = columns.filter(col => !col.primary && !col.secondary);

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {searchable && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
        
        {sortable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-shrink-0">
                <Filter className="h-4 w-4 mr-2" />
                정렬
                {sortColumn && (
                  sortDirection === "asc" ? 
                    <SortAsc className="h-4 w-4 ml-2" /> : 
                    <SortDesc className="h-4 w-4 ml-2" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {columns.filter(col => col.sortable !== false).map((column) => (
                <DropdownMenuItem
                  key={String(column.key)}
                  onClick={() => handleSort(String(column.key))}
                  className="flex items-center justify-between"
                >
                  <span>{column.label}</span>
                  {sortColumn === column.key && (
                    sortDirection === "asc" ? 
                      <SortAsc className="h-4 w-4" /> : 
                      <SortDesc className="h-4 w-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Data Cards */}
      <div className="space-y-3">
        {sortedData.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>{emptyMessage}</p>
            </CardContent>
          </Card>
        ) : (
          sortedData.map((row) => {
            const key = rowKey(row);
            const isExpanded = expandedRows.has(key);
            const hasDetails = detailColumns.length > 0;

            return (
              <Card
                key={key}
                className={cn(
                  "transition-all duration-200",
                  onRowClick && "cursor-pointer hover:shadow-md active:scale-[0.98]"
                )}
                onClick={() => onRowClick?.(row)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Primary Content */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {primaryColumn && (
                          <div className="text-base font-medium text-gray-900 mb-1">
                            {primaryColumn.accessor(row)}
                          </div>
                        )}
                        
                        {/* Secondary Info */}
                        {secondaryColumns.map((column) => (
                          <div key={String(column.key)} className="text-sm text-gray-600">
                            {column.accessor(row)}
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-3">
                        {actions.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {actions.map((action, index) => (
                                <DropdownMenuItem
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick(row);
                                  }}
                                  className={cn(
                                    action.variant === "destructive" && "text-red-600"
                                  )}
                                >
                                  {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {/* Expand/Collapse */}
                        {hasDetails && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(key);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {hasDetails && isExpanded && (
                      <div className="border-t pt-3 space-y-2">
                        {detailColumns.map((column) => (
                          <div key={String(column.key)} className="flex justify-between items-start">
                            <span className="text-sm text-gray-500 font-medium min-w-0 flex-shrink-0 mr-3">
                              {column.label}:
                            </span>
                            <div className="text-sm text-gray-900 text-right">
                              {column.accessor(row)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// Hook for responsive table detection
export function useResponsiveTable() {
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}