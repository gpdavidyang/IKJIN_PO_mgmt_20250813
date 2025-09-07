import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getUserInitials, getUserDisplayName, getRoleText } from "@/lib/statusUtils";
import { User, Settings, Bell, Globe, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/components/ui/theme-provider";


export default function Profile() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    role: "",
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    orderAlerts: true,
    language: "ko",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (user && typeof user === 'object') {
      setProfileData({
        name: (user as any).name || "",
        email: (user as any).email || "",
        role: (user as any).role || "",
      });
    }
  }, [user]);

  // 권한 확인
  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "인증 오류",
        description: "로그인이 필요합니다. 다시 로그인해주세요.",
        variant: "destructive",
      });
      setTimeout(() => {
        navigate("/login");
      }, 500);
      return;
    }
  }, [user, isLoading, toast]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", { name: data.name });
      return response;
    },
    onSuccess: (updatedUser) => {
      // Update query cache directly with the server response
      if (updatedUser && typeof updatedUser === 'object') {
        queryClient.setQueryData(["/api/auth/user"], updatedUser);
        
        // Update local state with the server response
        setProfileData(prev => ({
          ...prev,
          name: (updatedUser as any).name || prev.name
        }));
      }
      
      toast({
        title: "성공",
        description: "프로필이 업데이트되었습니다.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다. 다시 로그인해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
      } else {
        toast({
          title: "오류",
          description: "프로필 업데이트에 실패했습니다.",
          variant: "destructive",
        });
      }
    }
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("PATCH", "/api/auth/change-password", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "비밀번호가 성공적으로 변경되었습니다.",
      });
      // 비밀번호 폼 초기화
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다. 다시 로그인해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
      } else {
        toast({
          title: "오류",
          description: error.response?.data?.message || "비밀번호 변경에 실패했습니다.",
          variant: "destructive",
        });
      }
    }
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 입력값 검증
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "입력 오류",
        description: "새 비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "입력 오류",
        description: "새 비밀번호는 최소 6자 이상이어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1366px] mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4 transition-colors ${isDarkMode ? 'border-blue-400' : 'border-blue-600'}`}></div>
              <p className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>로딩 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
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
                  <User className={`h-6 w-6 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>프로필</h1>
                  <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    계정 정보와 설정을 관리하세요
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 사용자 정보 헤더 */}
        <div className={`flex items-center space-x-4 p-6 rounded-lg border shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <Avatar className="h-16 w-16">
            <AvatarFallback className={`text-white text-lg transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-blue-600'}`}>
              {getUserInitials(user as any)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className={`text-xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{getUserDisplayName(user as any)}</h2>
            <p className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{(user as any)?.email}</p>
            <Badge variant="secondary" className="mt-1">
              {getRoleText((user as any)?.role || "")}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 프로필 정보 카드 */}
          <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <User className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>프로필 정보</h3>
              </div>
              <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                개인 정보를 수정할 수 있습니다.
              </p>
            </div>
            <div className="p-6">
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>이름</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="전체 이름을 입력하세요"
                    className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className={`transition-colors ${isDarkMode ? 'bg-gray-600 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-300'}`}
                  />
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>이메일은 변경할 수 없습니다.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>역할</Label>
                  <Input
                    id="role"
                    value={getRoleText(profileData.role)}
                    disabled
                    className={`transition-colors ${isDarkMode ? 'bg-gray-600 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-300'}`}
                  />
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>역할은 관리자만 변경할 수 있습니다.</p>
                </div>

                <div className="space-y-2">
                  <Label className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>사용자 ID</Label>
                  <Input
                    value={(user as any)?.id || ""}
                    disabled
                    className={`transition-colors ${isDarkMode ? 'bg-gray-600 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-300'}`}
                  />
                </div>

                <div className={`my-4 h-px transition-colors ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />

                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  className={`w-full shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  {updateProfileMutation.isPending ? "저장 중..." : "프로필 저장"}
                </Button>
              </form>
            </div>
          </div>

          {/* 설정 카드 */}
          <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Settings className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>계정 설정</h3>
              </div>
              <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                알림 및 언어 설정을 변경할 수 있습니다.
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* 알림 설정 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Bell className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <h4 className={`font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>알림 설정</h4>
                </div>
              
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>이메일 알림</Label>
                      <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>중요한 업데이트를 이메일로 받아보세요</p>
                    </div>
                    <Switch
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>발주서 알림</Label>
                      <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>발주서 상태 변경 시 알림을 받아보세요</p>
                    </div>
                    <Switch
                      checked={preferences.orderAlerts}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, orderAlerts: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className={`my-4 h-px transition-colors ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />

              {/* 언어 설정 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Globe className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <h4 className={`font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>언어 설정</h4>
                </div>
                
                <div className="space-y-2">
                  <Label className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>언어</Label>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant={preferences.language === "ko" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreferences(prev => ({ ...prev, language: "ko" }))}
                      className={`transition-colors ${preferences.language === "ko" 
                        ? (isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                        : (isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50')
                      }`}
                    >
                      한국어
                    </Button>
                    <Button
                      type="button"
                      variant={preferences.language === "en" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreferences(prev => ({ ...prev, language: "en" }))}
                      className={`transition-colors ${preferences.language === "en" 
                        ? (isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                        : (isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50')
                      }`}
                    >
                      English
                    </Button>
                  </div>
                </div>
              </div>

              <div className={`my-4 h-px transition-colors ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />

              {/* 계정 정보 요약 */}
              <div className={`p-4 border rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <h4 className={`font-medium mb-3 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>계정 정보 요약</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>사용자 ID:</span>
                    <span className={`font-mono transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{(user as any)?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>이메일:</span>
                    <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{(user as any)?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>역할:</span>
                    <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{getRoleText((user as any)?.role || "")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 비밀번호 변경 카드 */}
          <div className={`lg:col-span-1 shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Lock className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>비밀번호 변경</h3>
              </div>
              <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                계정 보안을 위해 정기적으로 비밀번호를 변경하세요.
              </p>
            </div>
            <div className="p-6">
              {!showPasswordForm ? (
                <div className="space-y-4">
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    비밀번호를 변경하려면 아래 버튼을 클릭하세요.
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => setShowPasswordForm(true)}
                      className={`w-full transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                      variant="outline"
                    >
                      여기서 바로 변경하기
                    </Button>
                    <Button 
                      onClick={() => navigate('/change-password')}
                      className={`w-full transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                      전용 페이지에서 변경하기
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>현재 비밀번호</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="현재 비밀번호를 입력하세요"
                      className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>새 비밀번호</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="새 비밀번호를 입력하세요"
                      className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                      required
                    />
                    <p className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>최소 6자 이상 입력하세요</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>새 비밀번호 확인</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="새 비밀번호를 다시 입력하세요"
                      className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                      required
                    />
                  </div>

                  <div className={`my-4 h-px transition-colors ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />

                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordData({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        });
                      }}
                      className={`flex-1 transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      취소
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={changePasswordMutation.isPending}
                      className={`flex-1 shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                      {changePasswordMutation.isPending ? "변경 중..." : "비밀번호 변경"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

