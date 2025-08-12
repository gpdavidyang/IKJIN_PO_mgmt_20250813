import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ApprovalStepProps {
  approvalRequired: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'skipped';
  onApprovalComplete?: () => void;
}

const ApprovalStep: React.FC<ApprovalStepProps> = ({
  approvalRequired,
  approvalStatus = 'pending'
}) => {
  if (!approvalRequired) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            승인 단계 생략
          </h3>
          <p className="text-gray-600">
            현재 발주서는 승인이 필요하지 않습니다. 다음 단계로 진행합니다.
          </p>
          <Badge variant="secondary" className="mt-4 bg-green-100 text-green-800">
            자동 승인됨
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <span>승인 처리</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <div className="mb-6">
            {approvalStatus === 'pending' && (
              <>
                <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  승인 대기 중
                </h3>
                <p className="text-gray-600">
                  발주서가 승인자에게 전송되었습니다. 승인을 기다리고 있습니다.
                </p>
              </>
            )}
            
            {approvalStatus === 'approved' && (
              <>
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-600 mb-2">
                  승인 완료
                </h3>
                <p className="text-gray-600">
                  발주서가 성공적으로 승인되었습니다.
                </p>
              </>
            )}
            
            {approvalStatus === 'rejected' && (
              <>
                <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-red-600 mb-2">
                  승인 반려
                </h3>
                <p className="text-gray-600">
                  발주서가 반려되었습니다. 수정 후 다시 제출해주세요.
                </p>
              </>
            )}
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">승인 워크플로우</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• 발주 금액 및 권한에 따른 자동 승인 경로 결정</p>
              <p>• 이메일 알림 및 실시간 상태 업데이트</p>
              <p>• 승인자별 코멘트 및 이력 관리</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApprovalStep;