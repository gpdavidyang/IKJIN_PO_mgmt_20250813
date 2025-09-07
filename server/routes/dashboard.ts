/**
 * Dashboard and Analytics Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { OptimizedDashboardQueries } from "../utils/optimized-queries";
import { cache } from "../utils/cache";
import { sql } from "drizzle-orm";

const router = Router();

// Test database connection
router.get("/dashboard/test-db", async (req, res) => {
  try {
    const { db } = await import("../db");
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM purchase_orders`);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("DB test error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/dashboard/unified", async (req, res) => {
  try {
    // Check if force refresh is requested
    if (req.query.force === 'true') {
      cache.delete('unified_dashboard_data');
    }
    
    const stats = await OptimizedDashboardQueries.getUnifiedDashboardData();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

router.get("/dashboard/recent-projects", async (req, res) => {
  try {
    const projects = await storage.getRecentProjectsThisMonth();
    res.json(projects);
  } catch (error) {
    console.error("Error fetching recent projects:", error);
    res.status(500).json({ message: "Failed to fetch recent projects" });
  }
});

router.get("/dashboard/urgent-orders", async (req, res) => {
  try {
    const orders = await storage.getUrgentOrders();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching urgent orders:", error);
    res.status(500).json({ message: "Failed to fetch urgent orders" });
  }
});

// Removed TEMPORARY FIX - use dedicated orders-optimized.ts route instead

// Order status statistics for overview cards
router.get("/dashboard/order-status-stats", async (req, res) => {
  try {
    const { db } = await import("../db");
    
    if (!db) {
      throw new Error("Database connection not available");
    }
    
    // Get order status statistics
    const statsResult = await db.execute(
      sql`SELECT 
        po.order_status as status,
        COUNT(*) as count,
        COALESCE(SUM(po.total_amount), 0) as totalAmount
      FROM purchase_orders po
      WHERE po.order_status IS NOT NULL
      GROUP BY po.order_status
      ORDER BY po.order_status`
    );

    // Get total count for percentage calculation
    const totalResult = await db.execute(
      sql`SELECT COUNT(*) as total FROM purchase_orders WHERE order_status IS NOT NULL`
    );

    const total = parseInt(totalResult.rows[0]?.total || '0');
    const stats = statsResult.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count || '0'),
      totalAmount: parseFloat(row.totalAmount || '0'),
      percentage: total > 0 ? Math.round((parseInt(row.count || '0') / total) * 100) : 0
    }));

    // Ensure all statuses are represented (with 0 values if missing)
    const allStatuses = ['draft', 'created', 'sent', 'delivered'];
    const completeStats = allStatuses.map(status => {
      const existing = stats.find(s => s.status === status);
      return existing || {
        status,
        count: 0,
        totalAmount: 0,
        percentage: 0
      };
    });

    res.json({
      stats: completeStats,
      total: total
    });

  } catch (error) {
    console.error("❌ Order status stats error:", error);
    res.status(500).json({ 
      message: "Failed to fetch order status statistics",
      error: error.message 
    });
  }
});

export default router;