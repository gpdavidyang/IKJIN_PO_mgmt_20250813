/**
 * Service Worker Registration and Management
 * 
 * Handles Service Worker lifecycle and provides offline functionality:
 * - Registers and updates Service Worker
 * - Manages installation and activation
 * - Provides update notifications
 * - Handles SW communication
 */

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  isOfflineReady: boolean;
  registration: ServiceWorkerRegistration | null;
}

type ServiceWorkerCallback = (state: ServiceWorkerState) => void;

class ServiceWorkerManager {
  private state: ServiceWorkerState = {
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isUpdateAvailable: false,
    isOfflineReady: false,
    registration: null,
  };

  private callbacks: Set<ServiceWorkerCallback> = new Set();

  /**
   * Register Service Worker
   */
  async register(): Promise<boolean> {
    if (!this.state.isSupported) {
      console.warn('Service Worker is not supported in this browser');
      return false;
    }

    try {
      console.log('📦 Registering Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.state.registration = registration;
      this.state.isRegistered = true;

      console.log('📦 Service Worker registered successfully:', registration.scope);

      // Handle installation
      if (registration.installing) {
        console.log('📦 Service Worker installing...');
        this.trackInstalling(registration.installing);
      } else if (registration.waiting) {
        console.log('📦 Service Worker waiting...');
        this.state.isUpdateAvailable = true;
      } else if (registration.active) {
        console.log('📦 Service Worker active');
        this.state.isOfflineReady = true;
      }

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('📦 Service Worker update found');
        const newWorker = registration.installing;
        if (newWorker) {
          this.trackInstalling(newWorker);
        }
      });

      // Listen for controller change (new SW took control)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('📦 Service Worker controller changed');
        window.location.reload();
      });

      // Check for waiting SW immediately
      if (registration.waiting) {
        this.state.isUpdateAvailable = true;
      }

      this.notifyCallbacks();
      return true;

    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Track installing Service Worker
   */
  private trackInstalling(worker: ServiceWorker): void {
    worker.addEventListener('statechange', () => {
      console.log('📦 Service Worker state changed:', worker.state);
      
      switch (worker.state) {
        case 'installed':
          if (navigator.serviceWorker.controller) {
            // Update available
            console.log('📦 Service Worker update available');
            this.state.isUpdateAvailable = true;
          } else {
            // First install
            console.log('📦 Service Worker offline ready');
            this.state.isOfflineReady = true;
          }
          break;
          
        case 'activated':
          console.log('📦 Service Worker activated');
          this.state.isOfflineReady = true;
          break;
          
        case 'redundant':
          console.log('📦 Service Worker redundant');
          break;
      }
      
      this.notifyCallbacks();
    });
  }

  /**
   * Update Service Worker
   */
  async update(): Promise<boolean> {
    if (!this.state.registration) {
      return false;
    }

    try {
      await this.state.registration.update();
      console.log('📦 Service Worker update triggered');
      return true;
    } catch (error) {
      console.error('Service Worker update failed:', error);
      return false;
    }
  }

  /**
   * Skip waiting and activate new Service Worker
   */
  async skipWaiting(): Promise<void> {
    if (!this.state.registration?.waiting) {
      return;
    }

    this.state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    this.state.isUpdateAvailable = false;
    this.notifyCallbacks();
  }

  /**
   * Unregister Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.state.registration) {
      return false;
    }

    try {
      const result = await this.state.registration.unregister();
      console.log('📦 Service Worker unregistered:', result);
      
      this.state.isRegistered = false;
      this.state.isOfflineReady = false;
      this.state.isUpdateAvailable = false;
      this.state.registration = null;
      
      this.notifyCallbacks();
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  /**
   * Get cache status from Service Worker
   */
  async getCacheStatus(): Promise<any> {
    if (!navigator.serviceWorker.controller) {
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );
      
      // Timeout after 5 seconds
      setTimeout(() => resolve(null), 5000);
    });
  }

  /**
   * Clear cache via Service Worker
   */
  async clearCache(): Promise<boolean> {
    if (!navigator.serviceWorker.controller) {
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
      
      // Timeout after 10 seconds
      setTimeout(() => resolve(false), 10000);
    });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: ServiceWorkerCallback): () => void {
    this.callbacks.add(callback);
    
    // Call immediately with current state
    callback(this.state);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Get current state
   */
  getState(): ServiceWorkerState {
    return { ...this.state };
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('Service Worker callback error:', error);
      }
    });
  }

  /**
   * Check if offline functionality is ready
   */
  isOfflineReady(): boolean {
    return this.state.isOfflineReady;
  }

  /**
   * Check if update is available
   */
  isUpdateAvailable(): boolean {
    return this.state.isUpdateAvailable;
  }

  /**
   * Send message to Service Worker
   */
  async sendMessage(message: any): Promise<any> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No Service Worker controller available');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
      
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Message timeout')), 10000);
    });
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Auto-register on import (in production)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  serviceWorkerManager.register().catch(console.error);
}

export default serviceWorkerManager;