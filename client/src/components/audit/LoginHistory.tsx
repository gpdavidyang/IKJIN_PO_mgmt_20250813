import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  LogIn, 
  LogOut, 
  Shield, 
  AlertTriangle,
  RefreshCw,
  Download,
  User
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState, useEffect } from "react";

interface LoginHistoryProps {
  filters?: any;
}

export function LoginHistory({ filters }: LoginHistoryProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoginHistory();
  }, [filters]);

  const fetchLoginHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        eventCategory: 'auth',
        ...filters
      });
      
      const response = await fetch(`/api/audit/logs?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch login history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login':
        return <LogIn className="h-4 w-4 text-green-500" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-blue-500" />;
      case 'login_failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'password_change':
        return <Shield className="h-4 w-4 text-orange-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'login':
        return <Badge className="bg-green-100 text-green-800">로그인</Badge>;
      case 'logout':
        return <Badge className="bg-blue-100 text-blue-800">로그아웃</Badge>;
      case 'login_failed':
        return <Badge className="bg-red-100 text-red-800">로그인 실패</Badge>;
      case 'password_change':
        return <Badge className="bg-orange-100 text-orange-800">비밀번호 변경</Badge>;
      default:
        return <Badge variant="outline">{eventType}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">로그인 기록을 불러오는 중...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">로그인 기록</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchLoginHistory}>
            <RefreshCw className="h-4 w-4 mr-1" />
            새로고침
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" />
            다운로드
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>시간</TableHead>
              <TableHead>이벤트</TableHead>
              <TableHead>사용자</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>IP 주소</TableHead>
              <TableHead>브라우저</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  로그인 기록이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {format(new Date(log.createdAt), 'MM/dd HH:mm:ss', { locale: ko })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getEventIcon(log.eventType)}
                      {getEventBadge(log.eventType)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.userName || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline">{log.userRole || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.ipAddress || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.userAgent ? log.userAgent.substring(0, 30) + '...' : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {log.eventType === 'login' ? (
                      <Badge className="bg-green-100 text-green-800">성공</Badge>
                    ) : log.eventType === 'login_failed' ? (
                      <Badge className="bg-red-100 text-red-800">실패</Badge>
                    ) : (
                      <Badge variant="outline">N/A</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}