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
      </div>
    </div>
  );
}