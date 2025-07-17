import { Bell, LogOut, User, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { getUserInitials, getUserDisplayName, getRoleText } from "@/lib/statusUtils";
import { useSidebar } from "@/contexts/SidebarContext";
import { useState, useEffect } from "react";

const pageConfig = {
  "/": { title: "대시보드", breadcrumb: "홈 > 대시보드" },
  "/orders": { title: "발주서 관리", breadcrumb: "홈 > 발주서 관리" },
  "/create-order": { title: "발주서 작성", breadcrumb: "홈 > 발주서 작성" },
  "/vendors": { title: "거래처 관리", breadcrumb: "홈 > 거래처 관리" },
  "/items": { title: "품목 관리", breadcrumb: "홈 > 품목 관리" },
  "/projects": { title: "현장 관리", breadcrumb: "홈 > 현장 관리" },
  "/templates": { title: "템플릿 관리", breadcrumb: "홈 > 템플릿 관리" },
  "/reports": { title: "보고서 분석", breadcrumb: "홈 > 보고서 분석" },
  "/admin": { title: "시스템 관리", breadcrumb: "홈 > 시스템 관리" },
  "/profile": { title: "프로필 설정", breadcrumb: "홈 > 프로필 설정" },
};

export function Header() {
  const { user } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [location] = useLocation();
  
  const handleSidebarToggle = () => {
    toggleSidebar();
  };
  
  // 동적 경로 처리를 위한 함수
  const getCurrentPage = () => {
    // 정확한 경로 매칭 먼저 시도
    if (pageConfig[location as keyof typeof pageConfig]) {
      return pageConfig[location as keyof typeof pageConfig];
    }
    
    // 동적 경로 처리
    if (location.startsWith('/orders/')) {
      return { title: "발주서 상세", breadcrumb: "홈 > 발주서 관리 > 상세보기" };
    }
    if (location.startsWith('/projects/')) {
      return { title: "현장 상세", breadcrumb: "홈 > 현장 관리 > 상세보기" };
    }
    if (location.startsWith('/vendors/')) {
      return { title: "거래처 상세", breadcrumb: "홈 > 거래처 관리 > 상세보기" };
    }
    if (location.startsWith('/items/')) {
      return { title: "품목 상세", breadcrumb: "홈 > 품목 관리 > 상세보기" };
    }
    if (location.startsWith('/templates/')) {
      return { title: "템플릿 상세", breadcrumb: "홈 > 템플릿 관리 > 상세보기" };
    }
    if (location.startsWith('/admin/')) {
      return { title: "시스템 관리", breadcrumb: "홈 > 시스템 관리" };
    }
    
    // 기본값
    return { title: "대시보드", breadcrumb: "홈 > 대시보드" };
  };
  
  const currentPage = getCurrentPage();

  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };



  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative z-10">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{currentPage.title}</h1>
            <nav className="text-sm text-gray-500">{currentPage.breadcrumb}</nav>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-2 w-2 p-0 bg-red-500" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-gray-900">
                      {getUserDisplayName(user as any)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getRoleText((user as any)?.role || "")}
                    </div>
                  </div>
                  
                  <Avatar>
                    <AvatarFallback className="bg-primary text-white">
                      {getUserInitials(user as any)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>사용자 정보</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <div className="px-2 py-2">
                  <div className="text-sm font-medium">
                    {getUserDisplayName(user as any)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {(user as any)?.email}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getRoleText((user as any)?.role || "")}
                  </div>
                  <div className="text-xs text-gray-500">
                    사용자 ID: {(user as any)?.id}
                  </div>
                </div>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    프로필 설정
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
