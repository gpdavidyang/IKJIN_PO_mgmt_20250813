import { FileText, Package, Users, Clock, Building, Plus, AlertCircle, BarChart3, TrendingUp, ShoppingCart, Activity, FolderTree, ChevronRight, DollarSign, ArrowUp, ArrowDown, Calendar, Eye, ChevronsUpDown, Send, Mail, Edit, History } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/use-enhanced-queries";
import { useEffect, useState, useMemo, useCallback } from "react";
import React from "react";
import { useTheme } from "@/components/ui/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { formatKoreanWon } from "@/lib/utils";
import { getStatusText } from "@/lib/statusUtils";
import { apiRequest } from "@/lib/queryClient";
import { EmailSendDialog } from "@/components/email-send-dialog";
import { EmailHistoryModal } from "@/components/email-history-modal";
import { EmailService } from "@/services/emailService";

// Import modals
import { MonthlyTrendModal } from "@/components/modals/monthly-trend-modal";
import { StatusDistributionModal } from "@/components/modals/status-distribution-modal";

// Import enhanced components
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

// Import chart components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from "recharts";

export default function DashboardProfessional() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { actualTheme } = useTheme();

  // Modal states
  const [isMonthlyTrendModalOpen, setIsMonthlyTrendModalOpen] = useState(false);
  const [isStatusDistributionModalOpen, setIsStatusDistributionModalOpen] = useState(false);
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Email history modal state
  const [emailHistoryModalOpen, setEmailHistoryModalOpen] = useState(false);
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<any>(null);
  

  // Check if dark mode is active - MEMOIZED to prevent recalculation
  const isDarkMode = useMemo(() => {
    return actualTheme === 'dark' && document.documentElement.classList.contains('dark');
  }, [actualTheme]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized", 
        description: "You are logged out. Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => {
        navigate("/login");
      }, 500);
      return;
    }
  }, [user, authLoading, navigate]); // Remove toast from dependencies to prevent re-renders

  // Unified dashboard API call - only fetch when authenticated
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboardData();
  
  // Extract data from unified response with fallbacks - MUST BE DEFINED BEFORE CALLBACKS
  const stats = dashboardData?.statistics || {};
  const recentOrders = dashboardData?.recentOrders || [];
  const monthlyStats = dashboardData?.monthlyStats || [];
  const statusStats = dashboardData?.statusStats || [];
  const orderStatusStats = dashboardData?.orderStatusStats || [];
  const projectStats = dashboardData?.projectStats || [];
  const categoryStats = dashboardData?.categoryStats || [];

  // Helper functions for email and status rendering (from orders-professional.tsx)
  const renderEmailStatus = (order: any) => {
    if (!order.emailStatus || order.totalEmailsSent === 0) {
      return (
        <span className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>미발송</span>
      );
    }

    if (order.emailStatus === 'sent') {
      return (
        <div className="flex items-center gap-1">
          <Send className="h-3 w-3" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }} />
          <span className="text-xs" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}>발송됨</span>
        </div>
      );
    }

    if (order.emailStatus === 'opened') {
      return (
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3" style={{ color: isDarkMode ? '#34d399' : '#059669' }} />
          <span className="text-xs" style={{ color: isDarkMode ? '#34d399' : '#059669' }}>열람됨</span>
        </div>
      );
    }

    return (
      <span className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>미발송</span>
    );
  };

  const getStatusColor = (status: string) => {
    if (isDarkMode) {
      switch (status) {
        case 'pending': return 'bg-yellow-900/30 text-yellow-300 border-yellow-600';
        case 'approved': return 'bg-green-900/30 text-green-300 border-green-600';
        case 'sent': return 'bg-blue-900/30 text-blue-300 border-blue-600';
        case 'completed': return 'bg-purple-900/30 text-purple-300 border-purple-600';
        case 'rejected': return 'bg-red-900/30 text-red-300 border-red-600';
        default: return 'bg-gray-700 text-gray-300 border-gray-600';
      }
    } else {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'approved': return 'bg-green-100 text-green-800 border-green-200';
        case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'completed': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
  };

  // Email handlers (from orders-professional.tsx) - MEMOIZED
  // NOW SAFE - recentOrders is defined above
  const handleEmailSend = useCallback((order: any) => {
    const fullOrder = recentOrders.find((o: any) => o.id === order.id);
    if (fullOrder) {
      setSelectedOrder(fullOrder);
      setEmailDialogOpen(true);
    }
  }, [recentOrders]);

  const handleSendEmail = useCallback(async (emailData: any) => {
    if (!selectedOrder) return;

    try {
      const orderData = {
        orderNumber: selectedOrder.orderNumber,
        vendorName: selectedOrder.vendor?.name || '',
        orderDate: selectedOrder.orderDate,
        totalAmount: selectedOrder.totalAmount,
        siteName: selectedOrder.project?.projectName || selectedOrder.project?.name,
        filePath: selectedOrder.filePath || ''
      };

      await EmailService.sendPurchaseOrderEmail(orderData, emailData);
      
      toast({
        title: "이메일 발송 완료",
        description: `${selectedOrder.vendor?.name}에게 발주서 ${selectedOrder.orderNumber}를 전송했습니다.`,
      });
    } catch (error) {
      toast({
        title: "이메일 발송 실패",
        description: error instanceof Error ? error.message : "이메일 발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  }, [selectedOrder, toast]);

  const handleViewEmailHistory = useCallback((order: any) => {
    const fullOrder = recentOrders.find((o: any) => o.id === order.id);
    if (fullOrder) {
      setSelectedOrderForHistory(fullOrder);
      setEmailHistoryModalOpen(true);
    }
  }, [recentOrders]);

  // PDF download handler - direct download like orders-professional-fast
  const handlePDFDownload = useCallback(async (order: any) => {
    try {
      // Fetch order details to get attachments
      console.log('Fetching order details for ID:', order.id);
      const response = await apiRequest('GET', `/api/orders/${order.id}`);
      
      console.log('API Response:', response);
      
      if (!response) {
        console.error('API returned no data for order:', order.id);
        toast({
          title: "데이터 오류",
          description: "발주서 정보를 가져올 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
      
      const orderData = response;
      
      if (!orderData.attachments || !Array.isArray(orderData.attachments)) {
        console.log('No attachments array in order data');
        toast({
          title: "PDF 파일이 없습니다",
          description: "발주서 상세에서 PDF를 생성해주세요.",
          variant: "destructive",
        });
        return;
      }
      
      const pdfAttachment = orderData.attachments.find(
        (att: any) => att.mimeType?.includes('pdf') || att.originalName?.toLowerCase().endsWith('.pdf')
      );
      
      if (pdfAttachment) {
        console.log('Found PDF attachment:', pdfAttachment);
        // PDF 다운로드 - 새 탭에서 열기
        const url = `/api/attachments/${pdfAttachment.id}/download`;
        window.open(url, '_blank');
        
        toast({
          title: "PDF 다운로드",
          description: `발주서 ${order.orderNumber}의 PDF를 다운로드합니다.`,
        });
      } else {
        console.log('No PDF attachment found in:', orderData.attachments);
        toast({
          title: "PDF 파일이 없습니다",
          description: "발주서 상세에서 PDF를 생성해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('PDF download error:', error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      toast({
        title: "다운로드 실패",
        description: `PDF 다운로드 중 오류가 발생했습니다: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [toast]);


  // Show loading while checking authentication
  if (authLoading) {
    return <DashboardSkeleton />;
  }

  // Redirect if not authenticated
  if (!user) {
    return <DashboardSkeleton />; // Show skeleton while redirecting
  }

  // Show loading while fetching dashboard data
  if (dashboardLoading) {
    return <DashboardSkeleton />;
  }

  // Professional color palette
  const colors = {
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryDark: '#2563EB',
    secondary: '#93C5FD',
    accent: '#DBEAFE',
    gray: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444'
  };

  // Transform monthly data for area chart with proper sorting and formatting
  const monthlyChartData = monthlyStats
    .sort((a: any, b: any) => a.month.localeCompare(b.month)) // Sort by YYYY-MM format
    .map((item: any) => {
      const [year, month] = item.month.split('-');
      const currentYear = new Date().getFullYear();
      const isCurrentYear = parseInt(year) === currentYear;
      
      return {
        month: isCurrentYear ? `${month}월` : `${year.substring(2)}.${month}`, // "08월" or "24.08" for different years
        fullMonth: item.month, // Keep full format for debugging
        발주건수: Number(item.count) || 0,
        금액백만원: Math.round(Number(item.amount || item.totalAmount) / 1000000) || 0 // Convert to millions
      };
    });

  // Define all expected order statuses with default values
  const allOrderStatuses = [
    { status: 'draft', name: '임시저장', color: colors.gray },
    { status: 'created', name: '발주생성', color: colors.warning },
    { status: 'sent', name: '발주완료', color: colors.primary },
    { status: 'completed', name: '납품검수완료', color: colors.primaryDark }
  ];
  
  // Create a map of existing status data
  const statusDataMap = new Map(
    orderStatusStats.map((item: any) => [item.status, Number(item.count) || 0])
  );
  
  // Order Status distribution for pie chart - ensure all statuses are present
  const orderStatusChartData = allOrderStatuses.map(statusDef => ({
    name: statusDef.name,
    value: statusDataMap.get(statusDef.status) || 0,
    color: statusDef.color,
    status: statusDef.status
  }));


  // Keep statusChartData for backward compatibility
  const statusChartData = orderStatusChartData;

  // REMOVED: Debug logging that caused infinite loops
  // All console.log statements removed to prevent render loops

  // 발주 상태 텍스트
  const getOrderStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'draft': '임시저장',
      'created': '발주생성',
      'sent': '발주완료',
      'delivered': '납품완료'
    };
    return statusMap[status] || status || '-';
  };

  // 승인 상태 텍스트
  const getApprovalStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'not_required': '승인불필요',
      'pending': '승인대기',
      'approved': '승인완료',
      'rejected': '반려'
    };
    return statusMap[status] || status || '-';
  };

  // 발주 상태 색상
  const getOrderStatusColor = (status: string) => {
    switch(status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50';
      case 'created': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400/50';
      case 'sent': return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/25 dark:text-indigo-200 dark:border-indigo-400/50';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-200 dark:border-green-400/50';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50';
    }
  };

  // 승인 상태 색상
  const getApprovalStatusColor = (status: string) => {
    switch(status) {
      case 'not_required': return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/25 dark:text-yellow-200 dark:border-yellow-400/50';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400/50';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/25 dark:text-red-200 dark:border-red-400/50';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-200 dark:border-gray-400/50';
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }}>
      {/* Fixed width container for consistent layout */}
      <div className="max-w-[1366px] mx-auto p-6">
        {/* Professional Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: isDarkMode ? '#f9fafb' : '#1f2937' }}>대시보드</h1>
              <p className="text-sm mt-1" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>실시간 발주 현황을 한눈에 확인하세요</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/create-order')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="h-5 w-5" />
                새 발주서
              </button>
              <div className="text-sm" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                마지막 업데이트: {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards - Professional Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Total Orders */}
          <div 
            className="rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>총 발주서</p>
                <p className="text-2xl font-bold mt-2" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>{stats.totalOrders || 0}</p>
                <div className="flex items-center mt-2 text-sm">
                  <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">12% 증가</span>
                </div>
              </div>
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.3)' : '#dbeafe' }}
              >
                <FileText className="h-6 w-6" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }} />
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div 
            className="rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>총 발주 금액</p>
                <p className="text-2xl font-bold mt-2" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}>
                  {formatKoreanWon(stats.totalAmount || 0)}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">8.5% 증가</span>
                </div>
              </div>
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.3)' : '#d1fae5' }}
              >
                <DollarSign className="h-6 w-6" style={{ color: isDarkMode ? '#34d399' : '#059669' }} />
              </div>
            </div>
          </div>

          {/* Completed Orders */}
          <div 
            className="rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" 
            style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
            onClick={() => navigate('/orders?status=completed')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>금월 발주완료</p>
                <p className="text-2xl font-bold mt-2" style={{ color: isDarkMode ? '#34d399' : '#059669' }}>{stats.completedOrders || 0}</p>
                <div className="flex items-center mt-2 text-sm">
                  <Package className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">처리 완료</span>
                </div>
              </div>
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.3)' : '#d1fae5' }}
              >
                <Package className="h-6 w-6" style={{ color: isDarkMode ? '#34d399' : '#059669' }} />
              </div>
            </div>
          </div>

          {/* Active Projects */}
          <div 
            className="rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}>활성 현장</p>
                <p className="text-2xl font-bold mt-2" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>{stats.activeProjects || 0}</p>
                <div className="flex items-center mt-2 text-sm">
                  <ArrowDown className="h-4 w-4 text-gray-400 mr-1" />
                  <span style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>변동 없음</span>
                </div>
              </div>
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: isDarkMode ? 'rgba(107, 33, 168, 0.3)' : '#ede9fe' }}
              >
                <Building className="h-6 w-6" style={{ color: isDarkMode ? '#a855f7' : '#7c3aed' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend - Area Chart */}
          <div 
            className="rounded-xl shadow-sm p-6"
            style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>월별 발주 추이</h3>
              <button 
                onClick={() => setIsMonthlyTrendModalOpen(true)}
                className="text-sm font-medium transition-colors hover:underline"
                style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = isDarkMode ? '#3b82f6' : '#1d4ed8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDarkMode ? '#60a5fa' : '#2563eb';
                }}
              >
                전체 보기
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#f0f0f0'} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: isDarkMode ? '#9CA3AF' : '#6B7280' }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: isDarkMode ? '#9CA3AF' : '#6B7280' }}
                    label={{ 
                      value: '발주 건수', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: '12px' }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f2937' : 'white', 
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      color: isDarkMode ? '#f9fafb' : '#1f2937'
                    }}
                    formatter={(value: any, name: string) => [`${value}건`, '발주 건수']}
                    labelFormatter={(label: string) => `${label} 발주 현황`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="발주건수" 
                    stroke={colors.primary} 
                    fillOpacity={1} 
                    fill="url(#colorAmount)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order Status Distribution - Modern Donut Chart */}
          <div 
            className="rounded-xl shadow-sm p-6"
            style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }} />
                <h3 className="text-lg font-semibold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>발주 상태 분포</h3>
              </div>
            </div>
            {orderStatusChartData && orderStatusChartData.length > 0 ? (
              <div className="h-64 flex items-center">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart width={200} height={200}>
                      <Pie
                        data={orderStatusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {orderStatusChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any) => [`${value}건`, name]}
                        contentStyle={{ 
                          backgroundColor: isDarkMode ? '#1f2937' : 'white', 
                          border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          color: isDarkMode ? '#f9fafb' : '#1f2937'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 pl-6">
                  {orderStatusChartData.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm font-medium" style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}>{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>{item.value}건</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-2" style={{ color: isDarkMode ? '#4b5563' : '#d1d5db' }} />
                  <p className="text-sm">발주 상태별 데이터가 없습니다.</p>
                  <p className="text-xs mt-1" style={{ color: isDarkMode ? '#6b7280' : '#9ca3af' }}>발주서를 생성하면 차트가 표시됩니다.</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Recent Orders Table */}
        <div 
          className="rounded-xl shadow-sm"
          style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
        >
          <div 
            className="p-6 border-b"
            style={{ borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>최근 발주 내역</h3>
              <button 
                onClick={() => navigate('/orders')}
                className="text-sm font-medium flex items-center gap-1 transition-colors"
                style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = isDarkMode ? '#3b82f6' : '#1d4ed8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDarkMode ? '#60a5fa' : '#2563eb';
                }}
              >
                전체 보기
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: isDarkMode ? '#374151' : '#f9fafb' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      발주번호
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      거래처
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      현장
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      발주일
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      등록일
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      금액
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      발주상태
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      승인상태
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>이메일</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>액션</th>
                </tr>
              </thead>
              <tbody 
                style={{ 
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                }}
              >
                {recentOrders.slice(0, 5).map((order: any) => (
                  <tr 
                    key={order.id} 
                    className="transition-colors"
                    style={{ 
                      backgroundColor: 'transparent',
                      borderBottom: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="transition-colors hover:underline"
                        style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = isDarkMode ? '#3b82f6' : '#1d4ed8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = isDarkMode ? '#60a5fa' : '#2563eb';
                        }}
                      >
                        {order.orderNumber}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.vendor?.id ? (
                        <button
                          onClick={() => navigate(`/vendors/${order.vendor.id}`)}
                          className="text-sm font-medium transition-colors hover:underline"
                          style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}
                          title="거래처 상세 정보 보기"
                        >
                          {order.vendor.name}
                        </button>
                      ) : (
                        <div className="text-sm" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>
                          {order.vendor?.name || '-'}
                        </div>
                      )}
                      {order.vendor?.email && (
                        <div className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                          {order.vendor.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.project?.id ? (
                        <button
                          onClick={() => navigate(`/projects/${order.project.id}`)}
                          className="text-sm font-medium transition-colors hover:underline"
                          style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}
                          title="현장 상세 정보 보기"
                        >
                          {order.project.projectName || order.project.name}
                        </button>
                      ) : (
                        <div className="text-sm" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>
                          {order.project?.projectName || order.project?.name || '-'}
                        </div>
                      )}
                      {order.project?.projectCode && (
                        <div className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                          {order.project.projectCode}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>
                      {order.orderDate ? new Date(order.orderDate).toLocaleDateString('ko-KR') : 
                       order.createdAt ? new Date(order.createdAt).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}>
                        {formatKoreanWon(order.totalAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getOrderStatusColor(order.orderStatus || 'draft')}`}>
                        {getOrderStatusText(order.orderStatus || 'draft')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getApprovalStatusColor(order.approvalStatus || 'not_required')}`}>
                        {getApprovalStatusText(order.approvalStatus || 'not_required')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderEmailStatus(order)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Always show detail view button */}
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="p-1.5 rounded-md transition-all duration-200"
                          style={{ 
                            color: isDarkMode ? '#60a5fa' : '#2563eb',
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = isDarkMode ? '#93c5fd' : '#1d4ed8';
                            e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = isDarkMode ? '#60a5fa' : '#2563eb';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="상세보기"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {/* Edit button - only for draft and created status */}
                        {(order.orderStatus === 'draft' || order.orderStatus === 'created' || 
                          (!order.orderStatus && order.status !== 'sent' && order.status !== 'delivered')) && (
                          <button
                            onClick={() => navigate(`/orders/${order.id}/edit`)}
                            className="p-1.5 rounded-md transition-all duration-200"
                            style={{ 
                              color: isDarkMode ? '#34d399' : '#059669',
                              backgroundColor: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = isDarkMode ? '#6ee7b7' : '#047857';
                              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(5, 150, 105, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = isDarkMode ? '#34d399' : '#059669';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="수정"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        
                        {/* PDF button - only for created, sent, delivered status */}
                        {(order.orderStatus === 'created' || order.orderStatus === 'sent' || order.orderStatus === 'delivered' ||
                          (!order.orderStatus && (order.status === 'approved' || order.status === 'sent' || order.status === 'completed'))) && (
                          <button
                            onClick={() => handlePDFDownload(order)}
                            className="p-1.5 rounded-md transition-all duration-200"
                            style={{ 
                              color: isDarkMode ? '#fb923c' : '#ea580c',
                              backgroundColor: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = isDarkMode ? '#fdba74' : '#c2410c';
                              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(249, 115, 22, 0.2)' : 'rgba(234, 88, 12, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = isDarkMode ? '#fb923c' : '#ea580c';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="PDF 다운로드"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        
                        {/* Email button - only for created status */}
                        {(order.orderStatus === 'created' || 
                          (!order.orderStatus && order.status === 'approved')) && (
                          <button
                            onClick={() => handleEmailSend(order)}
                            className="p-1.5 rounded-md transition-all duration-200"
                            style={{ 
                              color: isDarkMode ? '#a855f7' : '#7c3aed',
                              backgroundColor: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = isDarkMode ? '#c084fc' : '#6d28d9';
                              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(147, 51, 234, 0.2)' : 'rgba(124, 58, 237, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = isDarkMode ? '#a855f7' : '#7c3aed';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="이메일 전송"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        )}
                        
                        {/* Email history button - show if emails have been sent */}
                        {order.totalEmailsSent > 0 && (
                          <button
                            onClick={() => handleViewEmailHistory(order)}
                            className="p-1.5 rounded-md transition-all duration-200"
                            style={{ 
                              color: isDarkMode ? '#94a3b8' : '#64748b',
                              backgroundColor: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = isDarkMode ? '#cbd5e1' : '#475569';
                              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#64748b';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title={`이메일 이력 (${order.totalEmailsSent}건)`}
                          >
                            <History className="h-4 w-4" />
                          </button>
                        )}
                        
                        {/* Draft indicator */}
                        {order.orderStatus === 'draft' && (
                          <span 
                            className="text-xs px-2 py-1 rounded" 
                            style={{ 
                              color: isDarkMode ? '#fbbf24' : '#d97706',
                              backgroundColor: isDarkMode ? 'rgba(251, 191, 36, 0.1)' : 'rgba(217, 119, 6, 0.1)'
                            }}
                            title="임시저장 상태"
                          >
                            📝
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <button
            onClick={() => navigate('/orders?status=completed')}
            className="rounded-lg p-4 hover:shadow-md transition-shadow flex items-center gap-3 border"
            style={{ 
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              borderColor: isDarkMode ? '#374151' : '#e5e7eb'
            }}
          >
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.3)' : '#d1fae5' }}
            >
              <Package className="h-5 w-5" style={{ color: isDarkMode ? '#34d399' : '#059669' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>금월 발주완료</p>
              <p className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>{stats.completedOrders || 0}건 완료</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/vendors')}
            className="rounded-lg p-4 hover:shadow-md transition-shadow flex items-center gap-3 border"
            style={{ 
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              borderColor: isDarkMode ? '#374151' : '#e5e7eb'
            }}
          >
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.3)' : '#dbeafe' }}
            >
              <Users className="h-5 w-5" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>거래처 관리</p>
              <p className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>{stats.activeVendors || 0}개 활성</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/projects')}
            className="rounded-lg p-4 hover:shadow-md transition-shadow flex items-center gap-3 border"
            style={{ 
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              borderColor: isDarkMode ? '#374151' : '#e5e7eb'
            }}
          >
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: isDarkMode ? 'rgba(107, 33, 168, 0.3)' : '#ede9fe' }}
            >
              <Building className="h-5 w-5" style={{ color: isDarkMode ? '#a855f7' : '#7c3aed' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>현장 관리</p>
              <p className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>{stats.activeProjects || 0}개 진행중</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="rounded-lg p-4 hover:shadow-md transition-shadow flex items-center gap-3 border"
            style={{ 
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              borderColor: isDarkMode ? '#374151' : '#e5e7eb'
            }}
          >
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.3)' : '#d1fae5' }}
            >
              <BarChart3 className="h-5 w-5" style={{ color: isDarkMode ? '#34d399' : '#059669' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}>보고서 생성</p>
              <p className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>상세 분석</p>
            </div>
          </button>
        </div>

        {/* Modals */}
        <MonthlyTrendModal
          isOpen={isMonthlyTrendModalOpen}
          onClose={() => setIsMonthlyTrendModalOpen(false)}
          monthlyStats={monthlyStats}
          isDarkMode={isDarkMode}
        />

        <StatusDistributionModal
          isOpen={isStatusDistributionModalOpen}
          onClose={() => setIsStatusDistributionModalOpen(false)}
          statusStats={statusStats}
          isDarkMode={isDarkMode}
        />

        {/* Email Send Dialog */}
        {selectedOrder && (
          <EmailSendDialog
            open={emailDialogOpen}
            onOpenChange={setEmailDialogOpen}
            orderData={{
              orderNumber: selectedOrder.orderNumber,
              vendorName: selectedOrder.vendor?.name || '',
              vendorEmail: selectedOrder.vendor?.email,
              orderDate: new Date(selectedOrder.orderDate || selectedOrder.createdAt).toLocaleDateString(),
              totalAmount: selectedOrder.totalAmount,
              siteName: selectedOrder.project?.projectName || selectedOrder.project?.name
            }}
            onSendEmail={handleSendEmail}
          />
        )}

        {/* Email History Modal */}
        {selectedOrderForHistory && (
          <EmailHistoryModal
            orderId={selectedOrderForHistory.id}
            orderNumber={selectedOrderForHistory.orderNumber}
            isOpen={emailHistoryModalOpen}
            onClose={() => {
              setEmailHistoryModalOpen(false);
              setSelectedOrderForHistory(null);
            }}
          />
        )}

      </div>
    </div>
  );
}