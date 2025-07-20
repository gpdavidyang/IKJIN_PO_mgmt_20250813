/**
 * Responsive Data Table Component
 * 
 * Adaptive table that transforms into mobile-friendly cards:
 * - Desktop: Traditional table layout
 * - Mobile: Card-based layout with key information
 * - Touch-friendly interactions
 * - Swipe actions for mobile
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  className?: string;
  render?: (value: any, row: T) => React.ReactNode;
  mobileRender?: (value: any, row: T) => React.ReactNode;
  hideOnMobile?: boolean;
  showOnMobile?: boolean;
  priority?: 'high' | 'medium' | 'low'; // For mobile column priority
}

export interface Action<T = any> {
  label: string;
  icon: React.ComponentType<any>;
  onClick: (row: T) => void;
  variant?: 'default' | 'destructive' | 'secondary';
  hidden?: (row: T) => boolean;
}

export interface ResponsiveTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  mobileCardRender?: (row: T, index: number) => React.ReactNode;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  actions = [],
  loading = false,
  searchable = true,
  filterable = false,
  sortable = true,
  pagination,
  onRowClick,
  emptyMessage = '데이터가 없습니다',
  className,
  mobileCardRender,
}: ResponsiveTableProps<T>) {
  const { isMobile } = useResponsive();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Filter and sort data
  const processedData = React.useMemo(() => {
    let filtered = data;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        columns.some(column => {
          const value = row[column.key];
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Sort
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig, columns]);

  const handleSort = (key: string) => {
    if (!sortable) return;
    
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const renderSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? 
      <SortAsc className="h-4 w-4" /> : 
      <SortDesc className="h-4 w-4" />;
  };

  // Mobile card view
  const renderMobileView = () => (
    <div className="space-y-3">
      {processedData.map((row, index) => {
        if (mobileCardRender) {
          return mobileCardRender(row, index);
        }

        // Default mobile card
        const primaryColumns = columns.filter(col => 
          col.priority === 'high' || (!col.hideOnMobile && !col.priority)
        ).slice(0, 3);

        return (
          <Card 
            key={index}
            className={cn(
              "cursor-pointer transition-colors hover:bg-gray-50",
              onRowClick && "cursor-pointer"
            )}
            onClick={() => onRowClick?.(row)}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Primary information */}
                <div className="space-y-2">
                  {primaryColumns.map((column) => {
                    const value = row[column.key];
                    const rendered = column.mobileRender 
                      ? column.mobileRender(value, row)
                      : column.render 
                      ? column.render(value, row)
                      : value;

                    return (
                      <div key={column.key} className="flex justify-between items-start">
                        <span className="text-sm text-gray-600 font-medium min-w-0 flex-shrink-0">
                          {column.label}
                        </span>
                        <div className="text-sm text-right ml-2 min-w-0 flex-1">
                          {rendered}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                {actions.length > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-2">
                      {actions.slice(0, 2).map((action, actionIndex) => {
                        if (action.hidden?.(row)) return null;
                        
                        return (
                          <Button
                            key={actionIndex}
                            variant={action.variant || 'outline'}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(row);
                            }}
                            className="h-8 px-3"
                          >
                            <action.icon className="h-3 w-3 mr-1" />
                            {action.label}
                          </Button>
                        );
                      })}
                    </div>

                    {actions.length > 2 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions.slice(2).map((action, actionIndex) => {
                            if (action.hidden?.(row)) return null;
                            
                            return (
                              <DropdownMenuItem
                                key={actionIndex}
                                onClick={() => action.onClick(row)}
                                className={cn(
                                  action.variant === 'destructive' && 'text-red-600'
                                )}
                              >
                                <action.icon className="h-4 w-4 mr-2" />
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // Desktop table view
  const renderDesktopView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.className,
                  column.sortable && sortable && "cursor-pointer hover:bg-gray-50",
                  column.width && `w-${column.width}`
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && renderSortIcon(column.key)}
                </div>
              </TableHead>
            ))}
            {actions.length > 0 && (
              <TableHead className="w-20 text-center">작업</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {processedData.map((row, index) => (
            <TableRow
              key={index}
              className={cn(
                onRowClick && "cursor-pointer hover:bg-gray-50"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => {
                const value = row[column.key];
                const rendered = column.render ? column.render(value, row) : value;
                
                return (
                  <TableCell key={column.key} className={column.className}>
                    {rendered}
                  </TableCell>
                );
              })}
              {actions.length > 0 && (
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 p-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map((action, actionIndex) => {
                        if (action.hidden?.(row)) return null;
                        
                        return (
                          <DropdownMenuItem
                            key={actionIndex}
                            onClick={() => action.onClick(row)}
                            className={cn(
                              action.variant === 'destructive' && 'text-red-600'
                            )}
                          >
                            <action.icon className="h-4 w-4 mr-2" />
                            {action.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      {(searchable || filterable) && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          
          {filterable && (
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              필터
            </Button>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">데이터를 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* Data display */}
      {!loading && processedData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {emptyMessage}
        </div>
      )}

      {!loading && processedData.length > 0 && (
        isMobile ? renderMobileView() : renderDesktopView()
      )}

      {/* Pagination */}
      {pagination && pagination.total > pagination.pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="text-sm text-gray-500">
            총 {pagination.total}개 중 {pagination.pageSize * (pagination.page - 1) + 1}-{Math.min(pagination.pageSize * pagination.page, pagination.total)}개 표시
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            
            <span className="text-sm px-2">
              {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
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

export default ResponsiveTable;