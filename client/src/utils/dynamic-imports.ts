/**
 * Dynamic Import Utilities for Code Splitting
 * Provides typed dynamic imports with better error handling and preloading
 */

import { ComponentType, lazy } from 'react';

/**
 * Enhanced lazy loading with retry mechanism and better error handling
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string = 'Component',
  retryCount: number = 3
): ComponentType<any> {
  return lazy(async () => {
    let lastError: Error;
    
    for (let i = 0; i < retryCount; i++) {
      try {
        const module = await importFn();
        
        // Log successful loading in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Successfully loaded ${componentName} (attempt ${i + 1})`);
        }
        
        return module;
      } catch (error) {
        lastError = error as Error;
        
        // Log retry attempts in development
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ Failed to load ${componentName} (attempt ${i + 1}):`, error);
        }
        
        // Wait before retrying (exponential backoff)
        if (i < retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    // If all retries failed, throw the last error
    console.error(`❌ Failed to load ${componentName} after ${retryCount} attempts:`, lastError);
    throw lastError;
  });
}

/**
 * Preload a component for better user experience
 */
export function preloadComponent(importFn: () => Promise<any>, componentName?: string): Promise<any> {
  if (process.env.NODE_ENV === 'development' && componentName) {
    console.log(`🔄 Preloading ${componentName}...`);
  }
  
  return importFn().catch(error => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ Failed to preload ${componentName || 'component'}:`, error);
    }
    return null;
  });
}

/**
 * Dynamic import with network-aware loading
 */
export function createNetworkAwareLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string = 'Component'
): ComponentType<any> {
  return lazy(async () => {
    // Check network conditions if available
    const connection = (navigator as any).connection;
    const isSlowNetwork = connection && (
      connection.effectiveType === 'slow-2g' || 
      connection.effectiveType === '2g' ||
      connection.saveData
    );
    
    if (isSlowNetwork && process.env.NODE_ENV === 'development') {
      console.log(`🐌 Slow network detected, loading ${componentName} with optimizations`);
    }
    
    try {
      const module = await importFn();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📦 Loaded ${componentName}${isSlowNetwork ? ' (slow network)' : ''}`);
      }
      
      return module;
    } catch (error) {
      console.error(`❌ Failed to load ${componentName}:`, error);
      throw error;
    }
  });
}

/**
 * Batch preloader for multiple components
 */
export class ComponentPreloader {
  private preloadQueue: Array<{ name: string; importFn: () => Promise<any> }> = [];
  private preloadedComponents = new Set<string>();
  
  add(name: string, importFn: () => Promise<any>) {
    if (!this.preloadedComponents.has(name)) {
      this.preloadQueue.push({ name, importFn });
    }
  }
  
  async preloadAll(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Preloading ${this.preloadQueue.length} components...`);
    }
    
    const preloadPromises = this.preloadQueue.map(async ({ name, importFn }) => {
      try {
        await importFn();
        this.preloadedComponents.add(name);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Preloaded ${name}`);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ Failed to preload ${name}:`, error);
        }
      }
    });
    
    await Promise.allSettled(preloadPromises);
    this.preloadQueue = [];
  }
  
  async preloadOnIdle(): Promise<void> {
    if ('requestIdleCallback' in window) {
      return new Promise(resolve => {
        requestIdleCallback(() => {
          this.preloadAll().then(resolve);
        });
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      return new Promise(resolve => {
        setTimeout(() => {
          this.preloadAll().then(resolve);
        }, 100);
      });
    }
  }
}

/**
 * Feature-based dynamic imports
 */
export const DynamicFeatures = {
  // Dashboard features
  loadDashboard: () => import('@/pages/dashboard'),
  loadDashboardCharts: () => import('@/components/charts/advanced-chart'),
  loadDashboardWidgets: () => import('@/components/charts/dashboard-widgets'),
  
  // Order management features  
  loadOrderForm: () => import('@/components/order-form'),
  loadOrderList: () => import('@/pages/orders-professional'),
  loadOrderDetail: () => import('@/pages/order-detail'),
  
  // Vendor management features
  loadVendorForm: () => import('@/components/vendor-form'),
  loadVendorList: () => import('@/pages/vendors'),
  loadVendorDetail: () => import('@/pages/vendor-detail'),
  
  // Excel automation features
  loadExcelUpload: () => import('@/components/excel-upload-with-validation'),
  loadExcelWizard: () => import('@/components/excel-automation-wizard'),
  loadExcelPage: () => import('@/pages/create-order-excel'),
  
  // Project management features
  loadProjectList: () => import('@/pages/projects'),
  loadProjectDetail: () => import('@/pages/project-detail'),
  
  // Admin features
  loadAdminPanel: () => import('@/pages/admin'),
  loadUserManagement: () => import('@/pages/user-management'),
  loadTemplateManagement: () => import('@/pages/template-management'),
  
  // Virtualization features
  loadVirtualTable: () => import('@/components/optimized/OptimizedDataTable'),
  loadVirtualList: () => import('@/components/virtualization/VirtualScrollList'),
  loadVirtualOrders: () => import('@/components/virtualization/VirtualOrdersList'),
  
  // Utility features
  loadPerformanceHooks: () => import('@/hooks/use-performance'),
  loadThemeProvider: () => import('@/components/ui/theme-provider'),
  loadAccessibilityFeatures: () => import('@/components/accessibility/accessibility-toolbar'),
};

/**
 * Create a global preloader instance
 */
export const globalPreloader = new ComponentPreloader();

/**
 * Initialize critical component preloading on app start
 */
export function initializeCriticalPreloading() {
  // Add critical components to preload queue
  globalPreloader.add('Dashboard', DynamicFeatures.loadDashboard);
  globalPreloader.add('OrderForm', DynamicFeatures.loadOrderForm);
  globalPreloader.add('VendorForm', DynamicFeatures.loadVendorForm);
  
  // Start preloading when browser is idle
  globalPreloader.preloadOnIdle();
}

/**
 * Route-based preloading
 */
export function preloadRouteComponents(currentRoute: string) {
  const routePreloadMap: Record<string, Array<() => Promise<any>>> = {
    '/dashboard': [
      DynamicFeatures.loadDashboardCharts,
      DynamicFeatures.loadDashboardWidgets
    ],
    '/orders': [
      DynamicFeatures.loadOrderList,
      DynamicFeatures.loadVirtualTable
    ],
    '/vendors': [
      DynamicFeatures.loadVendorList,
      DynamicFeatures.loadVirtualTable
    ],
    '/create-order': [
      DynamicFeatures.loadOrderForm
    ],
    '/admin': [
      DynamicFeatures.loadAdminPanel,
      DynamicFeatures.loadUserManagement
    ],
  };
  
  const preloadFunctions = routePreloadMap[currentRoute];
  if (preloadFunctions) {
    preloadFunctions.forEach((preloadFn, index) => {
      globalPreloader.add(`Route-${currentRoute}-${index}`, preloadFn);
    });
    
    globalPreloader.preloadOnIdle();
  }
}

/**
 * Bundle size analytics
 */
export function logBundleInfo() {
  if (process.env.NODE_ENV === 'development') {
    // Log loaded chunks
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const totalChunks = scripts.filter(script => 
      script.getAttribute('src')?.includes('chunk') || 
      script.getAttribute('src')?.includes('assets')
    ).length;
    
    console.log(`📊 Bundle Info: ${totalChunks} chunks loaded`);
    
    // Log performance timing if available
    if (performance.getEntriesByType) {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        console.log(`⚡ Load Performance:`, {
          'DOM Content Loaded': `${Math.round(navigationEntry.domContentLoadedEventEnd - navigationEntry.fetchStart)}ms`,
          'Load Complete': `${Math.round(navigationEntry.loadEventEnd - navigationEntry.fetchStart)}ms`,
        });
      }
    }
  }
}