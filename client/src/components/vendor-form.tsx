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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const vendorSchema = z.object({
  name: z.string().min(1, "거래처명을 입력하세요"),
  businessNumber: z.string().min(1, "사업자등록번호를 입력하세요"),
  contact: z.string().min(1, "담당자명을 입력하세요"),
  email: z.string().email("올바른 이메일 주소를 입력하세요"),
  phone: z.string().min(1, "전화번호를 입력하세요"),
  address: z.string().min(1, "주소를 입력하세요"),
  businessType: z.string().optional(),
  notes: z.string().optional(),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendor?: any;
}

export function VendorForm({ isOpen, onClose, onSuccess, vendor }: VendorFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      businessNumber: "",
      contact: "",
      email: "",
      phone: "",
      address: "",
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
        businessNumber: vendor.businessNumber || "",
        contact: vendor.contact || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        address: vendor.address || "",
        businessType: vendor.businessType || "",
        notes: vendor.notes || "",
      });
    } else {
      reset({
        name: "",
        businessNumber: "",
        contact: "",
        email: "",
        phone: "",
        address: "",
        businessType: "",
        notes: "",
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {vendor ? "거래처 수정" : "거래처 추가"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">거래처명 *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="거래처명을 입력하세요"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="businessNumber">사업자등록번호</Label>
            <Input
              id="businessNumber"
              {...register("businessNumber")}
              placeholder="123-45-67890"
            />
          </div>

          <div>
            <Label htmlFor="contact">담당자명</Label>
            <Input
              id="contact"
              {...register("contact")}
              placeholder="담당자명을 입력하세요"
            />
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

          <div>
            <Label htmlFor="phone">연락처</Label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="02-1234-5678"
            />
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
            <Label htmlFor="businessType">업종</Label>
            <Select onValueChange={(value) => setValue("businessType", value)} value={watch("businessType")}>
              <SelectTrigger>
                <SelectValue placeholder="업종을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manufacturing">제조업</SelectItem>
                <SelectItem value="construction">건설업</SelectItem>
                <SelectItem value="electronics">전자/전기</SelectItem>
                <SelectItem value="chemical">화학/소재</SelectItem>
                <SelectItem value="machinery">기계/장비</SelectItem>
                <SelectItem value="steel">철강/금속</SelectItem>
                <SelectItem value="automotive">자동차/부품</SelectItem>
                <SelectItem value="textiles">섬유/의류</SelectItem>
                <SelectItem value="food">식품/음료</SelectItem>
                <SelectItem value="logistics">물류/운송</SelectItem>
                <SelectItem value="it">IT/소프트웨어</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="거래처 관련 메모를 입력하세요"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
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
