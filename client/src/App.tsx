import React from "react";
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
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import OrderDetailStandard from "@/pages/order-detail-standard";
import OrderEdit from "@/pages/order-edit";
import OrderPreview from "@/pages/order-preview";
import CreateOrder from "@/pages/create-order";
import CreateExtrusionOrder from "@/pages/create-order-extrusion";
import CreatePanelOrder from "@/pages/create-order-panel";
import CreateAccessoriesOrder from "@/pages/create-order-accessories";
import CreateStandardOrder from "@/pages/create-order-standard";
import CreateStandardOrderRefactored from "@/pages/create-order-standard-refactored";
import CreateMaterialsOrder from "@/pages/create-order-materials";
import CreateOrderExcel from "@/pages/create-order-excel";
import Vendors from "@/pages/vendors";
import VendorDetail from "@/pages/vendor-detail";
import VendorEdit from "@/pages/vendor-edit";
import Items from "@/pages/items";
import ItemDetail from "@/pages/item-detail";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import ProjectEdit from "@/pages/project-edit";
import UserDetail from "@/pages/user-detail";
import Admin from "@/pages/admin";
import Users from "@/pages/users";
import UserManagement from "@/pages/user-management";
import Profile from "@/pages/profile";
import Reports from "@/pages/reports";
import TemplateManagement from "@/pages/template-management";
import TemplateEdit from "@/pages/template-edit";
import Positions from "@/pages/positions";
import Approvals from "@/pages/approvals";
import ExcelAutomationTest from "@/pages/excel-automation-test";

import NotFound from "@/pages/not-found";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

function Layout() {
  const { isCollapsed } = useSidebar();
  const [location] = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className={`transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <Header />
        <main>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/login" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/orders/new" component={CreateOrder} />
            <Route path="/orders/:id/preview" component={OrderPreview} />
            <Route path="/order-preview/:id" component={OrderPreview} />
            <Route path="/orders/:id/edit" component={OrderEdit} />
            <Route path="/orders/:id/standard" component={OrderDetailStandard} />
            <Route path="/orders/:id" component={OrderDetail} />
            <Route path="/orders" component={Orders} />
            <Route path="/create-order" component={CreateOrder} />
            <Route path="/create-order/extrusion" component={CreateExtrusionOrder} />
            <Route path="/create-order-extrusion" component={CreateExtrusionOrder} />
            <Route path="/create-order/panel" component={CreatePanelOrder} />
            <Route path="/create-order-panel" component={CreatePanelOrder} />
            <Route path="/create-order/accessories" component={CreateAccessoriesOrder} />
            <Route path="/create-order-accessories" component={CreateAccessoriesOrder} />
            <Route path="/create-order/standard" component={CreateStandardOrder} />
            <Route path="/create-order-standard" component={CreateStandardOrder} />
            <Route path="/create-order/standard-new" component={CreateStandardOrderRefactored} />
            <Route path="/create-order/materials" component={CreateMaterialsOrder} />
            <Route path="/create-order-materials" component={CreateMaterialsOrder} />
            <Route path="/create-order/excel" component={CreateOrderExcel} />
            <Route path="/vendors/:id/edit" component={VendorEdit} />
            <Route path="/vendors/:id" component={VendorDetail} />
            <Route path="/vendors" component={Vendors} />
            <Route path="/items/:id" component={ItemDetail} />
            <Route path="/items" component={Items} />
            <Route path="/projects/:id/edit" component={ProjectEdit} />
            <Route path="/projects/:id" component={ProjectDetail} />
            <Route path="/projects" component={Projects} />
            <Route path="/users/:id" component={UserDetail} />
            <Route path="/users" component={Users} />
            <Route path="/user-management" component={UserManagement} />
            <Route path="/admin" component={Admin} />
            <Route path="/profile" component={Profile} />
            <Route path="/reports" component={Reports} />
            <Route path="/templates/edit/:id" component={TemplateEdit} />
            <Route path="/templates/new" component={TemplateEdit} />
            <Route path="/templates" component={TemplateManagement} />
            <Route path="/template-management" component={TemplateManagement} />
            <Route path="/positions" component={Positions} />
            <Route path="/approvals" component={Approvals} />
            <Route path="/excel-automation-test" component={ExcelAutomationTest} />

            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();



  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
