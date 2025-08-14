import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatCurrency } from "@/lib/utils";

// Load Handsontable
declare global {
  interface Window {
    Handsontable: any;
  }
}

const orderSchema = z.object({
  templateId: z.number().optional(),
  projectId: z.number().min(1, "프로젝트를 선택하세요"),
  vendorId: z.number().min(1, "거래처를 선택하세요"),
  orderDate: z.string().min(1, "발주일자를 선택하세요"),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface ExcelLikeOrderFormProps {
  orderId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  preselectedTemplateId?: number;
  onTemplateChange?: (templateId: number) => void;
}

interface TableRow {
  id: string;
  no: number;
  itemName: string;
  specification: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  notes: string;
  attachment?: string;
}

export function ExcelLikeOrderForm({ orderId, onSuccess, onCancel, preselectedTemplateId, onTemplateChange }: ExcelLikeOrderFormProps) {
  const { toast } = useToast();
  const hotTableRef = useRef<any>(null);
  const hotInstanceRef = useRef<any>(null);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isHandsontableLoaded, setIsHandsontableLoaded] = useState(false);
  const [selectedProjectInfo, setSelectedProjectInfo] = useState<any>(null);
  const [selectedVendorInfo, setSelectedVendorInfo] = useState<any>(null);



  // Queries
  const { data: projectsData } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: vendorsData } = useQuery({
    queryKey: ["/api/vendors"],
  });

  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
  });

  const { data: orderData, isLoading: orderLoading } = useQuery({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      vendorId: 0,
      orderDate: new Date().toISOString().split('T')[0],
    },
  });

  // Load Handsontable dynamically
  useEffect(() => {
    const loadHandsontable = async () => {
      if (window.Handsontable) {
        setIsHandsontableLoaded(true);
        return;
      }

      try {
        // Load CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.jsdelivr.net/npm/handsontable@latest/dist/handsontable.full.min.css';
        document.head.appendChild(cssLink);

        // Load JS
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/handsontable@latest/dist/handsontable.full.min.js';
        script.onload = () => {
          setIsHandsontableLoaded(true);
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to load Handsontable:', error);
        toast({
          title: "오류",
          description: "테이블 라이브러리 로드에 실패했습니다.",
          variant: "destructive",
        });
      }
    };

    loadHandsontable();
  }, []);

  // Update total row with calculated sum
  const updateTotalRow = () => {
    const hotInstance = hotInstanceRef.current;
    if (!hotInstance) return;
    
    let totalAmount = 0;
    // Calculate total from rows 0-9 (excluding total row at index 10)
    for (let i = 0; i < 10; i++) {
      const amount = hotInstance.getDataAtCell(i, 6) || 0;
      if (typeof amount === 'number') {
        totalAmount += amount;
      }
    }
    
    // Update total row (row 10, column 6)
    hotInstance.setDataAtCell(10, 6, totalAmount, 'total_calculation');
  };

  // Initialize Handsontable
  useEffect(() => {
    if (!isHandsontableLoaded || !hotTableRef.current || hotInstanceRef.current) return;

    const initialData = Array.from({ length: 11 }, (_, index) => {
      if (index === 10) {
        // Last row as total row
        return ['총합', '', '', '', '', '', 0, ''];
      }
      return [
        index + 1, // NO
        '', // 품명
        '', // 규격
        '', // 단위
        0, // 수량
        0, // 단가
        0, // 금액 (calculated)
        '', // 비고
      ];
    });

    const hotSettings = {
      data: initialData,
      colHeaders: ["NO", "품명", "규격", "단위", "수량", "단가", "금액", "비고"],
      columns: [
        { data: 0, type: 'text', readOnly: true, className: 'htCenter', width: 60 }, // NO
        { data: 1, type: 'text', className: 'htMiddle', width: 150 }, // 품명
        { data: 2, type: 'text', className: 'htMiddle', width: 120 }, // 규격
        { data: 3, type: 'text', className: 'htCenter htMiddle', width: 60 }, // 단위
        { data: 4, type: 'numeric', numericFormat: { pattern: '0,0' }, className: 'htCenter htMiddle', width: 80 }, // 수량
        { data: 5, type: 'numeric', numericFormat: { pattern: '₩0,0' }, className: 'htRight htMiddle', width: 100 }, // 단가
        { data: 6, type: 'numeric', numericFormat: { pattern: '₩0,0' }, readOnly: true, className: 'htRight htMiddle', width: 120 }, // 금액
        { data: 7, type: 'text', className: 'htMiddle', width: 100 }, // 비고
      ],
      rowHeaders: true,
      width: '100%',
      height: 450,
      licenseKey: 'non-commercial-and-evaluation',
      stretchH: 'none',
      autoWrapRow: false,
      autoWrapCol: false,
      copyPaste: true,
      fillHandle: true,
      contextMenu: ['row_above', 'row_below', 'remove_row', 'copy', 'cut', 'paste'],
      manualRowResize: true,
      manualColumnResize: true,
      rowHeights: 28,
      cells: (row: number, col: number) => {
        const cellProperties: any = {};
        
        // Base alignment for all cells
        cellProperties.className = 'htMiddle';
        
        // Make total row (last row) read-only and highlighted
        if (row === 10) {
          cellProperties.readOnly = true;
          if (col === 0) {
            cellProperties.className = 'htCenter htMiddle total-row';
          } else if (col === 6) {
            cellProperties.className = 'htRight htMiddle total-row';
          } else {
            cellProperties.className = 'htCenter htMiddle total-row';
          }
          return cellProperties;
        }
        
        // Apply column-specific alignment for data rows
        switch (col) {
          case 0: // NO column
            cellProperties.className = 'htCenter htMiddle';
            cellProperties.readOnly = true;
            break;
          case 1: // 품명 column
            cellProperties.className = 'htLeft htMiddle';
            break;
          case 2: // 규격 column
            cellProperties.className = 'htLeft htMiddle';
            break;
          case 3: // 단위 column
            cellProperties.className = 'htCenter htMiddle';
            break;
          case 4: // 수량 column
            cellProperties.className = 'htCenter htMiddle';
            break;
          case 5: // 단가 column
            cellProperties.className = 'htRight htMiddle';
            break;
          case 6: // 금액 column
            cellProperties.className = 'htRight htMiddle';
            cellProperties.readOnly = true;
            break;
          case 7: // 비고 column
            cellProperties.className = 'htLeft htMiddle';
            break;
          default:
            cellProperties.className = 'htMiddle';
        }
        
        return cellProperties;
      },
      afterChange: (changes: any, source: string) => {
        if (source === 'loadData' || source === 'calculation' || source === 'total_calculation') return;
        
        const hotInstance = hotInstanceRef.current;
        if (!hotInstance) return;
        
        changes?.forEach(([row, prop, oldValue, newValue]: any) => {
          // Skip total row calculations
          if (row === 10) return;
          
          // Auto-calculate amount when quantity or unit price changes
          if (prop === 4 || prop === 5) { // quantity or unitPrice column
            const quantity = hotInstance.getDataAtCell(row, 4) || 0;
            const unitPrice = hotInstance.getDataAtCell(row, 5) || 0;
            const amount = quantity * unitPrice;
            hotInstance.setDataAtCell(row, 6, amount, 'calculation');
          }
          
          // Auto-increment row number
          if (prop === 1 && newValue && newValue.trim()) { // itemName column
            hotInstance.setDataAtCell(row, 0, row + 1, 'auto');
          }
        });
        
        // Calculate and update total
        setTimeout(() => {
          updateTotalRow();
        }, 50);
      },
      beforeChange: (changes: any, source: string) => {
        // Validate numeric inputs
        changes?.forEach((change: any) => {
          const [row, prop, oldValue, newValue] = change;
          if ((prop === 4 || prop === 5) && newValue && isNaN(Number(newValue))) {
            change[3] = oldValue; // Revert invalid numeric input
            toast({
              title: "입력 오류",
              description: "숫자만 입력 가능합니다.",
              variant: "destructive",
            });
          }
        });
      }
    };

    hotInstanceRef.current = new window.Handsontable(hotTableRef.current, hotSettings);

    return () => {
      if (hotInstanceRef.current) {
        hotInstanceRef.current.destroy();
        hotInstanceRef.current = null;
      }
    };
  }, [isHandsontableLoaded]);

  // Convert table data to order items format
  const convertTableDataToOrderItems = () => {
    if (!hotInstanceRef.current) return [];
    
    const data = hotInstanceRef.current.getData();
    return data
      .slice(0, 10) // Only take first 10 rows, excluding total row
      .filter((row: any) => row[1] && row[1].trim()) // Filter rows with item names
      .map((row: any, index: number) => ({
        id: `item-${index}`,
        itemName: row[1] || '',
        specification: row[2] || '',
        unit: row[3] || '',
        quantity: Number(row[4]) || 0,
        unitPrice: Number(row[5]) || 0,
        totalAmount: Number(row[6]) || 0,
        notes: row[7] || '',
      }));
  };

  // Calculate total amount
  const calculateTotalAmount = () => {
    const items = convertTableDataToOrderItems();
    return items.reduce((total: number, item: any) => total + item.totalAmount, 0);
  };

  // Add new row
  const addRow = () => {
    if (hotInstanceRef.current) {
      const rowCount = hotInstanceRef.current.countRows();
      // Insert before total row (row 10)
      hotInstanceRef.current.alter('insert_row_below', 9);
      hotInstanceRef.current.setDataAtCell(10, 0, 11);
      // Update total row to be at index 11 now
      hotInstanceRef.current.setDataAtCell(11, 0, '총합');
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!hotInstanceRef.current) return;
    
    const data = hotInstanceRef.current.getData();
    const headers = ["NO", "품명", "규격", "단위", "수량", "단가", "금액", "비고"];
    
    // This would require xlsx library - for now, just show toast
    toast({
      title: "기능 준비중",
      description: "엑셀 내보내기 기능을 준비중입니다.",
    });
  };

  // Generate PDF preview
  const generatePDFPreview = (formData: OrderFormData) => {
    const items = convertTableDataToOrderItems();
    const totalAmount = calculateTotalAmount();
    
    if (items.length === 0) {
      toast({
        title: "오류",
        description: "최소 하나의 품목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // This would open a PDF preview modal
    // For now, proceed with order creation
    submitOrder(formData, items, totalAmount);
  };

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/orders", data);
    },
    onSuccess: async (response: any) => {
      const orderId = response.id;
      
      // Upload files if any
      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach(file => {
          formData.append('files', file);
        });
        
        await apiRequest("POST", `/api/orders/${orderId}/attachments`, formData);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "성공",
        description: "발주서가 생성되었습니다.",
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
        description: "발주서 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const submitOrder = (formData: OrderFormData, items: any[], totalAmount: number) => {
    const vendorId = Number(formData.vendorId);
    if (!vendorId || vendorId === 0) {
      toast({
        title: "오류",
        description: "거래처를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      ...formData,
      vendorId,
      projectId: formData.projectId ? Number(formData.projectId) : undefined,
      templateId: 4, // Excel-like template ID
      orderDate: formData.orderDate,
      deliveryDate: formData.deliveryDate || undefined,
      items,
      totalAmount,
    };
    
    createOrderMutation.mutate(orderData);
  };

  const onSubmit = (data: OrderFormData) => {
    generatePDFPreview(data);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  if (orderLoading && orderId) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isHandsontableLoaded) {
    return <div className="p-6">테이블 라이브러리를 로딩중입니다...</div>;
  }

  return (
    <div className="max-w-[1366px] mx-auto compact-form space-y-6">
      {/* Add CSS for table styling and alignment */}
      <style>{`
        .total-row {
          background-color: #f3f4f6 !important;
          font-weight: bold !important;
        }
        
        /* Handsontable row alignment fixes */
        .handsontable {
          font-size: 13px !important;
        }
        
        .handsontable td, .handsontable th {
          vertical-align: middle !important;
          height: 28px !important;
          line-height: 28px !important;
          border: 1px solid #ccc !important;
        }
        
        .handsontable thead th {
          height: 30px !important;
          line-height: 30px !important;
          background-color: #f8f9fa !important;
          border: 1px solid #ccc !important;
          text-align: center !important;
          font-weight: 600 !important;
          font-size: 13px !important;
        }
        
        .handsontable tbody tr {
          height: 28px !important;
        }
        
        .handsontable tbody tr td {
          height: 28px !important;
          line-height: 26px !important;
          padding: 1px 4px !important;
          vertical-align: middle !important;
          border: 1px solid #ccc !important;
          font-size: 13px !important;
        }
        
        .handsontable .htMiddle {
          vertical-align: middle !important;
        }
        
        .handsontable .htLeft {
          text-align: left !important;
          vertical-align: middle !important;
          padding-left: 6px !important;
        }
        
        .handsontable .htCenter {
          text-align: center !important;
          vertical-align: middle !important;
        }
        
        .handsontable .htRight {
          text-align: right !important;
          vertical-align: middle !important;
          padding-right: 6px !important;
        }
        
        .handsontable .total-row td {
          background-color: #f3f4f6 !important;
          font-weight: bold !important;
          height: 28px !important;
          line-height: 26px !important;
        }
        
        /* Row header styling */
        .handsontable .ht_clone_left thead th {
          height: 30px !important;
          line-height: 30px !important;
        }
        
        .handsontable .ht_clone_left tbody th {
          height: 28px !important;
          line-height: 26px !important;
          text-align: center !important;
          font-size: 12px !important;
        }
        
        /* Fix column widths */
        .handsontable col:nth-child(1) { width: 60px !important; }
        .handsontable col:nth-child(2) { width: 150px !important; }
        .handsontable col:nth-child(3) { width: 120px !important; }
        .handsontable col:nth-child(4) { width: 60px !important; }
        .handsontable col:nth-child(5) { width: 80px !important; }
        .handsontable col:nth-child(6) { width: 100px !important; }
        .handsontable col:nth-child(7) { width: 120px !important; }
        .handsontable col:nth-child(8) { width: 100px !important; }
      `}</style>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="templateId">발주서 템플릿 *</Label>
                <Select 
                  onValueChange={(value) => {
                    const templateId = parseInt(value);
                    setValue("templateId", templateId);
                    console.log('ExcelLikeOrderForm: Template changed to:', templateId);
                    
                    // Notify parent component of template change
                    if (onTemplateChange) {
                      onTemplateChange(templateId);
                    }
                  }}
                  value={preselectedTemplateId?.toString() || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="템플릿을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]" style={{ position: 'fixed', zIndex: 9999 }}>
                    {(templates as any[])?.map((template: any) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.templateName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.templateId && (
                  <p className="text-sm text-red-500 mt-1">{errors.templateId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="projectId">프로젝트 *</Label>
                <Select onValueChange={(value) => {
                  const projectId = parseInt(value);
                  setValue("projectId", projectId);
                  
                  // Find and store selected project info
                  const selectedProject = (projectsData as any[])?.find((p: any) => p.id === projectId);
                  if (selectedProject) {
                    setSelectedProjectInfo(selectedProject);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="현장을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]" style={{ position: 'fixed', zIndex: 9999 }}>
                    {(projectsData as any[])?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.projectName} ({project.projectCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.projectId && (
                  <p className="text-sm text-red-500 mt-1">{errors.projectId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="vendorId">거래처 *</Label>
                <Select onValueChange={(value) => {
                  const vendorId = parseInt(value);
                  setValue("vendorId", vendorId);
                  
                  // Find and store selected vendor info
                  const selectedVendor = (vendorsData as any[])?.find((v: any) => v.id === vendorId);
                  if (selectedVendor) {
                    setSelectedVendorInfo(selectedVendor);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="거래처를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]" style={{ position: 'fixed', zIndex: 9999 }}>
                    {(vendorsData as any[])?.map((vendor: any) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendorId && (
                  <p className="text-sm text-red-500 mt-1">{errors.vendorId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="orderDate">발주서 작성일 *</Label>
                <Input
                  {...register("orderDate")}
                  type="date"
                  id="orderDate"
                />
                {errors.orderDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.orderDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="deliveryDate">납품 희망일</Label>
                <Input
                  {...register("deliveryDate")}
                  type="date"
                  id="deliveryDate"
                />
              </div>


            </div>

            {/* Selected Project and Vendor Information */}
            {(selectedProjectInfo || selectedVendorInfo) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Project Information */}
                  {selectedProjectInfo && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">프로젝트 정보</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">프로젝트명:</span>
                          <span className="ml-2 text-gray-900">{selectedProjectInfo.projectName}</span>
                        </div>
                        {selectedProjectInfo.location && (
                          <div>
                            <span className="font-medium text-gray-600">주소:</span>
                            <span className="ml-2 text-gray-900">{selectedProjectInfo.location}</span>
                          </div>
                        )}
                        {selectedProjectInfo.projectManager && (
                          <div>
                            <span className="font-medium text-gray-600">현장 관리자:</span>
                            <span className="ml-2 text-gray-900">{selectedProjectInfo.projectManager}</span>
                          </div>
                        )}
                        {selectedProjectInfo.managerPhone && (
                          <div>
                            <span className="font-medium text-gray-600">전화번호:</span>
                            <span className="ml-2 text-gray-900">{selectedProjectInfo.managerPhone}</span>
                          </div>
                        )}
                        {selectedProjectInfo.managerEmail && (
                          <div>
                            <span className="font-medium text-gray-600">이메일:</span>
                            <span className="ml-2 text-gray-900">{selectedProjectInfo.managerEmail}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vendor Information */}
                  {selectedVendorInfo && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">거래처 정보</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">거래처명:</span>
                          <span className="ml-2 text-gray-900">{selectedVendorInfo.name}</span>
                        </div>
                        {selectedVendorInfo.contactPerson && (
                          <div>
                            <span className="font-medium text-gray-600">담당자:</span>
                            <span className="ml-2 text-gray-900">{selectedVendorInfo.contactPerson}</span>
                          </div>
                        )}
                        {selectedVendorInfo.phone && (
                          <div>
                            <span className="font-medium text-gray-600">연락처:</span>
                            <span className="ml-2 text-gray-900">{selectedVendorInfo.phone}</span>
                          </div>
                        )}
                        {selectedVendorInfo.email && (
                          <div>
                            <span className="font-medium text-gray-600">이메일:</span>
                            <span className="ml-2 text-gray-900">{selectedVendorInfo.email}</span>
                          </div>
                        )}
                        {selectedVendorInfo.address && (
                          <div>
                            <span className="font-medium text-gray-600">주소:</span>
                            <span className="ml-2 text-gray-900">{selectedVendorInfo.address}</span>
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

        {/* Excel-like Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>발주 품목</CardTitle>
              <div className="flex space-x-2">
                <Button type="button" onClick={addRow} size="sm">
                  행 추가
                </Button>
                <Button type="button" onClick={exportToExcel} size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  엑셀 내보내기
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={hotTableRef} className="w-full" />
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>파일 첨부</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    파일을 드래그하거나 클릭하여 업로드
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    PDF, DWG, 이미지 파일 (최대 10MB)
                  </span>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.dwg,.jpg,.jpeg,.png,.gif"
                />
              </div>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                    >
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>특이사항</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register("notes")}
              placeholder="발주 관련 특이사항이나 요청사항을 입력하세요"
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={createOrderMutation.isPending}
          >
            {createOrderMutation.isPending
              ? "저장 중..."
              : "PDF 미리보기 및 발주서 제출"}
          </Button>
        </div>
      </form>
    </div>
  );
}