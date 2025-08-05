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
import { FormField } from "@/components/ui/form-field";
import { FormSelect } from "@/components/ui/form-select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, X, Loader2 } from "lucide-react";

const vendorSchema = z.object({
  name: z.string().min(1, "거래처명을 입력하세요"),
  businessNumber: z.string().optional(),
  contactPerson: z.string().min(1, "담당자명을 입력하세요"),
  email: z.string().email("올바른 이메일 주소를 입력하세요"),
  phone: z.string().optional(),
  address: z.string().optional(),
  businessType: z.string().optional(),
  aliases: z.array(z.string()).optional(),
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
  const [aliases, setAliases] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState("");

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
      aliases: [],
    },
  });

  const formData = watch();
  const [validating, setValidating] = useState<Record<string, boolean>>({});

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
        aliases: vendor.aliases || [],
      });
      setAliases(vendor.aliases || []);
    } else {
      reset({
        name: "",
        businessNumber: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        businessType: "",
        aliases: [],
      });
      setAliases([]);
    }
  }, [vendor, reset]);

  const addAlias = () => {
    if (newAlias.trim() && !aliases.includes(newAlias.trim())) {
      const updatedAliases = [...aliases, newAlias.trim()];
      setAliases(updatedAliases);
      setValue("aliases", updatedAliases);
      setNewAlias("");
    }
  };

  const removeAlias = (index: number) => {
    const updatedAliases = aliases.filter((_, i) => i !== index);
    setAliases(updatedAliases);
    setValue("aliases", updatedAliases);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: VendorFormData) => {
    setIsSubmitting(true);
    const formData = {
      ...data,
      aliases: aliases
    };
    
    if (vendor) {
      updateVendorMutation.mutate(formData);
    } else {
      createVendorMutation.mutate(formData);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {vendor ? "거래처 수정" : "거래처 추가"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            label="거래처명"
            name="name"
            value={formData.name}
            onChange={(value) => setValue("name", value)}
            required
            error={errors.name?.message}
            placeholder="거래처명을 입력하세요"
            helperText="정확한 거래처명을 입력해주세요"
            validating={validating.name}
          />

          <FormField
            label="사업자등록번호"
            name="businessNumber"
            value={formData.businessNumber}
            onChange={(value) => setValue("businessNumber", value)}
            placeholder="123-45-67890"
            helperText="'-'를 포함하여 입력해주세요"
          />

          <FormField
            label="담당자명"
            name="contactPerson"
            value={formData.contactPerson}
            onChange={(value) => setValue("contactPerson", value)}
            required
            error={errors.contactPerson?.message}
            placeholder="담당자명을 입력하세요"
          />

          <FormField
            label="이메일"
            name="email"
            type="email"
            value={formData.email}
            onChange={(value) => setValue("email", value)}
            required
            error={errors.email?.message}
            placeholder="example@company.com"
            helperText="업무용 이메일 주소를 입력해주세요"
            validating={validating.email}
          />

          <FormField
            label="연락처"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={(value) => setValue("phone", value)}
            placeholder="02-1234-5678"
            helperText="하이픈(-)을 포함하여 입력해주세요"
          />

          <FormField
            label="주소"
            name="address"
            type="textarea"
            value={formData.address}
            onChange={(value) => setValue("address", value)}
            placeholder="주소를 입력하세요"
            rows={3}
            maxLength={200}
          />

          <FormSelect
            label="업종"
            name="businessType"
            value={formData.businessType}
            onChange={(value) => setValue("businessType", value)}
            placeholder="업종을 선택하세요"
            options={[
              { value: "construction", label: "건설업" },
              { value: "manufacturing", label: "제조업" },
              { value: "service", label: "서비스업" },
              { value: "wholesale", label: "도매업" },
              { value: "retail", label: "소매업" },
              { value: "other", label: "기타" },
            ]}
            helperText="주요 업종을 선택해주세요"
          />

          <div>
            <Label htmlFor="aliases">별칭 (선택사항)</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="newAlias"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="별칭 입력 (예: (주)익진, 주식회사 익진)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAlias();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addAlias}
                  className="px-3"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {aliases.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {aliases.map((alias, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-sm"
                    >
                      <span>{alias}</span>
                      <button
                        type="button"
                        onClick={() => removeAlias(index)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                거래처명의 다양한 표기법을 추가하여 자동 매칭이 가능합니다.
              </p>
            </div>
          </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-6 pt-6">
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
                className="min-w-[80px]"
              >
                {isSubmitting || createVendorMutation.isPending || updateVendorMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : vendor ? (
                  "수정"
                ) : (
                  "추가"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
