/**
 * 실시간 알림 서비스
 * 
 * WebSocket을 사용한 실시간 알림 시스템:
 * - 발주서 상태 변경 알림
 * - 승인 요청 알림
 * - 시스템 알림
 * - 사용자별 개인화된 알림
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';

// 알림 타입 정의
export type NotificationType = 
  | 'order_created'
  | 'order_updated'
  | 'order_approved'
  | 'order_rejected'
  | 'approval_required'
  | 'file_uploaded'
  | 'email_sent'
  | 'system_alert'
  | 'user_message'
  | 'security_alert';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  userId?: string; // 특정 사용자용 알림
  role?: string; // 특정 역할용 알림
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  read: boolean;
  expiresAt?: Date;
}

export interface ConnectedClient {
  id: string;
  userId: string;
  userRole: string;
  userName: string;
  ws: WebSocket;
  lastSeen: Date;
  subscriptions: NotificationType[];
}

export interface NotificationStats {
  totalSent: number;
  totalRead: number;
  activeConnections: number;
  notificationsByType: Record<NotificationType, number>;
  notificationsByPriority: Record<string, number>;
}

class NotificationService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private stats: NotificationStats = {
    totalSent: 0,
    totalRead: 0,
    activeConnections: 0,
    notificationsByType: {} as Record<NotificationType, number>,
    notificationsByPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
  };

  /**
   * WebSocket 서버 초기화
   */
  initialize(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/notifications',
      verifyClient: this.verifyClient.bind(this),
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startCleanupTask();
    
    console.log('🔔 Notification service initialized with WebSocket support');
  }

  /**
   * 클라이언트 인증 및 검증
   */
  private async verifyClient(info: any): Promise<boolean> {
    try {
      // URL에서 토큰 추출 (실제로는 더 안전한 방법 사용)
      const url = new URL(info.req.url, 'ws://localhost');
      const token = url.searchParams.get('token');
      const userId = url.searchParams.get('userId');
      
      if (!token || !userId) {
        return false;
      }
      
      // 사용자 검증 (실제로는 JWT 토큰 검증 등)
      const user = await storage.getUser(userId);
      return !!user && user.isActive;
    } catch (error) {
      console.error('WebSocket client verification failed:', error);
      return false;
    }
  }

  /**
   * 새로운 WebSocket 연결 처리
   */
  private async handleConnection(ws: WebSocket, req: any) {
    try {
      const url = new URL(req.url, 'ws://localhost');
      const userId = url.searchParams.get('userId');
      const user = await storage.getUser(userId!);
      
      if (!user) {
        ws.close(1008, 'User not found');
        return;
      }

      const clientId = uuidv4();
      const client: ConnectedClient = {
        id: clientId,
        userId: user.id,
        userRole: user.role,
        userName: user.name,
        ws,
        lastSeen: new Date(),
        subscriptions: this.getDefaultSubscriptions(user.role),
      };

      this.clients.set(clientId, client);
      this.stats.activeConnections = this.clients.size;

      // 연결 확인 메시지 전송
      this.sendToClient(clientId, {
        type: 'connection_established',
        data: {
          clientId,
          subscriptions: client.subscriptions,
          unreadCount: this.getUnreadCount(userId),
        },
      });

      // 기존 읽지 않은 알림 전송
      this.sendUnreadNotifications(clientId);

      // WebSocket 이벤트 핸들러 설정
      ws.on('message', (data) => this.handleMessage(clientId, data));
      ws.on('close', () => this.handleDisconnection(clientId));
      ws.on('error', (error) => this.handleError(clientId, error));
      ws.on('pong', () => this.updateLastSeen(clientId));

      console.log(`📱 Client connected: ${user.name} (${user.role})`);
    } catch (error) {
      console.error('Connection handling error:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * 클라이언트 메시지 처리
   */
  private handleMessage(clientId: string, data: any) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'mark_read':
          this.markNotificationAsRead(message.notificationId, client.userId);
          break;
        case 'mark_all_read':
          this.markAllNotificationsAsRead(client.userId);
          break;
        case 'subscribe':
          this.updateSubscriptions(clientId, message.subscriptions);
          break;
        case 'heartbeat':
          this.updateLastSeen(clientId);
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Message handling error:', error);
    }
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`📱 Client disconnected: ${client.userName}`);
      this.clients.delete(clientId);
      this.stats.activeConnections = this.clients.size;
    }
  }

  /**
   * WebSocket 에러 처리
   */
  private handleError(clientId: string, error: Error) {
    console.error(`WebSocket error for client ${clientId}:`, error);
    this.handleDisconnection(clientId);
  }

  /**
   * 역할별 기본 구독 설정
   */
  private getDefaultSubscriptions(role: string): NotificationType[] {
    const baseSubscriptions: NotificationType[] = [
      'order_created',
      'order_updated',
      'file_uploaded',
      'email_sent',
      'user_message',
    ];

    const roleSubscriptions: Record<string, NotificationType[]> = {
      admin: [...baseSubscriptions, 'system_alert', 'security_alert'],
      executive: [...baseSubscriptions, 'approval_required', 'system_alert'],
      hq_management: [...baseSubscriptions, 'approval_required'],
      project_manager: [...baseSubscriptions, 'approval_required'],
      field_worker: baseSubscriptions,
    };

    return roleSubscriptions[role] || baseSubscriptions;
  }

  /**
   * 알림 생성 및 전송
   */
  async createNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<string> {
    const id = uuidv4();
    const fullNotification: Notification = {
      id,
      timestamp: new Date(),
      read: false,
      ...notification,
    };

    this.notifications.set(id, fullNotification);
    
    // 통계 업데이트
    this.stats.totalSent++;
    this.stats.notificationsByType[notification.type] = 
      (this.stats.notificationsByType[notification.type] || 0) + 1;
    this.stats.notificationsByPriority[notification.priority]++;

    // 알림 전송
    await this.sendNotification(fullNotification);
    
    return id;
  }

  /**
   * 알림 전송
   */
  private async sendNotification(notification: Notification) {
    const targetClients = this.getTargetClients(notification);
    
    for (const client of targetClients) {
      this.sendToClient(client.id, {
        type: 'notification',
        data: notification,
      });
    }

    // 긴급 알림인 경우 추가 처리
    if (notification.priority === 'urgent') {
      await this.handleUrgentNotification(notification);
    }
  }

  /**
   * 알림 대상 클라이언트 선택
   */
  private getTargetClients(notification: Notification): ConnectedClient[] {
    return Array.from(this.clients.values()).filter(client => {
      // 특정 사용자 대상
      if (notification.userId && notification.userId !== client.userId) {
        return false;
      }
      
      // 특정 역할 대상
      if (notification.role && notification.role !== client.userRole) {
        return false;
      }
      
      // 구독 여부 확인
      return client.subscriptions.includes(notification.type);
    });
  }

  /**
   * 특정 클라이언트에게 메시지 전송
   */
  private sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to client ${clientId}:`, error);
        this.handleDisconnection(clientId);
      }
    }
  }

  /**
   * 모든 클라이언트에게 브로드캐스트
   */
  broadcast(message: any, filter?: (client: ConnectedClient) => boolean) {
    const clients = filter 
      ? Array.from(this.clients.values()).filter(filter)
      : Array.from(this.clients.values());
    
    for (const client of clients) {
      this.sendToClient(client.id, message);
    }
  }

  /**
   * 읽지 않은 알림 전송
   */
  private sendUnreadNotifications(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const unreadNotifications = Array.from(this.notifications.values())
      .filter(notification => 
        !notification.read &&
        (!notification.userId || notification.userId === client.userId) &&
        (!notification.role || notification.role === client.userRole) &&
        client.subscriptions.includes(notification.type)
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    for (const notification of unreadNotifications) {
      this.sendToClient(clientId, {
        type: 'notification',
        data: notification,
      });
    }
  }

  /**
   * 알림을 읽음으로 표시
   */
  markNotificationAsRead(notificationId: string, userId: string) {
    const notification = this.notifications.get(notificationId);
    if (notification && (!notification.userId || notification.userId === userId)) {
      notification.read = true;
      this.stats.totalRead++;
      
      // 클라이언트에게 읽음 상태 업데이트 전송
      this.broadcast({
        type: 'notification_read',
        data: { notificationId, userId },
      }, client => client.userId === userId);
    }
  }

  /**
   * 모든 알림을 읽음으로 표시
   */
  markAllNotificationsAsRead(userId: string) {
    const userNotifications = Array.from(this.notifications.values())
      .filter(notification => 
        !notification.read &&
        (!notification.userId || notification.userId === userId)
      );

    for (const notification of userNotifications) {
      notification.read = true;
      this.stats.totalRead++;
    }

    // 클라이언트에게 모든 읽음 상태 업데이트 전송
    this.broadcast({
      type: 'all_notifications_read',
      data: { userId },
    }, client => client.userId === userId);
  }

  /**
   * 읽지 않은 알림 수 조회
   */
  getUnreadCount(userId: string): number {
    return Array.from(this.notifications.values())
      .filter(notification => 
        !notification.read &&
        (!notification.userId || notification.userId === userId)
      ).length;
  }

  /**
   * 구독 설정 업데이트
   */
  private updateSubscriptions(clientId: string, subscriptions: NotificationType[]) {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions = subscriptions;
      this.sendToClient(clientId, {
        type: 'subscriptions_updated',
        data: { subscriptions },
      });
    }
  }

  /**
   * 마지막 접속 시간 업데이트
   */
  private updateLastSeen(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastSeen = new Date();
    }
  }

  /**
   * 긴급 알림 처리
   */
  private async handleUrgentNotification(notification: Notification) {
    // 긴급 알림의 경우 추가 알림 채널 사용 (이메일, SMS 등)
    console.log(`🚨 URGENT NOTIFICATION: ${notification.title}`);
    
    // 여기에 이메일 알림, SMS 알림 등 추가 구현 가능
    // await emailService.sendUrgentNotification(notification);
    // await smsService.sendUrgentNotification(notification);
  }

  /**
   * 정리 작업 (만료된 알림 제거)
   */
  private startCleanupTask() {
    setInterval(() => {
      const now = new Date();
      const expiredNotifications = Array.from(this.notifications.entries())
        .filter(([_, notification]) => 
          notification.expiresAt && notification.expiresAt < now
        );

      for (const [id] of expiredNotifications) {
        this.notifications.delete(id);
      }

      // 비활성 클라이언트 제거 (30분 이상 비활성)
      const inactiveClients = Array.from(this.clients.entries())
        .filter(([_, client]) => 
          now.getTime() - client.lastSeen.getTime() > 30 * 60 * 1000
        );

      for (const [id] of inactiveClients) {
        this.handleDisconnection(id);
      }
    }, 5 * 60 * 1000); // 5분마다 실행
  }

  /**
   * 연결된 클라이언트 목록 조회
   */
  getConnectedClients(): ConnectedClient[] {
    return Array.from(this.clients.values()).map(client => ({
      ...client,
      ws: undefined as any, // WebSocket 객체 제외
    }));
  }

  /**
   * 알림 통계 조회
   */
  getStats(): NotificationStats {
    return { ...this.stats };
  }

  /**
   * 특정 사용자의 알림 목록 조회
   */
  getUserNotifications(userId: string, limit: number = 50): Notification[] {
    return Array.from(this.notifications.values())
      .filter(notification => 
        !notification.userId || notification.userId === userId
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * 알림 삭제
   */
  deleteNotification(notificationId: string): boolean {
    return this.notifications.delete(notificationId);
  }

  /**
   * 헬스 체크
   */
  getHealthStatus() {
    return {
      status: this.wss ? 'running' : 'stopped',
      activeConnections: this.stats.activeConnections,
      totalNotifications: this.notifications.size,
      wsServerRunning: !!this.wss,
    };
  }

  /**
   * 서비스 종료
   */
  shutdown() {
    if (this.wss) {
      // 모든 클라이언트에게 종료 알림
      this.broadcast({
        type: 'server_shutdown',
        data: { message: '서버가 종료됩니다.' },
      });

      // WebSocket 서버 종료
      this.wss.close();
      this.wss = null;
    }
    
    this.clients.clear();
    console.log('🔔 Notification service shutdown complete');
  }
}

// 싱글톤 인스턴스 생성
export const notificationService = new NotificationService();

// 편의 함수들
export const createNotification = notificationService.createNotification.bind(notificationService);
export const markAsRead = notificationService.markNotificationAsRead.bind(notificationService);
export const broadcast = notificationService.broadcast.bind(notificationService);

export default notificationService;