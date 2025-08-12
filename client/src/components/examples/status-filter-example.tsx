import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, AnimatedStatusBadge, OrderStatusBadge } from "@/components/ui/status-badge";
import { FilterTag, FilterTagGroup, CompoundFilterDisplay } from "@/components/ui/filter-tag";
import { SmartStatusBadge, StatusIndicator, StatusTimeline, STATUS_CONFIGS } from "@/components/ui/status-system";
import { 
  User, 
  Building2, 
  Calendar, 
  DollarSign,
  Filter,
  RefreshCw,
  Plus,
  Trash2
} from "lucide-react";

export function StatusFilterExample() {
  const [currentOrderStatus, setCurrentOrderStatus] = useState("draft");
  const [prevOrderStatus, setPrevOrderStatus] = useState("");
  const [filters, setFilters] = useState([
    { id: "status", label: "상태: 승인 대기", value: "pending", variant: "warning" as const, count: 5 },
    { id: "user", label: "담당자: 김철수", value: "kim", icon: User },
    { id: "date", label: "날짜: 2024년 1월", value: "2024-01", icon: Calendar },
  ]);

  const [compoundFilters, setCompoundFilters] = useState([
    {
      id: "status",
      type: "multi" as const,
      label: "상태",
      value: ["pending", "approved"],
      displayValue: "승인 대기, 승인됨",
      variant: "primary" as const,
    },
    {
      id: "amount",
      type: "range" as const,
      label: "금액",
      value: [1000000, 5000000],
      displayValue: "100만원 - 500만원",
      icon: DollarSign,
      variant: "info" as const,
    },
    {
      id: "vendor",
      type: "single" as const,
      label: "거래처",
      value: "vendor1",
      displayValue: "㈜익진건설",
      icon: Building2,
      variant: "success" as const,
    },
  ]);

  const statusTimeline = [
    {
      status: "approved",
      timestamp: new Date(),
      user: "관리자",
      comment: "모든 조건을 만족하여 승인되었습니다.",
    },
    {
      status: "pending",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      user: "김철수",
      comment: "검토를 위해 제출되었습니다.",
    },
    {
      status: "draft",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      user: "이영희",
      comment: "발주서 초안이 작성되었습니다.",
    },
  ];

  const changeOrderStatus = (newStatus: string) => {
    setPrevOrderStatus(currentOrderStatus);
    setCurrentOrderStatus(newStatus);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const clearAllFilters = () => {
    setFilters([]);
  };

  const removeCompoundFilter = (id: string) => {
    setCompoundFilters(compoundFilters.filter(f => f.id !== id));
  };

  const clearAllCompoundFilters = () => {
    setCompoundFilters([]);
  };

  const addRandomFilter = () => {
    const randomFilters = [
      { id: `priority-${Date.now()}`, label: "우선순위: 높음", value: "high", variant: "warning" as const },
      { id: `project-${Date.now()}`, label: "프로젝트: 신축공사", value: "project1", icon: Building2 },
      { id: `amount-${Date.now()}`, label: "금액: 1000만원 이상", value: "10000000+", icon: DollarSign },
    ];
    
    const randomFilter = randomFilters[Math.floor(Math.random() * randomFilters.length)];
    setFilters([...filters, randomFilter]);
  };

  return (
    <div className="max-w-[1366px] mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Status Badge System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Status Badges */}
            <div>
              <h4 className="text-sm font-medium mb-3">Basic Status Badges</h4>
              <div className="flex flex-wrap gap-2">
                <StatusBadge variant="default">기본</StatusBadge>
                <StatusBadge variant="primary">주요</StatusBadge>
                <StatusBadge variant="success">성공</StatusBadge>
                <StatusBadge variant="warning">경고</StatusBadge>
                <StatusBadge variant="danger">위험</StatusBadge>
                <StatusBadge variant="info">정보</StatusBadge>
              </div>
            </div>

            {/* Status Badges with Icons */}
            <div>
              <h4 className="text-sm font-medium mb-3">With Icons</h4>
              <div className="flex flex-wrap gap-2">
                <StatusBadge variant="success" icon={User}>활성 사용자</StatusBadge>
                <StatusBadge variant="warning" icon={Calendar} pulse>대기 중</StatusBadge>
                <StatusBadge variant="info" icon={Building2}>거래처</StatusBadge>
              </div>
            </div>

            {/* Smart Status Badges */}
            <div>
              <h4 className="text-sm font-medium mb-3">Smart Status System</h4>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">발주서 상태:</span>
                  {Object.keys(STATUS_CONFIGS.order).map((status) => (
                    <SmartStatusBadge
                      key={status}
                      type="order"
                      status={status}
                      showTooltip
                    />
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">우선순위:</span>
                  {Object.keys(STATUS_CONFIGS.priority).map((priority) => (
                    <SmartStatusBadge
                      key={priority}
                      type="priority"
                      status={priority}
                      showTooltip
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Animated Status Change */}
            <div>
              <h4 className="text-sm font-medium mb-3">Animated Status Changes</h4>
              <div className="flex items-center gap-3">
                <AnimatedStatusBadge
                  variant="primary"
                  prevStatus={prevOrderStatus}
                >
                  {STATUS_CONFIGS.order[currentOrderStatus as keyof typeof STATUS_CONFIGS.order]?.label || currentOrderStatus}
                </AnimatedStatusBadge>
                
                <div className="flex gap-1">
                  {Object.keys(STATUS_CONFIGS.order).slice(0, 4).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant="outline"
                      onClick={() => changeOrderStatus(status)}
                      className="text-xs"
                    >
                      {STATUS_CONFIGS.order[status as keyof typeof STATUS_CONFIGS.order].label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Filter Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Filter Tags */}
            <div>
              <h4 className="text-sm font-medium mb-3">Basic Filter Tags</h4>
              <div className="flex flex-wrap gap-2">
                <FilterTag variant="default">기본 필터</FilterTag>
                <FilterTag variant="primary" active>활성 필터</FilterTag>
                <FilterTag variant="success" removable onRemove={() => console.log("Remove filter")}>
                  제거 가능
                </FilterTag>
                <FilterTag variant="info" count={15}>카운트 표시</FilterTag>
              </div>
            </div>

            {/* Filter Tags with Icons */}
            <div>
              <h4 className="text-sm font-medium mb-3">With Icons</h4>
              <div className="flex flex-wrap gap-2">
                <FilterTag variant="primary" icon={User} count={3}>
                  사용자
                </FilterTag>
                <FilterTag variant="success" icon={Building2} removable onRemove={() => {}}>
                  거래처
                </FilterTag>
                <FilterTag variant="warning" icon={Calendar}>
                  날짜 범위
                </FilterTag>
              </div>
            </div>

            {/* Filter Tag Group */}
            <div>
              <h4 className="text-sm font-medium mb-3">Filter Group Management</h4>
              <div className="space-y-3">
                <FilterTagGroup
                  filters={filters}
                  onRemove={removeFilter}
                  onClearAll={clearAllFilters}
                />
                
                <div className="flex gap-2">
                  <Button size="sm" onClick={addRandomFilter}>
                    <Plus className="h-4 w-4 mr-1" />
                    필터 추가
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearAllFilters}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    전체 해제
                  </Button>
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div>
              <h4 className="text-sm font-medium mb-3">Status Indicators (Compact)</h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <StatusIndicator type="order" status="pending" />
                  <span className="text-sm">대기 중</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIndicator type="order" status="approved" />
                  <span className="text-sm">승인됨</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIndicator type="priority" status="urgent" />
                  <span className="text-sm">긴급</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compound Filter Display */}
      <Card>
        <CardHeader>
          <CardTitle>Compound Filter Display</CardTitle>
        </CardHeader>
        <CardContent>
          <CompoundFilterDisplay
            title="현재 적용된 필터"
            filters={compoundFilters}
            onFilterChange={(id, value) => console.log(`Filter ${id} changed:`, value)}
            onFilterRemove={removeCompoundFilter}
            onClearAll={clearAllCompoundFilters}
          />
          
          {compoundFilters.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Filter className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>적용된 필터가 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTimeline
            type="order"
            items={statusTimeline}
          />
        </CardContent>
      </Card>

      {/* Real-world Example: Order Management */}
      <Card>
        <CardHeader>
          <CardTitle>실제 예시: 발주서 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample order list */}
            {[
              { id: "PO-001", vendor: "㈜익진건설", status: "pending", priority: "high", amount: "2,500만원" },
              { id: "PO-002", vendor: "대한산업", status: "approved", priority: "normal", amount: "1,200만원" },
              { id: "PO-003", vendor: "신성건설", status: "sent", priority: "urgent", amount: "3,800만원" },
            ].map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{order.id}</span>
                  <span className="text-gray-600">{order.vendor}</span>
                  <span className="text-gray-500">{order.amount}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <SmartStatusBadge
                    type="priority"
                    status={order.priority}
                    size="sm"
                  />
                  <SmartStatusBadge
                    type="order"
                    status={order.status}
                    animated
                    showTooltip
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}