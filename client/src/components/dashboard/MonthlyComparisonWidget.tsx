import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  DollarSign,
  Calendar,
  BarChart3,
  Minus
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { apiRequest } from '@/lib/queryClient';

interface MonthlyData {
  name: string;
  year: number;
  orderCount: number;
  totalAmount: number;
}

interface MonthlyComparisonData {
  currentMonth: MonthlyData;
  lastMonth: MonthlyData;
  changes: {
    orderCount: number;
    totalAmount: number;
  };
  dailyData: Array<{
    day: number;
    orderCount: number;
    totalAmount: number;
  }>;
}

const MonthlyComparisonWidget: React.FC = () => {
  const { data: comparisonData, isLoading, error } = useQuery<MonthlyComparisonData>({
    queryKey: ['dashboard', 'monthly-comparison'],
    queryFn: () => apiRequest('GET', '/api/dashboard/monthly-comparison'),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            월별 발주 현황 비교
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !comparisonData) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            월별 발주 현황 비교
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            데이터를 불러오는 중 오류가 발생했습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  const { currentMonth, lastMonth, changes, dailyData } = comparisonData;

  // Format daily data for chart
  const chartData = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const dayData = dailyData.find(d => d.day === day);
    return {
      day: `${day}일`,
      orderCount: dayData?.orderCount || 0,
      totalAmount: dayData?.totalAmount || 0,
    };
  }).slice(0, new Date(currentMonth.year, new Date().getMonth() + 1, 0).getDate());

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600 bg-green-50 border-green-200';
    if (change < 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const formatCurrency = (amount: number) => {
    return `${(amount / 1000000).toFixed(1)}백만원`;
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          월별 발주 현황 비교
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparison Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Order Count Comparison */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">발주서 수</span>
              </div>
              <Badge variant="outline" className={getTrendColor(changes.orderCount)}>
                {getTrendIcon(changes.orderCount)}
                {Math.abs(changes.orderCount)}%
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-blue-600 font-medium">{lastMonth.name} {lastMonth.year}</div>
                <div className="text-2xl font-bold text-blue-900">{lastMonth.orderCount}건</div>
              </div>
              <div>
                <div className="text-blue-600 font-medium">{currentMonth.name} {currentMonth.year}</div>
                <div className="text-2xl font-bold text-blue-900">{currentMonth.orderCount}건</div>
              </div>
            </div>
          </div>

          {/* Amount Comparison */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">발주 금액</span>
              </div>
              <Badge variant="outline" className={getTrendColor(changes.totalAmount)}>
                {getTrendIcon(changes.totalAmount)}
                {Math.abs(changes.totalAmount)}%
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-green-600 font-medium">{lastMonth.name} {lastMonth.year}</div>
                <div className="text-2xl font-bold text-green-900">{formatCurrency(lastMonth.totalAmount)}</div>
              </div>
              <div>
                <div className="text-green-600 font-medium">{currentMonth.name} {currentMonth.year}</div>
                <div className="text-2xl font-bold text-green-900">{formatCurrency(currentMonth.totalAmount)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Chart */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">{currentMonth.name} 일별 발주 현황</span>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  fontSize={12}
                  interval={'preserveStartEnd'}
                />
                <YAxis 
                  yAxisId="count"
                  orientation="left"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="amount"
                  orientation="right"
                  fontSize={12}
                  tickFormatter={(value) => `${Math.round(value/1000000)}M`}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'orderCount') return [`${value}건`, '발주서 수'];
                    if (name === 'totalAmount') return [`${formatCurrency(Number(value))}`, '발주 금액'];
                    return [value, name];
                  }}
                  labelStyle={{ color: '#374151' }}
                />
                <Bar 
                  yAxisId="count"
                  dataKey="orderCount" 
                  fill="#3B82F6" 
                  name="orderCount"
                  radius={[2, 2, 0, 0]}
                />
                <Line 
                  yAxisId="amount"
                  type="monotone" 
                  dataKey="totalAmount" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="totalAmount"
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyComparisonWidget;