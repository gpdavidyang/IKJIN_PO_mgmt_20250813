/**
 * Mobile Sidebar Component
 * 
 * Mobile-optimized sidebar with:
 * - Slide-out drawer for mobile
 * - Touch-friendly navigation
 * - Collapsible menu sections
 * - Quick access buttons
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Menu,
  X,
  Home,
  FileText,
  Users,
  Package,
  Building,
  Settings,
  BarChart3,
  Plus,
  Search,
  Bell,
  User,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { getUserInitials, getUserDisplayName, getRoleText } from '@/lib/statusUtils';

interface MobileSidebarProps {
  className?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: string | number;
  description?: string;
  requiredRole?: string[];
}

export function MobileSidebar({ className }: MobileSidebarProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    main: true,
    management: false,
    admin: false,
  });

  // Menu configuration
  const menuSections: MenuSection[] = [
    {
      title: '주요 기능',
      items: [
        {
          name: '대시보드',
          href: '/',
          icon: Home,
          description: '전체 현황 보기',
        },
        {
          name: '발주서 관리',
          href: '/orders',
          icon: FileText,
          description: '발주서 작성 및 관리',
        },
        {
          name: '빠른 발주 작성',
          href: '/create-order',
          icon: Plus,
          description: '새 발주서 작성',
        },
      ],
      collapsible: false,
      defaultOpen: true,
    },
    {
      title: '데이터 관리',
      items: [
        {
          name: '거래처 관리',
          href: '/vendors',
          icon: Building,
          description: '거래처 정보 관리',
        },
        {
          name: '품목 관리',
          href: '/items',
          icon: Package,
          description: '품목 및 자재 관리',
        },
        {
          name: '현장 관리',
          href: '/projects',
          icon: Users,
          description: '프로젝트 현장 관리',
        },
      ],
      collapsible: true,
      defaultOpen: false,
    },
    {
      title: '보고서 및 분석',
      items: [
        {
          name: '보고서',
          href: '/reports',
          icon: BarChart3,
          description: '통계 및 분석',
        },
        {
          name: '승인 관리',
          href: '/approvals',
          icon: FileText,
          description: '승인 대기 발주서',
          requiredRole: ['project_manager', 'hq_management', 'executive', 'admin'],
        },
      ],
      collapsible: true,
      defaultOpen: false,
    },
    {
      title: '시스템 관리',
      items: [
        {
          name: '사용자 관리',
          href: '/users',
          icon: Users,
          description: '시스템 사용자 관리',
          requiredRole: ['admin'],
        },
        {
          name: '시스템 설정',
          href: '/admin',
          icon: Settings,
          description: '시스템 전체 설정',
          requiredRole: ['admin'],
        },
        {
          name: '템플릿 관리',
          href: '/templates',
          icon: FileText,
          description: '발주서 템플릿 관리',
          requiredRole: ['admin'],
        },
      ],
      collapsible: true,
      defaultOpen: false,
    },
  ];

  // Filter menu items based on user role
  const getFilteredSections = () => {
    return menuSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!item.requiredRole) return true;
        return item.requiredRole.includes(user?.role || '');
      }),
    })).filter(section => section.items.length > 0);
  };

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const handleNavigation = (href: string) => {
    setLocation(href);
    setIsOpen(false);
  };

  const isCurrentPage = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden p-2 h-auto"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="left" 
        className="w-80 p-0 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">PO</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm">구매 발주 관리</h2>
              <p className="text-xs text-gray-500">Purchase Order System</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">
                  {getUserInitials(user as any)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {getUserDisplayName(user as any)}
                </div>
                <div className="text-xs text-gray-500">
                  {getRoleText(user.role)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Quick Actions */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                빠른 작업
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-12 p-3"
                  onClick={() => handleNavigation('/create-order')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="text-xs">발주 작성</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-12 p-3"
                  onClick={() => handleNavigation('/orders')}
                >
                  <Search className="h-4 w-4 mr-2" />
                  <span className="text-xs">발주 검색</span>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Menu Sections */}
            {getFilteredSections().map((section) => (
              <div key={section.title} className="space-y-2">
                {section.collapsible ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between p-2 h-auto text-xs font-medium text-gray-500 uppercase tracking-wider"
                    onClick={() => toggleSection(section.title)}
                  >
                    {section.title}
                    {expandedSections[section.title] ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                ) : (
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2">
                    {section.title}
                  </h3>
                )}

                {(!section.collapsible || expandedSections[section.title]) && (
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <Button
                        key={item.href}
                        variant={isCurrentPage(item.href) ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start h-auto p-3 text-left"
                        onClick={() => handleNavigation(item.href)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{item.name}</div>
                            {item.description && (
                              <div className="text-xs text-gray-500">{item.description}</div>
                            )}
                          </div>
                          {item.badge && (
                            <Badge variant="outline" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start"
              onClick={() => handleNavigation('/profile')}
            >
              <User className="h-4 w-4 mr-2" />
              프로필 설정
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MobileSidebar;