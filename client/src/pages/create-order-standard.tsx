import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "@/styles/compact-form.css";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Eye, 
  ArrowLeft, 
  ZoomOut, 
  ZoomIn, 
  RotateCcw, 
  Download,
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Building, 
  Save, 
  Mail, 
  Upload, 
  Trash2, 
  PlusCircle, 
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  OrderForm, 
  ItemsTable, 
  FileUpload, 
  PDFPreview, 
  ApprovalWorkflow 
} from "@/components/order";
import { 
  createEmptyItem, 
  calculateItemPrice, 
  generatePONumber,
  formatNumberWithCommas,
  removeCommas
} from "@/lib/order-utils";
import { formatKoreanWon } from "@/lib/utils";
import { ItemCategoryManager } from "@/components/item-category-manager";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Project, User as DatabaseUser } from "@shared/schema";
import type { 
  PurchaseItem, 
  StandardOrderForm, 
  ApprovalStatus 
} from "@shared/order-types";

export default function CreateStandardOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
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
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Fetch projects for site selection
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    select: (data) => data?.filter((project: Project) => project.isActive) || []
  });

  // Fetch current user info
  const { data: currentUser } = useQuery<DatabaseUser>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch users for receiver and manager selection
  const { data: users = [] } = useQuery<DatabaseUser[]>({
    queryKey: ["/api/users"],
    select: (data) => data?.filter((user: DatabaseUser) => user.isActive) || []
  });

  // Fetch vendors for vendor and delivery location selection
  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    select: (data: any) => data?.filter((vendor: any) => vendor.isActive) || []
  });

  // Dynamic item categories queries
  const { data: majorCategories = [] } = useQuery({
    queryKey: ["/api/item-categories/major"],
    queryFn: () => fetch("/api/item-categories/major").then(res => res.json()),
  });

  const { data: middleCategories = [] } = useQuery({
    queryKey: ["/api/item-categories/middle"], 
    queryFn: () => fetch("/api/item-categories/middle").then(res => res.json()),
  });

  const { data: minorCategories = [] } = useQuery({
    queryKey: ["/api/item-categories/minor"],
    queryFn: () => fetch("/api/item-categories/minor").then(res => res.json()),
  });

  // 대분류에 따른 중분류 필터링 함수
  const getFilteredMiddleCategories = (majorCategory: string) => {
    if (!majorCategory) return middleCategories;
    // 현재는 모든 중분류를 반환하지만, 실제로는 대분류에 따라 필터링해야 함
    return middleCategories;
  };

  // 중분류에 따른 소분류 필터링 함수
  const getFilteredMinorCategories = (middleCategory: string) => {
    if (!middleCategory) return minorCategories;
    // 현재는 모든 소분류를 반환하지만, 실제로는 중분류에 따라 필터링해야 함
    return minorCategories;
  };

  // Mutation for creating purchase order with file upload
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add order data as JSON
      formData.append('orderData', JSON.stringify(orderData));
      
      // Add files
      uploadedFiles.forEach((file, index) => {
        formData.append(`attachments`, file);
      });
      
      console.log('Form submission - uploadedFiles count:', uploadedFiles.length);
      console.log('Form submission - files being sent:', uploadedFiles.map(f => f.name));
      
      // Debug FormData contents
      console.log('FormData keys being sent:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size}bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${typeof value === 'string' ? value.substring(0, 100) + '...' : value}`);
        }
      }
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        body: formData, // Use FormData instead of JSON
      });
      if (!response.ok) {
        throw new Error('Failed to create order');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      // 새로운 표준 발주서 상세 페이지로 리다이렉트
      if (data?.id) {
        setLocation(`/orders/${data.id}/standard`);
      }
    },
  });

  function createEmptyItem(): PurchaseItem {
    return {
      category: "",
      subCategory1: "",
      subCategory2: "",
      item: "",
      name: "",
      quantity: "",
      unit: "",
      unitPrice: "",
      price: 0,
      vendor: "",
      deliveryLocation: "",
    };
  }

  function handleItemChange(index: number, field: keyof PurchaseItem, value: string) {
    const newItems = [...items];

    // Remove commas for calculation
    if (field === "quantity" || field === "unitPrice") {
      const cleanValue = removeCommas(value);
      newItems[index] = { ...newItems[index], [field]: cleanValue };

      const quantity = Number.parseFloat(removeCommas(newItems[index].quantity) || "0");
      const unitPrice = Number.parseFloat(removeCommas(newItems[index].unitPrice) || "0");
      newItems[index].price = quantity * unitPrice;
    } else {
      newItems[index] = { ...newItems[index], [field]: value };

      // 카테고리 계층 구조 로직: 상위 카테고리 변경 시 하위 카테고리 초기화
      if (field === "category") {
        // 대분류 변경 시 중분류, 소분류 초기화
        newItems[index].subCategory1 = "";
        newItems[index].subCategory2 = "";
      } else if (field === "subCategory1") {
        // 중분류 변경 시 소분류 초기화
        newItems[index].subCategory2 = "";
      }
    }

    setItems(newItems);
  }

  function addItem() {
    setItems([...items, createEmptyItem()]);
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  }

  function copyItem(index: number) {
    const itemToCopy = { ...items[index] };
    const newItems = [...items];
    newItems.splice(index + 1, 0, itemToCopy);
    setItems(newItems);
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
      toast({
        title: "파일 업로드 완료",
        description: `${newFiles.length}개 파일이 업로드되었습니다.`,
      });
    }
  }

  function removeFile(index: number) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }

  const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

  const handleSave = () => {
    toast({
      title: "임시저장 완료",
      description: "발주서가 임시저장되었습니다.",
    });
  };

  const handleRequestApproval = async () => {
    // 필수 필드 validation
    if (!formData.site) {
      toast({
        title: "필수 정보 누락",
        description: "현장을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.receiver) {
      toast({
        title: "필수 정보 누락", 
        description: "자재 인수자를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0 || !items.some(item => item.item.trim())) {
      toast({
        title: "필수 정보 누락",
        description: "최소 하나의 품목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 가장 많이 사용된 vendor를 주요 vendor로 선택
      const vendorCounts: { [key: string]: number } = {};
      const validItems = items.filter(item => item.item.trim());
      
      validItems.forEach(item => {
        if (item.vendor) {
          vendorCounts[item.vendor] = (vendorCounts[item.vendor] || 0) + 1;
        }
      });
      
      let vendorId: number | undefined = undefined;
      
      // vendor가 설정된 경우에만 처리
      if (Object.keys(vendorCounts).length > 0) {
        // 가장 많이 사용된 vendor 찾기
        const primaryVendorName = Object.keys(vendorCounts).reduce((a, b) => 
          vendorCounts[a] > vendorCounts[b] ? a : b);
        
        // vendor name으로 vendor ID 찾기
        const primaryVendor = vendors.find((v: any) => v.name === primaryVendorName);
        vendorId = primaryVendor?.id;
      }

      // 발주서 데이터 준비
      const orderData = {
        orderNumber: poNumber,
        projectId: parseInt(formData.site),
        vendorId: vendorId || undefined, // 주요 거래처 ID
        userId: currentUser?.id || 'USR_20250531_001', // 현재 로그인된 사용자 ID
        orderDate: new Date(),
        deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : undefined,
        totalAmount,
        notes: formData.notes || undefined,
        status: 'pending', // 승인 요청 상태
        currentApproverRole: 'project_manager', // 첫 번째 승인자
        approvalLevel: 1,
        templateId: undefined, // 표준 발주서는 템플릿 없음
        items: validItems.map(item => ({
            itemName: item.item,
            quantity: parseFloat(item.quantity) || 0,
            unitPrice: parseFloat(removeCommas(item.unitPrice)) || 0,
            totalAmount: item.price || 0,
            specification: item.name || undefined,
            majorCategory: item.category || undefined,
            middleCategory: item.subCategory1 || undefined,
            minorCategory: item.subCategory2 || undefined,
            notes: `${item.category}/${item.subCategory1}/${item.subCategory2}`.replace(/\/+/g, '/').replace(/^\/|\/$/g, '') || undefined
          }))
      };

      // 데이터베이스에 저장
      await createOrderMutation.mutateAsync(orderData);
      
      setApprovalStatus("pending");
      setShowApprovalDialog(false);
      
      toast({
        title: "승인 요청 완료",
        description: "발주서가 데이터베이스에 저장되고 승인 요청되었습니다.",
      });
      
    } catch (error) {
      console.error('Order creation error:', error);
      toast({
        title: "저장 실패",
        description: "발주서 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleSkipApproval = () => {
    setApprovalStatus("skipped");
    setShowApprovalDialog(false);
    toast({
      title: "승인 생략",
      description: "발주서 승인이 생략되었습니다.",
    });
  };

  const handlePreviewPDF = () => {
    setShowPreview(true);
  };

  // PDF Download Function
  async function handleDownloadPDF() {
    const element = document.getElementById('pdf-preview-content');
    if (!element) {
      toast({
        title: "오류",
        description: "PDF 내용을 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create canvas from HTML element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Calculate dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Download PDF
      const fileName = `발주서_${poNumber}_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF 다운로드 완료",
        description: `${fileName} 파일이 다운로드되었습니다.`,
      });

    } catch (error) {
      console.error('PDF 생성 오류:', error);
      toast({
        title: "PDF 생성 실패",
        description: "PDF 파일 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  }



  function PDFPreviewModal() {
    if (!showPreview) return null;

    const selectedProject = projects.find(p => p.id.toString() === formData.site);
    const receiverUser = users.find(u => u.id === formData.receiver);
    const managerUser = users.find(u => u.id === formData.manager);
    
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(false)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                돌아가기
              </Button>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="font-medium">발주서 PDF 미리보기</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border rounded px-2 py-1 bg-white">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoomLevel(prev => Math.max(50, prev - 25))}
                  disabled={zoomLevel <= 50}
                  className="h-7 w-7 p-0"
                >
                  <ZoomOut className="w-3 h-3" />
                </Button>
                <span className="text-sm font-medium text-gray-700 px-2 min-w-[60px] text-center">
                  {zoomLevel}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoomLevel(prev => Math.min(200, prev + 25))}
                  disabled={zoomLevel >= 200}
                  className="h-7 w-7 p-0"
                >
                  <ZoomIn className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoomLevel(100)}
                  className="h-7 w-7 p-0"
                  title="원래 크기로"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={handleDownloadPDF}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                PDF 다운로드
              </Button>
              <Badge variant="outline">{poNumber}</Badge>
              <Badge variant="secondary">승인 완료</Badge>
            </div>
          </div>

          {/* PDF Content - A4 Size */}
          <div className="p-2 overflow-auto max-h-[calc(90vh-80px)] bg-gray-50">
            <div 
              id="pdf-preview-content"
              className="bg-white shadow-sm mx-auto transition-transform duration-200" 
              style={{ 
                width: `${180 * (zoomLevel / 100)}mm`, 
                minHeight: `${240 * (zoomLevel / 100)}mm`, 
                padding: `${10 * (zoomLevel / 100)}mm`, 
                fontSize: `${9 * (zoomLevel / 100)}px`,
                transform: `scale(1)`,
                transformOrigin: 'top center'
              }}
            >
              
              {/* Document Header with Approval Boxes */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">표준 발주서</h1>
                </div>
                <div className="border border-gray-300" style={{ width: '200px' }}>
                  <div className="grid grid-cols-5 border-b border-gray-300">
                    {['담당', '공무', '팀장', '임원', '사장'].map((status, index) => (
                      <div key={status} className="h-8 border-r border-gray-300 last:border-r-0 flex items-center justify-center text-xs font-medium text-gray-700 bg-gray-50" style={{ width: '40px' }}>
                        {status}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 h-8">
                    {Array(5).fill(null).map((_, index) => (
                      <div key={index} className="border-r border-gray-300 last:border-r-0 bg-white" style={{ width: '40px' }}></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 가로 구분선 */}
              <div className="border-b border-gray-300 mb-3"></div>

              {/* Order Information Header */}
              <div className="mb-3">
                <h3 className="font-bold text-gray-900 mb-2 text-xs bg-gray-50 px-2 py-1 border-l-3 border-blue-500">발주서 기본 정보</h3>
              </div>

              {/* Order Information Section */}
              <div className="grid grid-cols-2 gap-8 mb-4">
                <div className="space-y-1 text-xs">
                  <div className="flex">
                    <span className="font-bold text-gray-800 w-18">발주서 번호:</span> 
                    <span className="text-gray-900">{poNumber}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold text-gray-800 w-18">현장:</span> 
                    <span className="text-gray-900">{selectedProject?.projectName || '현장명 없음'}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold text-gray-800 w-18">현장 주소:</span> 
                    <span className="text-gray-900">{selectedProject?.location || '현장 주소 없음'}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold text-gray-800 w-18">납품희망일:</span> 
                    <span className="text-gray-900">{formData.deliveryDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold text-gray-800 w-18">작성일:</span> 
                    <span className="text-gray-900">{new Date().toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex">
                    <span className="font-bold text-gray-800 w-18">자재 인수자:</span> 
                    <span className="text-gray-900">{receiverUser ? `${receiverUser.name} (${receiverUser.phoneNumber || '010-0000-0000'})` : '인수자 미지정'}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold text-gray-800 w-18">본사 담당자:</span> 
                    <span className="text-gray-900">{managerUser ? `${managerUser.name} (${managerUser.phoneNumber || '010-0000-0000'})` : '담당자 미지정'}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold text-gray-800 w-18">승인 상태:</span> 
                    <span className="text-blue-600 font-semibold">승인 완료</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold text-gray-800 w-18">승인일:</span> 
                    <span className="text-gray-900">{new Date().toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              </div>

              {/* Supplier and Delivery Information */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Supplier Information */}
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2 text-xs bg-gray-50 px-2 py-1 border-l-3 border-blue-500">거래처</h4>
                    {(() => {
                      const uniqueVendors = Array.from(new Set(items.filter(item => item.vendor).map(item => item.vendor)));
                      if (uniqueVendors.length === 0) {
                        return <div className="text-gray-500 text-xs italic">거래처가 선택되지 않았습니다.</div>;
                      }
                      return uniqueVendors.map((vendorName, index) => {
                        const vendor = vendors.find((v: any) => v.name === vendorName);
                        return (
                          <div key={index} className="bg-white border border-gray-200 p-2 space-y-0.5 text-xs mb-1 shadow-sm">
                            <div className="font-semibold text-gray-900">{vendorName}</div>
                            <div className="text-gray-700">주소: {vendor?.address || '주소 정보 없음'}</div>
                            <div className="text-gray-700">전화: {vendor?.phone || '연락처 없음'} | 이메일: {vendor?.email || '이메일 없음'}</div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Delivery Information */}
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2 text-xs bg-gray-50 px-2 py-1 border-l-3 border-green-500">납품처</h4>
                    {(() => {
                      const uniqueDeliveryLocations = Array.from(new Set(items.filter(item => item.deliveryLocation).map(item => item.deliveryLocation)));
                      if (uniqueDeliveryLocations.length === 0) {
                        return <div className="text-gray-500 text-xs italic">납품처가 선택되지 않았습니다.</div>;
                      }
                      return uniqueDeliveryLocations.map((location, index) => (
                        <div key={index} className="bg-white border border-gray-200 p-2 space-y-0.5 text-xs mb-1 shadow-sm">
                          <div className="font-semibold text-gray-900">{location}</div>
                          <div className="text-gray-700">주소: {selectedProject?.location || '현장 주소 정보 없음'}</div>
                          <div className="text-gray-700">담당자: {receiverUser?.name || '담당자 미지정'}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Items List Header */}
              <div className="mb-3">
                <h3 className="font-bold text-gray-900 mb-2 text-xs bg-gray-50 px-2 py-1 border-l-3 border-green-500">품목 리스트</h3>
              </div>

              {/* Items Table */}
              <div className="mb-3">
                <table className="w-full border-collapse border border-gray-300 text-[9px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border-b border-r border-gray-300 px-1 py-1 text-center font-medium text-gray-700" style={{width: '25px'}}>No</th>
                      <th className="border-b border-r border-gray-300 px-1 py-1 text-center font-medium text-gray-700" style={{width: '60px'}}>대분류</th>
                      <th className="border-b border-r border-gray-300 px-1 py-1 text-center font-medium text-gray-700" style={{width: '60px'}}>중분류</th>
                      <th className="border-b border-r border-gray-300 px-1 py-1 text-center font-medium text-gray-700" style={{width: '50px'}}>소분류</th>
                      <th className="border-b border-r border-gray-300 px-1 py-1 text-center font-medium text-gray-700" style={{width: '100px'}}>품목명</th>
                      <th className="border-b border-r border-gray-300 px-1 py-1 text-center font-medium text-gray-700" style={{width: '50px'}}>수량</th>
                      <th className="border-b border-r border-gray-300 px-1 py-1 text-center font-medium text-gray-700" style={{width: '35px'}}>단위</th>
                      <th className="border-b border-r border-gray-300 px-1 py-1 text-center font-medium text-gray-700" style={{width: '60px'}}>단가</th>
                      <th className="border-b border-r border-gray-300 px-1 py-1 text-center font-medium text-gray-700" style={{width: '70px'}}>금액</th>
                      <th className="border-b border-r border-gray-300 px-1 py-1 text-center font-medium text-gray-700" style={{width: '60px'}}>거래처</th>
                      <th className="border-b border-gray-300 px-1 py-1 text-center font-medium text-gray-700" style={{width: '60px'}}>납품처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 && items.filter(item => item.item).length > 0 ? (
                      items.filter(item => item.item).map((item, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-25">
                          <td className="border-r border-gray-300 px-1 py-1 text-center text-gray-800">{index + 1}</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-gray-800">{item.category || '미분류'}</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-gray-800">{item.subCategory1 || '미분류'}</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-gray-800">{item.subCategory2 || '-'}</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-gray-800">{item.item}</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-center text-gray-800">{formatNumberWithCommas(item.quantity)}</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-center text-gray-800">{item.unit || 'ea'}</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-right text-gray-800">₩{Number(removeCommas(item.unitPrice)).toLocaleString()}</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-right font-medium text-gray-900">₩{item.price.toLocaleString()}</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-gray-800">{item.vendor || '미지정'}</td>
                          <td className="px-1 py-1 text-gray-800">{item.deliveryLocation || '미지정'}</td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr>
                          <td className="border-r border-gray-300 px-1 py-1 text-center text-gray-500 border-b border-gray-200">-</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-gray-500 border-b border-gray-200">품목이 없습니다</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-gray-500 border-b border-gray-200">-</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-gray-500 border-b border-gray-200">-</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-gray-500 border-b border-gray-200">-</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-center text-gray-500 border-b border-gray-200">-</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-center text-gray-500 border-b border-gray-200">-</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-right text-gray-500 border-b border-gray-200">-</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-right text-gray-500 border-b border-gray-200">-</td>
                          <td className="border-r border-gray-300 px-1 py-1 text-gray-500 border-b border-gray-200">-</td>
                          <td className="px-1 py-1 text-gray-500 border-b border-gray-200">-</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
                
                {/* Total Amount Box */}
                <div className="flex justify-end mt-2">
                  <div className="bg-gray-50 border-transparent px-4 py-2 rounded-sm">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-gray-900">총 금액: ₩{totalAmount > 0 ? totalAmount.toLocaleString() : '0'}</div>
                      <div className="text-[10px] text-gray-600">(부가세 별도)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attached Files Section */}
              <div className="mb-3">
                <h3 className="font-bold text-gray-900 mb-2 text-xs bg-gray-50 px-2 py-1 border-l-3 border-purple-500">첨부 파일</h3>
                <div className="grid grid-cols-4 gap-2 text-[9px]">
                  {uploadedFiles.length > 0 ? uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-1 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">
                      <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-900 font-medium truncate">{file.name}</div>
                        <div className="text-gray-500">{(file.size / 1024 / 1024).toFixed(1)}MB</div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-4 text-gray-500 italic text-center py-1">첨부된 파일이 없습니다.</div>
                  )}
                </div>
              </div>

              {/* Special Notes Section */}
              <div className="mb-3">
                <h3 className="font-bold text-gray-900 mb-2 text-xs bg-gray-50 px-2 py-1 border-l-3 border-orange-500">특이사항</h3>
                <div className="text-xs bg-white border-transparent p-2 min-h-[20px]">
                  {formData.notes ? (
                    <div className="whitespace-pre-wrap text-gray-900">{formData.notes}</div>
                  ) : (
                    <div className="text-gray-500 italic">특이사항이 입력되지 않았습니다.</div>
                  )}
                </div>
              </div>

              {/* Company Footer */}
              <div className="mt-4 pt-3 border-t-2 border-gray-900 text-center">
                <div className="flex items-center justify-center mb-2">
                  <img 
                    src="/attached_assets/ikjin-logo.png" 
                    alt="익진엔지니어링 로고" 
                    className="h-4 object-contain company-logo"
                  />
                </div>
                <div className="text-[10px] text-gray-700 space-y-0.5 leading-relaxed">
                  <div className="font-medium">서울특별시 강남구 테헤란로 124 삼원타워 9층</div>
                  <div>대표전화: 02-557-9043 | 이메일: ikjin100@ikjin.co.kr</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSendEmail = () => {
    toast({
      title: "이메일 발송",
      description: "발주서가 이메일로 발송되었습니다.",
    });
  };

  const getStatusBadge = () => {
    switch (approvalStatus) {
      case "draft":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            작성중
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            승인 대기중
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            승인 완료
          </Badge>
        );
      case "skipped":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            승인 생략
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            승인 반려
          </Badge>
        );
      default:
        return null;
    }
  };

  const canProceedToNext = approvalStatus === "approved" || approvalStatus === "skipped";

  const handleSaveDraft = () => {
    const orderData = {
      ...formData,
      items,
      totalAmount,
      attachments: uploadedFiles.map(f => f.name),
      status: 'draft'
    };
    
    toast({
      title: "임시저장 완료",
      description: "발주서가 임시저장되었습니다.",
    });
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleSubmit = () => {
    // 필수 필드 검증
    if (!formData.site) {
      toast({
        title: "현장 선택 필요",
        description: "현장을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (items.length === 0 || !items.some(item => item.name && item.quantity && item.unitPrice)) {
      toast({
        title: "품목 정보 필요",
        description: "최소 하나의 품목 정보를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    // API 요청용 데이터 준비
    const orderData = {
      projectId: parseInt(formData.site),
      vendorId: null, // 표준 발주서는 품목별로 다른 거래처 가능
      userId: currentUser?.id,
      templateId: null,
      orderDate: new Date(),
      deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : null,
      status: 'pending',
      totalAmount: parseFloat(totalAmount.toString()),
      notes: formData.notes || null,
      customFields: {
        receiver: formData.receiver,
        manager: formData.manager,
        isNegotiable: formData.isNegotiable
      },
      items: items
        .filter(item => item.name && item.quantity && item.unitPrice)
        .map(item => ({
          itemName: item.name,
          specification: item.item || null,
          quantity: parseFloat(removeCommas(item.quantity)),
          unitPrice: parseFloat(removeCommas(item.unitPrice)),
          totalAmount: parseFloat(removeCommas(item.unitPrice)) * parseFloat(removeCommas(item.quantity)),
          notes: [item.category, item.subCategory1, item.subCategory2].filter(Boolean).join('/')
        }))
    };

    createOrderMutation.mutate(orderData);
  };

  // 이전 미리보기를 제거하고 새로운 PDF 미리보기만 사용

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1366px] mx-auto p-6 space-y-6">
          {/* Page Header */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">표준 발주서 작성</h1>
                </div>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {poNumber}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {new Date().toLocaleDateString("ko-KR")}
                </Badge>
              </div>
            </div>
          </div>



          {/* 기본 정보 입력 */}
          <Card className="shadow-sm">
            <div className="section-header">
              <div className="section-title flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                기본 정보
              </div>
            </div>
            <CardContent className="p-3">
              {/* Two column grid for efficient space usage */}
              <div className="form-grid-2col">
                {/* Column 1 */}
                <div className="space-y-3">
                  <div className="inline-field">
                    <Label htmlFor="site" className="text-sm">현장</Label>
                    <Select value={formData.site} onValueChange={(value) => setFormData({...formData, site: value})}>
                      <SelectTrigger className="compact-input flex-1">
                        <SelectValue placeholder="현장 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.projectName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="inline-field">
                    <Label htmlFor="receiver" className="text-sm">인수자</Label>
                    <Select value={formData.receiver} onValueChange={(value) => setFormData({...formData, receiver: value})}>
                      <SelectTrigger className="compact-input flex-1">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-3">
                  <div className="inline-field">
                    <Label className="text-sm">납기일</Label>
                    <div className="flex items-center gap-2 flex-1">
                      <Input 
                        type="date" 
                        className="compact-input flex-1" 
                        disabled={isNegotiable}
                        value={formData.deliveryDate}
                        onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                      />
                      <div className="flex items-center gap-1">
                        <Checkbox
                          id="negotiable"
                          checked={isNegotiable}
                          onCheckedChange={(checked) => {
                            setIsNegotiable(checked as boolean);
                            setFormData({...formData, isNegotiable: checked as boolean});
                          }}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="negotiable" className="text-xs">협의</Label>
                      </div>
                    </div>
                  </div>

                  <div className="inline-field">
                    <Label htmlFor="manager" className="text-sm">담당자</Label>
                    <Select value={formData.manager} onValueChange={(value) => setFormData({...formData, manager: value})}>
                      <SelectTrigger className="compact-input flex-1">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Attachments - full width */}
              <div className="mt-3">
                <div className="inline-field">
                  <Label htmlFor="files" className="text-sm">첨부파일</Label>
                  <div className="flex-1 border border-dashed border-gray-300 dark:border-gray-600 rounded p-2 hover:border-gray-400 transition-colors">
                    <Input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      id="file-upload"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    />
                    <Label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2 text-sm text-gray-600">
                      <Upload className="h-4 w-4" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">파일을 선택하거나 여기에 드래그하세요</span>
                    <br />
                    <span className="text-xs text-gray-500 dark:text-gray-500">PDF, Word, Excel, 이미지 파일 지원</span>
                  </Label>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <Label className="text-xs font-medium">업로드된 파일:</Label>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs">
                        <span className="text-gray-900 dark:text-gray-100">{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="notes" className="text-sm font-medium">특이사항</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder="특별한 요청사항이나 주의사항을 입력하세요"
                  className="resize-none text-sm"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 품목 입력 */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 p-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                품목 입력
              </CardTitle>
              <Button onClick={addItem} variant="outline" size="sm" className="gap-2 h-8 px-3 text-sm bg-transparent dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700">
                <PlusCircle className="w-3 h-3" />
                품목 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-3 dark:bg-gray-800">
            {items.map((item, index) => (
              <div key={index} className="border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-750 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">품목 #{index + 1}</h4>
                    <div className="flex gap-1 -space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyItem(index)}
                        className="h-6 w-6 p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="품목 복사"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                        title="품목 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {/* 분류 정보 - 더 눈에 띄게 개선 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b-2 border-blue-200 dark:border-gray-600 pb-2">
                      <h5 className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <PlusCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        카테고리 분류 (필수)
                      </h5>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCategoryManager(true)}
                        className="h-6 px-2 text-xs dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        분류 관리
                      </Button>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1 block">
                            대분류 *
                          </Label>
                          <Select
                            value={item.category}
                            onValueChange={(value) => handleItemChange(index, "category", value)}
                          >
                            <SelectTrigger className="h-9 bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-600">
                              <SelectValue placeholder="대분류를 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {majorCategories.map((category: any) => (
                                <SelectItem key={category.id} value={category.categoryValue}>
                                  {category.categoryValue}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1 block">
                            중분류 *
                          </Label>
                          <Select
                            value={item.subCategory1}
                            onValueChange={(value) => handleItemChange(index, "subCategory1", value)}
                            disabled={!item.category}
                          >
                            <SelectTrigger className="h-9 bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-600">
                              <SelectValue placeholder={item.category ? "중분류를 선택하세요" : "먼저 대분류를 선택하세요"} />
                            </SelectTrigger>
                            <SelectContent>
                              {getFilteredMiddleCategories(item.category).map((category: any) => (
                                <SelectItem key={category.id} value={category.categoryValue}>
                                  {category.categoryValue}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1 block">
                            소분류
                          </Label>
                          <Select
                            value={item.subCategory2}
                            onValueChange={(value) => handleItemChange(index, "subCategory2", value)}
                            disabled={!item.subCategory1}
                          >
                            <SelectTrigger className="h-9 bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-600">
                              <SelectValue placeholder={item.subCategory1 ? "소분류를 선택하세요 (선택사항)" : "먼저 중분류를 선택하세요"} />
                            </SelectTrigger>
                            <SelectContent>
                              {getFilteredMinorCategories(item.subCategory1).map((category: any) => (
                                <SelectItem key={category.id} value={category.categoryValue}>
                                  {category.categoryValue}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 품목 및 수량 정보 */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600 pb-1">품목 및 수량</h5>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400">품목명</Label>
                        <Input
                          value={item.item}
                          onChange={(e) => handleItemChange(index, "item", e.target.value)}
                          className="h-8"
                          placeholder="품목명 입력"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-gray-600 dark:text-gray-400">수량</Label>
                          <Input
                            type="text"
                            value={formatNumberWithCommas(item.quantity)}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                            className="h-8"
                            placeholder="수량"
                          />
                        </div>
                        <div className="w-20">
                          <Label className="text-xs text-gray-600 dark:text-gray-400">단위</Label>
                          <Select value={item.unit} onValueChange={(value) => handleItemChange(index, "unit", value)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="단위" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ea">ea</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="m2">m²</SelectItem>
                              <SelectItem value="m3">m³</SelectItem>
                              <SelectItem value="m">m</SelectItem>
                              <SelectItem value="ton">ton</SelectItem>
                              <SelectItem value="box">box</SelectItem>
                              <SelectItem value="roll">roll</SelectItem>
                              <SelectItem value="bag">bag</SelectItem>
                              <SelectItem value="sheet">sheet</SelectItem>
                              <SelectItem value="set">set</SelectItem>
                              <SelectItem value="L">L</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400">단가</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                            ₩
                          </span>
                          <Input
                            type="text"
                            value={formatNumberWithCommas(item.unitPrice)}
                            onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                            className="h-8 pl-6"
                            placeholder="단가"
                          />
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-center">
                        <Label className="text-xs text-gray-600 dark:text-gray-400">금액</Label>
                        <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{formatKoreanWon(item.price)}</div>
                      </div>
                    </div>
                  </div>

                  {/* 거래처 및 납품 정보 */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600 pb-1">거래처 및 납품 정보</h5>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400">거래처명</Label>
                        <Select
                          value={item.vendor}
                          onValueChange={(value) => handleItemChange(index, "vendor", value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="거래처 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors.map((vendor: any) => (
                              <SelectItem key={vendor.id} value={vendor.name}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400">납품처</Label>
                        <div className="flex gap-2 items-center">
                          <Select
                            value={item.deliveryLocation === "현장" ? "" : item.deliveryLocation}
                            onValueChange={(value) => handleItemChange(index, "deliveryLocation", value)}
                            disabled={item.deliveryLocation === "현장"}
                          >
                            <SelectTrigger className="flex-1 h-8">
                              <SelectValue placeholder="납품처 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendors.map((vendor: any) => (
                                <SelectItem key={vendor.id} value={vendor.name}>
                                  {vendor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`onsite-${index}`}
                              checked={item.deliveryLocation === "현장"}
                              onCheckedChange={(checked) => {
                                handleItemChange(index, "deliveryLocation", checked ? "현장" : "");
                              }}
                              className="h-4 w-4"
                            />
                            <Label htmlFor={`onsite-${index}`} className="text-xs">
                              현장
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* 총계 표시 */}
            <Card className="border-2 border-blue-200 bg-blue-50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700 dark:text-gray-300">총 주문 금액</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatKoreanWon(totalAmount)}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  총 {items.filter(item => item.item).length}개 품목
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between items-center bg-white p-4 border-t border-gray-200 rounded-lg shadow-sm">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} className="gap-2 h-8 px-3 text-sm dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700">
              <Save className="w-3 h-3" />
              임시저장
            </Button>
            <Button onClick={handlePreviewPDF} className="gap-2 h-8 px-3 text-sm dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700" variant="outline">
              <Eye className="w-3 h-3" />
              PDF 미리보기
            </Button>
            <Button onClick={handleSendEmail} className="gap-2 h-8 px-3 text-sm dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700" variant="outline">
              <Mail className="w-3 h-3" />
              이메일 발송
            </Button>
          </div>
          <div className="flex gap-2">
            {allowSkipApproval && approvalStatus === "draft" && (
              <Button onClick={handleSkipApproval} variant="outline" className="gap-2 h-8 px-3 text-sm dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700">
                <AlertTriangle className="w-3 h-3" />
                승인 생략
              </Button>
            )}
            {approvalStatus === "draft" && (
              <Button onClick={handleRequestApproval} className="gap-2 h-8 px-3 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700">
                <CheckCircle className="w-3 h-3" />
                승인 요청
              </Button>
            )}
            {canProceedToNext && (
              <Button onClick={handlePreview} className="gap-2 h-8 px-3 text-sm bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700">
                <CheckCircle className="w-3 h-3" />
                다음 단계
              </Button>
            )}
        </div>
      </div>
    
    <PDFPreviewModal />
    
    {/* Item Category Manager Modal */}
    {showCategoryManager && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">품목 분류 관리</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCategoryManager(false)}
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            <ItemCategoryManager />
          </div>
        </div>
      </div>
    )}
    </>
  );
}