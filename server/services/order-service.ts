/**
 * Order business logic service
 */

import { storage } from "../storage";
import { insertPurchaseOrderSchema } from "@shared/schema";
import { z } from "zod";

export class OrderService {
  /**
   * Generate unique order number with current date
   */
  static generateOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    
    return `PO${year}${month}${day}_${timestamp}`;
  }

  /**
   * Create new purchase order
   */
  static async createOrder(orderData: any): Promise<any> {
    try {
      // Add order number if not provided
      if (!orderData.orderNumber) {
        orderData.orderNumber = this.generateOrderNumber();
      }

      // Set default status and approval level
      orderData.status = orderData.status || 'draft';
      orderData.approvalLevel = orderData.approvalLevel || 1;
      orderData.currentApproverRole = orderData.currentApproverRole || 'field_worker';

      const result = await storage.createPurchaseOrder(orderData);
      return result;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Submit order for approval
   */
  static async submitForApproval(orderId: number, userId: string): Promise<any> {
    try {
      const updateData = {
        status: 'pending' as const,
        currentApproverRole: 'project_manager' as const,
        approvalLevel: 2,
        updatedAt: new Date()
      };

      const result = await storage.updatePurchaseOrder(orderId, updateData);
      
      // Log approval action
      await this.createApprovalLog(orderId, userId, 'submitted_for_approval');
      
      return result;
    } catch (error) {
      console.error('Error submitting order for approval:', error);
      throw error;
    }
  }

  /**
   * Approve order
   */
  static async approveOrder(orderId: number, userId: string, role: string): Promise<any> {
    try {
      const nextApprovalLevel = this.getNextApprovalLevel(role);
      const nextApproverRole = this.getNextApproverRole(role);
      
      const updateData = {
        status: nextApproverRole ? 'pending' as const : 'approved' as const,
        currentApproverRole: nextApproverRole,
        approvalLevel: nextApprovalLevel,
        updatedAt: new Date()
      };

      const result = await storage.updatePurchaseOrder(orderId, updateData);
      
      // Log approval action
      await this.createApprovalLog(orderId, userId, 'approved');
      
      return result;
    } catch (error) {
      console.error('Error approving order:', error);
      throw error;
    }
  }

  /**
   * Reject order
   */
  static async rejectOrder(orderId: number, userId: string, reason: string): Promise<any> {
    try {
      const updateData = {
        status: 'draft' as const,
        currentApproverRole: null,
        approvalLevel: 1,
        updatedAt: new Date()
      };

      const result = await storage.updatePurchaseOrder(orderId, updateData);
      
      // Log rejection action
      await this.createApprovalLog(orderId, userId, 'rejected', reason);
      
      return result;
    } catch (error) {
      console.error('Error rejecting order:', error);
      throw error;
    }
  }

  /**
   * Get next approval level based on current role
   */
  private static getNextApprovalLevel(currentRole: string): number {
    const levels = {
      'field_worker': 2,
      'project_manager': 3,
      'hq_management': 4,
      'executive': 5
    };
    return levels[currentRole as keyof typeof levels] || 1;
  }

  /**
   * Get next approver role based on current role
   */
  private static getNextApproverRole(currentRole: string): string | null {
    const nextRoles = {
      'field_worker': 'project_manager',
      'project_manager': 'hq_management',
      'hq_management': 'executive',
      'executive': null // Final approval
    };
    return nextRoles[currentRole as keyof typeof nextRoles] || null;
  }

  /**
   * Create approval log entry
   */
  private static async createApprovalLog(orderId: number, userId: string, action: string, notes?: string): Promise<void> {
    try {
      // This would be implemented when approval logs table is ready
      console.log(`Approval log: Order ${orderId}, User ${userId}, Action: ${action}, Notes: ${notes || 'None'}`);
    } catch (error) {
      console.error('Error creating approval log:', error);
    }
  }
}