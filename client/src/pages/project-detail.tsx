import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Building2, Calendar, MapPin, User, DollarSign, FileText, Edit, ShoppingCart, Plus, Eye, ChevronUp, ChevronDown, FolderOpen, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatKoreanWon, formatDate } from "@/lib/utils";
import type { Project } from "@shared/schema";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    queryFn: () => fetch(`/api/projects/${id}`).then(res => res.json()),
    enabled: !!id,
  });

  const { data: projectStatuses = [] } = useQuery<ProjectStatus[]>({
    queryKey: ["/api/project-statuses"],
  });

  const { data: projectTypes = [] } = useQuery<ProjectType[]>({
    queryKey: ["/api/project-types"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: projectMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/project-members", { projectId: id }],
    queryFn: () => fetch(`/api/project-members?projectId=${id}`).then(res => res.json()),
    enabled: !!id,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery<any>({
    queryKey: ["/api/orders", { projectId: id }],
    queryFn: () => fetch(`/api/orders?projectId=${id}&limit=100`).then(res => res.json()),
    enabled: !!id,
  });

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc' | null;
  }>({
    key: '',
    direction: null,
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <div className="w-4 h-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  const sortedOrders = ordersData?.orders ? [...ordersData.orders].sort((a: any, b: any) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // Handle nested properties
    if (sortConfig.key === 'vendor') {
      aValue = a.vendor?.name || '';
      bValue = b.vendor?.name || '';
    } else if (sortConfig.key === 'user') {
      aValue = a.user?.name || a.user?.email || '';
      bValue = b.user?.name || b.user?.email || '';
    }
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  }) : [];

  const getStatusName = (statusCode: string) => {
    const status = projectStatuses.find(s => s.statusCode === statusCode);
    return status ? status.statusName : statusCode;
  };

  const getTypeName = (typeCode: string) => {
    const type = projectTypes.find(t => t.typeCode === typeCode);
    return type ? type.typeName : typeCode;
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name || user.email : userId;
  };

  const getOrderManagerNames = () => {
    if (!projectMembers || projectMembers.length === 0) {
      return '-';
    }
    
    const orderManagers = projectMembers.filter((member: any) => member.role === 'order_manager');
    
    if (orderManagers.length === 0) {
      return '-';
    }
    
    const names = orderManagers.map((manager: any) => getUserName(manager.userId));
    return names.join(', ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'standby': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'approved': return '승인됨';
      case 'sent': return '발송됨';
      case 'completed': return '완료됨';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="p-2 space-y-2">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-2">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">프로젝트를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-3 text-sm">요청하신 프로젝트가 존재하지 않거나 삭제되었습니다.</p>
          <Button size="sm" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.projectName}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {project.projectCode}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/projects")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
            <Badge className={getStatusColor(project.status)}>
              {getStatusName(project.status)}
            </Badge>
            <Button 
              size="sm"
              onClick={() => navigate(`/projects/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg font-semibold">
                <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                현장 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-xs font-medium text-gray-500">클라이언트</label>
                  <p className="text-xs text-gray-900 mt-0.5">{project.clientName || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">현장 유형</label>
                  <p className="text-xs text-gray-900 mt-0.5">{getTypeName(project.projectType)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">위치</label>
                  <p className="text-xs text-gray-900 flex items-center mt-0.5">
                    <MapPin className="h-3 w-3 mr-1" />
                    {project.location || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">총 예산</label>
                  <p className="text-xs font-semibold text-blue-600 flex items-center mt-0.5">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {project.totalBudget ? formatKoreanWon(project.totalBudget) : '-'}
                  </p>
                </div>
              </div>
              {project.description && (
                <>
                  <Separator className="my-2" />
                  <div>
                    <label className="text-xs font-medium text-gray-500">현장 설명</label>
                    <p className="text-xs text-gray-900 mt-0.5">{project.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg font-semibold">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                일정 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-xs font-medium text-gray-500">시작일</label>
                  <p className="text-xs text-gray-900 mt-0.5">
                    {project.startDate ? formatDate(new Date(project.startDate)) : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">종료일</label>
                  <p className="text-xs text-gray-900 mt-0.5">
                    {project.endDate ? formatDate(new Date(project.endDate)) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg font-semibold">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                담당자 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-500">현장 관리자</label>
                <p className="text-xs text-gray-900 mt-0.5">
                  {project.projectManagerId ? getUserName(project.projectManagerId) : '-'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">발주 담당자</label>
                <p className="text-xs text-gray-900 mt-0.5">
                  {getOrderManagerNames()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg font-semibold">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                현장 통계
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-500">활성 상태</label>
                <p className="text-xs text-gray-900 mt-0.5">
                  {project.isActive ? '활성' : '비활성'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">생성일</label>
                <p className="text-xs text-gray-900 mt-0.5">
                  {project.createdAt ? formatDate(new Date(project.createdAt)) : '-'}
                </p>
              </div>
              {project.updatedAt && (
                <div>
                  <label className="text-xs font-medium text-gray-500">최종 수정일</label>
                  <p className="text-xs text-gray-900 mt-0.5">
                    {formatDate(new Date(project.updatedAt))}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Purchase Orders Section */}
      <div className="mt-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg font-semibold">
                <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
                현장 발주서 목록
                {ordersData && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {ordersData.totalCount || ordersData.orders?.length || 0}건
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center space-x-1">
                <Link to="/orders/create">
                  <Button size="sm" className="text-xs h-7">
                    <Plus className="h-3 w-3 mr-1" />
                    발주서 생성
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2">
            {ordersLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : ordersData?.orders && ordersData.orders.length > 0 ? (
              <div className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead 
                        className="text-xs h-8 cursor-pointer hover:bg-gray-50" 
                        onClick={() => handleSort('orderNumber')}
                      >
                        <div className="flex items-center">
                          발주번호
                          {getSortIcon('orderNumber')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-xs h-8 cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('vendor')}
                      >
                        <div className="flex items-center">
                          거래처
                          {getSortIcon('vendor')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-xs h-8 cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('orderDate')}
                      >
                        <div className="flex items-center">
                          발주일자
                          {getSortIcon('orderDate')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-xs h-8 cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('deliveryDate')}
                      >
                        <div className="flex items-center">
                          납기희망일
                          {getSortIcon('deliveryDate')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-xs h-8 cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('totalAmount')}
                      >
                        <div className="flex items-center">
                          총금액
                          {getSortIcon('totalAmount')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-xs h-8 cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          상태
                          {getSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-xs h-8 cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('user')}
                      >
                        <div className="flex items-center">
                          작성자
                          {getSortIcon('user')}
                        </div>
                      </TableHead>
                      <TableHead className="text-xs h-8">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedOrders.map((order: any) => (
                      <TableRow key={order.id} className="h-8">
                        <TableCell className="font-medium text-xs py-1">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {order.vendor?.name || '-'}
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {order.orderDate ? formatDate(new Date(order.orderDate)) : '-'}
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {order.deliveryDate ? formatDate(new Date(order.deliveryDate)) : '-'}
                        </TableCell>
                        <TableCell className="text-xs py-1 font-semibold text-blue-600">
                          {order.totalAmount ? formatKoreanWon(order.totalAmount) : '-'}
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          <Badge className={`${getOrderStatusColor(order.status)} text-xs px-1 py-0`}>
                            {getOrderStatusText(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          {order.user?.name || order.user?.email || '-'}
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          <div className="flex items-center justify-center gap-1">
                            {/* 상세 보기 */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600"
                                    onClick={() => navigate(`/orders/${order.id}`)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>상세 보기</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* 수정 */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-green-50 hover:text-green-600"
                                    onClick={() => navigate(`/orders/${order.id}/edit`)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>수정</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* PDF 보기 */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-orange-50 hover:text-orange-600"
                                    onClick={() => {
                                      // PDF 보기 기능 (향후 구현 예정)
                                      console.log('PDF 보기:', order.id);
                                    }}
                                  >
                                    <FileText className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>PDF 보기</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* 이메일 전송 */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-purple-50 hover:text-purple-600"
                                    onClick={() => {
                                      // 이메일 전송 기능 (향후 구현 예정)
                                      console.log('이메일 전송:', order.id);
                                    }}
                                  >
                                    <Mail className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>이메일 전송</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {ordersData.totalCount > 10 && (
                  <div className="flex justify-center pt-2">
                    <Link to={`/orders?projectId=${id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        모든 발주서 보기 ({ordersData.totalCount}건)
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <ShoppingCart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  발주서가 없습니다
                </h3>
                <p className="text-gray-600 mb-2 text-xs">
                  이 프로젝트에 대한 발주서가 아직 생성되지 않았습니다.
                </p>
                <Link to="/orders/create">
                  <Button size="sm" className="text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    첫 발주서 생성하기
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}