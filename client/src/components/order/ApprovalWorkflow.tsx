import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle, AlertTriangle, Save, Mail } from "lucide-react";
import type { ApprovalStatus } from "@shared/order-types";

interface ApprovalWorkflowProps {
  approvalStatus: ApprovalStatus;
  onStatusChange: (status: ApprovalStatus) => void;
  onSaveDraft: () => void;
  onSendEmail: () => void;
  onRequestApproval: () => void;
  onSkipApproval: () => void;
}

export default function ApprovalWorkflow({
  approvalStatus,
  onStatusChange,
  onSaveDraft,
  onSendEmail,
  onRequestApproval,
  onSkipApproval
}: ApprovalWorkflowProps) {
  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            작성중
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            승인 대기중
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            승인 완료
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            승인 반려
          </Badge>
        );
      case "skipped":
        return (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            승인 생략
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="bg-gray-50 border-b">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
          승인 워크플로우
          {getStatusBadge(approvalStatus)}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={onSaveDraft}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            임시저장
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onSendEmail}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            이메일 발송
          </Button>
          
          <Button 
            variant="default" 
            onClick={onRequestApproval}
            className="gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            승인 요청
          </Button>
          
          <Button 
            variant="default" 
            onClick={onSkipApproval}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            승인 생략
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}