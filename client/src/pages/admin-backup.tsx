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
import { Plus, Users, FileText, Building, HardDrive, Edit, Save, X, Upload, Image, UserCheck, Briefcase, Search, Trash2, UserPlus, ChevronUp, ChevronDown, Mail, Hash, Phone, Calendar, Power, PowerOff, List, Grid3X3 } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SafeUserDelete } from "@/components/safe-user-delete";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Company, User } from "@shared/schema";

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
  positionId: z.number().optional(),
});



const TerminologyFormSchema = z.object({
  termKey: z.string().min(1, "용어 키를 입력해주세요"),
  termValue: z.string().min(1, "용어 값을 입력해주세요"),
  category: z.string().min(1, "카테고리를 입력해주세요"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type CompanyFormData = z.infer<typeof CompanyFormSchema>;
type UserFormData = z.infer<typeof UserFormSchema>;
type TerminologyFormData = z.infer<typeof TerminologyFormSchema>;

export default function Admin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Terminology | null>(null);
  const [termSearchTerm, setTermSearchTerm] = useState("");

  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [userViewMode, setUserViewMode] = useState<'list' | 'card'>('list');
  
  // Sorting states
  const [userSortField, setUserSortField] = useState<string | null>(null);
  const [userSortDirection, setUserSortDirection] = useState<'asc' | 'desc'>('asc');
  const [positionSortField, setPositionSortField] = useState<string | null>(null);
  const [positionSortDirection, setPositionSortDirection] = useState<'asc' | 'desc'>('asc');

  // Query hooks
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user && user.role === "admin",
  });

  const { data: positions = [], isLoading: isLoadingPositions } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
    enabled: !!user && user.role === "admin",
  });

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: !!user && user.role === "admin",
  });

  const { data: terminology = [], isLoading: isLoadingTerminology } = useQuery<Terminology[]>({
    queryKey: ["/api/terminology"],
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
      positionId: undefined,
    },
  });

  const positionForm = useForm<PositionFormData>({
    resolver: zodResolver(PositionFormSchema),
    defaultValues: {
      positionCode: "",
      positionName: "",
      level: 5,
      department: "",
      description: "",
      isActive: true,
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

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      toast({
        title: "접근 거부",
        description: "관리자 권한이 필요합니다.",
        variant: "destructive",
      });
      window.history.back();
    }
  }, [user, isLoading, toast]);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/login");
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Load company data into form
  useEffect(() => {
    if (primaryCompany && !isEditingCompany) {
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
        role: editingUser.role,
        positionId: editingUser.positionId || undefined,
      });
    }
  }, [editingUser, userForm]);

  // Load position data into form when editing
  useEffect(() => {
    if (editingPosition) {
      positionForm.reset({
        positionCode: editingPosition.positionCode || "",
        positionName: editingPosition.positionName || "",
        level: editingPosition.level,
        department: editingPosition.department || "",
        description: editingPosition.description || "",
        isActive: editingPosition.isActive ?? true,
      });
    }
  }, [editingPosition, positionForm]);

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

  // Company mutations
  const updateCompanyMutation = useMutation({
    mutationFn: (data: CompanyFormData) => {
      if (primaryCompany) {
        return apiRequest("PUT", `/api/companies/${primaryCompany.id}`, data);
      } else {
        return apiRequest("POST", "/api/companies", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsEditingCompany(false);
      toast({
        title: "성공",
        description: "회사 정보가 저장되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "회사 정보 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // User mutations
  const createUserMutation = useMutation({
    mutationFn: (data: UserFormData) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddingUser(false);
      userForm.reset();
      toast({
        title: "성공",
        description: "사용자가 생성되었습니다.",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserFormData> }) =>
      apiRequest("PATCH", `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      userForm.reset();
      toast({
        title: "성공",
        description: "사용자 정보가 업데이트되었습니다.",
      });
    },
  });

  const toggleUserActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/users/${id}/toggle-active`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "성공",
        description: "사용자 활성화 상태가 변경되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "사용자 활성화 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });



  // Position mutations
  const createPositionMutation = useMutation({
    mutationFn: (data: PositionFormData) => apiRequest("POST", "/api/positions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      setIsAddingPosition(false);
      positionForm.reset();
      toast({
        title: "성공",
        description: "직급이 생성되었습니다.",
      });
    },
  });

  const updatePositionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PositionFormData> }) =>
      apiRequest("PUT", `/api/positions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      setEditingPosition(null);
      toast({
        title: "성공",
        description: "직급 정보가 업데이트되었습니다.",
      });
    },
  });

  const deletePositionMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/positions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      toast({
        title: "성공",
        description: "직급이 삭제되었습니다.",
      });
    },
  });

  // Terminology mutations
  const createTerminologyMutation = useMutation({
    mutationFn: (data: TerminologyFormData) => apiRequest("POST", "/api/terminology", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/terminology"] });
      setIsAddingTerm(false);
      terminologyForm.reset();
      toast({
        title: "성공",
        description: "용어가 생성되었습니다.",
      });
    },
  });

  const updateTerminologyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TerminologyFormData> }) =>
      apiRequest("PUT", `/api/terminology/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/terminology"] });
      setEditingTerm(null);
      toast({
        title: "성공",
        description: "용어 정보가 업데이트되었습니다.",
      });
    },
  });

  // Helper functions
  const getRoleColor = (role: string) => {
    const colorMap: Record<string, string> = {
      "admin": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      "orderer": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "manager": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      "user": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "order_manager": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
    };
    return colorMap[role] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  };



  const getLevelText = (level: number) => {
    const levelMap: Record<number, string> = {
      1: "최고위", 2: "관리직", 3: "팀장급", 4: "중간직", 5: "일반직"
    };
    return levelMap[level] || `레벨 ${level}`;
  };

  const getLevelBadgeColor = (level: number) => {
    if (level === 1) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    if (level === 2) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
    if (level === 3) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    if (level === 4) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  };

  // Sorting helper functions
  const handleUserSort = (field: string) => {
    if (userSortField === field) {
      setUserSortDirection(userSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setUserSortField(field);
      setUserSortDirection('asc');
    }
  };

  const handlePositionSort = (field: string) => {
    if (positionSortField === field) {
      setPositionSortDirection(positionSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPositionSortField(field);
      setPositionSortDirection('asc');
    }
  };

  const sortData = (data: any[], sortField: string | null, sortDirection: 'asc' | 'desc') => {
    if (!sortField) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle special cases for nested properties
      if (sortField === 'positionName' && a.position) {
        aValue = a.position.positionName || '';
        bValue = b.position?.positionName || '';
      }
      
      // Convert to strings for comparison
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  };

  const getSortIcon = (field: string, currentField: string | null, direction: 'asc' | 'desc') => {
    if (currentField !== field) return null;
    return direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const filteredUsers = sortData(
    users.filter(u => 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    userSortField,
    userSortDirection
  );

  const filteredPositions = sortData(
    positions.filter(p => 
      p.positionName?.toLowerCase().includes(positionSearchTerm.toLowerCase()) ||
      p.positionCode?.toLowerCase().includes(positionSearchTerm.toLowerCase())
    ),
    positionSortField,
    positionSortDirection
  );

  const handleSaveCompany = (data: CompanyFormData) => {
    updateCompanyMutation.mutate(data);
  };

  const handleCancelEdit = () => {
    setIsEditingCompany(false);
    if (primaryCompany) {
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
  };

  if (isLoading || !user || user.role !== "admin") {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">시스템 관리</h1>
        <p className="text-sm text-gray-600">사용자 및 시스템 설정을 관리하세요</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company" className="flex items-center gap-2 text-sm">
            <Building className="h-4 w-4" />
            회사 정보
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            사용자 관리
          </TabsTrigger>
          <TabsTrigger value="terminology" className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            용어집 관리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-2">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  <span>회사 정보 관리</span>
                </div>
                {!isEditingCompany ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingCompany(true)}
                    className="gap-1 h-6 px-2 text-xs"
                  >
                    <Edit className="h-3 w-3" />
                    편집
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="gap-1 h-6 px-2 text-xs"
                    >
                      <X className="h-3 w-3" />
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={companyForm.handleSubmit(handleSaveCompany)}
                      disabled={updateCompanyMutation.isPending}
                      className="gap-1 h-6 px-2 text-xs"
                    >
                      <Save className="h-3 w-3" />
                      {updateCompanyMutation.isPending ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {isLoadingCompanies ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-gray-500 text-xs">회사 정보를 불러오는 중...</div>
                </div>
              ) : (
                <Form {...companyForm}>
                  <form onSubmit={companyForm.handleSubmit(handleSaveCompany)} className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <FormField
                        control={companyForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">회사명 *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                disabled={!isEditingCompany}
                                className={`h-7 text-xs ${!isEditingCompany ? "bg-gray-50" : ""}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={companyForm.control}
                        name="businessNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">사업자등록번호 *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                disabled={!isEditingCompany}
                                className={`h-7 text-xs ${!isEditingCompany ? "bg-gray-50" : ""}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={companyForm.control}
                        name="representative"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">대표자 *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                disabled={!isEditingCompany}
                                className={`h-7 text-xs ${!isEditingCompany ? "bg-gray-50" : ""}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={companyForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">전화번호 *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                disabled={!isEditingCompany}
                                className={`h-7 text-xs ${!isEditingCompany ? "bg-gray-50" : ""}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={companyForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">주소 *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                disabled={!isEditingCompany}
                                className={`h-7 text-xs ${!isEditingCompany ? "bg-gray-50" : ""}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={companyForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">이메일</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                disabled={!isEditingCompany}
                                className={`h-7 text-xs ${!isEditingCompany ? "bg-gray-50" : ""}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Logo Upload Section */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium">회사 로고</Label>
                        {isEditingCompany && (
                          <div className="flex items-center gap-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                              className="hidden"
                              id="logo-upload"
                            />
                            <Label htmlFor="logo-upload" className="cursor-pointer">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1 h-6 px-2 text-xs"
                                asChild
                              >
                                <span>
                                  <Upload className="h-3 w-3" />
                                  업로드
                                </span>
                              </Button>
                            </Label>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                          {primaryCompany?.logoUrl ? (
                            <img 
                              src={primaryCompany.logoUrl} 
                              alt="회사 로고" 
                              className="w-full h-full object-contain rounded-lg"
                            />
                          ) : (
                            <Image className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          {logoFile ? (
                            <div className="text-xs">
                              <div className="text-gray-900 font-medium">{logoFile.name}</div>
                              <div className="text-gray-500">{(logoFile.size / 1024).toFixed(1)} KB</div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              {primaryCompany?.logoUrl ? "현재 로고가 설정되어 있습니다" : "로고가 설정되지 않았습니다"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-2">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>사용자 관리</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingUser(true)}
                  className="gap-1 h-6 px-2 text-xs"
                >
                  <UserPlus className="h-3 w-3" />
                  사용자 추가
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="space-y-2">
                {/* 역할 설명 섹션 */}
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                  <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">사용자 역할 및 권한</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <Badge variant="destructive" className="text-[10px] px-1 py-0">
                        <RoleDisplay role="admin" />
                      </Badge>
                      <span className="text-blue-800 dark:text-blue-200">시스템 전체 관리, 사용자 계정 관리, 회사 정보 수정, 모든 발주서 접근 권한</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 text-[10px] px-1 py-0">
                        <RoleDisplay role="order_manager" />
                      </Badge>
                      <span className="text-blue-800 dark:text-blue-200">발주서 생성/수정/승인, 프로젝트 관리, 업체 관리, 품목 관리 권한</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        <RoleDisplay role="user" />
                      </Badge>
                      <span className="text-blue-800 dark:text-blue-200">발주서 조회, 자신이 생성한 발주서 수정, 프로필 관리 권한</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="사용자 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10 text-sm pl-9"
                    />
                  </div>
                  
                  {/* View Toggle */}
                  <div className="bg-gray-100 rounded p-1 flex">
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
                </div>
                
                {isLoadingUsers ? (
                  <div className="text-sm text-center py-8">사용자 정보를 불러오는 중...</div>
                ) : userViewMode === 'list' ? (
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900" onClick={() => handleUserSort('name')}>
                            <div className="flex items-center gap-1">
                              이름
                              {getSortIcon('name', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900" onClick={() => handleUserSort('email')}>
                            <div className="flex items-center gap-1">
                              이메일
                              {getSortIcon('email', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900" onClick={() => handleUserSort('phoneNumber')}>
                            <div className="flex items-center gap-1">
                              전화번호
                              {getSortIcon('phoneNumber', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900" onClick={() => handleUserSort('positionName')}>
                            <div className="flex items-center gap-1">
                              직함
                              {getSortIcon('positionName', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900" onClick={() => handleUserSort('role')}>
                            <div className="flex items-center gap-1">
                              권한
                              {getSortIcon('role', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900" onClick={() => handleUserSort('isActive')}>
                            <div className="flex items-center gap-1">
                              상태
                              {getSortIcon('isActive', userSortField, userSortDirection)}
                            </div>
                          </TableHead>
                          <TableHead className="px-3 py-3 text-xs font-semibold text-gray-700 text-center">
                            작업
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => {
                          const position = isLoadingPositions ? null : positions.find(p => p.id === user.positionId);
                          return (
                            <TableRow key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                              <TableCell className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {user.name?.charAt(0) || user.email?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-gray-900 text-sm cursor-pointer hover:text-blue-600">
                                    {user.name || user.email?.split('@')[0]}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="px-3 py-3">
                                <span className="text-gray-600 text-sm">{user.email}</span>
                              </TableCell>
                              <TableCell className="px-3 py-3">
                                <span className="text-gray-600 text-sm">{user.phoneNumber || '-'}</span>
                              </TableCell>
                              <TableCell className="px-3 py-3">
                                <span className="text-gray-600 text-sm">
                                  {position?.positionName || '-'}
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-3">
                                <Badge className={getRoleColor(user.role)} variant="outline">
                                  <RoleDisplay role={user.role} />
                                </Badge>
                              </TableCell>
                              <TableCell className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">
                                    {user.isActive ? '활성' : '비활성'}
                                  </span>
                                  <Switch
                                    checked={user.isActive}
                                    onCheckedChange={(checked) => 
                                      toggleUserActiveMutation.mutate({ id: user.id, isActive: checked })
                                    }
                                    disabled={toggleUserActiveMutation.isPending}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="px-3 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingUser(user)}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title="수정"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingUser(user)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="삭제"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map((user) => {
                      const position = isLoadingPositions ? null : positions.find(p => p.id === user.positionId);
                      return (
                        <Card key={user.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="text-sm">
                                  {user.name?.charAt(0) || user.email?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate cursor-pointer hover:text-blue-600">
                                  {user.name || user.email?.split('@')[0]}
                                </div>
                                <div className="text-xs text-gray-500 truncate">{user.email}</div>
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">{user.phoneNumber || '-'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">{position?.positionName || '-'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-gray-400" />
                                <Badge className={getRoleColor(user.role)} variant="outline">
                                  <RoleDisplay role={user.role} />
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                  {user.isActive ? '활성' : '비활성'}
                                </span>
                                <Switch
                                  checked={user.isActive}
                                  onCheckedChange={(checked) => 
                                    toggleUserActiveMutation.mutate({ id: user.id, isActive: checked })
                                  }
                                  disabled={toggleUserActiveMutation.isPending}
                                />
                              </div>
                              <div className="flex items-center gap-1 -space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingUser(user)}
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="수정"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingUser(user)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="삭제"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
                
                <div className="text-sm text-gray-500 pt-4">
                  총 {users.length}명의 사용자가 등록되어 있습니다.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        {/* 용어집 관리 탭 */}
        <TabsContent value="terminology" className="mt-2">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
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
            <CardContent className="p-2">
              {/* 검색 */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input
                    placeholder="용어 검색..."
                    value={termSearchTerm}
                    onChange={(e) => setTermSearchTerm(e.target.value)}
                    className="pl-7 h-6 text-xs"
                  />
                </div>
              </div>

              {/* 용어집 목록 */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="h-8 px-3 text-xs font-medium">용어 키</TableHead>
                      <TableHead className="h-8 px-3 text-xs font-medium">용어 값</TableHead>
                      <TableHead className="h-8 px-3 text-xs font-medium">카테고리</TableHead>
                      <TableHead className="h-8 px-3 text-xs font-medium">설명</TableHead>
                      <TableHead className="h-8 px-3 text-xs font-medium">상태</TableHead>
                      <TableHead className="h-8 px-3 text-xs font-medium text-center">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingTerminology ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-12 text-center text-xs text-gray-500">
                          용어집을 불러오는 중...
                        </TableCell>
                      </TableRow>
                    ) : terminology
                        .filter(term => 
                          term.termKey.toLowerCase().includes(termSearchTerm.toLowerCase()) ||
                          term.termValue.toLowerCase().includes(termSearchTerm.toLowerCase()) ||
                          (term.category || "").toLowerCase().includes(termSearchTerm.toLowerCase())
                        )
                        .map((term) => (
                      <TableRow key={term.id} className="hover:bg-gray-50">
                        <TableCell className="px-3 py-1.5 text-xs font-mono">{term.termKey}</TableCell>
                        <TableCell className="px-3 py-1.5 text-xs font-medium">{term.termValue}</TableCell>
                        <TableCell className="px-3 py-1.5 text-xs">
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            {term.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-1.5 text-xs max-w-xs truncate">
                          {term.description || '-'}
                        </TableCell>
                        <TableCell className="px-3 py-1.5">
                          <Badge 
                            variant={term.isActive ? "default" : "secondary"} 
                            className="text-xs px-1.5 py-0.5"
                          >
                            {term.isActive ? "활성" : "비활성"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-blue-50"
                              onClick={() => setEditingTerm(term)}
                            >
                              <Edit className="h-3 w-3 text-blue-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="text-xs text-gray-500 pt-1">
                총 {terminology.length}개의 용어가 등록되어 있습니다.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Add/Edit Dialog */}
      <Dialog open={isAddingUser || !!editingUser} onOpenChange={(open) => {
        if (!open) {
          setIsAddingUser(false);
          setEditingUser(null);
          userForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "사용자 수정" : "사용자 추가"}</DialogTitle>
          </DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit((data: UserFormData) => {
              if (editingUser) {
                updateUserMutation.mutate({ id: editingUser.id, data });
              } else {
                createUserMutation.mutate(data);
              }
            })} className="space-y-3">
              <FormField
                control={userForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">이름 *</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-7 text-xs" />
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
                    <FormLabel className="text-xs">이메일 *</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" className="h-7 text-xs" />
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
                    <FormLabel className="text-xs">전화번호 *</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-7 text-xs" />
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
                    <FormLabel className="text-xs">권한 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="권한을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <RoleSelectOptions>
                          {(options) => options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </RoleSelectOptions>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="positionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">직급</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="직급을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positions.map((position) => (
                          <SelectItem key={position.id} value={position.id.toString()}>
                            {position.positionName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingUser(false);
                    setEditingUser(null);
                    userForm.reset();
                  }}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {createUserMutation.isPending || updateUserMutation.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Position Add/Edit Dialog */}
      <Dialog open={isAddingPosition || !!editingPosition} onOpenChange={(open) => {
        if (!open) {
          setIsAddingPosition(false);
          setEditingPosition(null);
          positionForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPosition ? "직급 수정" : "직급 추가"}</DialogTitle>
          </DialogHeader>
          <Form {...positionForm}>
            <form onSubmit={positionForm.handleSubmit((data) => {
              if (editingPosition) {
                updatePositionMutation.mutate({ id: editingPosition.id, data });
              } else {
                createPositionMutation.mutate(data);
              }
            })} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={positionForm.control}
                  name="positionCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">직급 코드 *</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-7 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={positionForm.control}
                  name="positionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">직급명 *</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-7 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={positionForm.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">레벨 *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 - 최고위</SelectItem>
                          <SelectItem value="2">2 - 관리직</SelectItem>
                          <SelectItem value="3">3 - 팀장급</SelectItem>
                          <SelectItem value="4">4 - 중간직</SelectItem>
                          <SelectItem value="5">5 - 일반직</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={positionForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">부서 *</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-7 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={positionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">설명</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-7 text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingPosition(false);
                    setEditingPosition(null);
                    positionForm.reset();
                  }}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createPositionMutation.isPending || updatePositionMutation.isPending}
                >
                  {createPositionMutation.isPending || updatePositionMutation.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Terminology Add/Edit Dialog */}
      <Dialog open={isAddingTerm || !!editingTerm} onOpenChange={(open) => {
        if (!open) {
          setIsAddingTerm(false);
          setEditingTerm(null);
          terminologyForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTerm ? "용어 수정" : "용어 추가"}</DialogTitle>
          </DialogHeader>
          <Form {...terminologyForm}>
            <form onSubmit={terminologyForm.handleSubmit((data) => {
              if (editingTerm) {
                updateTerminologyMutation.mutate({ id: editingTerm.id, data });
              } else {
                createTerminologyMutation.mutate(data);
              }
            })} className="space-y-4">
              <FormField
                control={terminologyForm.control}
                name="termKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>용어 키 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="예: project" />
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
                    <FormLabel>용어 값 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="예: 현장" />
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
                    <FormLabel>카테고리 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="예: 건설업계" />
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
                      <Input {...field} placeholder="용어 설명 (선택사항)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={terminologyForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>활성 상태</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        용어를 시스템에서 사용할지 설정합니다.
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
                <Button 
                  type="submit"
                  disabled={createTerminologyMutation.isPending || updateTerminologyMutation.isPending}
                >
                  {editingTerm ? "수정" : "추가"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Safe User Delete Component */}
      {deletingUser && (
        <SafeUserDelete
          user={deletingUser}
          isOpen={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          onSuccess={() => {
            setDeletingUser(null);
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          }}
        />
      )}
    </div>
  );
}