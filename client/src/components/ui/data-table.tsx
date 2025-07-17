import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown, EyeOff, Eye, Edit, Trash2 } from "lucide-react";
import { getStatusColor, getStatusText } from "@/lib/formatters";

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface TableAction {
  label: string;
  icon: React.ReactNode;
  onClick: (row: any) => void;
  variant?: "default" | "destructive" | "outline";
  show?: (row: any) => boolean;
}

interface DataTableProps {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  sortConfig?: {
    key: string;
    direction: 'asc' | 'desc' | null;
  };
  onSort?: (key: string) => void;
  actions?: TableAction[];
  statusList?: any[];
  hiddenColumns?: string[];
  onToggleColumn?: (column: string) => void;
  emptyMessage?: string;
}

export function DataTable({
  columns,
  data,
  loading = false,
  sortConfig,
  onSort,
  actions = [],
  statusList = [],
  hiddenColumns = [],
  onToggleColumn,
  emptyMessage = "데이터가 없습니다."
}: DataTableProps) {
  const visibleColumns = columns.filter(col => !hiddenColumns.includes(col.key));
  
  const handleSort = (key: string) => {
    if (onSort) {
      onSort(key);
    }
  };

  const renderSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronUp className="h-3 w-3 text-gray-300" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="h-3 w-3 text-gray-600" /> : 
      <ChevronDown className="h-3 w-3 text-gray-600" />;
  };

  const renderCellContent = (column: TableColumn, row: any) => {
    const value = row[column.key];
    
    if (column.render) {
      return column.render(value, row);
    }

    // Default status badge rendering
    if (column.key === 'status' && statusList.length > 0) {
      return (
        <Badge className={getStatusColor(value, statusList)}>
          {getStatusText(value, statusList)}
        </Badge>
      );
    }

    // Default rendering
    return value || '-';
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column Visibility Controls */}
      {onToggleColumn && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            총 {data.length}개 항목
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <EyeOff className="h-4 w-4 mr-2" />
                컬럼 표시/숨김
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={!hiddenColumns.includes(column.key)}
                  onCheckedChange={() => onToggleColumn(column.key)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {visibleColumns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className={`${column.width || 'w-auto'} ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">{column.label}</span>
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}
              {actions.length > 0 && (
                <TableHead className="w-32 text-center">
                  <span className="font-medium text-gray-700">작업</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={visibleColumns.length + (actions.length > 0 ? 1 : 0)} 
                  className="text-center py-8 text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  {visibleColumns.map((column) => (
                    <TableCell key={column.key} className={column.width || 'w-auto'}>
                      {renderCellContent(column, row)}
                    </TableCell>
                  ))}
                  {actions.length > 0 && (
                    <TableCell className="w-32">
                      <div className="flex items-center justify-center gap-1">
                        {actions.map((action, actionIndex) => {
                          if (action.show && !action.show(row)) return null;
                          return (
                            <Button
                              key={actionIndex}
                              size="sm"
                              variant={action.variant || "outline"}
                              className="h-7 w-7 p-0"
                              onClick={() => action.onClick(row)}
                              title={action.label}
                            >
                              {action.icon}
                            </Button>
                          );
                        })}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Pre-configured common actions
export const commonTableActions = {
  view: (onClick: (row: any) => void): TableAction => ({
    label: "보기",
    icon: <Eye className="h-4 w-4" />,
    onClick,
    variant: "outline"
  }),
  edit: (onClick: (row: any) => void): TableAction => ({
    label: "편집",
    icon: <Edit className="h-4 w-4" />,
    onClick,
    variant: "outline"
  }),
  delete: (onClick: (row: any) => void): TableAction => ({
    label: "삭제",
    icon: <Trash2 className="h-4 w-4" />,
    onClick,
    variant: "destructive"
  })
};