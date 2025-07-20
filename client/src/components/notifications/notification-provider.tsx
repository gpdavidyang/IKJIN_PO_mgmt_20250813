/**
 * 알림 시스템 Provider
 * 
 * 전역 알림 상태 관리 및 토스트 알림 표시를 담당하는 Provider 컴포넌트
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NotificationToast } from './notification-toast';
import { useNotifications, Notification } from '@/hooks/useNotifications';

interface NotificationContextValue {
  showToast: (notification: Notification) => void;
  hideToast: (id: string) => void;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

interface ToastNotification extends Notification {
  visible: boolean;
  timeout?: NodeJS.Timeout;
}

interface NotificationProviderProps {
  children: ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

export function NotificationProvider({ 
  children, 
  maxToasts = 5,
  defaultDuration = 5000 
}: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const { notifications } = useNotifications();

  // 새로운 알림이 도착할 때 토스트 표시
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      
      // 이미 표시된 알림인지 확인
      const alreadyShown = toasts.some(toast => toast.id === latestNotification.id);
      
      if (!alreadyShown && !latestNotification.read) {
        showToast(latestNotification);
      }
    }
  }, [notifications]);

  const showToast = (notification: Notification) => {
    const toastNotification: ToastNotification = {
      ...notification,
      visible: true,
    };

    setToasts(prev => {
      // 최대 토스트 수 제한
      const newToasts = [toastNotification, ...prev.slice(0, maxToasts - 1)];
      return newToasts;
    });
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // 편의 함수들
  const createSystemNotification = (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message: string
  ): Notification => ({
    id: `system-${Date.now()}-${Math.random()}`,
    type: 'system_alert',
    title,
    message,
    priority: type === 'error' ? 'high' : type === 'warning' ? 'medium' : 'low',
    timestamp: new Date().toISOString(),
    read: false,
  });

  const showSuccess = (title: string, message: string) => {
    showToast(createSystemNotification('success', title, message));
  };

  const showError = (title: string, message: string) => {
    showToast(createSystemNotification('error', title, message));
  };

  const showInfo = (title: string, message: string) => {
    showToast(createSystemNotification('info', title, message));
  };

  const showWarning = (title: string, message: string) => {
    showToast(createSystemNotification('warning', title, message));
  };

  const contextValue: NotificationContextValue = {
    showToast,
    hideToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* 토스트 알림들 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{
              transform: `translateY(${index * 8}px)`,
              zIndex: 50 - index,
            }}
          >
            <NotificationToast
              notification={toast}
              onClose={() => hideToast(toast.id)}
              duration={toast.priority === 'urgent' ? 10000 : defaultDuration}
              autoClose={toast.priority !== 'urgent'}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

// Hook for using notification context
export function useNotificationToasts() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationToasts must be used within a NotificationProvider');
  }
  return context;
}

// 타입별 토스트 표시 유틸리티 Hook
export function useToast() {
  const { showSuccess, showError, showInfo, showWarning } = useNotificationToasts();

  return {
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
    toast: {
      success: showSuccess,
      error: showError,
      info: showInfo,
      warning: showWarning,
    },
  };
}

export default NotificationProvider;