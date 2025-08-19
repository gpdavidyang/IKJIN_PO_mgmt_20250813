import React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EnhancedTableSkeleton } from "./enhanced-table-skeleton";
import { useTheme } from "@/components/ui/theme-provider";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  accessor?: (row: T) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  className?: string;
}

interface EnhancedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  showPagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  stickyHeader?: boolean;
  maxHeight?: string;
}

type SortDirection = "asc" | "desc" | null;

export function EnhancedTable<T>({
  data,
  columns,
  searchable = false,
  searchPlaceholder = "검색...",
  showPagination = false,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onRowClick,
  rowKey,
  emptyMessage = "데이터가 없습니다",
  isLoading = false,
  className,
  stickyHeader = false,
  maxHeight,
}: EnhancedTableProps<T>) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Force re-render when theme changes to apply styles
  const tableKey = `table-${isDarkMode ? 'dark' : 'light'}-${Date.now()}`;
  
  // Force style application on mount and theme change
  React.useEffect(() => {
    if (isDarkMode) {
      // Apply styles with a slight delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const tableElements = document.querySelectorAll('.dark-table-container table');
        tableElements.forEach((table) => {
          (table as HTMLElement).style.setProperty('background-color', 'rgb(31 41 55)', 'important');
          
          const tbody = table.querySelector('tbody');
          if (tbody) {
            (tbody as HTMLElement).style.setProperty('background-color', 'rgb(31 41 55)', 'important');
            const rows = tbody.querySelectorAll('tr');
            rows.forEach((row, index) => {
              if (index % 2 === 0) {
                (row as HTMLElement).style.setProperty('background-color', 'rgb(31 41 55)', 'important');
              } else {
                (row as HTMLElement).style.setProperty('background-color', 'rgba(55 65 81, 0.7)', 'important');
              }
            });
          }
          
          const thead = table.querySelector('thead');
          if (thead) {
            (thead as HTMLElement).style.setProperty('background-color', 'rgb(55 65 81)', 'important');
          }
        });
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [isDarkMode, data]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  // Filter data based on search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery) return data;

    const searchableColumns = columns.filter(col => col.searchable !== false);
    
    return data.filter(row => {
      return searchableColumns.some(col => {
        const value = col.accessor 
          ? col.accessor(row) 
          : (row as any)[col.key];
        
        if (value === null || value === undefined) return false;
        
        return String(value)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      });
    });
  }, [data, searchQuery, columns]);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    const column = columns.find(col => col.key === sortColumn);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = column.accessor 
        ? column.accessor(a) 
        : (a as any)[column.key];
      const bValue = column.accessor 
        ? column.accessor(b) 
        : (b as any)[column.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection, columns]);

  // Paginate data
  const paginatedData = React.useMemo(() => {
    if (!showPagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, showPagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />;
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
    return <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  };

  if (isLoading) {
    return (
      <EnhancedTableSkeleton 
        rows={pageSize} 
        columns={columns.length}
        showPagination={showPagination}
      />
    );
  }

  return (
    <div className={cn("w-full dark-table-container", className)}>
      {/* Search bar */}
      {searchable && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div 
        className={cn(
          "border rounded-lg overflow-hidden transition-colors table-wrapper-custom",
          "border-gray-200 dark:border-gray-700"
        )}
        style={{ 
          maxHeight,
          backgroundColor: isDarkMode ? 'rgb(31 41 55) !important' : 'white !important',
          forcedColorAdjust: 'none'
        }}
      >
        <table 
          className="w-full table-custom-dark" 
          style={{
            backgroundColor: isDarkMode ? 'rgb(31 41 55) !important' : 'white !important',
            forcedColorAdjust: 'none'
          }}
        >
          <thead 
            className={cn(
              "border-b transition-colors thead-custom",
              "border-gray-200 dark:border-gray-600",
              stickyHeader && "sticky top-0 z-10"
            )}
            style={{
              backgroundColor: isDarkMode ? 'rgb(55 65 81) !important' : 'rgb(249 250 251) !important',
              forcedColorAdjust: 'none'
            }}
          >
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors",
                    "text-gray-600 dark:text-gray-300",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.sortable !== false && "cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors",
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && handleSort(String(column.key))}
                >
                  <div className={cn(
                    "flex items-center gap-1",
                    column.align === "center" && "justify-center",
                    column.align === "right" && "justify-end"
                  )}>
                    <span>{column.header}</span>
                    {column.sortable !== false && getSortIcon(String(column.key))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody 
            className={cn(
              "divide-y transition-colors tbody-custom",
              "divide-gray-200 dark:divide-gray-700"
            )}
            style={{
              backgroundColor: isDarkMode ? 'rgb(31 41 55) !important' : 'white !important',
              forcedColorAdjust: 'none'
            }}
          >
            {paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 td-custom-empty"
                  style={{
                    backgroundColor: isDarkMode ? 'rgb(31 41 55) !important' : 'white !important',
                    forcedColorAdjust: 'none'
                  }}
                >
                  <div className="flex flex-col items-center">
                    <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "transition-colors tr-custom-row",
                    onRowClick && "cursor-pointer"
                  )}
                  style={{
                    backgroundColor: isDarkMode 
                      ? (index % 2 === 0 ? 'rgb(31 41 55) !important' : 'rgba(55 65 81, 0.7) !important')
                      : (index % 2 === 0 ? 'white !important' : 'rgb(249 250 251) !important'),
                    forcedColorAdjust: 'none',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (isDarkMode) {
                      e.currentTarget.style.backgroundColor = 'rgb(55 65 81) !important';
                    } else {
                      e.currentTarget.style.backgroundColor = 'rgb(243 244 246) !important';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isDarkMode) {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'rgb(31 41 55) !important' : 'rgba(55 65 81, 0.7) !important';
                    } else {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white !important' : 'rgb(249 250 251) !important';
                    }
                  }}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        "px-4 py-3 text-sm transition-colors td-custom",
                        "text-gray-900 dark:text-gray-100",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                        column.className
                      )}
                      style={{
                        backgroundColor: 'transparent !important',
                        forcedColorAdjust: 'none'
                      }}
                    >
                      {column.accessor 
                        ? column.accessor(row) 
                        : (row as any)[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              표시 개수:
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20 h-8 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                {pageSizeOptions.map((size) => (
                  <SelectItem 
                    key={size} 
                    value={String(size)}
                    className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 px-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              처음
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              이전
            </Button>

            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={cn(
                      "h-8 w-8 p-0",
                      currentPage === pageNumber 
                        ? "bg-blue-600 dark:bg-blue-500 text-white dark:text-white border-blue-600 dark:border-blue-500"
                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              다음
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 px-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              마지막
            </Button>
          </div>

          <div className="text-sm text-gray-700 dark:text-gray-300">
            총 {sortedData.length}개 중 {((currentPage - 1) * pageSize) + 1}-
            {Math.min(currentPage * pageSize, sortedData.length)}개
          </div>
        </div>
      )}
    </div>
  );
}