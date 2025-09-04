import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Save, 
  Mail, 
  Send,
  Shield,
  User,
  ArrowRight,
  Info,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OrderStatus, ApprovalStatus, AuthorityCheck } from "@shared/order-types";

interface ApprovalWorkflowIntegratedProps {
  orderStatus: OrderStatus;
  approvalStatus: ApprovalStatus;
  totalAmount: number;
  onCreateOrder: (skipApproval?: boolean) => Promise<void>;
  onSaveDraft: () => Promise<void>;
  onCheckAuthority?: (amount: number) => Promise<AuthorityCheck>;
}

export default function ApprovalWorkflowIntegrated({
  orderStatus,
  approvalStatus,
  totalAmount,
  onCreateOrder,
  onSaveDraft,
  onCheckAuthority
}: ApprovalWorkflowIntegratedProps) {
  const [loading, setLoading] = useState(false);
  const [authorityCheck, setAuthorityCheck] = useState<AuthorityCheck | null>(null);
  const [showApprovalGuide, setShowApprovalGuide] = useState(false);
  const [checkingAuthority, setCheckingAuthority] = useState(false);

  // Check authority when amount changes
  useEffect(() => {
    if (onCheckAuthority && totalAmount > 0) {
      checkAuthority();
    }
  }, [totalAmount]);

  const checkAuthority = async () => {
    if (!onCheckAuthority) return;
    
    setCheckingAuthority(true);
    try {
      const result = await onCheckAuthority(totalAmount);
      setAuthorityCheck(result);
    } catch (error) {
      console.error("Failed to check authority:", error);
    } finally {
      setCheckingAuthority(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!authorityCheck) {
      await checkAuthority();
      return;
    }

    if (authorityCheck.requiresApproval && !authorityCheck.canDirectApprove) {
      // Show approval guide
      setShowApprovalGuide(true);
    } else {
      // Direct creation possible
      setLoading(true);
      try {
        await onCreateOrder(authorityCheck.canDirectApprove);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleProceedWithApproval = async () => {
    setShowApprovalGuide(false);
    setLoading(true);
    try {
      await onCreateOrder(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      await onSaveDraft();
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      draft: { variant: "secondary" as const, icon: Clock, label: "임시저장" },
      created: { variant: "default" as const, icon: CheckCircle, label: "발주서 생성" },
      sent: { variant: "default" as const, icon: Mail, label: "발송완료", className: "bg-blue-500" },
      delivered: { variant: "default" as const, icon: CheckCircle, label: "납품완료", className: "bg-green-500" }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`gap-1 ${config.className || ''}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getApprovalStatusBadge = (status: ApprovalStatus) => {
    const statusConfig = {
      not_required: { variant: "outline" as const, icon: Shield, label: "승인불필요" },
      pending: { variant: "outline" as const, icon: Clock, label: "승인대기" },
      approved: { variant: "default" as const, icon: CheckCircle, label: "승인완료", className: "bg-green-500" },
      rejected: { variant: "destructive" as const, icon: AlertTriangle, label: "반려" }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`gap-1 ${config.className || ''}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
            <span>승인 워크플로우</span>
            <div className="flex gap-2">
              {getOrderStatusBadge(orderStatus)}
              {getApprovalStatusBadge(approvalStatus)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Authority Status */}
          {authorityCheck && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {authorityCheck.canDirectApprove ? (
                  <span className="text-green-600 font-medium">
                    직접 승인 가능 (한도: {authorityCheck.directApproveLimit?.toLocaleString()}원)
                  </span>
                ) : authorityCheck.requiresApproval ? (
                  <span className="text-orange-600 font-medium">
                    승인 필요 (다음 승인자: {authorityCheck.nextApprover || '확인중'})
                  </span>
                ) : (
                  <span className="text-blue-600 font-medium">
                    자동 승인 대상
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={loading}
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              임시저장
            </Button>

            <Button 
              variant="default" 
              onClick={handleCreateOrder}
              disabled={loading || checkingAuthority}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading || checkingAuthority ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {authorityCheck?.canDirectApprove ? "발주서 생성 (직접 승인)" : "발주서 생성"}
            </Button>
          </div>

          {/* Workflow Progress Indicator */}
          {orderStatus !== "draft" && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">워크플로우 진행상황</h4>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    orderStatus !== "draft" ? "bg-green-500 text-white" : "bg-gray-300"
                  }`}>
                    1
                  </div>
                  <span className="ml-2 text-xs text-gray-600">작성</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    approvalStatus === "approved" || approvalStatus === "not_required" 
                      ? "bg-green-500 text-white" 
                      : approvalStatus === "pending" 
                        ? "bg-yellow-500 text-white"
                        : "bg-gray-300"
                  }`}>
                    2
                  </div>
                  <span className="ml-2 text-xs text-gray-600">승인</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    orderStatus === "sent" ? "bg-green-500 text-white" : "bg-gray-300"
                  }`}>
                    3
                  </div>
                  <span className="ml-2 text-xs text-gray-600">발송</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    orderStatus === "delivered" ? "bg-green-500 text-white" : "bg-gray-300"
                  }`}>
                    4
                  </div>
                  <span className="ml-2 text-xs text-gray-600">납품</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Guide Modal */}
      <Dialog open={showApprovalGuide} onOpenChange={setShowApprovalGuide}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>승인 프로세스 안내</DialogTitle>
            <DialogDescription>
              이 발주서는 승인 과정이 필요합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <strong>다음 승인자:</strong> {authorityCheck?.nextApprover || "확인중"}
                </AlertDescription>
              </Alert>
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>예상 소요 시간:</strong> 2-4 시간
                </AlertDescription>
              </Alert>
              <div className="text-sm text-gray-600">
                발주서 생성 후 승인자에게 자동으로 알림이 발송됩니다.
                승인이 완료되면 거래처로 자동 발송됩니다.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalGuide(false)}>
              취소
            </Button>
            <Button onClick={handleProceedWithApproval}>
              승인 요청하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}