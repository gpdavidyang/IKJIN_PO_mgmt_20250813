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

    // Single optimized query for orders with email status
    const result = await OptimizedOrdersService.getOrdersWithEmailStatus(filters);
    
    // Get metadata for dropdowns (cached)
    const metadata = await OptimizedOrdersService.getOrderMetadata();
    
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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