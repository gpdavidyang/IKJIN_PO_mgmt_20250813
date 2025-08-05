import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import OptimizedUnifiedWorkflow from '@/components/workflow/OptimizedUnifiedWorkflow';
import { useLocation } from 'wouter';

export default function CreateOrderUnified() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  
  // URL 파라미터에서 초기 방식 확인
  const initialMethod = searchParams.get('method') as 'standard' | 'excel' | null;

  useEffect(() => {
    // 페이지 로드 시 사용자 확인
    if (!user) {
      navigate('/login');
      return;
    }

    // 환영 메시지
    toast({
      title: '통합 발주서 작성',
      description: '새로운 통합 워크플로우로 발주서를 작성해보세요',
    });
  }, [user, navigate, toast]);

  const handleWorkflowComplete = (orderData: any) => {
    toast({
      title: '발주서 작성 완료',
      description: '발주서가 성공적으로 생성되었습니다',
    });
    
    // 발주서 관리 페이지로 이동
    navigate('/orders');
  };

  const handleWorkflowCancel = () => {
    // 취소 확인
    const confirmed = window.confirm('작성 중인 발주서를 취소하시겠습니까? 저장되지 않은 내용은 사라집니다.');
    
    if (confirmed) {
      toast({
        title: '작업 취소됨',
        description: '발주서 작성이 취소되었습니다',
        variant: 'destructive'
      });
      
      // 대시보드로 이동
      navigate('/dashboard');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로그인 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <OptimizedUnifiedWorkflow
      onComplete={handleWorkflowComplete}
      onCancel={handleWorkflowCancel}
      helpContent={
        <div className="bg-white border-t border-gray-200">
          <div className="max-w-[1366px] mx-auto px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">📋 방식 선택</h3>
                <p className="text-sm text-gray-600">
                  프로젝트 요구사항에 맞는 발주서 작성 방식을 선택하세요. 
                  각 방식의 장단점을 비교하여 최적의 선택을 할 수 있습니다.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">⚙️ 자동 처리</h3>
                <p className="text-sm text-gray-600">
                  발주서 생성 후 PDF 변환, 거래처 검증, 이메일 발송까지 
                  모든 과정이 자동으로 처리됩니다.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">💾 자동 저장</h3>
                <p className="text-sm text-gray-600">
                  작업 진행 상황이 자동으로 저장되어 중간에 중단되어도 
                  이어서 작업할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}