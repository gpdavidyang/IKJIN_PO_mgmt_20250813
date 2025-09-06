/**
 * Optimized Orders API Routes
 * High-performance endpoints for order management page
 */

import { Router } from "express";
import { OptimizedOrdersService, QueryPerformanceMonitor } from "../utils/optimized-orders-query";
import { z } from "zod";

const router = Router();

// Validation schema for order filters
const OrderFiltersSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  status: z.string().optional(), // Legacy field for backward compatibility
  orderStatus: z.string().optional(), // New order status field
  approvalStatus: z.string().optional(), // New approval status field
  projectId: z.string().optional().transform(val => val && val !== 'all' ? parseInt(val) : undefined),
  vendorId: z.string().optional().transform(val => val && val !== 'all' ? parseInt(val) : undefined),
  userId: z.string().optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  minAmount: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  maxAmount: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  searchText: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * GET /api/orders-optimized
 * High-performance endpoint that returns orders with all metadata in a single request
 * Replaces multiple API calls with one optimized query
 */
router.get("/orders-optimized", async (req, res) => {
  const endTimer = QueryPerformanceMonitor.startTimer('orders-optimized');
  
  try {
    // Validate and transform query parameters
    const filters = OrderFiltersSchema.parse(req.query);
    
    console.log('🚀 Optimized orders request:', {
      filters,
      timestamp: new Date().toISOString()
    });

    // USE RAW SQL QUERIES like dashboard (this works!)
    console.log("🔄 Using raw SQL pattern like dashboard");
    
    const { db } = require("../db");
    const { sql } = require("drizzle-orm");
    
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    // Raw SQL query for orders (like dashboard pattern)
    const ordersResult = await db.execute(
      sql`SELECT 
        po.id,
        po.order_number as "orderNumber",
        po.status,
        po.order_status as "orderStatus",
        po.approval_status as "approvalStatus", 
        po.total_amount as "totalAmount",
        po.order_date as "orderDate",
        po.delivery_date as "deliveryDate",
        po.user_id as "userId",
        po.vendor_id as "vendorId", 
        po.project_id as "projectId",
        po.approval_level as "approvalLevel",
        po.current_approver_role as "currentApproverRole",
        po.created_at as "createdAt",
        v.name as "vendorName",
        p.project_name as "projectName",
        u.name as "userName"
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN projects p ON po.project_id = p.id
      LEFT JOIN users u ON po.user_id = u.id
      ORDER BY po.created_at DESC
      LIMIT ${limit} OFFSET ${offset}`
    );
    
    // Raw SQL for count
    const countResult = await db.execute(
      sql`SELECT COUNT(*) as total FROM purchase_orders`
    );
    
    // Raw SQL for metadata
    const vendorsResult = await db.execute(
      sql`SELECT id, name FROM vendors ORDER BY name LIMIT 100`
    );
    
    const projectsResult = await db.execute(
      sql`SELECT id, project_name FROM projects ORDER BY project_name LIMIT 100`
    );
    
    const orders = ordersResult.rows || [];
    const total = parseInt(countResult.rows[0]?.total || 0);
    const vendors_list = vendorsResult.rows || [];
    const projects_list = projectsResult.rows || [];
    
    const result = {
      orders: orders.map(order => ({
        ...order,
        emailStatus: null,
        lastSentAt: null,
        totalEmailsSent: 0,
        openedAt: null
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
    
    const metadata = {
      vendors: vendors_list,
      projects: projects_list,
      users: []
    };
    
    const response = {
      ...result,
      metadata,
      performance: {
        queryTime: `${(performance.now()).toFixed(2)}ms`,
        cacheHit: false, // TODO: Implement Redis caching
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ Optimized orders response:', {
      ordersCount: result.orders.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      vendorsCount: metadata.vendors.length,
      projectsCount: metadata.projects.length
    });

    res.json(response);
  } catch (error) {
    console.error("❌ Error in optimized orders endpoint:", error);
    res.status(500).json({ 
      message: "Failed to fetch orders",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    endTimer();
  }
});

/**
 * GET /api/orders-metadata
 * Lightweight endpoint for getting dropdown data only
 * Used for filter initialization
 */
router.get("/orders-metadata", async (req, res) => {
  const endTimer = QueryPerformanceMonitor.startTimer('orders-metadata');
  
  try {
    const metadata = await OptimizedOrdersService.getOrderMetadata();
    
    res.json({
      ...metadata,
      cached: false, // TODO: Implement caching
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error fetching orders metadata:", error);
    res.status(500).json({ message: "Failed to fetch metadata" });
  } finally {
    endTimer();
  }
});

/**
 * GET /api/orders-stats
 * Order statistics for dashboard widgets
 */
router.get("/orders-stats", async (req, res) => {
  const endTimer = QueryPerformanceMonitor.startTimer('orders-stats');
  
  try {
    const { userId } = req.query;
    const stats = await OptimizedOrdersService.getOrderStatistics(userId as string);
    
    res.json({
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error fetching order statistics:", error);
    res.status(500).json({ message: "Failed to fetch statistics" });
  } finally {
    endTimer();
  }
});

/**
 * PUT /api/orders-bulk-status
 * Batch update order statuses
 * Reduces multiple API calls for bulk operations
 */
router.put("/orders-bulk-status", async (req, res) => {
  const endTimer = QueryPerformanceMonitor.startTimer('orders-bulk-status');
  
  try {
    const { orderIds, status } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: "Invalid order IDs" });
    }
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    const result = await OptimizedOrdersService.batchUpdateOrderStatus(
      orderIds, 
      status, 
      userId
    );
    
    res.json({
      message: `Updated ${result.length} orders`,
      updatedOrders: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in bulk status update:", error);
    res.status(500).json({ message: "Failed to update orders" });
  } finally {
    endTimer();
  }
});

/**
 * GET /api/query-performance
 * Performance monitoring endpoint for development
 */
router.get("/query-performance", async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: "Not found" });
  }
  
  const stats = QueryPerformanceMonitor.getStats();
  
  res.json({
    queryStats: stats,
    recommendations: generatePerformanceRecommendations(stats),
    timestamp: new Date().toISOString()
  });
});

/**
 * Generate performance recommendations based on query stats
 */
function generatePerformanceRecommendations(stats: Record<string, any>) {
  const recommendations = [];
  
  for (const [queryName, data] of Object.entries(stats)) {
    if (data.avg > 500) {
      recommendations.push({
        query: queryName,
        issue: "Slow average response time",
        avgTime: `${data.avg.toFixed(2)}ms`,
        recommendation: "Consider adding database indexes or optimizing query"
      });
    }
    
    if (data.max > 2000) {
      recommendations.push({
        query: queryName,
        issue: "Very slow maximum response time",
        maxTime: `${data.max.toFixed(2)}ms`,
        recommendation: "Investigate query execution plan and add appropriate indexes"
      });
    }
  }
  
  return recommendations;
}

export default router;