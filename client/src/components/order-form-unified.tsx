import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Upload, 
  FileText, 
  Copy, 
  Download,
  Grid3X3,
  List,
  Save,
  X
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatKoreanWon, formatCurrency } from "@/lib/utils";

// Load Handsontable for Excel-like interface
declare global {
  interface Window {
    Handsontable: any;
  }
}

// Form validation schemas
const orderItemSchema = z.object({
  itemId: z.number().min(1, "품목을 선택하세요").optional(),
  itemName: z.string().min(1, "품목명을 입력하세요"),
  specification: z.string().optional(),
  quantity: z.number().positive("수량은 0보다 커야 합니다"),
  unitPrice: z.number().positive("단가는 0보다 커야 합니다"),
  notes: z.string().optional(),
  categoryLv1: z.string().optional(),
  categoryLv2: z.string().optional(),
  categoryLv3: z.string().optional(),
  supplyAmount: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  deliveryName: z.string().optional(),
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
type OrderItem = z.infer<typeof orderItemSchema>;

interface OrderFormUnifiedProps {
  orderId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  preselectedTemplateId?: number;
  mode?: 'create' | 'edit';
  defaultFormType?: 'standard' | 'excel-like' | 'handsontable';
}

type FormType = 'standard' | 'excel-like' | 'handsontable';

export function OrderFormUnified({ 
  orderId, 
  onSuccess, 
  onCancel, 
  preselectedTemplateId,
  mode = 'create',
  defaultFormType = 'standard'
}: OrderFormUnifiedProps) {
  const { toast } = useToast();
  const [formType, setFormType] = useState<FormType>(defaultFormType);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [handsontableInstance, setHandsontableInstance] = useState<any>(null);
  const handsontableRef = useRef<HTMLDivElement>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
    control
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      items: [{
        itemName: "",
        specification: "",
        quantity: 1,
        unitPrice: 0,
        notes: ""
      }],
      orderDate: new Date().toISOString().split('T')[0],
    }
  });

  const watchedItems = watch("items");
  const watchedTemplateId = watch("templateId");

  // Data fetching queries
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiRequest("/api/projects").then(res => res.json()),
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => apiRequest("/api/vendors").then(res => res.json()),
  });

  const { data: items } = useQuery({
    queryKey: ["items"],
    queryFn: () => apiRequest("/api/items").then(res => res.json()),
  });

  const { data: templates } = useQuery({
    queryKey: ["order-templates"],
    queryFn: () => apiRequest("/api/order-templates").then(res => res.json()),
  });

  // Load existing order for edit mode
  const { data: existingOrder } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiRequest(`/api/orders/${orderId}`).then(res => res.json()),
    enabled: !!orderId && mode === 'edit',
  });

  // Load template when selected
  useEffect(() => {
    if (watchedTemplateId && templates) {
      const template = templates.find((t: any) => t.id === watchedTemplateId);
      if (template) {
        setSelectedTemplate(template);
        loadTemplateConfiguration(template);
      }
    }
  }, [watchedTemplateId, templates]);

  // Set preselected template
  useEffect(() => {
    if (preselectedTemplateId && templates) {
      setValue("templateId", preselectedTemplateId);
    }
  }, [preselectedTemplateId, templates, setValue]);

  // Load existing order data for edit mode
  useEffect(() => {
    if (existingOrder && mode === 'edit') {
      reset({
        templateId: existingOrder.templateId,
        projectId: existingOrder.projectId,
        vendorId: existingOrder.vendorId,
        orderDate: existingOrder.orderDate?.split('T')[0],
        deliveryDate: existingOrder.deliveryDate?.split('T')[0],
        notes: existingOrder.notes,
        items: existingOrder.items || [],
        customFields: existingOrder.customFields || {}
      });
    }
  }, [existingOrder, mode, reset]);

  // Template configuration loading
  const loadTemplateConfiguration = async (template: any) => {
    try {
      setIsLoadingTemplate(true);
      
      if (template.templateType === 'handsontable') {
        setFormType('handsontable');
        await loadHandsontableTemplate(template);
      } else if (template.templateType === 'excel_like') {
        setFormType('excel-like');
      } else {
        setFormType('standard');
        setDynamicFields(template.fieldsConfig?.fields || []);
      }
    } catch (error) {
      console.error('Error loading template configuration:', error);
      toast({
        title: "템플릿 로드 실패",
        description: "템플릿 설정을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  // Handsontable setup
  const loadHandsontableTemplate = async (template: any) => {
    if (!window.Handsontable || !handsontableRef.current) return;

    try {
      const config = template.handsontableConfig || {};
      
      if (handsontableInstance) {
        handsontableInstance.destroy();
      }

      const hot = new window.Handsontable(handsontableRef.current, {
        data: config.data || [{}],
        colHeaders: config.colHeaders || ['품목명', '규격', '수량', '단가', '금액'],
        columns: config.columns || [
          { data: 'itemName', type: 'text' },
          { data: 'specification', type: 'text' },
          { data: 'quantity', type: 'numeric' },
          { data: 'unitPrice', type: 'numeric' },
          { data: 'totalAmount', type: 'numeric', readOnly: true }
        ],
        rowHeaders: true,
        width: '100%',
        height: 400,
        licenseKey: 'non-commercial-and-evaluation',
        stretchH: 'all',
        afterChange: (changes: any) => {
          if (changes) {
            updateTotalAmounts();
          }
        },
        ...config.settings
      });

      setHandsontableInstance(hot);
    } catch (error) {
      console.error('Error setting up Handsontable:', error);
    }
  };

  // Update total amounts in Handsontable
  const updateTotalAmounts = () => {
    if (!handsontableInstance) return;
    
    const data = handsontableInstance.getData();
    data.forEach((row: any[], index: number) => {
      const quantity = parseFloat(row[2]) || 0;
      const unitPrice = parseFloat(row[3]) || 0;
      const totalAmount = quantity * unitPrice;
      handsontableInstance.setDataAtCell(index, 4, totalAmount);
    });
  };

  // Form mutations
  const createOrderMutation = useMutation({
    mutationFn: (data: OrderFormData) => 
      apiRequest("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: "발주서 생성 완료",
        description: "발주서가 성공적으로 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        return;
      }
      toast({
        title: "발주서 생성 실패",
        description: error.message || "발주서 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: (data: OrderFormData) => 
      apiRequest(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: "발주서 수정 완료",
        description: "발주서가 성공적으로 수정되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      onSuccess?.();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        return;
      }
      toast({
        title: "발주서 수정 실패",
        description: error.message || "발주서 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Item management functions
  const addItem = () => {
    const newItem: OrderItem = {
      itemName: "",
      specification: "",
      quantity: 1,
      unitPrice: 0,
      notes: ""
    };
    setValue("items", [...watchedItems, newItem]);
  };

  const removeItem = (index: number) => {
    const updatedItems = watchedItems.filter((_, i) => i !== index);
    setValue("items", updatedItems);
  };

  const copyItem = (index: number) => {
    const itemToCopy = { ...watchedItems[index] };
    const updatedItems = [...watchedItems];
    updatedItems.splice(index + 1, 0, itemToCopy);
    setValue("items", updatedItems);
  };

  // Calculate totals
  const calculateTotalAmount = () => {
    return watchedItems.reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);
  };

  // Form submission
  const onSubmit = (data: OrderFormData) => {
    if (formType === 'handsontable' && handsontableInstance) {
      // Extract data from Handsontable
      const tableData = handsontableInstance.getData();
      const items = tableData
        .filter((row: any[]) => row[0]) // Filter out empty rows
        .map((row: any[]) => ({
          itemName: row[0] || "",
          specification: row[1] || "",
          quantity: parseFloat(row[2]) || 0,
          unitPrice: parseFloat(row[3]) || 0,
          notes: row[5] || ""
        }));
      
      data.items = items;
    }

    if (mode === 'edit') {
      updateOrderMutation.mutate(data);
    } else {
      createOrderMutation.mutate(data);
    }
  };

  const isLoading = createOrderMutation.isPending || updateOrderMutation.isPending || isLoadingTemplate;

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {mode === 'edit' ? '발주서 수정' : '발주서 생성'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={formType === 'standard' ? 'default' : 'secondary'}>
              {formType === 'standard' && '표준 양식'}
              {formType === 'excel-like' && 'Excel 스타일'}
              {formType === 'handsontable' && '스프레드시트'}
            </Badge>
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Template Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="templateId">발주서 템플릿</Label>
              <Select
                value={String(watchedTemplateId || "")}
                onValueChange={(value) => setValue("templateId", value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="템플릿 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">기본 양식</SelectItem>
                  {templates?.map((template: any) => (
                    <SelectItem key={template.id} value={String(template.id)}>
                      {template.templateName}
                      <Badge variant="outline" className="ml-2">
                        {template.templateType}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Form Type Selector */}
            <div className="space-y-2">
              <Label>입력 방식</Label>
              <Tabs value={formType} onValueChange={(value) => setFormType(value as FormType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="standard" className="flex items-center gap-1">
                    <List className="h-4 w-4" />
                    표준
                  </TabsTrigger>
                  <TabsTrigger value="excel-like" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Excel
                  </TabsTrigger>
                  <TabsTrigger value="handsontable" className="flex items-center gap-1">
                    <Grid3X3 className="h-4 w-4" />
                    스프레드시트
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectId">현장 *</Label>
              <Select
                value={String(watch("projectId") || "")}
                onValueChange={(value) => setValue("projectId", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="현장 선택" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-sm text-red-500">{errors.projectId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorId">거래처 *</Label>
              <Select
                value={String(watch("vendorId") || "")}
                onValueChange={(value) => setValue("vendorId", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="거래처 선택" />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={String(vendor.id)}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vendorId && (
                <p className="text-sm text-red-500">{errors.vendorId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderDate">발주일자 *</Label>
              <Input
                type="date"
                {...register("orderDate")}
              />
              {errors.orderDate && (
                <p className="text-sm text-red-500">{errors.orderDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryDate">납기일자</Label>
              <Input
                type="date"
                {...register("deliveryDate")}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">특이사항</Label>
            <Textarea
              {...register("notes")}
              placeholder="특이사항을 입력하세요..."
              rows={3}
            />
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">발주 품목</h3>
              {formType === 'standard' && (
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  품목 추가
                </Button>
              )}
            </div>

            {/* Standard Form */}
            {formType === 'standard' && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>품목명</TableHead>
                      <TableHead>규격</TableHead>
                      <TableHead>수량</TableHead>
                      <TableHead>단가</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>비고</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {watchedItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            {...register(`items.${index}.itemName`)}
                            placeholder="품목명"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            {...register(`items.${index}.specification`)}
                            placeholder="규격"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                            placeholder="수량"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                            placeholder="단가"
                          />
                        </TableCell>
                        <TableCell>
                          {formatKoreanWon(item.quantity * item.unitPrice)}
                        </TableCell>
                        <TableCell>
                          <Input
                            {...register(`items.${index}.notes`)}
                            placeholder="비고"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyItem(index)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                              disabled={watchedItems.length === 1}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Handsontable Form */}
            {formType === 'handsontable' && (
              <div className="border rounded-lg p-4">
                <div
                  ref={handsontableRef}
                  className="w-full"
                />
              </div>
            )}

            {/* Excel-like Form */}
            {formType === 'excel-like' && (
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-4">
                  Excel과 유사한 인터페이스로 품목을 입력하세요.
                </p>
                {/* Excel-like interface implementation would go here */}
              </div>
            )}
          </div>

          {/* Total Amount */}
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-600">총 금액</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatKoreanWon(calculateTotalAmount())}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                취소
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "저장 중..." : (mode === 'edit' ? "수정" : "생성")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}