import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit2, Trash2, Settings, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/ui/theme-provider';

interface ApprovalWorkflowSettings {
  id?: number;
  companyId: number;
  approvalMode: 'direct' | 'staged';
  directApprovalRoles: string[];
  stagedApprovalThresholds: Record<string, number>;
  requireAllStages: boolean;
  skipLowerStages: boolean;
  isActive: boolean;
}

interface ApprovalStepTemplate {
  id?: number;
  templateName: string;
  companyId: number;
  stepOrder: number;
  requiredRole: string;
  minAmount: string;
  maxAmount?: string;
  isOptional: boolean;
  canSkip: boolean;
  description?: string;
  isActive: boolean;
}

interface ApprovalSettingsManagerProps {
  companyId: number;
}

const userRoles = [
  { value: 'field_worker', label: '현장 작업자' },
  { value: 'project_manager', label: '프로젝트 매니저' },
  { value: 'hq_management', label: '본사 관리자' },
  { value: 'executive', label: '임원' },
  { value: 'admin', label: '시스템 관리자' }
];

export function ApprovalSettingsManager({ companyId }: ApprovalSettingsManagerProps) {
  const { isDarkMode } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [workflowSettings, setWorkflowSettings] = useState<ApprovalWorkflowSettings>({
    companyId,
    approvalMode: 'direct',
    directApprovalRoles: ['admin'],
    stagedApprovalThresholds: {},
    requireAllStages: true,
    skipLowerStages: false,
    isActive: true
  });

  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ApprovalStepTemplate | null>(null);
  const [newStepTemplate, setNewStepTemplate] = useState<Partial<ApprovalStepTemplate>>({
    templateName: 'default',
    companyId,
    stepOrder: 1,
    requiredRole: 'project_manager',
    minAmount: '0',
    isOptional: false,
    canSkip: false,
    isActive: true
  });

  // 워크플로 설정 조회
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['approval-workflow-settings', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/approval-settings/workflow-settings/${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    }
  });

  // 단계 템플릿 조회
  const { data: templatesData, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['approval-step-templates', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/approval-settings/step-templates/${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // 워크플로 설정 저장
  const saveWorkflowSettings = useMutation({
    mutationFn: async (settings: ApprovalWorkflowSettings) => {
      const response = await fetch('/api/approval-settings/workflow-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to save settings');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: '설정이 저장되었습니다' });
      queryClient.invalidateQueries({ queryKey: ['approval-workflow-settings'] });
    },
    onError: () => {
      toast({ title: '설정 저장에 실패했습니다', variant: 'destructive' });
    }
  });

  // 단계 템플릿 저장
  const saveStepTemplate = useMutation({
    mutationFn: async (template: Partial<ApprovalStepTemplate>) => {
      const url = template.id 
        ? `/api/approval-settings/step-templates/${template.id}`
        : '/api/approval-settings/step-templates';
      const method = template.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      if (!response.ok) throw new Error('Failed to save template');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: '승인 단계가 저장되었습니다' });
      queryClient.invalidateQueries({ queryKey: ['approval-step-templates'] });
      setIsStepDialogOpen(false);
      setEditingStep(null);
      setNewStepTemplate({
        templateName: 'default',
        companyId,
        stepOrder: 1,
        requiredRole: 'project_manager',
        minAmount: '0',
        isOptional: false,
        canSkip: false,
        isActive: true
      });
    },
    onError: () => {
      toast({ title: '승인 단계 저장에 실패했습니다', variant: 'destructive' });
    }
  });

  // 단계 템플릿 삭제
  const deleteStepTemplate = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch(`/api/approval-settings/step-templates/${templateId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete template');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: '승인 단계가 삭제되었습니다' });
      queryClient.invalidateQueries({ queryKey: ['approval-step-templates'] });
    },
    onError: () => {
      toast({ title: '승인 단계 삭제에 실패했습니다', variant: 'destructive' });
    }
  });

  useEffect(() => {
    if (settingsData?.data) {
      setWorkflowSettings(settingsData.data);
    }
  }, [settingsData]);

  const handleSaveWorkflow = () => {
    saveWorkflowSettings.mutate(workflowSettings);
  };

  const handleSaveStepTemplate = () => {
    const template = editingStep || newStepTemplate;
    saveStepTemplate.mutate(template);
  };

  const handleEditStep = (step: ApprovalStepTemplate) => {
    setEditingStep(step);
    setIsStepDialogOpen(true);
  };

  const handleDeleteStep = (stepId: number) => {
    if (confirm('이 승인 단계를 삭제하시겠습니까?')) {
      deleteStepTemplate.mutate(stepId);
    }
  };

  const templates = templatesData?.data || [];
  const groupedTemplates = templates.reduce((acc: Record<string, ApprovalStepTemplate[]>, template: ApprovalStepTemplate) => {
    if (!acc[template.templateName]) {
      acc[template.templateName] = [];
    }
    acc[template.templateName].push(template);
    return acc;
  }, {});

  if (isLoadingSettings || isLoadingTemplates) {
    return <div className="p-6">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6" />
        <h2 className="text-2xl font-bold">승인 설정 관리</h2>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          승인 설정은 모든 발주서의 승인 프로세스에 영향을 미칩니다. 
          변경 사항은 신중하게 검토 후 적용해주세요.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="workflow" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="workflow">워크플로 설정</TabsTrigger>
          <TabsTrigger value="templates">승인 단계 템플릿</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                기본 승인 방식 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="approval-mode">승인 방식</Label>
                  <Select
                    value={workflowSettings.approvalMode}
                    onValueChange={(value: 'direct' | 'staged') => 
                      setWorkflowSettings(prev => ({ ...prev, approvalMode: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">직접 승인</SelectItem>
                      <SelectItem value="staged">단계별 승인</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {workflowSettings.approvalMode === 'direct' && (
                  <div>
                    <Label>직접 승인 가능 역할</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {userRoles.map(role => (
                        <label key={role.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={workflowSettings.directApprovalRoles.includes(role.value)}
                            onChange={(e) => {
                              const roles = e.target.checked
                                ? [...workflowSettings.directApprovalRoles, role.value]
                                : workflowSettings.directApprovalRoles.filter(r => r !== role.value);
                              setWorkflowSettings(prev => ({ ...prev, directApprovalRoles: roles }));
                            }}
                          />
                          <span className="text-sm">{role.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {workflowSettings.approvalMode === 'staged' && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={workflowSettings.requireAllStages}
                        onCheckedChange={(checked) => 
                          setWorkflowSettings(prev => ({ ...prev, requireAllStages: checked }))
                        }
                      />
                      <Label>모든 단계 승인 필수</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={workflowSettings.skipLowerStages}
                        onCheckedChange={(checked) => 
                          setWorkflowSettings(prev => ({ ...prev, skipLowerStages: checked }))
                        }
                      />
                      <Label>상위 권한자가 하위 단계 건너뛰기 허용</Label>
                    </div>
                  </div>
                )}
              </div>

              <Button 
                onClick={handleSaveWorkflow}
                disabled={saveWorkflowSettings.isPending}
                className="w-full"
              >
                {saveWorkflowSettings.isPending ? '저장 중...' : '워크플로 설정 저장'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">승인 단계 템플릿</h3>
            <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  새 단계 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingStep ? '승인 단계 수정' : '새 승인 단계 추가'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>템플릿 이름</Label>
                      <Input
                        value={editingStep?.templateName || newStepTemplate.templateName}
                        onChange={(e) => {
                          if (editingStep) {
                            setEditingStep({ ...editingStep, templateName: e.target.value });
                          } else {
                            setNewStepTemplate(prev => ({ ...prev, templateName: e.target.value }));
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label>단계 순서</Label>
                      <Input
                        type="number"
                        value={editingStep?.stepOrder || newStepTemplate.stepOrder}
                        onChange={(e) => {
                          const stepOrder = parseInt(e.target.value);
                          if (editingStep) {
                            setEditingStep({ ...editingStep, stepOrder });
                          } else {
                            setNewStepTemplate(prev => ({ ...prev, stepOrder }));
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>필요 역할</Label>
                    <Select
                      value={editingStep?.requiredRole || newStepTemplate.requiredRole}
                      onValueChange={(value) => {
                        if (editingStep) {
                          setEditingStep({ ...editingStep, requiredRole: value });
                        } else {
                          setNewStepTemplate(prev => ({ ...prev, requiredRole: value }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoles.map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>최소 금액</Label>
                      <Input
                        type="number"
                        value={editingStep?.minAmount || newStepTemplate.minAmount}
                        onChange={(e) => {
                          if (editingStep) {
                            setEditingStep({ ...editingStep, minAmount: e.target.value });
                          } else {
                            setNewStepTemplate(prev => ({ ...prev, minAmount: e.target.value }));
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label>최대 금액 (선택사항)</Label>
                      <Input
                        type="number"
                        value={editingStep?.maxAmount || newStepTemplate.maxAmount || ''}
                        onChange={(e) => {
                          if (editingStep) {
                            setEditingStep({ ...editingStep, maxAmount: e.target.value || undefined });
                          } else {
                            setNewStepTemplate(prev => ({ ...prev, maxAmount: e.target.value || undefined }));
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>설명</Label>
                    <Textarea
                      value={editingStep?.description || newStepTemplate.description || ''}
                      onChange={(e) => {
                        if (editingStep) {
                          setEditingStep({ ...editingStep, description: e.target.value });
                        } else {
                          setNewStepTemplate(prev => ({ ...prev, description: e.target.value }));
                        }
                      }}
                      placeholder="이 승인 단계에 대한 설명을 입력하세요"
                    />
                  </div>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingStep?.isOptional || newStepTemplate.isOptional || false}
                        onChange={(e) => {
                          if (editingStep) {
                            setEditingStep({ ...editingStep, isOptional: e.target.checked });
                          } else {
                            setNewStepTemplate(prev => ({ ...prev, isOptional: e.target.checked }));
                          }
                        }}
                      />
                      <span>선택적 단계</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingStep?.canSkip || newStepTemplate.canSkip || false}
                        onChange={(e) => {
                          if (editingStep) {
                            setEditingStep({ ...editingStep, canSkip: e.target.checked });
                          } else {
                            setNewStepTemplate(prev => ({ ...prev, canSkip: e.target.checked }));
                          }
                        }}
                      />
                      <span>건너뛰기 가능</span>
                    </label>
                  </div>
                  <Button 
                    onClick={handleSaveStepTemplate}
                    disabled={saveStepTemplate.isPending}
                    className="w-full"
                  >
                    {saveStepTemplate.isPending ? '저장 중...' : '저장'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {Object.keys(groupedTemplates).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">설정된 승인 단계 템플릿이 없습니다.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  새 단계 추가 버튼을 클릭하여 승인 단계를 설정하세요.
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedTemplates).map(([templateName, steps]) => (
              <Card key={templateName}>
                <CardHeader>
                  <CardTitle>{templateName} 템플릿</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>순서</TableHead>
                        <TableHead>필요 역할</TableHead>
                        <TableHead>금액 범위</TableHead>
                        <TableHead>옵션</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {steps
                        .sort((a, b) => a.stepOrder - b.stepOrder)
                        .map((step) => (
                          <TableRow key={step.id}>
                            <TableCell>{step.stepOrder}</TableCell>
                            <TableCell>
                              {userRoles.find(r => r.value === step.requiredRole)?.label || step.requiredRole}
                            </TableCell>
                            <TableCell>
                              {parseInt(step.minAmount).toLocaleString()}원 
                              {step.maxAmount && ` ~ ${parseInt(step.maxAmount).toLocaleString()}원`}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {step.isOptional && <Badge variant="secondary">선택적</Badge>}
                                {step.canSkip && <Badge variant="outline">건너뛰기 가능</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditStep(step)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteStep(step.id!)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}