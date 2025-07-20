import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { useMeasure } from '@/hooks/useMeasure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Download,
  RotateCcw,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKoreanWon } from '@/lib/utils';

// 타입 정의
export interface VirtualizedColumn<T = any> {
  key: keyof T | string;
  title: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  sticky?: 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
}

export interface VirtualizedTableProps<T = any> {
  data: T[];
  columns: VirtualizedColumn<T>[];
  height?: number;
  rowHeight?: number;
  headerHeight?: number;
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  selectable?: boolean;
  selectedRowKeys?: (string | number)[];
  onSelectionChange?: (selectedKeys: (string | number)[], selectedRows: T[]) => void;
  onRowClick?: (record: T, index: number) => void;
  onRowDoubleClick?: (record: T, index: number) => void;
  rowKey?: keyof T | ((record: T) => string | number);
  className?: string;
  title?: string;
  tools?: React.ReactNode;
  emptyText?: string;
  overscan?: number;
  stickyHeader?: boolean;
  resizable?: boolean;
  onExport?: () => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

// 메모이제이션된 행 컴포넌트
const VirtualizedRow = React.memo(<T,>({
  index,
  style,
  data: {
    filteredData,
    columns,
    selectedRowKeys,
    rowKey,
    onRowClick,
    onRowDoubleClick,
    onSelectionChange,
    selectable
  }
}: ListChildComponentProps & {
  data: {
    filteredData: T[];
    columns: VirtualizedColumn<T>[];
    selectedRowKeys: (string | number)[];
    rowKey: keyof T | ((record: T) => string | number);
    onRowClick?: (record: T, index: number) => void;
    onRowDoubleClick?: (record: T, index: number) => void;
    onSelectionChange?: (selectedKeys: (string | number)[], selectedRows: T[]) => void;
    selectable: boolean;
  };
}) => {
  const record = filteredData[index];
  if (!record) return null;

  const key = typeof rowKey === 'function' ? rowKey(record) : record[rowKey as keyof T];
  const isSelected = selectedRowKeys.includes(key as string | number);

  const handleRowClick = useCallback(() => {
    onRowClick?.(record, index);
  }, [record, index, onRowClick]);

  const handleRowDoubleClick = useCallback(() => {
    onRowDoubleClick?.(record, index);
  }, [record, index, onRowDoubleClick]);

  const handleCheckboxChange = useCallback((checked: boolean) => {
    if (!onSelectionChange) return;
    
    const newSelectedKeys = checked
      ? [...selectedRowKeys, key as string | number]
      : selectedRowKeys.filter(k => k !== key);
    
    const selectedRows = filteredData.filter(row => {
      const rowKey = typeof rowKey === 'function' ? rowKey(row) : row[rowKey as keyof T];
      return newSelectedKeys.includes(rowKey as string | number);
    });
    
    onSelectionChange(newSelectedKeys, selectedRows);
  }, [selectedRowKeys, key, onSelectionChange, filteredData, rowKey]);

  return (
    <div
      style={style}
      className={cn(
        "flex items-center border-b border-gray-200 hover:bg-gray-50 transition-colors",
        isSelected && "bg-blue-50",
        "cursor-pointer"
      )}
      onClick={handleRowClick}
      onDoubleClick={handleRowDoubleClick}
    >
      {selectable && (
        <div className="w-12 flex justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleCheckboxChange(e.target.checked)}
            className="rounded border-gray-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {columns.map((column, colIndex) => {
        const value = record[column.key as keyof T];
        const cellContent = column.render ? column.render(value, record, index) : value;
        
        return (
          <div
            key={`${column.key as string}-${colIndex}`}
            className={cn(
              "px-4 py-2 overflow-hidden text-ellipsis whitespace-nowrap",
              column.align === 'center' && "text-center",
              column.align === 'right' && "text-right",
              column.cellClassName
            )}
            style={{ 
              width: column.width || 150,
              minWidth: column.minWidth || 100,
              maxWidth: column.maxWidth || 300,
            }}
            title={typeof value === 'string' ? value : undefined}
          >
            {cellContent}
          </div>
        );
      })}
    </div>
  );
});

VirtualizedRow.displayName = 'VirtualizedRow';

// 헤더 컴포넌트
const TableHeader = React.memo(<T,>({
  columns,
  selectable,
  selectedRowKeys,
  filteredData,
  onSelectAll,
  sortConfig,
  onSort,
  stickyHeader
}: {
  columns: VirtualizedColumn<T>[];
  selectable: boolean;
  selectedRowKeys: (string | number)[];
  filteredData: T[];
  onSelectAll: (checked: boolean) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  stickyHeader: boolean;
}) => {
  const isAllSelected = selectedRowKeys.length > 0 && selectedRowKeys.length === filteredData.length;
  const isIndeterminate = selectedRowKeys.length > 0 && selectedRowKeys.length < filteredData.length;

  return (
    <div className={cn(
      "flex items-center bg-gray-50 border-b-2 border-gray-200 font-medium text-gray-700",
      stickyHeader && "sticky top-0 z-10"
    )}>
      {selectable && (
        <div className="w-12 flex justify-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isIndeterminate;
            }}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="rounded border-gray-300"
          />
        </div>
      )}
      {columns.map((column, index) => (
        <div
          key={`header-${column.key as string}-${index}`}
          className={cn(
            "px-4 py-3 flex items-center gap-2 overflow-hidden",
            column.align === 'center' && "justify-center",
            column.align === 'right' && "justify-end",
            column.sortable && "cursor-pointer hover:bg-gray-100 transition-colors",
            column.headerClassName
          )}
          style={{ 
            width: column.width || 150,
            minWidth: column.minWidth || 100,
            maxWidth: column.maxWidth || 300,
          }}
          onClick={() => column.sortable && onSort(column.key as string)}
        >
          <span className="truncate">{column.title}</span>
          {column.sortable && (
            <div className="flex flex-col">
              {sortConfig?.key === column.key ? (
                sortConfig.direction === 'asc' ? (
                  <SortAsc className="h-3 w-3" />
                ) : (
                  <SortDesc className="h-3 w-3" />
                )
              ) : (
                <div className="h-3 w-3 opacity-30">
                  <SortAsc className="h-3 w-3" />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

TableHeader.displayName = 'TableHeader';

// 메인 가상화된 테이블 컴포넌트
export function VirtualizedTable<T = any>({
  data,
  columns,
  height = 600,
  rowHeight = 52,
  headerHeight = 48,
  loading = false,
  searchable = true,
  filterable = true,
  sortable = true,
  selectable = false,
  selectedRowKeys = [],
  onSelectionChange,
  onRowClick,
  onRowDoubleClick,
  rowKey = 'id' as keyof T,
  className,
  title,
  tools,
  emptyText = "데이터가 없습니다",
  overscan = 5,
  stickyHeader = true,
  resizable = false,
  onExport,
  pagination
}: VirtualizedTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [containerRef, { width: containerWidth }] = useMeasure();
  const listRef = useRef<List>(null);

  // 데이터 필터링 및 정렬
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // 검색 필터링
    if (searchTerm) {
      result = result.filter(item => {
        return columns.some(column => {
          if (!column.filterable) return false;
          const value = item[column.key as keyof T];
          return String(value || '').toLowerCase().includes(searchTerm.toLowerCase());
        });
      });
    }

    // 정렬
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof T];
        const bValue = b[sortConfig.key as keyof T];
        
        if (aValue === bValue) return 0;
        
        const isAsc = sortConfig.direction === 'asc';
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return isAsc ? aValue - bValue : bValue - aValue;
        }
        
        const aStr = String(aValue || '').toLowerCase();
        const bStr = String(bValue || '').toLowerCase();
        return isAsc ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [data, searchTerm, sortConfig, columns]);

  // 정렬 핸들러
  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  }, []);

  // 전체 선택 핸들러
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      const allKeys = filteredAndSortedData.map(item => {
        return typeof rowKey === 'function' ? rowKey(item) : item[rowKey as keyof T];
      }) as (string | number)[];
      onSelectionChange(allKeys, filteredAndSortedData);
    } else {
      onSelectionChange([], []);
    }
  }, [filteredAndSortedData, rowKey, onSelectionChange]);

  // 검색 초기화
  const handleResetSearch = useCallback(() => {
    setSearchTerm('');
    setSortConfig(null);
  }, []);

  // 로딩 스켈레톤
  if (loading) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const tableContent = (
    <div ref={containerRef} className="w-full">
      {/* 도구 모음 */}
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-4 flex-1">
          {searchable && (
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          
          {(searchTerm || sortConfig) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSearch}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              초기화
            </Button>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            총 <Badge variant="secondary">{filteredAndSortedData.length}</Badge>개 항목
            {selectedRowKeys.length > 0 && (
              <>
                , <Badge variant="default">{selectedRowKeys.length}</Badge>개 선택됨
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              내보내기
            </Button>
          )}
          {tools}
        </div>
      </div>

      {/* 테이블 헤더 */}
      <TableHeader
        columns={columns}
        selectable={selectable}
        selectedRowKeys={selectedRowKeys}
        filteredData={filteredAndSortedData}
        onSelectAll={handleSelectAll}
        sortConfig={sortConfig}
        onSort={handleSort}
        stickyHeader={stickyHeader}
      />

      {/* 가상화된 테이블 본문 */}
      {filteredAndSortedData.length > 0 ? (
        <List
          ref={listRef}
          height={height - headerHeight - 80} // 도구 모음과 헤더 높이 제외
          itemCount={filteredAndSortedData.length}
          itemSize={rowHeight}
          width={containerWidth || '100%'}
          overscanCount={overscan}
          itemData={{
            filteredData: filteredAndSortedData,
            columns,
            selectedRowKeys,
            rowKey,
            onRowClick,
            onRowDoubleClick,
            onSelectionChange,
            selectable
          }}
        >
          {VirtualizedRow}
        </List>
      ) : (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">{emptyText}</div>
            {searchTerm && (
              <div className="text-sm">
                '{searchTerm}'에 대한 검색 결과가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className={cn("w-full", className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {tableContent}
      </CardContent>
    </Card>
  );
}

// 사용을 위한 편의 훅
export function useVirtualizedTable<T>() {
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  const handleSelectionChange = useCallback((keys: (string | number)[], rows: T[]) => {
    setSelectedRowKeys(keys);
    setSelectedRows(rows);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRowKeys([]);
    setSelectedRows([]);
  }, []);

  return {
    selectedRowKeys,
    selectedRows,
    onSelectionChange: handleSelectionChange,
    clearSelection,
  };
}

export default VirtualizedTable;