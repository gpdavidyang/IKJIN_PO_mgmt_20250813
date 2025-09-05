import { Router } from "express";
import { db } from "../db";
import { purchaseOrders, vendors } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";

const router = Router();

// Debug endpoint to check recent draft orders
router.get("/debug/recent-drafts", async (req, res) => {
  try {
    // Get recent draft orders from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentDrafts = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        status: purchaseOrders.status,
        createdAt: purchaseOrders.createdAt,
        userId: purchaseOrders.userId,
        vendorId: purchaseOrders.vendorId,
        totalAmount: purchaseOrders.totalAmount,
        vendorName: vendors.name
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(eq(purchaseOrders.status, 'draft'))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(20);

    // Also get all orders from last hour regardless of status
    const allRecentOrders = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        status: purchaseOrders.status,
        createdAt: purchaseOrders.createdAt,
        userId: purchaseOrders.userId,
        vendorId: purchaseOrders.vendorId,
        totalAmount: purchaseOrders.totalAmount,
        vendorName: vendors.name
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(sql`${purchaseOrders.createdAt} > ${oneHourAgo}`)
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(50);

    // Check for 제이비엔지니어링 vendor
    const jbVendor = await db
      .select()
      .from(vendors)
      .where(sql`${vendors.name} LIKE '%제이비엔지니어링%'`)
      .limit(5);

    res.json({
      recentDrafts,
      recentDraftsCount: recentDrafts.length,
      allRecentOrders,
      allRecentCount: allRecentOrders.length,
      jbVendors: jbVendor,
      currentTime: new Date().toISOString(),
      oneHourAgo: oneHourAgo.toISOString()
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ error: "Debug endpoint failed" });
  }
});

export default router;