import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Save, X, UserPlus, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatKoreanWon, parseKoreanWon } from "@/lib/utils";
import type { Project } from "@shared/schema";

export default function ProjectEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedOrderManagers, setSelectedOrderManagers] = useState<string[]>([]);
  const [openOrderManagerSelect, setOpenOrderManagerSelect] = useState(false);

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    queryFn: () => fetch(`/api/projects/${id}`).then(res => res.json()),
    enabled: !!id,
  });

  const { data: projectStatuses = [] } = useQuery<any[]>({
    queryKey: ["/api/project-statuses"],
  });

  const { data: projectTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/project-types"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: projectMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/project-members", { projectId: id }],
    queryFn: () => fetch(`/api/project-members?projectId=${id}`).then(res => res.json()),
    enabled: !!id,
  });

  const form = useForm({
    defaultValues: {
      projectName: "",
      projectCode: "",
      clientName: "",
      projectType: "",
      location: "",
      status: "active",
      projectManagerId: "",
      orderManagerId: "",
      description: "",
      startDate: "",
      endDate: "",
      totalBudget: "",
      isActive: true,
    },
  });

  // Populate form when project data is loaded
  useEffect(() => {
    if (project) {
      form.reset({
        projectName: project.projectName,
        projectCode: project.projectCode || "",
        clientName: project.clientName || "",
        projectType: project.projectType || "",
        location: project.location || "",
        status: project.status,
        projectManagerId: project.projectManagerId || "none",
        orderManagerId: project.orderManagerId || "none",
        description: project.description || "",
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
        totalBudget: project.totalBudget || "",
        isActive: project.isActive ?? true,
      });
    }
  }, [project, form]);

  // Populate selected order managers from project members
  useEffect(() => {
    if (projectMembers && projectMembers.length > 0) {
      const orderManagers = projectMembers
        .filter((member: any) => member.role === 'order_manager')
        .map((member: any) => member.userId);
      setSelectedOrderManagers(orderManagers);
    }
  }, [projectMembers]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({ description: "현장이 성공적으로 수정되었습니다." });
      navigate(`/projects/${id}`);
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        description: error.message || "현장 수정 중 오류가 발생했습니다." 
      });
    },
  });

  const onSubmit = async (data: any) => {
    const transformedData = {
      ...data,
      totalBudget: data.totalBudget ? parseFloat(data.totalBudget.toString().replace(/[^\d.]/g, '')) : null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      projectManagerId: data.projectManagerId === "none" ? null : data.projectManagerId,
      orderManagerId: data.orderManagerId === "none" ? null : data.orderManagerId,
      orderManagers: selectedOrderManagers, // Include selected order managers
    };

    updateMutation.mutate(transformedData);
  };

  const handleCancel = () => {
    navigate(`/projects/${id}`);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">현장을 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-4">요청하신 현장이 존재하지 않거나 삭제되었습니다.</p>
          <Button onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1366px] mx-auto p-6 space-y-6">
      <PageHeader
        title="현장 수정"
        description={`${project.projectName} 현장 정보를 수정합니다`}
      />

      <Card className="max-w-4xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">현장 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>현장명 *</FormLabel>
                      <FormControl>
                        <Input placeholder="현장명을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>현장 코드</FormLabel>
                      <FormControl>
                        <Input placeholder="현장 코드를 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>클라이언트명</FormLabel>
                      <FormControl>
                        <Input placeholder="클라이언트명을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>현장 유형</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="현장 유형을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>위치</FormLabel>
                      <FormControl>
                        <Input placeholder="현장 위치를 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상태</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="상태를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectStatuses.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              {status.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectManagerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>현장 관리자</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="현장 관리자를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">선택 안함</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Multi-select Order Managers */}
                <FormItem>
                  <FormLabel>발주 담당자</FormLabel>
                  <FormControl>
                    <Popover open={openOrderManagerSelect} onOpenChange={setOpenOrderManagerSelect}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openOrderManagerSelect}
                          className="w-full justify-between"
                        >
                          {selectedOrderManagers.length === 0 ? (
                            "발주 담당자를 선택하세요"
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {selectedOrderManagers.slice(0, 2).map((managerId) => {
                                const user = users.find(u => u.id === managerId);
                                return (
                                  <Badge key={managerId} variant="secondary" className="text-xs">
                                    {user?.name || managerId}
                                  </Badge>
                                );
                              })}
                              {selectedOrderManagers.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{selectedOrderManagers.length - 2}명 더
                                </Badge>
                              )}
                            </div>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="담당자 검색..." />
                          <CommandEmpty>담당자를 찾을 수 없습니다.</CommandEmpty>
                          <CommandGroup>
                            {users.map((user) => (
                              <CommandItem
                                key={user.id}
                                onSelect={() => {
                                  const isSelected = selectedOrderManagers.includes(user.id);
                                  if (isSelected) {
                                    setSelectedOrderManagers(prev => prev.filter(id => id !== user.id));
                                  } else {
                                    setSelectedOrderManagers(prev => [...prev, user.id]);
                                  }
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedOrderManagers.includes(user.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {user.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                  
                  {/* Selected Order Managers Display */}
                  {selectedOrderManagers.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">선택된 발주 담당자:</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedOrderManagers.map((managerId) => {
                          const user = users.find(u => u.id === managerId);
                          return (
                            <Badge key={managerId} variant="default" className="text-xs">
                              {user?.name || managerId}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="ml-1 h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => {
                                  setSelectedOrderManagers(prev => prev.filter(id => id !== managerId));
                                }}
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </FormItem>

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>시작일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>총 예산</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="₩0" 
                          value={field.value ? formatKoreanWon(field.value) : ''}
                          onChange={(e) => {
                            const numericValue = parseKoreanWon(e.target.value);
                            field.onChange(numericValue.toString());
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>활성 상태</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="현장 설명을 입력하세요"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}