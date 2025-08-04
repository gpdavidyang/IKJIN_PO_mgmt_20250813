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
  businessNumber: z.string().optional(),
  contactPerson: z.string().min(1, "담당자명을 입력하세요"),
  email: z.string().email("올바른 이메일 주소를 입력하세요"),
  phone: z.string().optional(),
  address: z.string().optional(),
  businessType: z.string().optional(),
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
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      businessType: "",
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
        contactPerson: vendor.contactPerson || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        address: vendor.address || "",
        businessType: vendor.businessType || "",
      });
    } else {
      reset({
        name: "",
        businessNumber: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        businessType: "",
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
            <Input
              id="businessType"
              {...register("businessType")}
              placeholder="업종을 입력하세요 (예: 건설업, 제조업)"
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
