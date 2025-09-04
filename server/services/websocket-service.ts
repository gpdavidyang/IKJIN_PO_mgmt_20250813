import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface WebSocketUser {
  id: string;
  name: string;
  role: string;
  companyId?: string;
}

export interface OrderUpdateEvent {
  orderId: number;
  orderNumber: string;
  orderStatus: string;
  approvalStatus: string;
  updatedBy: WebSocketUser;
  timestamp: Date;
  changes?: Record<string, any>;
}

export interface ApprovalRequestEvent {
  orderId: number;
  orderNumber: string;
  requestedBy: WebSocketUser;
  requiredApprover: WebSocketUser;
  orderAmount: number;
  timestamp: Date;
}

export interface DeliveryConfirmationEvent {
  orderId: number;
  orderNumber: string;
  confirmedBy: WebSocketUser;
  deliveredAt: Date;
  timestamp: Date;
}

export type WorkflowEvent = 
  | { type: 'order_updated'; data: OrderUpdateEvent }
  | { type: 'approval_requested'; data: ApprovalRequestEvent }
  | { type: 'order_approved'; data: OrderUpdateEvent }
  | { type: 'order_rejected'; data: OrderUpdateEvent }
  | { type: 'delivery_confirmed'; data: DeliveryConfirmationEvent }
  | { type: 'order_sent'; data: OrderUpdateEvent };

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers = new Map<string, { socketId: string; user: WebSocketUser }>();

  initialize(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:5000',
          'https://ikjin-po-mgmt-20250813-dno9.vercel.app',
          'https://ikjin-po-mgmt-20250813-dn.vercel.app',
          /^https:\/\/ikjin-po-mgmt-20250813-[a-z0-9]+-davidswyang-3963s-projects\.vercel\.app$/
        ],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.io.on('connection', (socket) => {
      console.log('🔌 WebSocket connection established:', socket.id);

      // Handle user authentication
      socket.on('authenticate', async (data: { userId: string }) => {
        try {
          const user = await db.select()
            .from(users)
            .where(eq(users.id, data.userId))
            .then(rows => rows[0]);

          if (user) {
            const webSocketUser: WebSocketUser = {
              id: user.id,
              name: user.name,
              role: user.role,
              companyId: user.companyId || undefined
            };

            this.connectedUsers.set(socket.id, {
              socketId: socket.id,
              user: webSocketUser
            });

            socket.join(`user_${user.id}`);
            socket.join(`company_${user.companyId}`);
            socket.join(`role_${user.role}`);

            socket.emit('authenticated', { 
              success: true, 
              user: webSocketUser 
            });

            console.log(`✅ User authenticated: ${user.name} (${user.role})`);
          } else {
            socket.emit('authentication_error', { 
              error: 'User not found' 
            });
          }
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('authentication_error', { 
            error: 'Authentication failed' 
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const userInfo = this.connectedUsers.get(socket.id);
        if (userInfo) {
          console.log(`🔌 User disconnected: ${userInfo.user.name}`);
          this.connectedUsers.delete(socket.id);
        }
      });

      // Handle order subscription
      socket.on('subscribe_order', (orderId: number) => {
        socket.join(`order_${orderId}`);
        console.log(`📋 Subscribed to order ${orderId}`);
      });

      socket.on('unsubscribe_order', (orderId: number) => {
        socket.leave(`order_${orderId}`);
        console.log(`📋 Unsubscribed from order ${orderId}`);
      });
    });

    console.log('🚀 WebSocket service initialized');
  }

  // Broadcast order update to relevant users
  broadcastOrderUpdate(event: OrderUpdateEvent) {
    if (!this.io) return;

    // Send to users subscribed to this order
    this.io.to(`order_${event.orderId}`).emit('workflow_event', {
      type: 'order_updated',
      data: event
    });

    // Send to company members
    if (event.updatedBy.companyId) {
      this.io.to(`company_${event.updatedBy.companyId}`).emit('workflow_event', {
        type: 'order_updated',
        data: event
      });
    }

    console.log(`📢 Broadcasted order update: ${event.orderNumber} → ${event.orderStatus}/${event.approvalStatus}`);
  }

  // Send approval request notification
  notifyApprovalRequest(event: ApprovalRequestEvent) {
    if (!this.io) return;

    // Send to specific approver
    this.io.to(`user_${event.requiredApprover.id}`).emit('workflow_event', {
      type: 'approval_requested',
      data: event
    });

    // Send to order subscribers
    this.io.to(`order_${event.orderId}`).emit('workflow_event', {
      type: 'approval_requested',
      data: event
    });

    console.log(`🔔 Sent approval request to ${event.requiredApprover.name} for order ${event.orderNumber}`);
  }

  // Broadcast approval decision
  broadcastApprovalDecision(event: OrderUpdateEvent, decision: 'approved' | 'rejected') {
    if (!this.io) return;

    const eventType = decision === 'approved' ? 'order_approved' : 'order_rejected';
    
    // Send to order creator
    this.io.to(`order_${event.orderId}`).emit('workflow_event', {
      type: eventType,
      data: event
    });

    // Send to company members
    if (event.updatedBy.companyId) {
      this.io.to(`company_${event.updatedBy.companyId}`).emit('workflow_event', {
        type: eventType,
        data: event
      });
    }

    console.log(`📢 Broadcasted approval decision: ${event.orderNumber} → ${decision}`);
  }

  // Notify delivery confirmation
  notifyDeliveryConfirmation(event: DeliveryConfirmationEvent) {
    if (!this.io) return;

    // Send to order subscribers
    this.io.to(`order_${event.orderId}`).emit('workflow_event', {
      type: 'delivery_confirmed',
      data: event
    });

    // Send to company members
    if (event.confirmedBy.companyId) {
      this.io.to(`company_${event.confirmedBy.companyId}`).emit('workflow_event', {
        type: 'delivery_confirmed',
        data: event
      });
    }

    console.log(`📦 Notified delivery confirmation: ${event.orderNumber}`);
  }

  // Send notification to specific user
  notifyUser(userId: string, notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    data?: any;
  }) {
    if (!this.io) return;

    this.io.to(`user_${userId}`).emit('notification', notification);
    console.log(`🔔 Sent notification to user ${userId}: ${notification.title}`);
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected users for a company
  getCompanyUsers(companyId: string): WebSocketUser[] {
    return Array.from(this.connectedUsers.values())
      .filter(userInfo => userInfo.user.companyId === companyId)
      .map(userInfo => userInfo.user);
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return Array.from(this.connectedUsers.values())
      .some(userInfo => userInfo.user.id === userId);
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();