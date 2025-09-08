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

  const getEntityIcon = (tableName: string, entityType?: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'purchase_orders': <FileText className="h-4 w-4 text-blue-500" />,
      'vendors': <Building className="h-4 w-4 text-green-500" />,
      'items': <Package className="h-4 w-4 text-purple-500" />,
      'users': <Users className="h-4 w-4 text-orange-500" />,
      'projects': <Building className="h-4 w-4 text-teal-500" />,
      'companies': <Building className="h-4 w-4 text-indigo-500" />,
      'approvals': <FileText className="h-4 w-4 text-amber-500" />,
      'templates': <Edit className="h-4 w-4 text-pink-500" />,
      'item_categories': <Package className="h-4 w-4 text-violet-500" />,
      'positions': <Users className="h-4 w-4 text-cyan-500" />,
    };
    
    // Fallback to entityType if tableName not found
    const key = tableName || entityType;
    return iconMap[key] || <FileText className="h-4 w-4 text-gray-500" />;
  };

  const getEntityDisplayName = (tableName: string, entityType?: string) => {
    const displayMap: Record<string, string> = {
      'purchase_orders': '발주서',
      'purchase_order': '발주서',
      'vendors': '거래처',
      'vendor': '거래처',
      'items': '품목',
      'item': '품목',
      'users': '사용자',
      'user': '사용자',
      'projects': '프로젝트',
      'project': '프로젝트',
      'companies': '회사',
      'company': '회사',
      'approvals': '승인',
      'approval': '승인',
      'templates': '템플릿',
      'template': '템플릿',
      'item_categories': '품목분류',
      'category': '품목분류',
      'positions': '직급',
      'position': '직급',
    };
    
    return displayMap[tableName] || displayMap[entityType] || (tableName || entityType || '알 수 없음');
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

  // Field name mapping to Korean
  const fieldNameMapping: Record<string, string> = {
    // Purchase Order fields
    orderStatus: '발주상태',
    approvalStatus: '승인상태',
    orderNumber: '발주번호',
    totalAmount: '총금액',
    projectId: '프로젝트',
    vendorId: '거래처',
    deliveryDate: '납기일',
    notes: '비고',
    priority: '우선순위',
    
    // Vendor fields
    name: '명칭',
    businessNumber: '사업자번호',
    contactPerson: '담당자',
    phone: '연락처',
    email: '이메일',
    address: '주소',
    businessType: '업종',
    
    // Item fields
    code: '품목코드',
    category: '분류',
    unit: '단위',
    price: '단가',
    description: '설명',
    isActive: '사용여부',
    
    // User fields
    username: '사용자명',
    role: '권한',
    department: '부서',
    position: '직급',
    
    // Common fields
    createdAt: '생성일시',
    updatedAt: '수정일시',
    status: '상태'
  };

  const formatFieldValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    
    // Format specific field types
    if (key.includes('Amount') || key === 'price') {
      return typeof value === 'number' ? `${value.toLocaleString()}원` : value;
    }
    
    if (key.includes('Date') || key.includes('At')) {
      try {
        return new Date(value).toLocaleDateString('ko-KR');
      } catch {
        return value;
      }
    }
    
    if (typeof value === 'boolean') {
      return value ? '예' : '아니오';
    }
    
    return String(value);
  };

  const formatChanges = (oldData: any, newData: any) => {
    if (!oldData && !newData) return null;
    
    try {
      const old = oldData ? (typeof oldData === 'string' ? JSON.parse(oldData) : oldData) : {};
      const updated = newData ? (typeof newData === 'string' ? JSON.parse(newData) : newData) : {};
      const changes: string[] = [];

      // Get all keys from both objects
      const allKeys = new Set([...Object.keys(old), ...Object.keys(updated)]);

      allKeys.forEach(key => {
        if (old[key] !== updated[key] && 
            !key.includes('Id') && // Skip ID fields
            key !== 'id' &&
            key !== 'createdAt' &&
            key !== 'updatedAt') {
          
          const fieldName = fieldNameMapping[key] || key;
          const oldValue = formatFieldValue(key, old[key]);
          const newValue = formatFieldValue(key, updated[key]);
          
          if (oldValue !== newValue) {
            changes.push(`${fieldName}: ${oldValue} → ${newValue}`);
          }
        }
      });

      return changes.length > 0 ? (
        <div className="text-xs text-muted-foreground space-y-1">
          {changes.slice(0, 3).map((change, idx) => (
            <div key={idx} className="truncate">{change}</div>
          ))}
          {changes.length > 3 && (
            <div className="text-xs text-muted-foreground/70">
              ... 외 {changes.length - 3}개 항목
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          변경 내용 없음
        </div>
      );
    } catch (error) {
      console.error('Error parsing change data:', error);
      return (
        <div className="text-xs text-red-500">
          변경 내용 파싱 오류
        </div>
      );
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
                      {getEntityIcon(log.tableName, log.entityType)}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {getEntityDisplayName(log.tableName, log.entityType)}
                        </span>
                        {log.entityId && (
                          <span className="text-xs text-muted-foreground">
                            ID: {log.entityId}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {getActionBadge(log.action)}
                      {log.action && (
                        <span className="text-xs text-muted-foreground max-w-[200px] truncate" title={log.action}>
                          {log.action}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{log.userName || 'System'}</span>
                      {log.userRole && (
                        <span className="text-xs text-muted-foreground">{log.userRole}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[250px]">
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