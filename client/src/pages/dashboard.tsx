import { FileText, Package, Users, Clock, Building, Plus, AlertCircle, BarChart3, CheckCircle, TrendingUp, ShoppingCart, Activity, FolderTree, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/use-enhanced-queries";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatKoreanWon } from "@/lib/utils";

// Import enhanced components
import { EnhancedStatsCard } from "@/components/dashboard/enhanced-stats-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ProjectStatsList } from "@/components/dashboard/project-stats-list";
import { RecentOrdersList } from "@/components/dashboard/recent-orders-list";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

// Import new advanced chart components
import { AdvancedBarChart, AdvancedPieChart, AdvancedLineChart } from "@/components/charts/advanced-chart";
import { KPIWidget, ChartWidget, DashboardGrid, useRealTimeData } from "@/components/charts/dashboard-widgets";
import { InteractiveTooltip } from "@/components/charts/interactive-tooltip";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized", 
        description: "You are logged out. Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => {
        navigate("/login");
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  // Unified dashboard API call with enhanced caching and background sync
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData();

  // Extract data from unified response with fallbacks
  const stats = dashboardData?.statistics || {};
  const recentOrders = dashboardData?.recentOrders || [];
  
  // For compatibility with existing code - use actual API data
  const monthlyStats = dashboardData?.monthlyStats || [];
  const statusStats = dashboardData?.statusStats || [];
  const projectStats = dashboardData?.projectStats || [];
  const categoryStats = dashboardData?.categoryStats || [];
  const activeProjectsCount = { count: stats.activeProjects || 0 };
  const newProjectsThisMonth = { count: 0 };
  const recentProjects = [];
  const urgentOrders = [];

  // Real-time data updates for dashboard widgets
  const { 
    data: realtimeStats, 
    loading: realtimeLoading, 
    refresh: refreshStats 
  } = useRealTimeData(
    stats,
    async () => {
      // Simulate API call for real-time stats
      const response = await fetch('/api/dashboard/unified');
      const data = await response.json();
      return data.statistics || {};
    },
    30000, // Update every 30 seconds
    !!user
  );

  // Create KPI widgets data
  const kpiWidgets = [
    {
      id: 'total-orders',
      title: '총 발주서',
      value: realtimeStats.totalOrders || stats.totalOrders || 0,
      previousValue: stats.totalOrders,
      format: 'number' as const,
      trend: 'up' as const,
      trendValue: 12,
      description: '전체 발주서 건수',
      category: '발주관리',
      lastUpdated: new Date(),
      status: 'normal' as const
    },
    {
      id: 'total-amount',
      title: '총 발주 금액',
      value: realtimeStats.totalAmount || stats.totalAmount || 0,
      previousValue: stats.totalAmount,
      format: 'currency' as const,
      trend: 'up' as const,
      trendValue: 8.5,
      description: '이번 달 총 발주 금액',
      category: '금액관리',
      lastUpdated: new Date(),
      status: 'success' as const
    },
    {
      id: 'pending-orders',
      title: '승인 대기',
      value: realtimeStats.pendingOrders || stats.pendingOrders || 0,
      previousValue: stats.pendingOrders,
      format: 'number' as const,
      trend: 'down' as const,
      trendValue: 5,
      description: '승인 대기 중인 발주서',
      category: '승인관리',
      lastUpdated: new Date(),
      status: stats.pendingOrders > 10 ? 'warning' as const : 'normal' as const
    }
  ];

  // Single loading state for all data
  const isAnyLoading = dashboardLoading;

  if (isAnyLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return null;
  }



  // Helper function for formatting amounts in millions
  const formatAmountInMillions = (amount: number) => {
    return Math.round(amount / 1000000);
  };

  // Define quick actions
  const quickActionItems = [
    {
      label: "승인 대기 확인",
      icon: AlertCircle,
      onClick: () => navigate('/orders?status=pending'),
      variant: "outline" as const,
    },
    {
      label: "긴급 발주서",
      icon: Clock,
      onClick: () => navigate('/orders?filter=urgent'),
      variant: "outline" as const,
    },
    {
      label: "새 발주서",
      icon: Plus,
      onClick: () => navigate('/create-order'),
      variant: "default" as const,
      className: "bg-primary-500 hover:bg-primary-600 text-white",
    },
    {
      label: "보고서 생성",
      icon: BarChart3,
      onClick: () => navigate('/reports'),
      variant: "outline" as const,
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
      {/* Page Title with Real-time Indicator */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">빠른 작업</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">승인 대기 확인 • 긴급 발주서 • 새 발주서 • 보고서 생성</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshStats}
            disabled={realtimeLoading}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Activity className={`h-3 w-3 ${realtimeLoading ? 'animate-spin' : ''}`} />
            {realtimeLoading ? '업데이트 중...' : '새로고침'}
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            마지막 업데이트: {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Main Statistics Cards - 중복 제거하고 주요 지표만 표시 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <EnhancedStatsCard
          title="승인 대기 확인"
          value={stats.pendingOrders || 0}
          icon={Clock}
          iconColor="text-white"
          iconBgColor="bg-warning-500"
          onClick={() => navigate('/orders?status=pending')}
          isLoading={isAnyLoading}
          subtitle="즉시 확인 필요"
          trend={{ value: stats.pendingOrdersTrend || 0, isPositive: false }}
        />
        
        <EnhancedStatsCard
          title="긴급 발주서"
          value={stats.urgentOrders || 0}
          icon={AlertCircle}
          iconColor="text-white"
          iconBgColor="bg-danger-500"
          onClick={() => navigate('/orders?filter=urgent')}
          isLoading={isAnyLoading}
          subtitle="7일 이내 납품"
        />
        
        <EnhancedStatsCard
          title="새 발주서"
          value={stats.todayOrders || 0}
          icon={Plus}
          iconColor="text-white"
          iconBgColor="bg-success-500"
          onClick={() => navigate('/create-order')}
          isLoading={isAnyLoading}
          subtitle="오늘 생성"
        />
        
        <EnhancedStatsCard
          title="보고서 생성"
          value={stats.reportsGenerated || 0}
          icon={BarChart3}
          iconColor="text-white"
          iconBgColor="bg-indigo-500"
          onClick={() => navigate('/reports')}
          isLoading={isAnyLoading}
          subtitle="이번 달"
        />
      </div>

      {/* Detailed Analysis Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">상세 분석</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Statistics */}
          {!isAnyLoading && monthlyStats && Array.isArray(monthlyStats) && monthlyStats.length > 0 ? (
            <AdvancedBarChart
              data={(monthlyStats as any).map((item: any) => ({
                month: item.month.replace('-', '/'),
                orders: item.count,
                amount: formatAmountInMillions(item.amount)
              }))}
              title="월별 발주 통계"
              subtitle="발주 건수 및 금액 추이"
              xAxisKey="month"
              bars={[
                { dataKey: 'orders', name: '발주 건수', color: '#3b82f6' },
                { dataKey: 'amount', name: '발주 금액(백만원)', color: '#10b981' }
              ]}
              height={300}
              showExport={true}
              exportFilename="monthly-order-stats"
              formatValue={(value, name) => {
                if (name.includes('금액')) {
                  return `${value}백만원`;
                }
                return `${value}건`;
              }}
              loading={isAnyLoading}
              showGrid={true}
            />
          ) : (
            <ChartCard title="월별 발주 통계" icon={TrendingUp}>
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm">데이터 준비 중...</p>
                </div>
              </div>
            </ChartCard>
          )}

          {/* Project-based Statistics */}
          <ChartCard 
            title="현장별 발주 현황" 
            icon={Building}
            headerAction={
              <span className="text-xs text-gray-500 dark:text-gray-400">상위 10개</span>
            }
          >
            {!isAnyLoading && projectStats && Array.isArray(projectStats) && projectStats.length > 0 ? (
              <ProjectStatsList
                data={projectStats}
                onProjectClick={(projectId) => navigate(`/projects/${projectId}`)}
                maxItems={10}
              />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Building className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm">데이터 준비 중...</p>
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Advanced Chart Widgets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">주요 현황</h2>
          <button
            onClick={() => navigate('/reports')}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1"
          >
            상세 보고서
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Total Summary Card */}
          <div className="xl:col-span-1">
            <ChartCard title="전체 요약" icon={Activity}>
              <div className="space-y-4 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">총 발주서</span>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{stats.totalOrders || 0}건</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">총 발주 금액</span>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{formatKoreanWon(stats.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">활성 프로젝트</span>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{stats.activeProjects || 0}개</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">활성 거래처</span>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">{stats.activeVendors || 0}개</span>
                </div>
                <div className="pt-3 border-t dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">이번 달 발주</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{stats.monthlyOrders || 0}건</span>
                      {stats.monthlyOrdersTrend && (
                        <span className={`text-xs font-medium ${
                          stats.monthlyOrdersTrend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {stats.monthlyOrdersTrend > 0 ? '+' : ''}{stats.monthlyOrdersTrend}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Status Distribution */}
          <div className="xl:col-span-1">
            {!isAnyLoading && statusStats && Array.isArray(statusStats) && statusStats.length > 0 ? (
              <AdvancedPieChart
                data={statusStats.map((item: any) => ({
                  name: item.status === 'pending' ? '승인대기' : 
                        item.status === 'approved' ? '승인완료' : 
                        item.status === 'sent' ? '발송완료' : 
                        item.status === 'completed' ? '완료' :
                        item.status === 'rejected' ? '반려' :
                        item.status === 'cancelled' ? '취소' : item.status,
                  value: item.count,
                  status: item.status
                }))}
                title="발주서 상태"
                subtitle="현재 상태별 분포"
                dataKey="value"
                nameKey="name"
                height={280}
                formatValue={(value) => `${value}건`}
                loading={isAnyLoading}
                showLabels={true}
                showLegend={true}
                innerRadius={40}
                outerRadius={80}
              />
            ) : (
              <ChartCard title="발주서 상태" icon={Package}>
                <div className="h-[280px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm">데이터 준비 중...</p>
                  </div>
                </div>
              </ChartCard>
            )}
          </div>

          {/* Monthly Trend */}
          <div className="xl:col-span-1">
            {!isAnyLoading && monthlyStats && Array.isArray(monthlyStats) && monthlyStats.length > 0 ? (
              <AdvancedLineChart
                data={(monthlyStats as any).slice(-6).map((item: any) => ({
                  month: item.month.substring(5).replace('-', '/'),
                  orders: item.count,
                  amount: formatAmountInMillions(item.amount)
                }))}
                title="최근 6개월 추이"
                subtitle="발주 건수 추이"
                xAxisKey="month"
                lines={[
                  { 
                    dataKey: 'orders', 
                    name: '발주 건수', 
                    color: '#3b82f6',
                    strokeWidth: 2
                  }
                ]}
                height={280}
                formatValue={(value) => `${value}건`}
                loading={isAnyLoading}
                showDots={true}
                showGrid={false}
                curve="natural"
              />
            ) : (
              <ChartCard title="최근 6개월 추이" icon={TrendingUp}>
                <div className="h-[280px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm">데이터 준비 중...</p>
                  </div>
                </div>
              </ChartCard>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">최근 활동</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <ChartCard 
            title="최근 발주서" 
            icon={Clock}
            headerAction={
              <button 
                onClick={() => navigate('/orders')}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                전체 보기
              </button>
            }
          >
            {!isAnyLoading && recentOrders.length > 0 ? (
              <RecentOrdersList
                orders={recentOrders}
                onOrderClick={(orderId) => navigate(`/orders/${orderId}`)}
                maxItems={10}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm">데이터 준비 중...</p>
                </div>
              </div>
            )}
          </ChartCard>

          {/* Category Summary */}
          {!isAnyLoading && categoryStats && Array.isArray(categoryStats) && categoryStats.length > 0 ? (
            <ChartCard 
              title="품목 분류별 발주 현황" 
              icon={FolderTree}
              headerAction={
                <button 
                  onClick={() => navigate('/category-management')}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                >
                  분류 관리
                </button>
              }
            >
              <div className="h-64 overflow-y-auto">
                <div className="space-y-2">
                  {categoryStats
                    .slice(0, 8)
                    .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
                    .map((category: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {category.majorCategory}
                            </span>
                            {category.middleCategory !== '미분류' && (
                              <>
                                <ChevronRight className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {category.middleCategory}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            발주 {category.orderCount}건
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatKoreanWon(category.totalAmount)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </ChartCard>
          ) : (
            <ChartCard title="품목 분류별 발주 현황" icon={FolderTree}>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FolderTree className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm">데이터 준비 중...</p>
                </div>
              </div>
            </ChartCard>
          )}
        </div>
      </div>

    </div>
  );
}