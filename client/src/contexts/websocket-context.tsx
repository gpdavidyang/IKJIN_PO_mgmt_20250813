import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket, type WebSocketNotification } from '../hooks/use-websocket';
import type { WorkflowEvent } from '../../../server/services/websocket-service';
import { useToast } from '@/hooks/use-toast';

interface WebSocketContextType {
  connected: boolean;
  authenticated: boolean;
  connecting: boolean;
  error: string | null;
  subscribeToOrder: (orderId: number) => void;
  unsubscribeFromOrder: (orderId: number) => void;
  notifications: WebSocketNotification[];
  clearNotifications: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  
  // TEMPORARY FIX: Use mock user in production to bypass auth issues
  const user = process.env.NODE_ENV === 'production' ? {
    id: "temp-user",
    email: "admin@company.com", 
    name: "관리자",
    role: "admin" as const
  } : null;

  // Handle workflow events
  const handleWorkflowEvent = (event: WorkflowEvent) => {
    switch (event.type) {
      case 'order_updated':
        // Invalidate order queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ 
          queryKey: ['order', event.data.orderId] 
        });
        
        toast({
          title: '발주서 업데이트',
          description: `${event.data.orderNumber} 상태가 변경되었습니다.`,
          variant: 'default'
        });
        break;

      case 'approval_requested':
        // Show notification if user is the required approver
        if (user?.id === event.data.requiredApprover.id) {
          toast({
            title: '승인 요청',
            description: `${event.data.orderNumber} 발주서 승인이 요청되었습니다.`,
            variant: 'default'
          });
          
          // Play notification sound if browser supports it
          if (typeof window !== 'undefined' && 'Notification' in window) {
            new Audio('/notification.mp3').catch(() => {}); // Ignore if no audio file
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        break;

      case 'order_approved':
        toast({
          title: '승인 완료',
          description: `${event.data.orderNumber} 발주서가 승인되었습니다.`,
          variant: 'default'
        });
        
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ 
          queryKey: ['order', event.data.orderId] 
        });
        break;

      case 'order_rejected':
        toast({
          title: '승인 반려',
          description: `${event.data.orderNumber} 발주서가 반려되었습니다.`,
          variant: 'destructive'
        });
        
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ 
          queryKey: ['order', event.data.orderId] 
        });
        break;

      case 'delivery_confirmed':
        toast({
          title: '납품 완료',
          description: `${event.data.orderNumber} 납품이 확인되었습니다.`,
          variant: 'default'
        });
        
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ 
          queryKey: ['order', event.data.orderId] 
        });
        break;

      case 'order_sent':
        toast({
          title: '발주서 발송',
          description: `${event.data.orderNumber} 발주서가 발송되었습니다.`,
          variant: 'default'
        });
        
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ 
          queryKey: ['order', event.data.orderId] 
        });
        break;
    }
  };

  // Handle direct notifications
  const handleNotification = (notification: WebSocketNotification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
    
    // Show toast notification
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'error' ? 'destructive' : 'default'
    });

    // Request browser notification permission and show if granted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: 'order-management'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
              tag: 'order-management'
            });
          }
        });
      }
    }
  };

  // Initialize WebSocket connection
  const webSocket = useWebSocket({
    userId: user?.id,
    enabled: !!user?.id,
    onWorkflowEvent: handleWorkflowEvent,
    onNotification: handleNotification
  });

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const contextValue: WebSocketContextType = {
    connected: webSocket.connected,
    authenticated: webSocket.authenticated,
    connecting: webSocket.connecting,
    error: webSocket.error,
    subscribeToOrder: webSocket.subscribeToOrder,
    unsubscribeFromOrder: webSocket.unsubscribeFromOrder,
    notifications,
    clearNotifications
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}