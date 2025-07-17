import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OrderForm from "@/components/order/OrderForm";
import ItemsTable from "@/components/order/ItemsTable";
import FileUpload from "@/components/order/FileUpload";
import PDFPreview from "@/components/order/PDFPreview";
import ApprovalWorkflow from "@/components/order/ApprovalWorkflow";
import { 
  createEmptyItem, 
  calculateItemPrice, 
  generatePONumber 
} from "@/lib/order-utils";
import type { Project, User } from "@shared/schema";
import type { 
  PurchaseItem, 
  StandardOrderForm, 
  ApprovalStatus 
} from "@shared/order-types";

export default function CreateStandardOrderRefactored() {
  const { toast } = useToast();
  
  // Form State
  const [formData, setFormData] = useState<StandardOrderForm>({
    site: "",
    deliveryDate: "",
    isNegotiable: false,
    receiver: "",
    manager: "",
    notes: "",
    items: []
  });
  
  // Order State
  const [items, setItems] = useState<PurchaseItem[]>([createEmptyItem()]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isNegotiable, setIsNegotiable] = useState(false);
  
  // Workflow State
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("draft");
  const [poNumber] = useState(generatePONumber());
  const [allowSkipApproval] = useState(true);
  
  // UI State
  const [showPreview, setShowPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Data Queries
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    select: (data) => data?.filter((project: Project) => project.isActive) || []
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (data) => data?.filter((user: User) => user.isActive) || []
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    select: (data: any) => data?.filter((vendor: any) => vendor.isActive) || []
  });

  // Event Handlers
  const handleFormDataChange = (data: Partial<StandardOrderForm>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate price for quantity/unitPrice changes
    if (field === "quantity" || field === "unitPrice") {
      newItems[index].price = calculateItemPrice(
        newItems[index].quantity,
        newItems[index].unitPrice
      );
    }
    
    setItems(newItems);
  };

  const handleAddItem = () => {
    // Copy values from previous row if available
    const lastItem = items[items.length - 1];
    const newItem = lastItem ? {
      ...lastItem,
      quantity: "",
      unitPrice: "",
      price: 0
    } : createEmptyItem();
    
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const handleCopyItem = (index: number) => {
    const itemToCopy = { ...items[index] };
    const newItems = [...items];
    newItems.splice(index + 1, 0, itemToCopy);
    setItems(newItems);
  };

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files);
  };

  const handleShowPreview = () => {
    // Update formData with current items before showing preview
    setFormData(prev => ({ ...prev, items }));
    setShowPreview(true);
  };

  const handleStatusChange = (status: ApprovalStatus) => {
    setApprovalStatus(status);
  };

  // Calculate total amount
  const totalAmount = items.reduce((total, item) => total + (item.price || 0), 0);

  // Status badge function (keeping original logic)
  const getStatusBadge = () => {
    switch (approvalStatus) {
      case "draft":
        return (
          <div className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            작성중
          </div>
        );
      case "pending":
        return (
          <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            승인 대기중
          </div>
        );
      case "approved":
        return (
          <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            승인 완료
          </div>
        );
      case "skipped":
        return (
          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            승인 생략
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Page Header - 기존과 동일 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">표준 발주서 작성</h1>
                <p className="text-sm text-gray-600">통합된 표준 발주서를 작성합니다</p>
              </div>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white border px-2 py-1 rounded text-xs">
                {poNumber}
              </div>
              <div className="bg-white border px-2 py-1 rounded text-xs">
                {new Date().toLocaleDateString("ko-KR")}
              </div>
            </div>
          </div>

          {/* 기본 정보 입력 - 기존 스타일 유지 */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gray-50 border-b p-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                기본 정보 입력
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <OrderForm
                formData={formData}
                onFormDataChange={handleFormDataChange}
                projects={projects}
                users={users}
                poNumber={poNumber}
              />
            </CardContent>
          </Card>

          {/* 품목 정보 입력 - 기존 스타일 유지 */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gray-50 border-b p-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                품목 정보 입력
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <ItemsTable
                items={items}
                onItemChange={handleItemChange}
                onAddItem={handleAddItem}
                onRemoveItem={handleRemoveItem}
                onCopyItem={handleCopyItem}
                vendors={vendors}
              />
            </CardContent>
          </Card>

          {/* 파일 첨부 - 기존 스타일 유지 */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gray-50 border-b p-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                파일 첨부
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <FileUpload
                uploadedFiles={uploadedFiles}
                onFilesChange={handleFilesChange}
              />
            </CardContent>
          </Card>

          {/* 승인 및 제출 관리 - 기존 스타일 유지 */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gray-50 border-b p-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                승인 및 제출 관리
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-3">
                <ApprovalWorkflow
                  approvalStatus={approvalStatus}
                  onStatusChange={handleStatusChange}
                  onSaveDraft={() => console.log('Save draft')}
                  onSendEmail={() => console.log('Send email')}
                  onRequestApproval={() => console.log('Request approval')}
                  onSkipApproval={() => console.log('Skip approval')}
                />
                
                {/* PDF 미리보기 버튼 */}
                <div className="pt-3 border-t">
                  <Button
                    onClick={handleShowPreview}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Eye className="w-4 h-4" />
                    PDF 미리보기
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <PDFPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        formData={formData}
        items={items}
        poNumber={poNumber}
      />
    </>
  );
}