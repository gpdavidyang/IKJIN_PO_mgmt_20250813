import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Edit, Trash2, Users, Grid3X3, List, UserCheck, UserX, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { RoleDisplay, RoleSelectOptions } from "@/components/role-display";

// Frontend User type with guaranteed id and role
type FrontendUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  profileImageUrl: string | null;
  role: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

const userFormSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력하세요"),
  name: z.string().optional(),
  positionId: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.enum(["user", "manager", "admin"]).default("user")
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      name: "",
      positionId: "",
      phoneNumber: "",
      role: "user"
    }
  });

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: positions = [] } = useQuery<any[]>({
    queryKey: ["/api/positions"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const transformedData = {
        ...userData,
        positionId: userData.positionId && userData.positionId !== "" && userData.positionId !== "none" ? parseInt(userData.positionId) : null
      };
      return await apiRequest("POST", "/api/users", transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "성공",
        description: "사용자가 추가되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "사용자 추가에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...userData }: { id: string } & UserFormData) => {
      const transformedData = {
        ...userData,
        positionId: userData.positionId && userData.positionId !== "" && userData.positionId !== "none" ? parseInt(userData.positionId) : null
      };
      return await apiRequest("PATCH", `/api/users/${id}`, transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({
        title: "성공",
        description: "사용자 정보가 수정되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "사용자 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "성공",
        description: "사용자가 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "사용자 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, ...data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const filteredUsers = users.filter((user: any) =>
    user.email?.toLowerCase().includes(searchText.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    user.position?.toLowerCase().includes(searchText.toLowerCase())
  );



  const handleEdit = (user: any) => {
    setEditingUser(user);
    const userRole = user.role as "user" | "manager" | "admin" | undefined;
    form.reset({
      email: user.email || "",
      name: user.name || "",
      positionId: user.positionId ? String(user.positionId) : "none",
      phoneNumber: user.phoneNumber || "",
      role: userRole || "user"
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (user: any) => {
    if (confirm(`${user.email} 사용자를 삭제하시겠습니까?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const getUserDisplayName = (user: any) => {
    if (user.name) {
      return user.name;
    }
    return user.email?.split('@')[0] || '사용자명 없음';
  }

  const getPositionName = (positionId: number | null) => {
    if (!positionId) return '-';
    const position = positions.find(p => p.id === positionId);
    return position?.positionName || '-';
  };



  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'user': return 'secondary';
      default: return 'outline';
    }
  };

  // Check if current user is admin
  const userRole = (currentUser as any)?.role;

  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">사용자 정보를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated and has admin role
  if (!currentUser) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <UserX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">로그인이 필요합니다</h2>
          <p className="text-muted-foreground">사용자 관리 기능을 사용하려면 먼저 로그인하세요.</p>
          <Button 
            onClick={() => navigate('/login')} 
            className="mt-4"
          >
            로그인하기
          </Button>
        </div>
      </div>
    );
  }

  // Allow admin access or temporary access for testing
  const isAdmin = userRole === 'admin';
  const isDevelopment = import.meta.env.MODE === 'development';
  const allowAccess = isAdmin || isDevelopment;
  
  console.log('User management access check:', {
    userRole,
    isAdmin,
    isDevelopment,
    allowAccess,
    currentUser
  });
  
  if (!allowAccess) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <UserX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h2>
          <p className="text-muted-foreground">사용자 관리 기능은 관리자만 사용할 수 있습니다.</p>
          <p className="text-sm text-muted-foreground mt-2">현재 권한: <RoleDisplay role={userRole || 'user'} /></p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
              <p className="text-sm text-gray-600 mt-1">
                시스템 사용자를 관리하고 권한을 설정합니다
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingUser(null);
              form.reset();
              setIsDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            사용자 추가
          </Button>
        </div>
      </div>
      {/* Search and View Toggle */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <Input
          placeholder="이메일, 이름, 직책으로 검색..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-7 text-xs max-w-xs"
        />
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}>
          <ToggleGroupItem value="list" aria-label="목록 보기" className="h-7 px-2">
            <List className="h-3 w-3" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="카드 보기" className="h-7 px-2">
            <LayoutGrid className="h-3 w-3" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {/* Users Content */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-1 p-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-1 px-2 animate-pulse">
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-1/4 mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-6">
              <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500 mb-2">
                {searchText ? "검색 조건에 맞는 사용자가 없습니다." : "등록된 사용자가 없습니다."}
              </p>
              {!searchText && (
                <Button size="sm" onClick={() => setIsDialogOpen(true)} className="h-6 px-2 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  첫 번째 사용자 추가
                </Button>
              )}
            </div>
          ) : (
            <>
              {viewMode === 'list' ? (
                <div className="divide-y">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-2 py-1 bg-gray-50 text-xs font-medium text-gray-600">
                    <div className="col-span-2">사용자명</div>
                    <div className="col-span-3">이메일</div>
                    <div className="col-span-2">전화번호</div>
                    <div className="col-span-2">직함</div>
                    <div className="col-span-2">권한</div>
                    <div className="col-span-1 text-center">작업</div>
                  </div>
                  
                  {/* User Rows */}
                  {filteredUsers.map((user: any) => (
                    <div key={user.id} className="grid grid-cols-12 gap-2 px-2 py-1 hover:bg-gray-50 transition-colors text-xs">
                      <div className="col-span-2 flex items-center">
                        <span className="font-medium text-gray-900 truncate">
                          {getUserDisplayName(user)}
                        </span>
                      </div>
                      <div className="col-span-3 flex items-center">
                        <span className="text-gray-600 truncate">{user.email}</span>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <span className="text-gray-600 truncate">
                          {user.phoneNumber || '-'}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <span className="text-gray-600 truncate">
                          {getPositionName(user.positionId)}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center">
                        <Badge 
                          variant={getRoleBadgeVariant((user as any).role || "user")}
                          className="text-xs px-1 py-0"
                        >
                          <RoleDisplay role={(user as any).role || "user"} />
                        </Badge>
                      </div>
                      <div className="col-span-1 flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(user)}
                          className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 text-gray-600"
                          title="수정"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-red-100 text-red-600"
                          title="삭제"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-2">
                  {filteredUsers.map((user: any) => (
                    <Card key={user.id} className="p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {getUserDisplayName(user)}
                          </h4>
                          <p className="text-xs text-gray-600 truncate">{user.email}</p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 text-gray-600"
                            title="수정"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-red-100 text-red-600"
                            title="삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">전화번호:</span>
                          <span className="text-gray-700">{user.phoneNumber || '-'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">직함:</span>
                          <span className="text-gray-700">{getPositionName(user.positionId)}</span>
                        </div>
                        <div className="flex justify-between text-xs items-center">
                          <span className="text-gray-500">권한:</span>
                          <Badge 
                            variant={getRoleBadgeVariant((user as any).role || "user")}
                            className="text-xs px-1 py-0"
                          >
                            <RoleDisplay role={(user as any).role || "user"} />
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "사용자 수정" : "새 사용자 추가"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일 *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="user@company.com" 
                        {...field} 
                        disabled={!!editingUser}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사용자명</FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="positionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>직책</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="직책을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">직책 없음</SelectItem>
                        {positions.map((position: any) => (
                          <SelectItem key={position.id} value={String(position.id)}>
                            {position.positionName}
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
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연락처</FormLabel>
                    <FormControl>
                      <Input placeholder="010-1234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>역할 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="역할을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <RoleSelectOptions>
                          {(options) => options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </RoleSelectOptions>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {editingUser ? "수정" : "추가"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}