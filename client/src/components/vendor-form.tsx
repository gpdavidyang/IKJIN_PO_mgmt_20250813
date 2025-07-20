import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/utils/auth-helpers";

const vendorSchema = z.object({
  name: z.string().min(1, "거래처명을 입력하세요"),
  type: z.enum(["거래처", "납품처"]).default("거래처"),
  businessNumber: z.string().optional(),
  industry: z.string().optional(),
  representative: z.string().optional(),
  mainContact: z.string().min(1, "대표 연락처를 입력하세요"),
  contactPerson: z.string().min(1, "담당자명을 입력하세요"),
  email: z.string().email("올바른 이메일 주소를 입력하세요"),
  phone: z.string().optional(),
  address: z.string().optional(),
  memo: z.string().optional(),
  isActive: z.boolean().default(true),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendor?: any;
}

export function VendorForm({ isOpen, onClose, onSuccess, vendor }: VendorFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 권한 확인
  const canManageVendors = user && hasPermission(user.role, "canManageVendors");
  const canEditAllVendors = user && hasPermission(user.role, "canEditAllOrders");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      type: "거래처",
      businessNumber: "",
      industry: "",
      representative: "",
      mainContact: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      memo: "",
      isActive: true,
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: VendorFormData) => {
      return await apiRequest("POST", "/api/vendors", data);
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "거래처가 추가되었습니다.",
      });
      onSuccess();
      handleClose();
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
        description: "거래처 추가에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async (data: VendorFormData) => {
      return await apiRequest("PUT", `/api/vendors/${vendor.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "거래처가 수정되었습니다.",
      });
      onSuccess();
      handleClose();
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
        description: "거래처 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (vendor) {
      reset({
        name: vendor.name || "",
        type: vendor.type || "거래처",
        businessNumber: vendor.businessNumber || "",
        industry: vendor.industry || "",
        representative: vendor.representative || "",
        mainContact: vendor.mainContact || "",
        contactPerson: vendor.contactPerson || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        address: vendor.address || "",
        memo: vendor.memo || "",
        isActive: vendor.isActive !== undefined ? vendor.isActive : true,
      });
    } else {
      reset({
        name: "",
        type: "거래처",
        businessNumber: "",
        industry: "",
        representative: "",
        mainContact: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        memo: "",
        isActive: true,
      });
    }
  }, [vendor, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: VendorFormData) => {
    setIsSubmitting(true);
    if (vendor) {
      updateVendorMutation.mutate(data);
    } else {
      createVendorMutation.mutate(data);
    }
    setIsSubmitting(false);
  };

  // 권한 확인
  if (!canManageVendors) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>접근 권한 없음</DialogTitle>
          </DialogHeader>
          <p className="text-center py-4">거래처를 관리할 권한이 없습니다.</p>
          <Button onClick={handleClose} className="w-full">
            확인
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {vendor ? "거래처 수정" : "거래처 추가"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">거래처명 *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="거래처명을 입력하세요"
                disabled={!canEditAllVendors && vendor}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type">구분</Label>
              <Select
                onValueChange={(value) => setValue("type", value as "거래처" | "납품처")}
                value={watch("type")}
                disabled={!canEditAllVendors && vendor}
              >
                <SelectTrigger>
                  <SelectValue placeholder="구분을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="거래처">거래처</SelectItem>
                  <SelectItem value="납품처">납품처</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="businessNumber">사업자등록번호</Label>
              <Input
                id="businessNumber"
                {...register("businessNumber")}
                placeholder="123-45-67890"
                disabled={!canEditAllVendors && vendor}
              />
            </div>

            <div>
              <Label htmlFor="representative">대표자명</Label>
              <Input
                id="representative"
                {...register("representative")}
                placeholder="대표자명을 입력하세요"
                disabled={!canEditAllVendors && vendor}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="industry">업종</Label>
            <Select
              onValueChange={(value) => setValue("industry", value)}
              value={watch("industry") || ""}
              disabled={!canEditAllVendors && vendor}
            >
              <SelectTrigger>
                <SelectValue placeholder="업종을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="제조업">제조업</SelectItem>
                <SelectItem value="건설업">건설업</SelectItem>
                <SelectItem value="전자/전기">전자/전기</SelectItem>
                <SelectItem value="화학/소재">화학/소재</SelectItem>
                <SelectItem value="기계/장비">기계/장비</SelectItem>
                <SelectItem value="철강/금속">철강/금속</SelectItem>
                <SelectItem value="자동차/부품">자동차/부품</SelectItem>
                <SelectItem value="섬유/의류">섬유/의류</SelectItem>
                <SelectItem value="식품/음료">식품/음료</SelectItem>
                <SelectItem value="물류/운송">물류/운송</SelectItem>
                <SelectItem value="IT/소프트웨어">IT/소프트웨어</SelectItem>
                <SelectItem value="기타">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 연락처 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">연락처 정보</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mainContact">대표 연락처 *</Label>
                <Input
                  id="mainContact"
                  {...register("mainContact")}
                  placeholder="02-1234-5678"
                />
                {errors.mainContact && (
                  <p className="text-red-500 text-sm mt-1">{errors.mainContact.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">추가 연락처</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="휴대폰 번호 등"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactPerson">담당자명 *</Label>
                <Input
                  id="contactPerson"
                  {...register("contactPerson")}
                  placeholder="담당자명을 입력하세요"
                />
                {errors.contactPerson && (
                  <p className="text-red-500 text-sm mt-1">{errors.contactPerson.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="example@company.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="address">주소</Label>
            <Textarea
              id="address"
              {...register("address")}
              placeholder="주소를 입력하세요"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="memo">메모</Label>
            <Textarea
              id="memo"
              {...register("memo")}
              placeholder="거래처 관련 메모를 입력하세요"
              rows={3}
            />
          </div>

          {/* 활성화 상태 */}
          {vendor && canEditAllVendors && (
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={watch("isActive")}
                onCheckedChange={(checked) => setValue("isActive", checked)}
              />
              <Label htmlFor="isActive">활성화</Label>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createVendorMutation.isPending || updateVendorMutation.isPending}
            >
              {isSubmitting || createVendorMutation.isPending || updateVendorMutation.isPending
                ? "저장 중..."
                : vendor
                ? "수정"
                : "추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
