import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { 
  Mail, 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Eye,
  RefreshCw,
  Search
} from 'lucide-react';

interface EmailHistoryItem {
  id: number;
  orderNumber: string;
  subject: string;
  recipients: string[];
  cc: string[];
  bcc: string[];
  sendingStatus: string;
  sentCount: number;
  failedCount: number;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface EmailHistoryResult {
  items: EmailHistoryItem[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

interface EmailHistoryDetail extends EmailHistoryItem {
  messageContent: string;
  attachmentFiles: { filename: string; size: number }[];
  details: {
    id: number;
    recipientEmail: string;
    recipientType: 'to' | 'cc' | 'bcc';
    sendingStatus: string;
    messageId: string | null;
    errorMessage: string | null;
    sentAt: string | null;
  }[];
}

const EmailHistoryPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderNumberFilter, setOrderNumberFilter] = useState<string>('');
  const [selectedDetail, setSelectedDetail] = useState<EmailHistoryDetail | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 이메일 발송 이력 목록 조회
  const { data: emailHistory, isLoading, error, refetch } = useQuery<EmailHistoryResult>({
    queryKey: ['email-history', currentPage, pageSize, statusFilter, orderNumberFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (orderNumberFilter) params.append('orderNumber', orderNumberFilter);

      const response = await fetch(`/api/excel-automation/email-history?${params.toString()}`);
      if (!response.ok) {
        throw new Error('이메일 발송 이력 조회 실패');
      }
      
      const result = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 이메일 발송 이력 상세 조회
  const fetchEmailDetail = async (id: number) => {
    try {
      console.log('이메일 발송 이력 상세 조회 요청:', id);
      const response = await fetch(`/api/excel-automation/email-history/${id}`);
      console.log('응답 상태:', response.status, response.statusText);
      
      const result = await response.json();
      console.log('조회 결과:', result);
      
      if (!response.ok) {
        console.error('오류 응답:', result);
        if (response.status === 404) {
          throw new Error('해당 이메일 발송 이력을 찾을 수 없습니다.');
        }
        throw new Error(`이메일 발송 이력 상세 조회 실패 (${response.status})`);
      }
      
      if (!result.success) {
        throw new Error(result.error || '이메일 발송 이력 상세 조회 실패');
      }
      
      setSelectedDetail(result.data);
      setShowDetailDialog(true);
    } catch (error) {
      console.error('이메일 발송 이력 상세 조회 오류:', error);
      alert(error instanceof Error ? error.message : '이메일 발송 이력 상세 조회 중 오류가 발생했습니다.');
    }
  };

  // 이메일 재발송
  const handleResendEmail = async (id: number, recipients: string[]) => {
    try {
      const response = await fetch(`/api/excel-automation/resend-email/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipients }),
      });

      if (!response.ok) {
        throw new Error('이메일 재발송 실패');
      }

      const result = await response.json();
      if (result.success) {
        alert('이메일이 재발송되었습니다.');
        refetch();
      } else {
        alert(`재발송 실패: ${result.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('이메일 재발송 오류:', error);
      alert('이메일 재발송 중 오류가 발생했습니다.');
    }
  };

  // 상태 배지 렌더링
  const renderStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: '완료', variant: 'default' as const, icon: CheckCircle },
      failed: { label: '실패', variant: 'destructive' as const, icon: XCircle },
      pending: { label: '대기', variant: 'secondary' as const, icon: Clock },
      partial: { label: '부분 완료', variant: 'outline' as const, icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: 'outline' as const,
      icon: AlertCircle
    };

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // 필터 적용
  const handleFilterChange = () => {
    setCurrentPage(1);
    refetch();
  };

  // 필터 초기화
  const handleFilterReset = () => {
    setStatusFilter('all');
    setOrderNumberFilter('');
    setCurrentPage(1);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">이메일 발송 이력을 불러오는데 실패했습니다.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">이메일 발송 이력</h1>
          <p className="text-muted-foreground">
            총 {emailHistory?.totalItems || 0}건의 이메일 발송 이력
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* 필터 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">발송 상태</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="failed">실패</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="partial">부분 완료</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-filter">발주 번호</Label>
              <Input
                id="order-filter"
                placeholder="발주 번호 입력"
                value={orderNumberFilter}
                onChange={(e) => setOrderNumberFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-size">페이지 크기</Label>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10개</SelectItem>
                  <SelectItem value="20">20개</SelectItem>
                  <SelectItem value="50">50개</SelectItem>
                  <SelectItem value="100">100개</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleFilterChange} size="sm">
              <Search className="h-4 w-4 mr-2" />
              검색
            </Button>
            <Button onClick={handleFilterReset} variant="outline" size="sm">
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 이메일 발송 이력 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>발송 이력</CardTitle>
          <CardDescription>
            페이지 {emailHistory?.currentPage} / {emailHistory?.totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>발주 번호</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>수신자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>발송 결과</TableHead>
                  <TableHead>발송 일시</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailHistory?.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.orderNumber || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={item.subject}>
                        {item.subject}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{item.recipients.length}명</span>
                        {item.cc.length > 0 && (
                          <span className="text-muted-foreground">(CC: {item.cc.length})</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderStatusBadge(item.sendingStatus)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-green-600">성공: {item.sentCount}건</div>
                        {item.failedCount > 0 && (
                          <div className="text-red-600">실패: {item.failedCount}건</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {item.sentAt
                            ? format(new Date(item.sentAt), 'yyyy-MM-dd HH:mm', { locale: ko })
                            : '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchEmailDetail(item.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.sendingStatus === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendEmail(item.id, item.recipients)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {emailHistory?.items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              검색 결과가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      {emailHistory && emailHistory.totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {[...Array(emailHistory.totalPages)].map((_, i) => {
                  const page = i + 1;
                  const isCurrentPage = page === currentPage;
                  
                  // 페이지 번호 표시 로직 (현재 페이지 주변만 표시)
                  if (
                    page === 1 || 
                    page === emailHistory.totalPages || 
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={isCurrentPage}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (page === currentPage - 3 || page === currentPage + 3) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  
                  return null;
                })}
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(emailHistory.totalPages, currentPage + 1))}
                    className={currentPage === emailHistory.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardContent>
        </Card>
      )}

      {/* 상세 정보 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>이메일 발송 상세 정보</DialogTitle>
            <DialogDescription>
              발송 ID: {selectedDetail?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDetail && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">발주 번호</Label>
                  <p className="text-sm">{selectedDetail.orderNumber || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">제목</Label>
                  <p className="text-sm">{selectedDetail.subject}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">발송 상태</Label>
                  <div className="mt-1">
                    {renderStatusBadge(selectedDetail.sendingStatus)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">발송 일시</Label>
                  <p className="text-sm">
                    {selectedDetail.sentAt
                      ? format(new Date(selectedDetail.sentAt), 'yyyy-MM-dd HH:mm:ss', { locale: ko })
                      : '-'}
                  </p>
                </div>
              </div>

              {/* 수신자 정보 */}
              <div>
                <Label className="text-sm font-medium">수신자</Label>
                <div className="mt-2 space-y-2">
                  <div>
                    <span className="text-sm font-medium">TO:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedDetail.recipients.map((email, index) => (
                        <Badge key={index} variant="secondary">
                          {email}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {selectedDetail.cc.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">CC:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedDetail.cc.map((email, index) => (
                          <Badge key={index} variant="outline">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedDetail.bcc.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">BCC:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedDetail.bcc.map((email, index) => (
                          <Badge key={index} variant="outline">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 첨부 파일 */}
              {selectedDetail.attachmentFiles && selectedDetail.attachmentFiles.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">첨부 파일</Label>
                  <div className="mt-2 space-y-2">
                    {selectedDetail.attachmentFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file.filename}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 이메일 내용 */}
              {selectedDetail.messageContent && (
                <div>
                  <Label className="text-sm font-medium">이메일 내용</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                    <pre className="text-sm whitespace-pre-wrap">{selectedDetail.messageContent}</pre>
                  </div>
                </div>
              )}

              {/* 발송 상세 내역 */}
              {selectedDetail.details && selectedDetail.details.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">발송 상세 내역</Label>
                  <div className="mt-2 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>수신자</TableHead>
                          <TableHead>유형</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>메시지 ID</TableHead>
                          <TableHead>발송 시각</TableHead>
                          <TableHead>오류 메시지</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDetail.details.map((detail) => (
                          <TableRow key={detail.id}>
                            <TableCell className="font-medium">
                              {detail.recipientEmail}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {detail.recipientType.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {renderStatusBadge(detail.sendingStatus)}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs">{detail.messageId || '-'}</code>
                            </TableCell>
                            <TableCell>
                              {detail.sentAt
                                ? format(new Date(detail.sentAt), 'HH:mm:ss', { locale: ko })
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {detail.errorMessage && (
                                <div className="text-red-600 text-xs max-w-xs truncate" title={detail.errorMessage}>
                                  {detail.errorMessage}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* 오류 메시지 */}
              {selectedDetail.errorMessage && (
                <div>
                  <Label className="text-sm font-medium text-red-600">오류 메시지</Label>
                  <div className="mt-2 p-4 border border-red-200 rounded-lg bg-red-50">
                    <p className="text-sm text-red-800">{selectedDetail.errorMessage}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailHistoryPage;