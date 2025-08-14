import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Users, Plus, Search, ChevronUp, ChevronDown, List, Grid, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/formatters";
import { useLocation } from "wouter";
import { useTheme } from "@/components/ui/theme-provider";

export default function UsersManagement() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // UI state management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/login");
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast, setLocation]);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      toast({
        title: "접근 권한 없음",
        description: "관리자만 접근할 수 있습니다.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [user, isLoading, toast]);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!user && user.role === "admin",
    retry: false,
  });

  // 검색 및 정렬 기능
  const filteredUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    
    let filtered = users;
    
    // 역할 필터링
    if (selectedRole !== "all") {
      filtered = filtered.filter((user: any) => user.role === selectedRole);
    }
    
    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((user: any) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phoneNumber?.toLowerCase().includes(query)
      );
    }

    // 정렬
    if (sortField) {
      filtered = [...filtered].sort((a: any, b: any) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        // null/undefined 처리
        if (aValue == null) aValue = "";
        if (bValue == null) bValue = "";
        
        // 날짜 필드는 날짜로 처리
        if (sortField === 'createdAt') {
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
    }

    return filtered;
  }, [users, selectedRole, searchQuery, sortField, sortDirection]);

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PUT", `/api/users/${userId}`, { role });
    },
    onSuccess: () => {
      toast({
        title: "사용자 역할 변경",
        description: "사용자 역할이 성공적으로 변경되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/login");
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "사용자 역할 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, role: string) => {
    updateUserMutation.mutate({ userId, role });
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

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return '관리자';
      case 'order_manager': return '발주담당자';
      case 'field_worker': return '현장직원';
      case 'project_manager': return '프로젝트매니저';
      case 'hq_management': return '본사관리';
      case 'executive': return '임원';
      default: return '사용자';
    }
  };

  if (isLoading || !user || user.role !== "admin") {
    return <div>Loading...</div>;
  }

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <Users className={`h-6 w-6 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>사용자 관리</h1>
                  <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>시스템 사용자를 조회하고 관리하세요</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={`text-sm transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}
                >
                  총 {filteredUsers.length}개
                </Badge>
                <Button 
                  onClick={() => setLocation("/users/add")}
                  className={`shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  사용자 추가
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
            <div className="flex flex-col xl:flex-row xl:items-end gap-3">
              {/* Search Section */}
              <div className="flex-1">
                <label className={`text-sm font-medium block mb-2 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>검색</label>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <Input
                    placeholder="사용자명, 이메일, 연락처로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 h-11 text-sm rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} ${searchQuery ? `${isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'}` : ""}`}
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="w-full xl:w-48">
                <label className={`text-sm font-medium block mb-2 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>역할</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className={`h-11 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                    <SelectValue placeholder="역할 선택" />
                  </SelectTrigger>
                  <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    <SelectItem value="all">모든 역할</SelectItem>
                    <SelectItem value="admin">관리자</SelectItem>
                    <SelectItem value="order_manager">발주담당자</SelectItem>
                    <SelectItem value="field_worker">현장직원</SelectItem>
                    <SelectItem value="project_manager">프로젝트매니저</SelectItem>
                    <SelectItem value="hq_management">본사관리</SelectItem>
                    <SelectItem value="executive">임원</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-3">
                <div className={`flex items-center rounded-lg p-1 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-8 w-8 p-0"
                    title="목록 보기"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cards")}
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

        {/* Content based on view mode */}
        {viewMode === 'table' ? (
          <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={`border-b transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <TableHead 
                        className={`h-11 px-4 text-sm font-semibold cursor-pointer select-none transition-colors ${
                          isDarkMode 
                            ? 'text-gray-400 hover:bg-gray-700' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>사용자명</span>
                          {getSortIcon("name")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className={`h-11 px-4 text-sm font-semibold cursor-pointer select-none transition-colors ${
                          isDarkMode 
                            ? 'text-gray-400 hover:bg-gray-700' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => handleSort("email")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>이메일</span>
                          {getSortIcon("email")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className={`h-11 px-4 text-sm font-semibold cursor-pointer select-none transition-colors ${
                          isDarkMode 
                            ? 'text-gray-400 hover:bg-gray-700' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => handleSort("role")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>역할</span>
                          {getSortIcon("role")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className={`h-11 px-4 text-sm font-semibold cursor-pointer select-none transition-colors ${
                          isDarkMode 
                            ? 'text-gray-400 hover:bg-gray-700' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => handleSort("phoneNumber")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>연락처</span>
                          {getSortIcon("phoneNumber")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className={`h-11 px-4 text-sm font-semibold cursor-pointer select-none transition-colors ${
                          isDarkMode 
                            ? 'text-gray-400 hover:bg-gray-700' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => handleSort("createdAt")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>가입일</span>
                          {getSortIcon("createdAt")}
                        </div>
                      </TableHead>
                      <TableHead className={`h-11 px-4 text-sm font-semibold text-right transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                        관리
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                          <TableCell><div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                          <TableCell><div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                          <TableCell><div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                          <TableCell><div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                          <TableCell><div className={`h-4 rounded animate-pulse ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div></TableCell>
                        </TableRow>
                      ))
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className={`text-center py-8 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {searchQuery || selectedRole !== "all" ? "검색 결과가 없습니다" : "등록된 사용자가 없습니다"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user: any) => (
                        <TableRow key={user.id} className={`h-12 border-b transition-colors ${
                          isDarkMode 
                            ? 'hover:bg-gray-700 border-gray-600' 
                            : 'hover:bg-gray-50 border-gray-100'
                        }`}>
                          <TableCell className="py-2 px-4">
                            <div 
                              className={`text-sm font-medium cursor-pointer hover:underline overflow-hidden text-ellipsis whitespace-nowrap transition-colors ${
                                isDarkMode 
                                  ? 'text-blue-400 hover:text-blue-300' 
                                  : 'text-blue-600 hover:text-blue-800'
                              }`}
                              onClick={() => setLocation(`/user-detail/${user.id}`)}
                              title={user.name || user.email}
                            >
                              {user.name || user.email}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <Badge 
                              variant={user.role === 'admin' ? 'destructive' : user.role === 'order_manager' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {getRoleText(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {user.phoneNumber || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {user.createdAt ? formatDate(user.createdAt) : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLocation(`/user-detail/${user.id}`)}
                                className="h-7 w-7 p-0"
                                title="수정"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("정말로 이 사용자를 삭제하시겠습니까?")) {
                                    console.log("Delete user:", user.id);
                                  }
                                }}
                                className={`h-7 w-7 p-0 transition-colors ${
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {usersLoading ? (
              [...Array(6)].map((_, i) => (
                <Card key={i} className={`p-6 shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="animate-pulse">
                    <div className={`h-4 rounded mb-3 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                    <div className={`h-3 rounded w-3/4 mb-2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                    <div className={`h-3 rounded w-1/2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                  </div>
                </Card>
              ))
            ) : filteredUsers.length === 0 ? (
              <div className={`col-span-full text-center py-8 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {searchQuery || selectedRole !== "all" ? "검색 결과가 없습니다" : "등록된 사용자가 없습니다"}
              </div>
            ) : (
              filteredUsers.map((user: any) => (
                <Card key={user.id} className={`p-4 hover:shadow-md transition-shadow shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
                      }`}>
                        <User className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <h3 className={`text-sm font-semibold cursor-pointer transition-colors ${
                          isDarkMode 
                            ? 'text-gray-100 hover:text-blue-400' 
                            : 'text-gray-900 hover:text-blue-600'
                        }`} onClick={() => setLocation(`/user-detail/${user.id}`)}>
                          {user.name || user.email}
                        </h3>
                        <Badge 
                          variant={user.role === 'admin' ? 'destructive' : user.role === 'order_manager' ? 'default' : 'secondary'}
                          className="text-xs mt-1"
                        >
                          {getRoleText(user.role)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className={`flex items-center text-sm gap-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span className="font-medium">이메일:</span>
                      <span className="ml-1 text-xs">{user.email}</span>
                    </div>
                    {user.phoneNumber && (
                      <div className={`flex items-center text-sm gap-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="font-medium">연락처:</span>
                        <span className="ml-1 text-xs">{user.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex items-center justify-between text-xs mb-3 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span>가입일: {user.createdAt ? formatDate(user.createdAt) : '-'}</span>
                  </div>
                  
                  <div className={`flex items-center justify-end gap-2 pt-2 border-t transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocation(`/user-detail/${user.id}`)}
                      className={`h-8 w-8 p-0 transition-colors ${
                        isDarkMode 
                          ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20' 
                          : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                      }`}
                      title="수정"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("정말로 이 사용자를 삭제하시겠습니까?")) {
                          console.log("Delete user:", user.id);
                        }
                      }}
                      className={`h-8 w-8 p-0 transition-colors ${
                        isDarkMode 
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                          : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      }`}
                      title="삭제"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Information Card */}
        <Card className={`shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardContent className="p-4">
            <h3 className={`text-sm font-semibold mb-3 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>사용자 역할 안내</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border transition-colors ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="destructive" className="text-xs">관리자</Badge>
                </div>
                <ul className={`text-xs space-y-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• 모든 발주서 조회 및 승인</li>
                  <li>• 거래처 관리 (추가, 수정, 삭제)</li>
                  <li>• 사용자 권한 관리</li>
                  <li>• 시스템 통계 및 분석</li>
                </ul>
              </div>
              <div className={`p-3 rounded-lg border transition-colors ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="default" className="text-xs">발주담당자</Badge>
                </div>
                <ul className={`text-xs space-y-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• 발주서 작성 및 관리</li>
                  <li>• 자신의 발주서만 조회</li>
                  <li>• 거래처 정보 조회</li>
                  <li>• 개인 대시보드 접근</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}