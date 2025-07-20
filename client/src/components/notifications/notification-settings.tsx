/**
 * 알림 설정 컴포넌트
 * 
 * 사용자가 알림 설정을 관리할 수 있는 설정 패널
 */

import React, { useState, useEffect } from 'react';
import { Settings, Bell, Mail, Volume2, Clock, Save, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  orderNotifications: boolean;
  approvalNotifications: boolean;
  systemNotifications: boolean;
  notificationSound: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  subscriptions: string[];
}

interface NotificationSettingsProps {
  onClose?: () => void;
}

export function NotificationSettingsPanel({ onClose }: NotificationSettingsProps) {
  const { updateSettings } = useNotifications();
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    orderNotifications: true,
    approvalNotifications: true,
    systemNotifications: true,
    notificationSound: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    subscriptions: [
      'order_created',
      'order_updated',
      'order_approved',
      'approval_required',
      'file_uploaded',
      'email_sent',
      'user_message',
    ],
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // 설정 불러오기
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/notifications/settings', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setSettings(data.data);
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };

    loadSettings();
  }, []);

  // 설정 저장
  const handleSave = async () => {
    try {
      setLoading(true);
      await updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 기본값으로 재설정
  const handleReset = () => {
    setSettings({
      emailNotifications: true,
      pushNotifications: true,
      orderNotifications: true,
      approvalNotifications: true,
      systemNotifications: true,
      notificationSound: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      subscriptions: [
        'order_created',
        'order_updated',
        'order_approved',
        'approval_required',
        'file_uploaded',
        'email_sent',
        'user_message',
      ],
    });
  };

  // 구독 토글
  const toggleSubscription = (type: string) => {
    setSettings(prev => ({
      ...prev,
      subscriptions: prev.subscriptions.includes(type)
        ? prev.subscriptions.filter(s => s !== type)
        : [...prev.subscriptions, type],
    }));
  };

  // 알림 타입별 라벨
  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'order_created': return '발주서 생성';
      case 'order_updated': return '발주서 수정';
      case 'order_approved': return '발주서 승인';
      case 'order_rejected': return '발주서 반려';
      case 'approval_required': return '승인 요청';
      case 'file_uploaded': return '파일 업로드';
      case 'email_sent': return '이메일 발송';
      case 'system_alert': return '시스템 경고';
      case 'user_message': return '사용자 메시지';
      case 'security_alert': return '보안 경고';
      default: return type;
    }
  };

  const notificationTypes = [
    'order_created',
    'order_updated',
    'order_approved',
    'order_rejected',
    'approval_required',
    'file_uploaded',
    'email_sent',
    'system_alert',
    'user_message',
    'security_alert',
  ];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            알림 설정
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 일반 설정 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">일반 설정</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                이메일 알림
              </Label>
              <Switch
                id="email-notifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, emailNotifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                브라우저 알림
              </Label>
              <Switch
                id="push-notifications"
                checked={settings.pushNotifications}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, pushNotifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notification-sound" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                알림 소리
              </Label>
              <Switch
                id="notification-sound"
                checked={settings.notificationSound}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, notificationSound: checked }))
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* 알림 카테고리 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">알림 카테고리</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="order-notifications">발주서 관련 알림</Label>
              <Switch
                id="order-notifications"
                checked={settings.orderNotifications}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, orderNotifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="approval-notifications">승인 관련 알림</Label>
              <Switch
                id="approval-notifications"
                checked={settings.approvalNotifications}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, approvalNotifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="system-notifications">시스템 알림</Label>
              <Switch
                id="system-notifications"
                checked={settings.systemNotifications}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, systemNotifications: checked }))
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* 방해 금지 시간 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            방해 금지 시간
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-hours">방해 금지 모드 활성화</Label>
              <Switch
                id="quiet-hours"
                checked={settings.quietHours.enabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, enabled: checked },
                  }))
                }
              />
            </div>

            {settings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="quiet-start">시작 시간</Label>
                  <Select
                    value={settings.quietHours.start}
                    onValueChange={(value) =>
                      setSettings(prev => ({
                        ...prev,
                        quietHours: { ...prev.quietHours, start: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quiet-end">종료 시간</Label>
                  <Select
                    value={settings.quietHours.end}
                    onValueChange={(value) =>
                      setSettings(prev => ({
                        ...prev,
                        quietHours: { ...prev.quietHours, end: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* 세부 알림 타입 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">세부 알림 타입</h3>
          
          <div className="grid grid-cols-1 gap-2">
            {notificationTypes.map((type) => (
              <div key={type} className="flex items-center justify-between py-1">
                <Label className="text-sm">{getNotificationTypeLabel(type)}</Label>
                <Switch
                  checked={settings.subscriptions.includes(type)}
                  onCheckedChange={() => toggleSubscription(type)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? '저장 중...' : saved ? '저장됨!' : '설정 저장'}
          </Button>
          
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            기본값으로 재설정
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default NotificationSettingsPanel;