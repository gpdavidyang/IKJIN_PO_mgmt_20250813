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
  FolderTree
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
        href: "/create-order", 
        icon: Plus,
        highlight: true, // 주요 기능 강조
        subItems: [
          { name: "🚀 통합 워크플로우", href: "/create-order/unified", highlight: true },
          { name: "표준 발주서", href: "/create-order/standard" },
          { name: "엑셀 발주서", href: "/create-order/excel" },
          // PRD 요구사항: 압출, 판넬, 부자재 발주서는 현재 UI에서 숨김 처리 (소스코드는 유지)
          // { name: "압출 발주서", href: "/create-order/extrusion" },
          // { name: "판넬 발주서", href: "/create-order/panel" },
          // { name: "부자재 발주서", href: "/create-order/accessories" },
        ]
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
      <div className="flex items-center h-16 px-4 bg-sidebar-primary">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-sidebar-primary-foreground rounded-lg flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-sidebar-primary" />
          </div>
          <span className="text-xl font-bold text-sidebar-primary-foreground">발주시스템</span>
        </div>
      </div>


      
      <nav className="mt-6 px-4 space-y-6">
        {navigationSections.map((section, sectionIndex) => (
          <div key={section.title}>
            {/* 섹션 제목 */}
            <div className="px-2 mb-3">
              <h3 className="text-xs font-semibold text-sidebar-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
            </div>
            
            {/* 섹션 메뉴 아이템들 */}
            <div className="space-y-1">
              {section.items.map((item) => {
                // 관리자 전용 메뉴 필터링
                if (item.adminOnly && (user as any)?.role !== "admin") {
                  return null;
                }
                
                return (
                  <div key={item.name}>
                    <Button
                      variant={isActive(item.href) ? "secondary" : "ghost"}
                      className={cn(
                        "w-full nav-item justify-start transition-all duration-200",
                        isActive(item.href) && "active bg-sidebar-accent text-sidebar-accent-foreground",
                        item.highlight && "font-medium border border-primary/20 hover:border-primary/40"
                      )}
                      onClick={() => {
                        if (item.subItems) {
                          toggleExpanded(item.name);
                        } else {
                          navigate(item.href);
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      onMouseEnter={() => {
                        // Prefetch route data on hover for better UX
                        prefetchForRoute(item.href);
                      }}
                    >
                      <item.icon className={cn(
                        "h-4 w-4 mr-3",
                        item.highlight && "text-primary"
                      )} />
                      <span className="flex-1 text-left">{item.name}</span>
                      {item.highlight && (
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      )}
                      {item.subItems && (
                        expandedItems.includes(item.name) ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    
                    {/* Sub-items */}
                    {item.subItems && expandedItems.includes(item.name) && (
                      <div className="ml-6 mt-2 space-y-1 border-l border-sidebar-border pl-3">
                        {item.subItems.map((subItem) => (
                          <Button
                            key={subItem.name}
                            variant={isActive(subItem.href) ? "secondary" : "ghost"}
                            className={cn(
                              "w-full justify-start text-sm nav-item transition-all duration-200",
                              isActive(subItem.href) && "active bg-sidebar-accent text-sidebar-accent-foreground",
                              subItem.highlight && "font-medium text-primary hover:bg-primary/10"
                            )}
                            onClick={() => {
                              navigate(subItem.href);
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            {subItem.highlight && "⭐ "}
                            {subItem.name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* 섹션 구분선 (마지막 섹션 제외) */}
            {sectionIndex < navigationSections.length - 1 && (
              <div className="pt-4">
                <div className="border-t border-sidebar-border"></div>
              </div>
            )}
          </div>
        ))}
        
        {(user as any)?.role === "admin" && (
          <>
            
            {/* Company Logo Section - Admin Only */}
            {company?.logoUrl && (
              <div className="mt-4 px-0">
                <div className="flex justify-center">
                  <OptimizedImage
                    src={company.logoUrl} 
                    alt={company.companyName}
                    className="h-16 w-auto object-contain pl-[60px] pr-[60px]"
                    priority={true}
                    quality={85}
                    lazy={false}
                    fallback="/images/default-company-logo.png"
                    placeholder="skeleton"
                  />
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
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Desktop sidebar (iPad Pro and up) - Always expanded */}
      <div className="hidden xl:fixed xl:inset-y-0 xl:left-0 xl:z-50 xl:block xl:w-64 xl:bg-sidebar-background xl:shadow-lg transition-all duration-300 border-r border-sidebar-border">
        <SidebarContent />
      </div>

      {/* Mobile/Tablet sidebar */}
      {isMobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background shadow-lg transform transition-transform duration-300 ease-in-out border-r border-sidebar-border">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
