import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Building2, Calendar, MapPin, User, DollarSign, Search, ChevronUp, ChevronDown, Edit, Trash2, List, Grid, FolderOpen, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useTheme } from "@/components/ui/theme-provider";
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
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // 디버깅용 로그
  console.log('🔍 Projects page - Current user:', user);
  console.log('🔍 User role:', user?.role);
  console.log('🔍 Can add project:', user?.role && ["admin", "hq_management", "project_manager"].includes(user.role));
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
      return apiRequest("PUT", `/api/projects/${editingProject?.id}`, data);
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
      startDate: data.startDate || null,
      endDate: data.endDate || null,
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
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <FolderOpen className={`h-6 w-6 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>현장 관리</h1>
                  <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>프로젝트 현장을 조회하고 관리하세요</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={`text-sm transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}
                >
                  총 {filteredProjects.length}개
                </Badge>
                {user?.role && ["admin", "hq_management", "project_manager"].includes(user.role) && (
                  <Button 
                    onClick={handleAdd} 
                    className={`shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    현장 추가
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
            <div className="flex flex-col xl:flex-row xl:items-end gap-3">
              {/* Search Section */}
              <div className="flex-1">
                <label className={`text-sm font-medium block mb-2 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>검색</label>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <Input
                    placeholder="현장명, 고객사명으로 검색..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className={`pl-10 h-11 text-sm rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${searchText ? `${isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}` : ""}`}
                  />
                </div>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-3">
                <div className={`flex items-center rounded-lg p-1 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
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
          </div>
        </div>

        {/* Projects Table View */}
        {viewMode === 'table' ? (
          <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={`border-b transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <TableHead 
                      className={`px-6 py-3 text-sm font-medium cursor-pointer select-none transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSort("projectName")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>현장명</span>
                        {getSortIcon("projectName")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className={`px-6 py-3 text-sm font-medium cursor-pointer select-none transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSort("clientName")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>고객사</span>
                        {getSortIcon("clientName")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className={`px-6 py-3 text-sm font-medium cursor-pointer select-none transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>상태</span>
                        {getSortIcon("status")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className={`px-6 py-3 text-sm font-medium cursor-pointer select-none transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSort("location")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>위치</span>
                        {getSortIcon("location")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className={`px-6 py-3 text-sm font-medium cursor-pointer select-none transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSort("totalBudget")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>예산</span>
                        {getSortIcon("totalBudget")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className={`px-6 py-3 text-sm font-medium cursor-pointer select-none transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSort("startDate")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>시작일</span>
                        {getSortIcon("startDate")}
                      </div>
                    </TableHead>
                    <TableHead className={`px-6 py-3 text-sm font-medium text-right transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      관리
                    </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className={`h-3 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                      <TableCell><div className={`h-3 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                      <TableCell><div className={`h-3 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                      <TableCell><div className={`h-3 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                      <TableCell><div className={`h-3 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                      <TableCell><div className={`h-3 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))
                ) : sortedProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className={`text-center py-6 text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {searchText ? "검색 결과가 없습니다" : "등록된 현장이 없습니다"}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedProjects.map((project: any) => (
                    <TableRow key={project.id} className={`border-b transition-colors ${isDarkMode ? 'hover:bg-gray-700 border-gray-600' : 'hover:bg-gray-50 border-gray-100'}`}>
                      <TableCell className="py-4 px-6">
                        <div>
                          <div 
                            className={`text-sm font-medium cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap transition-colors ${
                              isDarkMode 
                                ? 'text-blue-400 hover:text-blue-300' 
                                : 'text-blue-600 hover:text-blue-700'
                            }`}
                            onClick={() => navigate(`/projects/${project.id}`)}
                            title={project.projectName}
                          >
                            {project.projectName}
                          </div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {project.projectCode || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {project.clientName || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge variant={getStatusVariant(project.status)}>
                          {getStatusLabel(project.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {project.location || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {project.totalBudget ? formatKoreanWon(project.totalBudget) : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {project.startDate ? formatDate(project.startDate) : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(project)}
                            className={`h-6 w-6 p-0 transition-colors ${
                              isDarkMode 
                                ? 'text-blue-400 hover:text-blue-300' 
                                : 'text-blue-600 hover:text-blue-700'
                            }`}
                            title="수정"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(project.id)}
                            className={`h-6 w-6 p-0 transition-colors ${
                              isDarkMode 
                                ? 'text-red-400 hover:text-red-300' 
                                : 'text-red-600 hover:text-red-700'
                            }`}
                            title="삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="p-3">
                  <div className="space-y-2">
                    <div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                    <div className={`h-3 rounded animate-pulse w-3/4 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                    <div className={`h-3 rounded animate-pulse w-1/2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <FolderOpen className={`mx-auto h-8 w-8 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <p className={`text-xs mt-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>등록된 현장이 없습니다.</p>
            </div>
          ) : (
            filteredProjects.map((project: Project) => (
              <div key={project.id} className={`p-3 hover:shadow-md transition-shadow shadow-sm rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                {/* TOSS-style Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
                    }`}>
                      <FolderOpen className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <h3 className={`text-sm font-semibold cursor-pointer transition-colors ${
                        isDarkMode 
                          ? 'text-gray-100 hover:text-blue-400' 
                          : 'text-gray-900 hover:text-blue-600'
                      }`} onClick={() => navigate(`/projects/${project.id}`)}>
                        {project.projectName}
                      </h3>
                      {project.projectCode && (
                        <span className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {project.projectCode}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(project.status)}>
                    {getStatusLabel(project.status)}
                  </Badge>
                </div>
                
                {/* TOSS-style Content Section */}
                <div className="space-y-2 mb-3">
                  <div className={`flex items-center text-xs gap-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Building2 className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className="font-medium">고객사:</span>
                    <span className="ml-1">{project.clientName || '-'}</span>
                  </div>
                  {project.location && (
                    <div className={`flex items-center text-xs gap-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <MapPin className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className="font-medium">위치:</span>
                      <span className="ml-1">{project.location}</span>
                    </div>
                  )}
                  {project.totalBudget && (
                    <div className={`flex items-center text-xs gap-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <DollarSign className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className="font-medium">예산:</span>
                      <span className={`ml-1 font-medium transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatKoreanWon(project.totalBudget)}</span>
                    </div>
                  )}
                  {project.startDate && (
                    <div className={`flex items-center text-xs gap-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Calendar className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className="font-medium">시작일:</span>
                      <span className="ml-1">{formatDate(project.startDate)}</span>
                    </div>
                  )}
                </div>
                
                {/* TOSS-style Admin Actions */}
                <div className={`flex items-center justify-end gap-2 pt-2 border-t transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(project)}
                    className={`h-8 w-8 p-0 transition-colors ${
                      isDarkMode 
                        ? 'text-blue-400 hover:text-blue-300' 
                        : 'text-blue-600 hover:text-blue-700'
                    }`}
                    title="수정"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(project.id)}
                    className={`h-8 w-8 p-0 transition-colors ${
                      isDarkMode 
                        ? 'text-red-400 hover:text-red-300' 
                        : 'text-red-600 hover:text-red-700'
                    }`}
                    title="삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
          </div>
        )}

        {/* Project Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>현장명 *</FormLabel>
                      <FormControl>
                        <Input {...field} className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400' : 'bg-white border-gray-300'}`} />
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
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>현장 코드</FormLabel>
                      <FormControl>
                        <Input {...field} className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400' : 'bg-white border-gray-300'}`} />
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
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>고객사</FormLabel>
                      <FormControl>
                        <Input {...field} className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400' : 'bg-white border-gray-300'}`} />
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
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>현장 유형</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                            <SelectValue placeholder="현장 유형을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                          <SelectItem value="아파트">아파트</SelectItem>
                          <SelectItem value="오피스텔">오피스텔</SelectItem>
                          <SelectItem value="단독주택">단독주택</SelectItem>
                          <SelectItem value="상업시설">상업시설</SelectItem>
                          <SelectItem value="사무실">사무실</SelectItem>
                          <SelectItem value="쇼핑몰">쇼핑몰</SelectItem>
                          <SelectItem value="공장">공장</SelectItem>
                          <SelectItem value="창고">창고</SelectItem>
                          <SelectItem value="인프라">인프라</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>위치</FormLabel>
                    <FormControl>
                      <Input {...field} className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400' : 'bg-white border-gray-300'}`} />
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
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>상태</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
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
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>현장 관리자</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                            <SelectValue placeholder="선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
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
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>발주 관리자 (복수 선택 가능)</FormLabel>
                      <FormControl>
                        <Popover open={openOrderManagerSelect} onOpenChange={setOpenOrderManagerSelect}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openOrderManagerSelect}
                              className={`w-full justify-between transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
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
                          <PopoverContent className={`w-full p-0 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                            <Command className={`transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
                              <CommandInput placeholder="담당자 검색..." className={`transition-colors ${isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-white'}`} />
                              <CommandEmpty className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>담당자를 찾을 수 없습니다.</CommandEmpty>
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
                                  className={`text-xs transition-colors ${isDarkMode ? 'bg-blue-900/20 text-blue-400 border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
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
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>시작일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`} />
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
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>종료일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`} />
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
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>총 예산</FormLabel>
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
                          className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400' : 'bg-white border-gray-300'}`}
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
                    <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>설명</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400' : 'bg-white border-gray-300'}`} />
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
    </div>
  );
}