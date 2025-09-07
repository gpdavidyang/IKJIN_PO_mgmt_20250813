import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Bell, CheckCircle, XCircle, AlertCircle, Info, Clock } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'approval_request' | 'approval_completed' | 'approval_rejected' | 'approval_reminder' | 'system' | 'info';
  title: string;
  message: string;
  orderId?: number;
  orderNumber?: string;
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAll: () => void;
  refetch: () => void;
  requestPermission: () => Promise<boolean>;
  hasPermission: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
  pollingInterval?: number; // in milliseconds
}

export function NotificationProvider({ 
  children, 
  pollingInterval = 30000 // 30 seconds default
}: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [hasPermission, setHasPermission] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousNotificationIds = useRef<Set<string>>(new Set());

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  // Initialize notification sound
  useEffect(() => {
    audioRef.current = new Audio('/notification-sound.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setHasPermission(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      return granted;
    }

    return false;
  }, []);

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!isAuthenticated || !user) return [];
      
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      return response.json();
    },
    enabled: isAuthenticated && !!user,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Clear all notifications mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/clear-all', {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear notifications');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(e => {
        console.log('Could not play notification sound:', e);
      });
    }
  }, [soundEnabled]);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: Notification) => {
    if (!hasPermission || !('Notification' in window)) return;

    const icon = notification.type === 'approval_request' ? '🔔' :
                 notification.type === 'approval_completed' ? '✅' :
                 notification.type === 'approval_rejected' ? '❌' :
                 notification.type === 'approval_reminder' ? '⏰' : 'ℹ️';

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.priority === 'high',
      data: {
        url: notification.actionUrl || `/orders/${notification.orderId}`
      }
    });

    browserNotification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (event.target && (event.target as any).data?.url) {
        window.location.href = (event.target as any).data.url;
      }
      browserNotification.close();
    };
  }, [hasPermission]);

  // Show toast notification
  const showToastNotification = useCallback((notification: Notification) => {
    const icon = notification.type === 'approval_request' ? <Bell className="h-4 w-4" /> :
                 notification.type === 'approval_completed' ? <CheckCircle className="h-4 w-4" /> :
                 notification.type === 'approval_rejected' ? <XCircle className="h-4 w-4" /> :
                 notification.type === 'approval_reminder' ? <Clock className="h-4 w-4" /> :
                 <Info className="h-4 w-4" />;

    toast({
      title: (
        <div className="flex items-center gap-2">
          {icon}
          <span>{notification.title}</span>
        </div>
      ),
      description: notification.message,
      duration: notification.priority === 'high' ? 10000 : 5000,
      action: notification.actionUrl ? (
        <button 
          onClick={() => window.location.href = notification.actionUrl!}
          className="text-xs underline"
        >
          보기
        </button>
      ) : undefined
    });
  }, [toast]);

  // Handle new notifications
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const currentNotificationIds = new Set(notifications.map(n => n.id));
    const newNotifications = notifications.filter(
      n => !previousNotificationIds.current.has(n.id) && !n.read
    );

    if (newNotifications.length > 0) {
      // Play sound for new notifications
      playNotificationSound();

      // Show notifications
      newNotifications.forEach(notification => {
        if (notification.priority === 'high') {
          showBrowserNotification(notification);
        }
        showToastNotification(notification);
      });
    }

    previousNotificationIds.current = currentNotificationIds;
  }, [notifications, playNotificationSound, showBrowserNotification, showToastNotification]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: (id) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    deleteNotification: (id) => deleteNotificationMutation.mutate(id),
    clearAll: () => clearAllMutation.mutate(),
    refetch,
    requestPermission,
    hasPermission,
    soundEnabled,
    setSoundEnabled
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}