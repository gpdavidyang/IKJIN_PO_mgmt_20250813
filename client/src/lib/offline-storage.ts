/**
 * Offline Storage System using IndexedDB
 * 
 * Provides local data storage for offline functionality:
 * - Caches API responses
 * - Stores offline actions for later sync
 * - Manages user data and settings
 */

const DB_NAME = 'POManagementOfflineDB';
const DB_VERSION = 1;

// Object store names
const STORES = {
  ORDERS: 'orders',
  VENDORS: 'vendors',
  ITEMS: 'items',
  PROJECTS: 'projects',
  COMPANIES: 'companies',
  OFFLINE_ACTIONS: 'offlineActions',
  USER_DATA: 'userData',
  CACHE_METADATA: 'cacheMetadata',
} as const;

export interface OfflineAction {
  id: string;
  type: 'CREATE_ORDER' | 'UPDATE_ORDER' | 'DELETE_ORDER' | 'CREATE_VENDOR' | 'UPDATE_VENDOR' | 'DELETE_VENDOR' | 'CUSTOM';
  endpoint: string;
  method: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'failed' | 'synced';
  error?: string;
}

export interface CacheMetadata {
  key: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  size: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('📦 IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.setupObjectStores(db);
      };
    });

    return this.initPromise;
  }

  /**
   * Setup object stores during database upgrade
   */
  private setupObjectStores(db: IDBDatabase): void {
    // Orders store
    if (!db.objectStoreNames.contains(STORES.ORDERS)) {
      const ordersStore = db.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
      ordersStore.createIndex('status', 'status');
      ordersStore.createIndex('createdAt', 'createdAt');
      ordersStore.createIndex('projectId', 'projectId');
    }

    // Vendors store
    if (!db.objectStoreNames.contains(STORES.VENDORS)) {
      const vendorsStore = db.createObjectStore(STORES.VENDORS, { keyPath: 'id' });
      vendorsStore.createIndex('name', 'name');
      vendorsStore.createIndex('isActive', 'isActive');
    }

    // Items store
    if (!db.objectStoreNames.contains(STORES.ITEMS)) {
      const itemsStore = db.createObjectStore(STORES.ITEMS, { keyPath: 'id' });
      itemsStore.createIndex('name', 'name');
      itemsStore.createIndex('category', 'category');
    }

    // Projects store
    if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
      const projectsStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
      projectsStore.createIndex('name', 'name');
      projectsStore.createIndex('status', 'status');
    }

    // Companies store
    if (!db.objectStoreNames.contains(STORES.COMPANIES)) {
      const companiesStore = db.createObjectStore(STORES.COMPANIES, { keyPath: 'id' });
      companiesStore.createIndex('name', 'name');
    }

    // Offline actions store
    if (!db.objectStoreNames.contains(STORES.OFFLINE_ACTIONS)) {
      const actionsStore = db.createObjectStore(STORES.OFFLINE_ACTIONS, { keyPath: 'id' });
      actionsStore.createIndex('type', 'type');
      actionsStore.createIndex('timestamp', 'timestamp');
      actionsStore.createIndex('status', 'status');
    }

    // User data store
    if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
      db.createObjectStore(STORES.USER_DATA, { keyPath: 'key' });
    }

    // Cache metadata store
    if (!db.objectStoreNames.contains(STORES.CACHE_METADATA)) {
      const metadataStore = db.createObjectStore(STORES.CACHE_METADATA, { keyPath: 'key' });
      metadataStore.createIndex('timestamp', 'timestamp');
    }

    console.log('📦 IndexedDB object stores created');
  }

  /**
   * Generic method to store data in a specific store
   */
  async store(storeName: string, data: any): Promise<void> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to retrieve data from a specific store
   */
  async get<T>(storeName: string, key: string): Promise<T | null> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to get all data from a specific store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to delete data from a specific store
   */
  async delete(storeName: string, key: string): Promise<void> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data from a specific store
   */
  async clear(storeName: string): Promise<void> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Specific methods for different data types

  /**
   * Store orders data
   */
  async storeOrders(orders: any[]): Promise<void> {
    const promises = orders.map(order => this.store(STORES.ORDERS, order));
    await Promise.all(promises);
    await this.updateCacheMetadata('orders', orders.length);
  }

  /**
   * Get orders data
   */
  async getOrders(): Promise<any[]> {
    return this.getAll(STORES.ORDERS);
  }

  /**
   * Store vendors data
   */
  async storeVendors(vendors: any[]): Promise<void> {
    const promises = vendors.map(vendor => this.store(STORES.VENDORS, vendor));
    await Promise.all(promises);
    await this.updateCacheMetadata('vendors', vendors.length);
  }

  /**
   * Get vendors data
   */
  async getVendors(): Promise<any[]> {
    return this.getAll(STORES.VENDORS);
  }

  /**
   * Store items data
   */
  async storeItems(items: any[]): Promise<void> {
    const promises = items.map(item => this.store(STORES.ITEMS, item));
    await Promise.all(promises);
    await this.updateCacheMetadata('items', items.length);
  }

  /**
   * Get items data
   */
  async getItems(): Promise<any[]> {
    return this.getAll(STORES.ITEMS);
  }

  /**
   * Store projects data
   */
  async storeProjects(projects: any[]): Promise<void> {
    const promises = projects.map(project => this.store(STORES.PROJECTS, project));
    await Promise.all(promises);
    await this.updateCacheMetadata('projects', projects.length);
  }

  /**
   * Get projects data
   */
  async getProjects(): Promise<any[]> {
    return this.getAll(STORES.PROJECTS);
  }

  /**
   * Store companies data
   */
  async storeCompanies(companies: any[]): Promise<void> {
    const promises = companies.map(company => this.store(STORES.COMPANIES, company));
    await Promise.all(promises);
    await this.updateCacheMetadata('companies', companies.length);
  }

  /**
   * Get companies data
   */
  async getCompanies(): Promise<any[]> {
    return this.getAll(STORES.COMPANIES);
  }

  /**
   * Store offline action for later sync
   */
  async addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const offlineAction: OfflineAction = {
      id,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      ...action,
    };

    await this.store(STORES.OFFLINE_ACTIONS, offlineAction);
    console.log('📦 Offline action stored:', offlineAction.type);
    return id;
  }

  /**
   * Get pending offline actions
   */
  async getPendingActions(): Promise<OfflineAction[]> {
    const allActions = await this.getAll<OfflineAction>(STORES.OFFLINE_ACTIONS);
    return allActions.filter(action => action.status === 'pending');
  }

  /**
   * Update offline action status
   */
  async updateActionStatus(id: string, status: OfflineAction['status'], error?: string): Promise<void> {
    const action = await this.get<OfflineAction>(STORES.OFFLINE_ACTIONS, id);
    if (action) {
      action.status = status;
      action.retryCount += 1;
      if (error) {
        action.error = error;
      }
      await this.store(STORES.OFFLINE_ACTIONS, action);
    }
  }

  /**
   * Remove offline action
   */
  async removeAction(id: string): Promise<void> {
    await this.delete(STORES.OFFLINE_ACTIONS, id);
  }

  /**
   * Store user data
   */
  async storeUserData(key: string, data: any): Promise<void> {
    await this.store(STORES.USER_DATA, { key, data, timestamp: Date.now() });
  }

  /**
   * Get user data
   */
  async getUserData(key: string): Promise<any> {
    const result = await this.get<any>(STORES.USER_DATA, key);
    return result?.data || null;
  }

  /**
   * Update cache metadata
   */
  private async updateCacheMetadata(key: string, size: number): Promise<void> {
    const metadata: CacheMetadata = {
      key,
      timestamp: Date.now(),
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      size,
    };
    await this.store(STORES.CACHE_METADATA, metadata);
  }

  /**
   * Get cache status
   */
  async getCacheStatus(): Promise<{ [key: string]: CacheMetadata }> {
    const allMetadata = await this.getAll<CacheMetadata>(STORES.CACHE_METADATA);
    const status: { [key: string]: CacheMetadata } = {};
    
    allMetadata.forEach(metadata => {
      status[metadata.key] = metadata;
    });
    
    return status;
  }

  /**
   * Clean expired cache data
   */
  async cleanExpiredCache(): Promise<void> {
    const now = Date.now();
    const allMetadata = await this.getAll<CacheMetadata>(STORES.CACHE_METADATA);
    
    for (const metadata of allMetadata) {
      if (now > metadata.timestamp + metadata.ttl) {
        // Clear expired data
        const storeName = this.getStoreNameFromKey(metadata.key);
        if (storeName) {
          await this.clear(storeName);
          await this.delete(STORES.CACHE_METADATA, metadata.key);
          console.log('🗑️ Cleaned expired cache:', metadata.key);
        }
      }
    }
  }

  /**
   * Get store name from cache key
   */
  private getStoreNameFromKey(key: string): string | null {
    const keyMap: { [key: string]: string } = {
      'orders': STORES.ORDERS,
      'vendors': STORES.VENDORS,
      'items': STORES.ITEMS,
      'projects': STORES.PROJECTS,
      'companies': STORES.COMPANIES,
    };
    return keyMap[key] || null;
  }

  /**
   * Get database size information
   */
  async getDatabaseSize(): Promise<{ stores: { [key: string]: number }, total: number }> {
    const stores: { [key: string]: number } = {};
    let total = 0;

    for (const storeName of Object.values(STORES)) {
      const data = await this.getAll(storeName);
      const size = JSON.stringify(data).length;
      stores[storeName] = size;
      total += size;
    }

    return { stores, total };
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    for (const storeName of Object.values(STORES)) {
      await this.clear(storeName);
    }
    console.log('🗑️ All offline data cleared');
  }

  /**
   * Export data for backup
   */
  async exportData(): Promise<{ [key: string]: any[] }> {
    const exportData: { [key: string]: any[] } = {};
    
    for (const storeName of Object.values(STORES)) {
      exportData[storeName] = await this.getAll(storeName);
    }
    
    return exportData;
  }

  /**
   * Import data from backup
   */
  async importData(data: { [key: string]: any[] }): Promise<void> {
    for (const [storeName, items] of Object.entries(data)) {
      if (Object.values(STORES).includes(storeName as any)) {
        await this.clear(storeName);
        const promises = items.map(item => this.store(storeName, item));
        await Promise.all(promises);
      }
    }
    console.log('📦 Data imported successfully');
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();

// Initialize on import
offlineStorage.initialize().catch(console.error);

export default offlineStorage;