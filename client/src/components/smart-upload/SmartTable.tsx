import React, { useState, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  ChevronDown, 
  Search,
  Filter,
  Columns3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  GitMerge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AutoCompleteInput } from './AutoCompleteInput';

export interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning';
}

export interface DuplicateInfo {
  isDuplicate: boolean;
  duplicateType: 'exact' | 'similar' | 'none';
  confidence: number;
  matchedRows: number[];
  mergeStrategy?: {
    action: 'skip' | 'replace' | 'merge' | 'create_new';
    reason: string;
  };
}

export interface TableRow {
  id: string;
  rowIndex: number;
  status: 'valid' | 'warning' | 'error';
  projectName?: string;
  vendorName?: string;
  vendorEmail?: string;
  deliveryDate?: string;
  itemName?: string;
  specification?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  majorCategory?: string;
  middleCategory?: string;
  minorCategory?: string;
  notes?: string;
  errors?: ValidationError[];
  duplicate?: DuplicateInfo;
}

interface SmartTableProps {
  data: TableRow[];
  onEdit?: (rowIndex: number, field: string, value: any) => void;
  onRowSelect?: (selectedRows: TableRow[]) => void;
  validationErrors?: Record<string, ValidationError>;
  isLoading?: boolean;
  className?: string;
}

interface EditableCellProps {
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'number' | 'email' | 'date';
  suggestions?: Array<{ value: string; label: string }>;
  error?: ValidationError;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onChange,
  type = 'text',
  suggestions,
  error,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleSave = () => {
    onChange(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    if (suggestions && suggestions.length > 0) {
      return (
        <AutoCompleteInput
          value={tempValue}
          onChange={(val) => setTempValue(val)}
          suggestions={suggestions}
          onBlur={handleSave}
          autoFocus
          className="min-w-[100px]"
        />
      );
    }

    return (
      <Input
        type={type}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className={cn(
          "h-8 min-w-[100px]",
          error?.type === 'error' && "border-red-500",
          error?.type === 'warning' && "border-yellow-500"
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "px-2 py-1 cursor-pointer hover:bg-gray-50 rounded min-h-[32px] flex items-center",
        error?.type === 'error' && "text-red-600",
        error?.type === 'warning' && "text-yellow-600",
        !value && "text-gray-400 italic"
      )}
      onClick={() => setIsEditing(true)}
    >
      {value || '클릭하여 입력'}
      {error && (
        <span className="ml-2">
          {error.type === 'error' ? (
            <XCircle className="h-3 w-3 inline" />
          ) : (
            <AlertCircle className="h-3 w-3 inline" />
          )}
        </span>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: 'valid' | 'warning' | 'error' }> = ({ status }) => {
  const variants = {
    valid: { icon: CheckCircle, className: 'text-green-600', label: '완료' },
    warning: { icon: AlertCircle, className: 'text-yellow-600', label: '확인' },
    error: { icon: XCircle, className: 'text-red-600', label: '수정' },
  };

  const variant = variants[status];
  const Icon = variant.icon;

  return (
    <div className={cn('flex items-center gap-1', variant.className)}>
      <Icon className="h-4 w-4" />
      <span className="text-xs font-medium">{variant.label}</span>
    </div>
  );
};

export const SmartTable: React.FC<SmartTableProps> = ({
  data,
  onEdit,
  onRowSelect,
  validationErrors = {},
  isLoading = false,
  className,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});

  const columns = useMemo<ColumnDef<TableRow>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
            className="rounded border-gray-300"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(e.target.checked)}
            className="rounded border-gray-300"
          />
        ),
        size: 40,
      },
      {
        accessorKey: 'status',
        header: '상태',
        cell: ({ getValue }) => <StatusBadge status={getValue() as any} />,
        size: 80,
      },
      {
        id: 'duplicate',
        header: '중복',
        cell: ({ row }) => {
          const duplicate = row.original.duplicate;
          if (!duplicate?.isDuplicate) return null;
          
          return (
            <div className="flex items-center gap-1">
              {duplicate.duplicateType === 'exact' ? (
                <div className="flex items-center gap-1 text-red-600" title={`행 ${duplicate.matchedRows.join(', ')}와 완전 중복`}>
                  <Copy className="h-4 w-4" />
                  <span className="text-xs">중복</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-yellow-600" title={`행 ${duplicate.matchedRows.join(', ')}와 ${duplicate.confidence}% 유사`}>
                  <GitMerge className="h-4 w-4" />
                  <span className="text-xs">{duplicate.confidence}%</span>
                </div>
              )}
            </div>
          );
        },
        size: 80,
      },
      {
        accessorKey: 'projectName',
        header: '프로젝트',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            onChange={(value) => onEdit?.(row.original.rowIndex, 'projectName', value)}
            error={validationErrors[`${row.original.rowIndex}-projectName`]}
          />
        ),
        size: 150,
      },
      {
        accessorKey: 'vendorName',
        header: '거래처',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            onChange={(value) => onEdit?.(row.original.rowIndex, 'vendorName', value)}
            suggestions={[
              { value: '삼성물산', label: '삼성물산 건설부문' },
              { value: 'LG건설', label: 'LG건설(주)' },
            ]} // TODO: Load from API
            error={validationErrors[`${row.original.rowIndex}-vendorName`]}
          />
        ),
        size: 150,
      },
      {
        accessorKey: 'vendorEmail',
        header: '이메일',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            onChange={(value) => onEdit?.(row.original.rowIndex, 'vendorEmail', value)}
            type="email"
            error={validationErrors[`${row.original.rowIndex}-vendorEmail`]}
          />
        ),
        size: 200,
      },
      {
        accessorKey: 'itemName',
        header: '품목',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            onChange={(value) => onEdit?.(row.original.rowIndex, 'itemName', value)}
            error={validationErrors[`${row.original.rowIndex}-itemName`]}
          />
        ),
        size: 150,
      },
      {
        accessorKey: 'specification',
        header: '규격',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            onChange={(value) => onEdit?.(row.original.rowIndex, 'specification', value)}
          />
        ),
        size: 120,
      },
      {
        accessorKey: 'quantity',
        header: '수량',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            onChange={(value) => onEdit?.(row.original.rowIndex, 'quantity', value)}
            type="number"
            error={validationErrors[`${row.original.rowIndex}-quantity`]}
          />
        ),
        size: 80,
      },
      {
        accessorKey: 'unitPrice',
        header: '단가',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            onChange={(value) => onEdit?.(row.original.rowIndex, 'unitPrice', value)}
            type="number"
            error={validationErrors[`${row.original.rowIndex}-unitPrice`]}
          />
        ),
        size: 100,
      },
      {
        accessorKey: 'totalAmount',
        header: '금액',
        cell: ({ getValue }) => {
          const value = getValue() as number;
          return (
            <div className="text-right font-medium">
              {value ? value.toLocaleString() : '-'}
            </div>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'majorCategory',
        header: '대분류',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            onChange={(value) => onEdit?.(row.original.rowIndex, 'majorCategory', value)}
            suggestions={[
              { value: '건축자재', label: '건축자재' },
              { value: '전기자재', label: '전기자재' },
            ]} // TODO: Load from API
          />
        ),
        size: 100,
      },
      {
        accessorKey: 'deliveryDate',
        header: '납기일',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue()}
            onChange={(value) => onEdit?.(row.original.rowIndex, 'deliveryDate', value)}
            type="date"
          />
        ),
        size: 120,
      },
    ],
    [onEdit, validationErrors]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  React.useEffect(() => {
    const selectedRows = table.getSelectedRowModel().rows.map(row => row.original);
    onRowSelect?.(selectedRows);
  }, [rowSelection, table, onRowSelect]);

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Table Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="검색..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                필터
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem checked>완료</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked>확인 필요</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked>수정 필요</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="h-4 w-4 mr-2" />
                컬럼
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {table.getFilteredRowModel().rows.length} / {data.length} 항목
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.getSize() }}
                    className="bg-gray-50"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2">데이터 로딩 중...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    row.original.status === 'error' && 'bg-red-50',
                    row.original.status === 'warning' && 'bg-yellow-50'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {table.getFilteredSelectedRowModel().rows.length} / {table.getFilteredRowModel().rows.length} 선택됨
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm">페이지</span>
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
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};