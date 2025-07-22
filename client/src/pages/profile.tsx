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


export default function Profile() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

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
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      
      // Update local state with the server response
      if (updatedUser && typeof updatedUser === 'object') {
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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* 페이지 헤더 - 표준화 */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로필</h1>
            <p className="text-sm text-gray-600 mt-1">
              계정 정보와 설정을 관리하세요
            </p>
          </div>
        </div>
      </div>

      {/* 사용자 정보 헤더 */}
      <div className="flex items-center space-x-4 mb-6">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-white text-lg">
            {getUserInitials(user as any)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold">{getUserDisplayName(user as any)}</h2>
          <p className="text-gray-600">{(user as any)?.email}</p>
          <Badge variant="secondary" className="mt-1">
            {getRoleText((user as any)?.role || "")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 프로필 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>프로필 정보</span>
            </CardTitle>
            <CardDescription>
              개인 정보를 수정할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="전체 이름을 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-sm text-gray-500">이메일은 변경할 수 없습니다.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">역할</Label>
                <Input
                  id="role"
                  value={getRoleText(profileData.role)}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-sm text-gray-500">역할은 관리자만 변경할 수 있습니다.</p>
              </div>

              <div className="space-y-2">
                <Label>사용자 ID</Label>
                <Input
                  value={(user as any)?.id || ""}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <Separator />

              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
                className="w-full"
              >
                {updateProfileMutation.isPending ? "저장 중..." : "프로필 저장"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 설정 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>계정 설정</span>
            </CardTitle>
            <CardDescription>
              알림 및 언어 설정을 변경할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 알림 설정 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <h4 className="font-medium">알림 설정</h4>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>이메일 알림</Label>
                    <p className="text-sm text-gray-500">중요한 업데이트를 이메일로 받아보세요</p>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>발주서 알림</Label>
                    <p className="text-sm text-gray-500">발주서 상태 변경 시 알림을 받아보세요</p>
                  </div>
                  <Switch
                    checked={preferences.orderAlerts}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, orderAlerts: checked }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 언어 설정 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <h4 className="font-medium">언어 설정</h4>
              </div>
              
              <div className="space-y-2">
                <Label>언어</Label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={preferences.language === "ko" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreferences(prev => ({ ...prev, language: "ko" }))}
                  >
                    한국어
                  </Button>
                  <Button
                    type="button"
                    variant={preferences.language === "en" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreferences(prev => ({ ...prev, language: "en" }))}
                  >
                    English
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* 계정 정보 요약 */}
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3">계정 정보 요약</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">사용자 ID:</span>
                  <span className="font-mono">{(user as any)?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">이메일:</span>
                  <span>{(user as any)?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">역할:</span>
                  <span>{getRoleText((user as any)?.role || "")}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 비밀번호 변경 카드 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>비밀번호 변경</span>
            </CardTitle>
            <CardDescription>
              계정 보안을 위해 정기적으로 비밀번호를 변경하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  비밀번호를 변경하려면 아래 버튼을 클릭하세요.
                </p>
                <Button 
                  onClick={() => setShowPasswordForm(true)}
                  className="w-full"
                  variant="outline"
                >
                  비밀번호 변경하기
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">현재 비밀번호</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="현재 비밀번호를 입력하세요"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">새 비밀번호</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="새 비밀번호를 입력하세요"
                    required
                  />
                  <p className="text-xs text-gray-500">최소 6자 이상 입력하세요</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="새 비밀번호를 다시 입력하세요"
                    required
                  />
                </div>

                <Separator />

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
                    className="flex-1"
                  >
                    취소
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={changePasswordMutation.isPending}
                    className="flex-1"
                  >
                    {changePasswordMutation.isPending ? "변경 중..." : "비밀번호 변경"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}