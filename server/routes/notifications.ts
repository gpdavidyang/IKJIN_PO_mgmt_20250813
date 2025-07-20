import { Router } from 'express';
import { authMiddleware } from '../middleware/auth-unified';
import { rateLimitMiddleware } from '../middleware/rate-limiting';
import { notificationService, NotificationType } from '../services/notification-service';

const router = Router();

/**
 * 사용자의 알림 목록 조회
 */
router.get('/', authMiddleware.required, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const unreadOnly = req.query.unreadOnly === 'true';
    
    let notifications = notificationService.getUserNotifications(userId, limit);
    
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    
    const unreadCount = notificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length,
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Failed to fetch notifications',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 알림을 읽음으로 표시
 */
router.put('/:id/read', authMiddleware.required, async (req: any, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    notificationService.markNotificationAsRead(notificationId, userId);
    
    res.json({
      success: true,
      message: '알림이 읽음으로 표시되었습니다.'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 모든 알림을 읽음으로 표시
 */
router.put('/read-all', authMiddleware.required, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    notificationService.markAllNotificationsAsRead(userId);
    
    res.json({
      success: true,
      message: '모든 알림이 읽음으로 표시되었습니다.'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 읽지 않은 알림 수 조회
 */
router.get('/unread-count', authMiddleware.required, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = notificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      error: 'Failed to get unread count',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 알림 생성 (관리자 또는 시스템)
 */
router.post('/', authMiddleware.required, rateLimitMiddleware.createUser({ max: 20, windowMs: 15 * 60 * 1000 }), async (req: any, res) => {
  try {
    const { type, title, message, data, userId, role, priority = 'medium', expiresAt } = req.body;
    
    if (!type || !title || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'type, title, message는 필수 항목입니다.'
      });
    }
    
    // 권한 확인 (일반 사용자는 user_message만 생성 가능)
    if (req.user.role !== 'admin' && req.user.role !== 'executive') {
      if (type !== 'user_message' || (userId && userId !== req.user.id)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: '알림 생성 권한이 부족합니다.'
        });
      }
    }
    
    const notificationId = await notificationService.createNotification({
      type: type as NotificationType,
      title,
      message,
      data,
      userId,
      role,
      priority,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    
    res.json({
      success: true,
      data: { notificationId },
      message: '알림이 생성되었습니다.'
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      error: 'Failed to create notification',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 알림 삭제
 */
router.delete('/:id', authMiddleware.required, async (req: any, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    // 관리자가 아닌 경우 자신의 알림만 삭제 가능
    if (req.user.role !== 'admin') {
      const notifications = notificationService.getUserNotifications(userId);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (!notification || (notification.userId && notification.userId !== userId)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: '이 알림을 삭제할 권한이 없습니다.'
        });
      }
    }
    
    const deleted = notificationService.deleteNotification(notificationId);
    
    if (deleted) {
      res.json({
        success: true,
        message: '알림이 삭제되었습니다.'
      });
    } else {
      res.status(404).json({
        error: 'Notification not found',
        message: '알림을 찾을 수 없습니다.'
      });
    }
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      error: 'Failed to delete notification',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 연결된 클라이언트 목록 조회 (관리자 전용)
 */
router.get('/clients', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    const clients = notificationService.getConnectedClients();
    
    res.json({
      success: true,
      data: {
        clients,
        totalConnections: clients.length,
      }
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      error: 'Failed to fetch connected clients',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 알림 통계 조회 (관리자 전용)
 */
router.get('/stats', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    const stats = notificationService.getStats();
    const clients = notificationService.getConnectedClients();
    
    // 추가 통계 계산
    const usersByRole = clients.reduce((acc, client) => {
      acc[client.userRole] = (acc[client.userRole] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const enhancedStats = {
      ...stats,
      usersByRole,
      averageNotificationsPerUser: stats.totalSent / Math.max(clients.length, 1),
      readRate: stats.totalSent > 0 ? (stats.totalRead / stats.totalSent * 100).toFixed(2) + '%' : '0%',
    };
    
    res.json({
      success: true,
      data: enhancedStats
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch notification statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 브로드캐스트 메시지 전송 (관리자 전용)
 */
router.post('/broadcast', authMiddleware.adminWith2FA, async (req: any, res) => {
  try {
    const { message, targetRole, priority = 'medium' } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: 'Message is required',
        message: '메시지가 필요합니다.'
      });
    }
    
    // 브로드캐스트 알림 생성
    const notificationId = await notificationService.createNotification({
      type: 'system_alert',
      title: '시스템 공지',
      message,
      role: targetRole,
      priority,
      data: {
        sender: req.user.name,
        senderRole: req.user.role,
      }
    });
    
    res.json({
      success: true,
      data: { notificationId },
      message: '브로드캐스트 메시지가 전송되었습니다.'
    });
  } catch (error) {
    console.error('Broadcast message error:', error);
    res.status(500).json({
      error: 'Failed to broadcast message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 알림 서비스 상태 확인
 */
router.get('/health', authMiddleware.required, async (req: any, res) => {
  try {
    const health = notificationService.getHealthStatus();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Notification health check error:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * WebSocket 연결 토큰 생성
 */
router.get('/ws-token', authMiddleware.required, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // 간단한 토큰 생성 (실제로는 JWT 등 사용)
    const token = Buffer.from(`${userId}:${Date.now()}`).toString('base64');
    
    res.json({
      success: true,
      data: {
        token,
        wsUrl: `/ws/notifications?token=${token}&userId=${userId}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간
      }
    });
  } catch (error) {
    console.error('WS token generation error:', error);
    res.status(500).json({
      error: 'Failed to generate WebSocket token',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 알림 설정 조회
 */
router.get('/settings', authMiddleware.required, async (req: any, res) => {
  try {
    // 실제로는 데이터베이스에서 사용자 설정 조회
    const defaultSettings = {
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
    };
    
    res.json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      error: 'Failed to fetch notification settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 알림 설정 업데이트
 */
router.put('/settings', authMiddleware.required, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;
    
    // 실제로는 데이터베이스에 사용자 설정 저장
    console.log(`Updating notification settings for user ${userId}:`, settings);
    
    res.json({
      success: true,
      message: '알림 설정이 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      error: 'Failed to update notification settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 테스트 알림 전송 (개발 환경)
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test', authMiddleware.required, async (req: any, res) => {
    try {
      const { type = 'user_message', priority = 'medium' } = req.body;
      
      const notificationId = await notificationService.createNotification({
        type: type as NotificationType,
        title: '테스트 알림',
        message: `이것은 테스트 알림입니다. (${new Date().toLocaleString('ko-KR')})`,
        userId: req.user.id,
        priority,
        data: {
          test: true,
          sender: req.user.name,
        }
      });
      
      res.json({
        success: true,
        data: { notificationId },
        message: '테스트 알림이 전송되었습니다.'
      });
    } catch (error) {
      console.error('Test notification error:', error);
      res.status(500).json({
        error: 'Failed to send test notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export default router;