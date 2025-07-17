import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Building2, Calendar, MapPin, User, DollarSign, Search, ChevronUp, ChevronDown, Edit, Trash2, List, Grid, FolderOpen, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, formatKoreanWon, parseKoreanWon, cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { PageHeader } from "@/components/ui/page-header";
import type { Project } from "@shared/schema";

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'active': return 'default';
    case 'completed': return 'secondary';
    case 'on_hold': return 'outline';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return '진행중';
    case 'completed': return '완료';
    case 'on_hold': return '보류';
    case 'cancelled': return '취소';
    default: return status;
  }
};

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [openOrderManagerSelect, setOpenOrderManagerSelect] = useState(false);
  const [dateFilter, setDateFilter] = useState<'none' | 'recent' | 'new'>('none');

  // URL 매개변수 처리
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get('filter');
    
    if (filter === 'recent') {
      // 최근 1개월 시작된 현장 필터링
      setDateFilter('recent');
      setSearchText("최근 1개월 시작");
    } else if (filter === 'new') {
      // 이번 달 신규 현장 필터링
      setDateFilter('new');
      setSearchText("이번 달 신규");
    }
  }, []);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: projectMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/project-members"],
  });

  const form = useForm({
    defaultValues: {
      projectName: "",
      projectCode: "",
      clientName: "",
      projectType: "",
      location: "",
      status: "active",
      projectManagerId: "",
      orderManagerIds: [] as string[],
      description: "",
      startDate: "",
      endDate: "",
      totalBudget: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ description: "현장이 성공적으로 추가되었습니다." });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        description: error.message || "현장 추가 중 오류가 발생했습니다." 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/projects/${editingProject?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsDialogOpen(false);
      setEditingProject(null);
      form.reset();
      toast({ description: "현장이 성공적으로 수정되었습니다." });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        description: error.message || "현장 수정 중 오류가 발생했습니다." 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ description: "프로젝트가 성공적으로 삭제되었습니다." });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        description: error.message || "현장 삭제 중 오류가 발생했습니다." 
      });
    },
  });

  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // 날짜 기반 필터링
    if (dateFilter === 'recent') {
      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      
      filtered = projects.filter((project: Project) => {
        if (!project.startDate) return false;
        const startDate = new Date(project.startDate);
        return startDate >= oneMonthAgo && startDate <= now;
      });
    } else if (dateFilter === 'new') {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      filtered = projects.filter((project: Project) => {
        if (!project.startDate) return false;
        const startDate = new Date(project.startDate);
        return startDate >= firstDayOfMonth && startDate <= now;
      });
    }

    // 텍스트 검색 필터링 (날짜 필터 표시 제외)
    if (searchText && !searchText.includes("최근 1개월") && !searchText.includes("이번 달")) {
      filtered = filtered.filter((project: Project) =>
        project.projectName.toLowerCase().includes(searchText.toLowerCase()) ||
        (project.projectCode && project.projectCode.toLowerCase().includes(searchText.toLowerCase())) ||
        (project.clientName && project.clientName.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    return filtered;
  }, [projects, searchText, dateFilter]);

  const onSubmit = async (data: any) => {
    const transformedData = {
      ...data,
      totalBudget: data.totalBudget ? data.totalBudget.toString().replace(/[^\d]/g, '') : null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    };

    if (editingProject) {
      // Update project first
      const projectData = { ...transformedData };
      delete projectData.orderManagerIds;
      
      await updateMutation.mutateAsync({ id: editingProject.id, ...projectData });
      
      // Update project members
      if (data.orderManagerIds) {
        // Remove existing members for this project
        const existingMembers = projectMembers.filter(member => member.projectId === editingProject.id);
        for (const member of existingMembers) {
          await fetch(`/api/project-members/${member.id}`, { method: 'DELETE' });
        }
        
        // Add new members
        for (const userId of data.orderManagerIds) {
          await fetch('/api/project-members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: editingProject.id,
              userId: userId,
              role: 'order_manager'
            })
          });
        }
        
        // Invalidate cache
        queryClient.invalidateQueries({ queryKey: ['/api/project-members'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      }
    } else {
      createMutation.mutate(transformedData);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    
    // Get current order managers for this project
    const currentOrderManagers = projectMembers
      .filter(member => member.projectId === project.id)
      .map(member => member.userId);
    
    form.reset({
      projectName: project.projectName,
      projectCode: project.projectCode || "",
      clientName: project.clientName || "",
      projectType: project.projectType || "",
      location: project.location || "",
      status: project.status,
      projectManagerId: project.projectManagerId || "",
      orderManagerIds: currentOrderManagers,
      description: project.description || "",
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
      totalBudget: project.totalBudget || "",
      isActive: project.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("정말로 이 현장을 삭제하시겠습니까?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAdd = () => {
    setEditingProject(null);
    form.reset();
    setIsDialogOpen(true);
  };

  // 정렬 기능
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const sortedProjects = useMemo(() => {
    if (!sortField) return filteredProjects;
    
    return [...filteredProjects].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // null/undefined 처리
      if (aValue == null) aValue = "";
      if (bValue == null) bValue = "";
      
      // 특별한 정렬 처리
      if (sortField === 'totalBudget') {
        aValue = parseFloat(aValue || '0');
        bValue = parseFloat(bValue || '0');
      } else if (sortField === 'startDate' || sortField === 'endDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }
      
      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
      }
    });
  }, [filteredProjects, sortField, sortDirection]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="현장 관리"
        action={user?.role === "admin" ? (
          <Button onClick={handleAdd} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            현장 추가
          </Button>
        ) : undefined}
      />

      {/* Search Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="현장명, 현장 코드, 고객사명으로 검색..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {filteredProjects.length}개 현장
              </span>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 w-8 p-0"
                  title="목록 보기"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className="h-8 w-8 p-0"
                  title="카드 보기"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects View */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead 
                      className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort("projectName")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>현장명</span>
                        {getSortIcon("projectName")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort("clientName")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>고객사</span>
                        {getSortIcon("clientName")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>상태</span>
                        {getSortIcon("status")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort("location")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>위치</span>
                        {getSortIcon("location")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort("totalBudget")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>예산</span>
                        {getSortIcon("totalBudget")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-11 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort("startDate")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>시작일</span>
                        {getSortIcon("startDate")}
                      </div>
                    </TableHead>
                    {user?.role === "admin" && (
                      <TableHead className="h-11 px-4 text-sm font-semibold text-gray-700 w-[120px]">
                        작업
                      </TableHead>
                    )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      {user?.role === "admin" && <TableCell></TableCell>}
                    </TableRow>
                  ))
                ) : sortedProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === "admin" ? 7 : 6} className="text-center py-8 text-gray-500">
                      {searchText ? "검색 결과가 없습니다" : "등록된 현장이 없습니다"}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedProjects.map((project: any) => (
                    <TableRow key={project.id} className="h-12 hover:bg-gray-50 border-b border-gray-100">
                      <TableCell className="py-2 px-4">
                        <div>
                          <div 
                            className="text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline overflow-hidden text-ellipsis whitespace-nowrap"
                            onClick={() => navigate(`/projects/${project.id}`)}
                            title={project.projectName}
                          >
                            {project.projectName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {project.projectCode || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="text-sm text-gray-600">
                          {project.clientName || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <Badge variant={getStatusVariant(project.status)}>
                          {getStatusLabel(project.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="text-sm text-gray-600">
                          {project.location || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="text-sm font-semibold text-blue-600">
                          {project.totalBudget ? formatKoreanWon(project.totalBudget) : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        <div className="text-sm text-gray-600">
                          {project.startDate ? formatDate(project.startDate) : '-'}
                        </div>
                      </TableCell>
                      {user?.role === "admin" && (
                        <TableCell className="py-2 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(project)}
                              className="h-7 w-7 p-0"
                              title="수정"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(project.id)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              title="삭제"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            filteredProjects.map((project: Project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4" onClick={() => navigate(`/projects/${project.id}`)}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600">{project.projectName}</h3>
                      </div>
                      <Badge variant={getStatusVariant(project.status)}>
                        {getStatusLabel(project.status)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{project.clientName || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{project.location || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold text-blue-600">{project.totalBudget ? formatKoreanWon(project.totalBudget) : '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{project.startDate ? formatDate(project.startDate) : '-'}</span>
                      </div>
                    </div>
                    {user?.role === "admin" && (
                      <div className="flex items-center justify-end -space-x-1 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(project);
                          }}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="수정"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(project.id);
                          }}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="삭제"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Project Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "현장 수정" : "새 현장 추가"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>현장명 *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="projectCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>현장 코드</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>고객사</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>현장 유형</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>위치</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상태</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">진행중</SelectItem>
                          <SelectItem value="completed">완료</SelectItem>
                          <SelectItem value="on_hold">보류</SelectItem>
                          <SelectItem value="cancelled">취소</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="projectManagerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>프로젝트 매니저</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="orderManagerIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>발주 관리자 (복수 선택 가능)</FormLabel>
                      <FormControl>
                        <Popover open={openOrderManagerSelect} onOpenChange={setOpenOrderManagerSelect}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openOrderManagerSelect}
                              className="w-full justify-between"
                            >
                              {!field.value || field.value.length === 0 ? (
                                "발주 관리자를 선택하세요"
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {field.value.slice(0, 2).map((managerId: string) => {
                                    const user = users.find(u => u.id === managerId);
                                    return (
                                      <Badge key={managerId} variant="secondary" className="text-xs">
                                        {user?.name || managerId}
                                      </Badge>
                                    );
                                  })}
                                  {field.value.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{field.value.length - 2}명 더
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="담당자 검색..." />
                              <CommandEmpty>담당자를 찾을 수 없습니다.</CommandEmpty>
                              <CommandGroup>
                                {users.map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    onSelect={() => {
                                      const currentValues = field.value || [];
                                      const isSelected = currentValues.includes(user.id);
                                      if (isSelected) {
                                        field.onChange(currentValues.filter((id: string) => id !== user.id));
                                      } else {
                                        field.onChange([...currentValues, user.id]);
                                      }
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value?.includes(user.id) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {user.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormMessage />
                      
                      {/* Selected Order Managers Display */}
                      {field.value && field.value.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-muted-foreground mb-1">선택된 발주 관리자:</div>
                          <div className="flex flex-wrap gap-1">
                            {field.value.map((managerId: string) => {
                              const user = users.find(u => u.id === managerId);
                              return (
                                <Badge 
                                  key={managerId} 
                                  variant="outline" 
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  {user?.name || managerId}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentValues = field.value || [];
                                      field.onChange(currentValues.filter((id: string) => id !== managerId));
                                    }}
                                    className="ml-1 hover:text-blue-900"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>시작일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>총 예산</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="₩0" 
                          value={field.value ? formatKoreanWon(field.value) : ''}
                          onChange={(e) => {
                            const numericValue = parseKoreanWon(e.target.value);
                            field.onChange(numericValue.toString());
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  취소
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingProject ? "수정" : "추가"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}