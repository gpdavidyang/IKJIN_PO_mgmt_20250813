import { Router } from 'express';
import { db } from '../db';
import { purchaseOrders, orderHistory, users, approvalAuthorities } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../local-auth';
import { z } from 'zod';
import { approvalAuthorityService } from '../services/approval-authority-service';
import { workflowEngine } from '../services/workflow-engine';
import { webSocketService } from '../services/websocket-service';
import type { DeliveryConfirmationEvent, WebSocketUser } from '../services/websocket-service';

const router = Router();

/**
 * Check approval authority for current user
 * POST /api/orders/check-approval-authority
 */
router.post('/orders/check-approval-authority', requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      orderAmount: z.number().positive()
    });
    
    const { orderAmount } = schema.parse(req.body);
    
    // Get current user
    const user = await db.select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .then(rows => rows[0]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check authority
    const authorityCheck = await approvalAuthorityService.checkAuthority(user, orderAmount);
    
    // Get list of required approvers if approval is needed
    let requiredApprovers = [];
    if (authorityCheck.requiresApproval && !authorityCheck.canDirectApprove) {
      requiredApprovers = await approvalAuthorityService.getRequiredApprovers(orderAmount, user.companyId);
    }
    
    res.json({
      ...authorityCheck,
      requiredApprovers,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error checking approval authority:', error);
    res.status(500).json({ 
      error: 'Failed to check approval authority',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create order with integrated workflow
 * POST /api/orders/create-with-workflow
 */
router.post('/orders/create-with-workflow', requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      orderData: z.object({
        projectId: z.number(),
        vendorId: z.number(),
        orderDate: z.string(),
        deliveryDate: z.string().optional(),
        totalAmount: z.number(),
        notes: z.string().optional(),
        items: z.array(z.object({
          itemId: z.number(),
          quantity: z.number(),
          unitPrice: z.number(),
          totalAmount: z.number(),
          notes: z.string().optional()
        }))
      }),
      sendEmail: z.boolean().optional()
    });
    
    const { orderData, sendEmail } = schema.parse(req.body);
    
    // Get current user
    const user = await db.select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .then(rows => rows[0]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check approval authority
    const authorityCheck = await approvalAuthorityService.checkAuthority(user, orderData.totalAmount);
    
    // Determine initial statuses
    let orderStatus: 'draft' | 'created' = 'draft';
    let approvalStatus: 'not_required' | 'pending' = 'not_required';
    let approvalBypassReason = null;
    let nextApproverId = null;
    
    if (authorityCheck.canDirectApprove) {
      orderStatus = 'created';
      approvalStatus = 'not_required';
      approvalBypassReason = authorityCheck.bypassReason || 'direct_approval';
    } else if (authorityCheck.requiresApproval) {
      orderStatus = 'created';
      approvalStatus = 'pending';
      nextApproverId = authorityCheck.nextApprover;
    } else {
      // Check for auto-approval conditions
      const autoApproval = await approvalAuthorityService.checkAutoApproval(orderData as any);
      if (autoApproval.shouldAutoApprove) {
        orderStatus = 'created';
        approvalStatus = 'not_required';
        approvalBypassReason = autoApproval.reason;
      }
    }
    
    // Generate order number
    const orderCount = await db.select()
      .from(purchaseOrders)
      .then(rows => rows.length);
    const orderNumber = `PO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(5, '0')}`;
    
    // Create order
    const [newOrder] = await db.insert(purchaseOrders)
      .values({
        ...orderData,
        orderNumber,
        userId: req.user.id,
        status: orderStatus === 'draft' ? 'draft' : approvalStatus === 'pending' ? 'pending' : 'approved',
        orderStatus,
        approvalStatus,
        approvalBypassReason,
        nextApproverId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Log to history
    await db.insert(orderHistory).values({
      orderId: newOrder.id,
      userId: req.user.id,
      action: 'created',
      changes: {
        orderStatus,
        approvalStatus,
        approvalBypassReason,
        authorityCheck
      },
      createdAt: new Date()
    });
    
    // Process workflow
    await workflowEngine.processNextStep(newOrder.id, req.user.id);
    
    // Send notifications
    if (approvalStatus === 'pending') {
      await workflowEngine.sendNotifications(newOrder.id, 'approval_requested');
    } else if (sendEmail && orderStatus === 'created') {
      await workflowEngine.sendNotifications(newOrder.id, 'order_created');
    }
    
    res.json({
      order: newOrder,
      workflowStatus: await workflowEngine.trackWorkflowProgress(newOrder.id)
    });
  } catch (error) {
    console.error('Error creating order with workflow:', error);
    res.status(500).json({ 
      error: 'Failed to create order',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get workflow status for an order
 * GET /api/orders/workflow-status/:id
 */
router.get('/orders/workflow-status/:id', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    // Check if order exists
    const order = await db.select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId))
      .then(rows => rows[0]);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get workflow status
    const workflowStatus = await workflowEngine.trackWorkflowProgress(orderId);
    
    res.json(workflowStatus);
  } catch (error) {
    console.error('Error getting workflow status:', error);
    res.status(500).json({ 
      error: 'Failed to get workflow status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Confirm delivery of an order
 * POST /api/orders/:id/confirm-delivery
 */
router.post('/orders/:id/confirm-delivery', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    const schema = z.object({
      deliveryNotes: z.string().optional(),
      actualDeliveryDate: z.string().optional(),
      receivedBy: z.string().optional()
    });
    
    const { deliveryNotes, actualDeliveryDate, receivedBy } = schema.parse(req.body);
    
    // Check if order exists and is in 'sent' status
    const order = await db.select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId))
      .then(rows => rows[0]);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.orderStatus !== 'sent') {
      return res.status(400).json({ 
        error: 'Invalid order status',
        message: 'Only sent orders can be marked as delivered'
      });
    }
    
    // Update order status to delivered
    const [updatedOrder] = await db.update(purchaseOrders)
      .set({
        orderStatus: 'delivered',
        status: 'completed', // Legacy status
        deliveredAt: actualDeliveryDate ? new Date(actualDeliveryDate) : new Date(),
        deliveredBy: receivedBy || req.user.id,
        notes: deliveryNotes ? 
          (order.notes ? `${order.notes}\n\n배송 메모: ${deliveryNotes}` : deliveryNotes) : 
          order.notes,
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, orderId))
      .returning();
    
    // Log to history
    await db.insert(orderHistory).values({
      orderId,
      userId: req.user.id,
      action: 'delivery_confirmed',
      changes: {
        previousStatus: order.orderStatus,
        newStatus: 'delivered',
        deliveryNotes,
        actualDeliveryDate,
        receivedBy: receivedBy || req.user.id
      },
      createdAt: new Date()
    });
    
    // Send WebSocket notification
    const confirmedBy: WebSocketUser = {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
      companyId: req.user.companyId || undefined
    };
    
    const deliveryEvent: DeliveryConfirmationEvent = {
      orderId,
      orderNumber: order.orderNumber || `PO-${orderId}`,
      confirmedBy,
      deliveredAt: actualDeliveryDate ? new Date(actualDeliveryDate) : new Date(),
      timestamp: new Date()
    };
    
    webSocketService.notifyDeliveryConfirmation(deliveryEvent);
    
    // Send notifications
    await workflowEngine.sendNotifications(orderId, 'delivery_completed');
    
    res.json({
      success: true,
      order: updatedOrder,
      message: 'Delivery confirmed successfully'
    });
  } catch (error) {
    console.error('Error confirming delivery:', error);
    res.status(500).json({ 
      error: 'Failed to confirm delivery',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Process approval decision
 * POST /api/orders/:id/approve
 */
router.post('/orders/:id/approve', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    const schema = z.object({
      decision: z.enum(['approved', 'rejected']),
      comments: z.string().optional()
    });
    
    const { decision, comments } = schema.parse(req.body);
    
    // Process approval
    const success = await approvalAuthorityService.processApproval(
      orderId,
      req.user.id,
      decision,
      comments
    );
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to process approval' });
    }
    
    // Log to history
    await db.insert(orderHistory).values({
      orderId,
      userId: req.user.id,
      action: decision === 'approved' ? 'approved' : 'rejected',
      changes: {
        decision,
        comments
      },
      createdAt: new Date()
    });
    
    // Process workflow
    await workflowEngine.processNextStep(orderId, req.user.id);
    
    // Send notifications
    await workflowEngine.sendNotifications(
      orderId, 
      decision === 'approved' ? 'order_approved' : 'order_rejected'
    );
    
    res.json({
      success: true,
      message: `Order ${decision === 'approved' ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Error processing approval:', error);
    res.status(500).json({ 
      error: 'Failed to process approval',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;