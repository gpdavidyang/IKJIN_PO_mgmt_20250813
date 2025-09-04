import React, { useState, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit2,
  Save,
  X,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataRow {
  id: string | number;
  status: 'valid' | 'warning' | 'error';
  errors?: string[];
  warnings?: string[];
  [key: string]: any;
}

interface SmartTableProps {
  data: DataRow[];
  columns: {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'date' | 'select' | 'email';
    editable?: boolean;
    options?: { value: string; label: string }[];
  }[];
  onDataChange?: (updatedData: DataRow[]) => void;
  itemsPerPage?: number;
}

export function SmartTable({
  data,
  columns,
  onDataChange,
  itemsPerPage = 10,
}: SmartTableProps) {
  const [editingCell, setEditingCell] = useState<{
    rowId: string | number;
    columnKey: string;
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [localData, setLocalData] = useState(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'warning' | 'error'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search and status
  const filteredData = useMemo(() => {
    return localData.filter((row) => {
      // Status filter
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return columns.some((col) => {
          const value = row[col.key];
          return value && value.toString().toLowerCase().includes(searchLower);
        });
      }

      return true;
    });
  }, [localData, searchTerm, statusFilter, columns]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEdit = useCallback((rowId: string | number, columnKey: string, currentValue: any) => {
    setEditingCell({ rowId, columnKey });
    setEditValue(currentValue?.toString() || '');
  }, []);

  const handleSave = useCallback(() => {
    if (!editingCell) return;

    const updatedData = localData.map((row) => {
      if (row.id === editingCell.rowId) {
        return {
          ...row,
          [editingCell.columnKey]: editValue,
        };
      }
      return row;
    });

    setLocalData(updatedData);
    onDataChange?.(updatedData);
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, localData, onDataChange]);

  const handleCancel = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      valid: 'bg-green-100 text-green-800 hover:bg-green-100',
      warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      error: 'bg-red-100 text-red-800 hover:bg-red-100',
    };

    return (
      <Badge className={cn('cursor-default', variants[status as keyof typeof variants])}>
        <div className="flex items-center gap-1">
          {getStatusIcon(status)}
          <span className="text-xs">
            {status === 'valid' && '유효'}
            {status === 'warning' && '경고'}
            {status === 'error' && '오류'}
          </span>
        </div>
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value: any) => setStatusFilter(value)}
        >
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="valid">유효</SelectItem>
            <SelectItem value="warning">경고</SelectItem>
            <SelectItem value="error">오류</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">상태</TableHead>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              <TableHead className="w-[80px]">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  className="text-center text-gray-500"
                >
                  데이터가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    row.status === 'error' && 'bg-red-50/50',
                    row.status === 'warning' && 'bg-yellow-50/50'
                  )}
                >
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {editingCell?.rowId === row.id &&
                      editingCell?.columnKey === column.key ? (
                        <div className="flex gap-1">
                          {column.type === 'select' && column.options ? (
                            <Select
                              value={editValue}
                              onValueChange={setEditValue}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {column.options.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8"
                              type={column.type || 'text'}
                              autoFocus
                            />
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={handleSave}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={handleCancel}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group">
                          <span>{row[column.key]}</span>
                          {column.editable && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() =>
                                handleEdit(row.id, column.key, row[column.key])
                              }
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    {(row.errors?.length || row.warnings?.length) ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        title={[
                          ...(row.errors || []),
                          ...(row.warnings || []),
                        ].join(', ')}
                      >
                        상세
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            전체 {filteredData.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, filteredData.length)}개 표시
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            <div className="flex items-center px-3 text-sm">
              {currentPage} / {totalPages}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
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