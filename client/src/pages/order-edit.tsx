import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Save, 
  ArrowLeft, 
  Trash2, 
  Edit,
  FileText,
  DollarSign,
  Package,
  Calendar,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Clock,
  Eye,
  Download
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useTheme } from "@/components/ui/theme-provider";
import { formatKoreanWon } from "@/lib/utils";
import { format } from "date-fns";
import { AttachedFilesInfo } from "@/components/attached-files-info";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderPreviewSimple } from "@/components/order-preview-simple";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OrderStatus, ApprovalStatus } from "@/lib/statusUtils";

export default function OrderEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const params = useParams();
  const orderId = params.id;
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPdfGenerateDialog, setShowPdfGenerateDialog] = useState(false);
  const [savedOrderId, setSavedOrderId] = useState<number | null>(null);
  
  console.log('OrderEdit params:', params);
  console.log('OrderEdit orderId:', orderId, typeof orderId);

  // Use a flag to track if form has been initialized to prevent infinite loops
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  const [formData, setFormData] = useState({
    projectId: "",
    vendorId: "",
    orderDate: "",
    deliveryDate: "",
    notes: "",
    templateId: "",
    items: [] as any[],
  });

  // Fetch order data
  const { data: order, isLoading: orderLoading, error: orderError } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    queryFn: () => apiRequest("GET", `/api/orders/${orderId}`),
    enabled: !!orderId,
  });

  // Debug logs
  console.log('OrderEdit Debug:', {
    orderId,
    order,
    orderLoading,
    orderError,
    enabled: !!orderId
  });

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: () => apiRequest("GET", "/api/vendors"),
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => apiRequest("GET", "/api/projects"),
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("GET", "/api/categories"),
  });

  const categories = categoriesData?.categories || [];
  const flatCategories = categoriesData?.flatCategories || [];

  // Debug category data
  console.log('Categories data:', categoriesData);
  console.log('Categories (hierarchical):', categories);
  console.log('Flat categories:', flatCategories);

  // Fetch items
  const { data: itemsData } = useQuery({
    queryKey: ["/api/items"],
    queryFn: () => apiRequest("GET", "/api/items"),
  });

  const items = itemsData?.items || [];

  useEffect(() => {
    if (order && !isFormInitialized) {
      if (items.length > 0) {
        // Map existing order items to include proper itemId based on itemName and add category fields
        const mappedItems = (order.items || []).map((item: any) => {
          // Try multiple matching strategies
          let matchingItem = null;
          
          // 1. Exact name match
          matchingItem = items.find((availableItem: any) => 
            availableItem.name === item.itemName
          );
          
          // 2. If no exact match, try partial name match
          if (!matchingItem) {
            matchingItem = items.find((availableItem: any) => 
              availableItem.name.includes(item.itemName) || item.itemName.includes(availableItem.name)
            );
          }
          
          // 3. If still no match, try by existing itemId
          if (!matchingItem && item.itemId) {
            matchingItem = items.find((availableItem: any) => 
              availableItem.id === item.itemId
            );
          }
          
          return {
            itemId: matchingItem?.id || null,
            itemName: item.itemName || "",
            quantity: parseFloat(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0,
            specification: item.specification || "",
            notes: item.notes || "",
            unit: item.unit || "EA",
            majorCategory: item.majorCategory || "",
            middleCategory: item.middleCategory || "",
            minorCategory: item.minorCategory || "",
          };
        });

        setFormData({
          projectId: order.projectId?.toString() || "",
          vendorId: order.vendorId?.toString() || "",
          orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : "",
          deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : "",
          notes: order.notes || "",
          templateId: order.templateId?.toString() || "",
          items: mappedItems,
        });
      } else {
        // If items haven't loaded yet, set basic form data without items
        setFormData({
          projectId: order.projectId?.toString() || "",
          vendorId: order.vendorId?.toString() || "",
          orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : "",
          deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : "",
          notes: order.notes || "",
          templateId: order.templateId?.toString() || "",
          items: order.items || [],
        });
      }
      setIsFormInitialized(true);
    }
  }, [order, items, isFormInitialized]);

  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PUT", `/api/orders/${orderId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "발주서가 수정되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      // Check if we should suggest PDF regeneration
      const orderStatus = order?.orderStatus;
      if (orderStatus === 'draft' || orderStatus === 'created') {
        setSavedOrderId(Number(orderId));
        setShowPdfGenerateDialog(true);
      } else {
        navigate(`/orders/${orderId}`);
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "발주서 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // PDF 생성 함수 - 단계별 토스트 메시지 포함
  const generatePDFForOrder = async (orderId: number) => {
    setIsGeneratingPdf(true);
    
    // Step 1: 시작
    toast({
      title: "PDF 생성 시작",
      description: "수정된 발주서 데이터를 준비하고 있습니다...",
    });
    
    try {
      // Step 2: 생성 중
      setTimeout(() => {
        toast({
          title: "PDF 생성 중",
          description: "ProfessionalPDFGenerationService를 사용하여 PDF를 생성하고 있습니다...",
        });
      }, 1000);
      
      const result = await apiRequest("POST", `/api/orders/${orderId}/regenerate-pdf`);
      
      if (result.success) {
        // Step 3: DB 저장
        toast({
          title: "데이터베이스 저장 완료",
          description: "생성된 PDF가 첨부파일로 저장되었습니다.",
        });
        
        // 발주서 데이터 새로고침
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
        
        // Step 4: 최종 완료
        setTimeout(() => {
          toast({
            title: "✅ PDF 발주서 생성 완료",
            description: "변경사항이 반영된 PDF 발주서가 성공적으로 생성되었습니다.",
            duration: 5000,
          });
        }, 500);
        
        // Navigate to order detail page after successful generation
        setTimeout(() => {
          navigate(`/orders/${orderId}`);
        }, 1500);
      } else {
        throw new Error(result.message || "PDF 생성 실패");
      }
    } catch (error: any) {
      toast({
        title: "❌ PDF 생성 실패",
        description: error.message || "PDF 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
      setShowPdfGenerateDialog(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vendorId || !formData.orderDate || formData.items.length === 0) {
      toast({
        title: "오류",
        description: "모든 필수 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      projectId: formData.projectId ? parseInt(formData.projectId) : null,
      vendorId: parseInt(formData.vendorId),
      orderDate: new Date(formData.orderDate),
      deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : null,
      notes: formData.notes,
      templateId: formData.templateId ? parseInt(formData.templateId) : null,
      items: formData.items.map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        specification: item.specification || "",
        notes: item.notes || "",
        unit: item.unit || "EA",
        majorCategory: item.majorCategory || "",
        middleCategory: item.middleCategory || "",
        minorCategory: item.minorCategory || "",
      })),
    };

    updateOrderMutation.mutate(submitData);
  };

  // PDF preview - show existing PDF or generate if not exists
  const handlePdfPreview = async () => {
    // Check if PDF already exists
    const existingPdf = order?.attachments?.find((attachment: any) => 
      attachment.mimeType === 'application/pdf' &&
      attachment.originalName?.startsWith('PO_')
    );

    if (existingPdf) {
      // Show existing PDF
      setShowPreview(true);
      return;
    }

    // No existing PDF, generate new one
    setIsGeneratingPdf(true);
    try {
      // Call server to regenerate and save PDF
      const result = await apiRequest("POST", `/api/orders/${orderId}/regenerate-pdf`);
      
      if (result.success) {
        toast({
          title: "PDF 생성 완료",
          description: "PDF가 생성되어 첨부파일에 저장되었습니다.",
        });
        
        // Refresh order data to show the new PDF
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
        
        // Show preview
        setShowPreview(true);
      }
    } catch (error: any) {
      toast({
        title: "PDF 생성 실패",
        description: error.message || "PDF 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        itemId: null,
        itemName: "",
        quantity: 1,
        unitPrice: 0,
        specification: "",
        notes: "",
        unit: "EA",
        majorCategory: "",
        middleCategory: "",
        minorCategory: "",
      }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selectedItem = items.find((item: any) => item.id.toString() === itemId);
    if (selectedItem) {
      updateItem(index, "itemId", selectedItem.id);
      updateItem(index, "itemName", selectedItem.name);
      updateItem(index, "unitPrice", selectedItem.unitPrice || 0);
      updateItem(index, "specification", selectedItem.specification || "");
    }
  };

  // Category selection helpers
  const getMajorCategories = () => {
    // Filter only major categories from flat categories
    const majorCats = flatCategories.filter((cat: any) => cat.categoryType === 'major');
    console.log('getMajorCategories result:', majorCats);
    return majorCats;
  };

  const getMiddleCategories = (majorCategoryName: string) => {
    if (!majorCategoryName || majorCategoryName === "none") return [];
    
    // Find the major category by name
    const majorCategory = flatCategories.find((cat: any) => 
      cat.categoryType === 'major' && cat.categoryName === majorCategoryName
    );
    
    if (!majorCategory) {
      console.log(`Major category not found: ${majorCategoryName}`);
      return [];
    }
    
    // Get all middle categories that belong to this major category
    const middleCats = flatCategories.filter((cat: any) => 
      cat.categoryType === 'middle' && cat.parentId === majorCategory.id
    );
    
    console.log(`Middle categories for ${majorCategoryName}:`, middleCats);
    return middleCats;
  };

  const getMinorCategories = (middleCategoryName: string) => {
    if (!middleCategoryName || middleCategoryName === "none") return [];
    
    // Find the middle category by name
    const middleCategory = flatCategories.find((cat: any) => 
      cat.categoryType === 'middle' && cat.categoryName === middleCategoryName
    );
    
    if (!middleCategory) {
      console.log(`Middle category not found: ${middleCategoryName}`);
      return [];
    }
    
    // Get all minor categories that belong to this middle category
    const minorCats = flatCategories.filter((cat: any) => 
      cat.categoryType === 'minor' && cat.parentId === middleCategory.id
    );
    
    console.log(`Minor categories for ${middleCategoryName}:`, minorCats);
    return minorCats;
  };

  const handleCategoryChange = (index: number, categoryType: 'major' | 'middle' | 'minor', value: string) => {
    console.log(`Category change: index=${index}, type=${categoryType}, value=${value}`);
    const updates: any = {};
    
    // Handle special "__CLEAR__" value for deselection
    const actualValue = value === "__CLEAR__" ? "" : value;
    console.log(`Actual value after conversion: ${actualValue}`);
    
    if (categoryType === 'major') {
      updates.majorCategory = actualValue;
      updates.middleCategory = ""; // Reset dependent categories
      updates.minorCategory = "";
    } else if (categoryType === 'middle') {
      updates.middleCategory = actualValue;
      updates.minorCategory = ""; // Reset dependent categories
    } else if (categoryType === 'minor') {
      updates.minorCategory = actualValue;
    }

    console.log(`Updates to apply:`, updates);

    // Update multiple fields at once
    setFormData(prev => {
      const newItems = prev.items.map((item, i) => 
        i === index ? { ...item, ...updates } : item
      );
      console.log(`Updated item ${index}:`, newItems[index]);
      return {
        ...prev,
        items: newItems,
      };
    });
  };

  if (orderLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (orderError) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">발주서 로드 중 오류가 발생했습니다</h1>
          <p className="mb-4 text-red-600">{orderError.message}</p>
          <Button onClick={() => navigate("/orders")}>
            발주서 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">발주서를 찾을 수 없습니다</h1>
          <p className="mb-4 text-gray-600">OrderID: {orderId}</p>
          <Button onClick={() => navigate("/orders")}>
            발주서 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1366px] mx-auto">
        {/* Page Header */}
        <div className={`shadow-sm border-b transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate(`/orders/${orderId}`)} 
                  className={`no-print h-8 px-2 transition-colors ${isDarkMode ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                  aria-label="발주서 상세로 돌아가기"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                    <Edit className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h1 className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>발주서 수정</h1>
                    <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {order?.vendor?.name} • {order?.orderDate ? format(new Date(order.orderDate), 'MM.dd') : '날짜 미정'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>총 발주금액</p>
                  <p className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatKoreanWon(formData.items.reduce((total, item) => {
                      const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                      return total + itemTotal;
                    }, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-4 space-y-4">

      <form onSubmit={handleSubmit}>
        {/* Overview Cards */}
        {order && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {/* Status Card */}
            <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="p-3">
                <span className={`text-xs block mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>진행 상태</span>
                <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                  order.status === 'draft' 
                    ? isDarkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                    : order.status === 'pending_approval'
                    ? isDarkMode ? 'bg-orange-900/20 text-orange-400' : 'bg-orange-100 text-orange-800'
                    : order.status === 'approved'
                    ? isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-800'
                    : order.status === 'sent'
                    ? isDarkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-800'
                    : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                }`}>
                  {order.status || 'N/A'}
                </div>
              </div>
            </div>

            {/* Amount Card */}
            <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-xs block mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>발주 금액</span>
                    <span className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {formatKoreanWon(formData.items.reduce((total, item) => {
                        const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                        return total + itemTotal;
                      }, 0))}
                    </span>
                  </div>
                  <DollarSign className={`h-4 w-4 mt-0.5 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
              </div>
            </div>

            {/* Items Count Card */}
            <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-xs block mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>품목 수</span>
                    <span className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formData.items.length}개</span>
                  </div>
                  <Package className={`h-4 w-4 mt-0.5 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
              </div>
            </div>

            {/* Delivery Date Card */}
            <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-xs block mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>납기일</span>
                    <span className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {order.deliveryDate ? format(new Date(order.deliveryDate), 'MM.dd') : "미정"}
                    </span>
                  </div>
                  <Calendar className={`h-4 w-4 mt-0.5 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Information Grid */}
        {order && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Order Details */}
            <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`p-4 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                    <FileText className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>발주서 정보</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>발주번호</span>
                    <span className={`font-semibold transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.orderNumber}</span>
                  </div>
                  <div>
                    <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>발주일</span>
                    <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {order.orderDate ? format(new Date(order.orderDate), 'yyyy.MM.dd') : "-"}
                    </span>
                  </div>
                  <div>
                    <span className={`block text-xs transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>시스템 등록일</span>
                    <span className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {order.createdAt ? format(new Date(order.createdAt), 'yyyy.MM.dd HH:mm') : "-"}
                    </span>
                  </div>
                  <div>
                    <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>담당자</span>
                    <div className="flex items-center gap-1">
                      <User className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {order.user?.firstName && order.user?.lastName 
                          ? `${order.user.lastName}${order.user.firstName}` 
                          : order.user?.email || "알 수 없음"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>납기일</span>
                    <div className="flex items-center gap-1">
                      <Clock className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {order.deliveryDate ? format(new Date(order.deliveryDate), 'yyyy.MM.dd') : "-"}
                      </span>
                    </div>
                  </div>
                </div>
                
                {order.notes && (
                  <div className={`pt-4 border-t transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <span className={`text-sm block mb-2 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>비고</span>
                    <div className={`text-sm p-3 rounded transition-colors ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
                      {order.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vendor Information */}
            {order.vendor && (
              <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`p-4 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                      <Building2 className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>거래처 정보</h3>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <div>
                      <span className={`text-xs block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>업체명</span>
                      <span className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {order.vendor.name}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>담당자</span>
                        <div className="flex items-center gap-1">
                          <User className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.vendor.contact || "-"}</span>
                        </div>
                      </div>
                      <div>
                        <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>전화번호</span>
                        <div className="flex items-center gap-1">
                          <Phone className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.vendor.phone || "-"}</span>
                        </div>
                      </div>
                    </div>
                    
                    {order.vendor.email && (
                      <div>
                        <span className={`text-xs block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>이메일</span>
                        <div className="flex items-center gap-1">
                          <Mail className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          <span className={`text-xs transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.vendor.email}</span>
                        </div>
                      </div>
                    )}
                    
                    {order.vendor.address && (
                      <div>
                        <span className={`text-xs block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>주소</span>
                        <div className="flex items-start gap-1">
                          <MapPin className={`h-3 w-3 mt-0.5 flex-shrink-0 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          <span className={`text-xs transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.vendor.address}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Project Information */}
            {order.project && (
              <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`p-4 border-b transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                      <Building2 className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>현장 정보</h3>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <div>
                      <span className={`text-xs block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>현장명</span>
                      <span className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {order.project.projectName}
                      </span>
                      <span className={`text-xs block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>({order.project.projectCode})</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>담당자</span>
                        <div className="flex items-center gap-1">
                          <User className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.project.projectManager || "-"}</span>
                        </div>
                      </div>
                      <div>
                        <span className={`block transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>위치</span>
                        <div className="flex items-center gap-1">
                          <MapPin className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          <span className={`transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{order.project.location || "-"}</span>
                        </div>
                      </div>
                    </div>
                    
                    {order.project.description && (
                      <div>
                        <span className={`text-xs block mb-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>설명</span>
                        <div className={`text-xs p-2 rounded transition-colors ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
                          {order.project.description}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <Card className={`mb-6 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="project">프로젝트</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="프로젝트를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor">거래처 *</Label>
                <Select
                  value={formData.vendorId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vendorId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="거래처를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors?.map((vendor: any) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderDate">발주일자 *</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, orderDate: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate">납품희망일</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">비고</Label>
              <Textarea
                id="notes"
                placeholder="추가 정보나 요청사항을 입력하세요"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={`mb-6 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>발주 품목</CardTitle>
              <Button type="button" onClick={addItem} className={`transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                <Plus className="h-4 w-4 mr-2" />
                품목 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {formData.items.length === 0 ? (
              <div className={`text-center py-8 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                발주할 품목을 추가해주세요
              </div>
            ) : (
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <Card key={index} className={`p-4 border transition-all ${isDarkMode ? 'bg-gradient-to-br from-gray-700 to-gray-800 hover:shadow-lg border-gray-600' : 'bg-gradient-to-br from-gray-50 to-white hover:shadow-md border-gray-200'}`}>
                    {/* 헤더: 순번과 삭제 버튼 */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-sm transition-colors ${isDarkMode ? 'bg-blue-900/20 text-blue-300 border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          품목 #{index + 1}
                        </Badge>
                        <span className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {item.itemName ? `• ${item.itemName}` : ''}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className={`h-8 w-8 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-red-950' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* 첫 번째 행: 기본 정보 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-3">
                      <div className="col-span-2 sm:col-span-3 md:col-span-2">
                        <Label className={`text-xs font-medium mb-1 block transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>품목명 *</Label>
                        <Select
                          value={item.itemId?.toString() || ""}
                          onValueChange={(value) => handleItemSelect(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={item.itemName || "품목 선택"} />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((availableItem: any) => (
                              <SelectItem key={availableItem.id} value={availableItem.id.toString()}>
                                {availableItem.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className={`text-xs font-medium mb-1 block transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>수량 *</Label>
                        <Input
                          type="number"
                          value={item.quantity || 0}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || value === "0") {
                              updateItem(index, "quantity", 0);
                            } else {
                              const numValue = parseFloat(value);
                              if (!isNaN(numValue) && numValue >= 0) {
                                updateItem(index, "quantity", numValue);
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value);
                            if (isNaN(value) || value <= 0) {
                              updateItem(index, "quantity", 1);
                            }
                          }}
                          min="0.01"
                          step="0.01"
                          required
                          className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      </div>
                      
                      <div>
                        <Label className={`text-xs font-medium mb-1 block transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>단위</Label>
                        <Select
                          value={item.unit || "EA"}
                          onValueChange={(value) => {
                            console.log(`Unit selected: ${value}`);
                            updateItem(index, "unit", value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="단위 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EA">EA</SelectItem>
                            <SelectItem value="개">개</SelectItem>
                            <SelectItem value="박스">박스</SelectItem>
                            <SelectItem value="세트">세트</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="mL">mL</SelectItem>
                            <SelectItem value="m">m</SelectItem>
                            <SelectItem value="cm">cm</SelectItem>
                            <SelectItem value="mm">mm</SelectItem>
                            <SelectItem value="㎡">㎡</SelectItem>
                            <SelectItem value="㎥">㎥</SelectItem>
                            <SelectItem value="매">매</SelectItem>
                            <SelectItem value="장">장</SelectItem>
                            <SelectItem value="권">권</SelectItem>
                            <SelectItem value="부">부</SelectItem>
                            <SelectItem value="대">대</SelectItem>
                            <SelectItem value="식">식</SelectItem>
                            <SelectItem value="조">조</SelectItem>
                            <SelectItem value="타">타</SelectItem>
                            <SelectItem value="켤레">켤레</SelectItem>
                            <SelectItem value="통">통</SelectItem>
                            <SelectItem value="병">병</SelectItem>
                            <SelectItem value="캔">캔</SelectItem>
                            <SelectItem value="포">포</SelectItem>
                            <SelectItem value="봉">봉</SelectItem>
                            <SelectItem value="팩">팩</SelectItem>
                            <SelectItem value="롤">롤</SelectItem>
                            <SelectItem value="쌍">쌍</SelectItem>
                            <SelectItem value="톤">톤</SelectItem>
                            <SelectItem value="되">되</SelectItem>
                            <SelectItem value="말">말</SelectItem>
                            <SelectItem value="자루">자루</SelectItem>
                            <SelectItem value="마리">마리</SelectItem>
                            <SelectItem value="모">모</SelectItem>
                            <SelectItem value="평">평</SelectItem>
                            <SelectItem value="보루">보루</SelectItem>
                            <SelectItem value="묶음">묶음</SelectItem>
                            <SelectItem value="다스">다스</SelectItem>
                            <SelectItem value="갑">갑</SelectItem>
                            <SelectItem value="곽">곽</SelectItem>
                            <SelectItem value="판">판</SelectItem>
                            <SelectItem value="그루">그루</SelectItem>
                            <SelectItem value="주">주</SelectItem>
                            <SelectItem value="본">본</SelectItem>
                            <SelectItem value="줄">줄</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className={`text-xs font-medium mb-1 block transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>단가</Label>
                        <Input
                          type="number"
                          value={item.unitPrice || 0}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || value === "0") {
                              updateItem(index, "unitPrice", 0);
                            } else {
                              const numValue = parseFloat(value);
                              if (!isNaN(numValue) && numValue >= 0) {
                                updateItem(index, "unitPrice", numValue);
                              }
                            }
                          }}
                          min="0"
                          step="0.01"
                          className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      </div>
                      
                      <div>
                        <Label className={`text-xs font-medium mb-1 block transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>총액</Label>
                        <div className={`h-10 px-3 py-2 border rounded-md flex items-center font-semibold transition-colors ${isDarkMode ? 'bg-blue-900/20 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                          ₩{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    </div>

                    {/* 두 번째 행: 상세 정보 */}
                    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 border-t pt-3 mt-3 transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <div>
                        <Label className={`text-xs font-medium mb-1 block transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>대분류</Label>
                        <Select
                          value={item.majorCategory || ""}
                          onValueChange={(value) => {
                            console.log(`Major category selected: ${value}`);
                            handleCategoryChange(index, "major", value);
                          }}
                        >
                          <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}>
                            <SelectValue placeholder="대분류 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__CLEAR__">선택 해제</SelectItem>
                            {getMajorCategories().map((category: any) => (
                              <SelectItem key={`major-${category.id}`} value={category.categoryName}>
                                {category.categoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className={`text-xs font-medium mb-1 block transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>중분류</Label>
                        <Select
                          value={item.middleCategory || ""}
                          onValueChange={(value) => {
                            console.log(`Middle category selected: ${value}`);
                            handleCategoryChange(index, "middle", value);
                          }}
                          disabled={!item.majorCategory}
                        >
                          <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}>
                            <SelectValue placeholder={item.majorCategory ? "중분류 선택" : "대분류 먼저 선택"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__CLEAR__">선택 해제</SelectItem>
                            {getMiddleCategories(item.majorCategory || "").map((category: any) => (
                              <SelectItem key={`middle-${category.id}`} value={category.categoryName}>
                                {category.categoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className={`text-xs font-medium mb-1 block transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>소분류</Label>
                        <Select
                          value={item.minorCategory || ""}
                          onValueChange={(value) => {
                            console.log(`Minor category selected: ${value}`);
                            handleCategoryChange(index, "minor", value);
                          }}
                          disabled={!item.middleCategory}
                        >
                          <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}>
                            <SelectValue placeholder={item.middleCategory ? "소분류 선택" : "중분류 먼저 선택"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__CLEAR__">선택 해제</SelectItem>
                            {getMinorCategories(item.middleCategory || "").map((category: any) => (
                              <SelectItem key={`minor-${category.id}`} value={category.categoryName}>
                                {category.categoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className={`text-xs font-medium mb-1 block transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>규격</Label>
                        <Input
                          value={item.specification}
                          onChange={(e) => updateItem(index, "specification", e.target.value)}
                          placeholder="규격 입력"
                          className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      </div>
                      
                      <div>
                        <Label className={`text-xs font-medium mb-1 block transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>비고</Label>
                        <Input
                          value={item.notes}
                          onChange={(e) => updateItem(index, "notes", e.target.value)}
                          placeholder="비고 입력"
                          className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Items Summary */}
            {formData.items.length > 0 && (
              <div className="mt-6 space-y-4">
                {/* Category Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50'}`}>
                    <div className={`text-sm mb-1 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>총 품목 수</div>
                    <div className={`text-xl font-bold transition-colors ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>{formData.items.length}개</div>
                  </div>
                  <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-green-900/20 border border-green-700' : 'bg-green-50'}`}>
                    <div className={`text-sm mb-1 transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>총 수량</div>
                    <div className={`text-xl font-bold transition-colors ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                      {formData.items.reduce((total, item) => total + (Number(item.quantity) || 0), 0)}
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-purple-900/20 border border-purple-700' : 'bg-purple-50'}`}>
                    <div className={`text-sm mb-1 transition-colors ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>대분류 수</div>
                    <div className={`text-xl font-bold transition-colors ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                      {new Set(formData.items.map(item => item.majorCategory).filter(cat => cat)).size}개
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-orange-900/20 border border-orange-700' : 'bg-orange-50'}`}>
                    <div className={`text-sm mb-1 transition-colors ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>총 합계 금액</div>
                    <div className={`text-xl font-bold transition-colors ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                      ₩{formData.items.reduce((total, item) => {
                        const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                        return total + itemTotal;
                      }, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attachments Section */}
        {order?.attachments && order.attachments.length > 0 && (
          <Card className={`mb-6 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>첨부파일</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePdfPreview}
                    disabled={isGeneratingPdf}
                    className={`h-8 px-3 text-xs transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {isGeneratingPdf ? (
                      <>
                        <div className="animate-spin h-3 w-3 mr-1 border border-gray-300 border-t-transparent rounded-full"></div>
                        생성 중...
                      </>
                    ) : (() => {
                      const existingPdf = order?.attachments?.find((attachment: any) => 
                        attachment.mimeType === 'application/pdf' &&
                        attachment.originalName?.startsWith('PO_')
                      );
                      return existingPdf ? (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          PDF 미리보기
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          PDF 생성 및 미리보기
                        </>
                      );
                    })()}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AttachedFilesInfo 
                attachments={order.attachments} 
                orderId={order.id}
                isDarkMode={isDarkMode}
              />
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/orders/${orderId}`)}
            className={`transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={updateOrderMutation.isPending}
            className={`transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateOrderMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
      </div>

      {/* PDF Preview Dialog */}
      {showPreview && order && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>발주서 미리보기</DialogTitle>
            </DialogHeader>
            <OrderPreviewSimple order={order} />
          </DialogContent>
        </Dialog>
      )}
      
      {/* PDF 생성 확인 다이얼로그 */}
      <AlertDialog open={showPdfGenerateDialog} onOpenChange={setShowPdfGenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>PDF 발주서 생성</AlertDialogTitle>
            <AlertDialogDescription>
              변경된 정보가 반영된 PDF 발주서를 지금 생성하시겠습니까?
              생성된 PDF는 첨부파일로 저장되며 언제든지 다운로드할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate(`/orders/${orderId}`)}>
              나중에
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (savedOrderId) {
                  await generatePDFForOrder(savedOrderId);
                }
              }}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? "생성 중..." : "생성"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}