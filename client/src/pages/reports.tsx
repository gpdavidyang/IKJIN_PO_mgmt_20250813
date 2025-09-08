import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTheme } from "@/components/ui/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import ReportPreview from "@/components/report-preview";
import { formatKoreanWon } from "@/lib/formatters";
import { CategoryHierarchyFilter } from "@/components/category-hierarchy-filter";
import { 
  Calendar, 
  TrendingUp, 
  Package, 
  Clock, 
  DollarSign, 
  FileDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  FileText,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  Download,
  Eye,
  Mail
} from "lucide-react";

export default function Reports() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // 리포트 타입 상태
  const [reportType, setReportType] = useState<'orders' | 'category' | 'project' | 'vendor' | 'email'>('orders');
  const [categoryType, setCategoryType] = useState<'major' | 'middle' | 'minor'>('major');
  
  // 계층적 카테고리 필터 상태
  const [categoryFilters, setCategoryFilters] = useState({
    majorCategory: 'all',
    middleCategory: 'all',
    minorCategory: 'all'
  });

  // 필터 상태
  const [filters, setFilters] = useState({
    year: 'all',
    startDate: '',
    endDate: '',
    vendorId: 'all',
    status: 'all',
    templateId: 'all',
    amountRange: 'all',
    userId: 'all',
    search: '',
    month: 'all',
    projectId: 'all'
  });

  const [activeFilters, setActiveFilters] = useState<typeof filters | null>(null);

  // 정렬 상태 (현장별 보고서용)
  const [projectSortConfig, setProjectSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // 정렬 상태 (거래처별 보고서용)
  const [vendorSortConfig, setVendorSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // 선택된 항목 상태 (발주 내역용)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  
  // 선택된 항목 상태 (분류별 보고서용)
  const [selectedCategoryItems, setSelectedCategoryItems] = useState<Set<string>>(new Set());
  
  // 선택된 항목 상태 (현장별 보고서용)
  const [selectedProjectItems, setSelectedProjectItems] = useState<Set<number>>(new Set());
  
  // 선택된 항목 상태 (거래처별 보고서용)
  const [selectedVendorItems, setSelectedVendorItems] = useState<Set<number>>(new Set());

  // 보고서 생성 모달 상태
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewOrders, setPreviewOrders] = useState<any[]>([]);
  const [reportConfig, setReportConfig] = useState({
    title: '',
    includeCharts: {
      statusDistribution: true,
      monthlyTrend: true,
      vendorAnalysis: true,
      amountAnalysis: false
    },
    chartTypes: {
      statusDistribution: 'pie',
      monthlyTrend: 'bar',
      vendorAnalysis: 'bar',
      amountAnalysis: 'bar'
    },
    summary: '',
    insights: '',
    comments: ''
  });

  // 정렬 상태
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // 현장별 보고서 정렬 함수
  const handleProjectSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (projectSortConfig && projectSortConfig.key === key && projectSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setProjectSortConfig({ key, direction });
  };

  // 현장별 보고서 정렬된 데이터 가져오기
  const getSortedProjectData = (data: any[]) => {
    if (!projectSortConfig || !data) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[projectSortConfig.key];
      let bValue = b[projectSortConfig.key];
      
      // 숫자 필드 처리
      if (['orderCount', 'vendorCount', 'totalAmount', 'averageOrderAmount'].includes(projectSortConfig.key)) {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      // 문자열 필드 처리 
      else if (['projectName', 'projectCode', 'projectStatus'].includes(projectSortConfig.key)) {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }
      
      if (aValue < bValue) {
        return projectSortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return projectSortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // 정렬 아이콘 렌더링 함수
  const renderProjectSortIcon = (key: string) => {
    if (!projectSortConfig || projectSortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return projectSortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  // 거래처별 보고서 정렬 함수
  const handleVendorSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (vendorSortConfig && vendorSortConfig.key === key && vendorSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setVendorSortConfig({ key, direction });
  };

  // 거래처별 보고서 정렬된 데이터 가져오기
  const getSortedVendorData = (data: any[]) => {
    if (!vendorSortConfig || !data) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[vendorSortConfig.key];
      let bValue = b[vendorSortConfig.key];
      
      // 숫자 필드 처리
      if (['orderCount', 'projectCount', 'totalAmount', 'averageOrderAmount'].includes(vendorSortConfig.key)) {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      // 문자열 필드 처리 
      else if (['vendorName', 'vendorCode', 'businessNumber'].includes(vendorSortConfig.key)) {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }
      
      if (aValue < bValue) {
        return vendorSortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return vendorSortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // 거래처별 보고서 정렬 아이콘 렌더링 함수
  const renderVendorSortIcon = (key: string) => {
    if (!vendorSortConfig || vendorSortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return vendorSortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  // 정렬 함수
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 정렬된 데이터 가져오기
  const getSortedData = (data: any[]) => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // 특별한 경우 처리
      if (sortConfig.key === 'vendor') {
        aValue = a.vendor?.name || '';
        bValue = b.vendor?.name || '';
      } else if (sortConfig.key === 'user') {
        aValue = a.user ? `${a.user.lastName || ''} ${a.user.firstName || ''}`.trim() : '';
        bValue = b.user ? `${b.user.lastName || ''} ${b.user.firstName || ''}`.trim() : '';
      } else if (sortConfig.key === 'orderDate') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else if (sortConfig.key === 'totalAmount') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // 정렬 아이콘 렌더링
  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  // 체크박스 관련 함수들
  const handleSelectAll = (checked: boolean, orders: any[]) => {
    if (checked) {
      const allIds = new Set(orders.map(order => order.id));
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (orderId: number, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedItems(newSelected);
  };

  const isAllSelected = (orders: any[]) => {
    return orders.length > 0 && orders.every(order => selectedItems.has(order.id));
  };

  const isIndeterminate = (orders: any[]) => {
    const selectedCount = orders.filter(order => selectedItems.has(order.id)).length;
    return selectedCount > 0 && selectedCount < orders.length;
  };

  // 보고서 생성 관련 함수들
  const handleReportGeneration = () => {
    const selectedOrders = processingReport?.orders?.filter((order: any) => selectedItems.has(order.id)) || [];
    const defaultTitle = `발주 현황 보고서 (${selectedOrders.length}건) - ${new Date().toLocaleDateString('ko-KR')}`;
    
    setReportConfig(prev => ({
      ...prev,
      title: defaultTitle,
      summary: generateAutoSummary(selectedOrders)
    }));
    
    setIsReportModalOpen(true);
  };

  const generateAutoSummary = (orders: any[]) => {
    if (orders.length === 0) return '';
    
    const totalAmount = orders.reduce((sum, order) => {
      const amount = parseFloat(order.totalAmount) || 0;
      return sum + amount;
    }, 0);
    const avgAmount = totalAmount / orders.length;
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topVendors = Object.entries(
      orders.reduce((acc, order) => {
        const vendorName = order.vendor?.name || '알 수 없음';
        acc[vendorName] = (acc[vendorName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort(([,a], [,b]) => (b as number) - (a as number)).slice(0, 3);

    // 상태를 한국어로 변환
    const getStatusKorean = (status: string) => {
      switch (status) {
        case 'draft': return '임시 저장';
        case 'pending': return '승인 대기';
        case 'approved': return '승인 완료';
        case 'sent': return '발주완료';
        case 'completed': return '발주 완료';
        case 'rejected': return '반려';
        default: return status;
      }
    };

    return `총 ${orders.length}건의 발주 데이터를 분석한 결과:
• 총 발주 금액: ₩${Math.floor(totalAmount).toLocaleString()}
• 평균 발주 금액: ₩${Math.floor(avgAmount).toLocaleString()}
• 주요 거래처: ${topVendors.map(([name, count]) => `${name}(${count}건)`).join(', ')}
• 상태 분포: ${Object.entries(statusCounts).map(([status, count]) => `${getStatusKorean(status)}(${count}건)`).join(', ')}`;
  };

  const handleGenerateReport = async () => {
    try {
      // 선택된 발주 데이터 설정
      const selectedOrders = processingReport?.orders?.filter((order: any) => selectedItems.has(order.id)) || [];
      setPreviewOrders(selectedOrders);
      
      setIsReportModalOpen(false);
      setShowPreview(true);
    } catch (error) {
      toast({
        title: "오류",
        description: "보고서 생성에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 분류별 보고서 생성 함수
  const handleCategoryReportGeneration = () => {
    const selectedCategories = categoryReport?.data?.filter((item: any, index: number) => 
      selectedCategoryItems.has(index)) || [];
    const defaultTitle = `분류별 분석 보고서 (${selectedCategories.length}개 분류) - ${new Date().toLocaleDateString('ko-KR')}`;
    
    // 분류 데이터를 발주 형태로 변환
    const transformedOrders = selectedCategories.map((category: any, index: number) => ({
      id: `category_${index}`,
      orderDate: new Date().toISOString(),
      vendor: { name: '다양한 거래처' },
      vendorName: '다양한 거래처',
      totalAmount: category.totalAmount || 0,
      status: 'completed',
      items: [{
        itemName: category.category,
        quantity: category.totalQuantity || 0
      }]
    }));
    
    setReportConfig(prev => ({
      ...prev,
      title: defaultTitle,
      summary: generateCategorySummary(selectedCategories)
    }));
    
    setPreviewOrders(transformedOrders);
    setIsReportModalOpen(true);
  };

  // 현장별 보고서 생성 함수  
  const handleProjectReportGeneration = () => {
    const selectedProjects = projectReport?.data?.filter((item: any) => 
      selectedProjectItems.has(item.projectId)) || [];
    const defaultTitle = `현장별 분석 보고서 (${selectedProjects.length}개 현장) - ${new Date().toLocaleDateString('ko-KR')}`;
    
    // 현장 데이터를 발주 형태로 변환
    const transformedOrders = selectedProjects.map((project: any) => ({
      id: `project_${project.projectId}`,
      orderDate: new Date().toISOString(),
      vendor: { name: '다양한 거래처' },
      vendorName: '다양한 거래처',
      totalAmount: project.totalAmount || 0,
      status: project.projectStatus || 'active',
      items: [{
        itemName: `${project.projectName} 관련 품목`,
        quantity: project.orderCount || 0
      }]
    }));
    
    setReportConfig(prev => ({
      ...prev,
      title: defaultTitle,
      summary: generateProjectSummary(selectedProjects)
    }));
    
    setPreviewOrders(transformedOrders);
    setIsReportModalOpen(true);
  };

  // 거래처별 보고서 생성 함수
  const handleVendorReportGeneration = () => {
    const selectedVendors = vendorReport?.data?.filter((item: any) => 
      selectedVendorItems.has(item.vendorId)) || [];
    const defaultTitle = `거래처별 분석 보고서 (${selectedVendors.length}개 거래처) - ${new Date().toLocaleDateString('ko-KR')}`;
    
    // 거래처 데이터를 발주 형태로 변환 (거래처별 분석에 핵심!)
    const transformedOrders = selectedVendors.map((vendor: any) => ({
      id: `vendor_${vendor.vendorId}`,
      orderDate: new Date().toISOString(),
      vendor: { name: vendor.vendorName },
      vendorName: vendor.vendorName,
      totalAmount: vendor.totalAmount || 0,
      status: 'completed',
      items: [{
        itemName: `${vendor.vendorName} 발주 품목`,
        quantity: vendor.orderCount || 0
      }]
    }));
    
    setReportConfig(prev => ({
      ...prev,
      title: defaultTitle,
      summary: generateVendorSummary(selectedVendors)
    }));
    
    setPreviewOrders(transformedOrders);
    setIsReportModalOpen(true);
  };

  // 분류별 보고서 요약 생성
  const generateCategorySummary = (categories: any[]) => {
    if (categories.length === 0) return '';
    
    const totalAmount = categories.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);
    const totalItems = categories.reduce((sum, item) => sum + (parseInt(item.itemCount) || 0), 0);
    const totalOrders = categories.reduce((sum, item) => sum + (parseInt(item.orderCount) || 0), 0);
    
    const topCategory = categories.reduce((max, item) => 
      (parseFloat(item.totalAmount) || 0) > (parseFloat(max.totalAmount) || 0) ? item : max);
      
    return `총 ${categories.length}개 분류 분석 결과:
• 총 발주 금액: ₩${Math.floor(totalAmount).toLocaleString()}
• 총 품목 수: ${totalItems.toLocaleString()}개
• 총 발주 수: ${totalOrders.toLocaleString()}건
• 최대 금액 분류: ${topCategory.category} (₩${Math.floor(topCategory.totalAmount).toLocaleString()})`;
  };

  // 현장별 보고서 요약 생성
  const generateProjectSummary = (projects: any[]) => {
    if (projects.length === 0) return '';
    
    const totalAmount = projects.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);
    const totalVendors = projects.reduce((sum, item) => sum + (parseInt(item.vendorCount) || 0), 0);
    const totalOrders = projects.reduce((sum, item) => sum + (parseInt(item.orderCount) || 0), 0);
    
    const topProject = projects.reduce((max, item) => 
      (parseFloat(item.totalAmount) || 0) > (parseFloat(max.totalAmount) || 0) ? item : max);
      
    return `총 ${projects.length}개 현장 분석 결과:
• 총 발주 금액: ₩${Math.floor(totalAmount).toLocaleString()}
• 총 거래처 수: ${totalVendors.toLocaleString()}개
• 총 발주 수: ${totalOrders.toLocaleString()}건
• 최대 금액 현장: ${topProject.projectName} (₩${Math.floor(topProject.totalAmount).toLocaleString()})`;
  };

  // 거래처별 보고서 요약 생성
  const generateVendorSummary = (vendors: any[]) => {
    if (vendors.length === 0) return '';
    
    const totalAmount = vendors.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);
    const totalProjects = vendors.reduce((sum, item) => sum + (parseInt(item.projectCount) || 0), 0);
    const totalOrders = vendors.reduce((sum, item) => sum + (parseInt(item.orderCount) || 0), 0);
    
    const topVendor = vendors.reduce((max, item) => 
      (parseFloat(item.totalAmount) || 0) > (parseFloat(max.totalAmount) || 0) ? item : max);
      
    return `총 ${vendors.length}개 거래처 분석 결과:
• 총 발주 금액: ₩${Math.floor(totalAmount).toLocaleString()}
• 총 프로젝트 수: ${totalProjects.toLocaleString()}개
• 총 발주 수: ${totalOrders.toLocaleString()}건
• 최대 금액 거래처: ${topVendor.vendorName} (₩${Math.floor(topVendor.totalAmount).toLocaleString()})`;
  };

  // 페이지 보호 - 인증되지 않은 사용자 처리
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "권한 없음",
        description: "로그아웃되었습니다. 다시 로그인합니다...",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/login");
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // 거래처 목록
  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
    enabled: isAuthenticated,
  });

  // 발주 템플릿 목록 - 현재 사용하지 않음
  // const { data: templates } = useQuery({
  //   queryKey: ["/api/order-templates"],
  //   enabled: isAuthenticated,
  // });

  // 사용자 목록
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  // 보고서 데이터 쿼리
  const { data: processingReport, isLoading: processingLoading } = useQuery({
    queryKey: ["/api/reports/processing", activeFilters],
    queryFn: async () => {
      if (!activeFilters) {
        return { orders: [], total: 0 };
      }
      
      const params = new URLSearchParams();
      
      // Only add year if it's not 'all'
      if (activeFilters.year && activeFilters.year !== 'all') {
        params.append('year', activeFilters.year);
      }
      if (activeFilters.startDate) {
        params.append('startDate', activeFilters.startDate);
      }
      if (activeFilters.endDate) {
        params.append('endDate', activeFilters.endDate);
      }
      if (activeFilters.vendorId && activeFilters.vendorId !== 'all') {
        params.append('vendorId', activeFilters.vendorId);
      }
      if (activeFilters.status && activeFilters.status !== 'all') {
        params.append('status', activeFilters.status);
      }
      if (activeFilters.projectId && activeFilters.projectId !== 'all') {
        params.append('projectId', activeFilters.projectId);
      }
      if (activeFilters.month && activeFilters.month !== 'all') {
        params.append('month', activeFilters.month);
      }
      if (activeFilters.search) {
        params.append('search', activeFilters.search);
      }
      
      // Set a high limit to get all data for reports
      params.append('limit', '1000');
      
      const response = await fetch(`/api/reports/processing?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: isAuthenticated && !!activeFilters && reportType === 'orders',
  });

  const { data: summaryReport } = useQuery({
    queryKey: ["/api/reports/summary", activeFilters?.startDate, activeFilters?.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilters?.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters?.endDate) params.append('endDate', activeFilters.endDate);
      
      const response = await fetch(`/api/reports/summary?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch summary report');
      return response.json();
    },
    enabled: isAuthenticated && !!activeFilters,
  });

  const { data: categoryReport } = useQuery({
    queryKey: ["/api/reports/by-category", activeFilters?.startDate, activeFilters?.endDate, categoryFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilters?.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters?.endDate) params.append('endDate', activeFilters.endDate);
      
      // Add hierarchical category filters
      if (categoryFilters.majorCategory !== 'all') {
        params.append('majorCategory', categoryFilters.majorCategory);
      }
      if (categoryFilters.middleCategory !== 'all') {
        params.append('middleCategory', categoryFilters.middleCategory);
      }
      if (categoryFilters.minorCategory !== 'all') {
        params.append('minorCategory', categoryFilters.minorCategory);
      }
      
      const response = await fetch(`/api/reports/by-category?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch category report');
      return response.json();
    },
    enabled: isAuthenticated && !!activeFilters && reportType === 'category',
  });

  const { data: projectReport } = useQuery({
    queryKey: ["/api/reports/by-project", activeFilters?.startDate, activeFilters?.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilters?.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters?.endDate) params.append('endDate', activeFilters.endDate);
      
      const response = await fetch(`/api/reports/by-project?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch project report');
      return response.json();
    },
    enabled: isAuthenticated && !!activeFilters && reportType === 'project',
  });

  const { data: vendorReport } = useQuery({
    queryKey: ["/api/reports/by-vendor", activeFilters?.startDate, activeFilters?.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilters?.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters?.endDate) params.append('endDate', activeFilters.endDate);
      
      const response = await fetch(`/api/reports/by-vendor?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch vendor report');
      return response.json();
    },
    enabled: isAuthenticated && !!activeFilters && reportType === 'vendor',
  });

  const { data: emailReport } = useQuery({
    queryKey: ["/api/email-history", activeFilters?.startDate, activeFilters?.endDate, filters.status, filters.search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '100'
      });
      if (activeFilters?.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters?.endDate) params.append('endDate', activeFilters.endDate);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('orderNumber', filters.search);
      
      const response = await fetch(`/api/email-history?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch email history');
      return response.json();
    },
    enabled: isAuthenticated && reportType === 'email',
  });

  // Excel 내보내기 핸들러
  const handleExcelExport = async () => {
    try {
      const params = new URLSearchParams();
      if (reportType === 'orders') {
        // For orders report, export the current filtered data
        const ordersParams = new URLSearchParams();
        if (activeFilters?.startDate) ordersParams.append('startDate', activeFilters.startDate);
        if (activeFilters?.endDate) ordersParams.append('endDate', activeFilters.endDate);
        
        const response = await fetch(`/api/reports/export-excel?type=processing&${ordersParams.toString()}`);
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `orders_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // For other report types
        params.append('type', reportType);
        if (activeFilters?.startDate) params.append('startDate', activeFilters.startDate);
        if (activeFilters?.endDate) params.append('endDate', activeFilters.endDate);
        if (reportType === 'category') params.append('categoryType', categoryType);
        
        const response = await fetch(`/api/reports/export-excel?${params.toString()}`);
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${reportType}_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      toast({
        title: "성공",
        description: "Excel 파일이 다운로드되었습니다.",
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "Excel 내보내기에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" style={{ backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }}>
        <div className="animate-pulse text-lg" style={{ color: isDarkMode ? '#d1d5db' : '#374151' }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }}>
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
      {/* 페이지 헤더 - UI Standards 적용 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>보고서 및 분석</h1>
            <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>발주 현황 및 통계를 확인하고 보고서를 생성하세요</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsReportModalOpen(true)}
            variant="default"
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            보고서 생성
          </Button>
        </div>
      </div>

      {/* 리포트 타입 선택 탭 */}
      <Card className={`shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`border-b transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <nav className="-mb-px flex">
            <button
              onClick={() => setReportType('orders')}
              className={`py-2 px-6 text-sm font-medium border-b-2 transition-colors ${
                reportType === 'orders'
                  ? 'border-blue-600 text-blue-600'
                  : isDarkMode 
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              발주 내역 검색
            </button>
            <button
              onClick={() => setReportType('category')}
              className={`py-2 px-6 text-sm font-medium border-b-2 transition-colors ${
                reportType === 'category'
                  ? 'border-blue-600 text-blue-600'
                  : isDarkMode 
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              분류별 보고서
            </button>
            <button
              onClick={() => setReportType('project')}
              className={`py-2 px-6 text-sm font-medium border-b-2 transition-colors ${
                reportType === 'project'
                  ? 'border-blue-600 text-blue-600'
                  : isDarkMode 
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              현장별 보고서
            </button>
            <button
              onClick={() => setReportType('vendor')}
              className={`py-2 px-6 text-sm font-medium border-b-2 transition-colors ${
                reportType === 'vendor'
                  ? 'border-blue-600 text-blue-600'
                  : isDarkMode 
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              거래처별 보고서
            </button>
            <button
              onClick={() => setReportType('email')}
              className={`py-2 px-6 text-sm font-medium border-b-2 transition-colors ${
                reportType === 'email'
                  ? 'border-blue-600 text-blue-600'
                  : isDarkMode 
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              이메일 이력
            </button>
          </nav>
        </div>
      </Card>

      {/* 필터 섹션 - UI Standards 적용 */}
      <Card className={`shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-lg font-semibold flex items-center gap-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Filter className="h-5 w-5 text-blue-600" />
            필터 조건
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Common filters for all report types */}
            {(reportType === 'orders' || reportType === 'category' || reportType === 'project' || reportType === 'vendor') && (
              <>
                <div className="space-y-2">
                  <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>시작일</label>
                  <Input 
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>종료일</label>
                  <Input 
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                  />
                </div>
              </>
            )}

            {/* Hierarchical category filter for category report */}
            {reportType === 'category' && (
              <CategoryHierarchyFilter 
                onFilterChange={setCategoryFilters}
              />
            )}

            {/* Orders-specific filters */}
            {reportType === 'orders' && (
              <>
                <div className="space-y-2">
                  <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>연도</label>
                  <Select 
                    value={filters.year} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, year: value }))}
                  >
                    <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <SelectItem value="all">전체 연도</SelectItem>
                      <SelectItem value="2025">2025년</SelectItem>
                      <SelectItem value="2024">2024년</SelectItem>
                      <SelectItem value="2023">2023년</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>거래처</label>
                  <Select 
                    value={filters.vendorId} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, vendorId: value }))}
                  >
                    <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <SelectItem value="all">전체 거래처</SelectItem>
                      {Array.isArray(vendors) && vendors.map((vendor: any) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>발주 상태</label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="draft">임시 저장</SelectItem>
                      <SelectItem value="pending">승인 대기</SelectItem>
                      <SelectItem value="approved">승인 완료</SelectItem>
                      <SelectItem value="sent">발주완료</SelectItem>
                      <SelectItem value="completed">발주 완료</SelectItem>
                      <SelectItem value="rejected">반려</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 발주 템플릿 필터 - 현재 비활성화 */}
                {/* <div className="space-y-2">
                  <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>발주 템플릿</label>
                  <Select 
                    value={filters.templateId} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, templateId: value }))}
                  >
                    <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <SelectItem value="all">전체 템플릿</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}

                <div className="space-y-2">
                  <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>금액 범위</label>
                  <Select 
                    value={filters.amountRange} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, amountRange: value }))}
                  >
                    <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <SelectItem value="all">전체 금액</SelectItem>
                      <SelectItem value="0-100000">10만원 이하</SelectItem>
                      <SelectItem value="100000-500000">10만원 ~ 50만원</SelectItem>
                      <SelectItem value="500000-1000000">50만원 ~ 100만원</SelectItem>
                      <SelectItem value="1000000-5000000">100만원 ~ 500만원</SelectItem>
                      <SelectItem value="5000000-99999999">500만원 이상</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>담당자</label>
                  <Select 
                    value={filters.userId} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}
                  >
                    <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <SelectItem value="all">전체 담당자</SelectItem>
                      {Array.isArray(users) && users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>검색어</label>
                  <Input 
                    type="text"
                    placeholder="발주번호, 거래처명, 현장명, 메모로 검색..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'}`}
                  />
                </div>
              </>
            )}
          </div>
          
          {/* 활성 필터 표시 */}
          {activeFilters && Object.values(activeFilters).some(value => value !== 'all' && value !== '') && (
            <div className={`mt-4 p-3 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="font-medium">적용된 필터: </span>
                  {activeFilters.year !== new Date().getFullYear().toString() && (
                    <span className={`inline-block px-2 py-1 rounded text-xs mr-2 transition-colors ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                      연도: {activeFilters.year}년
                    </span>
                  )}
                  {activeFilters.startDate && (
                    <span className={`inline-block px-2 py-1 rounded text-xs mr-2 transition-colors ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                      시작일: {activeFilters.startDate}
                    </span>
                  )}
                  {activeFilters.endDate && (
                    <span className={`inline-block px-2 py-1 rounded text-xs mr-2 transition-colors ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                      종료일: {activeFilters.endDate}
                    </span>
                  )}
                  {activeFilters.vendorId !== 'all' && (
                    <span className={`inline-block px-2 py-1 rounded text-xs mr-2 transition-colors ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                      거래처 필터링
                    </span>
                  )}
                  {activeFilters.status !== 'all' && (
                    <span className={`inline-block px-2 py-1 rounded text-xs mr-2 transition-colors ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                      상태: {activeFilters.status === 'pending' ? '승인 대기' : 
                            activeFilters.status === 'approved' ? '승인 완료' :
                            activeFilters.status === 'completed' ? '발주 완료' : '반려'}
                    </span>
                  )}
                  {activeFilters.templateId !== 'all' && (
                    <span className={`inline-block px-2 py-1 rounded text-xs mr-2 transition-colors ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                      템플릿 필터링
                    </span>
                  )}
                  {activeFilters.amountRange !== 'all' && (
                    <span className={`inline-block px-2 py-1 rounded text-xs mr-2 transition-colors ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                      금액 범위 필터링
                    </span>
                  )}
                  {activeFilters.userId !== 'all' && (
                    <span className={`inline-block px-2 py-1 rounded text-xs mr-2 transition-colors ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                      담당자 필터링
                    </span>
                  )}
                  {activeFilters.search && (
                    <span className={`inline-block px-2 py-1 rounded text-xs mr-2 transition-colors ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                      검색어: "{activeFilters.search}"
                    </span>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const resetFilters = {
                      year: new Date().getFullYear().toString(),
                      startDate: '',
                      endDate: '',
                      vendorId: 'all',
                      status: 'all',
                      templateId: 'all',
                      amountRange: 'all',
                      userId: 'all',
                      search: '',
                      month: 'all',
                      projectId: 'all'
                    };
                    setFilters(resetFilters);
                    setActiveFilters(resetFilters);
                  }}
                  className="text-gray-600 hover:text-gray-800"
                >
                  필터 초기화
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-4 gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                const resetFilters = {
                  year: new Date().getFullYear().toString(),
                  startDate: '',
                  endDate: '',
                  vendorId: 'all',
                  status: 'all',
                  templateId: 'all',
                  amountRange: 'all',
                  userId: 'all'
                };
                setFilters(resetFilters);
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              초기화
            </Button>
            <Button 
              onClick={() => {
                setActiveFilters(filters);
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              검색
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 검색 결과 리스트 - UI Standards 적용 */}
      <Card className={`shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={`text-lg font-semibold flex items-center gap-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {reportType === 'email' ? <Mail className="h-5 w-5 text-blue-600" /> : <Search className="h-5 w-5 text-blue-600" />}
                {reportType === 'orders' ? '검색 결과' : 
                 reportType === 'category' ? '분류별 보고서 결과' :
                 reportType === 'project' ? '현장별 보고서 결과' :
                 reportType === 'vendor' ? '거래처별 보고서 결과' :
                 '이메일 발송 이력'}
              </CardTitle>
              <p className={`text-sm transition-colors mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {reportType === 'orders' ? (
                  processingLoading ? "데이터 로딩 중..." : 
                  processingReport && processingReport.orders ? 
                  `총 ${processingReport.orders.length}건의 발주 데이터` : "검색된 데이터가 없습니다"
                ) : reportType === 'email' ? (
                  emailReport ? 
                  `총 ${emailReport.statistics?.totalEmails || 0}건의 이메일 발송 기록` : 
                  "이메일 발송 이력 데이터를 불러오는 중입니다"
                ) : (
                  "필터를 설정하고 검색 버튼을 클릭하세요"
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {reportType === 'orders' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleReportGeneration()}
                  disabled={selectedItems.size === 0}
                  className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  보고서 생성 ({selectedItems.size}건)
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExcelExport()}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Excel 내보내기
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!activeFilters ? (
            <div className="text-center py-16">
              <div className={`text-lg mb-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>검색 조건을 설정하고 검색 버튼을 클릭하세요</div>
              <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>효율적인 성능을 위해 검색 필터를 먼저 설정해주세요</div>
            </div>
          ) : (
            <>
              {/* Orders Report View */}
              {reportType === 'orders' && (
                processingLoading ? (
                  <div className="text-center py-8">
                    <div className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>데이터를 불러오는 중...</div>
                  </div>
                ) : processingReport && Array.isArray(processingReport.orders) && processingReport.orders.length > 0 ? (
            <div className="space-y-4">
              {/* 요약 통계 */}
              <div className="space-y-4 mb-6">
                {/* 첫 번째 줄 - 기본 통계 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(() => {
                    const statusCounts = processingReport.orders.reduce((acc: any, order: any) => {
                      acc[order.status] = (acc[order.status] || 0) + 1;
                      return acc;
                    }, {});
                    
                    // 총 발주금액 계산
                    const totalAmount = processingReport.orders.reduce((sum: number, order: any) => {
                      const amount = parseFloat(order.totalAmount) || 0;
                      return sum + amount;
                    }, 0);
                    
                    // 평균 발주금액 계산
                    const averageAmount = processingReport.orders.length > 0 ? totalAmount / processingReport.orders.length : 0;
                    
                    return (
                      <>
                        <div className={`p-2 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{processingReport.orders.length}</div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>총 발주</div>
                        </div>
                        <div className={`p-2 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                          <div className={`text-2xl font-bold font-semibold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatKoreanWon(Math.floor(totalAmount))}</div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>총 발주금액</div>
                        </div>
                        <div className={`p-2 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                          <div className={`text-2xl font-bold font-semibold transition-colors ${isDarkMode ? 'text-purple-400' : 'text-blue-600'}`}>{formatKoreanWon(Math.floor(averageAmount))}</div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>평균 발주금액</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                {/* 두 번째 줄 - 상태별 통계 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(() => {
                    const statusCounts = processingReport.orders.reduce((acc: any, order: any) => {
                      acc[order.status] = (acc[order.status] || 0) + 1;
                      return acc;
                    }, {});
                    
                    return (
                      <>
                        <div className={`p-2 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                          <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>{statusCounts.pending || 0}</div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>승인 대기</div>
                        </div>
                        <div className={`p-2 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                          <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>{statusCounts.approved || 0}</div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>승인 완료</div>
                        </div>
                        <div className={`p-2 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                          <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>{statusCounts.completed || 0}</div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>발주 완료</div>
                        </div>
                        <div className={`p-2 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                          <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>{statusCounts.rejected || 0}</div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>반려</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* 데이터 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b transition-colors ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <th className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        <input 
                          type="checkbox" 
                          className="rounded"
                          checked={isAllSelected(processingReport.orders || [])}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = isIndeterminate(processingReport.orders || []);
                            }
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked, processingReport.orders || [])}
                        />
                      </th>
                      <th 
                        className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                          isDarkMode 
                            ? 'text-gray-300 hover:bg-gray-600' 
                            : 'text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => handleSort('orderNumber')}
                      >
                        <div className="flex items-center gap-1">
                          발주번호
                          {getSortIcon('orderNumber')}
                        </div>
                      </th>
                      <th 
                        className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                          isDarkMode 
                            ? 'text-gray-300 hover:bg-gray-600' 
                            : 'text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => handleSort('vendor')}
                      >
                        <div className="flex items-center gap-1">
                          거래처
                          {getSortIcon('vendor')}
                        </div>
                      </th>
                      <th className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        품목
                      </th>
                      <th 
                        className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                          isDarkMode 
                            ? 'text-gray-300 hover:bg-gray-600' 
                            : 'text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => handleSort('orderDate')}
                      >
                        <div className="flex items-center gap-1">
                          발주일자
                          {getSortIcon('orderDate')}
                        </div>
                      </th>
                      <th 
                        className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                          isDarkMode 
                            ? 'text-gray-300 hover:bg-gray-600' 
                            : 'text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => handleSort('totalAmount')}
                      >
                        <div className="flex items-center gap-1">
                          총금액
                          {getSortIcon('totalAmount')}
                        </div>
                      </th>
                      <th 
                        className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                          isDarkMode 
                            ? 'text-gray-300 hover:bg-gray-600' 
                            : 'text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-1">
                          상태
                          {getSortIcon('status')}
                        </div>
                      </th>
                      <th 
                        className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                          isDarkMode 
                            ? 'text-gray-300 hover:bg-gray-600' 
                            : 'text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => handleSort('user')}
                      >
                        <div className="flex items-center gap-1">
                          작성자
                          {getSortIcon('user')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedData(processingReport.orders).map((order: any) => (
                      <tr key={order.id} className={`border-b transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-gray-700 border-gray-600' 
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}>
                        <td className="py-3 px-4">
                          <input 
                            type="checkbox" 
                            className="rounded"
                            checked={selectedItems.has(order.id)}
                            onChange={(e) => handleSelectItem(order.id, e.target.checked)}
                          />
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <button
                            onClick={() => setLocation(`/order-preview/${order.id}`)}
                            className={`transition-colors hover:underline cursor-pointer ${
                              isDarkMode 
                                ? 'text-blue-400 hover:text-blue-300' 
                                : 'text-blue-600 hover:text-blue-800'
                            }`}
                          >
                            {order.orderNumber}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {order.vendorName ? (
                            <button
                              onClick={() => setLocation(`/vendors/${order.vendorId}`)}
                              className={`transition-colors hover:underline cursor-pointer ${
                                isDarkMode 
                                  ? 'text-blue-400 hover:text-blue-300' 
                                  : 'text-blue-600 hover:text-blue-800'
                              }`}
                            >
                              {order.vendorName}
                            </button>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {order.items && order.items.length > 0 ? (
                            <div className="space-y-1">
                              {order.items.slice(0, 2).map((item: any, index: number) => (
                                <div key={index} className="text-xs">
                                  <div className={`font-medium transition-colors ${
                                    isDarkMode ? 'text-gray-200' : 'text-gray-900'
                                  }`}>
                                    {item.itemName || item.name || '품목명 없음'}
                                  </div>
                                  <div className="text-xs mt-1">
                                    <span className={`font-medium transition-colors ${
                                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                    }`}>
                                      {item.majorCategory || '미분류'}
                                    </span>
                                    {item.middleCategory && (
                                      <span className={`transition-colors ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                      }`}> &gt; {item.middleCategory}</span>
                                    )}
                                    {item.minorCategory && (
                                      <span className={`transition-colors ${
                                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                      }`}> &gt; {item.minorCategory}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className={`text-xs transition-colors ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  외 {order.items.length - 2}개 품목
                                </div>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className={`py-3 px-4 text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {order.orderDate ? new Date(order.orderDate).toLocaleDateString('ko-KR') : '-'}
                        </td>
                        <td className={`py-3 px-4 text-sm font-semibold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {order.totalAmount ? formatKoreanWon(Math.floor(order.totalAmount)) : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.status === 'draft' 
                              ? isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                              : order.status === 'pending' 
                                ? isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                                : order.status === 'approved' 
                                  ? isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                                  : order.status === 'sent' 
                                    ? isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800'
                                    : order.status === 'completed' 
                                      ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                                      : order.status === 'rejected' 
                                        ? isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
                                        : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status === 'draft' ? '임시 저장' :
                             order.status === 'pending' ? '승인 대기' :
                             order.status === 'approved' ? '진행 중' :
                             order.status === 'sent' ? '발주완료' :
                             order.status === 'completed' ? '완료' :
                             order.status === 'rejected' ? '반려' :
                             order.status}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-sm transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {order.userName || (order.userLastName || order.userFirstName ? `${order.userLastName || ''} ${order.userFirstName || ''}`.trim() : '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const totalAmount = processingReport.orders.reduce((sum: number, order: any) => {
                        const amount = parseFloat(order.totalAmount) || 0;
                        return sum + amount;
                      }, 0);
                      const averageAmount = processingReport.orders.length > 0 ? totalAmount / processingReport.orders.length : 0;
                      
                      return (
                        <tr className={`font-medium transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                          <td className={`border px-3 py-2 text-sm font-medium transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200'}`}>합계</td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                            <span className={`font-bold font-semibold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatKoreanWon(Math.floor(totalAmount))}</span>
                          </td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                        </tr>
                      );
                    })()}
                    {(() => {
                      const totalAmount = processingReport.orders.reduce((sum: number, order: any) => {
                        const amount = parseFloat(order.totalAmount) || 0;
                        return sum + amount;
                      }, 0);
                      const averageAmount = processingReport.orders.length > 0 ? totalAmount / processingReport.orders.length : 0;
                      
                      return (
                        <tr className={`font-medium transition-colors ${isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}`}>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                          <td className={`border px-3 py-2 text-sm font-medium transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200'}`}>평균</td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                            <span className={`font-bold font-semibold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatKoreanWon(Math.floor(averageAmount))}</span>
                          </td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                          <td className={`border px-3 py-2 text-sm transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            </div>
                ) : (
                  <div className="text-center py-8">
                    <div className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>검색 조건에 맞는 데이터가 없습니다.</div>
                    <p className={`text-sm mt-2 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>필터 조건을 변경하여 다시 검색해보세요.</p>
                  </div>
                )
              )}

              {/* Category Report View */}
              {reportType === 'category' && (
                categoryReport ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className={`text-lg font-semibold mb-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {categoryType === 'major' ? '대분류별' : categoryType === 'middle' ? '중분류별' : '소분류별'} 발주 보고서
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>총 분류 수:</span>
                        <span className={`ml-2 font-medium transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{categoryReport.summary?.totalCategories || 0}</span>
                      </div>
                      <div>
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>총 발주 수:</span>
                        <span className={`ml-2 font-medium transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{categoryReport.summary?.totalOrders || 0}</span>
                      </div>
                      <div>
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>총 품목 수:</span>
                        <span className={`ml-2 font-medium transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{categoryReport.summary?.totalItems || 0}</span>
                      </div>
                      <div>
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>총 금액:</span>
                        <span className={`ml-2 font-medium transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{formatKoreanWon(Math.floor(categoryReport.summary?.totalAmount || 0))}</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className={`border-b transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <th className={`py-3 px-4 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            <Checkbox 
                              checked={categoryReport?.data?.length > 0 && categoryReport.data.every((_: any, index: number) => selectedCategoryItems.has(index))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCategoryItems(new Set(categoryReport?.data?.map((_: any, index: number) => index) || []));
                                } else {
                                  setSelectedCategoryItems(new Set());
                                }
                              }}
                            />
                          </th>
                          <th className={`text-left py-3 px-4 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>분류 계층</th>
                          <th className={`text-right py-3 px-4 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>발주 수</th>
                          <th className={`text-right py-3 px-4 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>품목 수</th>
                          <th className={`text-right py-3 px-4 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>총 수량</th>
                          <th className={`text-right py-3 px-4 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>총 금액</th>
                          <th className={`text-right py-3 px-4 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>평균 금액</th>
                          <th className={`text-left py-3 px-4 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>주요 품목</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryReport.data?.map((item: any, index: number) => (
                          <tr key={index} className={`border-b transition-colors ${
                            isDarkMode 
                              ? 'border-gray-600 hover:bg-gray-700' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}>
                            <td className="py-3 px-4">
                              <Checkbox 
                                checked={selectedCategoryItems.has(index)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedCategoryItems);
                                  if (checked) {
                                    newSelected.add(index);
                                  } else {
                                    newSelected.delete(index);
                                  }
                                  setSelectedCategoryItems(newSelected);
                                }}
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm">
                                <div className={`font-medium transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{item.category}</div>
                                {item.hierarchyPath && item.hierarchyPath !== item.category && (
                                  <div className={`text-xs mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.hierarchyPath}</div>
                                )}
                              </div>
                            </td>
                            <td className={`py-3 px-4 text-right transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{item.orderCount}</td>
                            <td className={`py-3 px-4 text-right transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{item.itemCount}</td>
                            <td className={`py-3 px-4 text-right transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{item.totalQuantity?.toLocaleString()}</td>
                            <td className={`py-3 px-4 text-right font-medium transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatKoreanWon(Math.floor(item.totalAmount))}</td>
                            <td className={`py-3 px-4 text-right transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{formatKoreanWon(Math.floor(item.averageAmount))}</td>
                            <td className="py-3 px-4">
                              {item.topItems && item.topItems.length > 0 ? (
                                <div className="space-y-1">
                                  {item.topItems.slice(0, 3).map((topItem: any, itemIndex: number) => (
                                    <div key={itemIndex} className="text-xs">
                                      <span className={`font-medium transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{topItem.itemName}</span>
                                      <span className={`ml-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        ({topItem.quantity}개, {formatKoreanWon(Math.floor(topItem.amount))})
                                      </span>
                                    </div>
                                  ))}
                                  {item.topItems.length > 3 && (
                                    <div className={`text-xs transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                      외 {item.topItems.length - 3}개 품목
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className={`text-xs transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                ) : (
                  <div className="text-center py-8">
                    <div className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>분류별 보고서 데이터를 불러오는 중이거나 데이터가 없습니다.</div>
                    <p className={`text-sm mt-2 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>필터 조건을 변경하여 다시 검색해보세요.</p>
                  </div>
                )
              )}

              {/* Project Report View */}
              {reportType === 'project' && projectReport && (
                <div className="space-y-4">
                  {/* 요약 통계 - 발주 내역 검색과 동일한 스타일 */}
                  <div className="space-y-4 mb-6">
                    <h3 className={`text-lg font-semibold mb-4 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>현장별 발주 보고서</h3>
                    
                    {/* 첫 번째 줄 - 기본 통계 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                        <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {projectReport.summary?.totalProjects || 0}
                        </div>
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>총 프로젝트</div>
                      </div>
                      <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                        <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                          {projectReport.summary?.totalOrders || 0}
                        </div>
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>총 발주 수</div>
                      </div>
                      <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                        <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          {formatKoreanWon(Math.floor(projectReport.summary?.totalAmount || 0))}
                        </div>
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>총 발주금액</div>
                      </div>
                      <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                        <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                          {formatKoreanWon(Math.floor(projectReport.summary?.averagePerProject || 0))}
                        </div>
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>현장당 평균</div>
                      </div>
                    </div>

                    {/* 두 번째 줄 - 추가 통계 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(() => {
                        // 프로젝트 상태별 통계 계산
                        const statusCounts = projectReport.data?.reduce((acc: any, project: any) => {
                          acc[project.projectStatus] = (acc[project.projectStatus] || 0) + 1;
                          return acc;
                        }, {}) || {};

                        const totalVendors = projectReport.data?.reduce((sum: number, project: any) => 
                          sum + (project.vendorCount || 0), 0) || 0;

                        const avgOrdersPerProject = projectReport.summary?.totalProjects > 0 
                          ? Math.round((projectReport.summary?.totalOrders || 0) / projectReport.summary.totalProjects)
                          : 0;

                        return (
                          <>
                            <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                              <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                                {statusCounts.active || 0}
                              </div>
                              <div className={`text-sm transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>진행중</div>
                            </div>
                            <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                              <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                {statusCounts.completed || 0}
                              </div>
                              <div className={`text-sm transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>완료</div>
                            </div>
                            <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                              <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                                {totalVendors}
                              </div>
                              <div className={`text-sm transition-colors ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>총 거래처</div>
                            </div>
                            <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-teal-900/30' : 'bg-teal-50'}`}>
                              <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-teal-400' : 'text-teal-700'}`}>
                                {avgOrdersPerProject}
                              </div>
                              <div className={`text-sm transition-colors ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>현장당 발주</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className={`border-b transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <th className={`py-3 px-4 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            <Checkbox 
                              checked={projectReport?.data?.length > 0 && projectReport.data.every((item: any) => selectedProjectItems.has(item.projectId))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProjectItems(new Set(projectReport?.data?.map((item: any) => item.projectId) || []));
                                } else {
                                  setSelectedProjectItems(new Set());
                                }
                              }}
                            />
                          </th>
                          <th 
                            className={`text-left py-3 px-4 font-medium transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}
                            onClick={() => handleProjectSort('projectName')}
                          >
                            <div className="flex items-center gap-2">
                              <span>현장명</span>
                              {renderProjectSortIcon('projectName')}
                            </div>
                          </th>
                          <th 
                            className={`text-left py-3 px-4 font-medium transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}
                            onClick={() => handleProjectSort('projectCode')}
                          >
                            <div className="flex items-center gap-2">
                              <span>현장 코드</span>
                              {renderProjectSortIcon('projectCode')}
                            </div>
                          </th>
                          <th 
                            className={`text-left py-3 px-4 font-medium transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}
                            onClick={() => handleProjectSort('projectStatus')}
                          >
                            <div className="flex items-center gap-2">
                              <span>상태</span>
                              {renderProjectSortIcon('projectStatus')}
                            </div>
                          </th>
                          <th 
                            className={`text-right py-3 px-4 font-medium transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}
                            onClick={() => handleProjectSort('orderCount')}
                          >
                            <div className="flex items-center justify-end gap-2">
                              <span>발주 수</span>
                              {renderProjectSortIcon('orderCount')}
                            </div>
                          </th>
                          <th 
                            className={`text-right py-3 px-4 font-medium transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}
                            onClick={() => handleProjectSort('vendorCount')}
                          >
                            <div className="flex items-center justify-end gap-2">
                              <span>거래처 수</span>
                              {renderProjectSortIcon('vendorCount')}
                            </div>
                          </th>
                          <th 
                            className={`text-right py-3 px-4 font-medium transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}
                            onClick={() => handleProjectSort('totalAmount')}
                          >
                            <div className="flex items-center justify-end gap-2">
                              <span>총 금액</span>
                              {renderProjectSortIcon('totalAmount')}
                            </div>
                          </th>
                          <th 
                            className={`text-right py-3 px-4 font-medium transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}
                            onClick={() => handleProjectSort('averageOrderAmount')}
                          >
                            <div className="flex items-center justify-end gap-2">
                              <span>평균 금액</span>
                              {renderProjectSortIcon('averageOrderAmount')}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSortedProjectData(projectReport.data || [])?.map((item: any) => (
                          <tr key={item.projectId} className={`border-b transition-colors ${
                            isDarkMode 
                              ? 'border-gray-600 hover:bg-gray-700' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}>
                            <td className="py-3 px-4">
                              <Checkbox 
                                checked={selectedProjectItems.has(item.projectId)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedProjectItems);
                                  if (checked) {
                                    newSelected.add(item.projectId);
                                  } else {
                                    newSelected.delete(item.projectId);
                                  }
                                  setSelectedProjectItems(newSelected);
                                }}
                              />
                            </td>
                            <td className={`py-3 px-4 transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{item.projectName}</td>
                            <td className={`py-3 px-4 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{item.projectCode}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                item.projectStatus === 'active' 
                                  ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                                  : item.projectStatus === 'completed' 
                                    ? isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                                    : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {item.projectStatus === 'active' ? '진행중' :
                                 item.projectStatus === 'completed' ? '완료' : '대기'}
                              </span>
                            </td>
                            <td className={`py-3 px-4 text-right transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{item.orderCount}</td>
                            <td className={`py-3 px-4 text-right transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{item.vendorCount}</td>
                            <td className={`py-3 px-4 text-right font-medium transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatKoreanWon(Math.floor(item.totalAmount))}</td>
                            <td className={`py-3 px-4 text-right transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{formatKoreanWon(Math.floor(item.averageOrderAmount))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Vendor Report View */}
              {reportType === 'vendor' && (
                vendorReport ? (
                <div className="space-y-4">
                  {/* 요약 통계 - 발주 내역 검색과 동일한 스타일 */}
                  <div className="space-y-4 mb-6">
                    <h3 className={`text-lg font-semibold mb-4 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>거래처별 발주 보고서</h3>
                    
                    {/* 첫 번째 줄 - 기본 통계 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                        <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {vendorReport.summary?.totalVendors || 0}
                        </div>
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>총 거래처</div>
                      </div>
                      <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
                        <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                          {vendorReport.summary?.totalOrders || 0}
                        </div>
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>총 발주 수</div>
                      </div>
                      <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-rose-900/30' : 'bg-rose-50'}`}>
                        <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                          {formatKoreanWon(Math.floor(vendorReport.summary?.totalAmount || 0))}
                        </div>
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>총 발주금액</div>
                      </div>
                      <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                        <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                          {formatKoreanWon(Math.floor(vendorReport.summary?.averagePerVendor || 0))}
                        </div>
                        <div className={`text-sm transition-colors ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>거래처당 평균</div>
                      </div>
                    </div>

                    {/* 두 번째 줄 - 추가 통계 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(() => {
                        const totalProjects = vendorReport.data?.reduce((sum: number, vendor: any) => 
                          sum + (vendor.projectCount || 0), 0) || 0;

                        const avgOrdersPerVendor = vendorReport.summary?.totalVendors > 0 
                          ? Math.round((vendorReport.summary?.totalOrders || 0) / vendorReport.summary.totalVendors)
                          : 0;

                        const maxOrderVendor = vendorReport.data?.reduce((max: any, vendor: any) => 
                          vendor.orderCount > (max?.orderCount || 0) ? vendor : max, null);

                        const avgAmountPerOrder = vendorReport.summary?.totalOrders > 0 
                          ? (vendorReport.summary?.totalAmount || 0) / vendorReport.summary.totalOrders
                          : 0;

                        return (
                          <>
                            <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-violet-900/30' : 'bg-violet-50'}`}>
                              <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-violet-400' : 'text-violet-700'}`}>
                                {totalProjects}
                              </div>
                              <div className={`text-sm transition-colors ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>총 프로젝트</div>
                            </div>
                            <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-sky-900/30' : 'bg-sky-50'}`}>
                              <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-sky-400' : 'text-sky-700'}`}>
                                {avgOrdersPerVendor}
                              </div>
                              <div className={`text-sm transition-colors ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}>거래처당 발주</div>
                            </div>
                            <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-lime-900/30' : 'bg-lime-50'}`}>
                              <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-lime-400' : 'text-lime-700'}`}>
                                {maxOrderVendor?.orderCount || 0}
                              </div>
                              <div className={`text-sm transition-colors ${isDarkMode ? 'text-lime-400' : 'text-lime-600'}`}>최다 발주</div>
                            </div>
                            <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-pink-900/30' : 'bg-pink-50'}`}>
                              <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-pink-400' : 'text-pink-700'}`}>
                                {formatKoreanWon(Math.floor(avgAmountPerOrder))}
                              </div>
                              <div className={`text-sm transition-colors ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`}>평균 발주액</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className={`border-b transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <th className={`py-3 px-4 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            <Checkbox 
                              checked={vendorReport?.data?.length > 0 && vendorReport.data.every((item: any) => selectedVendorItems.has(item.vendorId))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedVendorItems(new Set(vendorReport?.data?.map((item: any) => item.vendorId) || []));
                                } else {
                                  setSelectedVendorItems(new Set());
                                }
                              }}
                            />
                          </th>
                          <th 
                            className={`text-left py-3 px-4 font-medium cursor-pointer select-none transition-colors ${
                              isDarkMode 
                                ? 'text-gray-300 hover:bg-gray-600' 
                                : 'text-gray-900 hover:bg-gray-100'
                            }`}
                            onClick={() => handleVendorSort('vendorName')}
                          >
                            <div className="flex items-center gap-1">
                              거래처명
                              {renderVendorSortIcon('vendorName')}
                            </div>
                          </th>
                          <th 
                            className={`text-left py-3 px-4 font-medium cursor-pointer select-none transition-colors ${
                              isDarkMode 
                                ? 'text-gray-300 hover:bg-gray-600' 
                                : 'text-gray-900 hover:bg-gray-100'
                            }`}
                            onClick={() => handleVendorSort('vendorCode')}
                          >
                            <div className="flex items-center gap-1">
                              거래처 코드
                              {renderVendorSortIcon('vendorCode')}
                            </div>
                          </th>
                          <th 
                            className={`text-left py-3 px-4 font-medium cursor-pointer select-none transition-colors ${
                              isDarkMode 
                                ? 'text-gray-300 hover:bg-gray-600' 
                                : 'text-gray-900 hover:bg-gray-100'
                            }`}
                            onClick={() => handleVendorSort('businessNumber')}
                          >
                            <div className="flex items-center gap-1">
                              사업자번호
                              {renderVendorSortIcon('businessNumber')}
                            </div>
                          </th>
                          <th 
                            className={`text-right py-3 px-4 font-medium cursor-pointer select-none transition-colors ${
                              isDarkMode 
                                ? 'text-gray-300 hover:bg-gray-600' 
                                : 'text-gray-900 hover:bg-gray-100'
                            }`}
                            onClick={() => handleVendorSort('orderCount')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              발주 수
                              {renderVendorSortIcon('orderCount')}
                            </div>
                          </th>
                          <th 
                            className={`text-right py-3 px-4 font-medium cursor-pointer select-none transition-colors ${
                              isDarkMode 
                                ? 'text-gray-300 hover:bg-gray-600' 
                                : 'text-gray-900 hover:bg-gray-100'
                            }`}
                            onClick={() => handleVendorSort('projectCount')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              프로젝트 수
                              {renderVendorSortIcon('projectCount')}
                            </div>
                          </th>
                          <th 
                            className={`text-right py-3 px-4 font-medium cursor-pointer select-none transition-colors ${
                              isDarkMode 
                                ? 'text-gray-300 hover:bg-gray-600' 
                                : 'text-gray-900 hover:bg-gray-100'
                            }`}
                            onClick={() => handleVendorSort('totalAmount')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              총 금액
                              {renderVendorSortIcon('totalAmount')}
                            </div>
                          </th>
                          <th 
                            className={`text-right py-3 px-4 font-medium cursor-pointer select-none transition-colors ${
                              isDarkMode 
                                ? 'text-gray-300 hover:bg-gray-600' 
                                : 'text-gray-900 hover:bg-gray-100'
                            }`}
                            onClick={() => handleVendorSort('averageOrderAmount')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              평균 금액
                              {renderVendorSortIcon('averageOrderAmount')}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSortedVendorData(vendorReport.data || [])?.map((item: any) => (
                          <tr key={item.vendorId} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <Checkbox 
                                checked={selectedVendorItems.has(item.vendorId)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedVendorItems);
                                  if (checked) {
                                    newSelected.add(item.vendorId);
                                  } else {
                                    newSelected.delete(item.vendorId);
                                  }
                                  setSelectedVendorItems(newSelected);
                                }}
                              />
                            </td>
                            <td className="py-3 px-4">{item.vendorName}</td>
                            <td className="py-3 px-4">{item.vendorCode}</td>
                            <td className="py-3 px-4">{item.businessNumber}</td>
                            <td className="py-3 px-4 text-right">{item.orderCount}</td>
                            <td className="py-3 px-4 text-right">{item.projectCount}</td>
                            <td className="py-3 px-4 text-right font-medium">{formatKoreanWon(Math.floor(item.totalAmount))}</td>
                            <td className="py-3 px-4 text-right">{formatKoreanWon(Math.floor(item.averageOrderAmount))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Top Items for Selected Vendor */}
                  {vendorReport.data?.length === 1 && vendorReport.data[0].topItems?.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-md font-semibold mb-3">주요 발주 품목</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 text-sm">품목명</th>
                              <th className="text-right py-2 text-sm">수량</th>
                              <th className="text-right py-2 text-sm">금액</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorReport.data[0].topItems.map((item: any, index: number) => (
                              <tr key={index} className="border-b last:border-0">
                                <td className="py-2 text-sm">{item.itemName}</td>
                                <td className="py-2 text-right text-sm">{item.quantity}</td>
                                <td className="py-2 text-right text-sm font-medium">
                                  {formatKoreanWon(Math.floor(item.amount))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500">거래처별 보고서 데이터를 불러오는 중이거나 데이터가 없습니다.</div>
                    <p className="text-sm text-gray-400 mt-2">필터 조건을 변경하여 다시 검색해보세요.</p>
                  </div>
                )
              )}

              {/* Email History View */}
              {reportType === 'email' && (
                emailReport ? (
                  <div className="space-y-4">
                    {/* Email Statistics */}
                    <div className="space-y-4 mb-6">
                      <h3 className={`text-lg font-semibold mb-4 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>이메일 발송 이력</h3>
                      
                      {/* Statistics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                          <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {emailReport.statistics?.totalEmails || 0}
                          </div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>총 이메일</div>
                        </div>
                        <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                          <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                            {emailReport.statistics?.successfulEmails || 0}
                          </div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>발송 성공</div>
                        </div>
                        <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                          <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                            {emailReport.statistics?.failedEmails || 0}
                          </div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>발송 실패</div>
                        </div>
                        <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                          <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            {emailReport.statistics?.pendingEmails || 0}
                          </div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>대기중</div>
                        </div>
                        <div className={`p-3 rounded-lg text-center transition-colors ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                          <div className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                            {emailReport.statistics?.successRate || 0}%
                          </div>
                          <div className={`text-sm transition-colors ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>성공률</div>
                        </div>
                      </div>
                    </div>

                    {/* Email History Table */}
                    <div className="space-y-4">
                      <h4 className={`font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>이메일 발송 내역</h4>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={`border-b transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                              <th className={`text-left py-3 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>발송일시</th>
                              <th className={`text-left py-3 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>발주번호</th>
                              <th className={`text-left py-3 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>거래처</th>
                              <th className={`text-left py-3 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>제목</th>
                              <th className={`text-left py-3 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>수신자</th>
                              <th className={`text-left py-3 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>발송자</th>
                              <th className={`text-center py-3 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>상태</th>
                              <th className={`text-center py-3 px-2 font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>첨부파일</th>
                            </tr>
                          </thead>
                          <tbody>
                            {emailReport.data?.map((email: any, index: number) => (
                              <tr key={email.id} className={`border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} hover:${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                                <td className="py-3 px-2 text-sm">
                                  {email.sentAt ? new Date(email.sentAt).toLocaleString('ko-KR') : '-'}
                                </td>
                                <td className="py-3 px-2 text-sm font-medium">
                                  {email.orderNumber || '-'}
                                </td>
                                <td className="py-3 px-2 text-sm">
                                  {email.vendorName || '-'}
                                </td>
                                <td className="py-3 px-2 text-sm max-w-xs truncate" title={email.subject}>
                                  {email.subject}
                                </td>
                                <td className="py-3 px-2 text-sm">
                                  {email.recipients && Array.isArray(email.recipients) ? 
                                    email.recipients.map((r: any) => r.email || r).join(', ') : 
                                    (typeof email.recipients === 'string' ? email.recipients : '-')
                                  }
                                </td>
                                <td className="py-3 px-2 text-sm">
                                  {email.sentByName || email.sentByEmail || '-'}
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    email.status === 'sent' 
                                      ? 'bg-green-100 text-green-800' 
                                      : email.status === 'failed'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {email.status === 'sent' ? '발송완료' : 
                                     email.status === 'failed' ? '발송실패' : '대기중'}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center text-sm">
                                  {email.attachmentFiles && Array.isArray(email.attachmentFiles) && email.attachmentFiles.length > 0 ? 
                                    `${email.attachmentFiles.length}개` : '-'
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500">이메일 이력 데이터를 불러오는 중입니다.</div>
                    <p className="text-sm text-gray-400 mt-2">필터 조건을 설정하여 검색해보세요.</p>
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 보고서 생성 모달 */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              보고서 생성
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">기본 정보</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="reportTitle">보고서 제목</Label>
                  <Input
                    id="reportTitle"
                    value={reportConfig.title}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>선택된 데이터</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    총 {selectedItems.size}건의 발주 데이터가 선택되었습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 차트 옵션 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                차트 옵션
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="statusChart"
                    checked={reportConfig.includeCharts.statusDistribution}
                    onCheckedChange={(checked) => 
                      setReportConfig(prev => ({
                        ...prev,
                        includeCharts: { ...prev.includeCharts, statusDistribution: !!checked }
                      }))
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="statusChart">상태별 분포</Label>
                    <p className="text-xs text-gray-600">발주 상태별 통계 차트</p>
                  </div>
                  {reportConfig.includeCharts.statusDistribution && (
                    <Select 
                      value={reportConfig.chartTypes.statusDistribution} 
                      onValueChange={(value) => 
                        setReportConfig(prev => ({
                          ...prev,
                          chartTypes: { ...prev.chartTypes, statusDistribution: value }
                        }))
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pie">파이</SelectItem>
                        <SelectItem value="donut">도넛</SelectItem>
                        <SelectItem value="bar">막대</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="monthlyChart"
                    checked={reportConfig.includeCharts.monthlyTrend}
                    onCheckedChange={(checked) => 
                      setReportConfig(prev => ({
                        ...prev,
                        includeCharts: { ...prev.includeCharts, monthlyTrend: !!checked }
                      }))
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="monthlyChart">월별 현황</Label>
                    <p className="text-xs text-gray-600">월별 발주 추이 차트</p>
                  </div>
                  {reportConfig.includeCharts.monthlyTrend && (
                    <Select 
                      value={reportConfig.chartTypes.monthlyTrend} 
                      onValueChange={(value) => 
                        setReportConfig(prev => ({
                          ...prev,
                          chartTypes: { ...prev.chartTypes, monthlyTrend: value }
                        }))
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">막대</SelectItem>
                        <SelectItem value="line">선형</SelectItem>
                        <SelectItem value="area">영역</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vendorChart"
                    checked={reportConfig.includeCharts.vendorAnalysis}
                    onCheckedChange={(checked) => 
                      setReportConfig(prev => ({
                        ...prev,
                        includeCharts: { ...prev.includeCharts, vendorAnalysis: !!checked }
                      }))
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="vendorChart">거래처별 분석</Label>
                    <p className="text-xs text-gray-600">거래처별 발주 통계</p>
                  </div>
                  {reportConfig.includeCharts.vendorAnalysis && (
                    <Select 
                      value={reportConfig.chartTypes.vendorAnalysis} 
                      onValueChange={(value) => 
                        setReportConfig(prev => ({
                          ...prev,
                          chartTypes: { ...prev.chartTypes, vendorAnalysis: value }
                        }))
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">막대</SelectItem>
                        <SelectItem value="horizontal">가로막대</SelectItem>
                        <SelectItem value="table">테이블</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="amountChart"
                    checked={reportConfig.includeCharts.amountAnalysis}
                    onCheckedChange={(checked) => 
                      setReportConfig(prev => ({
                        ...prev,
                        includeCharts: { ...prev.includeCharts, amountAnalysis: !!checked }
                      }))
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="amountChart">금액별 분석</Label>
                    <p className="text-xs text-gray-600">발주 금액 분포 차트</p>
                  </div>
                  {reportConfig.includeCharts.amountAnalysis && (
                    <Select 
                      value={reportConfig.chartTypes.amountAnalysis} 
                      onValueChange={(value) => 
                        setReportConfig(prev => ({
                          ...prev,
                          chartTypes: { ...prev.chartTypes, amountAnalysis: value }
                        }))
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">막대</SelectItem>
                        <SelectItem value="histogram">히스토그램</SelectItem>
                        <SelectItem value="box">박스플롯</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            {/* 보고서 내용 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">보고서 내용</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="summary">자동 생성된 요약</Label>
                  <Textarea
                    id="summary"
                    value={reportConfig.summary}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, summary: e.target.value }))}
                    rows={4}
                    className="mt-1"
                    placeholder="데이터 기반 자동 요약이 여기에 표시됩니다..."
                  />
                </div>
                <div>
                  <Label htmlFor="insights">주요 인사이트</Label>
                  <Textarea
                    id="insights"
                    value={reportConfig.insights}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, insights: e.target.value }))}
                    rows={3}
                    className="mt-1"
                    placeholder="데이터에서 발견한 주요 패턴이나 인사이트를 입력하세요..."
                  />
                </div>
                <div>
                  <Label htmlFor="comments">추가 코멘트</Label>
                  <Textarea
                    id="comments"
                    value={reportConfig.comments}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, comments: e.target.value }))}
                    rows={2}
                    className="mt-1"
                    placeholder="추가적인 분석이나 권장사항을 입력하세요..."
                  />
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsReportModalOpen(false)}
              >
                취소
              </Button>
              <Button
                onClick={handleGenerateReport}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Eye className="h-4 w-4 mr-2" />
                미리보기 및 생성
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 보고서 미리보기 */}
      {showPreview && (
        <ReportPreview
          config={reportConfig}
          orders={previewOrders}
          onClose={() => setShowPreview(false)}
        />
      )}

      </div>
    </div>
  );
}