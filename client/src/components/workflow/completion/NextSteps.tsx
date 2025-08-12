import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Users,
  FileText,
  Mail,
  Settings,
  TrendingUp
} from 'lucide-react';

interface NextStep {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'optional' | 'recommended';
  estimatedTime?: string;
  action?: () => void;
  url?: string;
  icon: React.ReactNode;
}

interface NextStepsProps {
  orderData?: {
    type?: 'standard' | 'excel';
    requiresApproval?: boolean;
    emailsSent?: boolean;
    vendorCount?: number;
    totalAmount?: number;
  };
  onNavigate?: (url: string) => void;
}

const NextSteps: React.FC<NextStepsProps> = ({ orderData, onNavigate }) => {
  const generateNextSteps = (): NextStep[] => {
    const steps: NextStep[] = [];

    // 기본 추천 단계들
    steps.push({
      id: 'view_orders',
      title: '발주서 상세 확인',
      description: '생성된 발주서의 상세 내용을 확인하고 필요시 수정하세요',
      priority: 'high',
      status: 'recommended',
      estimatedTime: '2-3분',
      url: '/orders',
      icon: <FileText className="w-4 h-4" />
    });

    // 이메일 발송 관련
    if (!orderData?.emailsSent) {
      steps.push({
        id: 'send_emails',
        title: '거래처에 이메일 발송',
        description: '생성된 발주서를 거래처에 이메일로 발송하세요',
        priority: 'high',
        status: 'pending',
        estimatedTime: '1-2분',
        url: '/orders?action=send-email',
        icon: <Mail className="w-4 h-4" />
      });
    }

    // 승인 필요한 경우
    if (orderData?.requiresApproval) {
      steps.push({
        id: 'request_approval',
        title: '승인 요청',
        description: '발주서 승인을 위해 상급자에게 승인 요청을 보내세요',
        priority: 'high',
        status: 'pending',
        estimatedTime: '1분',
        url: '/approvals/request',
        icon: <Users className="w-4 h-4" />
      });
    }

    // 고액 발주서인 경우
    if (orderData?.totalAmount && orderData.totalAmount > 10000000) {
      steps.push({
        id: 'financial_review',
        title: '재무 검토 요청',
        description: '고액 발주서로 인해 재무팀 검토가 필요합니다',
        priority: 'medium',
        status: 'recommended',
        estimatedTime: '5분',
        url: '/financial-review',
        icon: <TrendingUp className="w-4 h-4" />
      });
    }

    // 다수 거래처인 경우
    if (orderData?.vendorCount && orderData.vendorCount > 3) {
      steps.push({
        id: 'vendor_management',
        title: '거래처 관리 검토',
        description: '다수 거래처 발주서이므로 거래처 정보를 재검토하세요',
        priority: 'medium',
        status: 'optional',
        estimatedTime: '3-5분',
        url: '/vendors',
        icon: <Settings className="w-4 h-4" />
      });
    }

    // 프로젝트 관리
    steps.push({
      id: 'project_tracking',
      title: '프로젝트 진행 상황 업데이트',
      description: '프로젝트 관리 시스템에 발주서 정보를 반영하세요',
      priority: 'low',
      status: 'optional',
      estimatedTime: '2-3분',
      url: '/projects',
      icon: <TrendingUp className="w-4 h-4" />
    });

    return steps;
  };

  const nextSteps = generateNextSteps();
  const pendingSteps = nextSteps.filter(step => step.status === 'pending');
  const recommendedSteps = nextSteps.filter(step => step.status === 'recommended');
  const optionalSteps = nextSteps.filter(step => step.status === 'optional');

  const getPriorityColor = (priority: NextStep['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusIcon = (status: NextStep['status']) => {
    switch (status) {
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'recommended':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'optional':
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleStepClick = (step: NextStep) => {
    if (step.action) {
      step.action();
    } else if (step.url) {
      if (onNavigate) {
        onNavigate(step.url);
      } else {
        window.location.href = step.url;
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-blue-600" />
          다음 단계 안내
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 요약 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-xl font-bold text-orange-600 mb-1">
              {pendingSteps.length}
            </div>
            <div className="text-sm text-orange-700">필수 작업</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-600 mb-1">
              {recommendedSteps.length}
            </div>
            <div className="text-sm text-blue-700">권장 작업</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-600 mb-1">
              {optionalSteps.length}
            </div>
            <div className="text-sm text-gray-700">선택 작업</div>
          </div>
        </div>

        {/* 필수 작업 */}
        {pendingSteps.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-orange-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              필수 작업
            </h4>
            {pendingSteps.map((step) => (
              <div key={step.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-gray-900">{step.title}</h5>
                        <Badge className={getPriorityColor(step.priority)}>
                          {step.priority === 'high' ? '높음' : 
                           step.priority === 'medium' ? '보통' : '낮음'}
                        </Badge>
                        {step.estimatedTime && (
                          <span className="text-xs text-gray-500">
                            {step.estimatedTime}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStepClick(step)}
                    className="ml-2"
                  >
                    실행
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 권장 작업 */}
        {recommendedSteps.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-blue-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              권장 작업
            </h4>
            {recommendedSteps.map((step) => (
              <div key={step.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-gray-900">{step.title}</h5>
                        <Badge className={getPriorityColor(step.priority)}>
                          {step.priority === 'high' ? '높음' : 
                           step.priority === 'medium' ? '보통' : '낮음'}
                        </Badge>
                        {step.estimatedTime && (
                          <span className="text-xs text-gray-500">
                            {step.estimatedTime}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStepClick(step)}
                    className="ml-2"
                  >
                    실행
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 선택 작업 */}
        {optionalSteps.length > 0 && (
          <details className="space-y-3">
            <summary className="font-semibold text-gray-700 cursor-pointer flex items-center gap-2">
              <Clock className="w-4 h-4" />
              선택 작업 ({optionalSteps.length}개)
            </summary>
            <div className="space-y-3 mt-3">
              {optionalSteps.map((step) => (
                <div key={step.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {step.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-gray-900">{step.title}</h5>
                          <Badge className={getPriorityColor(step.priority)}>
                            {step.priority === 'high' ? '높음' : 
                             step.priority === 'medium' ? '보통' : '낮음'}
                          </Badge>
                          {step.estimatedTime && (
                            <span className="text-xs text-gray-500">
                              {step.estimatedTime}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStepClick(step)}
                      className="ml-2"
                    >
                      실행
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* 전체적인 안내 메시지 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">💡 도움말</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• 필수 작업부터 순서대로 진행하시면 됩니다</p>
            <p>• 각 작업의 예상 시간을 참고하여 계획을 세우세요</p>
            <p>• 문의사항이 있으시면 시스템 관리자에게 연락하세요</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NextSteps;