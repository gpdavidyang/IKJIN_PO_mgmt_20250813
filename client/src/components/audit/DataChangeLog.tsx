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
  FileText,
  Edit,
  Trash,
  Plus,
  RefreshCw,
  Download,
  Package,
  Users,
  Building
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState, useEffect } from "react";

interface DataChangeLogProps {
  filters?: any;
}

export function DataChangeLog({ filters }: DataChangeLogProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDataChanges();
  }, [filters]);

  const fetchDataChanges = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        eventCategory: 'data',
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
      console.error('Failed to fetch data changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntityIcon = (tableName: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'purchase_orders': <FileText className="h-4 w-4 text-blue-500" />,
      'vendors': <Building className="h-4 w-4 text-green-500" />,
      'items': <Package className="h-4 w-4 text-purple-500" />,
      'users': <Users className="h-4 w-4 text-orange-500" />,
    };
    return iconMap[tableName] || <FileText className="h-4 w-4 text-gray-500" />;
  };

  const getActionBadge = (action: string) => {
    if (action.includes('생성') || action.includes('추가')) {
      return <Badge className="bg-green-100 text-green-800">생성</Badge>;
    } else if (action.includes('수정') || action.includes('업데이트')) {
      return <Badge className="bg-blue-100 text-blue-800">수정</Badge>;
    } else if (action.includes('삭제')) {
      return <Badge className="bg-red-100 text-red-800">삭제</Badge>;
    } else if (action.includes('승인')) {
      return <Badge className="bg-purple-100 text-purple-800">승인</Badge>;
    }
    return <Badge variant="outline">변경</Badge>;
  };

  const formatChanges = (oldData: any, newData: any) => {
    if (!oldData && !newData) return null;
    
    try {
      const old = oldData ? JSON.parse(oldData) : {};
      const updated = newData ? JSON.parse(newData) : {};
      const changes: string[] = [];

      Object.keys(updated).forEach(key => {
        if (old[key] !== updated[key]) {
          changes.push(`${key}: ${old[key] || 'N/A'} → ${updated[key]}`);
        }
      });

      return changes.length > 0 ? (
        <div className="text-xs text-muted-foreground">
          {changes.slice(0, 3).map((change, idx) => (
            <div key={idx}>{change}</div>
          ))}
          {changes.length > 3 && <div>... +{changes.length - 3} more</div>}
        </div>
      ) : null;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">데이터 변경 기록을 불러오는 중...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">데이터 변경 기록</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchDataChanges}>
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
              <TableHead>대상</TableHead>
              <TableHead>작업</TableHead>
              <TableHead>사용자</TableHead>
              <TableHead>변경 내용</TableHead>
              <TableHead>IP 주소</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  데이터 변경 기록이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {format(new Date(log.createdAt), 'MM/dd HH:mm', { locale: ko })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getEntityIcon(log.tableName || '')}
                      <span className="text-sm">{log.entityType || log.tableName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getActionBadge(log.action)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.userName || 'System'}
                  </TableCell>
                  <TableCell>
                    {formatChanges(log.oldData, log.newData)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.ipAddress || 'N/A'}
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