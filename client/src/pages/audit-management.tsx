import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Shield,
  Settings,
  Users,
  FileText,
  AlertTriangle,
  Clock,
  Database,
  Download,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  UserCheck,
  AlertCircle,
  Lock,
  Trash2,
  Archive,
  Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuditDashboard } from "@/components/audit/AuditDashboard";
import { LoginHistory } from "@/components/audit/LoginHistory";
import { DataChangeLog } from "@/components/audit/DataChangeLog";
import { SecurityEvents } from "@/components/audit/SecurityEvents";
import { LogLevelSettings } from "@/components/audit/LogLevelSettings";

export default function AuditManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const itemsPerPage = 50;

  // Fetch audit logs
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["audit-logs", currentPage, selectedEventType, selectedCategory, dateRange, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(itemsPerPage),
        offset: String((currentPage - 1) * itemsPerPage),
        sortOrder: "desc"
      });

      if (selectedEventType !== "all") params.append("eventType", selectedEventType);
      if (selectedCategory !== "all") params.append("eventCategory", selectedCategory);
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);
      if (searchTerm) params.append("search", searchTerm);

      return apiRequest(`/api/audit/logs?${params}`, {
        method: "GET"
      });
    },
    enabled: user?.role === 'admin'
  });

  // Fetch audit settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["audit-settings"],
    queryFn: () => apiRequest("/api/audit/settings", { method: "GET" }),
    enabled: user?.role === 'admin'
  });

  // Fetch dashboard stats
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ["audit-dashboard"],
    queryFn: () => apiRequest("/api/audit/dashboard?hours=24", { method: "GET" }),
    enabled: user?.role === 'admin' && activeTab === 'dashboard',
    refetchInterval: 60000 // Refresh every minute
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: any) => 
      apiRequest("/api/audit/settings", {
        method: "PUT",
        body: JSON.stringify(newSettings)
      }),
    onSuccess: () => {
      toast({
        title: "설정 업데이트",
        description: "감사 설정이 성공적으로 업데이트되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ["audit-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "설정 업데이트에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // Archive logs mutation
  const archiveLogsMutation = useMutation({
    mutationFn: (beforeDate: string) => 
      apiRequest("/api/audit/archive", {
        method: "POST",
        body: JSON.stringify({ beforeDate })
      }),
    onSuccess: (data) => {
      toast({
        title: "아카이빙 완료",
        description: `${data.archived}개의 로그가 아카이빙되었습니다.`
      });
      refetchLogs();
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "아카이빙에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // Event type badge color
  const getEventTypeBadge = (eventType: string) => {
    const colors: Record<string, string> = {
      login: "bg-green-500",
      logout: "bg-blue-500",
      login_failed: "bg-red-500",
      data_create: "bg-purple-500",
      data_update: "bg-yellow-500",
      data_delete: "bg-red-600",
      permission_change: "bg-orange-500",
      security_alert: "bg-red-700",
      error: "bg-red-800"
    };
    return colors[eventType] || "bg-gray-500";
  };

  // Event type icon
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login': return <LogIn className="h-4 w-4" />;
      case 'logout': return <LogOut className="h-4 w-4" />;
      case 'login_failed': return <AlertCircle className="h-4 w-4" />;
      case 'permission_change': return <Lock className="h-4 w-4" />;
      case 'data_delete': return <Trash2 className="h-4 w-4" />;
      case 'security_alert': return <Shield className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  // Check if user has permission
  if (user?.role !== 'admin' && user?.role !== 'executive' && user?.role !== 'hq_management') {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            이 페이지에 접근할 권한이 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalPages = logsData ? Math.ceil(logsData.total / itemsPerPage) : 1;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">로그 관리</h1>
          <p className="text-muted-foreground mt-2">
            시스템 활동 로그 및 보안 이벤트 모니터링
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchLogs()}
            disabled={logsLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          {user?.role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const date = new Date();
                date.setDate(date.getDate() - 30);
                if (confirm('30일 이전 로그를 아카이빙하시겠습니까?')) {
                  archiveLogsMutation.mutate(date.toISOString());
                }
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              아카이빙
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">대시보드</TabsTrigger>
          <TabsTrigger value="logs">활동 로그</TabsTrigger>
          <TabsTrigger value="login">로그인 기록</TabsTrigger>
          <TabsTrigger value="changes">데이터 변경</TabsTrigger>
          <TabsTrigger value="security">보안 이벤트</TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="settings">설정</TabsTrigger>
          )}
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <AuditDashboard stats={dashboardStats} loading={statsLoading} />
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>시스템 활동 로그</CardTitle>
              <CardDescription>
                모든 시스템 활동 및 사용자 작업 기록
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="검색 (사용자, 작업, IP 등)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="이벤트 유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 이벤트</SelectItem>
                    <SelectItem value="login">로그인</SelectItem>
                    <SelectItem value="logout">로그아웃</SelectItem>
                    <SelectItem value="data_create">생성</SelectItem>
                    <SelectItem value="data_update">수정</SelectItem>
                    <SelectItem value="data_delete">삭제</SelectItem>
                    <SelectItem value="security_alert">보안 경고</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="카테고리" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 카테고리</SelectItem>
                    <SelectItem value="auth">인증</SelectItem>
                    <SelectItem value="data">데이터</SelectItem>
                    <SelectItem value="system">시스템</SelectItem>
                    <SelectItem value="security">보안</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Logs Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>시간</TableHead>
                      <TableHead>이벤트</TableHead>
                      <TableHead>사용자</TableHead>
                      <TableHead>작업</TableHead>
                      <TableHead>IP 주소</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="w-[100px]">상세</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          로딩 중...
                        </TableCell>
                      </TableRow>
                    ) : logsData?.logs?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          로그가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logsData?.logs?.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.createdAt), 'PPp', { locale: ko })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getEventIcon(log.eventType)}
                              <Badge className={`${getEventTypeBadge(log.eventType)} text-white`}>
                                {log.eventType}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{log.userName || 'System'}</div>
                              {log.userRole && (
                                <div className="text-muted-foreground text-xs">{log.userRole}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {log.action}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.ipAddress || '-'}
                          </TableCell>
                          <TableCell>
                            {log.responseStatus && (
                              <Badge variant={log.responseStatus >= 400 ? "destructive" : "default"}>
                                {log.responseStatus}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    총 {logsData?.total || 0}개 중 {((currentPage - 1) * itemsPerPage) + 1}-
                    {Math.min(currentPage * itemsPerPage, logsData?.total || 0)}개 표시
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      이전
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = currentPage - 2 + i;
                        if (page > 0 && page <= totalPages) {
                          return (
                            <Button
                              key={page}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      다음
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login History Tab */}
        <TabsContent value="login">
          <LoginHistory userId={user?.role === 'admin' ? undefined : user?.id} />
        </TabsContent>

        {/* Data Changes Tab */}
        <TabsContent value="changes">
          <DataChangeLog />
        </TabsContent>

        {/* Security Events Tab */}
        <TabsContent value="security">
          <SecurityEvents />
        </TabsContent>

        {/* Settings Tab (Admin only) */}
        {user?.role === 'admin' && (
          <TabsContent value="settings">
            <LogLevelSettings 
              settings={settings} 
              onUpdate={(newSettings) => updateSettingsMutation.mutate(newSettings)}
              loading={settingsLoading}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>로그 상세 정보</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.createdAt), 'PPpp', { locale: ko })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">이벤트 유형</Label>
                    <p className="font-medium">{selectedLog.eventType}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">카테고리</Label>
                    <p className="font-medium">{selectedLog.eventCategory}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">사용자</Label>
                    <p className="font-medium">{selectedLog.userName || 'System'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">역할</Label>
                    <p className="font-medium">{selectedLog.userRole || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">IP 주소</Label>
                    <p className="font-medium">{selectedLog.ipAddress || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">세션 ID</Label>
                    <p className="font-medium text-xs">{selectedLog.sessionId || '-'}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground">작업</Label>
                  <p className="font-medium">{selectedLog.action}</p>
                </div>

                {selectedLog.requestPath && (
                  <div>
                    <Label className="text-muted-foreground">요청 경로</Label>
                    <p className="font-medium">{selectedLog.requestMethod} {selectedLog.requestPath}</p>
                  </div>
                )}

                {selectedLog.entityType && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">엔티티 유형</Label>
                      <p className="font-medium">{selectedLog.entityType}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">엔티티 ID</Label>
                      <p className="font-medium">{selectedLog.entityId}</p>
                    </div>
                  </div>
                )}

                {selectedLog.details && (
                  <div>
                    <Label className="text-muted-foreground">추가 정보</Label>
                    <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.oldValue && (
                  <div>
                    <Label className="text-muted-foreground">이전 값</Label>
                    <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.oldValue, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.newValue && (
                  <div>
                    <Label className="text-muted-foreground">새 값</Label>
                    <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.newValue, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.errorMessage && (
                  <div>
                    <Label className="text-muted-foreground text-red-500">에러 메시지</Label>
                    <p className="mt-2 p-3 bg-red-50 rounded-md text-sm">
                      {selectedLog.errorMessage}
                    </p>
                  </div>
                )}

                {selectedLog.executionTime && (
                  <div>
                    <Label className="text-muted-foreground">실행 시간</Label>
                    <p className="font-medium">{selectedLog.executionTime}ms</p>
                  </div>
                )}

                {selectedLog.userAgent && (
                  <div>
                    <Label className="text-muted-foreground">User Agent</Label>
                    <p className="text-sm text-muted-foreground">{selectedLog.userAgent}</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}