import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Shield, DollarSign, Users, AlertCircle, Save, RefreshCw } from "lucide-react";
import { formatKoreanWon } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ApprovalWorkflowSettings } from "@shared/schema";

const userRoles = [
  { value: "field_worker", label: "현장 실무자", color: "bg-gray-100" },
  { value: "project_manager", label: "현장 관리자", color: "bg-blue-100" },
  { value: "hq_management", label: "본사 관리부", color: "bg-orange-100" },
  { value: "executive", label: "임원", color: "bg-purple-100" },
  { value: "admin", label: "시스템 관리자", color: "bg-red-100" }
];

export function ApprovalWorkflowSettings() {
  const { toast } = useToast();
  const [approvalMode, setApprovalMode] = useState<"direct" | "staged">("staged");
  const [directApprovalRoles, setDirectApprovalRoles] = useState<string[]>([]);
  const [stagedThresholds, setStagedThresholds] = useState<Record<string, number>>({
    field_worker: 0,
    project_manager: 5000000,
    hq_management: 30000000,
    executive: 100000000,
    admin: 999999999
  });
  const [requireAllStages, setRequireAllStages] = useState(true);
  const [skipLowerStages, setSkipLowerStages] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<ApprovalWorkflowSettings>({
    queryKey: ["/api/admin/approval-workflow-settings"],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<ApprovalWorkflowSettings>) => {
      return await apiRequest("PUT", "/api/admin/approval-workflow-settings", data);
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "승인 워크플로우 설정이 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approval-workflow-settings"] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "설정 저장에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Load settings when data is fetched
  useEffect(() => {
    if (settings) {
      setApprovalMode(settings.approvalMode as "direct" | "staged");
      setDirectApprovalRoles(settings.directApprovalRoles || []);
      setStagedThresholds(settings.stagedApprovalThresholds || stagedThresholds);
      setRequireAllStages(settings.requireAllStages ?? true);
      setSkipLowerStages(settings.skipLowerStages ?? false);
    }
  }, [settings]);

  const handleRoleToggle = (role: string) => {
    setDirectApprovalRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleThresholdChange = (role: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, "")) || 0;
    setStagedThresholds(prev => ({
      ...prev,
      [role]: numValue
    }));
  };

  const handleSave = () => {
    updateSettingsMutation.mutate({
      approvalMode,
      directApprovalRoles,
      stagedApprovalThresholds: stagedThresholds,
      requireAllStages,
      skipLowerStages
    });
  };

  const handleReset = () => {
    if (settings) {
      setApprovalMode(settings.approvalMode as "direct" | "staged");
      setDirectApprovalRoles(settings.directApprovalRoles || []);
      setStagedThresholds(settings.stagedApprovalThresholds || stagedThresholds);
      setRequireAllStages(settings.requireAllStages ?? true);
      setSkipLowerStages(settings.skipLowerStages ?? false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">설정을 불러오는 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          승인 워크플로우 설정
        </CardTitle>
        <CardDescription>
          발주서 승인 프로세스를 설정합니다. 직접 승인 또는 단계별 승인 방식을 선택할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 승인 모드 선택 */}
        <div className="space-y-3">
          <Label>승인 방식</Label>
          <Tabs value={approvalMode} onValueChange={(v) => setApprovalMode(v as "direct" | "staged")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="direct">직접 승인</TabsTrigger>
              <TabsTrigger value="staged">단계별 승인</TabsTrigger>
            </TabsList>

            {/* 직접 승인 설정 */}
            <TabsContent value="direct" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  직접 승인 방식에서는 선택된 역할이 금액 제한 없이 바로 승인할 수 있습니다.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label>직접 승인 가능 역할</Label>
                <div className="space-y-2">
                  {userRoles.map((role) => (
                    <div key={role.value} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={directApprovalRoles.includes(role.value)}
                          onCheckedChange={() => handleRoleToggle(role.value)}
                        />
                        <span className="font-medium">{role.label}</span>
                      </div>
                      <Badge className={role.color} variant="secondary">
                        {directApprovalRoles.includes(role.value) ? "승인 가능" : "승인 불가"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 단계별 승인 설정 */}
            <TabsContent value="staged" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  단계별 승인 방식에서는 각 역할별 승인 금액 한도가 적용됩니다.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label>역할별 승인 금액 한도</Label>
                <div className="space-y-2">
                  {userRoles.map((role) => (
                    <div key={role.value} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="font-medium min-w-[120px]">{role.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <Input
                          type="text"
                          value={formatKoreanWon(stagedThresholds[role.value] || 0)}
                          onChange={(e) => handleThresholdChange(role.value, e.target.value)}
                          className="w-40 text-right"
                          disabled={role.value === "field_worker"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>추가 옵션</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">모든 단계 승인 필요</div>
                      <div className="text-sm text-gray-500">
                        모든 필요한 승인 단계를 거쳐야 최종 승인됩니다.
                      </div>
                    </div>
                    <Switch
                      checked={requireAllStages}
                      onCheckedChange={setRequireAllStages}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">상위 역할 하위 단계 건너뛰기</div>
                      <div className="text-sm text-gray-500">
                        상위 역할이 하위 단계의 승인을 건너뛸 수 있습니다.
                      </div>
                    </div>
                    <Switch
                      checked={skipLowerStages}
                      onCheckedChange={setSkipLowerStages}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            초기화
          </Button>
          <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateSettingsMutation.isPending ? "저장 중..." : "설정 저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}