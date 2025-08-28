import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { 
  Settings,
  Save,
  RefreshCw,
  Info,
  Archive,
  Trash2,
  Database
} from "lucide-react";
import { useState, useEffect } from "react";
// import { toast } from "sonner"; // Temporarily disabled for build
const toast = {
  success: (message: string) => console.log('✅ SUCCESS:', message),
  error: (message: string) => console.log('❌ ERROR:', message)
};

interface LogLevelSettingsProps {
  onSettingsChange?: () => void;
}

export function LogLevelSettings({ onSettingsChange }: LogLevelSettingsProps) {
  const [settings, setSettings] = useState({
    logLevel: 'INFO',
    enableAuth: true,
    enableData: true,
    enableSystem: true,
    enableSecurity: true,
    retentionDays: 30,
    archiveEnabled: true,
    maxLogSize: 1000000,
    autoCleanup: true,
    alertsEnabled: true,
    emailNotifications: false,
    realTimeMonitoring: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/audit/settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('설정을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/audit/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        toast.success('설정이 저장되었습니다');
        onSettingsChange?.();
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('30일 이전의 로그를 아카이브하시겠습니까?')) return;
    
    try {
      const response = await fetch('/api/audit/archive', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`${result.archived}개의 로그가 아카이브되었습니다`);
      } else {
        throw new Error('Archive failed');
      }
    } catch (error) {
      console.error('Archive failed:', error);
      toast.error('아카이브에 실패했습니다');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('오래된 로그를 정리하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    
    try {
      const response = await fetch('/api/audit/cleanup', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days: settings.retentionDays })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`${result.deleted}개의 로그가 정리되었습니다`);
      } else {
        throw new Error('Cleanup failed');
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast.error('정리 작업에 실패했습니다');
    }
  };

  const logLevelDescriptions = {
    OFF: '로그를 기록하지 않습니다',
    ERROR: '오류만 기록합니다',
    WARNING: '경고 및 오류를 기록합니다',
    INFO: '일반 정보, 경고, 오류를 기록합니다',
    DEBUG: '모든 상세 정보를 기록합니다'
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">설정을 불러오는 중...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Log Level Settings */}
      <Card>
        <CardHeader>
          <CardTitle>로그 레벨 설정</CardTitle>
          <CardDescription>
            시스템 로그 기록 수준을 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="log-level">전역 로그 레벨</Label>
            <Select
              value={settings.logLevel}
              onValueChange={(value) => setSettings(prev => ({ ...prev, logLevel: value }))}
            >
              <SelectTrigger id="log-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OFF">OFF - 로그 없음</SelectItem>
                <SelectItem value="ERROR">ERROR - 오류만</SelectItem>
                <SelectItem value="WARNING">WARNING - 경고 이상</SelectItem>
                <SelectItem value="INFO">INFO - 일반 정보 이상</SelectItem>
                <SelectItem value="DEBUG">DEBUG - 모든 정보</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {logLevelDescriptions[settings.logLevel as keyof typeof logLevelDescriptions]}
            </p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              DEBUG 레벨은 시스템 성능에 영향을 줄 수 있으므로 개발 환경에서만 사용을 권장합니다.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Category Settings */}
      <Card>
        <CardHeader>
          <CardTitle>카테고리별 설정</CardTitle>
          <CardDescription>
            각 카테고리의 로그 기록 여부를 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auth-logs">인증 로그</Label>
              <div className="text-sm text-muted-foreground">로그인, 로그아웃, 권한 관련</div>
            </div>
            <Switch
              id="auth-logs"
              checked={settings.enableAuth}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableAuth: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="data-logs">데이터 변경 로그</Label>
              <div className="text-sm text-muted-foreground">생성, 수정, 삭제 작업</div>
            </div>
            <Switch
              id="data-logs"
              checked={settings.enableData}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableData: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="system-logs">시스템 로그</Label>
              <div className="text-sm text-muted-foreground">시스템 이벤트, 오류, 성능</div>
            </div>
            <Switch
              id="system-logs"
              checked={settings.enableSystem}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableSystem: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="security-logs">보안 로그</Label>
              <div className="text-sm text-muted-foreground">보안 이벤트, 접근 시도</div>
            </div>
            <Switch
              id="security-logs"
              checked={settings.enableSecurity}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableSecurity: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Storage Settings */}
      <Card>
        <CardHeader>
          <CardTitle>저장소 설정</CardTitle>
          <CardDescription>
            로그 보관 및 정리 정책을 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retention">로그 보관 기간</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="retention"
                min={7}
                max={365}
                step={1}
                value={[settings.retentionDays]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, retentionDays: value }))}
                className="flex-1"
              />
              <span className="w-20 text-sm font-medium">{settings.retentionDays}일</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {settings.retentionDays}일 이후의 로그는 자동으로 삭제됩니다
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="archive">자동 아카이브</Label>
              <div className="text-sm text-muted-foreground">오래된 로그를 자동으로 아카이브</div>
            </div>
            <Switch
              id="archive"
              checked={settings.archiveEnabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, archiveEnabled: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cleanup">자동 정리</Label>
              <div className="text-sm text-muted-foreground">보관 기간이 지난 로그 자동 삭제</div>
            </div>
            <Switch
              id="cleanup"
              checked={settings.autoCleanup}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoCleanup: checked }))}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="h-4 w-4 mr-2" />
              수동 아카이브
            </Button>
            <Button variant="outline" onClick={handleCleanup}>
              <Trash2 className="h-4 w-4 mr-2" />
              수동 정리
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>알림 설정</CardTitle>
          <CardDescription>
            보안 이벤트 및 시스템 알림을 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="alerts">보안 알림</Label>
              <div className="text-sm text-muted-foreground">중요 보안 이벤트 발생 시 알림</div>
            </div>
            <Switch
              id="alerts"
              checked={settings.alertsEnabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, alertsEnabled: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email">이메일 알림</Label>
              <div className="text-sm text-muted-foreground">중요 이벤트를 이메일로 전송</div>
            </div>
            <Switch
              id="email"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="realtime">실시간 모니터링</Label>
              <div className="text-sm text-muted-foreground">실시간으로 로그를 모니터링</div>
            </div>
            <Switch
              id="realtime"
              checked={settings.realTimeMonitoring}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, realTimeMonitoring: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={fetchSettings} disabled={saving}>
          <RefreshCw className="h-4 w-4 mr-2" />
          초기화
        </Button>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </div>
  );
}