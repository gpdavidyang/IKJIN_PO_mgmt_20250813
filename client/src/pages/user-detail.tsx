import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, User, Mail, Phone, Building, Calendar, Shield, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

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
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">사용자를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-4">요청하신 사용자가 존재하지 않거나 삭제되었습니다.</p>
          <Button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            사용자 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
          <div className="flex items-center space-x-3">
            {user.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt={userName}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{userName}</h1>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getRoleColor(user.role)}>
            {getRoleName(user.role)}
          </Badge>
          <Button size="sm">
            <Edit className="h-4 w-4 mr-2" />
            수정
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">이름</label>
                  <p className="text-sm text-gray-900">{userName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">이메일</label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {user.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">전화번호</label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    {user.phoneNumber || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">직책</label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <Building className="h-4 w-4 mr-1" />
                    {getPositionName(user.positionId)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                권한 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">사용자 역할</label>
                  <div className="mt-1">
                    <Badge className={getRoleColor(user.role)}>
                      {getRoleName(user.role)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">계정 상태</label>
                  <p className="text-sm text-gray-900">활성</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                계정 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">가입일</label>
                <p className="text-sm text-gray-900">
                  {user.createdAt ? formatDate(new Date(user.createdAt)) : '-'}
                </p>
              </div>
              {user.updatedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">최종 수정일</label>
                  <p className="text-sm text-gray-900">
                    {formatDate(new Date(user.updatedAt))}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">사용자 ID</label>
                <p className="text-sm text-gray-900 font-mono">{user.id}</p>
              </div>
            </CardContent>
          </Card>

          {user.profileImageUrl && (
            <Card>
              <CardHeader>
                <CardTitle>프로필 이미지</CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  src={user.profileImageUrl} 
                  alt={userName}
                  className="w-full rounded-lg object-cover"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}