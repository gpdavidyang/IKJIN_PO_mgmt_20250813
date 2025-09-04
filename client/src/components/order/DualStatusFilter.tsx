import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { OrderStatus, ApprovalStatus } from "@shared/order-types";

interface DualStatusFilterProps {
  selectedOrderStatuses: OrderStatus[];
  selectedApprovalStatuses: ApprovalStatus[];
  onOrderStatusChange: (statuses: OrderStatus[]) => void;
  onApprovalStatusChange: (statuses: ApprovalStatus[]) => void;
}

export default function DualStatusFilter({
  selectedOrderStatuses,
  selectedApprovalStatuses,
  onOrderStatusChange,
  onApprovalStatusChange
}: DualStatusFilterProps) {
  
  const orderStatusOptions: { value: OrderStatus; label: string; color: string }[] = [
    { value: "draft", label: "임시저장", color: "bg-gray-500" },
    { value: "created", label: "발주서 생성", color: "bg-blue-500" },
    { value: "sent", label: "발송완료", color: "bg-indigo-500" },
    { value: "delivered", label: "납품완료", color: "bg-green-500" },
  ];
  
  const approvalStatusOptions: { value: ApprovalStatus; label: string; color: string }[] = [
    { value: "not_required", label: "승인불필요", color: "bg-gray-400" },
    { value: "pending", label: "승인대기", color: "bg-yellow-500" },
    { value: "approved", label: "승인완료", color: "bg-green-500" },
    { value: "rejected", label: "반려", color: "bg-red-500" },
  ];
  
  const handleOrderStatusToggle = (status: OrderStatus) => {
    if (selectedOrderStatuses.includes(status)) {
      onOrderStatusChange(selectedOrderStatuses.filter(s => s !== status));
    } else {
      onOrderStatusChange([...selectedOrderStatuses, status]);
    }
  };
  
  const handleApprovalStatusToggle = (status: ApprovalStatus) => {
    if (selectedApprovalStatuses.includes(status)) {
      onApprovalStatusChange(selectedApprovalStatuses.filter(s => s !== status));
    } else {
      onApprovalStatusChange([...selectedApprovalStatuses, status]);
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Order Status Filter */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold">발주 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {orderStatusOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <Checkbox
                id={`order-${option.value}`}
                checked={selectedOrderStatuses.includes(option.value)}
                onCheckedChange={() => handleOrderStatusToggle(option.value)}
              />
              <Label
                htmlFor={`order-${option.value}`}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className={`w-2 h-2 rounded-full ${option.color}`} />
                {option.label}
                {selectedOrderStatuses.includes(option.value) && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    선택됨
                  </Badge>
                )}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* Approval Status Filter */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold">승인 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvalStatusOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <Checkbox
                id={`approval-${option.value}`}
                checked={selectedApprovalStatuses.includes(option.value)}
                onCheckedChange={() => handleApprovalStatusToggle(option.value)}
              />
              <Label
                htmlFor={`approval-${option.value}`}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className={`w-2 h-2 rounded-full ${option.color}`} />
                {option.label}
                {selectedApprovalStatuses.includes(option.value) && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    선택됨
                  </Badge>
                )}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}