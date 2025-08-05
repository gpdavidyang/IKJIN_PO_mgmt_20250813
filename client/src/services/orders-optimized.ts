/**
 * Optimized Orders Service
 * API client for high-performance order management endpoints
 */

import { apiRequest } from "@/lib/queryClient";
import type { OptimizedOrderFilters, OptimizedOrdersResponse } from "@/hooks/use-optimized-orders";

export class OrdersService {
  /**
   * Get orders with all metadata in a single optimized request
   */
  static async getOptimizedOrders(params: OptimizedOrderFilters = {}): Promise<OptimizedOrdersResponse> {
    const queryParams = new URLSearchParams();
    
    // Add non-empty filters to params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 'all' && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const url = `/api/orders-optimized${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiRequest<OptimizedOrdersResponse>("GET", url);
  }

  /**
   * Get metadata only (vendors, projects, users) for filter dropdowns
   */
  static async getOrdersMetadata() {
    return apiRequest("GET", "/api/orders-metadata");
  }

  /**
   * Get order statistics for dashboard
   */
  static async getOrderStatistics(userId?: string) {
    const params = userId ? `?userId=${userId}` : '';
    return apiRequest("GET", `/api/orders-stats${params}`);
  }

  /**
   * Bulk update order statuses
   */
  static async bulkUpdateStatus(orderIds: number[], status: string) {
    return apiRequest("PUT", "/api/orders-bulk-status", {
      orderIds,
      status
    });
  }

  /**
   * Get query performance metrics (development only)
   */
  static async getPerformanceMetrics() {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Performance metrics only available in development');
    }
    return apiRequest("GET", "/api/query-performance");
  }
}