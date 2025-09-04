import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  UserCheck, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Users,
  ArrowRight,
  FileCheck,
  Send
} from 'lucide-react';
import { formatKoreanWon } from '@/lib/utils';

interface Approver {
  userId: string;
  name: string;
  email: string;
  role: string;
  level: number;
  approvalLimit: number;
}

interface ApprovalGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderAmount: number;
  requiredApprovers?: Approver[];
  canDirectApprove?: boolean;
  directApproveLimit?: number;
  bypassReason?: string;
  estimatedTime?: string;
  onProceed: () => void;
  onCancel?: () => void;
}

export function ApprovalGuideModal({
  open,
  onOpenChange,
  orderAmount,
  requiredApprovers = [],
  canDirectApprove = false,
  directApproveLimit,
  bypassReason,
  estimatedTime = '2시간 이내',
  onProceed,
  onCancel
}: ApprovalGuideModalProps) {
  
  const getBypassReasonText = (reason?: string) => {
    switch (reason) {
      case 'amount_threshold':
        return '소액 발주 (자동 승인)';
      case 'direct_approval':
        return '직접 승인 권한';
      case 'emergency':
        return '긴급 발주';
      case 'repeat_order':
        return '반복 발주';
      case 'excel_automation':
        return '엑셀 자동화 처리';
      default:
        return '승인 불필요';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'field_worker':
        return '현장 작업자';
      case 'project_manager':
        return '프로젝트 매니저';
      case 'hq_management':
        return '본사 관리자';
      case 'executive':
        return '임원';
      case 'admin':
        return '시스템 관리자';
      default:
        return role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-600" />
            발주서 승인 프로세스 안내
          </DialogTitle>
          <DialogDescription>
            발주 금액: <span className="font-bold text-gray-900">{formatKoreanWon(orderAmount)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 직접 승인 가능한 경우 */}
          {canDirectApprove && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <div className="font-semibold mb-1">직접 승인 가능</div>
                <div className="text-sm">
                  귀하의 승인 권한 한도 ({formatKoreanWon(directApproveLimit || 0)}) 내의 
                  발주이므로 즉시 처리 가능합니다.
                </div>
                {bypassReason && (
                  <Badge className="mt-2" variant="secondary">
                    {getBypassReasonText(bypassReason)}
                  </Badge>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 승인이 필요 없는 경우 */}
          {!canDirectApprove && requiredApprovers.length === 0 && bypassReason && (
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <div className="font-semibold mb-1">승인 불필요</div>
                <div className="text-sm mb-2">
                  이 발주서는 별도의 승인 없이 진행 가능합니다.
                </div>
                <Badge variant="secondary">
                  {getBypassReasonText(bypassReason)}
                </Badge>
              </AlertDescription>
            </Alert>
          )}

          {/* 승인이 필요한 경우 */}
          {requiredApprovers.length > 0 && (
            <>
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  <div className="font-semibold mb-1">승인 필요</div>
                  <div className="text-sm">
                    이 발주서는 다음 승인자의 검토가 필요합니다.
                  </div>
                </AlertDescription>
              </Alert>

              {/* 승인자 목록 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Users className="h-4 w-4" />
                  필요한 승인자
                </div>
                
                <div className="space-y-2">
                  {requiredApprovers.map((approver, index) => (
                    <div key={approver.userId} className="relative">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                            {index + 1}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {approver.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getRoleText(approver.role)} • 승인 한도: {formatKoreanWon(approver.approvalLimit)}
                          </div>
                        </div>

                        <UserCheck className="h-5 w-5 text-gray-400" />
                      </div>
                      
                      {index < requiredApprovers.length - 1 && (
                        <div className="absolute left-4 top-full h-4 w-px bg-gray-300 -translate-x-1/2 z-10" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 예상 처리 시간 */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Clock className="h-5 w-5 text-gray-500" />
            <div className="text-sm">
              <span className="text-gray-600">예상 처리 시간: </span>
              <span className="font-medium text-gray-900">{estimatedTime}</span>
            </div>
          </div>

          {/* 프로세스 흐름 */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">진행 프로세스</div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Badge variant="outline" className="gap-1">
                <FileCheck className="h-3 w-3" />
                발주서 생성
              </Badge>
              
              <ArrowRight className="h-4 w-4 text-gray-400" />
              
              {requiredApprovers.length > 0 ? (
                <>
                  <Badge variant="outline" className="gap-1">
                    <UserCheck className="h-3 w-3" />
                    승인 진행
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </>
              ) : null}
              
              <Badge variant="outline" className="gap-1">
                <Send className="h-3 w-3" />
                발주서 발송
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
          >
            취소
          </Button>
          <Button onClick={onProceed} className="bg-blue-600 hover:bg-blue-700">
            {canDirectApprove ? '즉시 처리' : 
             requiredApprovers.length > 0 ? '승인 요청' : '발주서 생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}