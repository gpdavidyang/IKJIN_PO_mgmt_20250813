import React, { useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { ImportExportManager } from '@/components/import-export-manager';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

export default function ImportExportPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
        <PageHeader
          title="데이터 가져오기/내보내기"
          description="엑셀 및 CSV 파일을 사용하여 데이터를 일괄 처리합니다."
        />
        
        <ImportExportManager />
        
        {/* 사용팁 섹션 */}
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 사용팁</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">📥 데이터 가져오기</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• 1단계: 데이터 유형(거래처/현장/발주서) 선택</li>
                      <li>• 2단계: 템플릿을 다운로드하여 형식 확인</li>
                      <li>• 3단계: 템플릿에 맞춰 데이터를 입력한 파일 업로드</li>
                      <li>• 4단계: '데이터 가져오기' 버튼 클릭</li>
                      <li>• 필수 항목은 반드시 입력해야 합니다</li>
                      <li>• 사업자번호는 하이픈(-) 없이 숫자만 입력</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">📤 데이터 내보내기</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Excel 형식은 서식이 유지됩니다</li>
                      <li>• CSV 형식은 데이터만 추출됩니다</li>
                      <li>• 파일명에 날짜가 자동으로 포함됩니다</li>
                      <li>• 현재 등록된 모든 데이터가 포함됩니다</li>
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-amber-50 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 mb-2">⚠️ 주의사항</h4>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• 중복된 사업자번호는 업데이트됩니다</li>
                      <li>• 잘못된 형식의 데이터는 건너뛰어집니다</li>
                      <li>• 가져오기 전에 기존 데이터 백업 권장</li>
                      <li>• 파일 크기는 10MB 이하로 제한</li>
                    </ul>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900 mb-2">🚀 효율적인 사용법</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• 정기적으로 데이터를 백업하세요</li>
                      <li>• 템플릿에 맞춰 데이터를 미리 정리</li>
                      <li>• 오류 발생 시 상세 로그를 확인하세요</li>
                      <li>• 관리자에게 문의하여 권한을 확인하세요</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}