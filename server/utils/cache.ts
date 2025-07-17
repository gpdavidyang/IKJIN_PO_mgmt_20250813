/**
 * Memory cache utility for performance optimization
 * Reduces database queries for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get cache entry if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton cache instance
export const cache = new MemoryCache();

// Cache key generators
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  users: () => 'users:all',
  vendor: (id: number) => `vendor:${id}`,
  vendors: () => 'vendors:all',
  item: (id: number) => `item:${id}`,
  items: () => 'items:all',
  project: (id: number) => `project:${id}`,
  projects: () => 'projects:all',
  order: (id: number) => `order:${id}`,
  orders: (filters?: string) => `orders:${filters || 'all'}`,
  dashboardStats: () => 'dashboard:stats',
  itemCategories: () => 'item_categories:all',
  orderTemplates: () => 'order_templates:all',
  uiTerms: (type?: string) => `ui_terms:${type || 'all'}`,
} as const;

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  SHORT: 1 * 60 * 1000,    // 1 minute
  MEDIUM: 5 * 60 * 1000,   // 5 minutes
  LONG: 30 * 60 * 1000,    // 30 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const;

// Start cleanup interval
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000); // Cleanup every 10 minutes