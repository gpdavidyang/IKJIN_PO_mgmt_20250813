import React from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { EnhancedTable, Column } from "@/components/ui/enhanced-table";
import { SmartStatusBadge } from "@/components/ui/status-system";
import { formatKoreanWon } from "@/lib/utils";
import { 
  MoreVertical 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  orderDate: string;
  deliveryDate: string | null;
  projectName: string | null;
  vendorName: string | null;
  userName: string | null;
  approvalLevel: number | null;
  currentApproverRole: string | null;
}

interface EnhancedOrdersTableProps {
  orders: Order[];
  isLoading?: boolean;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onDelete?: (orderId: string) => void;
}

// Status configuration is now handled by the SmartStatusBadge component

export function EnhancedOrdersTable({ 
  orders, 
  isLoading = false,
  onStatusChange,
  onDelete 
}: EnhancedOrdersTableProps) {
  const [, navigate] = useLocation();

  const columns: Column<Order>[] = [
    {
      key: "orderNumber",
      header: "발주 번호",
      sortable: true,
      searchable: true,
      width: "150px",
      accessor: (row) => (
        <div className="font-medium text-primary-600 hover:text-primary-700">
          {row.orderNumber}
        </div>
      ),
    },
    {
      key: "status",
      header: "상태",
      sortable: true,
      width: "140px",
      accessor: (row) => (
        <SmartStatusBadge
          type="order"
          status={row.status}
          showTooltip
          animated
        />
      ),
    },
    {
      key: "projectName",
      header: "프로젝트",
      sortable: true,
      searchable: true,
      accessor: (row) => (
        <div className="text-gray-900">
          {row.projectName || "-"}
        </div>
      ),
    },
    {
      key: "vendorName",
      header: "거래처",
      sortable: true,
      searchable: true,
      accessor: (row) => (
        <div className="text-gray-900">
          {row.vendorName || "-"}
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "금액",
      sortable: true,
      align: "right",
      width: "150px",
      accessor: (row) => (
        <div className="font-medium text-gray-900">
          {formatKoreanWon(row.totalAmount)}
        </div>
      ),
    },
    {
      key: "orderDate",
      header: "발주일",
      sortable: true,
      width: "120px",
      accessor: (row) => (
        <div className="text-gray-600 text-sm">
          {format(new Date(row.orderDate), "yyyy.MM.dd", { locale: ko })}
        </div>
      ),
    },
    {
      key: "deliveryDate",
      header: "납품예정일",
      sortable: true,
      width: "120px",
      accessor: (row) => (
        <div className="text-gray-600 text-sm">
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
      width: "100px",
      accessor: (row) => (
        <div className="text-gray-600 text-sm">
          {row.userName || "-"}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "60px",
      align: "center",
      accessor: (row) => (
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
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/orders/${row.id}`);
              }}
            >
              상세 보기
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/orders/${row.id}/edit`);
              }}
            >
              수정
            </DropdownMenuItem>
            
            {onStatusChange && row.status === "draft" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(row.id, "pending");
                  }}
                  className="text-primary-600"
                >
                  승인 요청
                </DropdownMenuItem>
              </>
            )}
            
            {onStatusChange && row.status === "pending" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(row.id, "approved");
                  }}
                  className="text-green-600"
                >
                  승인
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(row.id, "rejected");
                  }}
                  className="text-red-600"
                >
                  거절
                </DropdownMenuItem>
              </>
            )}
            
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("정말로 이 발주서를 삭제하시겠습니까?")) {
                      onDelete(row.id);
                    }
                  }}
                  className="text-red-600"
                >
                  삭제
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <EnhancedTable
      data={orders}
      columns={columns}
      searchable
      searchPlaceholder="발주 번호, 프로젝트, 거래처, 요청자로 검색..."
      showPagination
      pageSize={20}
      pageSizeOptions={[10, 20, 50, 100]}
      onRowClick={(row) => navigate(`/orders/${row.id}`)}
      rowKey={(row) => row.id}
      emptyMessage="등록된 발주서가 없습니다"
      isLoading={isLoading}
      stickyHeader
      maxHeight="calc(100vh - 300px)"
      className="shadow-sm"
    />
  );
}