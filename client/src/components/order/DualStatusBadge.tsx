import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  Mail, 
  Package,
  Shield,
  AlertTriangle,
  XCircle
} from "lucide-react";
import type { OrderStatus, ApprovalStatus } from "@shared/order-types";

interface DualStatusBadgeProps {
  orderStatus: OrderStatus;
  approvalStatus: ApprovalStatus;
  compact?: boolean;
}

export default function DualStatusBadge({ 
  orderStatus, 
  approvalStatus, 
  compact = false 
}: DualStatusBadgeProps) {
  
  const getOrderStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case "draft":
        return {
          icon: Clock,
          label: compact ? "임시" : "임시저장",
          className: "bg-gray-100 text-gray-700 border-gray-300"
        };
      case "created":
        return {
          icon: CheckCircle,
          label: compact ? "생성" : "발주서 생성",
          className: "bg-blue-100 text-blue-700 border-blue-300"
        };
      case "sent":
        return {
          icon: Mail,
          label: compact ? "발송" : "발송완료",
          className: "bg-indigo-100 text-indigo-700 border-indigo-300"
        };
      case "delivered":
        return {
          icon: Package,
          label: compact ? "납품" : "납품완료",
          className: "bg-green-100 text-green-700 border-green-300"
        };
      default:
        return {
          icon: Clock,
          label: status,
          className: "bg-gray-100 text-gray-700"
        };
    }
  };
  
  const getApprovalStatusConfig = (status: ApprovalStatus) => {
    switch (status) {
      case "not_required":
        return {
          icon: Shield,
          label: compact ? "불필요" : "승인불필요",
          className: "bg-gray-100 text-gray-600 border-gray-300"
        };
      case "pending":
        return {
          icon: Clock,
          label: compact ? "대기" : "승인대기",
          className: "bg-yellow-100 text-yellow-700 border-yellow-300"
        };
      case "approved":
        return {
          icon: CheckCircle,
          label: compact ? "승인" : "승인완료",
          className: "bg-green-100 text-green-700 border-green-300"
        };
      case "rejected":
        return {
          icon: XCircle,
          label: compact ? "반려" : "반려",
          className: "bg-red-100 text-red-700 border-red-300"
        };
      default:
        return {
          icon: Shield,
          label: status,
          className: "bg-gray-100 text-gray-600"
        };
    }
  };
  
  const orderConfig = getOrderStatusConfig(orderStatus);
  const approvalConfig = getApprovalStatusConfig(approvalStatus);
  const OrderIcon = orderConfig.icon;
  const ApprovalIcon = approvalConfig.icon;
  
  if (compact) {
    // Compact mode for table cells
    return (
      <div className="flex gap-1">
        <Badge variant="outline" className={`${orderConfig.className} px-2 py-0.5 text-xs`}>
          <OrderIcon className="h-3 w-3 mr-1" />
          {orderConfig.label}
        </Badge>
        {approvalStatus !== "not_required" && (
          <Badge variant="outline" className={`${approvalConfig.className} px-2 py-0.5 text-xs`}>
            <ApprovalIcon className="h-3 w-3 mr-1" />
            {approvalConfig.label}
          </Badge>
        )}
      </div>
    );
  }
  
  // Full mode for detail views
  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 font-medium">발주 상태</span>
        <Badge variant="outline" className={`${orderConfig.className} px-3 py-1`}>
          <OrderIcon className="h-4 w-4 mr-1.5" />
          {orderConfig.label}
        </Badge>
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 font-medium">승인 상태</span>
        <Badge variant="outline" className={`${approvalConfig.className} px-3 py-1`}>
          <ApprovalIcon className="h-4 w-4 mr-1.5" />
          {approvalConfig.label}
        </Badge>
      </div>
    </div>
  );
}