import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Download, Calendar, TrendingUp, Activity } from 'lucide-react';
import { formatKoreanWon } from '@/lib/utils';

interface MonthlyTrendModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyStats: any[];
  isDarkMode?: boolean;
}

export function MonthlyTrendModal({ isOpen, onClose, monthlyStats, isDarkMode = false }: MonthlyTrendModalProps) {
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

  // Transform monthly data for charts with proper sorting
  const monthlyChartData = monthlyStats
    .sort((a: any, b: any) => a.month.localeCompare(b.month))
    .map((item: any) => {
      const [year, month] = item.month.split('-');
      const currentYear = new Date().getFullYear();
      const isCurrentYear = parseInt(year) === currentYear;
      
      return {
        month: isCurrentYear ? `${month}월` : `${year.substring(2)}.${month}`,
        fullMonth: item.month,
        발주건수: Number(item.count) || 0,
        금액백만원: Math.round(Number(item.amount || item.totalAmount) / 1000000) || 0,
        원본금액: Number(item.amount || item.totalAmount) || 0
      };
    });

  // Calculate totals and statistics
  const totalOrders = monthlyChartData.reduce((sum, item) => sum + item.발주건수, 0);
  const totalAmount = monthlyChartData.reduce((sum, item) => sum + item.원본금액, 0);
  const avgOrdersPerMonth = Math.round(totalOrders / Math.max(monthlyChartData.length, 1));
  const avgAmountPerMonth = Math.round(totalAmount / Math.max(monthlyChartData.length, 1));

  // Find peak month
  const peakMonth = monthlyChartData.reduce((max, current) => 
    current.발주건수 > max.발주건수 ? current : max, 
    { month: '', 발주건수: 0, 금액백만원: 0 }
  );

  const handleExportData = () => {
    const csvContent = [
      ['월', '발주건수', '발주금액(원)'],
      ...monthlyChartData.map(item => [item.fullMonth, item.발주건수, item.원본금액])
    ];
    
    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `월별_발주_추이_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-6xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                월별 발주 추이 상세 분석
              </DialogTitle>
              <DialogDescription className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                과거 12개월간의 발주 현황을 자세히 분석합니다
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
              <span className="text-sm font-medium text-blue-700">총 발주 건수</span>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {totalOrders.toLocaleString()}건
            </p>
          </div>

          <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">총 발주 금액</span>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatKoreanWon(totalAmount)}
            </p>
          </div>

          <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-purple-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">월 평균 건수</span>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {avgOrdersPerMonth.toLocaleString()}건
            </p>
          </div>

          <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-orange-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">피크 월</span>
            </div>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {peakMonth.month} ({peakMonth.발주건수}건)
            </p>
          </div>
        </div>

        {/* 차트 섹션 */}
        <div className="space-y-6">
          {/* 발주 건수 추이 - Area Chart */}
          <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-700' : 'bg-white border'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              월별 발주 건수 추이
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <defs>
                    <linearGradient id="colorOrderCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#f0f0f0'} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: isDarkMode ? '#9CA3AF' : '#6B7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: isDarkMode ? '#9CA3AF' : '#6B7280' }}
                    label={{ 
                      value: '발주 건수', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: '12px' }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f2937' : 'white', 
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value: any) => [`${value}건`, '발주 건수']}
                    labelFormatter={(label: string) => `${label} 발주 현황`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="발주건수" 
                    stroke={colors.primary} 
                    fillOpacity={1} 
                    fill="url(#colorOrderCount)" 
                    strokeWidth={3}
                    dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: colors.primary, strokeWidth: 2, fill: 'white' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 발주 금액 추이 - Bar Chart */}
          <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-700' : 'bg-white border'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              월별 발주 금액 추이 (백만원)
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#f0f0f0'} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: isDarkMode ? '#9CA3AF' : '#6B7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: isDarkMode ? '#9CA3AF' : '#6B7280' }}
                    label={{ 
                      value: '발주 금액 (백만원)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: '12px' }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f2937' : 'white', 
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value: any, name: string, props: any) => [
                      `${value.toLocaleString()}백만원`,
                      '발주 금액'
                    ]}
                    labelFormatter={(label: string, payload: any) => {
                      if (payload && payload[0]) {
                        const originalAmount = payload[0].payload.원본금액;
                        return `${label} (${formatKoreanWon(originalAmount)})`;
                      }
                      return `${label} 발주 금액`;
                    }}
                  />
                  <Bar 
                    dataKey="금액백만원" 
                    fill={colors.success}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 상세 데이터 테이블 */}
          <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-700' : 'bg-white border'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              월별 상세 데이터
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}`}>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>월</th>
                    <th className={`px-4 py-3 text-right text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>발주 건수</th>
                    <th className={`px-4 py-3 text-right text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>발주 금액</th>
                    <th className={`px-4 py-3 text-right text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>평균 주문액</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyChartData.map((item, index) => (
                    <tr 
                      key={item.fullMonth} 
                      className={`${index % 2 === 0 
                        ? (isDarkMode ? 'bg-gray-700' : 'bg-white') 
                        : (isDarkMode ? 'bg-gray-650' : 'bg-gray-50')
                      }`}
                    >
                      <td className={`px-4 py-3 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {item.month}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.발주건수.toLocaleString()}건
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {formatKoreanWon(item.원본금액)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.발주건수 > 0 ? formatKoreanWon(Math.round(item.원본금액 / item.발주건수)) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}