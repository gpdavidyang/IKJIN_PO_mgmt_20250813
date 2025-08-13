/**
 * Optimized database queries with caching and performance optimization
 */

import { db } from "../db";
import { 
  purchaseOrders, 
  projects, 
  vendors, 
  items, 
  users,
  companies,
  projectMembers
} from "@shared/schema";
import { eq, desc, count, sql, and, gte, lte, like, or, isNotNull } from "drizzle-orm";
import { cache } from "./cache";

export class OptimizedOrderQueries {
  /**
   * Get orders with comprehensive details and filtering
   */
  static async getOrdersWithDetails(filters: any = {}) {
    const cacheKey = `orders_details_${JSON.stringify(filters)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = db
        .select({
          id: purchaseOrders.id,
          orderNumber: purchaseOrders.orderNumber,
          status: purchaseOrders.status,
          totalAmount: purchaseOrders.totalAmount,
          orderDate: purchaseOrders.orderDate,
          deliveryDate: purchaseOrders.deliveryDate,
          projectName: projects.projectName,
          vendorName: vendors.name,
          userName: users.name,
          approvalLevel: purchaseOrders.approvalLevel,
          currentApproverRole: purchaseOrders.currentApproverRole
        })
        .from(purchaseOrders)
        .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
        .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
        .leftJoin(users, eq(purchaseOrders.userId, users.id))
        .orderBy(desc(purchaseOrders.orderDate));

      const result = await query;
      cache.set(cacheKey, result, 300); // 5 minutes cache
      return result;
    } catch (error) {
      console.error('Error fetching orders with details:', error);
      return [];
    }
  }

  /**
   * Get pending approval orders for specific role
   */
  static async getPendingApprovalOrders(role: string) {
    const cacheKey = `pending_orders_${role}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const result = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.status, 'pending'),
            eq(purchaseOrders.currentApproverRole, role)
          )
        )
        .orderBy(desc(purchaseOrders.orderDate));

      cache.set(cacheKey, result, 120); // 2 minutes cache
      return result;
    } catch (error) {
      console.error('Error fetching pending approval orders:', error);
      return [];
    }
  }

  /**
   * Get order statistics summary
   */
  static async getOrderStatistics() {
    const cacheKey = 'order_statistics';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const [totalOrders] = await db
        .select({ count: count() })
        .from(purchaseOrders);

      const [pendingOrders] = await db
        .select({ count: count() })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.status, 'pending'));

      const [approvedOrders] = await db
        .select({ count: count() })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.status, 'approved'));

      const result = {
        total: totalOrders.count || 0,
        pending: pendingOrders.count || 0,
        approved: approvedOrders.count || 0
      };

      cache.set(cacheKey, result, 300); // 5 minutes cache
      return result;
    } catch (error) {
      console.error('Error fetching order statistics:', error);
      return { total: 0, pending: 0, approved: 0 };
    }
  }
}

export class OptimizedDashboardQueries {
  /**
   * Get unified dashboard data in single optimized query
   */
  static async getUnifiedDashboardData() {
    const cacheKey = 'unified_dashboard_data';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      console.log("🔍 Starting getUnifiedDashboardData query...");
      
      // Get basic statistics using raw SQL for better compatibility
      const orderStatsResult = await db.execute(
        sql`SELECT 
          COUNT(*) as "totalOrders",
          COALESCE(SUM(total_amount), 0) as "totalAmount"
        FROM purchase_orders`
      );
      
      console.log("📊 Order stats query result:", orderStatsResult);
      const orderStats = orderStatsResult.rows[0] || { totalOrders: 0, totalAmount: 0 };

      const pendingOrderResult = await db.execute(
        sql`SELECT COUNT(*) as "pendingOrders" FROM purchase_orders WHERE status = 'pending'`
      );
      const pendingOrderStats = pendingOrderResult.rows[0] || { pendingOrders: 0 };

      const monthlyOrderResult = await db.execute(
        sql`SELECT COUNT(*) as "monthlyOrders" 
            FROM purchase_orders 
            WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)`
      );
      const monthlyOrderStats = monthlyOrderResult.rows[0] || { monthlyOrders: 0 };

      const projectResult = await db.execute(
        sql`SELECT COUNT(*) as "activeProjects" FROM projects WHERE is_active = true`
      );
      const projectStats = projectResult.rows[0] || { activeProjects: 0 };

      const vendorResult = await db.execute(
        sql`SELECT COUNT(*) as "activeVendors" FROM vendors WHERE is_active = true`
      );
      const vendorStats = vendorResult.rows[0] || { activeVendors: 0 };

      // Get recent orders with vendor and project information
      const recentOrdersRaw = await db
        .select({
          id: purchaseOrders.id,
          orderNumber: purchaseOrders.orderNumber,
          status: purchaseOrders.status,
          totalAmount: purchaseOrders.totalAmount,
          createdAt: purchaseOrders.createdAt,
          vendorId: vendors.id,
          vendorName: vendors.name,
          projectId: projects.id,
          projectName: projects.projectName
        })
        .from(purchaseOrders)
        .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
        .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(10);
      

      // Transform to nested structure for backward compatibility
      const recentOrders = recentOrdersRaw.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        vendor: order.vendorId ? {
          id: order.vendorId,
          name: order.vendorName
        } : null,
        project: order.projectId ? {
          id: order.projectId,
          name: order.projectName,
          projectName: order.projectName // Add backward compatibility
        } : null
      }));


      // Get monthly statistics (last 12 months) with proper chronological sorting
      const monthlyStatsRaw = await db
        .select({
          month: sql<string>`TO_CHAR(${purchaseOrders.orderDate}, 'YYYY-MM')`,
          count: count(),
          amount: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`,
          orderDate: sql<Date>`DATE_TRUNC('month', ${purchaseOrders.orderDate})` // For proper sorting
        })
        .from(purchaseOrders)
        .where(sql`${purchaseOrders.orderDate} >= CURRENT_DATE - INTERVAL '12 months'`)
        .groupBy(sql`TO_CHAR(${purchaseOrders.orderDate}, 'YYYY-MM')`, sql`DATE_TRUNC('month', ${purchaseOrders.orderDate})`)
        .orderBy(sql`DATE_TRUNC('month', ${purchaseOrders.orderDate}) ASC`); // Sort by actual date, not string

      // Transform and ensure consistent data format
      const monthlyStats = monthlyStatsRaw.map(item => ({
        month: item.month,
        count: item.count,
        amount: item.amount,
        totalAmount: item.amount // Add alias for compatibility
      }));

      // Get status statistics
      const statusStats = await db
        .select({
          status: purchaseOrders.status,
          count: count(),
          amount: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`
        })
        .from(purchaseOrders)
        .groupBy(purchaseOrders.status)
        .orderBy(desc(count()));

      // Get project statistics (top 10 by order amount)
      const projectStatsList = await db
        .select({
          projectId: projects.id,
          projectName: projects.projectName,
          projectType: projects.projectType,
          orderCount: count(),
          totalAmount: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`
        })
        .from(purchaseOrders)
        .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
        .where(isNotNull(projects.id))
        .groupBy(projects.id, projects.projectName, projects.projectType)
        .orderBy(desc(sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`))
        .limit(10);

      const result = {
        statistics: {
          totalOrders: parseInt(orderStats.totalOrders) || 0,
          totalAmount: Number(orderStats.totalAmount) || 0,
          pendingOrders: parseInt(pendingOrderStats.pendingOrders) || 0,
          monthlyOrders: parseInt(monthlyOrderStats.monthlyOrders) || 0,
          activeProjects: parseInt(projectStats.activeProjects) || 0,
          activeVendors: parseInt(vendorStats.activeVendors) || 0
        },
        recentOrders,
        monthlyStats,
        statusStats,
        projectStats: projectStatsList
      };

      console.log("✅ Dashboard data compiled successfully:", {
        totalOrders: result.statistics.totalOrders,
        activeProjects: result.statistics.activeProjects
      });
      
      cache.set(cacheKey, result, 600); // 10 minutes cache
      return result;
    } catch (error) {
      console.error('❌ Error fetching unified dashboard data:', error);
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Return empty data structure instead of throwing
      return {
        statistics: { 
          totalOrders: 0, 
          totalAmount: 0, 
          pendingOrders: 0,
          monthlyOrders: 0,
          activeProjects: 0, 
          activeVendors: 0 
        },
        recentOrders: [],
        monthlyStats: [],
        statusStats: [],
        projectStats: []
      };
    }
  }

  /**
   * Get order statistics for dashboard
   */
  static async getOrderStatistics() {
    return OptimizedOrderQueries.getOrderStatistics();
  }
}

export class OptimizedProjectQueries {
  /**
   * Get projects with member count
   */
  static async getProjectsWithDetails() {
    const cacheKey = 'projects_with_details';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const result = await db
        .select({
          id: projects.id,
          name: projects.projectName,
          code: projects.projectCode,
          status: projects.status,
          totalBudget: projects.totalBudget,
          startDate: projects.startDate,
          endDate: projects.endDate,
          location: projects.location,
          memberCount: count(projectMembers.id)
        })
        .from(projects)
        .leftJoin(projectMembers, eq(projects.id, projectMembers.projectId))
        .where(eq(projects.isActive, true))
        .groupBy(projects.id)
        .orderBy(desc(projects.startDate));

      cache.set(cacheKey, result, 300); // 5 minutes cache
      return result;
    } catch (error) {
      console.error('Error fetching projects with details:', error);
      return [];
    }
  }
}