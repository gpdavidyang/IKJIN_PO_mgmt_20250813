import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, FileText, Building, Edit, Save, X, Upload, Image, UserCheck, Search, Trash2, UserPlus, ChevronUp, ChevronDown, Mail, Hash, Phone, Calendar, Power, PowerOff, List, Grid3X3, Settings2, Shield, Activity } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SafeUserDelete } from "@/components/safe-user-delete";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ui/theme-provider";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Company, User } from "@shared/schema";
import { formatKoreanWon } from "@/lib/formatters";
import { ApprovalWorkflowSettings } from "@/components/admin/approval-workflow-settings";
import { ApprovalSettingsManager } from "@/components/admin/ApprovalSettingsManager";
import { EmailSettings } from "@/components/email-settings";

interface Terminology {
  id: number;
  termKey: string;
  termValue: string;
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ApprovalAuthority {
  id: number;
  role: string;
  maxAmount: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
import { RoleDisplay, RoleSelectOptions } from "@/components/role-display";

const CompanyFormSchema = z.object({
  companyName: z.string().min(1, "회사명을 입력해주세요"),
  businessNumber: z.string().min(1, "사업자등록번호를 입력해주세요"),
  address: z.string().min(1, "주소를 입력해주세요"),
  phone: z.string().min(1, "전화번호를 입력해주세요"),
  fax: z.string().optional(),
  email: z.string().email("올바른 이메일 형식을 입력해주세요").optional().or(z.literal("")),
  website: z.string().optional(),
  representative: z.string().min(1, "대표자명을 입력해주세요"),
});

const UserFormSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  email: z.string().email("올바른 이메일 형식을 입력해주세요"),
  phoneNumber: z.string().min(1, "전화번호를 입력해주세요"),
  role: z.enum(["field_worker", "project_manager", "hq_management", "executive", "admin"]),
});

const TerminologyFormSchema = z.object({
  termKey: z.string().min(1, "용어 키를 입력해주세요"),
  termValue: z.string().min(1, "용어 값을 입력해주세요"),
  category: z.string().min(1, "카테고리를 입력해주세요"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

const ApprovalAuthorityFormSchema = z.object({
  role: z.enum(["field_worker", "project_manager", "hq_management", "executive"]),
  maxAmount: z.number().min(0, "금액은 0 이상이어야 합니다"),
  description: z.string().optional(),
});

type CompanyFormData = z.infer<typeof CompanyFormSchema>;
type UserFormData = z.infer<typeof UserFormSchema>;
type TerminologyFormData = z.infer<typeof TerminologyFormSchema>;
type ApprovalAuthorityFormData = z.infer<typeof ApprovalAuthorityFormSchema>;

export default function Admin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Terminology | null>(null);
  const [termSearchTerm, setTermSearchTerm] = useState("");
  const [isAddingApproval, setIsAddingApproval] = useState(false);
  const [editingApproval, setEditingApproval] = useState<ApprovalAuthority | null>(null);

  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [userViewMode, setUserViewMode] = useState<'list' | 'card'>('list');
  
  // Sorting states
  const [userSortField, setUserSortField] = useState<string | null>(null);
  const [userSortDirection, setUserSortDirection] = useState<'asc' | 'desc'>('asc');

  // Query hooks
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user && user.role === "admin",
  });

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: !!user && user.role === "admin",
  });

  const { data: terminology = [], isLoading: isLoadingTerminology } = useQuery<Terminology[]>({
    queryKey: ["/api/ui-terms"],
    enabled: !!user && user.role === "admin",
  });

  const { data: approvalAuthorities = [], isLoading: isLoadingApprovals } = useQuery<ApprovalAuthority[]>({
    queryKey: ["/api/approval-authorities"],
    enabled: !!user && user.role === "admin",
  });

  const primaryCompany = companies[0];

  // Forms
  const companyForm = useForm<CompanyFormData>({
    resolver: zodResolver(CompanyFormSchema),
    defaultValues: {
      companyName: "",
      businessNumber: "",
      address: "",
      phone: "",
      fax: "",
      email: "",
      website: "",
      representative: "",
    },
  });

  const userForm = useForm<UserFormData>({
    resolver: zodResolver(UserFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      role: "field_worker",
    },
  });

  const terminologyForm = useForm<TerminologyFormData>({
    resolver: zodResolver(TerminologyFormSchema),
    defaultValues: {
      termKey: "",
      termValue: "",
      category: "",
      description: "",
      isActive: true,
    },
  });

  const approvalForm = useForm<ApprovalAuthorityFormData>({
    resolver: zodResolver(ApprovalAuthorityFormSchema),
    defaultValues: {
      role: "field_worker",
      maxAmount: 0,
      description: "",
    },
  });

  // Load company data into form
  useEffect(() => {
    if (primaryCompany && !isEditingCompany) {
      console.log('🔄 Resetting company form with data:', primaryCompany);
      companyForm.reset({
        companyName: primaryCompany.companyName || "",
        businessNumber: primaryCompany.businessNumber || "",
        address: primaryCompany.address || "",
        phone: primaryCompany.phone || "",
        fax: primaryCompany.fax || "",
        email: primaryCompany.email || "",
        website: primaryCompany.website || "",
        representative: primaryCompany.representative || "",
      });
    }
  }, [primaryCompany, companyForm, isEditingCompany]);

  // Load user data into form when editing
  useEffect(() => {
    if (editingUser) {
      userForm.reset({
        name: editingUser.name || "",
        email: editingUser.email || "",
        phoneNumber: editingUser.phoneNumber || "",
        role: editingUser.role || "field_worker",
      });
    }
  }, [editingUser, userForm]);

  // Load terminology data into form when editing
  useEffect(() => {
    if (editingTerm) {
      terminologyForm.reset({
        termKey: editingTerm.termKey || "",
        termValue: editingTerm.termValue || "",
        category: editingTerm.category || "",
        description: editingTerm.description || "",
        isActive: editingTerm.isActive ?? true,
      });
    }
  }, [editingTerm, terminologyForm]);

  // Authentication check
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
  }

  if (!isAuthenticated || !user || user.role !== "admin") {
    setLocation("/login");
    return null;
  }

  // Filter and sort functions
  const filteredUsers = users
    .filter(u => 
      (u.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (u.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (u.phoneNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!userSortField) return 0;
      const aValue = a[userSortField as keyof User] ?? "";
      const bValue = b[userSortField as keyof User] ?? "";
      if (userSortDirection === 'asc') {
        return String(aValue).localeCompare(String(bValue));
      } else {
        return String(bValue).localeCompare(String(aValue));
      }
    });

  const filteredTerminology = terminology
    .filter(term =>
      term.termKey.toLowerCase().includes(termSearchTerm.toLowerCase()) ||
      term.termValue.toLowerCase().includes(termSearchTerm.toLowerCase()) ||
      term.category.toLowerCase().includes(termSearchTerm.toLowerCase())
    );

  // Mutations
  const saveCompanyMutation = useMutation({
    mutationFn: (data: CompanyFormData) => {
      console.log('🚀 Saving company data:', data);
      if (primaryCompany) {
        console.log('📝 Updating existing company ID:', primaryCompany.id);
        return apiRequest("PUT", `/api/companies/${primaryCompany.id}`, data);
      } else {
        console.log('➕ Creating new company');
        return apiRequest("POST", "/api/companies", data);
      }
    },
    onSuccess: (result) => {
      console.log('✅ Company save successful:', result);
      toast({ title: "성공", description: "회사 정보가 저장되었습니다." });
      // Exit edit mode first, then invalidate queries
      setIsEditingCompany(false);
      // Add small delay before invalidating queries to ensure state update
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      }, 100);
    },
    onError: (error) => {
      console.error('❌ Company save failed:', error);
      toast({ title: "오류", description: "회사 정보 저장에 실패했습니다.", variant: "destructive" });
    },
  });

  const saveUserMutation = useMutation({
    mutationFn: (data: UserFormData) => {
      if (editingUser) {
        return apiRequest("PUT", `/api/users/${editingUser.id}`, data);
      } else {
        return apiRequest("POST", "/api/users", data);
      }
    },
    onSuccess: () => {
      toast({ title: "성공", description: editingUser ? "사용자가 수정되었습니다." : "사용자가 추가되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddingUser(false);
      setEditingUser(null);
      userForm.reset();
    },
    onError: () => {
      toast({ title: "오류", description: "사용자 저장에 실패했습니다.", variant: "destructive" });
    },
  });

  const saveTerminologyMutation = useMutation({
    mutationFn: (data: TerminologyFormData) => {
      if (editingTerm) {
        return apiRequest("PUT", `/api/ui-terms/${editingTerm.id}`, data);
      } else {
        return apiRequest("POST", "/api/ui-terms", data);
      }
    },
    onSuccess: () => {
      toast({ title: "성공", description: editingTerm ? "용어가 수정되었습니다." : "용어가 추가되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/ui-terms"] });
      setIsAddingTerm(false);
      setEditingTerm(null);
      terminologyForm.reset();
    },
    onError: () => {
      toast({ title: "오류", description: "용어 저장에 실패했습니다.", variant: "destructive" });
    },
  });

  const deleteTerminologyMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ui-terms/${id}`),
    onSuccess: () => {
      toast({ title: "성공", description: "용어가 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/ui-terms"] });
    },
    onError: () => {
      toast({ title: "오류", description: "용어 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const toggleUserActiveMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/users/${userId}/toggle-active`, { isActive }),
    onSuccess: () => {
      toast({ title: "성공", description: "사용자 상태가 변경되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({ title: "오류", description: "사용자 상태 변경에 실패했습니다.", variant: "destructive" });
    },
  });

  const saveApprovalMutation = useMutation({
    mutationFn: (data: ApprovalAuthorityFormData & { id?: number }) => {
      if (data.id) {
        return apiRequest("PUT", `/api/approval-authorities/${data.id}`, data);
      } else {
        return apiRequest("POST", "/api/approval-authorities", data);
      }
    },
    onSuccess: () => {
      toast({ title: "성공", description: editingApproval ? "승인 권한이 수정되었습니다." : "승인 권한이 추가되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/approval-authorities"] });
      setIsAddingApproval(false);
      setEditingApproval(null);
      approvalForm.reset();
    },
    onError: () => {
      toast({ title: "오류", description: "승인 권한 저장에 실패했습니다.", variant: "destructive" });
    },
  });

  const deleteApprovalMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/approval-authorities/${id}`),
    onSuccess: () => {
      toast({ title: "성공", description: "승인 권한이 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/approval-authorities"] });
    },
    onError: () => {
      toast({ title: "오류", description: "승인 권한 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  // Helper functions
  const handleSaveCompany = (data: CompanyFormData) => {
    saveCompanyMutation.mutate(data);
  };

  const handleSaveUser = (data: UserFormData) => {
    saveUserMutation.mutate(data);
  };

  const handleSaveTerminology = (data: TerminologyFormData) => {
    saveTerminologyMutation.mutate(data);
  };

  const handleSaveApproval = (data: ApprovalAuthorityFormData) => {
    const submitData = editingApproval ? { ...data, id: editingApproval.id } : data;
    saveApprovalMutation.mutate(submitData);
  };

  const handleEditApproval = (approval: ApprovalAuthority) => {
    setEditingApproval(approval);
    approvalForm.reset({
      role: approval.role as "field_worker" | "project_manager" | "hq_management" | "executive",
      maxAmount: parseFloat(approval.maxAmount),
      description: approval.description || "",
    });
    setIsAddingApproval(true);
  };

  const handleUserSort = (field: string) => {
    if (userSortField === field) {
      setUserSortDirection(userSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setUserSortField(field);
      setUserSortDirection('asc');
    }
  };

  const getSortIcon = (field: string, sortField: string | null, sortDirection: 'asc' | 'desc') => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('companyId', String(primaryCompany?.id || 1));

    try {
      const response = await fetch('/api/companies/upload-logo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast({ title: "성공", description: "로고가 업로드되었습니다." });
        queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
        setLogoFile(null);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({ title: "오류", description: "로고 업로드에 실패했습니다.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }}>
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <Shield className={`h-6 w-6 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>시스템 관리</h1>
                  <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>사용자 및 시스템 설정을 관리하세요</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      <div className={`shadow-sm rounded-lg border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full grid-cols-6 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <TabsTrigger value="company" className="flex items-center gap-2 text-sm">
            <Building className="h-4 w-4" />
            회사 정보
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            사용자 관리
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-2 text-sm">
            <UserCheck className="h-4 w-4" />
            승인 권한
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-2 text-sm">
            <Settings2 className="h-4 w-4" />
            승인 워크플로우
          </TabsTrigger>
          <TabsTrigger value="terminology" className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            용어집 관리
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4" />
            이메일 설정
          </TabsTrigger>
        </TabsList>

        {/* 회사 정보 탭 */}
        <TabsContent value="company" className="mt-2">
          <Card className={`shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <CardHeader className="pb-1">
              <CardTitle className={`flex items-center justify-between text-sm transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                <div className="flex items-center gap-1">
                  <Building className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span>회사 정보</span>
                </div>
                {!isEditingCompany && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('✏️ Starting company edit mode');
                      setIsEditingCompany(true);
                    }}
                    className="gap-1 h-6 px-2 text-xs"
                  >
                    <Edit className="h-3 w-3" />
                    수정
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {isEditingCompany ? (
                <Form {...companyForm}>
                  <form onSubmit={companyForm.handleSubmit(handleSaveCompany)} className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={companyForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={`text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>회사명</FormLabel>
                            <FormControl>
                              <Input {...field} className={`h-7 text-xs transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`} />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={companyForm.control}
                        name="businessNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={`text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>사업자등록번호</FormLabel>
                            <FormControl>
                              <Input {...field} className={`h-7 text-xs transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`} />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={companyForm.control}
                        name="representative"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={`text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>대표자</FormLabel>
                            <FormControl>
                              <Input {...field} className={`h-7 text-xs transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`} />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={companyForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={`text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>전화번호</FormLabel>
                            <FormControl>
                              <Input {...field} className={`h-7 text-xs transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`} />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={companyForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className={`text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>주소</FormLabel>
                            <FormControl>
                              <Input {...field} className={`h-7 text-xs transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`} />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={saveCompanyMutation.isPending}
                        className="gap-1 h-6 px-2 text-xs"
                      >
                        <Save className="h-3 w-3" />
                        저장
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingCompany(false)}
                        className="gap-1 h-6 px-2 text-xs"
                      >
                        <X className="h-3 w-3" />
                        취소
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-3">
                  {primaryCompany ? (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className={`flex items-center gap-2 p-2 rounded transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <span className={`font-medium min-w-[60px] transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>회사명:</span>
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{primaryCompany.companyName}</span>
                      </div>
                      <div className={`flex items-center gap-2 p-2 rounded transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <span className={`font-medium min-w-[80px] transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>사업자번호:</span>
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{primaryCompany.businessNumber}</span>
                      </div>
                      <div className={`flex items-center gap-2 p-2 rounded transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <span className={`font-medium min-w-[60px] transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>대표자:</span>
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{primaryCompany.representative}</span>
                      </div>
                      <div className={`flex items-center gap-2 p-2 rounded transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <span className={`font-medium min-w-[60px] transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>전화번호:</span>
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{primaryCompany.phone}</span>
                      </div>
                      <div className={`flex items-center gap-2 p-2 rounded col-span-2 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <span className={`font-medium min-w-[40px] transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>주소:</span>
                        <span className={`transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{primaryCompany.address}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`text-xs text-center py-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>회사 정보가 없습니다. 추가해주세요.</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 사용자 관리 탭 */}
        <TabsContent value="users" className="mt-2">
          <Card className={`shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <CardHeader className="pb-1">
              <CardTitle className={`flex items-center justify-between text-sm transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                <div className="flex items-center gap-1">
                  <Users className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span>사용자 관리</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center rounded p-1 transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Button
                      variant={userViewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setUserViewMode('list')}
                      className="h-8 w-8 p-0"
                      title="리스트 보기"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={userViewMode === 'card' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setUserViewMode('card')}
                      className="h-8 w-8 p-0"
                      title="카드 보기"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingUser(true)}
                    className="gap-1 h-6 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    사용자 추가
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <Input
                      placeholder="사용자 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`h-7 text-xs pl-7 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                    />
                  </div>
                </div>
                
                {isLoadingUsers ? (
                  <div className={`text-xs text-center py-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>사용자 정보를 불러오는 중...</div>
                ) : userViewMode === 'list' ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className={`px-3 py-3 text-xs cursor-pointer transition-colors ${
                            isDarkMode 
                              ? 'text-gray-400 hover:bg-gray-700' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                          onClick={() => handleUserSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            이름
                            {getSortIcon('name', userSortField, userSortDirection)}
                          </div>
                        </TableHead>
                        <TableHead className={`px-3 py-3 text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>역할</TableHead>
                        <TableHead className={`px-3 py-3 text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>연락처</TableHead>
                        <TableHead className={`px-3 py-3 text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>상태</TableHead>
                        <TableHead className={`px-3 py-3 text-xs text-center transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className={`transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <TableCell className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {user.name?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className={`font-medium text-xs transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{user.name}</div>
                                <div className={`text-xs transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-3">
                            <RoleDisplay role={user.role} />
                          </TableCell>
                          <TableCell className={`px-3 py-3 text-xs transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{user.phoneNumber}</TableCell>
                          <TableCell className="px-3 py-3">
                            <Switch
                              checked={user.isActive ?? true}
                              onCheckedChange={(checked) => 
                                toggleUserActiveMutation.mutate({ userId: user.id, isActive: checked })
                              }
                              className="h-4 w-7"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                                className={`h-6 w-6 p-0 transition-colors ${
                                  isDarkMode 
                                    ? 'text-blue-400 hover:text-blue-300' 
                                    : 'text-blue-600 hover:text-blue-700'
                                }`}
                                title="수정"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <SafeUserDelete
                                user={user}
                                onDeleteSuccess={() => {
                                  queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                                  toast({ title: "성공", description: "사용자가 삭제되었습니다." });
                                }}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-6 w-6 p-0 transition-colors ${
                                      isDarkMode 
                                        ? 'text-red-400 hover:text-red-300' 
                                        : 'text-red-600 hover:text-red-700'
                                    }`}
                                    title="삭제"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                }
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredUsers.map((user) => (
                      <Card key={user.id} className={`p-3 shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm">
                              {user.name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className={`font-medium text-sm transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{user.name}</div>
                            <RoleDisplay role={user.role} />
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Mail className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            <span className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{user.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            <span className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{user.phoneNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            <span className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        </div>
                        
                        <div className={`flex items-center justify-between mt-3 pt-3 border-t transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                          <Switch
                            checked={user.isActive ?? true}
                            onCheckedChange={(checked) => 
                              toggleUserActiveMutation.mutate({ userId: user.id, isActive: checked })
                            }
                            className="h-4 w-7"
                          />
                          <div className="flex items-center -space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUser(user)}
                              className={`h-8 w-8 p-0 transition-colors ${
                                isDarkMode 
                                  ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20' 
                                  : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                              }`}
                              title="수정"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <SafeUserDelete
                              user={user}
                              onDeleteSuccess={() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                                toast({ title: "성공", description: "사용자가 삭제되었습니다." });
                              }}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-8 w-8 p-0 transition-colors ${
                                    isDarkMode 
                                      ? 'hover:bg-red-900/20' 
                                      : 'hover:bg-red-50'
                                  }`}
                                  title="삭제"
                                >
                                  <Trash2 className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                                </Button>
                              }
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                
                <div className={`text-xs pt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  총 {users.length}명의 사용자가 등록되어 있습니다.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 용어집 관리 탭 */}
        <TabsContent value="terminology" className="mt-2">
          <Card className={`shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <CardHeader className="pb-1">
              <CardTitle className={`flex items-center justify-between text-sm transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                <div className="flex items-center gap-1">
                  <FileText className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span>용어집 관리</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingTerm(true)}
                  className="gap-1 h-6 px-2 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  용어 추가
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <Input
                      placeholder="용어 검색..."
                      value={termSearchTerm}
                      onChange={(e) => setTermSearchTerm(e.target.value)}
                      className={`h-7 text-xs pl-7 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}
                    />
                  </div>
                </div>
                
                {isLoadingTerminology ? (
                  <div className={`text-xs text-center py-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>용어 정보를 불러오는 중...</div>
                ) : (
                  <div className={`border rounded-md overflow-hidden transition-colors ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className={`grid grid-cols-12 gap-2 px-2 py-1 text-xs font-medium border-b transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-300 border-gray-600' 
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      <div className="col-span-2">용어 키</div>
                      <div className="col-span-3">용어 값</div>
                      <div className="col-span-2">카테고리</div>
                      <div className="col-span-3">설명</div>
                      <div className="col-span-1">상태</div>
                      <div className="col-span-1 text-center">작업</div>
                    </div>
                    
                    {filteredTerminology.map((term) => (
                      <div key={term.id} className={`grid grid-cols-12 gap-2 px-2 py-2 text-xs border-b last:border-b-0 transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-gray-700 border-gray-600' 
                          : 'hover:bg-gray-50 border-gray-100'
                      }`}>
                        <div className={`col-span-2 font-medium truncate transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                          {term.termKey}
                        </div>
                        <div className={`col-span-3 truncate transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {term.termValue}
                        </div>
                        <div className={`col-span-2 truncate transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {term.category}
                        </div>
                        <div className={`col-span-3 truncate transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {term.description || '-'}
                        </div>
                        <div className="col-span-1">
                          <Badge variant={term.isActive ? "outline" : "secondary"}>
                            {term.isActive ? "활성" : "비활성"}
                          </Badge>
                        </div>
                        <div className="col-span-1 flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTerm(term)}
                            className={`h-5 w-5 p-0 transition-colors ${
                              isDarkMode 
                                ? 'text-blue-400 hover:text-blue-300' 
                                : 'text-blue-600 hover:text-blue-700'
                            }`}
                            title="수정"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-5 w-5 p-0 transition-colors ${
                                  isDarkMode 
                                    ? 'text-red-400 hover:text-red-300' 
                                    : 'text-red-600 hover:text-red-700'
                                }`}
                                title="삭제"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>용어 삭제</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {term.termKey} 용어를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTerminologyMutation.mutate(term.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className={`text-xs pt-1 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  총 {terminology.length}개의 용어가 등록되어 있습니다.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 승인 설정 탭 */}
        <TabsContent value="approval" className="mt-2">
          <ApprovalSettingsManager companyId={1} />
        </TabsContent>

        {/* 워크플로우 설정 탭 */}
        <TabsContent value="workflow" className="mt-2">
          <ApprovalWorkflowSettings />
        </TabsContent>

        {/* 이메일 설정 탭 */}
        <TabsContent value="email" className="mt-2">
          <EmailSettings />
        </TabsContent>

        </Tabs>
      </div>

      {/* User Add/Edit Dialog */}
      {(isAddingUser || editingUser) && (
        <Dialog open={true} onOpenChange={() => {
          setIsAddingUser(false);
          setEditingUser(null);
          userForm.reset();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "사용자 수정" : "사용자 추가"}</DialogTitle>
            </DialogHeader>
            <Form {...userForm}>
              <form onSubmit={userForm.handleSubmit(handleSaveUser)} className="space-y-4">
                <FormField
                  control={userForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이름</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={userForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={userForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>전화번호</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={userForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>역할</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="역할을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <RoleSelectOptions>
                            {(roles) => 
                              roles.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))
                            }
                          </RoleSelectOptions>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsAddingUser(false);
                      setEditingUser(null);
                      userForm.reset();
                    }}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={saveUserMutation.isPending}>
                    {editingUser ? "수정" : "추가"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Terminology Add/Edit Dialog */}
      {(isAddingTerm || editingTerm) && (
        <Dialog open={true} onOpenChange={() => {
          setIsAddingTerm(false);
          setEditingTerm(null);
          terminologyForm.reset();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTerm ? "용어 수정" : "용어 추가"}</DialogTitle>
            </DialogHeader>
            <Form {...terminologyForm}>
              <form onSubmit={terminologyForm.handleSubmit(handleSaveTerminology)} className="space-y-4">
                <FormField
                  control={terminologyForm.control}
                  name="termKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>용어 키</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={terminologyForm.control}
                  name="termValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>용어 값</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={terminologyForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={terminologyForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>설명</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsAddingTerm(false);
                      setEditingTerm(null);
                      terminologyForm.reset();
                    }}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={saveTerminologyMutation.isPending}>
                    {editingTerm ? "수정" : "추가"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Approval Authority Add/Edit Dialog */}
      {(isAddingApproval || editingApproval) && (
        <Dialog open={true} onOpenChange={() => {
          setIsAddingApproval(false);
          setEditingApproval(null);
          approvalForm.reset();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingApproval ? "승인 권한 수정" : "승인 권한 추가"}</DialogTitle>
            </DialogHeader>
            <Form {...approvalForm}>
              <form onSubmit={approvalForm.handleSubmit(handleSaveApproval)} className="space-y-4">
                <FormField
                  control={approvalForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>역할</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="역할을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="field_worker">현장 실무자</SelectItem>
                          <SelectItem value="project_manager">현장 관리자</SelectItem>
                          <SelectItem value="hq_management">본사 관리부</SelectItem>
                          <SelectItem value="executive">임원/대표</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={approvalForm.control}
                  name="maxAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>최대 승인 한도 (원)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="0"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={approvalForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>설명 (선택사항)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="권한에 대한 설명을 입력하세요" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsAddingApproval(false);
                      setEditingApproval(null);
                      approvalForm.reset();
                    }}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={saveApprovalMutation.isPending}>
                    {editingApproval ? "수정" : "추가"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </div>
  );
}