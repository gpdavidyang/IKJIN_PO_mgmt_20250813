/**
 * Mobile-Optimized Dashboard Component
 * 
 * Example of mobile-responsive dashboard with:
 * - Adaptive card layouts
 * - Touch-friendly stats
 * - Swipeable widgets
 * - Mobile-first design
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  Building,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { ResponsiveGrid, ResponsiveStack, MobileOnly, DesktopOnly } from './mobile-layout';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalAmount: number;
  monthlyGrowth: number;
  activeVendors: number;
  activeProjects: number;
}

interface MobileDashboardProps {
  stats: DashboardStats;
  className?: string;
}

export function MobileDashboard({ stats, className }: MobileDashboardProps) {
  const { isMobile, isTablet } = useResponsive();

  // Quick action buttons for mobile
  const quickActions = [
    {
      label: '발주 작성',
      icon: Plus,
      href: '/create-order',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      label: '발주 조회',
      icon: FileText,
      href: '/orders',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      label: '거래처',
      icon: Building,
      href: '/vendors',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      label: '승인 대기',
      icon: Clock,
      href: '/approvals',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ];

  // Stat cards configuration
  const statCards = [
    {
      title: '총 발주서',
      value: stats.totalOrders,
      icon: FileText,
      trend: stats.monthlyGrowth > 0 ? 'up' : 'down',
      trendValue: `${Math.abs(stats.monthlyGrowth)}%`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '대기 중',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      urgent: stats.pendingOrders > 10,
    },
    {
      title: '완료',
      value: stats.completedOrders,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '총 금액',
      value: `${(stats.totalAmount / 100000000).toFixed(1)}억원`,
      icon: DollarSign,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Mobile Quick Actions */}
      <MobileOnly>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">빠른 작업</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={cn(
                    'h-20 flex-col gap-2 border-2 transition-all',
                    'hover:scale-105 active:scale-95'
                  )}
                  onClick={() => window.location.href = action.href}
                >
                  <action.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </MobileOnly>

      {/* Desktop Quick Actions */}
      <DesktopOnly>
        <div className="flex gap-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              className={cn('gap-2', action.color)}
              onClick={() => window.location.href = action.href}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </DesktopOnly>

      {/* Stats Grid */}
      <ResponsiveGrid
        cols={{ mobile: 2, tablet: 2, desktop: 4 }}
        gap={isMobile ? 'sm' : 'md'}
      >
        {statCards.map((stat, index) => (
          <Card 
            key={index}
            className={cn(
              'transition-all hover:shadow-md',
              stat.urgent && 'ring-2 ring-orange-200'
            )}
          >
            <CardContent className={cn('p-4', isMobile && 'p-3')}>
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <p className={cn(
                    'text-xs font-medium text-gray-600',
                    isMobile && 'text-xs'
                  )}>
                    {stat.title}
                  </p>
                  <p className={cn(
                    'text-xl font-bold',
                    isMobile && 'text-lg',
                    stat.color
                  )}>
                    {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
                  </p>
                  {stat.trend && (
                    <div className="flex items-center gap-1">
                      {stat.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={cn(
                        'text-xs',
                        stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {stat.trendValue}
                      </span>
                    </div>
                  )}
                </div>
                <div className={cn(
                  'p-2 rounded-lg',
                  stat.bgColor
                )}>
                  <stat.icon className={cn(
                    'h-5 w-5',
                    isMobile && 'h-4 w-4',
                    stat.color
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </ResponsiveGrid>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className={cn('text-base', isMobile && 'text-sm')}>
              최근 발주서
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">
              전체 보기
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium">PO-2024-{String(i).padStart(3, '0')}</p>
                  <p className="text-xs text-gray-600">현대건설 - 철근 자재</p>
                </div>
                <div className="text-right">
                  <Badge variant={i === 1 ? 'default' : 'secondary'}>
                    {i === 1 ? '승인 대기' : '완료'}
                  </Badge>
                  <p className="text-xs text-gray-600 mt-1">2시간 전</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className={cn('text-base', isMobile && 'text-sm')}>
              승인 대기
            </CardTitle>
            <Badge variant="secondary">{stats.pendingOrders}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">긴급 자재 발주</p>
                  <p className="text-xs text-gray-600">5,200만원 • 삼성물산</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs">
                  승인
                </Button>
              </div>
            ))}
            
            {stats.pendingOrders === 0 && (
              <div className="text-center py-6 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">승인 대기 중인 발주서가 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Bottom Actions */}
      <MobileOnly>
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <Button className="w-full" size="lg">
            <Plus className="h-5 w-5 mr-2" />
            새 발주서 작성
          </Button>
        </div>
      </MobileOnly>
    </div>
  );
}

export default MobileDashboard;