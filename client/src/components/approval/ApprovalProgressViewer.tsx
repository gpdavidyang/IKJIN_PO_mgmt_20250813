import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  ChevronRight,
  Loader2,
  SkipForward,
  UserCheck,
  FileText,
  DollarSign,
  Building,
  Shield
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatKoreanWon } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ApprovalStep {
  id: number;
  stepOrder: number;
  requiredRole: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'skipped';
  approverName?: string;
  approverId?: string;
  approvedAt?: string;
  rejectedAt?: string;
  note?: string;
  minAmount: number;
  maxAmount?: number;
  canSkip: boolean;
  isOptional: boolean;
}

interface ApprovalProgress {
  orderId: number;
  orderNumber: string;
  totalAmount: number;
  currentStep: number;
  totalSteps: number;
  progressPercentage: number;
  approvalMode: 'direct' | 'staged';
  steps: ApprovalStep[];
  estimatedCompletionTime?: string;
  nextApprover?: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ApprovalProgressViewerProps {
  orderId: number;
  onApprove?: (stepId: number) => void;
  onReject?: (stepId: number) => void;
  showActions?: boolean;
  className?: string;
}

const roleLabels: Record<string, string> = {
  admin: '관리자',
  executive: '임원',
  hq_management: '본사 관리',
  project_manager: '프로젝트 매니저',
  field_worker: '현장 작업자'
};

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  executive: 'bg-red-100 text-red-700 border-red-200',
  hq_management: 'bg-blue-100 text-blue-700 border-blue-200',
  project_manager: 'bg-green-100 text-green-700 border-green-200',
  field_worker: 'bg-gray-100 text-gray-700 border-gray-200'
};

export function ApprovalProgressViewer({
  orderId,
  onApprove,
  onReject,
  showActions = false,
  className = ''
}: ApprovalProgressViewerProps) {
  const [selectedStep, setSelectedStep] = useState<ApprovalStep | null>(null);

  // Fetch approval progress
  const { data: progress, isLoading, error, refetch } = useQuery<ApprovalProgress>({
    queryKey: ['approval-progress', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/approvals/${orderId}/progress`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch approval progress');
      }
      
      return response.json();
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const getStepIcon = (step: ApprovalStep) => {
    switch (step.status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'skipped':
        return <SkipForward className="h-5 w-5 text-gray-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  const getStepStatusBadge = (status: ApprovalStep['status']) => {
    const statusConfig = {
      pending: { label: '대기', variant: 'outline' as const, className: 'border-gray-300' },
      in_progress: { label: '진행중', variant: 'default' as const, className: 'bg-blue-500' },
      approved: { label: '승인', variant: 'default' as const, className: 'bg-green-500' },
      rejected: { label: '반려', variant: 'destructive' as const, className: '' },
      skipped: { label: '건너뜀', variant: 'secondary' as const, className: '' }
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return format(date, 'yyyy-MM-dd HH:mm', { locale: ko });
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: ko 
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error || !progress) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              승인 진행 상황을 불러올 수 없습니다.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const currentStepData = progress.steps.find(s => s.status === 'in_progress');
  const hasRejection = progress.steps.some(s => s.status === 'rejected');

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              승인 진행 상황
            </CardTitle>
            <div className="flex items-center gap-2">
              {progress.approvalMode === 'staged' && (
                <Badge variant="outline" className="bg-blue-50">
                  단계별 승인
                </Badge>
              )}
              <Badge variant="outline">
                {progress.currentStep}/{progress.totalSteps} 단계
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">진행률</span>
              <span className="font-medium">{progress.progressPercentage}%</span>
            </div>
            <Progress value={progress.progressPercentage} className="h-2" />
          </div>

          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">발주번호</p>
                <p className="text-sm font-medium">{progress.orderNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">총 금액</p>
                <p className="text-sm font-medium text-blue-600">
                  {formatKoreanWon(progress.totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Current Status Alert */}
          {currentStepData && !hasRejection && (
            <Alert className="bg-blue-50 border-blue-200">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>{roleLabels[currentStepData.requiredRole]}</strong> 승인 대기 중
                {progress.nextApprover && (
                  <span className="block mt-1 text-sm">
                    담당자: {progress.nextApprover.name} ({progress.nextApprover.email})
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {hasRejection && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                승인이 반려되었습니다. 반려 사유를 확인하고 재신청해주세요.
              </AlertDescription>
            </Alert>
          )}

          {/* Approval Steps */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">승인 단계</h4>
            <div className="relative">
              {progress.steps.map((step, index) => (
                <div key={step.id} className="relative">
                  {index > 0 && (
                    <div 
                      className={`absolute left-5 top-0 w-0.5 h-full -translate-y-full ${
                        progress.steps[index - 1].status === 'approved' 
                          ? 'bg-green-300' 
                          : progress.steps[index - 1].status === 'rejected'
                          ? 'bg-red-300'
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                  
                  <div 
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                      selectedStep?.id === step.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedStep(step)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getStepIcon(step)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {step.stepOrder}단계: {roleLabels[step.requiredRole]}
                        </span>
                        {getStepStatusBadge(step.status)}
                        {step.isOptional && (
                          <Badge variant="outline" className="text-xs">
                            선택
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          승인 한도: {formatKoreanWon(step.minAmount)}
                          {step.maxAmount && ` ~ ${formatKoreanWon(step.maxAmount)}`}
                        </span>
                        {step.canSkip && (
                          <span className="text-blue-600">건너뛸 수 있음</span>
                        )}
                      </div>
                      
                      {step.approverName && (
                        <div className="flex items-center gap-2 mt-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {step.approverName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-600">
                            {step.approverName}
                          </span>
                          {step.approvedAt && (
                            <span className="text-xs text-gray-400">
                              • {getTimeAgo(step.approvedAt)}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {step.note && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          {step.note}
                        </div>
                      )}
                    </div>
                    
                    {showActions && step.status === 'in_progress' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApprove?.(step.id);
                          }}
                        >
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReject?.(step.id);
                          }}
                        >
                          반려
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Completion */}
          {progress.estimatedCompletionTime && !hasRejection && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">예상 완료 시간:</span>
                <span className="font-medium">
                  {formatDate(progress.estimatedCompletionTime)}
                </span>
              </div>
            </div>
          )}

          {/* Selected Step Details */}
          {selectedStep && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="text-sm font-medium text-blue-900 mb-2">
                상세 정보
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">역할:</span>
                  <Badge className={roleColors[selectedStep.requiredRole]}>
                    {roleLabels[selectedStep.requiredRole]}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">상태:</span>
                  <span>{getStepStatusBadge(selectedStep.status)}</span>
                </div>
                {selectedStep.approverName && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">승인자:</span>
                    <span>{selectedStep.approverName}</span>
                  </div>
                )}
                {selectedStep.approvedAt && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">승인 시간:</span>
                    <span>{formatDate(selectedStep.approvedAt)}</span>
                  </div>
                )}
                {selectedStep.rejectedAt && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">반려 시간:</span>
                    <span>{formatDate(selectedStep.rejectedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}