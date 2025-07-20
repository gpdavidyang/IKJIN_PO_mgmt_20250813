/**
 * 알림 센터 컴포넌트
 * 
 * WebSocket을 통한 실시간 알림을 표시하고 관리하는 드롭다운 컴포넌트
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    connect,
    disconnect,
  } = useNotifications();

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // WebSocket 연결 관리
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // 필터링된 알림 목록
  const filteredNotifications = notifications.filter(notification => 
    filter === 'all' ? true : !notification.read
  );

  // 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 border-red-200';
      case 'high': return 'text-orange-600 border-orange-200';
      case 'medium': return 'text-blue-600 border-blue-200';
      case 'low': return 'text-gray-600 border-gray-200';
      default: return 'text-gray-600 border-gray-200';
    }
  };

  // 알림 타입별 아이콘
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_created': return '📋';
      case 'order_updated': return '📝';
      case 'order_approved': return '✅';
      case 'order_rejected': return '❌';
      case 'approval_required': return '⏳';
      case 'file_uploaded': return '📎';
      case 'email_sent': return '📧';
      case 'system_alert': return '🔔';
      case 'user_message': return '💬';
      case 'security_alert': return '🚨';
      default: return '📄';
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // 알림 데이터에 따른 네비게이션
    if (notification.data?.orderId) {
      // 발주서 상세 페이지로 이동
      window.location.href = `/orders/${notification.data.orderId}`;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 알림 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* 드롭다운 */}
      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-96 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">알림</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* 필터 및 액션 */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  전체 ({notifications.length})
                </Button>
                <Button
                  variant={filter === 'unread' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('unread')}
                >
                  읽지 않음 ({unreadCount})
                </Button>
              </div>
              
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  모두 읽음
                </Button>
              )}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="p-0">
            {/* 에러 표시 */}
            {error && (
              <div className="p-4 text-red-600 text-sm bg-red-50">
                {error}
              </div>
            )}

            {/* 로딩 표시 */}
            {loading && (
              <div className="p-4 text-center text-gray-500">
                알림을 불러오는 중...
              </div>
            )}

            {/* 알림 목록 */}
            <ScrollArea className="h-96">
              {filteredNotifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {filter === 'unread' ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${
                        !notification.read ? 'bg-blue-50' : ''
                      } ${getPriorityColor(notification.priority)}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        {/* 아이콘 */}
                        <div className="text-lg flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* 알림 내용 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium text-sm ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(notification.timestamp), {
                                addSuffix: true,
                                locale: ko,
                              })}
                            </span>
                            
                            {/* 우선순위 배지 */}
                            {notification.priority !== 'medium' && (
                              <Badge 
                                variant={notification.priority === 'urgent' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {notification.priority === 'urgent' ? '긴급' :
                                 notification.priority === 'high' ? '높음' : '낮음'}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="flex gap-1 flex-shrink-0">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>

          {/* 푸터 */}
          <Separator />
          <div className="p-3">
            <div className="flex justify-between items-center">
              <Button variant="ghost" size="sm" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                알림 설정
              </Button>
              
              <Button variant="ghost" size="sm" className="text-xs">
                모든 알림 보기
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default NotificationCenter;