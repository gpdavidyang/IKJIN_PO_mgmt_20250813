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

// Monthly comparison data for dashboard
router.get("/dashboard/monthly-comparison", async (req, res) => {
  try {
    const { db } = await import("../db");
    
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Current month stats
    const currentMonthResult = await db.execute(
      sql`SELECT 
        COUNT(*) as orderCount,
        COALESCE(SUM(total_amount), 0) as totalAmount
      FROM purchase_orders 
      WHERE EXTRACT(YEAR FROM created_at) = ${currentYear}
        AND EXTRACT(MONTH FROM created_at) = ${currentMonth}`
    );

    // Last month stats  
    const lastMonthResult = await db.execute(
      sql`SELECT 
        COUNT(*) as orderCount,
        COALESCE(SUM(total_amount), 0) as totalAmount
      FROM purchase_orders 
      WHERE EXTRACT(YEAR FROM created_at) = ${lastMonthYear}
        AND EXTRACT(MONTH FROM created_at) = ${lastMonth}`
    );

    // Daily data for current month (for chart)
    const dailyDataResult = await db.execute(
      sql`SELECT 
        EXTRACT(DAY FROM created_at) as day,
        COUNT(*) as orderCount,
        COALESCE(SUM(total_amount), 0) as totalAmount
      FROM purchase_orders 
      WHERE EXTRACT(YEAR FROM created_at) = ${currentYear}
        AND EXTRACT(MONTH FROM created_at) = ${currentMonth}
      GROUP BY EXTRACT(DAY FROM created_at)
      ORDER BY day`
    );

    const currentMonthData = {
      orderCount: parseInt(currentMonthResult.rows[0]?.orderCount || '0'),
      totalAmount: parseFloat(currentMonthResult.rows[0]?.totalAmount || '0')
    };

    const lastMonthData = {
      orderCount: parseInt(lastMonthResult.rows[0]?.orderCount || '0'),
      totalAmount: parseFloat(lastMonthResult.rows[0]?.totalAmount || '0')
    };

    // Calculate changes
    const orderCountChange = lastMonthData.orderCount > 0 
      ? Math.round(((currentMonthData.orderCount - lastMonthData.orderCount) / lastMonthData.orderCount) * 100)
      : currentMonthData.orderCount > 0 ? 100 : 0;

    const totalAmountChange = lastMonthData.totalAmount > 0
      ? Math.round(((currentMonthData.totalAmount - lastMonthData.totalAmount) / lastMonthData.totalAmount) * 100)
      : currentMonthData.totalAmount > 0 ? 100 : 0;

    // Process daily data for chart
    const dailyData = dailyDataResult.rows.map(row => ({
      day: parseInt(row.day || '0'),
      orderCount: parseInt(row.orderCount || '0'),
      totalAmount: parseFloat(row.totalAmount || '0')
    }));

    // Get month names in Korean
    const monthNames = [
      '1월', '2월', '3월', '4월', '5월', '6월',
      '7월', '8월', '9월', '10월', '11월', '12월'
    ];

    res.json({
      currentMonth: {
        name: monthNames[currentMonth - 1],
        year: currentYear,
        ...currentMonthData
      },
      lastMonth: {
        name: monthNames[lastMonth - 1],
        year: lastMonthYear,
        ...lastMonthData
      },
      changes: {
        orderCount: orderCountChange,
        totalAmount: totalAmountChange
      },
      dailyData
    });

  } catch (error) {
    console.error("❌ Monthly comparison error:", error);
    res.status(500).json({ 
      message: "Failed to fetch monthly comparison data",
      error: error.message 
    });
  }
});

export default router;