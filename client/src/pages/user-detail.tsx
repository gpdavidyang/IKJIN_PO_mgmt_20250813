import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, User, Mail, Phone, Building, Calendar, Shield, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AvatarImage } from "@/components/ui/optimized-image";
import { formatDate } from "@/lib/utils";
import { useTheme } from "@/components/ui/theme-provider";

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/users", id],
    enabled: !!id,
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["/api/positions"],
  });

  const getPositionName = (positionId: number | null) => {
    if (!positionId) return '-';
    const position = positions.find(p => p.id === positionId);
    return position ? position.name : '-';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return '관리자';
      case 'manager': return '매니저';
      case 'user': return '일반 사용자';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1366px] mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4 transition-colors ${isDarkMode ? 'border-blue-400' : 'border-blue-600'}`}></div>
              <p className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>사용자 정보를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1366px] mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className={`text-xl font-semibold mb-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>사용자를 찾을 수 없습니다</h2>
              <p className={`mb-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>요청하신 사용자가 존재하지 않거나 삭제되었습니다.</p>
              <Button 
                onClick={() => navigate("/admin")}
                className={`shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                사용자 목록으로 돌아가기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className={`transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  목록으로
                </Button>
                <div className="flex items-center space-x-3">
                  <AvatarImage
                    src={user.profileImageUrl || ''}
                    alt={userName}
                    size="lg"
                    shape="circle"
                    initials={userName.slice(0, 2)}
                    quality={90}
                    lazy={false}
                    priority={true}
                  />
                  <div>
                    <h1 className={`text-xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{userName}</h1>
                    <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{user.email}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getRoleColor(user.role)}>
                  {getRoleName(user.role)}
                </Badge>
                <Button 
                  size="sm"
                  className={`shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`p-6 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                    <User className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>기본 정보</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>이름</label>
                    <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{userName}</p>
                  </div>
                  <div>
                    <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>이메일</label>
                    <p className={`text-sm flex items-center transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      <Mail className={`h-4 w-4 mr-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>전화번호</label>
                    <p className={`text-sm flex items-center transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      <Phone className={`h-4 w-4 mr-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      {user.phoneNumber || '-'}
                    </p>
                  </div>
                  <div>
                    <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>직책</label>
                    <p className={`text-sm flex items-center transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      <Building className={`h-4 w-4 mr-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      {getPositionName(user.positionId)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`p-6 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                    <Shield className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>권한 정보</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>사용자 역할</label>
                    <div className="mt-1">
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleName(user.role)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>계정 상태</label>
                    <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>활성</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-6 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center">
                <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <Calendar className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>계정 정보</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>가입일</label>
                <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {user.createdAt ? formatDate(new Date(user.createdAt)) : '-'}
                </p>
              </div>
              {user.updatedAt && (
                <div>
                  <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>최종 수정일</label>
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {formatDate(new Date(user.updatedAt))}
                  </p>
                </div>
              )}
              <div>
                <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>사용자 ID</label>
                <p className={`text-sm font-mono transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{user.id}</p>
              </div>
            </div>
          </div>

          {user.profileImageUrl && (
            <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`p-6 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>프로필 이미지</h3>
              </div>
              <div className="p-6">
                <AvatarImage
                  src={user.profileImageUrl}
                  alt={userName}
                  size="xl"
                  shape="rounded"
                  initials={userName.slice(0, 2)}
                  quality={95}
                  containerClassName="w-full max-w-md mx-auto"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}

