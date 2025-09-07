import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  BellOff,
  Check,
  X,
  Trash2,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  ChevronRight,
  Volume2,
  VolumeX,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useNotifications, type Notification } from './NotificationProvider';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    requestPermission,
    hasPermission,
    soundEnabled,
    setSoundEnabled
  } = useNotifications();

  const displayNotifications = activeTab === 'unread' 
    ? (Array.isArray(notifications) ? notifications.filter(n => !n.read) : [])
    : (Array.isArray(notifications) ? notifications : []);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'approval_request':
        return <Bell className="h-4 w-4 text-blue-600" />;
      case 'approval_completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'approval_rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'approval_reminder':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">긴급</Badge>;
      case 'medium':
        return <Badge variant="default" className="text-xs">중요</Badge>;
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      setIsOpen(false);
      navigate(notification.actionUrl);
    } else if (notification.orderId) {
      setIsOpen(false);
      navigate(`/orders/${notification.orderId}/standard`);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      setSoundEnabled(true);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative", className)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">알림</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                모두 읽음
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-7 px-2 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              전체 삭제
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')}>
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
            <TabsTrigger value="all" className="rounded-none">
              전체 ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-none">
              읽지 않음 ({unreadCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="m-0">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : displayNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <BellOff className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    {activeTab === 'unread' ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {displayNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                        !notification.read && "bg-blue-50/50"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className={cn(
                              "text-sm",
                              !notification.read && "font-semibold"
                            )}>
                              {notification.title}
                            </p>
                            {getPriorityBadge(notification.priority)}
                          </div>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                                locale: ko
                              })}
                            </span>
                            {notification.orderNumber && (
                              <span className="text-xs text-blue-600 font-medium">
                                {notification.orderNumber}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Settings Section */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-gray-500" />
              ) : (
                <VolumeX className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm">알림음</span>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>

          {!hasPermission && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 mb-2">
                브라우저 알림이 비활성화되어 있습니다.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleEnableNotifications}
                className="w-full h-7 text-xs"
              >
                <Bell className="h-3 w-3 mr-1" />
                알림 활성화
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => {
              setIsOpen(false);
              navigate('/settings/notifications');
            }}
          >
            <Settings className="h-3 w-3 mr-1" />
            알림 설정
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}