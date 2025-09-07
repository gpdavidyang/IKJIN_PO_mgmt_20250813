import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Copy, 
  ArrowUp, 
  ArrowDown,
  Settings2,
  Users,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Info,
  ChevronRight,
  Workflow,
  GitBranch,
  Target,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatKoreanWon } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { RoleDisplay } from '@/components/role-display';

interface WorkflowTemplate {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  minAmount?: number;
  maxAmount?: number;
  categoryFilter?: string[];
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStep {
  id?: number;
  stepOrder: number;
  requiredRole: string;
  description?: string;
  skipCondition?: 'amount_below' | 'category_match' | 'always';
  skipThreshold?: number;
  skipCategories?: string[];
  autoApprove?: boolean;
  autoApproveDelay?: number; // in hours
  notificationSettings?: {
    onPending: boolean;
    onApproved: boolean;
    onRejected: boolean;
    reminderInterval?: number; // in hours
  };
}

interface TemplateFormData {
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  minAmount?: number;
  maxAmount?: number;
  categoryFilter?: string[];
  steps: WorkflowStep[];
}

export function ApprovalWorkflowTemplateBuilder() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WorkflowTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    isActive: true,
    isDefault: false,
    steps: []
  });

  // Query hooks
  const { data: templates = [], isLoading } = useQuery<WorkflowTemplate[]>({
    queryKey: ['/api/approval-workflow-templates'],
    queryFn: async () => {
      const response = await fetch('/api/approval-workflow-templates', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ['/api/categories/list'],
    queryFn: async () => {
      const response = await fetch('/api/categories/list', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data: TemplateFormData) => 
      apiRequest('POST', '/api/approval-workflow-templates', data),
    onSuccess: () => {
      toast({ title: '성공', description: '워크플로우 템플릿이 생성되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['/api/approval-workflow-templates'] });
      setIsCreating(false);
      resetForm();
    },
    onError: () => {
      toast({ title: '오류', description: '템플릿 생성에 실패했습니다.', variant: 'destructive' });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TemplateFormData }) => 
      apiRequest('PUT', `/api/approval-workflow-templates/${id}`, data),
    onSuccess: () => {
      toast({ title: '성공', description: '워크플로우 템플릿이 수정되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['/api/approval-workflow-templates'] });
      setIsEditing(false);
      setSelectedTemplate(null);
      resetForm();
    },
    onError: () => {
      toast({ title: '오류', description: '템플릿 수정에 실패했습니다.', variant: 'destructive' });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/approval-workflow-templates/${id}`),
    onSuccess: () => {
      toast({ title: '성공', description: '워크플로우 템플릿이 삭제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['/api/approval-workflow-templates'] });
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
      if (selectedTemplate?.id === templateToDelete?.id) {
        setSelectedTemplate(null);
      }
    },
    onError: () => {
      toast({ title: '오류', description: '템플릿 삭제에 실패했습니다.', variant: 'destructive' });
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('POST', `/api/approval-workflow-templates/${id}/duplicate`),
    onSuccess: () => {
      toast({ title: '성공', description: '워크플로우 템플릿이 복제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['/api/approval-workflow-templates'] });
    },
    onError: () => {
      toast({ title: '오류', description: '템플릿 복제에 실패했습니다.', variant: 'destructive' });
    }
  });

  // Helper functions
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isActive: true,
      isDefault: false,
      steps: []
    });
  };

  const handleAddStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          stepOrder: prev.steps.length + 1,
          requiredRole: 'project_manager',
          notificationSettings: {
            onPending: true,
            onApproved: true,
            onRejected: true
          }
        }
      ]
    }));
  };

  const handleUpdateStep = (index: number, updates: Partial<WorkflowStep>) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, ...updates } : step
      )
    }));
  };

  const handleRemoveStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, stepOrder: i + 1 }))
    }));
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.steps.length) return;

    setFormData(prev => {
      const newSteps = [...prev.steps];
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      return {
        ...prev,
        steps: newSteps.map((step, i) => ({ ...step, stepOrder: i + 1 }))
      };
    });
  };

  const handleSave = () => {
    if (!formData.name || formData.steps.length === 0) {
      toast({ 
        title: '입력 오류', 
        description: '템플릿 이름과 최소 1개의 승인 단계가 필요합니다.', 
        variant: 'destructive' 
      });
      return;
    }

    if (isEditing && selectedTemplate) {
      updateTemplateMutation.mutate({
        id: selectedTemplate.id,
        data: formData
      });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const handleEdit = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      isActive: template.isActive,
      isDefault: template.isDefault,
      minAmount: template.minAmount,
      maxAmount: template.maxAmount,
      categoryFilter: template.categoryFilter,
      steps: template.steps
    });
    setIsEditing(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'field_worker': return 'text-gray-600';
      case 'project_manager': return 'text-blue-600';
      case 'hq_management': return 'text-purple-600';
      case 'executive': return 'text-red-600';
      case 'admin': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'executive': return 'destructive';
      case 'admin': return 'default';
      case 'hq_management': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              <span>승인 워크플로우 템플릿 관리</span>
            </div>
            <Button
              onClick={() => setIsCreating(true)}
              size="sm"
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              새 템플릿
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            발주서 승인 프로세스를 위한 워크플로우 템플릿을 생성하고 관리합니다.
            각 템플릿은 금액, 카테고리별로 다른 승인 단계를 정의할 수 있습니다.
          </p>
        </CardContent>
      </Card>

      {/* Template List and Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm">템플릿 목록</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    로딩 중...
                  </div>
                ) : templates.length === 0 ? (
                  <div className="p-4 text-center">
                    <Workflow className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      템플릿이 없습니다
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {templates.map(template => (
                      <div
                        key={template.id}
                        className={cn(
                          "p-4 cursor-pointer hover:bg-accent transition-colors",
                          selectedTemplate?.id === template.id && "bg-accent"
                        )}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            {template.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {template.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {template.isDefault && (
                              <Badge variant="default" className="text-xs">
                                기본
                              </Badge>
                            )}
                            <Badge 
                              variant={template.isActive ? "outline" : "secondary"}
                              className="text-xs"
                            >
                              {template.isActive ? '활성' : '비활성'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{template.steps.length}개 승인 단계</span>
                          </div>
                          
                          {(template.minAmount || template.maxAmount) && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              <span>
                                {template.minAmount && `${formatKoreanWon(template.minAmount)} 이상`}
                                {template.minAmount && template.maxAmount && ' ~ '}
                                {template.maxAmount && `${formatKoreanWon(template.maxAmount)} 이하`}
                              </span>
                            </div>
                          )}
                          
                          {template.categoryFilter && template.categoryFilter.length > 0 && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>{template.categoryFilter.length}개 카테고리</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(template);
                            }}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            편집
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateTemplateMutation.mutate(template.id);
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            복제
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTemplateToDelete(template);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            삭제
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Template Details/Editor */}
        <div className="lg:col-span-2">
          {selectedTemplate && !isEditing && !isCreating ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base">{selectedTemplate.name}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(true)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      미리보기
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEdit(selectedTemplate)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      편집
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">개요</TabsTrigger>
                    <TabsTrigger value="steps">승인 단계</TabsTrigger>
                    <TabsTrigger value="conditions">조건</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">설명</Label>
                      <p className="text-sm mt-1">
                        {selectedTemplate.description || '설명이 없습니다'}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">상태</Label>
                        <div className="mt-1">
                          <Badge variant={selectedTemplate.isActive ? "default" : "secondary"}>
                            {selectedTemplate.isActive ? '활성' : '비활성'}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">기본 템플릿</Label>
                        <div className="mt-1">
                          <Badge variant={selectedTemplate.isDefault ? "default" : "outline"}>
                            {selectedTemplate.isDefault ? '예' : '아니오'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">생성일</Label>
                      <p className="text-sm mt-1">
                        {new Date(selectedTemplate.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="steps" className="space-y-4">
                    {selectedTemplate.steps.map((step, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {step.stepOrder}단계
                              </Badge>
                              <RoleDisplay role={step.requiredRole} />
                            </div>
                            {step.autoApprove && (
                              <Badge variant="secondary" className="text-xs">
                                자동 승인
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {step.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {step.description}
                            </p>
                          )}
                          
                          {step.skipCondition && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <AlertTriangle className="h-3 w-3" />
                              <span>
                                건너뛰기 조건: {
                                  step.skipCondition === 'amount_below' ? 
                                    `${formatKoreanWon(step.skipThreshold || 0)} 미만` :
                                  step.skipCondition === 'category_match' ?
                                    `특정 카테고리` :
                                    '항상'
                                }
                              </span>
                            </div>
                          )}
                          
                          {step.notificationSettings && (
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              {step.notificationSettings.onPending && (
                                <Badge variant="outline" className="text-xs">
                                  대기 알림
                                </Badge>
                              )}
                              {step.notificationSettings.onApproved && (
                                <Badge variant="outline" className="text-xs">
                                  승인 알림
                                </Badge>
                              )}
                              {step.notificationSettings.onRejected && (
                                <Badge variant="outline" className="text-xs">
                                  반려 알림
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="conditions" className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">금액 범위</Label>
                      <p className="text-sm mt-1">
                        {selectedTemplate.minAmount || selectedTemplate.maxAmount ? (
                          <>
                            {selectedTemplate.minAmount && `${formatKoreanWon(selectedTemplate.minAmount)} 이상`}
                            {selectedTemplate.minAmount && selectedTemplate.maxAmount && ' ~ '}
                            {selectedTemplate.maxAmount && `${formatKoreanWon(selectedTemplate.maxAmount)} 이하`}
                          </>
                        ) : (
                          '제한 없음'
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">카테고리 필터</Label>
                      <div className="mt-2">
                        {selectedTemplate.categoryFilter && selectedTemplate.categoryFilter.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedTemplate.categoryFilter.map(cat => (
                              <Badge key={cat} variant="outline" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">모든 카테고리</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (isCreating || isEditing) ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{isEditing ? '템플릿 편집' : '새 템플릿 생성'}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCreating(false);
                        setIsEditing(false);
                        resetForm();
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      저장
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">템플릿 이름 *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="예: 표준 승인 프로세스"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">설명</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="템플릿에 대한 설명을 입력하세요"
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="isActive">활성화</Label>
                        <Switch
                          id="isActive"
                          checked={formData.isActive}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, isActive: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="isDefault">기본 템플릿</Label>
                        <Switch
                          id="isDefault"
                          checked={formData.isDefault}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, isDefault: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Amount Range */}
                  <div>
                    <Label>금액 범위 (선택사항)</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label htmlFor="minAmount" className="text-xs text-muted-foreground">
                          최소 금액
                        </Label>
                        <Input
                          id="minAmount"
                          type="number"
                          value={formData.minAmount || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            minAmount: e.target.value ? parseInt(e.target.value) : undefined 
                          }))}
                          placeholder="0"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxAmount" className="text-xs text-muted-foreground">
                          최대 금액
                        </Label>
                        <Input
                          id="maxAmount"
                          type="number"
                          value={formData.maxAmount || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            maxAmount: e.target.value ? parseInt(e.target.value) : undefined 
                          }))}
                          placeholder="제한 없음"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Workflow Steps */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label>승인 단계 *</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddStep}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        단계 추가
                      </Button>
                    </div>
                    
                    {formData.steps.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="py-8 text-center">
                          <GitBranch className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">
                            승인 단계가 없습니다
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={handleAddStep}
                          >
                            첫 단계 추가
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {formData.steps.map((step, index) => (
                          <Card key={index}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {step.stepOrder}단계
                                  </Badge>
                                  <Select
                                    value={step.requiredRole}
                                    onValueChange={(value) => 
                                      handleUpdateStep(index, { requiredRole: value })
                                    }
                                  >
                                    <SelectTrigger className="w-[150px] h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="field_worker">현장 실무자</SelectItem>
                                      <SelectItem value="project_manager">현장 관리자</SelectItem>
                                      <SelectItem value="hq_management">본사 관리부</SelectItem>
                                      <SelectItem value="executive">임원/대표</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleMoveStep(index, 'up')}
                                    disabled={index === 0}
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleMoveStep(index, 'down')}
                                    disabled={index === formData.steps.length - 1}
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveStep(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                              <div>
                                <Label htmlFor={`step-desc-${index}`} className="text-xs">
                                  설명 (선택사항)
                                </Label>
                                <Input
                                  id={`step-desc-${index}`}
                                  value={step.description || ''}
                                  onChange={(e) => 
                                    handleUpdateStep(index, { description: e.target.value })
                                  }
                                  placeholder="이 승인 단계에 대한 설명"
                                  className="mt-1"
                                />
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`auto-approve-${index}`}
                                    checked={step.autoApprove || false}
                                    onCheckedChange={(checked) => 
                                      handleUpdateStep(index, { autoApprove: checked })
                                    }
                                  />
                                  <Label 
                                    htmlFor={`auto-approve-${index}`} 
                                    className="text-xs cursor-pointer"
                                  >
                                    자동 승인
                                  </Label>
                                </div>
                                
                                {step.autoApprove && (
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground">
                                      지연 시간 (시간)
                                    </Label>
                                    <Input
                                      type="number"
                                      value={step.autoApproveDelay || 24}
                                      onChange={(e) => 
                                        handleUpdateStep(index, { 
                                          autoApproveDelay: parseInt(e.target.value) || 24 
                                        })
                                      }
                                      className="w-20 h-7"
                                    />
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Workflow className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">템플릿 선택</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  왼쪽 목록에서 템플릿을 선택하거나 새 템플릿을 생성하세요
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  새 템플릿 생성
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>템플릿 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{templateToDelete?.name}" 템플릿을 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (templateToDelete) {
                  deleteTemplateMutation.mutate(templateToDelete.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      {selectedTemplate && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>워크플로우 미리보기: {selectedTemplate.name}</DialogTitle>
              <DialogDescription>
                이 템플릿이 적용될 때의 승인 프로세스 흐름입니다
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedTemplate.steps.map((step, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
                      index === 0 ? "bg-blue-500" : "bg-gray-400"
                    )}>
                      {step.stepOrder}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <RoleDisplay role={step.requiredRole} />
                      {step.autoApprove && (
                        <Badge variant="secondary" className="text-xs">
                          자동 승인 ({step.autoApproveDelay}시간 후)
                        </Badge>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                  {index < selectedTemplate.steps.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                닫기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}