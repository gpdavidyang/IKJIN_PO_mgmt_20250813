import { Bell, LogOut, User, Settings, Home, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { getUserInitials, getUserDisplayName, getRoleText } from "@/lib/statusUtils";

// 개선된 페이지 설정 - 섹션별 그룹화와 액션 정보 포함
const pageConfig = {
  // 핵심 업무
  "/": { 
    title: "대시보드", 
    section: "핵심 업무",
    breadcrumb: [{ label: "대시보드", href: "/" }],
    actions: [] 
  },
  "/create-order": { 
    title: "발주서 작성", 
    section: "핵심 업무",
    breadcrumb: [{ label: "발주서 작성", href: "/create-order" }],
    actions: [] 
  },
  "/create-order/unified": { 
    title: "통합 워크플로우", 
    section: "핵심 업무",
    breadcrumb: [
      { label: "발주서 작성", href: "/create-order" },
      { label: "통합 워크플로우", href: "/create-order/unified" }
    ],
    actions: [] 
  },
  "/create-order/unified-v2": { 
    title: "발주서 작성", 
    section: "핵심 업무",
    breadcrumb: [
      { label: "발주서 작성", href: "/create-order" },
      { label: "발주서 작성", href: "/create-order/unified-v2" }
    ],
    actions: [] 
  },
  "/create-order/standard": { 
    title: "표준 발주서 작성", 
    section: "핵심 업무",
    breadcrumb: [
      { label: "발주서 작성", href: "/create-order" },
      { label: "표준 발주서", href: "/create-order/standard" }
    ],
    actions: [] 
  },
  "/create-order/excel": { 
    title: "엑셀 발주서 작성", 
    section: "핵심 업무",
    breadcrumb: [
      { label: "발주서 작성", href: "/create-order" },
      { label: "엑셀 발주서", href: "/create-order/excel" }
    ],
    actions: [] 
  },
  "/orders": { 
    title: "발주서 관리", 
    section: "핵심 업무",
    breadcrumb: [{ label: "발주서 관리", href: "/orders" }],
    actions: [{ label: "새 발주서", href: "/create-order/unified" }] 
  },
  "/approvals": { 
    title: "승인 관리", 
    section: "핵심 업무",
    breadcrumb: [{ label: "승인 관리", href: "/approvals" }],
    actions: [] 
  },
  
  // 기초 데이터 관리
  "/projects": { 
    title: "현장 관리", 
    section: "기초 데이터 관리",
    breadcrumb: [{ label: "현장 관리", href: "/projects" }],
    actions: [{ label: "새 현장", href: "/projects/new" }] 
  },
  "/vendors": { 
    title: "거래처 관리", 
    section: "기초 데이터 관리",
    breadcrumb: [{ label: "거래처 관리", href: "/vendors" }],
    actions: [{ label: "새 거래처", href: "/vendors/new" }] 
  },
  "/category-management": { 
    title: "분류 관리", 
    section: "기초 데이터 관리",
    breadcrumb: [{ label: "분류 관리", href: "/category-management" }],
    actions: [] 
  },
  "/items": { 
    title: "품목 관리", 
    section: "기초 데이터 관리",
    breadcrumb: [{ label: "품목 관리", href: "/items" }],
    actions: [{ label: "새 품목", href: "/items/new" }] 
  },
  
  // 분석 및 도구
  "/reports": { 
    title: "보고서 및 분석", 
    section: "분석 및 도구",
    breadcrumb: [{ label: "보고서 및 분석", href: "/reports" }],
    actions: [] 
  },
  "/import-export": { 
    title: "가져오기/내보내기", 
    section: "분석 및 도구",
    breadcrumb: [{ label: "가져오기/내보내기", href: "/import-export" }],
    actions: [] 
  },
  "/templates": { 
    title: "템플릿 관리", 
    section: "분석 및 도구",
    breadcrumb: [{ label: "템플릿 관리", href: "/templates" }],
    actions: [{ label: "새 템플릿", href: "/templates/new" }] 
  },
  
  // 시스템 설정
  "/admin": { 
    title: "시스템 관리", 
    section: "시스템 설정",
    breadcrumb: [{ label: "시스템 관리", href: "/admin" }],
    actions: [] 
  },
  "/profile": { 
    title: "프로필 설정", 
    section: "사용자",
    breadcrumb: [{ label: "프로필 설정", href: "/profile" }],
    actions: [] 
  },
};

export function Header() {
  const { user } = useAuth();
  const [location] = useLocation();
  
  // 동적 경로 처리를 위한 함수
  const getCurrentPage = () => {
    // 정확한 경로 매칭 먼저 시도
    if (pageConfig[location as keyof typeof pageConfig]) {
      return pageConfig[location as keyof typeof pageConfig];
    }
    
    // 동적 경로 처리 - 새로운 브레드크럼 구조
    if (location.startsWith('/orders/')) {
      return { 
        title: "발주서 상세", 
        section: "핵심 업무",
        breadcrumb: [
          { label: "발주서 관리", href: "/orders" },
          { label: "상세보기", href: location }
        ],
        actions: [{ label: "편집", href: `${location}/edit` }]
      };
    }
    if (location.startsWith('/projects/')) {
      return { 
        title: "현장 상세", 
        section: "기초 데이터 관리",
        breadcrumb: [
          { label: "현장 관리", href: "/projects" },
          { label: "상세보기", href: location }
        ],
        actions: [{ label: "편집", href: `${location}/edit` }]
      };
    }
    if (location.startsWith('/vendors/')) {
      return { 
        title: "거래처 상세", 
        section: "기초 데이터 관리",
        breadcrumb: [
          { label: "거래처 관리", href: "/vendors" },
          { label: "상세보기", href: location }
        ],
        actions: [{ label: "편집", href: `${location}/edit` }]
      };
    }
    if (location.startsWith('/items/')) {
      return { 
        title: "품목 상세", 
        section: "기초 데이터 관리",
        breadcrumb: [
          { label: "품목 관리", href: "/items" },
          { label: "상세보기", href: location }
        ],
        actions: [{ label: "편집", href: `${location}/edit` }]
      };
    }
    if (location.startsWith('/templates/')) {
      return { 
        title: "템플릿 상세", 
        section: "분석 및 도구",
        breadcrumb: [
          { label: "템플릿 관리", href: "/templates" },
          { label: "상세보기", href: location }
        ],
        actions: [{ label: "편집", href: `${location}/edit` }]
      };
    }
    if (location.startsWith('/admin/')) {
      return { 
        title: "시스템 관리", 
        section: "시스템 설정",
        breadcrumb: [{ label: "시스템 관리", href: "/admin" }],
        actions: []
      };
    }
    
    // 기본값
    return pageConfig["/"];
  };
  
  const currentPage = getCurrentPage();

  const { logoutMutation, forceLogout } = useAuth();
  
  const handleLogout = async () => {
    try {
      console.log("🚪 Logout button clicked");
      logoutMutation.mutate();
    } catch (error) {
      console.error("❌ Logout error, attempting force logout:", error);
      // If regular logout fails, try force logout
      await forceLogout();
    }
  };



  return (
    <header className="bg-background/95 backdrop-blur-sm shadow-sm border-b border-border/50 relative z-10 transition-all duration-200">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground transition-colors duration-200">{currentPage.title}</h1>
            <nav className="flex items-center space-x-1 text-sm text-muted-foreground" role="navigation" aria-label="페이지 경로">
              {currentPage.breadcrumb.map((item, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && (
                    <ChevronRight 
                      className="h-3 w-3 mx-1 text-muted-foreground/50 transition-colors duration-200" 
                      aria-hidden="true" 
                    />
                  )}
                  {index === currentPage.breadcrumb.length - 1 ? (
                    <span 
                      className="text-foreground font-medium transition-colors duration-200"
                      aria-current="page"
                    >
                      {item.label}
                    </span>
                  ) : (
                    <Link 
                      href={item.href}
                      className="hover:text-foreground hover:scale-105 focus:text-foreground focus:scale-105 transition-all duration-200 cursor-pointer rounded-sm px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      aria-label={`${item.label}로 이동`}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
          
          {/* 페이지별 액션 버튼 */}
          {currentPage.actions && currentPage.actions.length > 0 && (
            <div className="hidden sm:flex items-center space-x-2 ml-8">
              {currentPage.actions.map((action, index) => (
                <Button
                  key={index}
                  asChild
                  size="sm"
                  variant="outline"
                  className="text-xs hover:scale-105 active:scale-95 transition-all duration-200 border-primary/20 hover:border-primary/40 hover:bg-primary/5 focus:ring-2 focus:ring-primary/20"
                >
                  <Link href={action.href} aria-label={`${action.label} 페이지로 이동`}>
                    <Plus className="h-3 w-3 mr-1 transition-transform duration-200 group-hover:rotate-90" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative hover:scale-110 active:scale-95 transition-all duration-200 hover:bg-accent/50 focus:ring-2 focus:ring-primary/20" 
            aria-label="알림"
          >
            <Bell className="h-5 w-5 transition-transform duration-200 hover:animate-pulse" />
            <Badge className="absolute -top-1 -right-1 h-2 w-2 p-0 bg-red-500 animate-pulse" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center space-x-3 cursor-pointer hover:bg-accent rounded-lg p-2 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label="사용자 메뉴 열기"
                >
                  <div className="text-right hidden md:block">
                    <div className="text-sm font-medium text-foreground transition-colors duration-200">
                      {getUserDisplayName(user as any)}
                    </div>
                    <div className="text-xs text-muted-foreground transition-colors duration-200">
                      {getRoleText((user as any)?.role || "")}
                    </div>
                  </div>
                  
                  <Avatar className="ring-2 ring-transparent hover:ring-primary/20 transition-all duration-200">
                    <AvatarFallback className="bg-primary text-primary-foreground transition-colors duration-200">
                      {getUserInitials(user as any)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-56 animate-in slide-in-from-top-2 duration-200">
                <DropdownMenuLabel className="text-foreground">사용자 정보</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <div className="px-2 py-2 bg-muted/20 rounded-md mx-2 mb-2">
                  <div className="text-sm font-medium text-foreground">
                    {getUserDisplayName(user as any)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(user as any)?.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getRoleText((user as any)?.role || "")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    사용자 ID: {(user as any)?.id}
                  </div>
                </div>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-accent/50 focus:bg-accent/50 transition-colors duration-200">
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                    프로필 설정
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 focus:bg-red-50 dark:focus:bg-red-950/20 transition-colors duration-200"
                  disabled={logoutMutation.isPending}
                  aria-label={logoutMutation.isPending ? "로그아웃 처리 중" : "로그아웃"}
                >
                  <LogOut className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                  {logoutMutation.isPending ? "로그아웃 중..." : "로그아웃"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
