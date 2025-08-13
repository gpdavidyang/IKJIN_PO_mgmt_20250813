import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, BarChart3, Activity, Eye, CheckCircle, Clock, Send, XCircle, FileText } from 'lucide-react';
import { useLocation } from 'wouter';

interface StatusDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusStats: any[];
  isDarkMode?: boolean;
}

export function StatusDistributionModal({ isOpen, onClose, statusStats, isDarkMode = false }: StatusDistributionModalProps) {
  const [, navigate] = useLocation();
  
  // Professional color palette
  const colors = {
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryDark: '#2563EB',
    secondary: '#93C5FD',
    accent: '#DBEAFE',
    gray: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444'
  };

  // Status configuration with enhanced metadata
  const statusConfig = {
    pending: {
      label: '승인대기',
      description: '승인을 기다리는 발주서',
      color: colors.warning,
      icon: Clock,
      priority: 'high'
    },
    approved: {
      label: '승인완료',
      description: '승인이 완료된 발주서',
      color: colors.success,
      icon: CheckCircle,
      priority: 'medium'
    },
    sent: {
      label: '발송완료',
      description: '거래처로 발송된 발주서',
      color: colors.primary,
      icon: Send,
      priority: 'low'
    },
    delivered: {
      label: '납품완료',
      description: '납품이 완료된 발주서',
      color: colors.primaryDark,
      icon: CheckCircle,
      priority: 'completed'
    },
    draft: {
      label: '임시저장',
      description: '작성 중인 발주서',
      color: colors.gray,
      icon: FileText,
      priority: 'medium'
    },
    cancelled: {
      label: '취소됨',
      description: '취소된 발주서',
      color: colors.danger,
      icon: XCircle,
      priority: 'low'
    }
  };

  // Transform status data for charts with enhanced information
  const statusChartData = statusStats
    .filter((item: any) => item && Number(item.count) > 0)
    .map((item: any) => {
      const config = statusConfig[item.status as keyof typeof statusConfig] || {
        label: item.status,
        description: '기타 상태',
        color: colors.gray,
        icon: Activity,
        priority: 'medium'
      };
      
      return {
        status: item.status,
        name: config.label,
        description: config.description,
        value: Number(item.count),
        color: config.color,
        icon: config.icon,
        priority: config.priority,
        percentage: 0 // Will calculate below
      };
    });

  // Calculate percentages
  const totalCount = statusChartData.reduce((sum, item) => sum + item.value, 0);
  statusChartData.forEach(item => {
    item.percentage = Math.round((item.value / totalCount) * 100);
  });

  // Sort by priority for display
  const priorityOrder = { high: 0, medium: 1, low: 2, completed: 3 };
  const sortedStatusData = [...statusChartData].sort((a, b) => {
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 999;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 999;
    return aPriority - bPriority;
  });

  const handleExportData = () => {
    const csvContent = [
      ['상태', '건수', '비율(%)'],
      ...statusChartData.map(item => [item.name, item.value, item.percentage])
    ];
    
    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `발주상태_분포_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewOrders = (status: string) => {
    navigate(`/orders?status=${status}`);
    onClose();
  };

  // Calculate insights
  const highPriorityCount = statusChartData
    .filter(item => item.priority === 'high')
    .reduce((sum, item) => sum + item.value, 0);

  const completedCount = statusChartData
    .filter(item => item.priority === 'completed')
    .reduce((sum, item) => sum + item.value, 0);

  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-6xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                발주 상태 분포 상세 분석
              </DialogTitle>
              <DialogDescription className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                현재 시스템의 모든 발주서 상태를 상세히 분석합니다
              </DialogDescription>
            </div>
            <Button
              onClick={handleExportData}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              데이터 내보내기
            </Button>
          </div>
        </DialogHeader>

        {/* 요약 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">전체 발주서</span>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {totalCount.toLocaleString()}건
            </p>
          </div>

          <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-orange-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">긴급 처리</span>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {highPriorityCount.toLocaleString()}건
            </p>
          </div>

          <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">완료율</span>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {completionRate}%
            </p>
          </div>

          <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-purple-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">활성 상태</span>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {statusChartData.length}개
            </p>
          </div>
        </div>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 파이 차트 */}
          <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-700' : 'bg-white border'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              상태별 비율
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any) => [`${value}건 (${((value / totalCount) * 100).toFixed(1)}%)`, name]}
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f2937' : 'white', 
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 바 차트 */}
          <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-700' : 'bg-white border'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              상태별 건수
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#f0f0f0'} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: isDarkMode ? '#9CA3AF' : '#6B7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: isDarkMode ? '#9CA3AF' : '#6B7280' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f2937' : 'white', 
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value: any) => [`${value}건`, '발주 건수']}
                  />
                  <Bar 
                    dataKey="value" 
                    fill={colors.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 상태별 상세 정보 */}
        <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-700' : 'bg-white border'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            상태별 상세 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedStatusData.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.status}
                  className={`rounded-lg p-4 border transition-all cursor-pointer hover:shadow-md ${
                    isDarkMode ? 'border-gray-600 hover:bg-gray-650' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleViewOrders(item.status)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: item.color }} />
                      </div>
                      <div>
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {item.name}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {item.value}
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {item.percentage}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-600 hover:underline">
                      해당 발주서 목록 보기
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {statusChartData.length === 0 && (
          <div className={`rounded-lg p-8 text-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <Activity className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              상태 데이터가 없습니다
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              발주서를 생성하면 상태별 분석이 표시됩니다
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}