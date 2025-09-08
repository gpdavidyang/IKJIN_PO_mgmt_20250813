import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Upload, FileText, Copy } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatKoreanWon } from "@/lib/utils";
import { ExcelLikeOrderForm } from "./excel-like-order-form";
import { useTheme } from "@/components/ui/theme-provider";
import { OrderCreationProgress } from "./order-creation-progress";

const orderItemSchema = z.object({
  itemId: z.number().optional(),
  itemName: z.string().min(1, "품목명을 입력하세요"),
  specification: z.string().optional(),
  majorCategory: z.string().optional(),
  middleCategory: z.string().optional(),
  minorCategory: z.string().optional(),
  quantity: z.number().positive("수량은 0보다 커야 합니다"),
  unitPrice: z.number().positive("단가는 0보다 커야 합니다"),
  notes: z.string().optional(),
});

const orderSchema = z.object({
  templateId: z.number().optional(),
  projectId: z.number().min(1, "현장을 선택하세요"),
  vendorId: z.number().min(1, "거래처를 선택하세요"),
  orderDate: z.string().min(1, "발주일자를 선택하세요"),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "최소 하나의 품목을 추가하세요"),
  customFields: z.record(z.any()).optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderFormProps {
  orderId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  preselectedTemplateId?: number;
}

export function OrderForm({ orderId, onSuccess, onCancel, preselectedTemplateId }: OrderFormProps) {
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  // 템플릿 기능 비활성화
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<any>(null);
  const [hasLoadedOrderData, setHasLoadedOrderData] = useState(false); // 데이터 로드 플래그 추가
  
  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        console.log('Loading templates...');
        
        const response = await fetch('/api/admin/templates', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include',
        });
        
        console.log('Template response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Templates loaded:', data);
        setTemplates(data);
        setTemplatesError(null);
      } catch (error) {
        console.error('Error loading templates:', error);
        setTemplatesError(error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);
  
  // Fetch selected template details
  const { data: templateDetails } = useQuery({
    queryKey: ['/api/admin/templates', selectedTemplateId],
    enabled: !!selectedTemplateId,
    retry: 1
  });
  
  // Define selectedTemplate from templateDetails
  const selectedTemplate = templateDetails;
  
  // Fetch items from database
  const { data: itemsData, isLoading: isLoadingItems, error: itemsError } = useQuery({
    queryKey: ['/api/items'],
    select: (data: any) => data.items || [],
    retry: 1
  });

  // Fetch categories from category management
  const { data: categoriesResponse, isLoading: isLoadingCategories, error: categoriesError } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      console.log('🔍 Fetching categories from /api/categories');
      const response = await fetch('/api/categories', {
        credentials: 'include'
      });
      console.log('🔍 Categories response status:', response.status);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      console.log('🔍 Categories response data:', data);
      return data;
    },
    retry: 1
  });
  
  const categories = categoriesResponse?.categories || [];
  const flatCategories = categoriesResponse?.flatCategories || [];
  
  // Extract different category types from flat structure for easier filtering
  const majorCategories = flatCategories.filter((cat: any) => cat.categoryType === 'major');
  const middleCategories = flatCategories.filter((cat: any) => cat.categoryType === 'middle');  
  const minorCategories = flatCategories.filter((cat: any) => cat.categoryType === 'minor');

  // Fetch projects from database
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
    retry: 1
  });

  // Debug logs
  console.log('Items data:', itemsData);
  console.log('Templates data:', templates);
  console.log('Templates loading:', isLoadingTemplates);
  console.log('Templates error:', templatesError);
  console.log('API endpoint test for templates');
  console.log('🔍 Categories debug:', {
    isLoadingCategories,
    categoriesError,
    categoriesResponse,
    majorCategoriesCount: majorCategories?.length,
    middleCategoriesCount: middleCategories?.length,
    minorCategoriesCount: minorCategories?.length
  });
  
  const [orderItems, setOrderItems] = useState([
    {
      itemId: 0,
      itemName: "",
      specification: "",
      majorCategory: "",
      middleCategory: "",
      minorCategory: "",
      quantity: 0,
      unitPrice: 0,
      notes: "",
    }
  ]);

  // State to track display values for unit prices
  const [unitPriceDisplayValues, setUnitPriceDisplayValues] = useState<string[]>(['']);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedProjectInfo, setSelectedProjectInfo] = useState<any>(null);
  const [selectedVendorInfo, setSelectedVendorInfo] = useState<any>(null);
  
  // Progress tracking states
  const [showProgress, setShowProgress] = useState(false);
  const [progressSessionId, setProgressSessionId] = useState<string | null>(null);

  // Helper functions for currency formatting
  const formatCurrencyInput = (value: number): string => {
    if (value === 0 || isNaN(value)) return '';
    return formatKoreanWon(value);
  };

  const parseCurrencyInput = (value: string): number => {
    const cleanValue = value.replace(/[₩,\s]/g, '');
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
  };

  // Initialize React Hook Form first
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      templateId: undefined,
      projectId: 0,
      vendorId: 0,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: "",
      notes: "",
      items: orderItems,
      customFields: {},
    },
  });



  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: orderData, isLoading: orderLoading } = useQuery({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      // Generate session ID for progress tracking
      const sessionId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setProgressSessionId(sessionId);
      setShowProgress(true);
      
      // Prepare FormData for unified service
      const formData = new FormData();
      
      // Add order data
      formData.append('method', 'manual');
      formData.append('projectId', data.projectId.toString());
      formData.append('vendorId', data.vendorId.toString());
      formData.append('orderDate', data.orderDate);
      if (data.deliveryDate) formData.append('deliveryDate', data.deliveryDate);
      if (data.notes) formData.append('notes', data.notes);
      if (data.customFields) formData.append('customFields', JSON.stringify(data.customFields));
      
      // Add items data
      formData.append('items', JSON.stringify(orderItems.map(item => ({
        ...item,
        itemId: Number(item.itemId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalAmount: (item.quantity || 0) * (item.unitPrice || 0),
      }))));
      
      // Add attached files
      uploadedFiles.forEach(file => {
        formData.append('attachments', file);
      });
      
      const response = await fetch('/api/orders/create-unified', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Order creation failed');
      }
      
      return response.json();
    },
    onSuccess: (result: any) => {
      setShowProgress(false);
      setProgressSessionId(null);
      
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "성공",
        description: `발주서가 생성되었습니다. (${result.orderNumber || result.orderId})`,
      });
      onSuccess?.();
    },
    onError: (error) => {
      setShowProgress(false);
      setProgressSessionId(null);
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "발주서 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const { items, ...orderData } = data;
      
      // Update order
      await apiRequest("PUT", `/api/orders/${orderId}`, {
        ...orderData,
        items: items.map(item => ({
          ...item,
          totalAmount: (item.quantity || 0) * (item.unitPrice || 0),
        })),
      });
      
      // Upload new files if any
      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach(file => {
          formData.append('files', file);
        });
        
        await apiRequest("POST", `/api/orders/${orderId}/attachments`, formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      toast({
        title: "성공",
        description: "발주서가 수정되었습니다.",
      });
      onSuccess?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
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

  // Load existing order data for editing
  useEffect(() => {
    if (orderData && !orderLoading && typeof orderData === 'object' && !hasLoadedOrderData) {
      const order = orderData as any;
      
      // Convert existing items to include itemId if missing
      const convertedItems = (order.items || []).map((item: any) => ({
        itemId: item.itemId || 0,
        itemName: item.itemName,
        specification: item.specification || "",
        majorCategory: item.majorCategory || "",
        middleCategory: item.middleCategory || "",
        minorCategory: item.minorCategory || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes || "",
      }));
      
      reset({
        vendorId: order.vendorId,
        orderDate: new Date(order.orderDate).toISOString().split('T')[0],
        deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : "",
        notes: order.notes || "",
        items: convertedItems,
      });
      setOrderItems(convertedItems);
      setHasLoadedOrderData(true); // 데이터가 로드되었음을 표시
    }
  }, [orderData, orderLoading, hasLoadedOrderData]); // 플래그를 의존성에 추가

  const addOrderItem = () => {
    // Get the last item to copy its values, or use empty values if no items exist
    const lastItem = orderItems.length > 0 ? orderItems[orderItems.length - 1] : null;
    const lastDisplayValue = unitPriceDisplayValues.length > 0 ? unitPriceDisplayValues[unitPriceDisplayValues.length - 1] : '';
    
    const newItem = lastItem ? {
      itemId: lastItem.itemId,
      itemName: lastItem.itemName,
      specification: lastItem.specification,
      majorCategory: lastItem.majorCategory,
      middleCategory: lastItem.middleCategory,
      minorCategory: lastItem.minorCategory,
      quantity: lastItem.quantity,
      unitPrice: lastItem.unitPrice,
      notes: lastItem.notes,
    } : {
      itemId: 0,
      itemName: "",
      specification: "",
      majorCategory: "",
      middleCategory: "",
      minorCategory: "",
      quantity: 0,
      unitPrice: 0,
      notes: "",
    };
    
    const newItems = [...orderItems, newItem];
    setOrderItems(newItems);
    setValue("items", newItems);
    // Update display values array with copied value
    setUnitPriceDisplayValues([...unitPriceDisplayValues, lastDisplayValue]);
  };

  const copyOrderItem = (index: number) => {
    const itemToCopy = orderItems[index];
    const displayValueToCopy = unitPriceDisplayValues[index] || '';
    
    const copiedItem = {
      itemId: itemToCopy.itemId,
      itemName: itemToCopy.itemName,
      specification: itemToCopy.specification,
      majorCategory: itemToCopy.majorCategory,
      middleCategory: itemToCopy.middleCategory,
      minorCategory: itemToCopy.minorCategory,
      quantity: itemToCopy.quantity,
      unitPrice: itemToCopy.unitPrice,
      notes: itemToCopy.notes,
    };
    
    const newItems = [...orderItems, copiedItem];
    setOrderItems(newItems);
    setValue("items", newItems);
    // Update display values array with copied value
    setUnitPriceDisplayValues([...unitPriceDisplayValues, displayValueToCopy]);
  };

  const removeOrderItem = (index: number) => {
    if (orderItems.length === 1) return;
    
    const newItems = orderItems.filter((_, i) => i !== index);
    const newDisplayValues = unitPriceDisplayValues.filter((_, i) => i !== index);
    setOrderItems(newItems);
    setValue("items", newItems);
    setUnitPriceDisplayValues(newDisplayValues);
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // 계층 구조에 따라 하위 카테고리 초기화
    if (field === "majorCategory") {
      newItems[index].middleCategory = "";
      newItems[index].minorCategory = "";
    } else if (field === "middleCategory") {
      newItems[index].minorCategory = "";
    }
    
    setOrderItems(newItems);
    setValue("items", newItems);
  };

  // 대분류에 따른 중분류 필터링
  const getMiddleCategoriesForMajor = (majorCategoryName: string) => {
    console.log('🔍 getMiddleCategoriesForMajor called with:', majorCategoryName);
    console.log('🔍 Major categories available:', majorCategories?.length);
    console.log('🔍 Middle categories available:', middleCategories?.length);
    
    if (!majorCategoryName) {
      console.log('❌ No major category name provided');
      return [];
    }
    
    const majorCategory = majorCategories.find((cat: any) => cat.categoryName === majorCategoryName);
    console.log('🔍 Found major category:', majorCategory);
    
    if (!majorCategory) {
      console.log('❌ Major category not found');
      console.log('Available major categories:', majorCategories?.map(cat => cat.categoryName));
      return [];
    }
    
    const filteredMiddle = middleCategories.filter((cat: any) => cat.parentId === majorCategory.id);
    console.log('🔍 Filtered middle categories:', filteredMiddle);
    
    return filteredMiddle;
  };

  // 중분류에 따른 소분류 필터링
  const getMinorCategoriesForMiddle = (middleCategoryName: string) => {
    if (!middleCategoryName) return [];
    const middleCategory = middleCategories.find((cat: any) => cat.categoryName === middleCategoryName);
    if (!middleCategory) return [];
    return minorCategories.filter((cat: any) => cat.parentId === middleCategory.id);
  };

  const handleItemSelect = (index: number, itemId: number) => {
    const selectedItem = itemsData?.find((item: any) => item.id === itemId);
    if (selectedItem) {
      const newItems = [...orderItems];
      const standardPrice = parseFloat(selectedItem.standardPrice) || 0;
      newItems[index] = {
        ...newItems[index],
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        specification: selectedItem.specification || "",
        majorCategory: selectedItem.majorCategory || "",
        middleCategory: selectedItem.middleCategory || "",
        minorCategory: selectedItem.minorCategory || "",
        unitPrice: standardPrice,
      };
      setOrderItems(newItems);
      setValue("items", newItems);
      
      // Update display value for the unit price
      const newDisplayValues = [...unitPriceDisplayValues];
      newDisplayValues[index] = formatCurrencyInput(standardPrice);
      setUnitPriceDisplayValues(newDisplayValues);
    }
  };

  const calculateTotalAmount = (item: any) => {
    return (item.quantity || 0) * (item.unitPrice || 0);
  };

  const calculateGrandTotal = () => {
    return orderItems.reduce((total, item) => total + calculateTotalAmount(item), 0);
  };

  // 공통 파일 검증 및 처리 함수
  const processFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const maxSize = 50 * 1024 * 1024; // 50MB로 증가
      
      // 파일 크기만 검증 (모든 파일 형식 허용)
      if (file.size > maxSize) {
        toast({
          title: "파일 크기 오류",
          description: `${file.name}은(는) 파일 크기가 50MB를 초과합니다.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      toast({
        title: "파일 업로드",
        description: `${validFiles.length}개의 파일이 첨부되었습니다.`,
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
    // Reset input value to allow same file selection again
    if (event.target) {
      event.target.value = '';
    }
  };

  // 드래그 이벤트 핸들러들
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragOver to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Progress handlers
  const handleProgressComplete = (result: any) => {
    setShowProgress(false);
    setProgressSessionId(null);
    
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    toast({
      title: "성공",
      description: `발주서가 생성되었습니다. (${result.orderNumber || result.orderId})`,
    });
    onSuccess?.();
  };

  const handleProgressError = (error: string) => {
    setShowProgress(false);
    setProgressSessionId(null);
    
    toast({
      title: "오류",
      description: error || "발주서 생성에 실패했습니다.",
      variant: "destructive",
    });
  };

  const handleProgressCancel = () => {
    setShowProgress(false);
    setProgressSessionId(null);
    
    toast({
      title: "취소",
      description: "발주서 생성이 취소되었습니다.",
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Template-specific field renderers
  const renderDynamicTemplateFields = () => {
    if (!selectedTemplate?.fieldsConfig) return null;

    try {
      const fieldsConfig = typeof selectedTemplate.fieldsConfig === 'string' 
        ? JSON.parse(selectedTemplate.fieldsConfig) 
        : selectedTemplate.fieldsConfig;

      const fieldSections = [];

      // 템플릿 타입에 따라 섹션 구성
      if (selectedTemplate.templateType === 'material_extrusion') {
        if (fieldsConfig.basic_fields) fieldSections.push({ key: 'basic_fields', name: '기본 정보', fields: fieldsConfig.basic_fields });
        if (fieldsConfig.extrusion_list) fieldSections.push({ key: 'extrusion_list', name: '압출 목록', fields: fieldsConfig.extrusion_list });
        if (fieldsConfig.schedule_fields) fieldSections.push({ key: 'schedule_fields', name: '일정 정보', fields: fieldsConfig.schedule_fields });
        if (fieldsConfig.specification_fields) fieldSections.push({ key: 'specification_fields', name: '사양 정보', fields: fieldsConfig.specification_fields });
      } else if (selectedTemplate.templateType === 'panel_manufacturing') {
        if (fieldsConfig.basic_fields) fieldSections.push({ key: 'basic_fields', name: '기본 정보', fields: fieldsConfig.basic_fields });
        if (fieldsConfig.color_breakdown) fieldSections.push({ key: 'color_breakdown', name: '색상 분류', fields: fieldsConfig.color_breakdown });
        if (fieldsConfig.material_fields) fieldSections.push({ key: 'material_fields', name: '재료 정보', fields: fieldsConfig.material_fields });
        if (fieldsConfig.panel_breakdown) fieldSections.push({ key: 'panel_breakdown', name: '판넬 분류', fields: fieldsConfig.panel_breakdown });
        if (fieldsConfig.delivery_schedule) fieldSections.push({ key: 'delivery_schedule', name: '배송 일정', fields: fieldsConfig.delivery_schedule });
        if (fieldsConfig.insulation_details) fieldSections.push({ key: 'insulation_details', name: '단열재 상세', fields: fieldsConfig.insulation_details });
      } else if (fieldsConfig.fields && Array.isArray(fieldsConfig.fields)) {
        // 새로운 필드 구조
        const groupedFields = fieldsConfig.fields.reduce((acc: any, field: any) => {
          const section = field.sectionName || '기본 정보';
          if (!acc[section]) acc[section] = [];
          acc[section].push(field);
          return acc;
        }, {});
        
        Object.entries(groupedFields).forEach(([sectionName, fields]: [string, any]) => {
          fieldSections.push({ key: sectionName, name: sectionName, fields: fields });
        });
      }

      if (fieldSections.length === 0) return null;

      return fieldSections.map((section) => (
        <Card key={section.key} className={`mb-4 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{section.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Array.isArray(section.fields) 
                ? section.fields.map((field: any) => renderDynamicField(field))
                : Object.entries(section.fields).map(([key, label]) => 
                    renderDynamicField({
                      fieldName: key,
                      label: label as string,
                      fieldType: key.includes('date') ? 'date' : 
                                key.includes('amount') || key.includes('price') || 
                                key.includes('quantity') || key.includes('count') || 
                                key.includes('weight') || key.includes('kg') || 
                                key.includes('area') || key === 'quantity' ? 'number' : 'text'
                    })
                  )
              }
            </div>
          </CardContent>
        </Card>
      ));
    } catch (error) {
      console.error('Error rendering dynamic template fields:', error);
      return null;
    }
  };

  const renderDynamicField = (field: any) => {
    const fieldKey = field.fieldName || field.id;
    const fieldLabel = field.label;
    const fieldType = field.fieldType || 'text';
    
    return (
      <div key={fieldKey}>
        <Label htmlFor={fieldKey} className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{fieldLabel}</Label>
        <Input
          id={fieldKey}
          type={fieldType}
          placeholder={`${fieldLabel}을 입력하세요`}
          className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
          onChange={(e) => {
            const customFields = watch('customFields') || {};
            setValue('customFields', {
              ...customFields,
              [fieldKey]: e.target.value
            });
          }}
        />
      </div>
    );
  };



  const onSubmit = (data: OrderFormData) => {
    const vendorId = Number(data.vendorId);
    if (!vendorId || vendorId === 0) {
      toast({
        title: "오류",
        description: "거래처를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    const projectId = Number(data.projectId);
    if (!projectId || projectId === 0) {
      toast({
        title: "오류",
        description: "현장을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (orderItems.length === 0) {
      toast({
        title: "오류",
        description: "최소 하나의 품목을 추가해야 합니다.",
        variant: "destructive",
      });
      return;
    }

    const formData: OrderFormData = {
      ...data,
      vendorId,
      projectId,
      orderDate: data.orderDate,
      deliveryDate: data.deliveryDate || undefined,
      items: orderItems,
    };
    
    if (orderId) {
      updateOrderMutation.mutate(formData);
    } else {
      createOrderMutation.mutate(formData);
    }
  };

  if (orderLoading && orderId) {
    return <div className="p-6">Loading...</div>;
  }

  // 템플릿 기능 비활성화 - ExcelLikeOrderForm 사용하지 않음

  return (
    <div className={`max-w-[1366px] mx-auto compact-form space-y-3 pb-20 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`} key={`general-${selectedTemplateId}`}>
      {/* Progress indicator */}
      {showProgress && progressSessionId && (
        <OrderCreationProgress
          sessionId={progressSessionId}
          onComplete={handleProgressComplete}
          onError={handleProgressError}
          onCancel={handleProgressCancel}
          showCancelButton={true}
        />
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="projectId" className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>현장 *</Label>
                <Select 
                  onValueChange={(value) => {
                    const projectId = parseInt(value);
                    setValue("projectId", projectId);
                    
                    // Find and store selected project info
                    const selectedProject = (projectsData as any[])?.find(p => p.id === projectId);
                    if (selectedProject) {
                      setSelectedProjectInfo(selectedProject);
                    }
                  }}
                >
                  <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                    <SelectValue placeholder="현장을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                    {isLoadingProjects ? (
                      <SelectItem value="loading" disabled>로딩 중...</SelectItem>
                    ) : (projectsData as any[])?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.projectName} ({project.projectCode})
                      </SelectItem>
                    )) || (
                      <SelectItem value="no-projects" disabled>현장이 없습니다</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.projectId && (
                  <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>{errors.projectId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="vendorId" className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>거래처 *</Label>
                <Select onValueChange={(value) => {
                  const vendorId = parseInt(value);
                  setValue("vendorId", vendorId);
                  
                  // Find and store selected vendor info
                  const selectedVendor = vendors?.find((v: any) => v.id === vendorId);
                  if (selectedVendor) {
                    setSelectedVendorInfo(selectedVendor);
                  }
                }}>
                  <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                    <SelectValue placeholder="거래처를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className={`z-[100] dropdown-high-priority transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`} style={{ position: 'fixed', zIndex: 9999 }}>
                    {vendors?.map((vendor: any) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendorId && (
                  <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>{errors.vendorId.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="orderDate" className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>발주서 작성일 *</Label>
                <Input
                  id="orderDate"
                  type="date"
                  className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                  {...register("orderDate")}
                />
                {errors.orderDate && (
                  <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>{errors.orderDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="deliveryDate" className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>납품 희망일</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                  {...register("deliveryDate")}
                />
              </div>

            </div>

            {/* Selected Project and Vendor Information */}
            {(selectedProjectInfo || selectedVendorInfo) && (
              <div className={`mt-4 pt-4 border-t transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Project Information */}
                  {selectedProjectInfo && (
                    <div className={`p-3 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50'}`}>
                      <h4 className={`font-medium mb-2 transition-colors ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>현장 정보</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className={`font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>현장명:</span>
                          <span className={`ml-2 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedProjectInfo.projectName}</span>
                        </div>
                        {selectedProjectInfo.location && (
                          <div>
                            <span className={`font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>주소:</span>
                            <span className={`ml-2 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedProjectInfo.location}</span>
                          </div>
                        )}
                        {selectedProjectInfo.projectManager && (
                          <div>
                            <span className={`font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>현장 관리자:</span>
                            <span className={`ml-2 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedProjectInfo.projectManager}</span>
                          </div>
                        )}
                        {selectedProjectInfo.managerPhone && (
                          <div>
                            <span className={`font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>전화번호:</span>
                            <span className={`ml-2 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedProjectInfo.managerPhone}</span>
                          </div>
                        )}
                        {selectedProjectInfo.managerEmail && (
                          <div>
                            <span className={`font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>이메일:</span>
                            <span className={`ml-2 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedProjectInfo.managerEmail}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vendor Information */}
                  {selectedVendorInfo && (
                    <div className={`p-3 rounded-lg transition-colors ${isDarkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50'}`}>
                      <h4 className={`font-medium mb-2 transition-colors ${isDarkMode ? 'text-green-300' : 'text-green-900'}`}>거래처 정보</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className={`font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>거래처명:</span>
                          <span className={`ml-2 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedVendorInfo.name}</span>
                        </div>
                        {selectedVendorInfo.contactPerson && (
                          <div>
                            <span className={`font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>담당자:</span>
                            <span className={`ml-2 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedVendorInfo.contactPerson}</span>
                          </div>
                        )}
                        {selectedVendorInfo.phone && (
                          <div>
                            <span className={`font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>연락처:</span>
                            <span className={`ml-2 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedVendorInfo.phone}</span>
                          </div>
                        )}
                        {selectedVendorInfo.email && (
                          <div>
                            <span className={`font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>이메일:</span>
                            <span className={`ml-2 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedVendorInfo.email}</span>
                          </div>
                        )}
                        {selectedVendorInfo.address && (
                          <div>
                            <span className={`font-medium transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>주소:</span>
                            <span className={`ml-2 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedVendorInfo.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Dynamic Custom Fields based on selected template */}
        {selectedTemplate && renderDynamicTemplateFields()}

        <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-lg transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>발주 품목</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                <Plus className="h-4 w-4 mr-1" />
                품목 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2">품목명</TableHead>
                    <TableHead className="py-2">규격</TableHead>
                    <TableHead className="py-2">대분류</TableHead>
                    <TableHead className="py-2">중분류</TableHead>
                    <TableHead className="py-2">소분류</TableHead>
                    <TableHead className="py-2">수량</TableHead>
                    <TableHead className="py-2">단가</TableHead>
                    <TableHead className="py-2">금액</TableHead>
                    <TableHead className="py-2">비고</TableHead>
                    <TableHead className="py-2 text-center">복사</TableHead>
                    <TableHead className="py-2 text-center">삭제</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="py-1">
                        <div className="min-w-[180px]">
                          <Input
                            className={`h-8 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                            placeholder="품목명을 입력하세요"
                            value={item.itemName}
                            onChange={(e) => updateOrderItem(index, "itemName", e.target.value)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          className={`h-8 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          placeholder="규격"
                          value={item.specification}
                          onChange={(e) => updateOrderItem(index, "specification", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="min-w-[120px]">
                          <Select
                            value={item.majorCategory}
                            onValueChange={(value) => updateOrderItem(index, "majorCategory", value)}
                          >
                            <SelectTrigger className={`h-8 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                              <SelectValue placeholder="대분류 선택" />
                            </SelectTrigger>
                            <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                              {majorCategories?.map((category: any) => (
                                <SelectItem key={category.id} value={category.categoryName}>
                                  {category.categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="min-w-[120px]">
                          <Select
                            value={item.middleCategory}
                            onValueChange={(value) => updateOrderItem(index, "middleCategory", value)}
                            disabled={!item.majorCategory}
                          >
                            <SelectTrigger className={`h-8 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                              <SelectValue placeholder="중분류 선택" />
                            </SelectTrigger>
                            <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                              {getMiddleCategoriesForMajor(item.majorCategory)?.map((category: any) => (
                                <SelectItem key={category.id} value={category.categoryName}>
                                  {category.categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="min-w-[120px]">
                          <Select
                            value={item.minorCategory}
                            onValueChange={(value) => updateOrderItem(index, "minorCategory", value)}
                            disabled={!item.middleCategory}
                          >
                            <SelectTrigger className={`h-8 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                              <SelectValue placeholder="소분류 선택" />
                            </SelectTrigger>
                            <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                              {getMinorCategoriesForMiddle(item.middleCategory)?.map((category: any) => (
                                <SelectItem key={category.id} value={category.categoryName}>
                                  {category.categoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          className={`h-8 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          type="number"
                          placeholder="수량"
                          value={item.quantity || ""}
                          onChange={(e) => updateOrderItem(index, "quantity", parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          className={`h-8 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          type="text"
                          placeholder="₩0"
                          value={unitPriceDisplayValues[index] || formatCurrencyInput(item.unitPrice)}
                          onChange={(e) => {
                            const newDisplayValues = [...unitPriceDisplayValues];
                            newDisplayValues[index] = e.target.value;
                            setUnitPriceDisplayValues(newDisplayValues);
                            
                            const numericValue = parseCurrencyInput(e.target.value);
                            updateOrderItem(index, "unitPrice", numericValue);
                          }}
                          onBlur={(e) => {
                            const numericValue = parseCurrencyInput(e.target.value);
                            const formattedValue = formatCurrencyInput(numericValue);
                            const newDisplayValues = [...unitPriceDisplayValues];
                            newDisplayValues[index] = formattedValue;
                            setUnitPriceDisplayValues(newDisplayValues);
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          className={`h-8 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                          readOnly
                          value={formatKoreanWon(calculateTotalAmount(item))}
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          className={`h-8 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                          placeholder="비고"
                          value={item.notes}
                          onChange={(e) => updateOrderItem(index, "notes", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="py-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyOrderItem(index)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3 text-blue-500" />
                        </Button>
                      </TableCell>
                      <TableCell className="py-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOrderItem(index)}
                          disabled={orderItems.length === 1}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot className={`transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <TableRow>
                    <TableCell colSpan={7} className={`py-2 text-right font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      총 금액:
                    </TableCell>
                    <TableCell className={`py-2 font-bold text-lg transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatKoreanWon(calculateGrandTotal())}
                    </TableCell>
                    <TableCell colSpan={3} className="py-2"></TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
            {errors.items && (
              <p className={`text-sm mt-2 transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>{errors.items.message}</p>
            )}
          </CardContent>
        </Card>

        <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>파일 첨부</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
                isDragOver 
                  ? isDarkMode 
                    ? 'border-blue-400 bg-blue-900/20 scale-[1.02]' 
                    : 'border-blue-500 bg-blue-50 scale-[1.02]'
                  : isDarkMode 
                    ? 'border-gray-600 hover:border-blue-400/50 hover:bg-gray-700/50' 
                    : 'border-gray-300 hover:border-blue-400/50 hover:bg-gray-50'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileUpload')?.click()}
            >
              <Upload className={`mx-auto h-8 w-8 mb-3 transition-all duration-200 ${
                isDragOver 
                  ? isDarkMode ? 'text-blue-400 scale-110' : 'text-blue-500 scale-110'
                  : isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <p className={`text-base mb-2 font-medium transition-colors ${
                isDragOver 
                  ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  : isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {isDragOver ? '파일을 놓아주세요' : '파일을 드래그하거나 클릭하여 업로드'}
              </p>
              <p className={`text-sm mb-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                모든 파일 형식 지원 (최대 10MB)
              </p>
              <input
                type="file"
                multiple
                accept="*"
                onChange={handleFileUpload}
                className="hidden"
                id="fileUpload"
              />
              <Button
                type="button"
                variant={isDragOver ? "default" : "outline"}
                size="sm"
                className={`transition-all duration-200 ${isDragOver ? 'scale-105' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('fileUpload')?.click();
                }}
              >
                파일 선택
              </Button>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                <h4 className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>첨부된 파일</h4>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className={`flex items-center justify-between p-1 rounded text-xs transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center space-x-1">
                      <FileText className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{file.name}</span>
                      <span className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => removeFile(index)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>특이사항</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Textarea
              {...register("notes")}
              placeholder="발주 관련 특이사항이나 요청사항을 입력하세요"
              rows={3}
              className={`text-sm transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
            />
          </CardContent>
        </Card>

        {/* 하단 고정 버튼 영역 */}
        <div className="sticky bottom-0 z-10 mt-6">
          <div className={`p-4 border-t shadow-lg transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="max-w-[1366px] mx-auto flex flex-col sm:flex-row justify-end gap-3">
              {/* 모바일에서는 세로 배치, 데스크톱에서는 가로 배치 */}
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto px-6 py-3 text-base font-medium"
                onClick={onCancel}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto px-6 py-3 text-base font-medium"
                onClick={() => {
                  // 임시 저장 로직 - 나중에 구현 가능
                  toast({
                    title: "임시 저장",
                    description: "임시 저장 기능은 추후 구현 예정입니다.",
                  });
                }}
              >
                임시 저장
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 text-base font-medium"
                disabled={createOrderMutation.isPending || updateOrderMutation.isPending}
              >
                {createOrderMutation.isPending || updateOrderMutation.isPending
                  ? "저장 중..."
                  : orderId
                  ? "수정"
                  : "발주서 생성"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
