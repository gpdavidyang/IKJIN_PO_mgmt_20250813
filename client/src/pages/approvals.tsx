import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  Grid3X3,
  List,
  Check,
  X,
  Eye,
  Calendar,
  DollarSign,
  BookOpen,
  Users,
  Settings,
  Shield,
  FileText
} from "lucide-react";
import { formatKoreanWon } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { PurchaseOrder } from "@shared/schema";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface ApprovalStats {
  pendingCount: number;
  urgentCount: number;
  averageWaitDays: number;
  pendingAmount: number;
}

export default function Approvals() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortField, setSortField] = useState<string>("orderDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // API 쿼리
  const { data: stats, isLoading: statsLoading } = useQuery<ApprovalStats>({
    queryKey: ["/api/approvals/stats"],
  });

  const { data: pendingApprovals, isLoading: pendingLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/approvals/pending"],
  });

  const { data: approvalHistory, isLoading: historyLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/approvals/history"],
  });

  // 뮤테이션
  const approveMutation = useMutation({
    mutationFn: (orderId: number) => 
      apiRequest('POST', `/api/approvals/${orderId}/approve`, { note: '승인 처리되었습니다.' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/history"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (orderId: number) => 
      apiRequest('POST', `/api/approvals/${orderId}/reject`, { note: '반려 처리되었습니다.' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/history"] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">승인 대기</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">승인 완료</Badge>;
      case "draft":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">작성중</Badge>;
      case "sent":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">발송완료</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">완료</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDaysAgo = (date: Date | null) => {
    if (!date) return 0;
    const diffTime = Math.abs(new Date().getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleApprove = (orderId: number) => {
    approveMutation.mutate(orderId);
  };

  const handleReject = (orderId: number) => {
    rejectMutation.mutate(orderId);
  };

  // 정렬 함수
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // 발주번호 클릭 핸들러
  const handleOrderClick = (orderId: number) => {
    setLocation(`/orders/${orderId}/standard`);
  };

  // 데이터 정렬 함수
  const sortData = (data: PurchaseOrder[]) => {
    return [...data].sort((a, b) => {
      let aValue: any = a[sortField as keyof PurchaseOrder];
      let bValue: any = b[sortField as keyof PurchaseOrder];

      // 날짜 처리
      if (aValue instanceof Date) aValue = aValue.getTime();
      if (bValue instanceof Date) bValue = bValue.getTime();

      // 문자열 처리
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  // 정렬 가능한 헤더 컴포넌트
  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === "asc" ? 
          <ChevronUp className="h-4 w-4" /> : 
          <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  // 필터링 및 정렬된 데이터
  const filteredPendingApprovals = sortData(
    pendingApprovals?.filter(order => {
      if (!order) return false; // null/undefined 체크
      const searchText = (order.orderNumber || '').toLowerCase();
      const matchesSearch = searchTerm === '' || searchText.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    }) || []
  );

  const filteredApprovalHistory = sortData(
    approvalHistory?.filter(order => {
      if (!order) return false; // null/undefined 체크
      const searchText = (order.orderNumber || '').toLowerCase();
      const matchesSearch = searchTerm === '' || searchText.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    }) || []
  );

  // 승인 권한 체크
  const canApprove = user && ["admin", "executive", "hq_management", "project_manager"].includes(user.role);
  
  // 권한이 없는 사용자는 접근 차단
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-4">승인 관리 기능을 사용하려면 로그인해주세요.</p>
          <Button onClick={() => navigate("/login")}>로그인하기</Button>
        </Card>
      </div>
    );
  }

  if (!canApprove) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Shield className="h-16 w-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">접근 권한이 없습니다</h2>
          <p className="text-gray-600 mb-2">승인 관리 기능은 다음 역할의 사용자만 이용할 수 있습니다:</p>
          <ul className="text-sm text-gray-500 mb-4">
            <li>• 관리자 (admin)</li>
            <li>• 임원 (executive)</li>
            <li>• 본사 관리 (hq_management)</li>
            <li>• 프로젝트 매니저 (project_manager)</li>
          </ul>
          <p className="text-xs text-gray-400 mb-4">현재 권한: {user.role}</p>
          <Button variant="outline" onClick={() => navigate("/")}>홈으로 돌아가기</Button>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1366px] mx-auto p-6 space-y-6">
          {/* 페이지 헤더 - UI Standards */}
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">승인 관리</h1>
              <p className="text-sm text-gray-600">발주서 승인 요청을 검토하고 처리합니다.</p>
            </div>
          </div>

          {/* 안내 섹션 */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">승인 관리 화면 사용법</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                    <div>
                      <p className="font-medium mb-1">• 승인 대기 탭:</p>
                      <ul className="text-xs space-y-0.5 ml-3">
                        <li>- 승인 대기 중인 발주서를 확인하고 처리</li>
                        <li>- ✓ 버튼으로 승인, ✗ 버튼으로 반려</li>
                        <li>- 👁 버튼으로 발주서 상세 내용 확인</li>
                        <li>- 3일 이상 대기 시 '지연' 표시</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium mb-1">• 승인 내역 탭:</p>
                      <ul className="text-xs space-y-0.5 ml-3">
                        <li>- 승인/반려 처리된 발주서 이력 조회</li>
                        <li>- 처리 결과 및 날짜 확인 가능</li>
                        <li>- 필터 기능으로 상태별 검색 지원</li>
                        <li>- 테이블/카드 형태 보기 모드 선택</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-blue-100/50 rounded text-xs text-blue-700">
                    <strong>💡 Tip:</strong> 발주번호를 클릭하면 발주서 상세 페이지로 이동하여 
                    모든 첨부서류와 상세 내용을 확인할 수 있습니다. 승인 전 반드시 내용을 검토하세요.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* 통계 카드 - UI Standards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-600">승인 대기</p>
                  <p className="text-xl font-bold">{stats?.pendingCount || 0}건</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-xs text-gray-600">긴급 승인</p>
                  <p className="text-xl font-bold">{stats?.urgentCount || 0}건</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-600">평균 대기일</p>
                  <p className="text-xl font-bold">{stats?.averageWaitDays || 0}일</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-gray-600">대기 금액</p>
                  <p className="text-xl font-bold text-blue-600 font-semibold">{formatKoreanWon(stats?.pendingAmount || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 필터 섹션 - UI Standards */}
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <div className="bg-gray-50 rounded-lg border border-gray-200">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">필터 및 검색</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 border-t border-gray-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="발주번호로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="pending">승인 대기</SelectItem>
                      <SelectItem value="approved">승인 완료</SelectItem>
                      <SelectItem value="draft">작성중</SelectItem>
                      <SelectItem value="sent">발송완료</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                      }}
                    >
                      초기화
                    </Button>
                    <div className="bg-gray-100 rounded p-1 flex">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={viewMode === "table" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode("table")}
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>테이블 보기</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={viewMode === "card" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewMode("card")}
                          >
                            <Grid3X3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>카드 보기</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* 콘텐츠 탭 */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">승인 대기 ({filteredPendingApprovals.length})</TabsTrigger>
            <TabsTrigger value="history">승인 내역 ({filteredApprovalHistory.length})</TabsTrigger>
            <TabsTrigger value="guide">승인 프로세스 가이드</TabsTrigger>
          </TabsList>

          {/* 승인 대기 목록 */}
          <TabsContent value="pending" className="space-y-4">
            {pendingLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">승인 대기 목록을 불러오는 중...</p>
              </div>
            ) : filteredPendingApprovals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">승인 대기 중인 발주서가 없습니다.</p>
              </div>
            ) : viewMode === "table" ? (
              <Card className="shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="orderNumber">발주번호</SortableHeader>
                      <SortableHeader field="projectId">프로젝트</SortableHeader>
                      <SortableHeader field="status">상태</SortableHeader>
                      <SortableHeader field="createdAt">신청일</SortableHeader>
                      <SortableHeader field="totalAmount">금액</SortableHeader>
                      <SortableHeader field="createdAt">대기일</SortableHeader>
                      <TableHead className="text-center">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPendingApprovals.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <button 
                            onClick={() => handleOrderClick(order.id)}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {order.orderNumber || '-'}
                          </button>
                        </TableCell>
                        <TableCell>프로젝트 ID: {order.projectId}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ko-KR') : '-'}
                        </TableCell>
                        <TableCell className="text-blue-600 font-semibold">
                          {formatKoreanWon(order.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{getDaysAgo(order.createdAt)}일</span>
                            {getDaysAgo(order.createdAt) > 3 && (
                              <Badge variant="destructive" className="text-xs">지연</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center -space-x-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 hover:bg-green-50"
                                  onClick={() => handleApprove(order.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>승인</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 hover:bg-red-50"
                                  onClick={() => handleReject(order.id)}
                                  disabled={rejectMutation.isPending}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>반려</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 hover:bg-blue-50"
                                  onClick={() => handleOrderClick(order.id)}
                                >
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>상세보기</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPendingApprovals.map((order) => (
                  <Card key={order.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">
                          <button 
                            onClick={() => handleOrderClick(order.id)}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {order.orderNumber || '-'}
                          </button>
                        </h3>
                        {getStatusBadge(order.status)}
                        {getDaysAgo(order.createdAt) > 3 && (
                          <Badge variant="destructive">지연</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">프로젝트 ID: {order.projectId}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <span>신청일: {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ko-KR') : '-'}</span>
                        <span>대기: {getDaysAgo(order.createdAt)}일</span>
                      </div>
                      <p className="text-sm font-medium text-blue-600 mb-3">
                        {formatKoreanWon(order.totalAmount)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleApprove(order.id)}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleReject(order.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          반려
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 승인 내역 */}
          <TabsContent value="history" className="space-y-4">
            {historyLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">승인 내역을 불러오는 중...</p>
              </div>
            ) : filteredApprovalHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">승인 내역이 없습니다.</p>
              </div>
            ) : viewMode === "table" ? (
              <Card className="shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="orderNumber">발주번호</SortableHeader>
                      <SortableHeader field="projectId">프로젝트</SortableHeader>
                      <SortableHeader field="status">상태</SortableHeader>
                      <SortableHeader field="updatedAt">처리일</SortableHeader>
                      <SortableHeader field="totalAmount">금액</SortableHeader>
                      <TableHead className="text-center">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovalHistory.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <button 
                            onClick={() => handleOrderClick(order.id)}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {order.orderNumber || '-'}
                          </button>
                        </TableCell>
                        <TableCell>프로젝트 ID: {order.projectId}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString('ko-KR') : '-'}
                        </TableCell>
                        <TableCell className="text-blue-600 font-semibold">
                          {formatKoreanWon(order.totalAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleOrderClick(order.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredApprovalHistory.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">
                          <button 
                            onClick={() => handleOrderClick(order.id)}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {order.orderNumber || '-'}
                          </button>
                        </h3>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">프로젝트 ID: {order.projectId}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <span>처리일: {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString('ko-KR') : '-'}</span>
                      </div>
                      <p className="text-sm font-medium text-blue-600 mb-3">
                        {formatKoreanWon(order.totalAmount)}
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleOrderClick(order.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        상세보기
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 승인 프로세스 가이드 */}
          <TabsContent value="guide" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* 승인 프로세스 */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <h2 className="text-sm font-medium text-gray-900 mb-3">승인 프로세스</h2>
                  <div className="space-y-3">
                    <div className="border-l-4 border-blue-500 pl-3">
                      <h3 className="text-xs font-medium text-gray-900 mb-1">1. 실무자 (작성)</h3>
                      <p className="text-xs text-gray-600">현장 실무자가 필요한 자재 및 장비에 대한 발주서를 작성하고 제출합니다.</p>
                    </div>
                    <div className="border-l-4 border-yellow-500 pl-3">
                      <h3 className="text-xs font-medium text-gray-900 mb-1">2. 현장 책임자 (작성 or 승인)</h3>
                      <p className="text-xs text-gray-600">현장소장이 발주 필요성과 시급성을 검토하고 승인하거나 추가 작성을 진행합니다.</p>
                    </div>
                    <div className="border-l-4 border-orange-500 pl-3">
                      <h3 className="text-xs font-medium text-gray-900 mb-1">3. 본사 관리부 (승인)</h3>
                      <p className="text-xs text-gray-600">본사 관리부에서 계약 조건, 업체 신뢰성 및 예산을 검토하고 승인합니다.</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-3">
                      <h3 className="text-xs font-medium text-gray-900 mb-1">4. 임원 또는 대표 (승인)</h3>
                      <p className="text-xs text-gray-600">일정 금액 이상의 발주는 임원 또는 대표이사의 최종 승인이 필요합니다.</p>
                    </div>
                    <div className="border-l-4 border-purple-500 pl-3">
                      <h3 className="text-xs font-medium text-gray-900 mb-1">5. 발주 실행</h3>
                      <p className="text-xs text-gray-600">승인 완료 후 협력업체에 발주서를 전송하고 자재 공급 계약을 체결합니다.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 승인 정책 */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <h2 className="text-sm font-medium text-gray-900 mb-3">승인 정책</h2>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 mb-1">금액별 승인 권한</h3>
                      <div className="space-y-1 text-xs text-gray-600">
                        <p>• 500만원 미만: 현장 책임자 승인</p>
                        <p>• 500만원 ~ 3,000만원: 본사 관리부 + 현장 책임자 승인</p>
                        <p>• 3,000만원 ~ 1억원: 임원 승인 필요</p>
                        <p>• 1억원 이상: 대표이사 승인 필요</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 mb-1">승인 기한</h3>
                      <div className="space-y-1 text-xs text-gray-600">
                        <p>• 일반 자재: 영업일 기준 3일 이내</p>
                        <p>• 긴급 현장: 당일 또는 익일 처리</p>
                        <p>• 고액 장비: 영업일 기준 7일 이내</p>
                        <p>• 특수 자재: 영업일 기준 5일 이내</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 mb-1">필수 첨부 서류</h3>
                      <div className="space-y-1 text-xs text-gray-600">
                        <p>• 견적서 (3사 이상 비교 권장)</p>
                        <p>• 협력업체 등록증 (신규 업체)</p>
                        <p>• 자재/장비 사양서 및 카탈로그</p>
                        <p>• 품질시험성적서 (구조 자재)</p>
                        <p>• 계약서 초안 (고액 발주)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 승인 원칙 */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <h2 className="text-sm font-medium text-gray-900 mb-3">승인 원칙</h2>
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 mb-1">투명성</h3>
                      <p className="text-xs text-gray-600">모든 승인 과정과 결정 근거를 명확히 기록하고 공유합니다.</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 mb-1">공정성</h3>
                      <p className="text-xs text-gray-600">동일한 기준과 절차를 모든 발주에 일관되게 적용합니다.</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 mb-1">신속성</h3>
                      <p className="text-xs text-gray-600">정해진 기한 내에 신속하고 정확한 검토를 수행합니다.</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 mb-1">책임성</h3>
                      <p className="text-xs text-gray-600">각 승인자는 자신의 결정에 대해 명확한 책임을 집니다.</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 mb-1">경제성</h3>
                      <p className="text-xs text-gray-600">최적의 비용 대비 효과를 고려한 합리적 승인을 추구합니다.</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 mb-1">리스크 관리</h3>
                      <p className="text-xs text-gray-600">잠재적 위험 요소를 사전에 식별하고 대응 방안을 검토합니다.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 역할과 책임 */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <h2 className="text-sm font-medium text-gray-900 mb-3">역할과 책임</h2>
                  <div className="space-y-2">
                    <div className="border border-gray-200 rounded p-2">
                      <h3 className="text-xs font-medium text-gray-900 mb-1">현장 실무자</h3>
                      <div className="space-y-0.5 text-xs text-gray-600">
                        <p>• 현장 필요 자재 및 장비 파악</p>
                        <p>• 정확한 규격 및 수량 산정</p>
                        <p>• 납기 일정 및 현장 여건 고려</p>
                        <p>• 견적서 수집 및 비교 검토</p>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded p-2">
                      <h3 className="text-xs font-medium text-gray-900 mb-1">현장 책임자</h3>
                      <div className="space-y-0.5 text-xs text-gray-600">
                        <p>• 현장 발주 필요성 및 시급성 검토</p>
                        <p>• 공사 일정 대비 자재 투입 계획</p>
                        <p>• 현장 예산 범위 내 발주 확인</p>
                        <p>• 품질 및 안전 기준 적합성 검증</p>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded p-2">
                      <h3 className="text-xs font-medium text-gray-900 mb-1">본사 관리부</h3>
                      <div className="space-y-0.5 text-xs text-gray-600">
                        <p>• 협력업체 신용도 및 이력 확인</p>
                        <p>• 계약 조건 및 법적 검토</p>
                        <p>• 전체 프로젝트 예산 대비 적정성</p>
                        <p>• 회계 처리 및 세무 검토</p>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded p-2">
                      <h3 className="text-xs font-medium text-gray-900 mb-1">임원 / 대표이사</h3>
                      <div className="space-y-0.5 text-xs text-gray-600">
                        <p>• 회사 경영 전략 부합성 검토</p>
                        <p>• 고액 발주 최종 승인 결정</p>
                        <p>• 프로젝트 수익성 및 리스크 평가</p>
                        <p>• 발주 정책 수립 및 변경 결정</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 추가 안내 사항 */}
            <Card className="bg-blue-50 border-blue-200 shadow-sm">
              <CardContent className="p-4">
                <h2 className="text-sm font-medium text-blue-900 mb-3">승인 시 주의사항</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <h3 className="text-xs font-medium text-blue-900 mb-1">승인 전 확인사항</h3>
                    <div className="space-y-0.5 text-xs text-blue-800">
                      <p>• 자재/장비 규격 및 수량의 정확성</p>
                      <p>• 현장 납기 일정과의 부합성</p>
                      <p>• 프로젝트 예산 범위 내 발주 확인</p>
                      <p>• 협력업체 신용도 및 공급 능력</p>
                      <p>• 품질 기준 및 안전 규정 충족</p>
                      <p>• 건설업법 및 관련 법규 준수</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-blue-900 mb-1">반려 사유</h3>
                    <div className="space-y-0.5 text-xs text-blue-800">
                      <p>• 자재 규격 또는 수량 정보 부정확</p>
                      <p>• 프로젝트 예산 초과 또는 미승인</p>
                      <p>• 협력업체 등록 미완료 또는 신용도 미달</p>
                      <p>• 현장 납기와 공급 일정 불일치</p>
                      <p>• 품질 기준 미달 또는 검증서류 부족</p>
                      <p>• 건설업법 위반 또는 안전 규정 미준수</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-blue-100 rounded">
                  <p className="text-xs text-blue-800">
                    <strong>팁:</strong> 승인 지연을 방지하려면 자재 규격과 수량을 정확히 산정하고, 
                    현장 일정과 납기를 충분히 검토하세요. 긴급 현장 발주의 경우 현장소장 및 본사 관리부와 사전 협의하시기 바랍니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}