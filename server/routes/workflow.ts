/**
 * Workflow API Routes
 * Endpoints for dual status system and approval workflow
 */

import { Router } from "express";
import { approvalAuthorityService } from "../services/approval-authority-service";
import { workflowEngine } from "../services/workflow-engine";
import { db } from "../db";
import { purchaseOrders, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { AuthorityCheck } from "@shared/order-types";

const router = Router();

/**
 * Check user's approval authority for a given amount
 */
router.post("/api/orders/check-approval-authority", async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    
    // Get user details
    const user = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user || user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check authority
    const authorityCheck: AuthorityCheck = await approvalAuthorityService.checkAuthority(
      user[0],
      amount
    );
    
    // Get list of required approvers if approval is needed
    let approvers = [];
    if (authorityCheck.requiresApproval) {
      approvers = await approvalAuthorityService.getRequiredApprovers(
        amount,
        user[0].companyId
      );
    }
    
    res.json({
      ...authorityCheck,
      approvers,
      estimatedApprovalTime: authorityCheck.requiresApproval ? "2-4 hours" : "Immediate",
    });
    
  } catch (error) {
    console.error("Error checking approval authority:", error);
    res.status(500).json({ 
      message: "Failed to check approval authority",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create order with workflow integration
 */
router.post("/api/orders/create-with-workflow", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    const orderData = req.body;
    
    // Get user details
    const user = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user || user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check user's authority
    const authorityCheck = await approvalAuthorityService.checkAuthority(
      user[0],
      orderData.totalAmount
    );
    
    // Determine initial statuses
    let orderStatus = "draft";
    let approvalStatus = "not_required";
    let approvalBypassReason = undefined;
    let nextApproverId = undefined;
    
    if (authorityCheck.canDirectApprove) {
      // Direct approval
      orderStatus = "created";
      approvalStatus = "not_required";
      approvalBypassReason = authorityCheck.bypassReason;
    } else if (authorityCheck.requiresApproval) {
      // Needs approval
      orderStatus = "created";
      approvalStatus = "pending";
      nextApproverId = authorityCheck.nextApprover;
    } else {
      // Check for auto-approval
      const autoApproval = await approvalAuthorityService.checkAutoApproval(orderData);
      if (autoApproval.shouldAutoApprove) {
        orderStatus = "created";
        approvalStatus = "not_required";
        approvalBypassReason = autoApproval.reason;
      }
    }
    
    // Create the order with dual status
    const newOrder = await db.insert(purchaseOrders).values({
      ...orderData,
      orderStatus,
      approvalStatus,
      approvalBypassReason,
      nextApproverId,
      approvalRequestedAt: approvalStatus === "pending" ? new Date() : undefined,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    // Process workflow if not draft
    if (orderStatus !== "draft") {
      await workflowEngine.processNextStep(newOrder[0].id, userId);
    }
    
    // Send notifications if needed
    if (approvalStatus === "pending") {
      await workflowEngine.sendNotifications(newOrder[0].id, "approval_requested");
    }
    
    res.json({
      order: newOrder[0],
      workflow: {
        requiresApproval: authorityCheck.requiresApproval,
        canDirectApprove: authorityCheck.canDirectApprove,
        nextApprover: authorityCheck.nextApprover,
        estimatedCompletion: authorityCheck.requiresApproval ? "2-4 hours" : "Immediate",
      },
    });
    
  } catch (error) {
    console.error("Error creating order with workflow:", error);
    res.status(500).json({ 
      message: "Failed to create order",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get workflow status for an order
 */
router.get("/api/orders/workflow-status/:id", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    
    const workflowStatus = await workflowEngine.trackWorkflowProgress(orderId);
    
    res.json(workflowStatus);
    
  } catch (error) {
    console.error("Error getting workflow status:", error);
    res.status(500).json({ 
      message: "Failed to get workflow status",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Process approval decision
 */
router.post("/api/orders/:id/approve", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    const { decision, comments } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "Invalid decision" });
    }
    
    // Process the approval
    const success = await approvalAuthorityService.processApproval(
      orderId,
      userId,
      decision,
      comments
    );
    
    if (success) {
      // Process next workflow step
      await workflowEngine.processNextStep(orderId, userId);
      
      // Send notifications
      const eventType = decision === "approved" ? "order_approved" : "order_rejected";
      await workflowEngine.sendNotifications(orderId, eventType);
      
      res.json({ 
        message: `Order ${decision}`,
        success: true 
      });
    } else {
      res.status(500).json({ 
        message: "Failed to process approval",
        success: false 
      });
    }
    
  } catch (error) {
    console.error("Error processing approval:", error);
    res.status(500).json({ 
      message: "Failed to process approval",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Confirm delivery completion
 */
router.post("/api/orders/:id/confirm-delivery", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    const { notes, receivedItems } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    
    // Update order to delivered status
    await db.update(purchaseOrders)
      .set({
        orderStatus: "delivered",
        deliveredAt: new Date(),
        deliveredBy: userId,
        notes: notes || undefined,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, orderId));
    
    // Send notifications
    await workflowEngine.sendNotifications(orderId, "delivery_completed");
    
    res.json({ 
      message: "Delivery confirmed",
      success: true 
    });
    
  } catch (error) {
    console.error("Error confirming delivery:", error);
    res.status(500).json({ 
      message: "Failed to confirm delivery",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get required approvers for an amount
 */
router.get("/api/orders/required-approvers", async (req, res) => {
  try {
    const amount = parseFloat(req.query.amount as string);
    const companyId = req.query.companyId ? parseInt(req.query.companyId as string, 10) : undefined;
    
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    
    const approvers = await approvalAuthorityService.getRequiredApprovers(amount, companyId);
    
    res.json({
      approvers,
      totalLevels: approvers.length,
      estimatedTime: `${approvers.length * 2}-${approvers.length * 4} hours`,
    });
    
  } catch (error) {
    console.error("Error getting required approvers:", error);
    res.status(500).json({ 
      message: "Failed to get required approvers",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;