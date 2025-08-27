/**
 * Notification Service
 * 승인 관련 알림 처리 서비스
 */

import { db } from "../db";
import { 
  users,
  purchaseOrders,
  projects,
  vendors,
  approvalAuthorities
} from "../../shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export interface NotificationContext {
  orderId: number;
  action: 'approval_requested' | 'approval_completed' | 'approval_rejected';
  performedBy: string; // user ID
  targetRole?: string; // for approval requests
  comments?: string;
}

export class NotificationService {
  
  /**
   * 승인 요청 시 알림 발송
   */
  static async sendApprovalRequestNotification(context: NotificationContext): Promise<void> {
    try {
      // 발주서 정보 조회
      const orderInfo = await this.getOrderInfo(context.orderId);
      if (!orderInfo) {
        console.error(`Order ${context.orderId} not found for notification`);
        return;
      }

      // 승인 권한이 있는 사용자들 찾기
      const approvers = await this.getEligibleApprovers(parseFloat(orderInfo.totalAmount || '0'));
      
      if (approvers.length === 0) {
        console.warn(`No eligible approvers found for order ${context.orderId}`);
        return;
      }

      // 알림 생성
      const notifications = approvers.map(approver => ({
        userId: approver.id,
        type: 'approval_request' as const,
        title: '새로운 승인 요청',
        message: `발주서 #${orderInfo.orderNumber || context.orderId} (${orderInfo.totalAmount?.toLocaleString()}원)의 승인을 요청합니다.`,
        relatedId: context.orderId.toString(),
        relatedType: 'purchase_order' as const,
        priority: this.determinePriority(parseFloat(orderInfo.totalAmount || '0')),
        isRead: false,
        metadata: JSON.stringify({
          orderId: context.orderId,
          orderNumber: orderInfo.orderNumber,
          amount: orderInfo.totalAmount,
          projectName: orderInfo.projectName,
          vendorName: orderInfo.vendorName,
          requestedBy: orderInfo.requesterName
        })
      }));

      await db.insert(notifications).values(notifications);
      
      console.log(`✅ Sent approval request notifications to ${approvers.length} users for order ${context.orderId}`);
    } catch (error) {
      console.error('❌ Error sending approval request notification:', error);
    }
  }

  /**
   * 승인 완료/거부 시 알림 발송
   */
  static async sendApprovalResultNotification(context: NotificationContext): Promise<void> {
    try {
      // 발주서 정보 조회
      const orderInfo = await this.getOrderInfo(context.orderId);
      if (!orderInfo) {
        console.error(`Order ${context.orderId} not found for notification`);
        return;
      }

      // 발주 요청자와 프로젝트 관련자들에게 알림
      const recipients = await this.getOrderStakeholders(context.orderId);
      
      if (recipients.length === 0) {
        console.warn(`No stakeholders found for order ${context.orderId}`);
        return;
      }

      const isApproved = context.action === 'approval_completed';
      const title = isApproved ? '발주서 승인 완료' : '발주서 승인 거부';
      const message = isApproved 
        ? `발주서 #${orderInfo.orderNumber || context.orderId}가 승인되었습니다.`
        : `발주서 #${orderInfo.orderNumber || context.orderId}가 거부되었습니다. ${context.comments ? `사유: ${context.comments}` : ''}`;

      // 알림 생성
      const notifications = recipients.map(recipient => ({
        userId: recipient.id,
        type: isApproved ? 'approval_approved' as const : 'approval_rejected' as const,
        title,
        message,
        relatedId: context.orderId.toString(),
        relatedType: 'purchase_order' as const,
        priority: isApproved ? 'medium' as const : 'high' as const,
        isRead: false,
        metadata: JSON.stringify({
          orderId: context.orderId,
          orderNumber: orderInfo.orderNumber,
          amount: orderInfo.totalAmount,
          projectName: orderInfo.projectName,
          vendorName: orderInfo.vendorName,
          approvedBy: context.performedBy,
          comments: context.comments
        })
      }));

      await db.insert(notifications).values(notifications);
      
      console.log(`✅ Sent approval result notifications to ${recipients.length} users for order ${context.orderId}`);
    } catch (error) {
      console.error('❌ Error sending approval result notification:', error);
    }
  }

  /**
   * 승인 권한이 있는 사용자들 조회
   */
  private static async getEligibleApprovers(orderAmount: number): Promise<{ id: string; name: string; role: string }[]> {
    // 승인 권한 조회
    const authorities = await db
      .select({
        role: approvalAuthorities.role,
        maxAmount: approvalAuthorities.maxAmount
      })
      .from(approvalAuthorities)
      .where(
        and(
          eq(approvalAuthorities.isActive, true),
          sql`CAST(${approvalAuthorities.maxAmount} AS DECIMAL) >= ${orderAmount}`
        )
      );

    if (authorities.length === 0) {
      // 기본적으로 관리자에게 알림
      return await db
        .select({
          id: users.id,
          name: users.name,
          role: users.role
        })
        .from(users)
        .where(eq(users.role, 'admin'))
        .limit(10);
    }

    // 해당 역할의 사용자들 조회
    const eligibleRoles = authorities.map(auth => auth.role);
    return await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role
      })
      .from(users)
      .where(inArray(users.role, eligibleRoles))
      .limit(20);
  }

  /**
   * 발주서 관련 정보 조회
   */
  private static async getOrderInfo(orderId: number) {
    const result = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        totalAmount: purchaseOrders.totalAmount,
        userId: purchaseOrders.userId,
        projectId: purchaseOrders.projectId,
        vendorId: purchaseOrders.vendorId,
        projectName: projects.projectName,
        vendorName: vendors.name,
        requesterName: users.name
      })
      .from(purchaseOrders)
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(users, eq(purchaseOrders.userId, users.id))
      .where(eq(purchaseOrders.id, orderId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * 발주서 관련 이해관계자들 조회
   */
  private static async getOrderStakeholders(orderId: number): Promise<{ id: string; name: string }[]> {
    const orderInfo = await this.getOrderInfo(orderId);
    if (!orderInfo) return [];

    const stakeholders = new Set<string>();
    
    // 발주 요청자
    if (orderInfo.userId) {
      stakeholders.add(orderInfo.userId);
    }

    // 프로젝트 관련자들 (프로젝트 매니저 등)
    if (orderInfo.projectId) {
      const projectMembers = await db
        .select({ userId: users.id })
        .from(users)
        .where(eq(users.role, 'project_manager'))
        .limit(5);
      
      projectMembers.forEach(member => stakeholders.add(member.userId));
    }

    // 사용자 정보 조회
    if (stakeholders.size === 0) return [];

    return await db
      .select({
        id: users.id,
        name: users.name
      })
      .from(users)
      .where(inArray(users.id, Array.from(stakeholders)))
      .limit(10);
  }

  /**
   * 발주 금액에 따른 우선순위 결정
   */
  private static determinePriority(amount: number): 'low' | 'medium' | 'high' {
    if (amount >= 10000000) return 'high'; // 1천만원 이상
    if (amount >= 5000000) return 'medium'; // 5백만원 이상
    return 'low';
  }

  /**
   * 사용자의 읽지 않은 알림 수 조회
   */
  static async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      // TODO: Implement notifications table and functionality
      // For now, return 0 as no notifications are supported
      return 0;
    } catch (error) {
      console.error('❌ Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * 사용자의 알림 목록 조회
   */
  static async getUserNotifications(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isActive, true)
          )
        )
        .orderBy(sql`${notifications.createdAt} DESC`)
        .limit(limit);

      return result.map(notification => ({
        ...notification,
        metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
        createdAt: notification.createdAt?.toISOString(),
        updatedAt: notification.updatedAt?.toISOString()
      }));
    } catch (error) {
      console.error('❌ Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * 알림을 읽음으로 표시
   */
  static async markNotificationAsRead(notificationId: number, userId: string): Promise<boolean> {
    try {
      const result = await db
        .update(notifications)
        .set({
          isRead: true,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        )
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * 모든 알림을 읽음으로 표시
   */
  static async markAllNotificationsAsRead(userId: string): Promise<number> {
    try {
      const result = await db
        .update(notifications)
        .set({
          isRead: true,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false),
            eq(notifications.isActive, true)
          )
        )
        .returning();

      return result.length;
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      return 0;
    }
  }
}

export default NotificationService;