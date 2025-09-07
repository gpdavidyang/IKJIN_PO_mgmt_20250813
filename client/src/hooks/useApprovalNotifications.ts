import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Bell, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface ApprovalNotification {
  id: string;
  type: 'new_approval' | 'approved' | 'rejected' | 'reminder';
  orderId: number;
  orderNumber: string;
  message: string;
  createdAt: string;
}

export function useApprovalNotifications(pollingInterval = 30000) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const previousNotifications = useRef<Set<string>>(new Set());

  // Fetch pending approval notifications
  const { data: notifications } = useQuery<ApprovalNotification[]>({
    queryKey: ['approval-notifications', user?.id],
    queryFn: async () => {
      if (!isAuthenticated || !user) return [];
      
      // Only fetch for users with approval permissions
      if (!['admin', 'executive', 'hq_management', 'project_manager'].includes(user.role)) {
        return [];
      }

      const response = await fetch('/api/approvals/notifications', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch approval notifications');
      }
      
      return response.json();
    },
    enabled: isAuthenticated && !!user && 
             ['admin', 'executive', 'hq_management', 'project_manager'].includes(user.role || ''),
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false
  });

  // Handle new notifications
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const currentNotificationIds = new Set(notifications.map(n => n.id));
    const newNotifications = notifications.filter(
      n => !previousNotifications.current.has(n.id)
    );

    if (newNotifications.length > 0) {
      newNotifications.forEach(notification => {
        showNotification(notification);
      });
    }

    previousNotifications.current = currentNotificationIds;
  }, [notifications]);

  const showNotification = (notification: ApprovalNotification) => {
    let icon;
    let title;
    let variant: 'default' | 'destructive' = 'default';

    switch (notification.type) {
      case 'new_approval':
        icon = <Bell className="h-4 w-4" />;
        title = '새로운 승인 요청';
        break;
      case 'approved':
        icon = <CheckCircle className="h-4 w-4 text-green-600" />;
        title = '승인 완료';
        break;
      case 'rejected':
        icon = <XCircle className="h-4 w-4 text-red-600" />;
        title = '승인 반려';
        variant = 'destructive';
        break;
      case 'reminder':
        icon = <Clock className="h-4 w-4 text-yellow-600" />;
        title = '승인 대기 알림';
        break;
      default:
        icon = <AlertCircle className="h-4 w-4" />;
        title = '알림';
    }

    toast({
      title: (
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
      ),
      description: (
        <div>
          <p>{notification.message}</p>
          <p className="text-xs text-gray-500 mt-1">
            발주번호: {notification.orderNumber}
          </p>
        </div>
      ),
      variant,
      duration: 7000,
      action: (
        <button
          onClick={() => window.location.href = `/orders/${notification.orderId}/standard`}
          className="text-xs underline"
        >
          보기
        </button>
      )
    });

    // Play notification sound
    playNotificationSound();

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      showBrowserNotification(title, notification);
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => {
        // Silently handle missing audio file in production
        console.log('Could not play notification sound:', e);
      });
    } catch (e) {
      // Silently handle missing audio file
      console.log('Audio not available:', e);
    }
  };

  const showBrowserNotification = (title: string, notification: ApprovalNotification) => {
    const browserNotification = new Notification(title, {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id,
      data: {
        url: `/orders/${notification.orderId}/standard`
      }
    });

    browserNotification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      window.location.href = (event.target as any).data.url;
      browserNotification.close();
    };
  };

  return {
    notifications: notifications || [],
    hasNewNotifications: (notifications?.length || 0) > 0
  };
}