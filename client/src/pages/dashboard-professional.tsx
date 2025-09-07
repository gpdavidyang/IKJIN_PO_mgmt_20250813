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
import { getEnhancedStatusColor, getOrderStatusText, getApprovalStatusText } from "@/lib/orderStatusUtils";
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

  // Show loading while checking authentication - MOVED TO TOP BEFORE HOOKS
  if (authLoading) {
    return <DashboardSkeleton />;
  }

  // Redirect if not authenticated - MOVED TO TOP BEFORE HOOKS
  if (!user) {
    return <DashboardSkeleton />; // Show skeleton while redirecting
  }

  // Modal states
  const [isMonthlyTrendModalOpen, setIsMonthlyTrendModalOpen] = useState(false);
  const [isStatusDistributionModalOpen, setIsStatusDistributionModalOpen] = useState(false);
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Email history modal state
  const [emailHistoryModalOpen, setEmailHistoryModalOpen] = useState(false);
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<any>(null);
  
  // Sorting state for recent orders table
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  

  // Check if dark mode is active - MEMOIZED to prevent recalculation
  const isDarkMode = useMemo(() => {
    return actualTheme === 'dark';
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
  
  // Show loading while fetching dashboard data - MOVED AFTER HOOKS
  if (dashboardLoading) {
    return <DashboardSkeleton />;
  }
  
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
      // Build attachment URLs from selectedAttachmentIds
      const attachmentUrls: string[] = [];
      if (emailData.selectedAttachmentIds && emailData.selectedAttachmentIds.length > 0) {
        for (const attachmentId of emailData.selectedAttachmentIds) {
          const attachmentUrl = `/api/attachments/${attachmentId}/download`;
          attachmentUrls.push(attachmentUrl);
        }
      }

      const orderData = {
        orderNumber: selectedOrder.orderNumber,
        vendorName: selectedOrder.vendor?.name || '',
        orderDate: selectedOrder.orderDate,
        totalAmount: selectedOrder.totalAmount,
        siteName: selectedOrder.project?.projectName || selectedOrder.project?.name,
        filePath: selectedOrder.filePath || '',
        attachmentUrls: attachmentUrls
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

  // PDF download handler - Professional PDF service with direct download
  const handlePDFDownload = useCallback(async (order: any) => {
    try {
      console.log('🔄 Professional PDF 다운로드 시작:', order.id);
      
      // 먼저 기존 PDF 첨부파일 확인
      const response = await apiRequest('GET', `/api/orders/${order.id}`);
      
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
      let pdfAttachment = null;
      
      // 기존 Professional PDF 찾기
      if (orderData.attachments && Array.isArray(orderData.attachments)) {
        pdfAttachment = orderData.attachments.find(
          (att: any) => (att.mimeType?.includes('pdf') || att.originalName?.toLowerCase().endsWith('.pdf')) &&
                       (att.originalName?.includes('Professional') || att.filePath?.includes('professional'))
        );
      }
      
      // Professional PDF가 없으면 새로 생성
      if (!pdfAttachment) {
        console.log('📄 Professional PDF 파일 없음, 새로 생성 중...');
        toast({
          title: "PDF 생성 중",
          description: "전문적인 발주서 PDF를 생성하고 있습니다...",
        });
        
        try {
          const pdfResponse = await apiRequest('POST', `/api/orders/${order.id}/generate-professional-pdf`);
          
          if (pdfResponse.success && pdfResponse.attachmentId) {
            console.log('✅ Professional PDF 생성 성공:', pdfResponse);
            pdfAttachment = { id: pdfResponse.attachmentId };
          } else {
            throw new Error(pdfResponse.error || 'PDF 생성 실패');
          }
        } catch (pdfError) {
          console.error('❌ Professional PDF 생성 실패:', pdfError);
          toast({
            title: "PDF 생성 실패",
            description: "전문적인 PDF 생성에 실패했습니다. 기본 PDF를 시도합니다.",
            variant: "destructive",
          });
          
          // 기본 PDF 찾기 시도
          if (orderData.attachments && Array.isArray(orderData.attachments)) {
            pdfAttachment = orderData.attachments.find(
              (att: any) => att.mimeType?.includes('pdf') || att.originalName?.toLowerCase().endsWith('.pdf')
            );
          }
        }
      }
      
      // PDF 다운로드 실행
      if (pdfAttachment) {
        console.log('📥 PDF 다운로드 시작:', pdfAttachment);
        
        // 브라우저 기본 다운로드 방식 사용
        const downloadUrl = `/api/attachments/${pdfAttachment.id}/download?download=true`;
        
        // 임시 링크 생성하여 다운로드
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `발주서_${order.orderNumber}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "PDF 다운로드",
          description: `발주서 ${order.orderNumber}의 전문적인 PDF를 다운로드합니다.`,
        });
      } else {
        console.log('❌ PDF 파일을 찾을 수 없음');
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
  const monthlyChartData = (Array.isArray(monthlyStats) ? monthlyStats : [])
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
    (Array.isArray(orderStatusStats) ? orderStatusStats : []).map((item: any) => [item.status, Number(item.count) || 0])
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

  // Sorting functions
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-3 w-3" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  // Sort recent orders based on current sort settings
  const sortedRecentOrders = useMemo(() => {
    if (!sortField) return recentOrders;
    
    return [...recentOrders].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle nested properties
      if (sortField === 'vendorName') {
        aValue = a.vendor?.name || '';
        bValue = b.vendor?.name || '';
      } else if (sortField === 'projectName') {
        aValue = a.project?.projectName || a.project?.name || '';
        bValue = b.project?.projectName || b.project?.name || '';
      } else if (sortField === 'totalAmount') {
        aValue = Number(a.totalAmount) || 0;
        bValue = Number(b.totalAmount) || 0;
      } else if (sortField === 'orderDate') {
        aValue = new Date(a.orderDate || a.createdAt).getTime();
        bValue = new Date(b.orderDate || b.createdAt).getTime();
      } else if (sortField === 'createdAt') {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  }, [recentOrders, sortField, sortDirection]);

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
                      onClick={() => handleSort('orderNumber')}
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      발주번호
                      {getSortIcon('orderNumber')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      onClick={() => handleSort('vendorName')}
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      거래처
                      {getSortIcon('vendorName')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      onClick={() => handleSort('projectName')}
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      현장
                      {getSortIcon('projectName')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      onClick={() => handleSort('orderDate')}
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      발주일
                      {getSortIcon('orderDate')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      onClick={() => handleSort('createdAt')}
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      등록일
                      {getSortIcon('createdAt')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      onClick={() => handleSort('totalAmount')}
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      금액
                      {getSortIcon('totalAmount')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      onClick={() => handleSort('orderStatus')}
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      발주상태
                      {getSortIcon('orderStatus')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      onClick={() => handleSort('emailStatus')}
                      className={`flex items-center gap-1 transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      이메일
                      {getSortIcon('emailStatus')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    <button 
                      onClick={() => handleSort('actions')}
                      className={`flex items-center gap-1 transition-colors justify-center ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`}
                    >
                      액션
                      {getSortIcon('actions')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody 
                style={{ 
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                }}
              >
                {sortedRecentOrders.slice(0, 5).map((order: any) => (
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEnhancedStatusColor(order.orderStatus || 'draft')}`}>
                        {getOrderStatusText(order.orderStatus || 'draft')}
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
              siteName: selectedOrder.project?.projectName || selectedOrder.project?.name,
              orderId: selectedOrder.id
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