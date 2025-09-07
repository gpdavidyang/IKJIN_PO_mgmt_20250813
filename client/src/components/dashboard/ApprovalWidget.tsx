import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
  ChevronRight,
  AlertCircle,
  Calendar,
  DollarSign,
  BarChart3,
  Activity
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { formatKoreanWon } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ApprovalStats {
  pendingCount: number;
  urgentCount: number;
  todayCount: number;
  weekCount: number;
  averageWaitDays: number;
  pendingAmount: number;
  approvedThisWeek: number;
  rejectedThisWeek: number;
  approvalRate: number;
}

interface PendingApproval {
  id: number;
  orderNumber: string;
  projectName: string;
  totalAmount: number;
  createdAt: string;
  daysWaiting: number;
  isUrgent: boolean;
  requiredRole: string;
}

interface ApprovalActivity {
  id: number;
  action: 'approved' | 'rejected' | 'pending';
  orderNumber: string;
  performedBy: string;
  performedAt: string;
  amount: number;
}

interface ApprovalWidgetProps {
  className?: string;
  showDetails?: boolean;
}

export function ApprovalWidget({ className = '', showDetails = true }: ApprovalWidgetProps) {
  const [, navigate] = useLocation();

  // Fetch approval statistics
  const { data: stats, isLoading: statsLoading } = useQuery<ApprovalStats>({
    queryKey: ['/api/approvals/dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/approvals/dashboard-stats', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch approval stats');
      }
      
      return response.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch pending approvals
  const { data: pendingApprovals, isLoading: pendingLoading } = useQuery<PendingApproval[]>({
    queryKey: ['/api/approvals/pending-summary'],
    queryFn: async () => {
      const response = await fetch('/api/approvals/pending-summary?limit=5', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending approvals');
      }
      
      return response.json();
    },
    refetchInterval: 60000
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery<ApprovalActivity[]>({
    queryKey: ['/api/approvals/recent-activity'],
    queryFn: async () => {
      const response = await fetch('/api/approvals/recent-activity?limit=5', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent activity');
      }
      
      return response.json();
    },
    refetchInterval: 60000
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-200">승인</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-200">반려</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">대기</Badge>;
    }
  };

  const getUrgencyBadge = (isUrgent: boolean, daysWaiting: number) => {
    if (isUrgent) {
      return <Badge variant="destructive" className="text-xs">긴급</Badge>;
    }
    if (daysWaiting > 3) {
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">지연</Badge>;
    }
    return null;
  };

  if (!showDetails) {
    // Compact view for dashboard
    return (
      <Card className={`shadow-sm hover:shadow-md transition-shadow cursor-pointer ${className}`}
        onClick={() => navigate('/approvals')}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="text-lg">승인 관리</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-500">승인 대기</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats?.pendingCount || 0}</p>
                {stats?.urgentCount ? (
                  <Badge variant="destructive" className="text-xs">
                    {stats.urgentCount} 긴급
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">이번 주 처리</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-green-600">
                  {stats?.approvedThisWeek || 0}
                </p>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">승인율</span>
              <span className="font-medium">{stats?.approvalRate || 0}%</span>
            </div>
            <Progress value={stats?.approvalRate || 0} className="h-2" />
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">최근 대기 중</p>
            {pendingLoading ? (
              <div className="text-center py-2">
                <p className="text-xs text-gray-400">로딩 중...</p>
              </div>
            ) : pendingApprovals && pendingApprovals.length > 0 ? (
              <div className="space-y-1">
                {pendingApprovals.slice(0, 3).map((approval) => (
                  <div key={approval.id} 
                    className="flex items-center justify-between py-1 text-xs hover:bg-gray-50 rounded px-1"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{approval.orderNumber}</span>
                      {getUrgencyBadge(approval.isUrgent, approval.daysWaiting)}
                    </div>
                    <span className="text-gray-500 flex-shrink-0">
                      {approval.daysWaiting}일 전
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">
                대기 중인 승인이 없습니다
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detailed view for standalone widget
  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span>승인 관리 현황</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/approvals')}
          >
            <ChevronRight className="h-4 w-4 mr-1" />
            전체보기
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <p className="text-xs text-gray-500">승인 대기</p>
            </div>
            <p className="text-2xl font-bold">{stats?.pendingCount || 0}</p>
            {stats?.urgentCount ? (
              <Badge variant="destructive" className="text-xs">
                {stats.urgentCount}건 긴급
              </Badge>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-gray-500">오늘 처리</p>
            </div>
            <p className="text-2xl font-bold">{stats?.todayCount || 0}</p>
            <p className="text-xs text-gray-400">
              주간 {stats?.weekCount || 0}건
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <p className="text-xs text-gray-500">대기 금액</p>
            </div>
            <p className="text-lg font-bold text-blue-600">
              {formatKoreanWon(stats?.pendingAmount || 0)}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-gray-500">승인율</p>
            </div>
            <p className="text-2xl font-bold">{stats?.approvalRate || 0}%</p>
            <Progress value={stats?.approvalRate || 0} className="h-1" />
          </div>
        </div>

        <Separator />

        {/* Pending Approvals List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              승인 대기 목록
            </h3>
            <Badge variant="outline">
              평균 대기: {stats?.averageWaitDays || 0}일
            </Badge>
          </div>
          
          <ScrollArea className="h-48">
            {pendingLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-gray-400">로딩 중...</p>
              </div>
            ) : pendingApprovals && pendingApprovals.length > 0 ? (
              <div className="space-y-2">
                {pendingApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                    onClick={() => navigate(`/orders/${approval.id}/standard`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {approval.orderNumber}
                          </span>
                          {getUrgencyBadge(approval.isUrgent, approval.daysWaiting)}
                        </div>
                        <span className="text-xs text-gray-500">
                          {approval.projectName}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-600">
                        {formatKoreanWon(approval.totalAmount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {approval.daysWaiting}일 대기
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm text-gray-500">승인 대기 중인 발주서가 없습니다</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <Separator />

        {/* Recent Activity */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            최근 활동
          </h3>
          
          {activityLoading ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">로딩 중...</p>
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    {getActionIcon(activity.action)}
                    <div>
                      <span className="text-sm font-medium">
                        {activity.orderNumber}
                      </span>
                      <p className="text-xs text-gray-500">
                        {activity.performedBy} • {formatDistanceToNow(new Date(activity.performedAt), {
                          addSuffix: true,
                          locale: ko
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getActionBadge(activity.action)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">
              최근 활동이 없습니다
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}