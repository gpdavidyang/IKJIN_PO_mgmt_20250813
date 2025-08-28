import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Shield,
  AlertTriangle,
  Lock,
  UserX,
  RefreshCw,
  Download,
  Eye,
  Ban,
  KeyRound
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState, useEffect } from "react";

interface SecurityEventsProps {
  filters?: any;
}

export function SecurityEvents({ filters }: SecurityEventsProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertRules, setAlertRules] = useState<any[]>([]);

  useEffect(() => {
    fetchSecurityEvents();
    fetchAlertRules();
  }, [filters]);

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        eventCategory: 'security',
        ...filters
      });
      
      const response = await fetch(`/api/audit/logs?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertRules = async () => {
    try {
      const response = await fetch('/api/audit/alert-rules', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlertRules(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch alert rules:', error);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-600 text-white">긴급</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white">높음</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white">중간</Badge>;
      case 'low':
        return <Badge className="bg-green-500 text-white">낮음</Badge>;
      default:
        return <Badge variant="outline">정보</Badge>;
    }
  };

  const getEventIcon = (eventType: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'unauthorized_access': <Ban className="h-4 w-4 text-red-500" />,
      'login_failed': <UserX className="h-4 w-4 text-orange-500" />,
      'permission_denied': <Lock className="h-4 w-4 text-red-500" />,
      'suspicious_activity': <Eye className="h-4 w-4 text-yellow-500" />,
      'password_reset': <KeyRound className="h-4 w-4 text-blue-500" />,
    };
    return iconMap[eventType] || <Shield className="h-4 w-4 text-gray-500" />;
  };

  const criticalEvents = events.filter(e => 
    e.action?.includes('실패') || 
    e.action?.includes('차단') || 
    e.action?.includes('거부')
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">보안 이벤트를 불러오는 중...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Critical Alerts */}
      {criticalEvents.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">보안 경고</AlertTitle>
          <AlertDescription className="text-red-700">
            최근 24시간 동안 {criticalEvents.length}건의 보안 이벤트가 감지되었습니다.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">실패한 로그인</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {events.filter(e => e.eventType === 'login_failed').length}
            </div>
            <p className="text-xs text-muted-foreground">지난 24시간</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">권한 거부</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {events.filter(e => e.action?.includes('권한')).length}
            </div>
            <p className="text-xs text-muted-foreground">지난 24시간</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">의심스러운 활동</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {events.filter(e => e.action?.includes('의심')).length}
            </div>
            <p className="text-xs text-muted-foreground">지난 24시간</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 경고 규칙</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {alertRules.filter(r => r.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">전체 {alertRules.length}개</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Events Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>보안 이벤트 상세</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchSecurityEvents}>
                <RefreshCw className="h-4 w-4 mr-1" />
                새로고침
              </Button>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-1" />
                다운로드
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>이벤트</TableHead>
                <TableHead>심각도</TableHead>
                <TableHead>사용자</TableHead>
                <TableHead>상세 내용</TableHead>
                <TableHead>IP 주소</TableHead>
                <TableHead>조치</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    보안 이벤트가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm">
                      {format(new Date(event.createdAt), 'MM/dd HH:mm', { locale: ko })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getEventIcon(event.eventType)}
                        <span className="text-sm">{event.eventType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSeverityBadge(
                        event.action?.includes('실패') ? 'high' : 
                        event.action?.includes('거부') ? 'medium' : 'low'
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {event.userName || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {event.action}
                      {event.errorMessage && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {event.errorMessage}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {event.ipAddress || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}