import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
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

  if (isLoading || !user || user.role !== "admin") {
    return <div>Loading...</div>;
  }

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className={`bg-white shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <Users className={`h-6 w-6 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>사용자 관리</h1>
                  <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    시스템 사용자를 관리합니다
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className={`shadow-sm rounded-lg border overflow-hidden transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={`border-b transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50/50 border-gray-200'}`}>
                  <TableHead className={`px-3 py-1.5 text-xs font-semibold transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    사용자명
                  </TableHead>
                  <TableHead className={`px-3 py-1.5 text-xs font-semibold transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    이메일
                  </TableHead>
                  <TableHead className={`px-3 py-1.5 text-xs font-semibold transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    역할
                  </TableHead>
                  <TableHead className={`px-3 py-1.5 text-xs font-semibold transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    연락처
                  </TableHead>
                  <TableHead className={`px-3 py-1.5 text-xs font-semibold transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    가입일
                  </TableHead>
                  <TableHead className={`px-3 py-1.5 text-xs font-semibold transition-colors w-[100px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    작업
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className={`border-b transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <TableCell className="px-3 py-1.5">
                        <div className={`h-3 rounded animate-pulse transition-colors ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <div className={`h-3 rounded animate-pulse w-3/4 transition-colors ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <div className={`h-3 rounded animate-pulse w-1/2 transition-colors ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <div className={`h-3 rounded animate-pulse w-2/3 transition-colors ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <div className={`h-3 rounded animate-pulse w-2/3 transition-colors ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <div className={`h-3 rounded animate-pulse w-16 transition-colors ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id} className={`border-b transition-colors ${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50/50'}`}>
                      <TableCell className="px-3 py-1.5">
                        <button 
                          className="text-left"
                          onClick={() => {}}
                        >
                          <div className={`text-xs font-medium transition-colors ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}>
                            {user.name || `사용자 ${user.id}`}
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <div className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <Badge 
                          variant={user.role === 'admin' ? 'destructive' : user.role === 'order_manager' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {user.role === 'admin' ? '관리자' : user.role === 'order_manager' ? '발주담당자' : '사용자'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <div className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {user.phoneNumber || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <div className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {user.createdAt ? formatDate(user.createdAt) : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <div className="flex items-center -space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 w-6 p-0 transition-colors ${isDarkMode ? 'text-blue-400 hover:bg-blue-900/20' : 'text-blue-600 hover:bg-blue-50'}`}
                            onClick={() => {}}
                            title="수정"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 w-6 p-0 transition-colors ${isDarkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'}`}
                            onClick={() => {}}
                            title="삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className={`py-8 text-center text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      등록된 사용자가 없습니다
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          </div>
        </div>

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