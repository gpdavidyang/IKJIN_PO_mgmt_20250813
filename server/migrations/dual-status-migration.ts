/**
 * Migration script for dual status system
 * Converts single status field to orderStatus + approvalStatus
 */

import { db } from "../db";
import { purchaseOrders } from "@shared/schema";
import { sql } from "drizzle-orm";
import type { LegacyStatus, OrderStatus, ApprovalStatus } from "@shared/order-types";
import { ApprovalBypassReason } from "@shared/order-types";

interface MigrationMapping {
  orderStatus: OrderStatus;
  approvalStatus: ApprovalStatus;
  approvalBypassReason?: ApprovalBypassReason;
}

/**
 * Maps legacy status to new dual status system
 * Legacy: draft, pending, approved, rejected, sent, completed
 */
function mapLegacyToNewStatus(legacyStatus: LegacyStatus): MigrationMapping {
  switch (legacyStatus) {
    case "draft":
      return {
        orderStatus: "draft",
        approvalStatus: "not_required",
        approvalBypassReason: undefined
      };
    
    case "pending":
      // 승인 대기 중 = 발주서 생성됨 + 승인 대기
      return {
        orderStatus: "created",
        approvalStatus: "pending",
        approvalBypassReason: undefined
      };
    
    case "approved":
      // 승인 완료 = 발주서 생성됨 + 승인 완료
      return {
        orderStatus: "created",
        approvalStatus: "approved",
        approvalBypassReason: undefined
      };
    
    case "rejected":
      // 반려 = 임시저장으로 되돌림 + 승인 반려
      return {
        orderStatus: "draft",
        approvalStatus: "rejected",
        approvalBypassReason: undefined
      };
    
    case "sent":
      // 발송됨 = 발송 완료 + 승인 불필요 (이미 발송된 것은 승인을 받았거나 생략했음)
      return {
        orderStatus: "sent",
        approvalStatus: "not_required",
        approvalBypassReason: ApprovalBypassReason.AUTO_APPROVED
      };
    
    case "completed":
      // 발주 완료 = 납품 완료 + 승인 불필요
      return {
        orderStatus: "delivered",
        approvalStatus: "not_required",
        approvalBypassReason: ApprovalBypassReason.AUTO_APPROVED
      };
    
    default:
      // 기본값: 임시저장
      console.warn(`Unknown legacy status: ${legacyStatus}, defaulting to draft`);
      return {
        orderStatus: "draft",
        approvalStatus: "not_required",
        approvalBypassReason: undefined
      };
  }
}

/**
 * Run the migration
 */
export async function runDualStatusMigration() {
  console.log("🚀 Starting dual status migration...");
  
  try {
    // Step 1: Get all existing orders
    const orders = await db.select({
      id: purchaseOrders.id,
      status: purchaseOrders.status,
      orderNumber: purchaseOrders.orderNumber,
    }).from(purchaseOrders);
    
    console.log(`📦 Found ${orders.length} orders to migrate`);
    
    // Step 2: Update each order with new status fields
    let successCount = 0;
    let errorCount = 0;
    
    for (const order of orders) {
      try {
        const legacyStatus = order.status as LegacyStatus;
        const newStatuses = mapLegacyToNewStatus(legacyStatus);
        
        // Update the order with new status fields
        await db.update(purchaseOrders)
          .set({
            orderStatus: newStatuses.orderStatus,
            approvalStatus: newStatuses.approvalStatus,
            approvalBypassReason: newStatuses.approvalBypassReason,
            updatedAt: new Date(),
          })
          .where(sql`${purchaseOrders.id} = ${order.id}`);
        
        successCount++;
        console.log(`✅ Migrated order ${order.orderNumber}: ${legacyStatus} → ${newStatuses.orderStatus}/${newStatuses.approvalStatus}`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to migrate order ${order.orderNumber}:`, error);
      }
    }
    
    // Step 3: Summary
    console.log("\n📊 Migration Summary:");
    console.log(`✅ Successfully migrated: ${successCount} orders`);
    console.log(`❌ Failed: ${errorCount} orders`);
    console.log(`📦 Total processed: ${orders.length} orders`);
    
    // Step 4: Verify migration
    const verificationSample = await db.select({
      orderNumber: purchaseOrders.orderNumber,
      oldStatus: purchaseOrders.status,
      orderStatus: purchaseOrders.orderStatus,
      approvalStatus: purchaseOrders.approvalStatus,
    })
    .from(purchaseOrders)
    .limit(5);
    
    console.log("\n🔍 Verification Sample (first 5 orders):");
    console.table(verificationSample);
    
    return {
      success: errorCount === 0,
      migrated: successCount,
      failed: errorCount,
      total: orders.length,
    };
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

/**
 * Rollback the migration (restore from backup)
 * Note: This should use a database backup or transaction
 */
export async function rollbackDualStatusMigration() {
  console.log("🔄 Rolling back dual status migration...");
  
  try {
    // In production, restore from backup
    // For now, we'll just set orderStatus back to the legacy status field
    
    const orders = await db.select({
      id: purchaseOrders.id,
      orderStatus: purchaseOrders.orderStatus,
      approvalStatus: purchaseOrders.approvalStatus,
    }).from(purchaseOrders);
    
    for (const order of orders) {
      // Map back to legacy status
      let legacyStatus: LegacyStatus = "draft";
      
      if (order.orderStatus === "delivered") {
        legacyStatus = "completed";
      } else if (order.orderStatus === "sent") {
        legacyStatus = "sent";
      } else if (order.orderStatus === "created") {
        if (order.approvalStatus === "approved") {
          legacyStatus = "approved";
        } else if (order.approvalStatus === "pending") {
          legacyStatus = "pending";
        } else if (order.approvalStatus === "rejected") {
          legacyStatus = "rejected";
        } else {
          legacyStatus = "approved"; // Default for created orders
        }
      } else {
        legacyStatus = "draft";
      }
      
      await db.update(purchaseOrders)
        .set({
          status: legacyStatus,
          updatedAt: new Date(),
        })
        .where(sql`${purchaseOrders.id} = ${order.id}`);
    }
    
    console.log(`✅ Rolled back ${orders.length} orders`);
    return true;
    
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw error;
  }
}

// Export for use in migration runner
export default {
  up: runDualStatusMigration,
  down: rollbackDualStatusMigration,
};