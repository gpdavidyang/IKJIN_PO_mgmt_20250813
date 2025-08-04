import { FileText, Package, Users, Clock, Building, Plus, AlertCircle, BarChart3, CheckCircle, TrendingUp, ShoppingCart, Activity } from "lucide-react";
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
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-600 mt-1">전체 현황을 한눈에 확인하세요</p>
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActionItems} />

      {/* Real-time KPI Widgets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">실시간 현황</h2>
          <button
            onClick={refreshStats}
            disabled={realtimeLoading}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
          >
            <Activity className={`h-3 w-3 ${realtimeLoading ? 'animate-spin' : ''}`} />
            {realtimeLoading ? '업데이트 중...' : '새로고침'}
          </button>
        </div>
        <DashboardGrid
          widgets={kpiWidgets}
          columns={3}
          onWidgetClick={(widget) => {
            if (widget.id === 'total-orders') navigate('/orders');
            else if (widget.id === 'total-amount') navigate('/orders?filter=amount');
            else if (widget.id === 'pending-orders') navigate('/orders?status=pending');
          }}
          onWidgetRefresh={(widgetId) => {
            console.log('Refreshing widget:', widgetId);
            refreshStats();
          }}
          loadingWidgets={realtimeLoading ? ['total-orders', 'total-amount', 'pending-orders'] : []}
        />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <EnhancedStatsCard
          title="총 발주서"
          value={stats.totalOrders || 0}
          icon={FileText}
          iconColor="text-white"
          iconBgColor="bg-primary-500"
          onClick={() => navigate('/orders')}
          isLoading={isAnyLoading}
          trend={{ value: 12, isPositive: true }}
        />
        
        <EnhancedStatsCard
          title="총 발주 금액"
          value={stats.totalAmount || 0}
          icon={ShoppingCart}
          iconColor="text-white"
          iconBgColor="bg-success-500"
          onClick={() => navigate('/orders?filter=amount')}
          isLoading={isAnyLoading}
          subtitle="이번 달 기준"
        />
        
        <EnhancedStatsCard
          title="승인 대기"
          value={stats.pendingOrders || 0}
          icon={AlertCircle}
          iconColor="text-white"
          iconBgColor="bg-warning-500"
          onClick={() => navigate('/orders?status=pending')}
          isLoading={isAnyLoading}
        />
        
        <EnhancedStatsCard
          title="활성 프로젝트"
          value={stats.activeProjects || 0}
          icon={Building}
          iconColor="text-white"
          iconBgColor="bg-purple-500"
          onClick={() => navigate('/projects?status=active')}
          isLoading={isAnyLoading}
        />
        
        <EnhancedStatsCard
          title="활성 거래처"
          value={stats.activeVendors || 0}
          icon={Users}
          iconColor="text-white"
          iconBgColor="bg-indigo-500"
          onClick={() => navigate('/vendors')}
          isLoading={isAnyLoading}
        />
        
        <EnhancedStatsCard
          title="이번 달 발주"
          value={stats.monthlyOrders || 0}
          icon={Activity}
          iconColor="text-white"
          iconBgColor="bg-teal-500"
          onClick={() => navigate('/orders?filter=monthly')}
          isLoading={isAnyLoading}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Advanced Monthly Chart */}
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
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">데이터 준비 중...</p>
              </div>
            </div>
          </ChartCard>
        )}

        {/* Advanced Status Distribution Pie Chart */}
        {!isAnyLoading && statusStats && Array.isArray(statusStats) && statusStats.length > 0 ? (
          <AdvancedPieChart
            data={statusStats.map((item: any) => ({
              name: item.status === 'pending' ? '승인대기' : 
                    item.status === 'approved' ? '승인완료' : 
                    item.status === 'sent' ? '발송완료' : 
                    item.status === 'cancelled' ? '취소' : item.status,
              value: item.count,
              status: item.status
            }))}
            title="발주서 상태별 분포"
            subtitle="현재 발주서 상태 현황"
            dataKey="value"
            nameKey="name"
            height={300}
            showExport={true}
            exportFilename="order-status-distribution"
            formatValue={(value, name) => `${value}건`}
            loading={isAnyLoading}
            showLabels={true}
            showLegend={true}
            innerRadius={40}
            outerRadius={100}
          />
        ) : (
          <ChartCard title="발주서 상태별 분포" icon={Package}>
            <div className="h-[350px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">데이터 준비 중...</p>
              </div>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Advanced Chart Widgets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">상세 분석</h2>
          <span className="text-xs text-gray-500">실시간 업데이트</span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Trend Analysis Line Chart */}
          {!isAnyLoading && monthlyStats && Array.isArray(monthlyStats) && monthlyStats.length > 0 && (
            <AdvancedLineChart
              data={(monthlyStats as any).map((item: any, index: number) => ({
                month: item.month.replace('-', '/'),
                orders: item.count,
                amount: formatAmountInMillions(item.amount),
                trend: index > 0 ? 
                  (item.count > (monthlyStats as any)[index - 1]?.count ? 'up' : 'down') : 'neutral'
              }))}
              title="발주 트렌드 분석"
              subtitle="월별 발주 추이 및 변화율"
              xAxisKey="month"
              lines={[
                { 
                  dataKey: 'orders', 
                  name: '발주 건수', 
                  color: '#3b82f6',
                  strokeWidth: 3
                },
                { 
                  dataKey: 'amount', 
                  name: '발주 금액(백만원)', 
                  color: '#10b981',
                  strokeWidth: 2,
                  strokeDasharray: '5 5'
                }
              ]}
              height={320}
              showExport={true}
              exportFilename="order-trend-analysis"
              formatValue={(value, name) => {
                if (name.includes('금액')) {
                  return `${value}백만원`;
                }
                return `${value}건`;
              }}
              showTrend={true}
              loading={isAnyLoading}
              showDots={true}
              showGrid={true}
              curve="monotone"
            />
          )}

          {/* Chart Widget Demo */}
          <ChartWidget
            data={{
              id: 'project-performance',
              title: '현장별 성과 분석',
              value: '8개 현장',
              chartData: projectStats || [],
              chartType: 'bar',
              description: '활성 현장의 발주 성과를 실시간으로 모니터링',
              category: '현장관리',
              lastUpdated: new Date(),
              status: 'normal'
            }}
            height={320}
            showControls={true}
            onRefresh={() => {
              console.log('Refreshing project performance chart');
              // Refresh logic would go here
            }}
            onExpand={() => navigate('/projects')}
            loading={isAnyLoading}
          />
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project-based Purchase Orders */}
        <ChartCard 
          title="현장별 발주 현황" 
          icon={Building}
          headerAction={
            <span className="text-xs text-gray-500">상위 10개</span>
          }
        >
          {!isAnyLoading && projectStats && Array.isArray(projectStats) && projectStats.length > 0 ? (
            <ProjectStatsList
              data={projectStats}
              onProjectClick={(projectId) => navigate(`/projects/${projectId}`)}
              maxItems={10}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Building className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">데이터 준비 중...</p>
              </div>
            </div>
          )}
        </ChartCard>

        {/* Recent Orders */}
        <ChartCard 
          title="최근 발주서" 
          icon={Clock}
          headerAction={
            <button 
              onClick={() => navigate('/orders')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
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
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">데이터 준비 중...</p>
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}