import React, { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Home,
  FileText,
  Users,
  Building2,
  Settings,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    id: "dashboard",
    label: "대시보드",
    href: "/dashboard",
    icon: Home,
  },
  {
    id: "orders",
    label: "발주 관리",
    href: "/orders",
    icon: FileText,
    badge: "3",
    children: [
      { id: "orders-list", label: "발주 목록", href: "/orders", icon: FileText },
      { id: "orders-create", label: "발주 생성", href: "/orders/create", icon: FileText },
      { id: "orders-excel", label: "Excel 업로드", href: "/create-order-excel", icon: FileText },
    ],
  },
  {
    id: "vendors",
    label: "거래처 관리",
    href: "/vendors",
    icon: Building2,
    children: [
      { id: "vendors-list", label: "거래처 목록", href: "/vendors", icon: Building2 },
      { id: "vendors-create", label: "거래처 등록", href: "/vendors/create", icon: Building2 },
    ],
  },
  {
    id: "projects",
    label: "프로젝트",
    href: "/projects",
    icon: Users,
  },
  {
    id: "admin",
    label: "관리자",
    href: "/admin",
    icon: Settings,
  },
];

interface MobileNavigationProps {
  currentUser?: any;
  onLogout?: () => void;
}

export function MobileNavigation({ currentUser, onLogout }: MobileNavigationProps) {
  const [location, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavigate = (href: string) => {
    navigate(href);
    setIsOpen(false);
  };

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + "/");
  };

  const NavItemComponent = ({ item, level = 0 }: { item: NavItem; level?: number }) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    return (
      <div className="space-y-1">
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              handleNavigate(item.href);
            }
          }}
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200",
            level > 0 && "ml-4 border-l-2 border-gray-200 pl-4",
            active && "bg-primary-100 text-primary-700 font-medium",
            !active && "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className={cn("h-5 w-5", active && "text-primary-600")} />
            <span className="text-base">{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                {item.badge}
              </span>
            )}
          </div>
          {hasChildren && (
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            />
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {item.children!.map((child) => (
              <NavItemComponent key={child.id} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-10 w-10"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">메뉴 열기</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-6 border-b bg-gradient-to-r from-primary-600 to-primary-700 text-white">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-white text-lg font-semibold">
                  PO 관리 시스템
                </SheetTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20 p-1 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {currentUser && (
                <div className="text-sm text-primary-100 mt-2">
                  {currentUser.name || currentUser.username}
                </div>
              )}
            </SheetHeader>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-2">
                {navigationItems.map((item) => (
                  <NavItemComponent key={item.id} item={item} />
                ))}
              </nav>
            </div>

            {/* Footer */}
            <div className="border-t p-4">
              <Button
                variant="ghost"
                onClick={() => {
                  onLogout?.();
                  setIsOpen(false);
                }}
                className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5 mr-3" />
                로그아웃
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Mobile bottom navigation bar
export interface BottomNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const bottomNavItems: BottomNavItem[] = [
  { id: "dashboard", label: "홈", href: "/dashboard", icon: Home },
  { id: "orders", label: "발주", href: "/orders", icon: FileText, badge: "3" },
  { id: "vendors", label: "거래처", href: "/vendors", icon: Building2 },
  { id: "projects", label: "프로젝트", href: "/projects", icon: Users },
];

export function MobileBottomNavigation() {
  const [location, navigate] = useLocation();

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + "/");
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb z-50">
      <div className="grid grid-cols-4">
        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.href)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 min-h-[60px] transition-colors duration-200",
                active && "text-primary-600 bg-primary-50",
                !active && "text-gray-500 hover:text-gray-700 active:bg-gray-100"
              )}
            >
              <div className="relative">
                <item.icon className="h-6 w-6" />
                {item.badge && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}