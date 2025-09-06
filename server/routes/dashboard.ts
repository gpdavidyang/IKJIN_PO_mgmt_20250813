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

// TEMPORARY FIX: Add orders-optimized to dashboard routes (working router) - WITH SORTING
router.get("/orders-optimized", async (req, res) => {
  try {
    console.log('🚀 Orders-optimized via dashboard router', {
      query: req.query,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    });
    
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
    
    // Sorting logic
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = (req.query.sortOrder as string || 'desc').toLowerCase();
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Map frontend sort field names to database columns
    const getSortField = (field: string): string => {
      switch (field) {
        case 'orderNumber':
          return 'po.order_number';
        case 'status':
          return 'po.status';
        case 'orderStatus':
          return 'po.order_status';
        case 'approvalStatus':
          return 'po.approval_status';
        case 'vendorName':
          return 'v.name';
        case 'projectName':
          return 'p.project_name';
        case 'orderDate':
          return 'po.order_date';
        case 'totalAmount':
          return 'po.total_amount';
        case 'createdAt':
        default:
          return 'po.created_at';
      }
    };
    
    const sortField = getSortField(sortBy);
    console.log('🔄 Sorting by:', sortField, sortDirection);
    
    // Raw SQL query for orders with dynamic sorting
    const ordersResult = await db.execute(
      sql.raw(`SELECT 
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
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ${limit} OFFSET ${offset}`)
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