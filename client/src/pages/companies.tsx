import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building, Plus, Edit, Trash2, Phone, Mail, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/components/ui/theme-provider";

const companySchema = z.object({
  companyName: z.string().min(1, "회사명은 필수입니다"),
  businessNumber: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().email("올바른 이메일 형식이 아닙니다").optional().or(z.literal("")),
  website: z.string().optional(),
  representative: z.string().optional(),
  logo: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface Company {
  id: number;
  companyName: string;
  businessNumber?: string;
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  representative?: string;
  logo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CompaniesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: "",
      businessNumber: "",
      address: "",
      phone: "",
      fax: "",
      email: "",
      website: "",
      representative: "",
      logo: "",
    },
  });

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const createMutation = useMutation({
    mutationFn: (data: CompanyFormData) => apiRequest("/api/companies", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "회사 정보가 성공적으로 등록되었습니다." });
    },
    onError: () => {
      toast({ title: "회사 정보 등록 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CompanyFormData }) =>
      apiRequest(`/api/companies/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsDialogOpen(false);
      setEditingCompany(null);
      form.reset();
      toast({ title: "회사 정보가 성공적으로 수정되었습니다." });
    },
    onError: () => {
      toast({ title: "회사 정보 수정 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/companies/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "회사가 성공적으로 삭제되었습니다." });
    },
    onError: () => {
      toast({ title: "회사 삭제 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  const handleSubmit = (data: CompanyFormData) => {
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    form.reset({
      companyName: company.companyName,
      businessNumber: company.businessNumber || "",
      address: company.address || "",
      phone: company.phone || "",
      fax: company.fax || "",
      email: company.email || "",
      website: company.website || "",
      representative: company.representative || "",
      logo: company.logo || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("정말로 이 회사를 삭제하시겠습니까?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCompany(null);
    form.reset();
  };

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className={`bg-white shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <Building className={`h-6 w-6 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>회사 정보 관리</h1>
                  <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    발주사 회사 정보를 관리합니다
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={`text-sm transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}
                >
                  총 {companies?.length || 0}개
                </Badge>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => setEditingCompany(null)} 
                      className={`shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      회사 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent className={`max-w-2xl transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <DialogHeader>
                      <DialogTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {editingCompany ? "회사 정보 수정" : "새 회사 등록"}
                      </DialogTitle>
                      <DialogDescription className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        회사 정보를 입력하세요. 필수 항목은 회사명입니다.
                      </DialogDescription>
                    </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>회사명 *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="(주)익진엔지니어링" 
                            className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                            {...field} 
                          />
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
                        <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>사업자등록번호</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="123-45-67890" 
                            className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                            {...field} 
                          />
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
                        <Textarea 
                          placeholder="서울특별시 강남구 테헤란로 124, 9층 (역삼동, 삼원타워)"
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>대표전화</FormLabel>
                        <FormControl>
                          <Input placeholder="02-557-9043" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>팩스번호</FormLabel>
                        <FormControl>
                          <Input placeholder="02-561-0863" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>이메일</FormLabel>
                        <FormControl>
                          <Input placeholder="ikjin100@ikjin.co.kr" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>웹사이트</FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="representative"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>대표자</FormLabel>
                      <FormControl>
                        <Input placeholder="대표이사" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingCompany ? "수정" : "등록"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

        {/* Companies Table */}
        <div className={`shadow-sm rounded-lg border overflow-hidden transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {isLoading ? (
            <div className={`text-center py-8 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>데이터를 불러오는 중...</div>
          ) : companies.length === 0 ? (
            <div className={`text-center py-8 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              등록된 회사가 없습니다
            </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr className={`border-b transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <th className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>회사명</th>
                  <th className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>사업자등록번호</th>
                  <th className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>연락처</th>
                  <th className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>주소</th>
                  <th className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>대표자</th>
                  <th className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>상태</th>
                  <th className={`text-left py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>작업</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company: Company) => (
                  <tr key={company.id} className={`border-b transition-colors ${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <td className={`py-3 px-4 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {company.companyName}
                    </td>
                    <td className={`py-3 px-4 text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {company.businessNumber || "-"}
                    </td>
                    <td className={`py-3 px-4 text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="space-y-1">
                        {company.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            {company.phone}
                          </div>
                        )}
                        {company.email && (
                          <div className="flex items-center gap-1">
                            <Mail className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            {company.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {company.address ? (
                        <div className="flex items-start gap-1 max-w-[200px]">
                          <MapPin className={`h-3 w-3 mt-0.5 flex-shrink-0 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                          <span className="truncate">{company.address}</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className={`py-3 px-4 text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {company.representative || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <Badge variant={company.isActive ? "default" : "secondary"}>
                        {company.isActive ? "활성" : "비활성"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex justify-end gap-1 -space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(company)}
                          className={`h-8 w-8 p-0 transition-colors ${isDarkMode ? 'text-blue-400 hover:bg-blue-900/20' : 'text-blue-600 hover:bg-blue-50'}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(company.id)}
                          className={`h-8 w-8 p-0 transition-colors ${isDarkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}