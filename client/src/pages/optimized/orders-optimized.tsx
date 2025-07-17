/**
 * Optimized Orders Page with performance enhancements
 */

import React, { useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptimizedDataTable } from "@/components/optimized/OptimizedDataTable";
import { useOptimizedQuery } from "@/hooks/use-optimized-query";
import { formatKoreanWon } from "@/utils/formatters";
import { format } from "date-fns";
import { FileText, Calendar, User, Building, DollarSign, Package } from "lucide-react";

// Types
interface Order {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  orderDate: string;
  projectName?: string;
  vendorName?: string;
  userName?: string;
}

interface OrdersPageProps {
  className?: string;
}

/**
 * Optimized Orders Page Component
 */
export function OrdersOptimized({ className }: OrdersPageProps) {
  const [, navigate] = useLocation();
  const [filters, setFilters] = useState({
    status: "all",
    vendor: "all",
    project: "all",
    dateRange: "3months",
  });

  // Optimized data fetching
  const { data: ordersData, isLoading: ordersLoading } = useOptimizedQuery({
    queryKey: ["/api/orders", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "all") params.append(key, value);
      });
      const response = await fetch(`/api/orders?${params}`);
      return response.json();
    },
  });

  const { data: vendorsData } = useOptimizedQuery({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await fetch("/api/vendors");
      return response.json();
    },
  });

  const { data: projectsData } = useOptimizedQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      return response.json();
    },
  });

  // Memoized filter options
  const filterOptions = useMemo(() => ({
    status: [
      { label: "임시저장", value: "draft" },
      { label: "승인 대기중", value: "pending" },
      { label: "승인 완료", value: "approved" },
      { label: "발주 완료", value: "completed" },
      { label: "전송됨", value: "sent" },
    ],
    vendor: vendorsData?.map((vendor: any) => ({
      label: vendor.name,
      value: vendor.id.toString(),
    })) || [],
    project: projectsData?.map((project: any) => ({
      label: project.projectName,
      value: project.id.toString(),
    })) || [],
  }), [vendorsData, projectsData]);

  // Memoized table columns
  const columns = useMemo<ColumnDef<Order>[]>(() => [
    {
      accessorKey: "orderNumber",
      header: "발주번호",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
            {row.getValue("orderNumber")}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusConfig = {
          draft: { label: "임시저장", variant: "secondary" as const },
          pending: { label: "승인 대기중", variant: "default" as const },
          approved: { label: "승인 완료", variant: "default" as const },
          completed: { label: "발주 완료", variant: "default" as const },
          sent: { label: "전송됨", variant: "default" as const },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "secondary" as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: "projectName",
      header: "현장",
      cell: ({ row }) => {
        const projectName = row.getValue("projectName") as string;
        return projectName ? (
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-gray-500" />
            <span>{projectName}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: "vendorName",
      header: "거래처",
      cell: ({ row }) => {
        const vendorName = row.getValue("vendorName") as string;
        return vendorName ? (
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-gray-500" />
            <span>{vendorName}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: "totalAmount",
      header: "총액",
      cell: ({ row }) => {
        const amount = row.getValue("totalAmount") as number;
        return (
          <div className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-blue-600">
              {formatKoreanWon(amount)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "orderDate",
      header: "발주일",
      cell: ({ row }) => {
        const date = row.getValue("orderDate") as string;
        return (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{format(new Date(date), "yyyy-MM-dd")}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "userName",
      header: "작성자",
      cell: ({ row }) => {
        const userName = row.getValue("userName") as string;
        return userName ? (
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span>{userName}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
  ], []);

  // Optimized row click handler
  const handleRowClick = useCallback((order: Order) => {
    navigate(`/orders/${order.id}`);
  }, [navigate]);

  // Statistics calculation
  const statistics = useMemo(() => {
    if (!ordersData?.orders) return null;
    
    const orders = ordersData.orders;
    const totalAmount = orders.reduce((sum: number, order: Order) => sum + (order.totalAmount || 0), 0);
    const statusCounts = orders.reduce((acc: Record<string, number>, order: Order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total: orders.length,
      totalAmount,
      draft: statusCounts.draft || 0,
      pending: statusCounts.pending || 0,
      approved: statusCounts.approved || 0,
      completed: statusCounts.completed || 0,
    };
  }, [ordersData]);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">발주서 관리</h1>
          <p className="text-gray-600">발주서를 조회하고 관리하세요</p>
        </div>
        <Button onClick={() => navigate("/create-order")}>
          새 발주서 작성
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">총 발주서</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold">{statistics.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">총 금액</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold text-blue-600">
                {formatKoreanWon(statistics.totalAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">임시저장</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold text-gray-500">{statistics.draft}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">승인 대기</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">승인 완료</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold text-green-600">{statistics.approved}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Optimized Data Table */}
      <OptimizedDataTable
        columns={columns}
        data={ordersData?.orders || []}
        searchKey="orderNumber"
        searchPlaceholder="발주번호로 검색..."
        filters={[
          { key: "status", label: "상태", options: filterOptions.status },
          { key: "vendor", label: "거래처", options: filterOptions.vendor },
          { key: "project", label: "현장", options: filterOptions.project },
        ]}
        onRowClick={handleRowClick}
        isLoading={ordersLoading}
        emptyMessage="발주서가 없습니다"
        className={className}
      />
    </div>
  );
}