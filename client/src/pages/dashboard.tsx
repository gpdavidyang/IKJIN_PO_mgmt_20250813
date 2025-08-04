import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FileText, Package, Users, Clock, Building, Plus, AlertCircle, BarChart3, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useLocation } from "wouter";
import { formatKoreanWon, formatDate } from "@/lib/utils";
import { getStatusText, getStatusColor } from "@/lib/statusUtils";

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

  // Unified dashboard API call - replaces 8 individual API calls with 1
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/dashboard/unified"],
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

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

  // Single loading state for all data
  const isAnyLoading = dashboardLoading;

  if (isAnyLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }



  // 파이 차트용 색상
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const formatAmount = (amount: number) => {
    return `₩${Math.round(amount).toLocaleString('ko-KR')}`;
  };

  const formatAmountInMillions = (amount: number) => {
    return Math.round(amount / 1000000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Quick Actions */}
      <div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">빠른 작업</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-3 flex-wrap">
              <Button 
                variant="outline"
                onClick={() => navigate('/orders?status=pending')} 
                className="flex items-center gap-2 h-9"
                size="sm"
              >
                <AlertCircle className="h-4 w-4" />
                승인 대기 발주서 확인
              </Button>

              <Button 
                variant="outline"
                onClick={() => navigate('/orders?filter=urgent')} 
                className="flex items-center gap-2 h-9"
                size="sm"
              >
                <Clock className="h-4 w-4" />
                긴급 발주서 검토
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <Card 
          className="cursor-pointer"
          onClick={() => navigate('/orders?filter=monthly')}
        >
          <CardContent className="p-3">
            <div className="flex items-center">
              <div className="p-1.5 rounded-lg bg-blue-500 text-white">
                <FileText className="h-4 w-4" />
              </div>
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-600">총 발주서</p>
                <p className="text-lg font-bold text-gray-900">
                  {isAnyLoading ? '-' : stats.totalOrders || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer"
          onClick={() => navigate('/orders?filter=yearly')}
        >
          <CardContent className="p-3">
            <div className="flex items-center">
              <div className="p-1.5 rounded-lg bg-green-500 text-white">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-600">총 발주 금액</p>
                <p className="text-lg font-bold text-gray-900">
                  {isAnyLoading ? '-' : formatKoreanWon(stats.totalAmount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer"
          onClick={() => navigate('/orders?status=pending')}
        >
          <CardContent className="p-3">
            <div className="flex items-center">
              <div className="p-1.5 rounded-lg bg-orange-500 text-white">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-600">활성 프로젝트</p>
                <p className="text-lg font-bold text-gray-900">
                  {isAnyLoading ? '-' : stats.activeProjects || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer"
          onClick={() => navigate('/orders?filter=monthly')}
        >
          <CardContent className="p-3">
            <div className="flex items-center">
              <div className="p-1.5 rounded-lg bg-purple-500 text-white">
                <FileText className="h-4 w-4" />
              </div>
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-600">활성 거래처</p>
                <p className="text-lg font-bold text-gray-900">
                  {isAnyLoading ? '-' : stats.activeVendors || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer"
          onClick={() => navigate('/projects?status=active')}
        >
          <CardContent className="p-3">
            <div className="flex items-center">
              <div className="p-1.5 rounded-lg bg-green-500 text-white">
                <Package className="h-4 w-4" />
              </div>
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-600">진행 중 현장 수</p>
                <p className="text-lg font-bold text-gray-900">
                  {isAnyLoading ? '-' : (activeProjectsCount as any)?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer"
          onClick={() => navigate('/projects?filter=new')}
        >
          <CardContent className="p-3">
            <div className="flex items-center">
              <div className="p-1.5 rounded-lg bg-teal-500 text-white">
                <Plus className="h-4 w-4" />
              </div>
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-600">이번 달 신규 현장</p>
                <p className="text-lg font-bold text-gray-900">
                  {isAnyLoading ? '-' : (newProjectsThisMonth as any)?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              월별 발주 통계
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isAnyLoading && monthlyStats && Array.isArray(monthlyStats) && monthlyStats.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={(monthlyStats as any).map((item: any) => ({
                      month: item.month.replace('-', '/'), // 2024-11 -> 2024/11
                      orders: item.count, // count -> orders for chart compatibility
                      amount: formatAmountInMillions(item.amount)
                    }))} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value, name, props) => {
                        if (name === 'orders' || name === '발주 건수') {
                          return [`${value}건`, '발주 건수'];
                        } else {
                          return [`${formatAmount(Number(value) * 1000000)}`, '발주 금액'];
                        }
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="orders" fill="#3B82F6" name="발주 건수" />
                    <Bar dataKey="amount" fill="#10B981" name="발주 금액(백만원)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                데이터 준비 중...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              발주서 상태별 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isAnyLoading && statusStats && Array.isArray(statusStats) && statusStats.length > 0 ? (
              <div className="space-y-3">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {statusStats.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [`${value}건`, getStatusText(props.payload.status)]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  {statusStats.map((entry: any, index: number) => (
                    <div key={entry.status} className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-sm" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span>{getStatusText(entry.status)} ({entry.orders}건)</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                데이터 준비 중...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project-based Purchase Orders */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Building className="h-5 w-5 mr-2" />
              현장별 발주 현황 (상위 10개)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isAnyLoading && projectStats && Array.isArray(projectStats) && projectStats.length > 0 ? (
              <div className="space-y-1">
                {projectStats.slice(0, 10).map((project: any, index: number) => (
                  <div key={project.projectName} className="flex justify-between items-center py-1.5 px-1 hover:bg-gray-50 rounded cursor-pointer" onClick={() => project.projectId && navigate(`/projects/${project.projectId}`)}>
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                        #{index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate text-blue-600 hover:text-blue-800">{project.projectName}</p>
                        <p className="text-[10px] text-gray-500">{project.projectType}</p>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-xs font-semibold">{project.orderCount}건</p>
                      <p className="text-[10px] text-gray-500">{formatKoreanWon(project.totalAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                데이터 준비 중...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders - Compact */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              최근 발주서
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isAnyLoading && recentOrders.length > 0 ? (
              <div className="space-y-1">
                {recentOrders.map((order: any) => (
                  <div
                    key={order.orderNumber}
                    className="flex justify-between items-center py-1.5 px-1 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium truncate">{order.orderNumber}</p>
                        <span 
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(order.status)}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-xs font-semibold">{formatAmount(order.totalAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                데이터 준비 중...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}