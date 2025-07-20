import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FileText, Package, Users, Clock, Building, Plus, AlertCircle, BarChart3, CheckCircle, TrendingUp, Mail, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useLocation } from "wouter";
import { formatKoreanWon, formatDate } from "@/lib/utils";
import { getStatusText, getStatusColor } from "@/lib/statusUtils";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { hasPermission } from "@/utils/auth-helpers";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // 권한 체크
  const canViewDashboard = user && hasPermission(user.role, "canViewDashboard");
  const canViewAllOrders = user && hasPermission(user.role, "canViewAllOrders");
  const canApproveOrders = user && hasPermission(user.role, "canApproveOrders");
  const canViewEmailHistory = user && hasPermission(user.role, "canViewEmailHistory");

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
  const stats = dashboardData?.stats || {};
  const monthlyStats = dashboardData?.monthlyStats || [];
  const projectStats = dashboardData?.projectStats || {};
  const statusStats = dashboardData?.statusStats || {};
  const orders = dashboardData?.orders || { orders: [] };
  const activeProjectsCount = dashboardData?.activeProjectsCount || { count: 0 };
  const newProjectsThisMonth = dashboardData?.newProjectsThisMonth || { count: 0 };
  const recentProjects = dashboardData?.recentProjects || [];
  const urgentOrders = dashboardData?.urgentOrders || [];
  
  // Derived data for components
  const recentOrders = orders.orders?.slice(0, 5) || [];

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
    <ProtectedRoute 
      requiredPermission="canViewDashboard"
      deniedMessage="대시보드에 접근할 권한이 없습니다."
    >
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <PageHeader 
          title="대시보드"
          description="발주 관리 시스템 현황"
        />

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">빠른 작업</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-3 flex-wrap">
              {canApproveOrders && (
                <Button 
                  variant="outline"
                  onClick={() => navigate('/orders?status=pending')} 
                  className="flex items-center gap-2 h-9"
                  size="sm"
                >
                  <AlertCircle className="h-4 w-4" />
                  승인 대기 발주서 확인
                </Button>
              )}

              <Button 
                variant="outline"
                onClick={() => navigate('/orders?filter=urgent')} 
                className="flex items-center gap-2 h-9"
                size="sm"
              >
                <Clock className="h-4 w-4" />
                긴급 발주서 검토
              </Button>

              <Button 
                variant="outline"
                onClick={() => navigate('/create-order/excel')} 
                className="flex items-center gap-2 h-9"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Excel 발주서 작성
              </Button>

              {canViewEmailHistory && (
                <Button 
                  variant="outline"
                  onClick={() => navigate('/email-history')} 
                  className="flex items-center gap-2 h-9"
                  size="sm"
                >
                  <Mail className="h-4 w-4" />
                  이메일 이력 확인
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/orders?filter=monthly')}
          >
            <CardContent className="p-3">
              <div className="flex items-center">
                <div className="p-1.5 rounded-lg bg-blue-500 text-white">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="ml-2">
                  <p className="text-xs font-medium text-gray-600">이번 달 발주</p>
                  <p className="text-lg font-bold text-gray-900">
                    {isAnyLoading ? '-' : (stats as any)?.monthlyOrders || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/orders?filter=yearly')}
          >
            <CardContent className="p-3">
              <div className="flex items-center">
                <div className="p-1.5 rounded-lg bg-green-500 text-white">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="ml-2">
                  <p className="text-xs font-medium text-gray-600">금년 총 발주 수</p>
                  <p className="text-lg font-bold text-gray-900">
                    {isAnyLoading ? '-' : (stats as any)?.yearlyOrders || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {canApproveOrders && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/orders?status=pending')}
            >
              <CardContent className="p-3">
                <div className="flex items-center">
                  <div className="p-1.5 rounded-lg bg-orange-500 text-white">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="ml-2">
                    <p className="text-xs font-medium text-gray-600">승인 대기</p>
                    <p className="text-lg font-bold text-gray-900">
                      {isAnyLoading ? '-' : (stats as any)?.awaitingApprovalOrders || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/orders?filter=monthly')}
          >
            <CardContent className="p-3">
              <div className="flex items-center">
                <div className="p-1.5 rounded-lg bg-purple-500 text-white">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="ml-2">
                  <p className="text-xs font-medium text-gray-600">이번달 총 발주 금액</p>
                  <p className="text-lg font-bold text-gray-900">
                    {isAnyLoading ? '-' : formatKoreanWon((stats as any)?.monthlyAmount || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
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
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/projects?filter=new')}
          >
            <CardContent className="p-3">
              <div className="flex items-center">
                <div className="p-1.5 rounded-lg bg-teal-500 text-white">
                  <Calendar className="h-4 w-4" />
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
        {canViewAllOrders && (
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
                      ...item,
                      amount: formatAmountInMillions(item.amount)
                    }))} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={{ stroke: '#E5E7EB' }}
                    />
                    <Tooltip 
                      formatter={(value, name, props) => {
                        if (name === 'orders' || name === '발주 건수') {
                          return [`${value}건`, '발주 건수'];
                        } else {
                          return [`${formatAmount(Number(value) * 1000000)}`, '발주 금액'];
                        }
                      }}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      iconType="rect"
                    />
                    <Bar 
                      dataKey="orders" 
                      fill="#3B82F6" 
                      name="발주 건수"
                      radius={[2, 2, 0, 0]}
                      opacity={0.8}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="#10B981" 
                      name="발주 금액(백만원)"
                      radius={[2, 2, 0, 0]}
                      opacity={0.8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>데이터 준비 중...</p>
                </div>
              </div>
            )}
          </CardContent>
          </Card>
        )}

        {/* Status Distribution Pie Chart */}
        {canViewAllOrders && (
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
                        dataKey="orders"
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {statusStats.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any, props: any) => [`${value}건`, getStatusText(props.payload.status)]}
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  {statusStats.map((entry: any, index: number) => (
                    <div key={entry.status} className="flex items-center gap-1 hover:opacity-80 cursor-pointer">
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
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>데이터 준비 중...</p>
                </div>
              </div>
            )}
          </CardContent>
          </Card>
        )}
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project-based Purchase Orders */}
        {canViewAllOrders && (
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
                  <div 
                    key={project.projectName} 
                    className="flex justify-between items-center py-2 px-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors" 
                    onClick={() => project.id && navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-[11px] font-medium min-w-[28px] text-center">
                        #{index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate text-blue-600 hover:text-blue-800">{project.projectName}</p>
                        <p className="text-xs text-gray-500">{project.projectCode}</p>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-semibold">{project.orderCount}건</p>
                      <p className="text-xs text-gray-500">{formatAmount(project.totalAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Building className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>데이터 준비 중...</p>
                </div>
              </div>
            )}
          </CardContent>
          </Card>
        )}

        {/* Recent Orders - Compact */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                최근 발주서
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/orders')}
                className="text-xs h-8"
              >
                전체 보기
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isAnyLoading && recentOrders.length > 0 ? (
              <div className="space-y-1">
                {recentOrders.map((order: any) => (
                  <div
                    key={order.orderNumber}
                    className="flex justify-between items-center py-2 px-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{order.orderNumber}</p>
                        <span 
                          className={`px-2 py-1 rounded text-[10px] font-medium ${getStatusColor(order.status)}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-semibold">{formatAmount(order.totalAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>데이터 준비 중...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </ProtectedRoute>
  );
}