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
      // Get basic statistics
      const [orderStats] = await db
        .select({
          totalOrders: count(),
          totalAmount: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`
        })
        .from(purchaseOrders);

      const [pendingOrderStats] = await db
        .select({
          pendingOrders: count()
        })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.status, 'pending'));

      const [monthlyOrderStats] = await db
        .select({
          monthlyOrders: count()
        })
        .from(purchaseOrders)
        .where(sql`${purchaseOrders.orderDate} >= DATE_TRUNC('month', CURRENT_DATE)`);

      const [projectStats] = await db
        .select({
          activeProjects: count()
        })
        .from(projects)
        .where(eq(projects.isActive, true));

      const [vendorStats] = await db
        .select({
          activeVendors: count()
        })
        .from(vendors)
        .where(eq(vendors.isActive, true));

      // Get recent orders
      const recentOrders = await db
        .select({
          id: purchaseOrders.id,
          orderNumber: purchaseOrders.orderNumber,
          status: purchaseOrders.status,
          totalAmount: purchaseOrders.totalAmount,
          createdAt: purchaseOrders.createdAt,
          vendorName: vendors.vendorName
        })
        .from(purchaseOrders)
        .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(10);

      // Get monthly statistics (last 12 months)
      const monthlyStats = await db
        .select({
          month: sql<string>`TO_CHAR(${purchaseOrders.orderDate}, 'YYYY-MM')`,
          count: count(),
          amount: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`
        })
        .from(purchaseOrders)
        .where(sql`${purchaseOrders.orderDate} >= CURRENT_DATE - INTERVAL '12 months'`)
        .groupBy(sql`TO_CHAR(${purchaseOrders.orderDate}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${purchaseOrders.orderDate}, 'YYYY-MM')`);

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
          totalOrders: orderStats.totalOrders || 0,
          totalAmount: orderStats.totalAmount || 0,
          pendingOrders: pendingOrderStats.pendingOrders || 0,
          monthlyOrders: monthlyOrderStats.monthlyOrders || 0,
          activeProjects: projectStats.activeProjects || 0,
          activeVendors: vendorStats.activeVendors || 0
        },
        recentOrders,
        monthlyStats,
        statusStats,
        projectStats: projectStatsList
      };

      cache.set(cacheKey, result, 600); // 10 minutes cache
      return result;
    } catch (error) {
      console.error('Error fetching unified dashboard data:', error);
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
          name: projects.name,
          code: projects.code,
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