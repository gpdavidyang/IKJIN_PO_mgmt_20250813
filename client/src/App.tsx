import React, { Suspense, lazy, useMemo } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import LoginPage from "@/pages/login";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
// Accessibility imports
import { AccessibilityProvider, AccessibilityToolbar } from "@/components/accessibility/accessibility-toolbar";
import { ContrastProvider } from "@/components/accessibility/high-contrast";
import { FocusProvider } from "@/components/accessibility/focus-management";
import "@/styles/accessibility.css";
// Performance monitoring
import { useThrottle } from "@/hooks/use-performance";
import { DashboardSkeleton } from "@/components/common/LazyWrapper";
// Query optimization - DISABLED to prevent infinite loops
// import { useAppInitialization, useCacheWarming } from "@/hooks/use-enhanced-queries";
import { QueryDevTools, useQueryDevTools } from "@/components/dev/query-devtools";

// Critical components (loaded immediately)
import NotFound from "@/pages/not-found";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";

// Import dynamic loading utilities
import {
  createLazyComponent,
  createNetworkAwareLazyComponent,
  initializeCriticalPreloading,
  preloadRouteComponents,
  logBundleInfo,
  DynamicFeatures
} from "@/utils/dynamic-imports";
import { initializeBundleMonitoring } from "@/utils/bundle-analyzer";

// Enhanced lazy load page components with error handling and retry
const Dashboard = createNetworkAwareLazyComponent(() => import("@/pages/dashboard-professional"), 'Dashboard');
const Orders = createLazyComponent(() => import("@/pages/orders-professional-fast"), 'Orders');
const OrderDetail = createLazyComponent(() => import("@/pages/order-detail-professional"), 'OrderDetail');
const OrderDetailStandard = createLazyComponent(() => import("@/pages/order-detail-standard"), 'OrderDetailStandard');
const OrderEdit = createLazyComponent(() => import("@/pages/order-edit"), 'OrderEdit');
const OrderPreview = createLazyComponent(() => import("@/pages/order-preview"), 'OrderPreview');
const CreateOrder = createNetworkAwareLazyComponent(() => import("@/pages/create-order"), 'CreateOrder');
// 사용하지 않는 발주서 생성 방법들 - 주석처리 (직접입력과 엑셀업로드만 사용)
// const CreateExtrusionOrder = createLazyComponent(() => import("@/pages/create-order-extrusion"), 'CreateExtrusionOrder');
// const CreatePanelOrder = createLazyComponent(() => import("@/pages/create-order-panel"), 'CreatePanelOrder');
// const CreateAccessoriesOrder = createLazyComponent(() => import("@/pages/create-order-accessories"), 'CreateAccessoriesOrder');
const CategoryManagement = createLazyComponent(() => import("@/pages/category-management"), 'CategoryManagement');
// const CreateStandardOrder = createLazyComponent(() => import("@/pages/create-order-standard-professional"), 'CreateStandardOrder');
// const CreateStandardOrderRefactored = createLazyComponent(() => import("@/pages/create-order-standard-refactored"), 'CreateStandardOrderRefactored');
// const CreateMaterialsOrder = createLazyComponent(() => import("@/pages/create-order-materials"), 'CreateMaterialsOrder');
const CreateOrderExcel = createLazyComponent(() => DynamicFeatures.loadExcelPage(), 'CreateOrderExcel');
// const CreateOrderSimple = createLazyComponent(() => import("@/pages/create-order-simple"), 'CreateOrderSimple');
// const CreateOrderUnified = createLazyComponent(() => import("@/pages/create-order-unified"), 'CreateOrderUnified');
// const CreateOrderUnifiedV2 = createLazyComponent(() => import("@/pages/create-order-unified-v2"), 'CreateOrderUnifiedV2');
const Vendors = createNetworkAwareLazyComponent(() => DynamicFeatures.loadVendorList(), 'Vendors');
const VendorDetail = createLazyComponent(() => DynamicFeatures.loadVendorDetail(), 'VendorDetail');
const VendorEdit = createLazyComponent(() => import("@/pages/vendor-edit"), 'VendorEdit');
const Items = createLazyComponent(() => import("@/pages/items"), 'Items');
const ItemDetail = createLazyComponent(() => import("@/pages/item-detail"), 'ItemDetail');
const Projects = createNetworkAwareLazyComponent(() => DynamicFeatures.loadProjectList(), 'Projects');
const ProjectDetail = createLazyComponent(() => DynamicFeatures.loadProjectDetail(), 'ProjectDetail');
const ProjectEdit = createLazyComponent(() => import("@/pages/project-edit"), 'ProjectEdit');
const UserDetail = createLazyComponent(() => import("@/pages/user-detail"), 'UserDetail');
const Admin = createLazyComponent(() => import("@/pages/admin"), 'Admin');
const Users = createLazyComponent(() => import("@/pages/users"), 'Users');
const UserManagement = createLazyComponent(() => DynamicFeatures.loadUserManagement(), 'UserManagement');
const Profile = createLazyComponent(() => import("@/pages/profile"), 'Profile');
const Reports = createLazyComponent(() => import("@/pages/reports"), 'Reports');
const TemplateManagement = createNetworkAwareLazyComponent(() => DynamicFeatures.loadTemplateManagement(), 'TemplateManagement');
const TemplateEdit = createLazyComponent(() => import("@/pages/template-edit"), 'TemplateEdit');
const Positions = createLazyComponent(() => import("@/pages/positions"), 'Positions');
const Approvals = createLazyComponent(() => import("@/pages/approvals"), 'Approvals');
const ApprovalAuthorities = createLazyComponent(() => import("@/pages/approval-authorities"), 'ApprovalAuthorities');
const ExcelAutomationTest = createLazyComponent(() => import("@/pages/excel-automation-test"), 'ExcelAutomationTest');
const ImportExport = createLazyComponent(() => import("@/pages/import-export"), 'ImportExport');
const AuditManagement = createLazyComponent(() => import("@/pages/audit-management"), 'AuditManagement');
const AccessibilityExample = createLazyComponent(
  () => import("@/components/examples/accessibility-example").then(module => ({
    default: module.AccessibilityExample
  })),
  'AccessibilityExample'
);
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { WebSocketProvider } from "@/contexts/websocket-context";

// Loading fallback components for different page types
function DashboardLoadingFallback() {
  return <DashboardSkeleton />;
}

function PageLoadingFallback() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function FormLoadingFallback() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        ))}
        <div className="flex gap-2 pt-4">
          <div className="h-10 w-20 bg-muted rounded animate-pulse" />
          <div className="h-10 w-20 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const Layout = React.memo(function Layout() {
  const [location] = useLocation();
  const { isCollapsed } = useSidebar();
  
  // Performance monitoring - DISABLED to prevent infinite loops
  // These hooks were causing excessive re-renders in production
  // usePerformanceMonitor('Layout');
  // useBundleAnalytics();
  // const pageMetrics = usePageLoadMetrics();
  
  // DISABLED: Query optimization causing infinite loops
  // const { user, isInitialized } = useAppInitialization();
  // const { warmEssentialData, warmUserSpecificData } = useCacheWarming();
  const showQueryDevTools = useQueryDevTools();
  
  // Use direct auth hook instead
  const { user, isAuthenticated } = useAuth();
  const isInitialized = isAuthenticated;
  
  // EMERGENCY FIX: Stabilize user ID with deeper memoization
  const userId = useMemo(() => {
    return user && 'id' in user && typeof user.id === 'number' ? user.id : null;
  }, [user?.id]); // More specific dependency to prevent recreation
  
  // REMOVED: Cache warming causing ReferenceError
  // const throttledWarmEssentialData = useThrottle(warmEssentialData, 5000);
  // const throttledWarmUserData = useThrottle(warmUserSpecificData, 5000);
  
  // REMOVED: Cache warming useEffect causing infinite loops
  // useEffect(() => {
  //   throttledWarmEssentialData();
  //   
  //   // Warm user-specific data when user is authenticated
  //   if (userId) {
  //     throttledWarmUserData(userId);
  //   }
  // }, [throttledWarmEssentialData, throttledWarmUserData, userId]);
  
  // EMERGENCY FIX: Disable route preloading to prevent infinite loops
  // The throttledPreloadRoute was causing unstable dependencies
  // const throttledPreloadRoute = useThrottle(preloadRouteComponents, 1000);
  
  // Route-based preloading DISABLED to prevent infinite loops
  // useEffect(() => {
  //   throttledPreloadRoute(location);
  // }, [location, throttledPreloadRoute]);
  
  // Memoize sidebar classes to prevent recalculation
  const sidebarClasses = useMemo(() => cn(
    "transition-all duration-300 sidebar-transition",
    isCollapsed ? "xl:ml-16" : "xl:ml-64"
  ), [isCollapsed]);
  
  // Development logging - DISABLED to prevent render loops
  // All performance monitoring and logging disabled to prevent infinite loops
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hidden">
        <AccessibilityToolbar />
      </div>
      <Sidebar />
      <div className={sidebarClasses}>
        <Header />
        <main id="main-content">
          <Suspense fallback={<DashboardLoadingFallback />}>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/login" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              
              {/* Order Routes */}
              <Route path="/orders/new">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateOrder />
                </Suspense>
              </Route>
              <Route path="/orders/:id/preview">
                <Suspense fallback={<PageLoadingFallback />}>
                  <OrderPreview />
                </Suspense>
              </Route>
              <Route path="/order-preview/:id">
                <Suspense fallback={<PageLoadingFallback />}>
                  <OrderPreview />
                </Suspense>
              </Route>
              <Route path="/orders/:id/edit">
                <Suspense fallback={<FormLoadingFallback />}>
                  <OrderEdit />
                </Suspense>
              </Route>
              <Route path="/orders/:id/standard">
                <Suspense fallback={<PageLoadingFallback />}>
                  <OrderDetailStandard />
                </Suspense>
              </Route>
              <Route path="/orders/:id">
                <Suspense fallback={<PageLoadingFallback />}>
                  <OrderDetail />
                </Suspense>
              </Route>
              <Route path="/orders">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Orders />
                </Suspense>
              </Route>
              
              {/* Create Order Routes */}
              <Route path="/create-order">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateOrder />
                </Suspense>
              </Route>
              {/* 사용하지 않는 발주서 생성 라우트들 - 주석처리 (직접입력과 엑셀업로드만 사용) */}
              {/* <Route path="/create-order/extrusion">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateExtrusionOrder />
                </Suspense>
              </Route>
              <Route path="/create-order-extrusion">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateExtrusionOrder />
                </Suspense>
              </Route>
              <Route path="/create-order/panel">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreatePanelOrder />
                </Suspense>
              </Route>
              <Route path="/create-order-panel">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreatePanelOrder />
                </Suspense>
              </Route>
              <Route path="/create-order/accessories">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateAccessoriesOrder />
                </Suspense>
              </Route>
              <Route path="/create-order-accessories">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateAccessoriesOrder />
                </Suspense>
              </Route>
              <Route path="/create-order/standard">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateStandardOrder />
                </Suspense>
              </Route>
              <Route path="/create-order-standard">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateStandardOrder />
                </Suspense>
              </Route>
              <Route path="/create-order/standard-new">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateStandardOrderRefactored />
                </Suspense>
              </Route>
              <Route path="/create-order/materials">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateMaterialsOrder />
                </Suspense>
              </Route>
              <Route path="/create-order-materials">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateMaterialsOrder />
                </Suspense>
              </Route> */}
              <Route path="/create-order/excel">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateOrderExcel />
                </Suspense>
              </Route>
              {/* <Route path="/create-order/simple">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateOrderSimple />
                </Suspense>
              </Route>
              <Route path="/create-order/unified">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateOrderUnified />
                </Suspense>
              </Route>
              <Route path="/create-order/unified-v2">
                <Suspense fallback={<FormLoadingFallback />}>
                  <CreateOrderUnifiedV2 />
                </Suspense>
              </Route> */}
              
              {/* Vendor Routes */}
              <Route path="/vendors/:id/edit">
                <Suspense fallback={<FormLoadingFallback />}>
                  <VendorEdit />
                </Suspense>
              </Route>
              <Route path="/vendors/:id">
                <Suspense fallback={<PageLoadingFallback />}>
                  <VendorDetail />
                </Suspense>
              </Route>
              <Route path="/vendors">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Vendors />
                </Suspense>
              </Route>
              
              {/* Category Management Route */}
              <Route path="/category-management">
                <Suspense fallback={<PageLoadingFallback />}>
                  <CategoryManagement />
                </Suspense>
              </Route>
              
              {/* Other Routes */}
              {/* PRD 요구사항: 품목 관리 UI는 숨김 처리 (소스코드는 유지, Excel 템플릿 기반 품목 관리) */}
              {/* <Route path="/items/:id">
                <Suspense fallback={<PageLoadingFallback />}>
                  <ItemDetail />
                </Suspense>
              </Route>
              <Route path="/items">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Items />
                </Suspense>
              </Route> */}
              <Route path="/projects/:id/edit">
                <Suspense fallback={<FormLoadingFallback />}>
                  <ProjectEdit />
                </Suspense>
              </Route>
              <Route path="/projects/:id">
                <Suspense fallback={<PageLoadingFallback />}>
                  <ProjectDetail />
                </Suspense>
              </Route>
              <Route path="/projects">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Projects />
                </Suspense>
              </Route>
              <Route path="/users/:id">
                <Suspense fallback={<PageLoadingFallback />}>
                  <UserDetail />
                </Suspense>
              </Route>
              <Route path="/users">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Users />
                </Suspense>
              </Route>
              <Route path="/user-management">
                <Suspense fallback={<PageLoadingFallback />}>
                  <UserManagement />
                </Suspense>
              </Route>
              <Route path="/admin">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Admin />
                </Suspense>
              </Route>
              <Route path="/profile">
                <Suspense fallback={<FormLoadingFallback />}>
                  <Profile />
                </Suspense>
              </Route>
              <Route path="/reports">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Reports />
                </Suspense>
              </Route>
              <Route path="/templates/edit/:id">
                <AdminRoute>
                  <Suspense fallback={<FormLoadingFallback />}>
                    <TemplateEdit />
                  </Suspense>
                </AdminRoute>
              </Route>
              <Route path="/templates/new">
                <AdminRoute>
                  <Suspense fallback={<FormLoadingFallback />}>
                    <TemplateEdit />
                  </Suspense>
                </AdminRoute>
              </Route>
              <Route path="/templates">
                <AdminRoute>
                  <Suspense fallback={<PageLoadingFallback />}>
                    <TemplateManagement />
                  </Suspense>
                </AdminRoute>
              </Route>
              <Route path="/template-management">
                <AdminRoute>
                  <Suspense fallback={<PageLoadingFallback />}>
                    <TemplateManagement />
                  </Suspense>
                </AdminRoute>
              </Route>
              <Route path="/positions">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Positions />
                </Suspense>
              </Route>
              <Route path="/approvals">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Approvals />
                </Suspense>
              </Route>
              <AdminRoute path="/approval-authorities">
                <Suspense fallback={<PageLoadingFallback />}>
                  <ApprovalAuthorities />
                </Suspense>
              </AdminRoute>
              <Route path="/excel-automation-test">
                <Suspense fallback={<PageLoadingFallback />}>
                  <ExcelAutomationTest />
                </Suspense>
              </Route>
              <Route path="/import-export">
                <Suspense fallback={<PageLoadingFallback />}>
                  <ImportExport />
                </Suspense>
              </Route>
              <Route path="/audit-management">
                <AdminRoute>
                  <Suspense fallback={<PageLoadingFallback />}>
                    <AuditManagement />
                  </Suspense>
                </AdminRoute>
              </Route>
              <Route path="/accessibility-example">
                <Suspense fallback={<PageLoadingFallback />}>
                  <AccessibilityExample />
                </Suspense>
              </Route>

              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </main>
      </div>
      
      {/* Query DevTools for development */}
      {showQueryDevTools && <QueryDevTools />}
    </div>
  );
});

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();



  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로그인 상태를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // For unauthenticated users, always show login page
  if (!user) {
    return <LoginPage />;
  }

  // For authenticated users on login/root, redirect to dashboard
  if (location === '/login' || location === '/') {
    return (
      <SidebarProvider>
        <Layout />
      </SidebarProvider>
    );
  }

  // For authenticated users on other routes, show the main application
  return (
    <SidebarProvider>
      <Layout />
    </SidebarProvider>
  );
}

function App() {
  // Initialize critical component preloading and bundle monitoring
  useEffect(() => {
    initializeCriticalPreloading();
    initializeBundleMonitoring();
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <AccessibilityProvider>
            <ContrastProvider>
              <FocusProvider>
                <TooltipProvider>
                  <Toaster />
                  <Router />
                </TooltipProvider>
              </FocusProvider>
            </ContrastProvider>
          </AccessibilityProvider>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
