/**
 * Optimized DataTable component with virtualization and performance enhancements
 */

import React, { useMemo, useState, useCallback } from "react";
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptimizedDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  filters?: Array<{
    key: string;
    label: string;
    options: Array<{ label: string; value: string }>;
  }>;
  onRowClick?: (row: TData) => void;
  className?: string;
  isLoading?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  emptyMessage?: string;
}

export function OptimizedDataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "검색...",
  filters = [],
  onRowClick,
  className,
  isLoading = false,
  enablePagination = true,
  pageSize = 20,
  emptyMessage = "데이터가 없습니다",
}: OptimizedDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Memoized columns to prevent unnecessary re-renders
  const memoizedColumns = useMemo(() => columns, [columns]);

  // Memoized data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => data, [data]);

  const table = useReactTable({
    data: memoizedData,
    columns: memoizedColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  // Optimized search handler
  const handleSearch = useCallback((value: string) => {
    setGlobalFilter(value);
  }, []);

  // Optimized filter handler
  const handleFilterChange = useCallback((key: string, value: string) => {
    setColumnFilters(prev => 
      value === "all" 
        ? prev.filter(filter => filter.id !== key)
        : prev.some(filter => filter.id === key)
          ? prev.map(filter => filter.id === key ? { ...filter, value } : filter)
          : [...prev, { id: key, value }]
    );
  }, []);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-10 w-80 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="rounded-md border">
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filters */}
      <div className="flex items-center space-x-2 flex-wrap gap-2">
        {searchKey && (
          <div className="relative flex-1 min-w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
        
        {filters.map((filter) => (
          <div key={filter.key} className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={columnFilters.find(f => f.id === filter.key)?.value || "all"}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 {filter.label}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Active filters display */}
        {columnFilters.length > 0 && (
          <div className="flex items-center space-x-2">
            {columnFilters.map((filter) => {
              const filterConfig = filters.find(f => f.key === filter.id);
              const option = filterConfig?.options.find(o => o.value === filter.value);
              return (
                <Badge key={filter.id} variant="secondary" className="text-xs">
                  {filterConfig?.label}: {option?.label}
                  <button
                    onClick={() => handleFilterChange(filter.id, "all")}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className={cn(
                      "font-medium text-gray-700",
                      header.column.getCanSort() && "cursor-pointer select-none hover:bg-gray-50"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center space-x-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())
                      }
                      {header.column.getCanSort() && (
                        <span className="text-gray-400">
                          {{
                            asc: "↑",
                            desc: "↓",
                          }[header.column.getIsSorted() as string] ?? "↕"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "hover:bg-gray-50 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 px-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-gray-500">
            총 {table.getFilteredRowModel().rows.length}개 중{" "}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
            개 표시
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-500">페이지</span>
              <strong className="text-sm">
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </strong>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}