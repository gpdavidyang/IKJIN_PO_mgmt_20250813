import { Bell, LogOut, User, Settings, Home, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { getUserInitials, getUserDisplayName, getRoleText } from "@/lib/statusUtils";
import { ThemeToggle } from "@/components/ui/theme-provider";

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

  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };



  return (
    <header className="bg-background shadow-sm border-b border-border relative z-10">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{currentPage.title}</h1>
            <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
              {currentPage.breadcrumb.map((item, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground/50" />}
                  {index === currentPage.breadcrumb.length - 1 ? (
                    <span className="text-foreground font-medium">{item.label}</span>
                  ) : (
                    <Link 
                      href={item.href}
                      className="hover:text-foreground transition-colors duration-200 cursor-pointer"
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
            <div className="flex items-center space-x-2 ml-8">
              {currentPage.actions.map((action, index) => (
                <Button
                  key={index}
                  asChild
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Link href={action.href}>
                    <Plus className="h-3 w-3 mr-1" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <ThemeToggle size="sm" />
          
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-2 w-2 p-0 bg-red-500" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center space-x-3 cursor-pointer hover:bg-accent rounded-lg p-2 transition-colors">
                  <div className="text-right hidden md:block">
                    <div className="text-sm font-medium text-foreground">
                      {getUserDisplayName(user as any)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getRoleText((user as any)?.role || "")}
                    </div>
                  </div>
                  
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
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
