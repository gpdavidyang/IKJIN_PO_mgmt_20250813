/**
 * Network Status Hook
 * 
 * Provides network connectivity status and offline management:
 * - Detects online/offline status
 * - Manages offline data synchronization
 * - Provides network-aware API calls
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage, OfflineAction } from '@/lib/offline-storage';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  lastOnline: Date | null;
  lastOffline: Date | null;
  pendingActions: number;
  syncInProgress: boolean;
}

interface UseNetworkStatusReturn extends NetworkStatus {
  retryConnection: () => Promise<boolean>;
  syncOfflineActions: () => Promise<void>;
  addOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) => Promise<string>;
  clearOfflineActions: () => Promise<void>;
  getNetworkInfo: () => NetworkInformation | null;
}

// Network Information API types (experimental)
interface NetworkInformation {
  type?: string;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  downlinkMax?: number;
  rtt?: number;
  saveData?: boolean;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    connectionType: 'unknown',
    lastOnline: navigator.onLine ? new Date() : null,
    lastOffline: !navigator.onLine ? new Date() : null,
    pendingActions: 0,
    syncInProgress: false,
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get network information
  const getNetworkInfo = useCallback((): NetworkInformation | null => {
    return (
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection ||
      null
    );
  }, []);

  // Update connection type and speed
  const updateConnectionInfo = useCallback(() => {
    const connection = getNetworkInfo();
    if (connection) {
      const isSlowConnection = 
        connection.effectiveType === '2g' || 
        connection.effectiveType === 'slow-2g' ||
        (connection.downlink && connection.downlink < 1);

      setStatus(prev => ({
        ...prev,
        isSlowConnection,
        connectionType: connection.effectiveType || connection.type || 'unknown',
      }));
    }
  }, [getNetworkInfo]);

  // Update pending actions count
  const updatePendingActionsCount = useCallback(async () => {
    try {
      const pendingActions = await offlineStorage.getPendingActions();
      setStatus(prev => ({ ...prev, pendingActions: pendingActions.length }));
    } catch (error) {
      console.error('Failed to get pending actions:', error);
    }
  }, []);

  // Handle online status change
  const handleOnline = useCallback(() => {
    console.log('🌐 Network status: Online');
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      lastOnline: new Date(),
    }));

    updateConnectionInfo();
    
    // Auto-sync when back online (with delay to ensure stable connection)
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      syncOfflineActions();
    }, 2000);
  }, [updateConnectionInfo]);

  // Handle offline status change
  const handleOffline = useCallback(() => {
    console.log('📡 Network status: Offline');
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      lastOffline: new Date(),
    }));

    // Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
  }, []);

  // Retry connection test
  const retryConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Test with a simple HEAD request to avoid CORS issues
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        if (!status.isOnline) {
          handleOnline();
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('Connection test failed:', error);
      return false;
    }
  }, [status.isOnline, handleOnline]);

  // Add offline action
  const addOfflineAction = useCallback(async (
    action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>
  ): Promise<string> => {
    const id = await offlineStorage.addOfflineAction(action);
    await updatePendingActionsCount();
    
    // Register for background sync if supported
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-offline-actions');
        console.log('🔄 Background sync registered');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
    
    return id;
  }, [updatePendingActionsCount]);

  // Sync offline actions
  const syncOfflineActions = useCallback(async (): Promise<void> => {
    if (status.syncInProgress || !status.isOnline) {
      return;
    }

    try {
      setStatus(prev => ({ ...prev, syncInProgress: true }));
      
      const pendingActions = await offlineStorage.getPendingActions();
      console.log(`🔄 Syncing ${pendingActions.length} offline actions...`);

      let syncedCount = 0;
      let failedCount = 0;

      for (const action of pendingActions) {
        try {
          // Execute the offline action
          const response = await fetch(action.endpoint, {
            method: action.method,
            headers: {
              'Content-Type': 'application/json',
              ...action.data.headers,
            },
            body: action.data.body ? JSON.stringify(action.data.body) : undefined,
            credentials: 'include',
          });

          if (response.ok) {
            await offlineStorage.updateActionStatus(action.id, 'synced');
            await offlineStorage.removeAction(action.id);
            syncedCount++;
            console.log('✅ Synced action:', action.type);
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          await offlineStorage.updateActionStatus(
            action.id, 
            action.retryCount >= action.maxRetries ? 'failed' : 'pending',
            error instanceof Error ? error.message : 'Unknown error'
          );
          failedCount++;
          console.error('❌ Failed to sync action:', action.type, error);
        }
      }

      await updatePendingActionsCount();
      
      console.log(`🔄 Sync complete: ${syncedCount} synced, ${failedCount} failed`);
      
      // Show notification if actions were synced
      if (syncedCount > 0) {
        // You can integrate with your notification system here
        console.log(`📱 ${syncedCount}개의 오프라인 작업이 동기화되었습니다.`);
      }

    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setStatus(prev => ({ ...prev, syncInProgress: false }));
    }
  }, [status.syncInProgress, status.isOnline, updatePendingActionsCount]);

  // Clear offline actions
  const clearOfflineActions = useCallback(async (): Promise<void> => {
    await offlineStorage.clear('offlineActions');
    await updatePendingActionsCount();
    console.log('🗑️ Offline actions cleared');
  }, [updatePendingActionsCount]);

  // Periodic connection check when offline
  useEffect(() => {
    if (!status.isOnline) {
      const checkConnection = async () => {
        const isConnected = await retryConnection();
        if (!isConnected && retryTimeoutRef.current) {
          retryTimeoutRef.current = setTimeout(checkConnection, 30000); // Check every 30 seconds
        }
      };

      retryTimeoutRef.current = setTimeout(checkConnection, 10000); // First check after 10 seconds
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [status.isOnline, retryConnection]);

  // Setup event listeners
  useEffect(() => {
    // Online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection change events
    const connection = getNetworkInfo();
    if (connection) {
      connection.addEventListener?.('change', updateConnectionInfo);
    }

    // Service Worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, syncedCount } = event.data;
        
        if (type === 'SYNC_COMPLETE') {
          updatePendingActionsCount();
          if (syncedCount > 0) {
            console.log(`📱 Background sync completed: ${syncedCount} actions synced`);
          }
        }
      });
    }

    // Initial setup
    updateConnectionInfo();
    updatePendingActionsCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      const connection = getNetworkInfo();
      if (connection) {
        connection.removeEventListener?.('change', updateConnectionInfo);
      }

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [handleOnline, handleOffline, updateConnectionInfo, updatePendingActionsCount]);

  return {
    ...status,
    retryConnection,
    syncOfflineActions,
    addOfflineAction,
    clearOfflineActions,
    getNetworkInfo,
  };
}

export default useNetworkStatus;