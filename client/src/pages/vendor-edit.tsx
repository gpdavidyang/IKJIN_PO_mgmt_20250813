import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Building2, Save, Edit } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const vendorFormSchema = z.object({
  name: z.string().min(1, "거래처명을 입력해주세요"),
  businessNumber: z.string().optional(),
  industry: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("올바른 이메일 형식을 입력해주세요").optional().or(z.literal("")),
  address: z.string().optional(),
  memo: z.string().optional(),
  isActive: z.boolean(),
});

type VendorFormData = z.infer<typeof vendorFormSchema>;

interface VendorEditProps {
  params: { id: string };
}

export default function VendorEdit({ params }: VendorEditProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const vendorId = parseInt(params.id);

  // Redirect to home if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
      toast({
        title: "권한 없음",
        description: "관리자만 접근할 수 있습니다.",
        variant: "destructive",
      });
      setTimeout(() => {
        navigate("/vendors");
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast, navigate]);

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: [`/api/vendors/${vendorId}`],
    enabled: !!user && user.role === "admin",
  });

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      businessNumber: "",
      industry: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      memo: "",
      isActive: true,
    },
  });

  // Update form when vendor data is loaded
  useEffect(() => {
    if (vendor) {
      form.reset({
        name: vendor.name || "",
        businessNumber: vendor.businessNumber || "",
        industry: vendor.industry || "",
        contactPerson: vendor.contactPerson || "",
        phone: vendor.phone || "",
        email: vendor.email || "",
        address: vendor.address || "",
        memo: vendor.memo || "",
        isActive: vendor.isActive ?? true,
      });
    }
  }, [vendor, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: VendorFormData) => {
      return await apiRequest("PATCH", `/api/vendors/${vendorId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "거래처 정보가 수정되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/vendors/${vendorId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      navigate(`/vendors/${vendorId}`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "권한 없음",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "거래처 정보 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !user || user.role !== "admin") {
    return <div>Loading...</div>;
  }

  if (vendorLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">거래처를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-4">요청하신 거래처 정보가 존재하지 않습니다.</p>
          <Button onClick={() => navigate("/vendors")}>
            거래처 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const onSubmit = (data: VendorFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">거래처 정보 수정</h1>
              <p className="text-sm text-gray-600 mt-1">
                {vendor.name}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(`/vendors/${vendorId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로 가기
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            거래처 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>거래처명 *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="거래처명을 입력하세요" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>사업자번호</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="사업자번호를 입력하세요" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>업종</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="업종을 입력하세요" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>담당자</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="담당자명을 입력하세요" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>전화번호</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="전화번호를 입력하세요" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="이메일을 입력하세요" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주소</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="주소를 입력하세요" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>메모</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="메모를 입력하세요" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3">
                    <FormLabel>활성 상태</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-4 pt-6">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? "저장 중..." : "저장"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/vendors/${vendorId}`)}
                >
                  취소
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}