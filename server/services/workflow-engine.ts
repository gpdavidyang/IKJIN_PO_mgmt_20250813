/**
 * Workflow Engine
 * Manages the purchase order workflow with dual status system
 */

import { db } from "../db";
import { purchaseOrders, orderHistory, users, vendors } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { OrderStatus, ApprovalStatus, WorkflowStatus, WorkflowEvent } from "@shared/order-types";
import { ApprovalBypassReason } from "@shared/order-types";
import { approvalAuthorityService } from "./approval-authority-service";
import { webSocketService } from "./websocket-service";
import type { OrderUpdateEvent, ApprovalRequestEvent, DeliveryConfirmationEvent, WebSocketUser } from "./websocket-service";
// Email service will be integrated later
// import { POEmailService } from "../utils/po-email-service";

export class WorkflowEngine {
  /**
   * Process the next step in the workflow automatically
   */
  async processNextStep(orderId: number, userId: string): Promise<void> {
    const order = await db.select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId))
      .limit(1);
    
    if (!order || order.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    const currentOrder = order[0];
    const user = await this.getUser(userId);
    
    // Determine next action based on current status
    if (currentOrder.orderStatus === "draft") {
      // Check if needs approval
      const authorityCheck = await approvalAuthorityService.checkAuthority(
        user,
        parseFloat(currentOrder.totalAmount?.toString() || "0")
      );
      
      if (authorityCheck.canDirectApprove) {
        // Direct approval - skip to created and send
        await this.updateOrderStatus(orderId, "created", "not_required", {
          approvalBypassReason: ApprovalBypassReason.DIRECT_APPROVAL,
          approvedBy: userId,
          approvedAt: new Date(),
        });
        
        // Automatically send email if vendor has email
        await this.sendOrderIfReady(orderId);
        
      } else if (authorityCheck.requiresApproval) {
        // Needs approval - move to pending
        await this.updateOrderStatus(orderId, "created", "pending", {
          nextApproverId: authorityCheck.nextApprover,
          approvalRequestedAt: new Date(),
        });
        
        // Send notification to approver
        await this.notifyApprover(authorityCheck.nextApprover, orderId);
      } else {
        // Check for auto-approval conditions
        const autoApproval = await approvalAuthorityService.checkAutoApproval(currentOrder);
        if (autoApproval.shouldAutoApprove) {
          await this.updateOrderStatus(orderId, "created", "not_required", {
            approvalBypassReason: autoApproval.reason,
          });
          await this.sendOrderIfReady(orderId);
        }
      }
      
    } else if (currentOrder.orderStatus === "created" && currentOrder.approvalStatus === "approved") {
      // Approved order - send it
      await this.sendOrderIfReady(orderId);
      
    } else if (currentOrder.orderStatus === "sent") {
      // Order sent - waiting for delivery
      // This would be updated manually when delivery is confirmed
      console.log(`Order ${orderId} is sent, awaiting delivery confirmation`);
    }
    
    // Log workflow event
    await this.logWorkflowEvent(orderId, "workflow_processed", userId, {
      fromStatus: currentOrder.orderStatus,
      fromApproval: currentOrder.approvalStatus,
    });
  }
  
  /**
   * Track workflow progress for an order
   */
  async trackWorkflowProgress(orderId: number): Promise<WorkflowStatus> {
    const order = await db.select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId))
      .limit(1);
    
    if (!order || order.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    const currentOrder = order[0];
    
    // Get workflow history
    const history = await db.select({
      timestamp: orderHistory.changedAt,
      event: orderHistory.changeType,
      actor: orderHistory.userId,
      details: orderHistory.changedData,
    })
    .from(orderHistory)
    .where(eq(orderHistory.orderId, orderId))
    .orderBy(orderHistory.changedAt);
    
    // Determine current and next steps
    const { currentStep, nextStep, estimatedCompletion } = this.determineWorkflowSteps(
      currentOrder.orderStatus as OrderStatus,
      currentOrder.approvalStatus as ApprovalStatus
    );
    
    return {
      orderId: orderId.toString(),
      orderStatus: currentOrder.orderStatus as OrderStatus,
      approvalStatus: currentOrder.approvalStatus as ApprovalStatus,
      currentStep,
      nextStep,
      estimatedCompletion,
      history: history.map(h => ({
        timestamp: h.timestamp || new Date(),
        event: h.event,
        actor: h.actor || "system",
        details: h.details as Record<string, any>,
      })),
    };
  }
  
  /**
   * Send notifications based on workflow events
   */
  async sendNotifications(orderId: number, event: WorkflowEventType): Promise<void> {
    const order = await db.select({
      id: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      nextApproverId: purchaseOrders.nextApproverId,
      createdBy: purchaseOrders.createdBy,
      vendorId: purchaseOrders.vendorId,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, orderId))
    .limit(1);
    
    if (!order || order.length === 0) return;
    
    const currentOrder = order[0];
    
    switch (event) {
      case "approval_requested":
        if (currentOrder.nextApproverId) {
          await this.notifyApprover(currentOrder.nextApproverId, orderId);
        }
        break;
        
      case "order_approved":
        await this.notifyCreator(currentOrder.createdBy, orderId, "approved");
        break;
        
      case "order_rejected":
        await this.notifyCreator(currentOrder.createdBy, orderId, "rejected");
        break;
        
      case "order_sent":
        await this.notifyCreator(currentOrder.createdBy, orderId, "sent");
        break;
        
      case "delivery_completed":
        await this.notifyCreator(currentOrder.createdBy, orderId, "delivered");
        break;
    }
  }
  
  /**
   * Update order status with validation and WebSocket broadcast
   */
  private async updateOrderStatus(
    orderId: number,
    orderStatus: OrderStatus,
    approvalStatus: ApprovalStatus,
    additionalData?: Record<string, any>
  ): Promise<void> {
    // Get order details before update
    const beforeOrder = await db.select({
      id: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      orderStatus: purchaseOrders.orderStatus,
      approvalStatus: purchaseOrders.approvalStatus,
      userId: purchaseOrders.userId,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, orderId))
    .limit(1);
    
    if (!beforeOrder || beforeOrder.length === 0) return;
    
    // Update the order
    await db.update(purchaseOrders)
      .set({
        orderStatus,
        approvalStatus,
        ...additionalData,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, orderId));
    
    // Get updatedBy user info (will be provided by context in actual usage)
    const updatedBy = await this.getUserAsWebSocketUser(beforeOrder[0].userId);
    
    // Broadcast update via WebSocket
    if (updatedBy) {
      const event: OrderUpdateEvent = {
        orderId,
        orderNumber: beforeOrder[0].orderNumber || `PO-${orderId}`,
        orderStatus,
        approvalStatus,
        updatedBy,
        timestamp: new Date(),
        changes: {
          from: {
            orderStatus: beforeOrder[0].orderStatus,
            approvalStatus: beforeOrder[0].approvalStatus,
          },
          to: {
            orderStatus,
            approvalStatus,
          },
          ...additionalData,
        },
      };
      
      webSocketService.broadcastOrderUpdate(event);
    }
  }
  
  /**
   * Send order email if ready
   */
  private async sendOrderIfReady(orderId: number): Promise<void> {
    const order = await db.select({
      id: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      vendorId: purchaseOrders.vendorId,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, orderId))
    .limit(1);
    
    if (!order || order.length === 0) return;
    
    const vendor = await db.select()
      .from(vendors)
      .where(eq(vendors.id, order[0].vendorId))
      .limit(1);
    
    if (vendor[0]?.email) {
      try {
        // TODO: Integrate email service
        // For now, just mark as sent without actually sending email
        console.log(`Email would be sent to ${vendor[0].email} for order ${order[0].orderNumber}`);
        
        // Mark as sent
        await this.updateOrderStatus(orderId, "sent", "not_required", {
          sentAt: new Date(),
        });
      } catch (error) {
        console.error(`Failed to update order status for ${orderId}:`, error);
      }
    }
  }
  
  /**
   * Determine workflow steps based on status
   */
  private determineWorkflowSteps(
    orderStatus: OrderStatus,
    approvalStatus: ApprovalStatus
  ): {
    currentStep: string;
    nextStep?: string;
    estimatedCompletion?: Date;
  } {
    if (orderStatus === "draft") {
      return {
        currentStep: "발주서 작성 중",
        nextStep: approvalStatus === "not_required" ? "발주서 발송" : "승인 요청",
        estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      };
    }
    
    if (orderStatus === "created" && approvalStatus === "pending") {
      return {
        currentStep: "승인 대기 중",
        nextStep: "승인 완료 후 발송",
        estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
    }
    
    if (orderStatus === "created" && approvalStatus === "approved") {
      return {
        currentStep: "승인 완료",
        nextStep: "발주서 발송",
        estimatedCompletion: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      };
    }
    
    if (orderStatus === "sent") {
      return {
        currentStep: "발송 완료",
        nextStep: "납품 대기",
        estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };
    }
    
    if (orderStatus === "delivered") {
      return {
        currentStep: "납품 완료",
        nextStep: undefined,
        estimatedCompletion: undefined,
      };
    }
    
    return {
      currentStep: "상태 확인 중",
      nextStep: undefined,
      estimatedCompletion: undefined,
    };
  }
  
  /**
   * Log workflow event to history
   */
  private async logWorkflowEvent(
    orderId: number,
    event: string,
    userId: string,
    details?: Record<string, any>
  ): Promise<void> {
    await db.insert(orderHistory).values({
      orderId,
      userId,
      changeType: event,
      changedData: details || {},
      changedAt: new Date(),
    });
  }
  
  /**
   * Get user details
   */
  private async getUser(userId: string) {
    const user = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user || user.length === 0) {
      throw new Error(`User ${userId} not found`);
    }
    
    return user[0];
  }
  
  /**
   * Notify approver about pending approval
   */
  private async notifyApprover(approverId: string, orderId: number): Promise<void> {
    const approver = await this.getUserAsWebSocketUser(approverId);
    
    // Get order info
    const order = await db.select({
      id: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      totalAmount: purchaseOrders.totalAmount,
      userId: purchaseOrders.userId,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, orderId))
    .limit(1);
    
    if (order[0] && approver) {
      const requestedBy = await this.getUserAsWebSocketUser(order[0].userId);
      
      if (requestedBy) {
        const event: ApprovalRequestEvent = {
          orderId,
          orderNumber: order[0].orderNumber || `PO-${orderId}`,
          requestedBy,
          requiredApprover: approver,
          orderAmount: parseFloat(order[0].totalAmount?.toString() || '0'),
          timestamp: new Date(),
        };
        
        webSocketService.notifyApprovalRequest(event);
      }
    }
    
    console.log(`📧 Notification sent to approver ${approverId} for order ${orderId}`);
  }
  
  /**
   * Notify order creator about status change
   */
  private async notifyCreator(creatorId: string, orderId: number, status: string): Promise<void> {
    const creator = await this.getUserAsWebSocketUser(creatorId);
    
    if (creator) {
      webSocketService.notifyUser(creatorId, {
        title: '발주서 상태 변경',
        message: `발주서 ${orderId}의 상태가 ${this.getStatusDisplayName(status)}로 변경되었습니다.`,
        type: status === 'rejected' ? 'error' : 'success',
        data: { orderId, status }
      });
    }
    
    console.log(`📧 Notification sent to creator ${creatorId}: Order ${orderId} is ${status}`);
  }
  
  /**
   * Convert database user to WebSocket user format
   */
  private async getUserAsWebSocketUser(userId: string): Promise<WebSocketUser | null> {
    try {
      const user = await this.getUser(userId);
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        companyId: user.companyId || undefined,
      };
    } catch (error) {
      console.error(`Failed to get user ${userId}:`, error);
      return null;
    }
  }
  
  /**
   * Get display name for status
   */
  private getStatusDisplayName(status: string): string {
    const statusMap: Record<string, string> = {
      'approved': '승인됨',
      'rejected': '반려됨',
      'sent': '발송됨',
      'delivered': '납품됨',
    };
    return statusMap[status] || status;
  }
}

// Workflow event types
type WorkflowEventType = 
  | "approval_requested"
  | "order_approved"
  | "order_rejected"
  | "order_sent"
  | "delivery_completed";

// Export singleton instance
export const workflowEngine = new WorkflowEngine();