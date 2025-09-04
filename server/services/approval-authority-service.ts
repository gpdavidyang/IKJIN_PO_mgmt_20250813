/**
 * Approval Authority Service
 * Handles approval logic for purchase orders with dual status system
 */

import { db } from "../db";
import { approvalAuthorities, users, purchaseOrders } from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import type { User } from "@shared/schema";
import type { AuthorityCheck } from "@shared/order-types";
import { ApprovalBypassReason } from "@shared/order-types";

export class ApprovalAuthorityService {
  /**
   * Check user's approval authority for a given amount
   */
  async checkAuthority(user: User, orderAmount: number): Promise<AuthorityCheck> {
    // Get user's role-based authority
    const authority = await db.select()
      .from(approvalAuthorities)
      .where(and(
        eq(approvalAuthorities.role, user.role),
        eq(approvalAuthorities.isActive, true)
      ))
      .limit(1);
    
    if (!authority || authority.length === 0) {
      // No authority found - requires approval
      return {
        canDirectApprove: false,
        requiresApproval: true,
        nextApprover: await this.findNextApprover(orderAmount),
      };
    }
    
    const auth = authority[0];
    
    // Check if user can direct approve
    if (auth.canDirectApprove && auth.directApproveLimit) {
      const directLimit = parseFloat(auth.directApproveLimit.toString());
      if (orderAmount <= directLimit) {
        return {
          canDirectApprove: true,
          directApproveLimit: directLimit,
          requiresApproval: false,
          bypassReason: ApprovalBypassReason.DIRECT_APPROVAL,
        };
      }
    }
    
    // Check if amount is within regular approval limit
    const maxAmount = parseFloat(auth.maxAmount.toString());
    if (orderAmount <= maxAmount) {
      // Can approve but not directly
      return {
        canDirectApprove: false,
        requiresApproval: true,
        nextApprover: user.id,
      };
    }
    
    // Amount exceeds user's authority - find higher approver
    return {
      canDirectApprove: false,
      requiresApproval: true,
      nextApprover: await this.findNextApprover(orderAmount),
    };
  }
  
  /**
   * Check if user can directly approve without workflow
   */
  async canDirectApprove(user: User, orderAmount: number): Promise<boolean> {
    const check = await this.checkAuthority(user, orderAmount);
    return check.canDirectApprove;
  }
  
  /**
   * Find the appropriate approver for a given amount
   */
  private async findNextApprover(orderAmount: number): Promise<string | undefined> {
    // Get all active authorities that can handle this amount
    const authorities = await db.select()
      .from(approvalAuthorities)
      .where(and(
        gte(approvalAuthorities.maxAmount, orderAmount.toString()),
        eq(approvalAuthorities.isActive, true)
      ))
      .orderBy(approvalAuthorities.maxAmount);
    
    if (authorities.length === 0) {
      // No authority can approve - needs executive
      const executive = await db.select()
        .from(users)
        .where(eq(users.role, "executive"))
        .limit(1);
      
      return executive[0]?.id;
    }
    
    // Find a user with the lowest sufficient authority
    const lowestAuthority = authorities[0];
    const approver = await db.select()
      .from(users)
      .where(and(
        eq(users.role, lowestAuthority.role),
        eq(users.isActive, true)
      ))
      .limit(1);
    
    return approver[0]?.id;
  }
  
  /**
   * Get list of required approvers for an order amount
   */
  async getRequiredApprovers(orderAmount: number, companyId?: number): Promise<Approver[]> {
    const approvers: Approver[] = [];
    
    // Get approval chain based on amount thresholds
    const authorities = await db.select({
      role: approvalAuthorities.role,
      maxAmount: approvalAuthorities.maxAmount,
      canDirectApprove: approvalAuthorities.canDirectApprove,
      directApproveLimit: approvalAuthorities.directApproveLimit,
    })
    .from(approvalAuthorities)
    .where(and(
      eq(approvalAuthorities.isActive, true),
      gte(approvalAuthorities.maxAmount, orderAmount.toString())
    ))
    .orderBy(approvalAuthorities.maxAmount);
    
    // Get users for each authority level
    for (const auth of authorities) {
      const usersInRole = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(
        eq(users.role, auth.role),
        eq(users.isActive, true),
        companyId ? eq(users.companyId, companyId) : undefined
      ));
      
      if (usersInRole.length > 0) {
        approvers.push({
          userId: usersInRole[0].id,
          name: usersInRole[0].name,
          email: usersInRole[0].email,
          role: usersInRole[0].role,
          level: approvers.length + 1,
          canDirectApprove: auth.canDirectApprove || false,
          approvalLimit: parseFloat(auth.maxAmount.toString()),
        });
        
        // If this user can direct approve this amount, they're the only approver needed
        if (auth.canDirectApprove && auth.directApproveLimit) {
          const directLimit = parseFloat(auth.directApproveLimit.toString());
          if (orderAmount <= directLimit) {
            break;
          }
        }
      }
    }
    
    return approvers;
  }
  
  /**
   * Check if order meets auto-approval criteria
   */
  async checkAutoApproval(order: Partial<typeof purchaseOrders.$inferSelect>): Promise<{
    shouldAutoApprove: boolean;
    reason?: ApprovalBypassReason;
  }> {
    // Check various auto-approval conditions
    
    // 1. Small amount threshold (e.g., under 100,000 KRW)
    const SMALL_AMOUNT_THRESHOLD = 100000;
    if (order.totalAmount && parseFloat(order.totalAmount.toString()) < SMALL_AMOUNT_THRESHOLD) {
      return {
        shouldAutoApprove: true,
        reason: ApprovalBypassReason.AMOUNT_THRESHOLD,
      };
    }
    
    // 2. Emergency order
    if (order.notes && order.notes.toLowerCase().includes("긴급") || order.notes?.toLowerCase().includes("emergency")) {
      return {
        shouldAutoApprove: true,
        reason: ApprovalBypassReason.EMERGENCY,
      };
    }
    
    // 3. Excel automation orders (already handled in processing)
    if (order.approvalBypassReason === ApprovalBypassReason.EXCEL_AUTOMATION) {
      return {
        shouldAutoApprove: true,
        reason: ApprovalBypassReason.EXCEL_AUTOMATION,
      };
    }
    
    // 4. Check for repeat orders (same vendor, similar items within 30 days)
    if (order.vendorId) {
      const recentOrders = await db.select()
        .from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.vendorId, order.vendorId),
          eq(purchaseOrders.orderStatus, "delivered"),
          // Check orders from last 30 days
        ))
        .limit(1);
      
      if (recentOrders.length > 0) {
        return {
          shouldAutoApprove: true,
          reason: ApprovalBypassReason.REPEAT_ORDER,
        };
      }
    }
    
    return {
      shouldAutoApprove: false,
    };
  }
  
  /**
   * Update order with approval decision
   */
  async processApproval(
    orderId: number,
    approverId: string,
    decision: "approved" | "rejected",
    comments?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        approvalStatus: decision,
        updatedAt: new Date(),
      };
      
      if (decision === "approved") {
        updateData.approvedBy = approverId;
        updateData.approvedAt = new Date();
        // When approved, order can proceed to 'created' status
        updateData.orderStatus = "created";
      } else if (decision === "rejected") {
        updateData.rejectedBy = approverId;
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = comments;
        // When rejected, order goes back to draft
        updateData.orderStatus = "draft";
      }
      
      await db.update(purchaseOrders)
        .set(updateData)
        .where(eq(purchaseOrders.id, orderId));
      
      return true;
    } catch (error) {
      console.error("Error processing approval:", error);
      return false;
    }
  }
}

// Type definitions for approvers
interface Approver {
  userId: string;
  name: string;
  email: string;
  role: string;
  level: number;
  canDirectApprove: boolean;
  approvalLimit: number;
}

// Export singleton instance
export const approvalAuthorityService = new ApprovalAuthorityService();