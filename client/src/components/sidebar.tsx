import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import type { Company } from "@shared/schema";

// Main navigation sections with separators
const primaryNavigation: Array<{
  name: string;
  href: string;
  icon: any;
  subItems?: Array<{ name: string; href: string }>;
}> = [
  { name: "대시보드", href: "/", icon: Home },
  { name: "발주서 관리", href: "/orders", icon: FileText },
  { name: "승인 관리", href: "/approvals", icon: CheckCircle },
  { 
    name: "발주서 작성", 
    href: "/create-order", 
    icon: Plus,
    subItems: [
      { name: "표준 발주서", href: "/create-order/standard" },
      // PRD 요구사항: 압출, 판넬, 부자재 발주서는 현재 UI에서 숨김 처리 (소스코드는 유지)
      // { name: "압출 발주서", href: "/create-order/extrusion" },
      // { name: "판넬 발주서", href: "/create-order/panel" },
      // { name: "부자재 발주서", href: "/create-order/accessories" },
      { name: "엑셀 발주서", href: "/create-order/excel" },
    ]
  },
];

const managementNavigation = [
  { name: "현장 관리", href: "/projects", icon: Building2 },
  { name: "거래처 관리", href: "/vendors", icon: Building },
  // PRD 요구사항: 품목 관리 UI는 숨김 처리 (소스코드는 유지, Excel 템플릿 기반 품목 관리)
  // { name: "품목 관리", href: "/items", icon: Package },
  { name: "분류 관리", href: "/category-management", icon: FolderTree },
  { name: "보고서 및 분석", href: "/reports", icon: BarChart3 },
  { name: "가져오기/내보내기", href: "/import-export", icon: FileDown },
];

const systemNavigation = [
  { name: "템플릿 관리", href: "/templates", icon: FileSpreadsheet },
  { name: "시스템 관리", href: "/admin", icon: Settings },
];

export function Sidebar() {
  const { user } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Fetch company data for logo display
  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: !!user
  });

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
      <div className="flex items-center justify-between h-16 px-4 bg-sidebar-primary">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="h-8 w-8 bg-sidebar-primary-foreground rounded-lg flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-sidebar-primary" />
          </div>
          {!isCollapsed && <span className="text-xl font-bold text-sidebar-primary-foreground">발주시스템</span>}
        </div>
        
        {/* Collapse button - only show when expanded */}
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-primary-foreground hover:bg-sidebar-primary-foreground/20 transition-colors"
            title="사이드바 축소"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>


      
      <nav className="mt-8 px-4 space-y-2">
        {/* Primary Navigation */}
        {primaryNavigation.map((item) => (
          <div key={item.name}>
            <Button
              variant={isActive(item.href) ? "secondary" : "ghost"}
              className={cn(
                "w-full nav-item",
                isCollapsed ? "justify-center px-0" : "justify-start",
                isActive(item.href) && "active"
              )}
              onClick={() => {
                if (item.subItems && !isCollapsed) {
                  toggleExpanded(item.name);
                } else {
                  window.location.href = item.href;
                  setIsMobileMenuOpen(false);
                }
              }}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.subItems && (
                    expandedItems.includes(item.name) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </Button>
            
            {/* Sub-items */}
            {item.subItems && !isCollapsed && expandedItems.includes(item.name) && (
              <div className="ml-6 mt-2 space-y-1">
                {item.subItems.map((subItem) => (
                  <Button
                    key={subItem.name}
                    variant={isActive(subItem.href) ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start text-sm nav-item",
                      isActive(subItem.href) && "active"
                    )}
                    onClick={() => {
                      window.location.href = subItem.href;
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {subItem.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* First Separator */}
        <div className="py-2">
          <div className="border-t border-sidebar-border"></div>
        </div>
        
        {/* Management Navigation */}
        {managementNavigation.map((item) => (
          <Button
            key={item.name}
            variant={isActive(item.href) ? "secondary" : "ghost"}
            className={cn(
              "w-full nav-item",
              isCollapsed ? "justify-center px-0" : "justify-start",
              isActive(item.href) && "active"
            )}
            onClick={() => {
              window.location.href = item.href;
              setIsMobileMenuOpen(false);
            }}
            title={isCollapsed ? item.name : undefined}
          >
            <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
            {!isCollapsed && item.name}
          </Button>
        ))}
        
        {/* Second Separator */}
        <div className="py-2">
          <div className="border-t border-sidebar-border"></div>
        </div>
        
        {/* System Navigation */}
        {systemNavigation.map((item) => {
          // Only show system management for admin users
          if (item.name === "시스템 관리" && (user as any)?.role !== "admin") {
            return null;
          }
          
          return (
            <Button
              key={item.name}
              variant={isActive(item.href) ? "secondary" : "ghost"}
              className={cn(
                "w-full nav-item",
                isCollapsed ? "justify-center px-0" : "justify-start",
                isActive(item.href) && "active"
              )}
              onClick={() => {
                window.location.href = item.href;
                setIsMobileMenuOpen(false);
              }}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
              {!isCollapsed && item.name}
            </Button>
          );
        })}
        
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
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Floating toggle button when sidebar is collapsed */}
      {isCollapsed && (
        <div className="hidden lg:block fixed top-20 left-20 z-50">
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-10 h-10 bg-sidebar-primary text-sidebar-primary-foreground rounded-full shadow-xl hover:bg-sidebar-primary/90 hover:scale-105 transition-all duration-200 border-2 border-sidebar-background"
            title="사이드바 확장"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:bg-sidebar-background lg:shadow-lg transition-all duration-300 border-r border-sidebar-border",
        isCollapsed ? "lg:w-16" : "lg:w-64"
      )}>
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background shadow-lg transform transition-transform duration-300 ease-in-out border-r border-sidebar-border">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
