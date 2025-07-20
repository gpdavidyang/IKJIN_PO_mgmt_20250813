/**
 * 알림 토스트 컴포넌트
 * 
 * 새로운 알림이 도착할 때 화면에 잠깐 표시되는 토스트 알림
 */

import React, { useState, useEffect } from 'react';
import { X, Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface NotificationToastProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    timestamp: string;
    data?: any;
  };
  onClose: () => void;
  onAction?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function NotificationToast({
  notification,
  onClose,
  onAction,
  autoClose = true,
  duration = 5000,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // 컴포넌트 마운트 시 애니메이션
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 자동 닫기
  useEffect(() => {
    if (autoClose && notification.priority !== 'urgent') {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, notification.priority]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      // 기본 액션: 관련 페이지로 이동
      if (notification.data?.orderId) {
        window.location.href = `/orders/${notification.data.orderId}`;
      }
    }
    handleClose();
  };

  // 우선순위별 스타일
  const getPriorityStyles = () => {
    switch (notification.priority) {
      case 'urgent':
        return {
          borderColor: 'border-red-500',
          bgColor: 'bg-red-50',
          textColor: 'text-red-900',
          icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
          badgeVariant: 'destructive' as const,
        };
      case 'high':
        return {
          borderColor: 'border-orange-500',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-900',
          icon: <Bell className="h-5 w-5 text-orange-600" />,
          badgeVariant: 'secondary' as const,
        };
      case 'low':
        return {
          borderColor: 'border-gray-400',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-900',
          icon: <Info className="h-5 w-5 text-gray-600" />,
          badgeVariant: 'outline' as const,
        };
      default: // medium
        return {
          borderColor: 'border-blue-500',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-900',
          icon: <CheckCircle className="h-5 w-5 text-blue-600" />,
          badgeVariant: 'default' as const,
        };
    }
  };

  const styles = getPriorityStyles();

  // 알림 타입별 메시지
  const getTypeMessage = () => {
    switch (notification.type) {
      case 'order_created': return '새 발주서가 생성되었습니다';
      case 'order_updated': return '발주서가 업데이트되었습니다';
      case 'order_approved': return '발주서가 승인되었습니다';
      case 'order_rejected': return '발주서가 반려되었습니다';
      case 'approval_required': return '승인이 필요합니다';
      case 'file_uploaded': return '파일이 업로드되었습니다';
      case 'email_sent': return '이메일이 발송되었습니다';
      case 'system_alert': return '시스템 알림';
      case 'user_message': return '사용자 메시지';
      case 'security_alert': return '보안 경고';
      default: return '새 알림';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out ${
        isVisible && !isExiting
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      }`}
      style={{ minWidth: '320px', maxWidth: '400px' }}
    >
      <Card className={`border-l-4 ${styles.borderColor} ${styles.bgColor} shadow-lg`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* 아이콘 */}
            <div className="flex-shrink-0 mt-0.5">
              {styles.icon}
            </div>

            {/* 알림 내용 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`font-medium text-sm ${styles.textColor}`}>
                  {notification.title}
                </h4>
                {notification.priority !== 'medium' && (
                  <Badge variant={styles.badgeVariant} className="text-xs">
                    {notification.priority === 'urgent' ? '긴급' :
                     notification.priority === 'high' ? '높음' : '낮음'}
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                {notification.message}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(notification.timestamp), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
                
                {/* 액션 버튼 */}
                {(notification.data?.orderId || onAction) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAction}
                    className="text-xs h-6 px-2"
                  >
                    자세히 보기
                  </Button>
                )}
              </div>
            </div>

            {/* 닫기 버튼 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="flex-shrink-0 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationToast;