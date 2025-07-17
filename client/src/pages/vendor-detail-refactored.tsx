import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DetailEditLayout, DetailSection, DetailField } from "@/components/common/DetailEditLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Phone, Mail, MapPin, Hash, User, ClipboardList } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEditMode, useDeleteConfirmation } from "@/hooks/useFormHandler";
import { formatKoreanWon } from "@/lib/utils";
import { getStatusText, getStatusColor } from "@/lib/statusUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";

import type { Vendor } from "@shared/schema";

interface VendorDetailProps {
  params: { id: string };
}

export default function VendorDetailRefactored({ params }: VendorDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const vendorId = parseInt(params.id);
  
  const { isEditing, startEdit, cancelEdit } = useEditMode();
  const [formData, setFormData] = useState<Partial<Vendor>>({});

  // 거래처 정보 조회
  const { data: vendor, isLoading: vendorLoading } = useQuery<Vendor>({
    queryKey: [`/api/vendors/${vendorId}`],
    enabled: !!user && !isNaN(vendorId),
  });

  // 거래처 발주서 조회
  const { data: vendorOrdersData, isLoading: ordersLoading } = useQuery<{ orders: any[] }>({
    queryKey: [`/api/orders/vendor/${vendorId}`],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("vendorId", vendorId.toString());
      params.append("limit", "1000");
      
      return apiRequest(`/api/orders?${params.toString()}`);
    },
    enabled: !!user && !isNaN(vendorId),
  });

  // 수정 뮤테이션
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Vendor>) => {
      return apiRequest(`/api/vendors/${vendorId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({ title: "성공", description: "거래처 정보가 수정되었습니다." });
      queryClient.invalidateQueries({ queryKey: [`/api/vendors/${vendorId}`] });
      cancelEdit();
    },
    onError: () => {
      toast({ 
        title: "오류", 
        description: "수정 중 오류가 발생했습니다.", 
        variant: "destructive" 
      });
    }
  });

  // 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/vendors/${vendorId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: "성공", description: "거래처가 삭제되었습니다." });
      setLocation('/vendors');
    },
    onError: () => {
      toast({ 
        title: "오류", 
        description: "삭제 중 오류가 발생했습니다.", 
        variant: "destructive" 
      });
    }
  });

  const { showConfirm, handleDelete, confirmDelete, cancelDelete } = useDeleteConfirmation(
    () => deleteMutation.mutate()
  );

  // 편집 시작 시 폼 데이터 초기화
  useEffect(() => {
    if (isEditing && vendor) {
      setFormData({ ...vendor });
    }
  }, [isEditing, vendor]);

  const handleSave = () => {
    if (formData) {
      updateMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    setFormData({});
    cancelEdit();
  };

  const updateFormField = (field: keyof Vendor, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (vendorLoading) {
    return <div className="p-6">로딩 중...</div>;
  }

  if (!vendor) {
    return <div className="p-6">거래처를 찾을 수 없습니다.</div>;
  }

  const orders = vendorOrdersData?.orders || [];
  const totalOrderCount = orders.length;
  const totalOrderAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  return (
    <DetailEditLayout
      title={vendor.name}
      isEditing={isEditing}
      onEdit={startEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={handleDelete}
      showDelete={true}
      backPath="/vendors"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기본 정보 */}
        <DetailSection title="기본 정보" icon={<Building2 className="h-5 w-5 text-blue-600" />}>
          <div className="grid grid-cols-1 gap-4">
            <DetailField
              label="거래처명"
              value={vendor.name}
              isEditing={isEditing}
              editComponent={
                <Input
                  value={formData.name || ''}
                  onChange={(e) => updateFormField('name', e.target.value)}
                />
              }
            />
            
            <DetailField
              label="사업자등록번호"
              value={vendor.businessNumber}
              isEditing={isEditing}
              editComponent={
                <Input
                  value={formData.businessNumber || ''}
                  onChange={(e) => updateFormField('businessNumber', e.target.value)}
                />
              }
            />

            <DetailField
              label="상태"
              value={vendor.isActive ? '활성' : '비활성'}
              isEditing={isEditing}
              editComponent={
                <Select
                  value={formData.isActive ? 'true' : 'false'}
                  onValueChange={(value) => updateFormField('isActive', value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">활성</SelectItem>
                    <SelectItem value="false">비활성</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>
        </DetailSection>

        {/* 연락처 정보 */}
        <DetailSection title="연락처 정보" icon={<Phone className="h-5 w-5 text-blue-600" />}>
          <div className="grid grid-cols-1 gap-4">
            <DetailField
              label="담당자"
              value={vendor.contactPerson}
              isEditing={isEditing}
              editComponent={
                <Input
                  value={formData.contactPerson || ''}
                  onChange={(e) => updateFormField('contactPerson', e.target.value)}
                />
              }
            />

            <DetailField
              label="전화번호"
              value={vendor.phone}
              isEditing={isEditing}
              editComponent={
                <Input
                  value={formData.phone || ''}
                  onChange={(e) => updateFormField('phone', e.target.value)}
                />
              }
            />

            <DetailField
              label="이메일"
              value={vendor.email}
              isEditing={isEditing}
              editComponent={
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateFormField('email', e.target.value)}
                />
              }
            />
          </div>
        </DetailSection>

        {/* 주소 정보 */}
        <DetailSection title="주소 정보" icon={<MapPin className="h-5 w-5 text-blue-600" />}>
          <DetailField
            label="주소"
            value={vendor.address}
            isEditing={isEditing}
            editComponent={
              <Textarea
                value={formData.address || ''}
                onChange={(e) => updateFormField('address', e.target.value)}
                rows={3}
              />
            }
          />
        </DetailSection>

        {/* 발주 통계 */}
        <DetailSection title="발주 통계" icon={<ClipboardList className="h-5 w-5 text-blue-600" />}>
          <div className="grid grid-cols-2 gap-4">
            <DetailField
              label="총 발주 건수"
              value={`${totalOrderCount}건`}
            />
            <DetailField
              label="총 발주 금액"
              value={formatKoreanWon(totalOrderAmount)}
            />
          </div>
        </DetailSection>
      </div>

      {/* 최근 발주서 목록 */}
      {orders.length > 0 && (
        <DetailSection title="최근 발주서" className="mt-6">
          <div className="space-y-2">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{order.orderNumber}</div>
                  <div className="text-sm text-gray-600">
                    {order.projectName} • {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-blue-600 font-semibold">
                    {formatKoreanWon(order.totalAmount)}
                  </div>
                  <Badge 
                    variant="secondary"
                    className={getStatusColor(order.status)}
                  >
                    {getStatusText(order.status)}
                  </Badge>
                </div>
              </div>
            ))}
            {orders.length > 5 && (
              <div className="text-center text-sm text-gray-500">
                {orders.length - 5}건 더 있음
              </div>
            )}
          </div>
        </DetailSection>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h3 className="text-lg font-semibold mb-2">거래처 삭제</h3>
            <p className="text-gray-600 mb-4">
              이 거래처를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </DetailEditLayout>
  );
}