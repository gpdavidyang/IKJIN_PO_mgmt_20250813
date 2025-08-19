import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSmartQuery, useQueryOptimization } from "@/hooks/use-enhanced-queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  Home, 
  FileText, 
  Plus, 
  Building, 
  Settings,
  Users,
  Menu,
  X,
  Package,
  BarChart3,
  Building2,
  FileSpreadsheet,
  Shield,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Upload,
  FileDown,
  FolderTree,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/contexts/SidebarContext";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { apiRequest } from "@/lib/queryClient";
import type { Company } from "@shared/schema";

// 네비게이션 섹션 정의 - 업무 흐름에 따른 직관적 그룹화
const navigationSections = [
  {
    title: "핵심 업무",
    items: [
      { name: "대시보드", href: "/", icon: Home },
      { 
        name: "발주서 작성", 
        href: "/create-order/unified-v2", // 직접 V2로 연결
        icon: Plus,
        highlight: true, // 주요 기능 강조
        // subItems 제거 - 더 이상 드롭다운 메뉴 없음
        // 숨겨진 메뉴들: 통합워크플로우, 표준발주서, 엑셀발주서
      },
      { name: "발주서 관리", href: "/orders", icon: FileText },
      { name: "승인 관리", href: "/approvals", icon: CheckCircle },
    ]
  },
  {
    title: "기초 데이터 관리",
    items: [
      { name: "현장 관리", href: "/projects", icon: Building2 },
      { name: "거래처 관리", href: "/vendors", icon: Building },
      { name: "분류 관리", href: "/category-management", icon: FolderTree },
      // PRD 요구사항: 품목 관리 UI는 숨김 처리 (소스코드는 유지, Excel 템플릿 기반 품목 관리)
      // { name: "품목 관리", href: "/items", icon: Package },
    ]
  },
  {
    title: "분석 및 도구",
    items: [
      { name: "보고서 및 분석", href: "/reports", icon: BarChart3 },
      { name: "가져오기/내보내기", href: "/import-export", icon: FileDown },
      { name: "템플릿 관리", href: "/templates", icon: FileSpreadsheet },
    ]
  },
  {
    title: "시스템 설정",
    items: [
      { name: "시스템 관리", href: "/admin", icon: Settings, adminOnly: true },
    ]
  }
];

export function Sidebar() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { isCollapsed, toggleSidebar } = useSidebar();

  // Query optimization hooks
  const { prefetchForRoute } = useQueryOptimization();

  // Fetch company data for logo display
  const { data: companies } = useSmartQuery<Company[]>(
    ['/api/companies'],
    {
      queryFn: () => apiRequest("GET", "/api/companies"),
      cacheType: "STATIC",
      enabled: !!user,
    }
  );

  const company = companies?.[0]; // Get the first (and likely only) company

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center h-16 px-4 bg-sidebar-primary transition-colors duration-200">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-sidebar-primary-foreground rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 hover:rotate-3">
              <ClipboardList className="h-5 w-5 text-sidebar-primary transition-transform duration-200" />
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold text-sidebar-primary-foreground transition-colors duration-200">발주시스템</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="text-sidebar-primary-foreground hover:bg-sidebar-primary-foreground/10 transition-all duration-200"
            aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>


      
      <nav className={cn(
        "mt-6 space-y-6 transition-all duration-200", 
        isCollapsed ? "px-2" : "px-4"
      )} role="navigation" aria-label="메인 네비게이션">
        {navigationSections.map((section, sectionIndex) => (
          <div key={section.title} className={cn(isCollapsed && "space-y-1")}>
            {/* 섹션 제목 */}
            {!isCollapsed && (
              <div className="px-2 mb-3">
                <h3 className="text-xs font-semibold text-sidebar-muted-foreground uppercase tracking-wider transition-colors duration-200">
                  {section.title}
                </h3>
              </div>
            )}
            
            {/* 섹션 메뉴 아이템들 */}
            <div className={cn("space-y-1", isCollapsed && "space-y-0.5")}>
              {section.items.map((item) => {
                // 관리자 전용 메뉴 필터링
                if (item.adminOnly && (user as any)?.role !== "admin") {
                  return null;
                }
                
                // 승인 관리 메뉴 권한 필터링
                if (item.name === "승인 관리") {
                  const canApprove = user && ["admin", "executive", "hq_management", "project_manager"].includes(user.role);
                  if (!canApprove) {
                    return null;
                  }
                }
                
                return (
                  <div key={item.name}>
                    <Button
                      variant={isActive(item.href) ? "secondary" : "ghost"}
                      className={cn(
                        "w-full nav-item transition-all duration-200 group",
                        "hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm",
                        isActive(item.href) && "active bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
                        item.highlight && "font-medium border border-primary/20 hover:border-primary/40 hover:bg-primary/5",
                        !isActive(item.href) && "hover:bg-sidebar-accent/50",
                        isCollapsed ? "justify-center px-2" : "justify-start"
                      )}
                      onClick={() => {
                        console.log(`🧭 사이드바 네비게이션: ${item.name} -> ${item.href}`);
                        console.log(`🧭 현재 위치: ${location}`);
                        
                        // 동일한 경로라도 강제로 네비게이션하여 페이지 새로고침 효과
                        if (location === item.href) {
                          console.log('🔄 동일한 경로로 네비게이션 - 페이지 리로드');
                          window.location.href = item.href;
                        } else {
                          navigate(item.href);
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      onMouseEnter={() => {
                        // Prefetch route data on hover for better UX
                        prefetchForRoute(item.href);
                      }}
                      aria-label={`${item.name} 페이지로 이동`}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className={cn(
                        "h-4 w-4 transition-all duration-200",
                        "group-hover:scale-110 group-active:scale-95",
                        item.highlight && "text-primary",
                        isActive(item.href) && "scale-110",
                        !isCollapsed && "mr-3"
                      )} />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left transition-colors duration-200">{item.name}</span>
                          {item.highlight && (
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse transition-all duration-200 group-hover:scale-125" />
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
            
            {/* 섹션 구분선 (마지막 섹션 제외) */}
            {sectionIndex < navigationSections.length - 1 && (
              <div className={cn("pt-4", isCollapsed && "pt-2")}>
                <div className="border-t border-sidebar-border transition-colors duration-200"></div>
              </div>
            )}
          </div>
        ))}
        
        {(user as any)?.role === "admin" && (
          <>
            
            {/* Company Logo Section - Admin Only */}
            {company?.logoUrl && !isCollapsed && (
              <div className="mt-4 px-0">
                <div className="flex justify-center">
                  <div className="transition-all duration-200 hover:scale-105 hover:shadow-md rounded-lg p-2">
                    <OptimizedImage
                      src={company.logoUrl} 
                      alt={company.companyName}
                      className="h-16 w-auto object-contain pl-[60px] pr-[60px] transition-opacity duration-200 hover:opacity-90"
                      priority={true}
                      quality={85}
                      lazy={false}
                      fallback="/images/default-company-logo.png"
                      placeholder="skeleton"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile/Tablet menu button */}
      <div className="xl:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="transition-all duration-200 hover:scale-110 active:scale-95 shadow-md hover:shadow-lg backdrop-blur-sm bg-background/90"
          aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4 transition-transform duration-200 rotate-0 hover:rotate-90" />
          ) : (
            <Menu className="h-4 w-4 transition-transform duration-200" />
          )}
        </Button>
      </div>

      {/* Desktop sidebar (iPad Pro and up) - Collapsible */}
      <div className={cn(
        "hidden xl:fixed xl:inset-y-0 xl:left-0 xl:z-50 xl:block xl:bg-sidebar-background/95 xl:backdrop-blur-sm xl:shadow-lg transition-all duration-300 border-r border-sidebar-border/50",
        isCollapsed ? "xl:w-16" : "xl:w-64"
      )}>
        <SidebarContent />
      </div>

      {/* Mobile/Tablet sidebar */}
      {isMobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-40">
          <div 
            className="fixed inset-0 bg-black/50 dark:bg-black/70 animate-in fade-in-0 duration-200" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="메뉴 배경 클릭으로 닫기"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background/95 backdrop-blur-sm shadow-xl transform transition-transform duration-300 ease-in-out border-r border-sidebar-border/50 animate-in slide-in-from-left-0">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
