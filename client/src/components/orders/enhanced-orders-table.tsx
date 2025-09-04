import React, { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { EnhancedTable, Column } from "@/components/ui/enhanced-table";
import { SmartStatusBadge } from "@/components/ui/status-system";
import { formatKoreanWon } from "@/lib/utils";
import { 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Mail,
  MailOpen,
  MailX,
  Send,
  Clock,
  FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { BulkDeleteDialog } from "./bulk-delete-dialog";

interface Order {
  id: string;
  orderNumber: string;
  status: string; // Legacy status
  orderStatus?: string; // New dual status - order status
  approvalStatus?: string; // New dual status - approval status
  totalAmount: number;
  orderDate: string;
  deliveryDate: string | null;
  projectName: string | null;
  vendorName: string | null;
  userName: string | null;
  approvalLevel: number | null;
  currentApproverRole: string | null;
  // 시스템 날짜 정보
  createdAt: string;
  updatedAt?: string | null;
  // Email status fields
  emailStatus?: string | null;
  lastSentAt?: string | null;
  totalEmailsSent?: number;
  openedAt?: string | null;
  // Vendor ID for navigation
  vendorId?: string | number | null;
}

interface EnhancedOrdersTableProps {
  orders: Order[];
  isLoading?: boolean;
  isBulkDeleting?: boolean;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onDelete?: (orderId: string) => void;
  onBulkDelete?: (orderIds: string[]) => void;
  onEmailSend?: (order: Order) => void;
  onViewEmailHistory?: (order: Order) => void;
  onViewPdf?: (order: Order) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string) => void;
}

// Status configuration is now handled by the SmartStatusBadge component

export function EnhancedOrdersTable({ 
  orders, 
  isLoading = false,
  isBulkDeleting = false,
  onStatusChange,
  onDelete,
  onBulkDelete,
  onEmailSend,
  onViewEmailHistory,
  onViewPdf,
  sortBy,
  sortOrder,
  onSort
}: EnhancedOrdersTableProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  
  // Multi-select state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  
  // Dialog state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  // Check if user is admin (only admins can use bulk delete)
  const isAdmin = user?.role === 'admin';
  
  // Helper functions for multi-select
  const handleSelectOrder = useCallback((orderId: string, checked: boolean) => {
    setSelectedOrderIds(prev => {
      if (checked) {
        return [...prev, orderId];
      } else {
        return prev.filter(id => id !== orderId);
      }
    });
  }, []);
  
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      // Only select draft orders (only they can be deleted)
      const draftOrderIds = orders
        .filter(order => order.status === 'draft')
        .map(order => order.id);
      setSelectedOrderIds(draftOrderIds);
    } else {
      setSelectedOrderIds([]);
    }
  }, [orders]);
  
  const handleBulkDelete = useCallback(() => {
    if (selectedOrderIds.length > 0) {
      setBulkDeleteDialogOpen(true);
    }
  }, [selectedOrderIds]);
  
  const handleConfirmBulkDelete = useCallback(() => {
    if (onBulkDelete && selectedOrderIds.length > 0) {
      onBulkDelete(selectedOrderIds);
      setSelectedOrderIds([]); // Clear selection after delete
      setBulkDeleteDialogOpen(false);
    }
  }, [onBulkDelete, selectedOrderIds]);
  
  // Get draft orders for selection (only draft orders can be deleted)
  const draftOrders = orders.filter(order => order.status === 'draft');
  const allDraftOrdersSelected = draftOrders.length > 0 && draftOrders.every(order => selectedOrderIds.includes(order.id));
  const someDraftOrdersSelected = draftOrders.some(order => selectedOrderIds.includes(order.id));
  
  // 디버깅: props 확인
  console.log('🔍 EnhancedOrdersTable props:', {
    ordersCount: orders.length,
    onEmailSend: !!onEmailSend,
    onViewPdf: !!onViewPdf,
    onViewEmailHistory: !!onViewEmailHistory,
    onBulkDelete: !!onBulkDelete,
    isAdmin,
    userRole: user?.role,
    userDetails: user ? { id: user.id, name: user.name, email: user.email } : null,
    selectedOrderIds,
    draftOrdersCount: draftOrders.length,
    conditionCheck: isAdmin && onBulkDelete
  });

  // Helper function to render email status
  const renderEmailStatus = (order: Order) => {
    const handleClick = onViewEmailHistory ? () => onViewEmailHistory(order) : undefined;
    if (!order.emailStatus || order.totalEmailsSent === 0) {
      return (
        <Badge 
          variant="outline" 
          className={`text-muted-foreground ${handleClick ? 'cursor-pointer hover:bg-muted' : ''}`}
          onClick={handleClick}
        >
          미발송
        </Badge>
      );
    }

    const emailStatusConfig = {
      sent: { 
        icon: Send, 
        label: "발송됨", 
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        tooltip: order.lastSentAt ? `최근 발송: ${format(new Date(order.lastSentAt), "yyyy.MM.dd HH:mm", { locale: ko })}` : ""
      },
      opened: { 
        icon: MailOpen, 
        label: "열람됨", 
        className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
        tooltip: order.openedAt ? `열람 시간: ${format(new Date(order.openedAt), "yyyy.MM.dd HH:mm", { locale: ko })}` : ""
      },
      clicked: { 
        icon: MailOpen, 
        label: "클릭됨", 
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
        tooltip: "링크 클릭됨"
      },
      failed: { 
        icon: MailX, 
        label: "실패", 
        className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
        tooltip: "발송 실패"
      },
      bounced: { 
        icon: MailX, 
        label: "반송됨", 
        className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
        tooltip: "이메일 반송됨"
      }
    };

    const config = emailStatusConfig[order.emailStatus as keyof typeof emailStatusConfig] || emailStatusConfig.sent;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="secondary" 
              className={`${config.className} ${handleClick ? 'cursor-pointer hover:opacity-80' : ''}`}
              onClick={handleClick}
            >
              {config.label}
              {order.totalEmailsSent && order.totalEmailsSent > 1 && (
                <span className="ml-1">({order.totalEmailsSent})</span>
              )}
            </Badge>
          </TooltipTrigger>
          {config.tooltip && (
            <TooltipContent>
              <p>{config.tooltip}</p>
              {order.totalEmailsSent && order.totalEmailsSent > 1 && (
                <p className="text-xs text-gray-400 mt-1">총 {order.totalEmailsSent}회 발송</p>
              )}
              {handleClick && (
                <p className="text-xs text-gray-400 mt-1">클릭하여 상세 이력 보기</p>
              )}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const columns: Column<Order>[] = [
    // Multi-select checkbox column (only for admins)
    ...(isAdmin && onBulkDelete ? [{
      key: "select" as keyof Order,
      header: (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={allDraftOrdersSelected}
            onCheckedChange={handleSelectAll}
            disabled={draftOrders.length === 0}
            aria-label="모든 발주서 선택"
          />
        </div>
      ),
      width: "40px",
      accessor: (row: Order) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedOrderIds.includes(row.id)}
            onCheckedChange={(checked) => handleSelectOrder(row.id, checked as boolean)}
            disabled={row.status !== 'draft'} // Only draft orders can be selected for deletion
            aria-label={`발주서 ${row.orderNumber} 선택`}
          />
        </div>
      ),
    }] : []),
    {
      key: "orderNumber",
      header: "발주 번호",
      sortable: true,
      searchable: true,
      width: "130px",
      accessor: (row) => (
        <div 
          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            try {
              if (typeof navigate === 'function') {
                navigate(`/orders/${row.id}`);
              } else {
                window.location.href = `/orders/${row.id}`;
              }
            } catch (error) {
              console.error('Navigation error:', error);
              window.location.href = `/orders/${row.id}`;
            }
          }}
        >
          {row.orderNumber}
        </div>
      ),
    },
    {
      key: "status",
      header: "상태",
      sortable: true,
      width: "180px",
      accessor: (row) => {
        // Check if dual status is available
        if (row.orderStatus || row.approvalStatus) {
          // Use the DualStatusBadge component if available
          return (
            <div className="flex gap-1">
              {row.orderStatus && (
                <SmartStatusBadge
                  type="order"
                  status={row.orderStatus}
                  showIcon={false}
                  showTooltip
                  animated
                  size="sm"
                />
              )}
              {row.approvalStatus && row.approvalStatus !== 'not_required' && (
                <SmartStatusBadge
                  type="approval"
                  status={row.approvalStatus}
                  showIcon={false}
                  showTooltip
                  animated
                  size="sm"
                />
              )}
            </div>
          );
        }
        // Fallback to legacy status
        return (
          <SmartStatusBadge
            type="order"
            status={row.status}
            showIcon={false}
            showTooltip
            animated
          />
        );
      },
    },
    {
      key: "emailStatus",
      header: "이메일",
      sortable: true,
      width: "90px",
      accessor: (row) => renderEmailStatus(row),
    },
    {
      key: "projectName",
      header: "현장",
      sortable: true,
      searchable: true,
      width: "160px",
      accessor: (row) => (
        <div className="text-gray-900 dark:text-gray-100">
          {row.projectName || "-"}
        </div>
      ),
    },
    {
      key: "vendorName",
      header: "거래처",
      sortable: true,
      searchable: true,
      width: "140px",
      accessor: (row) => (
        <div className="text-gray-900 dark:text-gray-100">
          {row.vendorName && row.vendorId ? (
            <div 
              className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 cursor-pointer hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                try {
                  if (typeof navigate === 'function') {
                    navigate(`/vendors/${row.vendorId}`);
                  } else {
                    window.location.href = `/vendors/${row.vendorId}`;
                  }
                } catch (error) {
                  console.error('Navigation error:', error);
                  window.location.href = `/vendors/${row.vendorId}`;
                }
              }}
              title="거래처 상세 정보 보기"
            >
              {row.vendorName}
            </div>
          ) : (
            <span>{row.vendorName || "-"}</span>
          )}
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "금액",
      sortable: true,
      align: "right",
      width: "120px",
      accessor: (row) => (
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {formatKoreanWon(row.totalAmount)}
        </div>
      ),
    },
    {
      key: "orderDate",
      header: "발주일",
      sortable: true,
      width: "100px",
      accessor: (row) => (
        <div className="text-gray-600 dark:text-gray-400 text-sm">
          {format(new Date(row.orderDate), "yyyy.MM.dd", { locale: ko })}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "등록일",
      sortable: true,
      width: "130px",
      accessor: (row) => (
        <div className="text-gray-500 dark:text-gray-500 text-xs">
          {format(new Date(row.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
        </div>
      ),
    },
    {
      key: "deliveryDate",
      header: "납기일",
      sortable: true,
      width: "110px",
      accessor: (row) => (
        <div className="text-gray-600 dark:text-gray-400 text-sm">
          {row.deliveryDate 
            ? format(new Date(row.deliveryDate), "yyyy.MM.dd", { locale: ko })
            : "-"
          }
        </div>
      ),
    },
    {
      key: "userName",
      header: "요청자",
      sortable: true,
      searchable: true,
      width: "120px",
      accessor: (row) => (
        <div className="text-gray-600 dark:text-gray-400 text-sm">
          {row.userName || "-"}
        </div>
      ),
    },
    {
      key: "actions",
      header: "액션",
      width: "160px",
      align: "center",
      accessor: (row) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* 상세 보기 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                  onClick={() => {
                    try {
                      if (typeof navigate === 'function') {
                        navigate(`/orders/${row.id}`);
                      } else {
                        window.location.href = `/orders/${row.id}`;
                      }
                    } catch (error) {
                      window.location.href = `/orders/${row.id}`;
                    }
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>상세 보기</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 수정 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20"
                  onClick={() => {
                    try {
                      if (typeof navigate === 'function') {
                        navigate(`/orders/${row.id}/edit`);
                      } else {
                        window.location.href = `/orders/${row.id}/edit`;
                      }
                    } catch (error) {
                      window.location.href = `/orders/${row.id}/edit`;
                    }
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>수정</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* PDF 보기 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20"
                  onClick={() => {
                    if (onViewPdf) {
                      onViewPdf(row);
                    }
                  }}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>PDF 보기</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 이메일 - 강제 표시 및 디버깅 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20 border border-purple-200"
                  onClick={() => {
                    console.log('🔍 이메일 버튼 클릭됨', { row, onEmailSend: !!onEmailSend });
                    if (onEmailSend) {
                      onEmailSend(row);
                    } else {
                      alert('이메일 전송 기능이 설정되지 않았습니다.');
                    }
                  }}
                  style={{ backgroundColor: 'rgba(147, 51, 234, 0.1)' }}
                >
                  <Mail className="h-4 w-4 text-purple-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>이메일 전송 (Debug)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar - Only show for admins when orders are selected */}
      {isAdmin && onBulkDelete && selectedOrderIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedOrderIds.length}개의 발주서가 선택됨
            </span>
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              임시저장 상태만 삭제 가능
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedOrderIds([])}
              className="text-gray-600 dark:text-gray-400"
            >
              선택 해제
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              선택된 발주서 삭제
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Table */}
      <EnhancedTable
        data={orders}
        columns={columns}
        searchable
        searchPlaceholder="발주 번호, 프로젝트, 거래처, 요청자로 검색..."
        showPagination
        pageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
        onRowClick={(row) => {
          try {
            if (typeof navigate === 'function') {
              navigate(`/orders/${row.id}`);
            } else {
              window.location.href = `/orders/${row.id}`;
            }
          } catch (error) {
            window.location.href = `/orders/${row.id}`;
          }
        }}
        rowKey={(row) => row.id}
        emptyMessage="등록된 발주서가 없습니다"
        isLoading={isLoading}
        stickyHeader
        maxHeight="calc(100vh - 300px)"
        className="shadow-sm"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={onSort}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <BulkDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedOrders={orders.filter(order => selectedOrderIds.includes(order.id))}
        onConfirm={handleConfirmBulkDelete}
        isLoading={isBulkDeleting}
      />
    </div>
  );
}