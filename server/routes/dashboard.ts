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

// TEMPORARY FIX: Add orders-optimized to dashboard routes (working router)
router.get("/orders-optimized", async (req, res) => {
  try {
    console.log('🚀 Orders-optimized via dashboard router');
    
    const { db } = await import("../db");
    
    if (!db) {
      throw new Error("Database connection not available");
    }
    
    // Test DB connection
    await db.execute(sql`SELECT 1`);
    console.log('✅ DB verified via dashboard router');
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Raw SQL query for orders (using exact dashboard pattern)
    const ordersResult = await db.execute(
      sql`SELECT 
        po.id,
        po.order_number as "orderNumber",
        po.status,
        po.order_status as "orderStatus",
        po.approval_status as "approvalStatus",
        po.total_amount as "totalAmount",
        po.order_date as "orderDate",
        po.created_at as "createdAt",
        v.name as "vendorName",
        p.project_name as "projectName"
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN projects p ON po.project_id = p.id
      ORDER BY po.created_at DESC
      LIMIT ${limit} OFFSET ${offset}`
    );
    
    const countResult = await db.execute(
      sql`SELECT COUNT(*) as total FROM purchase_orders`
    );
    
    const vendorsResult = await db.execute(
      sql`SELECT id, name FROM vendors ORDER BY name LIMIT 100`
    );
    
    const projectsResult = await db.execute(
      sql`SELECT id, project_name FROM projects ORDER BY project_name LIMIT 100`
    );
    
    const orders = ordersResult.rows || [];
    const total = parseInt(countResult.rows[0]?.total || 0);
    
    const response = {
      orders: orders.map(order => ({
        ...order,
        emailStatus: null,
        lastSentAt: null,
        totalEmailsSent: 0
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      metadata: {
        vendors: vendorsResult.rows || [],
        projects: projectsResult.rows || [],
        users: []
      }
    };
    
    console.log('✅ Success:', orders.length, 'orders returned');
    res.json(response);
    
  } catch (error) {
    console.error("❌ Dashboard orders-optimized error:", error);
    res.status(500).json({ 
      message: "Failed to fetch orders",
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;