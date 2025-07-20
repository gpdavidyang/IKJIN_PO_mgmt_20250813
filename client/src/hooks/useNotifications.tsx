/**
 * 실시간 알림 관리 Hook
 * 
 * WebSocket 연결을 통한 알림 수신, 상태 관리, API 호출을 담당
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  userId?: string;
  role?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
  read: boolean;
  expiresAt?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  connected: boolean;
}

interface UseNotificationsReturn extends NotificationState {
  connect: () => void;
  disconnect: () => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  sendTestNotification: () => void;
  updateSettings: (settings: any) => void;
  refreshNotifications: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const { user, isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Interval | null>(null);
  
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    connected: false,
  });

  // API 호출 헬퍼
  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }, []);

  // 알림 목록 조회
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const data = await apiCall('/api/notifications?limit=50');
      
      setState(prev => ({
        ...prev,
        notifications: data.data.notifications,
        unreadCount: data.data.unreadCount,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '알림 조회 실패',
      }));
    }
  }, [isAuthenticated, apiCall]);

  // WebSocket 연결
  const connect = useCallback(async () => {
    if (!isAuthenticated || !user || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // WebSocket 토큰 요청
      const tokenData = await apiCall('/api/notifications/ws-token');
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${tokenData.data.wsUrl}`;
      
      setState(prev => ({ ...prev, error: null }));
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔔 Notification WebSocket connected');
        setState(prev => ({ ...prev, connected: true, error: null }));
        
        // 하트비트 설정
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ 
          ...prev, 
          connected: false,
          error: '알림 서버 연결 오류' 
        }));
      };

      ws.onclose = (event) => {
        console.log('🔔 Notification WebSocket disconnected:', event.code, event.reason);
        setState(prev => ({ ...prev, connected: false }));
        
        // 하트비트 정리
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // 재연결 시도 (정상 종료가 아닌 경우)
        if (event.code !== 1000 && isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, 5000);
        }
      };

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setState(prev => ({ 
        ...prev, 
        connected: false,
        error: error instanceof Error ? error.message : '연결 실패' 
      }));
    }
  }, [isAuthenticated, user, apiCall]);

  // WebSocket 메시지 처리
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'connection_established':
        console.log('🔔 WebSocket connection established');
        setState(prev => ({ 
          ...prev, 
          unreadCount: message.data.unreadCount || 0 
        }));
        fetchNotifications();
        break;

      case 'notification':
        const notification = message.data;
        setState(prev => ({
          ...prev,
          notifications: [notification, ...prev.notifications],
          unreadCount: prev.unreadCount + 1,
        }));
        
        // 브라우저 알림 표시
        showBrowserNotification(notification);
        break;

      case 'notification_read':
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => 
            n.id === message.data.notificationId 
              ? { ...n, read: true }
              : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
        break;

      case 'all_notifications_read':
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
        break;

      case 'server_shutdown':
        setState(prev => ({ 
          ...prev, 
          connected: false,
          error: '서버가 종료되었습니다' 
        }));
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }, [fetchNotifications]);

  // 브라우저 알림 표시
  const showBrowserNotification = useCallback((notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
      });
    }
  }, []);

  // WebSocket 연결 해제
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    setState(prev => ({ ...prev, connected: false }));
  }, []);

  // 알림을 읽음으로 표시
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiCall(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
      
      // WebSocket으로 즉시 업데이트
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'mark_read',
          notificationId,
        }));
      }
    } catch (error) {
      console.error('Mark as read failed:', error);
    }
  }, [apiCall]);

  // 모든 알림을 읽음으로 표시
  const markAllAsRead = useCallback(async () => {
    try {
      await apiCall('/api/notifications/read-all', { method: 'PUT' });
      
      // WebSocket으로 즉시 업데이트
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'mark_all_read' }));
      }
    } catch (error) {
      console.error('Mark all as read failed:', error);
    }
  }, [apiCall]);

  // 알림 삭제
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await apiCall(`/api/notifications/${notificationId}`, { method: 'DELETE' });
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== notificationId),
        unreadCount: prev.notifications.find(n => n.id === notificationId && !n.read) 
          ? prev.unreadCount - 1 
          : prev.unreadCount,
      }));
    } catch (error) {
      console.error('Delete notification failed:', error);
    }
  }, [apiCall]);

  // 테스트 알림 전송
  const sendTestNotification = useCallback(async () => {
    if (process.env.NODE_ENV !== 'development') return;
    
    try {
      await apiCall('/api/notifications/test', { method: 'POST' });
    } catch (error) {
      console.error('Test notification failed:', error);
    }
  }, [apiCall]);

  // 알림 설정 업데이트
  const updateSettings = useCallback(async (settings: any) => {
    try {
      await apiCall('/api/notifications/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      
      // WebSocket 구독 업데이트
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          subscriptions: settings.subscriptions,
        }));
      }
    } catch (error) {
      console.error('Update settings failed:', error);
    }
  }, [apiCall]);

  // 알림 목록 새로고침
  const refreshNotifications = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 인증 상태 변경 시 연결 관리
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
      fetchNotifications();
    } else {
      disconnect();
    }
    
    return () => disconnect();
  }, [isAuthenticated, user, connect, disconnect, fetchNotifications]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendTestNotification,
    updateSettings,
    refreshNotifications,
  };
}

export default useNotifications;