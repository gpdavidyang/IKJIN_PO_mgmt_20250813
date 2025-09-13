import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Users, 
  Shield, 
  AlertTriangle,
  TrendingUp,
  Clock,
  FileText,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface AuditDashboardProps {
  stats: any;
  loading: boolean;
}

export function AuditDashboard({ stats, loading }: AuditDashboardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 animate-spin" />
            <p className="text-muted-foreground">대시보드를 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div>
              <p className="text-lg font-medium">감사 로그 대시보드</p>
              <p className="text-sm text-muted-foreground mt-1">
                시스템 활동을 추적하기 위해 데이터를 수집 중입니다.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                잠시 후 다시 확인해주세요.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate total events
  const totalEvents = stats.eventStats?.reduce((sum: number, e: any) => sum + (e.count || 0), 0) || 0;
  const hasRecentActivity = totalEvents > 0 || stats.activeUserCount > 0;

  return (
    <div className="space-y-4">
      {/* Low activity notice */}
      {!hasRecentActivity && (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">활동이 적습니다</p>
                <p className="text-xs text-muted-foreground">
                  지난 {stats.period}동안 기록된 활동이 매우 적습니다. 시스템이 정상적으로 로깅 중인지 확인하세요.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUserCount || 0}</div>
            <p className="text-xs text-muted-foreground">지난 {stats.period || '24 hours'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 이벤트</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalEvents}
            </div>
            <p className="text-xs text-muted-foreground">지난 {stats.period || '24 hours'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">보안 이벤트</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.securityEvents?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">경고 및 실패</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">에러</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.recentErrors?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">최근 오류</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">이벤트 유형별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.eventStats?.slice(0, 5).map((event: any) => (
                <div key={event.eventType} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {event.eventType}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">{event.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">카테고리별 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.categoryStats?.map((cat: any) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{cat.category}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(cat.count / Math.max(...stats.categoryStats.map((c: any) => c.count))) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{cat.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Security Events */}
      {stats.securityEvents && stats.securityEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">최근 보안 이벤트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.securityEvents.slice(0, 5).map((event: any) => (
                <div key={event.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-orange-500" />
                    <span>{event.action}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{event.userName || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.createdAt), 'HH:mm', { locale: ko })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Errors */}
      {stats.recentErrors && stats.recentErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">최근 에러</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentErrors.slice(0, 5).map((error: any) => (
                <div key={error.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="font-medium">{error.action}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(error.createdAt), 'HH:mm', { locale: ko })}
                    </span>
                  </div>
                  {error.errorMessage && (
                    <p className="text-xs text-muted-foreground pl-6">{error.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}