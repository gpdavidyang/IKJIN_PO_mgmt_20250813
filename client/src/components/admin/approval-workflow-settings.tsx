/**
 * Approval Workflow Settings - Enhanced for System Admin Tab
 * 시스템 관리 탭의 승인 워크플로 설정 컴포넌트 (탭 내용만)
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Edit, Plus, Settings, Workflow, ChevronRight, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApprovalWorkflowSettings {
  id: number;
  companyId: number;
  approvalMode: 'direct' | 'staged';
  directApprovalRoles: string[];
  skipLowerStages: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApprovalStepTemplate {
  id: number;
  companyId: number;
  templateName: string;
  stepOrder: number;
  requiredRole: string;
  minAmount: string;
  maxAmount?: string;
  canSkip: boolean;
  isOptional: boolean;
  isActive: boolean;
  description?: string;
}

const roleLabels: { [key: string]: string } = {
  'admin': '관리자',
  'executive': '임원',
  'hq_management': '본사 관리자',
  'project_manager': '프로젝트 매니저',
  'field_worker': '현장 작업자'
};

const roleOptions = [
  { value: 'admin', label: '관리자' },
  { value: 'executive', label: '임원' },
  { value: 'hq_management', label: '본사 관리자' },
  { value: 'project_manager', label: '프로젝트 매니저' },
  { value: 'field_worker', label: '현장 작업자' }
];

export function ApprovalWorkflowSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCompanyId] = useState(1); // Default company
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ApprovalStepTemplate | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<string[]>([]);
  
  const [workflowForm, setWorkflowForm] = useState({
    approvalMode: 'direct' as 'direct' | 'staged',
    directApprovalRoles: [] as string[],
    skipLowerStages: false
  });
  
  const [templateForm, setTemplateForm] = useState({
    templateName: '',
    stepOrder: '',
    requiredRole: '',
    minAmount: '',
    maxAmount: '',
    canSkip: false,
    isOptional: false,
    description: ''
  });

  // Fetch workflow settings
  const { data: workflowSettings, isLoading: isLoadingWorkflow } = useQuery<ApprovalWorkflowSettings>({
    queryKey: ['workflow-settings', selectedCompanyId],
    queryFn: async () => {
      const response = await fetch(`/api/approval-settings/workflow-settings/${selectedCompanyId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch workflow settings');
      }
      
      const result = await response.json();
      return result.data;
    }
  });

  // Fetch step templates
  const { data: stepTemplates = [], isLoading: isLoadingTemplates } = useQuery<ApprovalStepTemplate[]>({
    queryKey: ['step-templates', selectedCompanyId],
    queryFn: async () => {
      const response = await fetch(`/api/approval-settings/step-templates/${selectedCompanyId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch step templates');
      }
      
      const result = await response.json();
      return result.data;
    }
  });

  // Update workflow settings
  const workflowMutation = useMutation({
    mutationFn: async (data: typeof workflowForm & { companyId: number }) => {
      const response = await fetch('/api/approval-settings/workflow-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update workflow settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-settings'] });
      toast({
        title: "성공",
        description: "워크플로 설정이 저장되었습니다."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create/update template
  const templateMutation = useMutation({
    mutationFn: async (data: typeof templateForm & { companyId: number; id?: number }) => {
      const url = data.id 
        ? `/api/approval-settings/step-templates/${data.id}`
        : '/api/approval-settings/step-templates';
      const method = data.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          stepOrder: parseInt(data.stepOrder),
          minAmount: data.minAmount,
          maxAmount: data.maxAmount || null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['step-templates'] });
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
      toast({
        title: "성공",
        description: editingTemplate ? "템플릿이 수정되었습니다." : "템플릿이 생성되었습니다."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete template
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/approval-settings/step-templates/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['step-templates'] });
      toast({
        title: "성공",
        description: "템플릿이 삭제되었습니다."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetTemplateForm = () => {
    setTemplateForm({
      templateName: '',
      stepOrder: '',
      requiredRole: '',
      minAmount: '',
      maxAmount: '',
      canSkip: false,
      isOptional: false,
      description: ''
    });
  };

  const handleEditTemplate = (template: ApprovalStepTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      templateName: template.templateName,
      stepOrder: template.stepOrder.toString(),
      requiredRole: template.requiredRole,
      minAmount: template.minAmount,
      maxAmount: template.maxAmount || '',
      canSkip: template.canSkip,
      isOptional: template.isOptional,
      description: template.description || ''
    });
    setIsTemplateDialogOpen(true);
  };

  const handleRoleToggle = (role: string) => {
    setWorkflowForm(prev => ({
      ...prev,
      directApprovalRoles: prev.directApprovalRoles.includes(role)
        ? prev.directApprovalRoles.filter(r => r !== role)
        : [...prev.directApprovalRoles, role]
    }));
  };

  const toggleTemplateExpansion = (templateName: string) => {
    setExpandedTemplates(prev => 
      prev.includes(templateName)
        ? prev.filter(t => t !== templateName)
        : [...prev, templateName]
    );
  };

  // Group templates by name
  const groupedTemplates = stepTemplates.reduce((groups: { [key: string]: ApprovalStepTemplate[] }, template) => {
    if (!groups[template.templateName]) {
      groups[template.templateName] = [];
    }
    groups[template.templateName].push(template);
    return groups;
  }, {});

  // Sort templates within each group by stepOrder
  Object.keys(groupedTemplates).forEach(templateName => {
    groupedTemplates[templateName].sort((a, b) => a.stepOrder - b.stepOrder);
  });

  if (isLoadingWorkflow || isLoadingTemplates) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Usage Guide Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-800">
            <Workflow className="w-5 h-5" />
            <span>승인 워크플로우 관리</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-3">
          <div className="space-y-2">
            <p><strong>🚀 새로운 템플릿 빌더:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>- 시각적 인터페이스로 워크플로우 템플릿을 쉽게 생성하고 관리</li>
              <li>- 금액별, 카테고리별 조건부 승인 프로세스 설정</li>
              <li>- 자동 승인, 알림 설정, 단계 건너뛰기 등 고급 기능</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <p><strong>📋 레거시 설정:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>- 기존 워크플로우 설정과의 호환성 유지</li>
              <li>- 단순한 승인 모드 설정 (직접/단계별)</li>
              <li>- 기본 승인 단계 템플릿 관리</li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-3 rounded-lg">
            <p><strong>💡 권장사항:</strong> 새로운 프로젝트는 <strong>템플릿 빌더</strong>를 사용하시고, 
            기존 설정이 있는 경우 <strong>레거시 설정</strong>에서 관리하세요.</p>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            템플릿 빌더 (신규)
          </TabsTrigger>
          <TabsTrigger value="legacy" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            레거시 설정
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-6">
          <ApprovalWorkflowTemplateBuilder />
        </TabsContent>

        <TabsContent value="legacy" className="mt-6 space-y-6">
          {/* Workflow Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>기본 워크플로우 설정</span>
          </CardTitle>
          <CardDescription>
            회사의 기본 승인 워크플로우 방식을 설정합니다.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Approval Mode */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">승인 모드</Label>
            <Select 
              value={workflowForm.approvalMode} 
              onValueChange={(value) => setWorkflowForm(prev => ({ ...prev, approvalMode: value as 'direct' | 'staged' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">직접 승인</SelectItem>
                <SelectItem value="staged">단계별 승인</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">
              {workflowForm.approvalMode === 'direct' 
                ? "직접승인 모드는 발주서 생성 시, 승인절차 없이 바로 발주서가 생성이 됩니다."
                : "여러 단계를 거쳐 순차적으로 승인하는 방식입니다."
              }
            </p>
          </div>

          {/* Direct Approval Roles */}
          {workflowForm.approvalMode === 'direct' && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">직접 승인 가능 역할</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {roleOptions.map(role => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={role.value}
                      checked={workflowForm.directApprovalRoles.includes(role.value)}
                      onChange={() => handleRoleToggle(role.value)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={role.value} className="text-sm">
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skip Lower Stages */}
          {workflowForm.approvalMode === 'staged' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">하위 단계 건너뛰기 허용</Label>
                <Switch 
                  checked={workflowForm.skipLowerStages}
                  onCheckedChange={(checked) => setWorkflowForm(prev => ({ ...prev, skipLowerStages: checked }))}
                />
              </div>
              <p className="text-sm text-gray-600">
                상위 권한자가 하위 승인 단계를 건너뛸 수 있도록 허용합니다.
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={() => workflowMutation.mutate({ ...workflowForm, companyId: selectedCompanyId })}
              disabled={workflowMutation.isPending}
            >
              {workflowMutation.isPending ? "저장 중..." : "설정 저장"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>승인 단계 템플릿</CardTitle>
              <CardDescription>단계별 승인을 위한 템플릿을 관리합니다.</CardDescription>
            </div>
            
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { resetTemplateForm(); setEditingTemplate(null); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  새 템플릿 단계 추가
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? "승인 단계 수정" : "새 승인 단계 추가"}
                  </DialogTitle>
                  <DialogDescription>
                    승인 단계의 상세 정보를 설정합니다.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  templateMutation.mutate({
                    ...templateForm,
                    companyId: selectedCompanyId,
                    id: editingTemplate?.id
                  });
                }} className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="templateName">템플릿 이름</Label>
                      <Input
                        id="templateName"
                        value={templateForm.templateName}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, templateName: e.target.value }))}
                        placeholder="예: 일반발주, 고액발주"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="stepOrder">단계 순서</Label>
                      <Input
                        id="stepOrder"
                        type="number"
                        value={templateForm.stepOrder}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, stepOrder: e.target.value }))}
                        placeholder="1, 2, 3..."
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="requiredRole">필요 역할</Label>
                    <Select 
                      value={templateForm.requiredRole} 
                      onValueChange={(value) => setTemplateForm(prev => ({ ...prev, requiredRole: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="역할을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="minAmount">최소 금액 (원)</Label>
                      <Input
                        id="minAmount"
                        type="number"
                        value={templateForm.minAmount}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, minAmount: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="maxAmount">최대 금액 (원, 선택사항)</Label>
                      <Input
                        id="maxAmount"
                        type="number"
                        value={templateForm.maxAmount}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, maxAmount: e.target.value }))}
                        placeholder="제한 없음"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={templateForm.canSkip}
                        onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, canSkip: checked }))}
                      />
                      <Label>건너뛰기 허용</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={templateForm.isOptional}
                        onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, isOptional: checked }))}
                      />
                      <Label>선택적 단계</Label>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">설명 (선택사항)</Label>
                    <Textarea
                      id="description"
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="이 승인 단계에 대한 설명"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                      취소
                    </Button>
                    <Button type="submit" disabled={templateMutation.isPending}>
                      {templateMutation.isPending 
                        ? (editingTemplate ? "수정 중..." : "생성 중...") 
                        : (editingTemplate ? "수정" : "생성")
                      }
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {Object.keys(groupedTemplates).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              설정된 승인 단계 템플릿이 없습니다. 새 템플릿을 추가해보세요.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTemplates).map(([templateName, templates]) => (
                <Card key={templateName}>
                  <CardHeader 
                    className="cursor-pointer pb-3"
                    onClick={() => toggleTemplateExpansion(templateName)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <Workflow className="w-4 h-4" />
                        <span>{templateName}</span>
                        <Badge variant="secondary" className="text-xs">{templates.length}단계</Badge>
                      </CardTitle>
                      {expandedTemplates.includes(templateName) ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </div>
                  </CardHeader>
                  
                  {expandedTemplates.includes(templateName) && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {templates.map((template) => (
                          <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <Badge variant="outline" className="text-xs">단계 {template.stepOrder}</Badge>
                                <span className="font-medium text-sm">{roleLabels[template.requiredRole]}</span>
                                <span className="text-sm text-gray-600">
                                  {parseFloat(template.minAmount).toLocaleString()}원
                                  {template.maxAmount && ` ~ ${parseFloat(template.maxAmount).toLocaleString()}원`}
                                </span>
                                {template.canSkip && <Badge variant="secondary" className="text-xs">건너뛰기 가능</Badge>}
                                {template.isOptional && <Badge variant="secondary" className="text-xs">선택적</Badge>}
                              </div>
                              {template.description && (
                                <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                              )}
                            </div>
                            
                            <div className="flex space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-red-600">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>템플릿 단계 삭제</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      이 승인 단계를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>취소</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(template.id)}
                                      disabled={deleteMutation.isPending}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {deleteMutation.isPending ? "삭제 중..." : "삭제"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}