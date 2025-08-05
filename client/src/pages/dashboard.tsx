import { FileText, Package, Users, Clock, Building, Plus, AlertCircle, BarChart3, CheckCircle, TrendingUp, ShoppingCart, Activity, FolderTree, ChevronRight, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/use-enhanced-queries";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { formatKoreanWon } from "@/lib/utils";
import { useTheme } from "@/components/ui/theme-provider";

// Import enhanced components
import { EnhancedStatsCard } from "@/components/dashboard/enhanced-stats-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ProjectStatsList } from "@/components/dashboard/project-stats-list";
import { RecentOrdersList } from "@/components/dashboard/recent-orders-list";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

// Import new advanced chart components
import { AdvancedBarChart, AdvancedPieChart, AdvancedLineChart } from "@/components/charts/advanced-chart";
// Import basic recharts for fallback
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { KPIWidget, ChartWidget, DashboardGrid, useRealTimeData } from "@/components/charts/dashboard-widgets";
import { InteractiveTooltip } from "@/components/charts/interactive-tooltip";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { actualTheme } = useTheme();
  
  // Dark mode detection
  const isDarkMode = actualTheme === 'dark';

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
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboardData();
  
  // Debug logging
  useEffect(() => {
    if (dashboardError) {
      console.error("Dashboard data fetch error:", dashboardError);
    }
    if (dashboardData) {
      console.log("Dashboard data loaded:", dashboardData);
    }
  }, [dashboardData, dashboardError]);

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
    return Math.round(Number(amount) / 1000000);
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
    <div className="p-2 min-h-screen" style={{ backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }}>
      {/* Ultra-Compact TOSS Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-sm font-semibold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>대시보드</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshStats}
            disabled={realtimeLoading}
            className="text-xs flex items-center gap-1 px-1 py-0.5 rounded transition-colors"
            style={{ 
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDarkMode ? '#d1d5db' : '#374151';
              e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Activity className={`h-3 w-3 ${realtimeLoading ? 'animate-spin' : ''}`} />
            {realtimeLoading ? '업데이트' : '새로고침'}
          </button>
          <span className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
            {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Ultra-High Density KPI Row */}
      <div className="grid grid-cols-6 gap-1 mb-2">
        {/* Pending Orders */}
        <div 
          className="rounded border p-2 hover:shadow-sm transition-all cursor-pointer" 
          style={{ 
            backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.2)' : 'rgba(239, 246, 255, 0.3)',
            borderColor: isDarkMode ? '#1e40af' : '#93c5fd'
          }}
          onClick={() => navigate('/orders?status=pending')}
        >
          <div className="flex items-center justify-between">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: isDarkMode ? 'rgba(180, 83, 9, 0.3)' : '#fef3c7' }}
            >
              <Clock className="h-3 w-3" style={{ color: isDarkMode ? '#fbbf24' : '#d97706' }} />
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>{stats.pendingOrders || 0}</div>
              <div className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>승인대기</div>
            </div>
          </div>
        </div>

        {/* Urgent Orders */}
        <div 
          className="rounded border p-2 hover:shadow-sm transition-all cursor-pointer" 
          style={{ 
            backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.2)' : 'rgba(239, 246, 255, 0.3)',
            borderColor: isDarkMode ? '#1e40af' : '#93c5fd'
          }}
          onClick={() => navigate('/orders?filter=urgent')}
        >
          <div className="flex items-center justify-between">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: isDarkMode ? 'rgba(127, 29, 29, 0.3)' : '#fecaca' }}
            >
              <AlertCircle className="h-3 w-3" style={{ color: isDarkMode ? '#f87171' : '#dc2626' }} />
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>{stats.urgentOrders || 0}</div>
              <div className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>긴급발주</div>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div 
          className="rounded border p-2"
          style={{ 
            backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.2)' : 'rgba(239, 246, 255, 0.3)',
            borderColor: isDarkMode ? '#1e40af' : '#93c5fd'
          }}
        >
          <div className="flex items-center justify-between">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.3)' : '#dbeafe' }}
            >
              <FileText className="h-3 w-3" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }} />
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>{stats.totalOrders || 0}</div>
              <div className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>총발주서</div>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div 
          className="rounded border p-2"
          style={{ 
            backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.2)' : 'rgba(239, 246, 255, 0.3)',
            borderColor: isDarkMode ? '#1e40af' : '#93c5fd'
          }}
        >
          <div className="flex items-center justify-between">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.3)' : '#d1fae5' }}
            >
              <DollarSign className="h-3 w-3" style={{ color: isDarkMode ? '#34d399' : '#059669' }} />
            </div>
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}>{formatKoreanWon(stats.totalAmount || 0).replace('₩', '').replace(',000,000', 'M')}</div>
              <div className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>총금액</div>
            </div>
          </div>
        </div>

        {/* Active Projects */}
        <div 
          className="rounded border p-2"
          style={{ 
            backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.2)' : 'rgba(239, 246, 255, 0.3)',
            borderColor: isDarkMode ? '#1e40af' : '#93c5fd'
          }}
        >
          <div className="flex items-center justify-between">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: isDarkMode ? 'rgba(107, 33, 168, 0.3)' : '#ede9fe' }}
            >
              <Building className="h-3 w-3" style={{ color: isDarkMode ? '#a855f7' : '#7c3aed' }} />
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>{stats.activeProjects || 0}</div>
              <div className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>활성현장</div>
            </div>
          </div>
        </div>

        {/* Active Vendors */}
        <div 
          className="rounded border p-2"
          style={{ 
            backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.2)' : 'rgba(239, 246, 255, 0.3)',
            borderColor: isDarkMode ? '#1e40af' : '#93c5fd'
          }}
        >
          <div className="flex items-center justify-between">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: isDarkMode ? 'rgba(67, 56, 202, 0.3)' : '#e0e7ff' }}
            >
              <Users className="h-3 w-3" style={{ color: isDarkMode ? '#818cf8' : '#4f46e5' }} />
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>{stats.activeVendors || 0}</div>
              <div className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>활성거래처</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ultra-High Density 3-Column Layout */}
      <div className="grid grid-cols-3 gap-1">
        {/* Left Column: Monthly Chart + Status Distribution */}
        <div className="space-y-1">
          {/* Monthly Statistics - Compact */}
          {!isAnyLoading && monthlyStats && Array.isArray(monthlyStats) && monthlyStats.length > 0 ? (() => {
            const chartData = (monthlyStats as any).map((item: any) => ({
              month: item.month.replace('-', '/'),
              orders: Number(item.count) || 0
            }));
            
            return (
              <div 
                className="rounded border p-2"
                style={{ 
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  borderColor: isDarkMode ? '#374151' : '#93c5fd'
                }}
              >
                <div className="flex items-center gap-1 mb-2">
                  <TrendingUp className="h-3 w-3" style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }} />
                  <h3 className="text-xs font-semibold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>월별 발주 통계</h3>
                </div>
                <div className="h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#f3f4f6" />
                      <XAxis dataKey="month" fontSize={9} axisLine={false} tickLine={false} />
                      <YAxis fontSize={9} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => [`${value}건`, '발주 건수']} />
                      <Bar dataKey="orders" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })() : (
            <div 
              className="rounded border p-2"
              style={{ 
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                borderColor: isDarkMode ? '#374151' : '#93c5fd'
              }}
            >
              <div className="flex items-center gap-1 mb-2">
                <TrendingUp className="h-3 w-3" style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }} />
                <h3 className="text-xs font-semibold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>월별 발주 통계</h3>
              </div>
              <div className="h-[140px] flex items-center justify-center" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                <div className="text-center">
                  <BarChart3 className="h-6 w-6 mx-auto mb-1" style={{ color: isDarkMode ? '#4b5563' : '#d1d5db' }} />
                  <p className="text-xs">데이터 준비 중...</p>
                </div>
              </div>
            </div>
          )}

          {/* Status Distribution - Pie Chart */}
          <div 
            className="rounded border p-2"
            style={{ 
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              borderColor: isDarkMode ? '#374151' : '#93c5fd'
            }}
          >
            <div className="flex items-center gap-1 mb-2">
              <Package className="h-3 w-3" style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }} />
              <h3 className="text-xs font-semibold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>발주상태분포</h3>
            </div>
            {!isAnyLoading && statusStats && Array.isArray(statusStats) && statusStats.length > 0 ? (
              <div className="h-[140px] w-full">
                <AdvancedPieChart
                  data={statusStats.map((item: any) => ({
                    name: item.status === 'pending' ? '승인대기' : 
                          item.status === 'approved' ? '승인완료' : 
                          item.status === 'sent' ? '발송완료' : 
                          item.status === 'completed' ? '완료' : 
                          item.status === 'draft' ? '임시저장' :
                          item.status === 'cancelled' ? '취소됨' : item.status,
                    value: parseInt(item.count),
                    status: item.status
                  }))}
                  dataKey="value"
                  nameKey="name"
                  height={140}
                  showExport={false}
                  showLabels={false}
                  showLegend={false}
                  innerRadius={20}
                  outerRadius={45}
                  colors={[
                    '#f59e0b', // pending - yellow
                    '#10b981', // approved - green  
                    '#3b82f6', // sent - blue
                    '#8b5cf6', // completed - purple
                    '#6b7280', // draft - gray
                    '#ef4444'  // cancelled - red
                  ]}
                  formatValue={(value: number) => `${value}건`}
                />
              </div>
            ) : (
              <div className="h-[140px] flex items-center justify-center" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                <div className="text-center">
                  <Package className="h-6 w-6 mx-auto mb-1" style={{ color: isDarkMode ? '#4b5563' : '#d1d5db' }} />
                  <p className="text-xs">데이터 준비 중...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Project Stats List */}
        <div 
          className="rounded border p-2"
          style={{ 
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <Building className="h-3 w-3" style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }} />
              <h3 className="text-xs font-semibold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>현장별 발주 현황</h3>
            </div>
            <span className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>상위 10개</span>
          </div>
          <div className="h-[260px] overflow-y-auto">
            {!isAnyLoading && projectStats && Array.isArray(projectStats) && projectStats.length > 0 ? (
              <div className="space-y-1">
                {projectStats.slice(0, 10).map((project: any, index: number) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs font-medium w-4 text-center" style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }} title={project.projectName}>
                          {project.projectName}
                        </div>
                        <div className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>{project.orderCount}건</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}>
                        {formatKoreanWon(project.totalAmount || 0).replace('₩', '').replace(',000,000', 'M')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                <div className="text-center">
                  <Building className="h-6 w-6 mx-auto mb-1" style={{ color: isDarkMode ? '#4b5563' : '#d1d5db' }} />
                  <p className="text-xs">데이터 준비 중...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity + Category Stats */}
        <div className="space-y-1">
          {/* Recent Orders - Ultra Compact */}
          <div 
            className="rounded border p-2"
            style={{ 
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              borderColor: isDarkMode ? '#374151' : '#e5e7eb'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }} />
                <h3 className="text-xs font-semibold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>최근 발주서</h3>
              </div>
              <button 
                onClick={() => navigate('/orders')}
                className="text-xs font-medium transition-colors"
                style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = isDarkMode ? '#3b82f6' : '#1d4ed8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDarkMode ? '#60a5fa' : '#2563eb';
                }}
              >
                전체보기
              </button>
            </div>
            <div className="h-[120px] overflow-y-auto">
              {!isAnyLoading && recentOrders.length > 0 ? (
                <div className="space-y-1">
                  {recentOrders.slice(0, 6).map((order: any, index: number) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-1 rounded cursor-pointer transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>{order.orderNumber}</div>
                        <div className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>{order.vendor?.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}>
                          {formatKoreanWon(order.totalAmount || 0).replace('₩', '').replace(',000,000', 'M')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[100px] flex items-center justify-center" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                  <div className="text-center">
                    <Clock className="h-6 w-6 mx-auto mb-1" style={{ color: isDarkMode ? '#4b5563' : '#d1d5db' }} />
                    <p className="text-xs">데이터 준비 중...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Summary - Ultra Compact */}
          <div 
            className="rounded border p-2"
            style={{ 
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              borderColor: isDarkMode ? '#374151' : '#e5e7eb'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <FolderTree className="h-3 w-3" style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }} />
                <h3 className="text-xs font-semibold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>품목 분류</h3>
              </div>
              <button 
                onClick={() => navigate('/category-management')}
                className="text-xs font-medium transition-colors"
                style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = isDarkMode ? '#3b82f6' : '#1d4ed8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDarkMode ? '#60a5fa' : '#2563eb';
                }}
              >
                관리
              </button>
            </div>
            <div className="h-[120px] overflow-y-auto">
              {!isAnyLoading && categoryStats && Array.isArray(categoryStats) && categoryStats.length > 0 ? (
                <div className="space-y-1">
                  {categoryStats
                    .slice(0, 6)
                    .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
                    .map((category: any, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-1 rounded transition-colors"
                        style={{ backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>
                              {category.majorCategory}
                            </span>
                            {category.middleCategory !== '미분류' && (
                              <>
                                <ChevronRight className="h-2 w-2" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }} />
                                <span className="text-xs truncate" style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>
                                  {category.middleCategory}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                            {category.orderCount}건
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}>
                            {formatKoreanWon(category.totalAmount).replace('₩', '').replace(',000,000', 'M')}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="h-[100px] flex items-center justify-center" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                  <div className="text-center">
                    <FolderTree className="h-6 w-6 mx-auto mb-1" style={{ color: isDarkMode ? '#4b5563' : '#d1d5db' }} />
                    <p className="text-xs">데이터 준비 중...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}