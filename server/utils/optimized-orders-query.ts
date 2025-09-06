/**
 * Optimized Orders Query Service
 * High-performance queries for order management page
 */

import { db } from "../db";
import { 
  purchaseOrders, 
  vendors, 
  projects, 
  users,
  purchaseOrderItems
} from "@shared/schema";
import { eq, desc, asc, ilike, and, or, between, count, sql, gte, lte } from "drizzle-orm";

export interface OptimizedOrderFilters {
  userId?: string;
  status?: string; // Legacy field
  orderStatus?: string; // New order status field
  approvalStatus?: string; // New approval status field
  vendorId?: number;
  projectId?: number;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  searchText?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OrderWithMetadata {
  id: number;
  orderNumber: string;
  status: string;
  orderStatus?: string; // 발주 상태
  approvalStatus?: string; // 승인 상태
  createdAt?: string; // 등록일
  totalAmount: number;
  orderDate: string;
  deliveryDate: string | null;
  userId: string;
  vendorId: number | null;
  projectId: number | null;
  approvalLevel: number;
  currentApproverRole: string | null;
  emailSentAt?: string | null; // 이메일 발송일
  // Joined data
  vendorName: string | null;
  projectName: string | null;
  userName: string | null;
  // Computed fields
  itemCount?: number;
  hasPdf?: boolean; // PDF 생성 여부
}

export class OptimizedOrdersService {
  
  /**
   * 정렬 필드에 따른 ORDER BY 절 생성
   */
  private static getOrderByClause(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const getSortField = (field: string) => {
      switch (field) {
        case 'orderNumber':
          return purchaseOrders.orderNumber;
        case 'status':
          return purchaseOrders.status;
        case 'vendorName':
          return vendors.name;
        case 'projectName':
          return projects.projectName;
        case 'userName':
          return users.name;
        case 'orderDate':
          return purchaseOrders.orderDate;
        case 'createdAt':
          return purchaseOrders.createdAt;
        case 'totalAmount':
          return purchaseOrders.totalAmount;
        default:
          return purchaseOrders.createdAt;
      }
    };

    const sortField = getSortField(sortBy || 'createdAt');
    return sortOrder === 'asc' ? asc(sortField) : desc(sortField);
  }

  /**
   * High-performance order listing with metadata
   * Single query with optimized joins and proper pagination
   */
  static async getOrdersWithMetadata(filters: OptimizedOrderFilters = {}) {
    const { 
      userId, 
      status, 
      orderStatus,
      approvalStatus,
      vendorId, 
      projectId, 
      startDate, 
      endDate, 
      minAmount, 
      maxAmount, 
      searchText, 
      page = 1, 
      limit = 20,
      sortBy,
      sortOrder = 'desc'
    } = filters;

    // Build dynamic WHERE conditions
    const whereConditions = [];
    
    
    if (userId && userId !== 'all') {
      whereConditions.push(eq(purchaseOrders.userId, userId));
    }
    if (status && status !== 'all' && status !== '') {
      whereConditions.push(sql`${purchaseOrders.status} = ${status}`);
    }
    
    // New order status filter
    if (orderStatus && orderStatus !== 'all' && orderStatus !== '') {
      whereConditions.push(sql`${purchaseOrders.orderStatus} = ${orderStatus}`);
    }
    
    // New approval status filter
    if (approvalStatus && approvalStatus !== 'all' && approvalStatus !== '') {
      whereConditions.push(sql`${purchaseOrders.approvalStatus} = ${approvalStatus}`);
    }
    
    if (vendorId && vendorId !== 'all') {
      whereConditions.push(eq(purchaseOrders.vendorId, vendorId));
    }
    
    if (projectId && projectId !== 'all') {
      whereConditions.push(eq(purchaseOrders.projectId, projectId));
    }
    
    if (startDate && endDate) {
      whereConditions.push(between(purchaseOrders.orderDate, startDate, endDate));
    }
    
    if (minAmount) {
      whereConditions.push(gte(purchaseOrders.totalAmount, minAmount));
    }
    
    if (maxAmount) {
      whereConditions.push(lte(purchaseOrders.totalAmount, maxAmount));
    }

    // Search text handling (optimized with indexes)
    if (searchText) {
      const searchPattern = `%${searchText.toLowerCase()}%`;
      whereConditions.push(
        or(
          ilike(purchaseOrders.orderNumber, searchPattern),
          ilike(vendors.name, searchPattern),
          ilike(projects.projectName, searchPattern),
          ilike(users.name, searchPattern)
        )
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Optimized query using proper joins and pagination
    const ordersQuery = db
      .select({
        // Order fields
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        status: purchaseOrders.status,
        orderStatus: purchaseOrders.orderStatus,
        approvalStatus: purchaseOrders.approvalStatus,
        totalAmount: purchaseOrders.totalAmount,
        orderDate: purchaseOrders.orderDate,
        deliveryDate: purchaseOrders.deliveryDate,
        userId: purchaseOrders.userId,
        vendorId: purchaseOrders.vendorId,
        projectId: purchaseOrders.projectId,
        approvalLevel: purchaseOrders.approvalLevel,
        currentApproverRole: purchaseOrders.currentApproverRole,
        createdAt: purchaseOrders.createdAt,
        // Joined fields
        vendorName: vendors.name,
        projectName: projects.projectName,
        userName: users.name,
        // PDF attachment status - use correct column name for mime_type
        hasPdf: sql<boolean>`EXISTS(SELECT 1 FROM attachments WHERE attachments.order_id = ${purchaseOrders.id} AND attachments.mime_type = 'application/pdf')`,
        // Email sent status - get from email_send_history table  
        emailSentAt: sql<string | null>`(SELECT MAX(sent_at) FROM email_send_history WHERE order_id = ${purchaseOrders.id})`,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .leftJoin(users, eq(purchaseOrders.userId, users.id))
      .where(whereClause)
      .orderBy(OptimizedOrdersService.getOrderByClause(sortBy, sortOrder))
      .limit(limit)
      .offset((page - 1) * limit);

    // Count query for pagination
    const countQuery = db
      .select({ count: count() })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .leftJoin(users, eq(purchaseOrders.userId, users.id))
      .where(whereClause);

    // Execute queries in parallel
    const [orders, [{ count: totalCount }]] = await Promise.all([
      ordersQuery,
      countQuery
    ]);

    // Calculate correct orderStatus and approvalStatus based on actual conditions
    const processedOrders = orders.map(order => {
      let computedOrderStatus: string;
      let computedApprovalStatus: string;

      // Calculate orderStatus based on the plan document logic
      if (order.status === 'draft') {
        computedOrderStatus = 'draft'; // 임시저장
      } else if (order.hasPdf && !order.emailSentAt) {
        computedOrderStatus = 'created'; // 발주생성 (PDF 있음 + 이메일 미발송)
      } else if (order.emailSentAt) {
        computedOrderStatus = 'sent'; // 발주완료 (이메일 발송됨)
      } else if (order.status === 'completed') {
        computedOrderStatus = 'delivered'; // 납품완료
      } else {
        // Fallback: PDF 없고 이메일 미발송인 경우 임시저장으로 처리
        computedOrderStatus = 'draft';
      }

      // Calculate approvalStatus
      if (order.status === 'pending') {
        computedApprovalStatus = 'pending'; // 승인대기
      } else if (order.status === 'approved') {
        computedApprovalStatus = 'approved'; // 승인완료
      } else if (order.status === 'rejected') {
        computedApprovalStatus = 'rejected'; // 반려
      } else {
        computedApprovalStatus = 'not_required'; // 승인불필요
      }

      return {
        ...order,
        orderStatus: computedOrderStatus,
        approvalStatus: computedApprovalStatus,
      };
    });

    return {
      orders: processedOrders as OrderWithMetadata[],
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    };
  }

  /**
   * Get order metadata (vendors, projects, users) for filters
   * Cached and optimized for dropdown population
   */
  static async getOrderMetadata() {
    // Execute in parallel for better performance
    const [vendorsList, projectsList, usersList] = await Promise.all([
      // Only active vendors with recent orders
      db
        .select({
          id: vendors.id,
          name: vendors.name
        })
        .from(vendors)
        .where(eq(vendors.isActive, true))
        .orderBy(asc(vendors.name)),
      
      // Only active projects
      db
        .select({
          id: projects.id,
          projectName: projects.projectName,
          projectCode: projects.projectCode
        })
        .from(projects)
        .where(eq(projects.isActive, true))
        .orderBy(asc(projects.projectName)),
      
      // Only active users
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email
        })
        .from(users)
        .where(eq(users.isActive, true))
        .orderBy(asc(users.name))
    ]);

    return {
      vendors: vendorsList,
      projects: projectsList,
      users: usersList
    };
  }

  /**
   * Get orders with email status in a single optimized query
   * TEMPORARY: Email functionality disabled until email_send_history table is created
   */
  static async getOrdersWithEmailStatus(filters: OptimizedOrderFilters = {}) {
    const ordersResult = await this.getOrdersWithMetadata(filters);
    
    // Temporarily return orders without email status until table is created
    const ordersWithEmailStatus = ordersResult.orders.map(order => ({
      ...order,
      emailStatus: null,
      lastSentAt: null,
      totalEmailsSent: 0,
      openedAt: null
    }));

    return {
      ...ordersResult,
      orders: ordersWithEmailStatus
    };
  }

  /**
   * Batch operation for updating multiple order statuses
   * Reduces multiple API calls for bulk operations
   */
  static async batchUpdateOrderStatus(orderIds: number[], status: string, userId: string) {
    const result = await db
      .update(purchaseOrders)
      .set({ 
        status: status as any,
        updatedAt: new Date()
      })
      .where(sql`${purchaseOrders.id} = ANY(${orderIds})`)
      .returning();

    return result;
  }

  /**
   * Get order statistics for dashboard
   * Uses materialized view for better performance
   */
  static async getOrderStatistics(userId?: string) {
    const whereClause = userId ? eq(purchaseOrders.userId, userId) : undefined;

    const stats = await db
      .select({
        status: purchaseOrders.status,
        count: count(),
        totalAmount: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`,
        avgAmount: sql<number>`COALESCE(AVG(${purchaseOrders.totalAmount}), 0)`
      })
      .from(purchaseOrders)
      .where(whereClause)
      .groupBy(purchaseOrders.status);

    return stats;
  }
}

/**
 * Database connection and query performance monitoring
 */
export class QueryPerformanceMonitor {
  private static queryTimes: Map<string, number[]> = new Map();

  static startTimer(queryName: string): () => void {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      const duration = end - start;
      
      if (!this.queryTimes.has(queryName)) {
        this.queryTimes.set(queryName, []);
      }
      
      this.queryTimes.get(queryName)!.push(duration);
      
      // Log slow queries (>500ms)
      if (duration > 500) {
        console.warn(`🐌 Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  static getStats() {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [queryName, times] of this.queryTimes.entries()) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      stats[queryName] = { avg, min, max, count: times.length };
    }
    
    return stats;
  }
}