/**
 * Service Worker for Offline Support
 * 
 * Provides offline functionality for the Purchase Order Management System:
 * - Caches static assets and API responses
 * - Handles offline requests with fallbacks
 * - Manages background sync for pending actions
 */

const CACHE_NAME = 'po-management-v1';
const API_CACHE_NAME = 'po-api-cache-v1';
const OFFLINE_PAGE = '/offline.html';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/auth/me',
  '/api/dashboard/stats',
  '/api/orders',
  '/api/vendors',
  '/api/items',
  '/api/projects',
  '/api/companies',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Cache API responses
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('📦 Preparing API cache');
        return cache;
      })
    ]).then(() => {
      console.log('📦 Service Worker installed successfully');
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('🔄 Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first, cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    // Static assets - cache first, network fallback
    event.respondWith(handleStaticAsset(request));
  } else {
    // HTML pages - network first, cache fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses for GET requests to cacheable endpoints
    if (networkResponse.ok && shouldCacheApi(url.pathname)) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🔄 Network failed, trying cache for:', url.pathname);
    
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('📱 Serving from cache:', url.pathname);
      return cachedResponse;
    }
    
    // Return offline response for critical APIs
    if (isCriticalApi(url.pathname)) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: '현재 오프라인 상태입니다. 연결을 확인해 주세요.',
          offline: true 
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('🔄 Failed to load static asset:', request.url);
    throw error;
  }
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('🔄 Page request failed, checking cache');
    
    // Try cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return cache.match(OFFLINE_PAGE);
  }
}

// Check if API endpoint should be cached
function shouldCacheApi(pathname) {
  return CACHEABLE_APIS.some(api => pathname.startsWith(api));
}

// Check if API is critical for offline functionality
function isCriticalApi(pathname) {
  const criticalApis = [
    '/api/auth/me',
    '/api/orders',
    '/api/vendors',
    '/api/dashboard/stats'
  ];
  return criticalApis.some(api => pathname.startsWith(api));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

// Sync offline actions when back online
async function syncOfflineActions() {
  try {
    console.log('🔄 Syncing offline actions...');
    
    // Get offline actions from IndexedDB
    const offlineActions = await getOfflineActions();
    
    for (const action of offlineActions) {
      try {
        await executeOfflineAction(action);
        await removeOfflineAction(action.id);
        console.log('✅ Synced offline action:', action.type);
      } catch (error) {
        console.error('❌ Failed to sync action:', action.type, error);
      }
    }
    
    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        syncedCount: offlineActions.length
      });
    });
    
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Execute offline action
async function executeOfflineAction(action) {
  const { type, data, endpoint, method } = action;
  
  const response = await fetch(endpoint, {
    method: method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...data.headers
    },
    body: JSON.stringify(data.body),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// IndexedDB operations for offline actions
async function getOfflineActions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineActionsDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['actions'], 'readonly');
      const store = transaction.objectStore('actions');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('actions')) {
        const store = db.createObjectStore('actions', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

async function removeOfflineAction(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineActionsDB', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Message handling from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
      
    case 'CLEAR_CACHE':
      clearCache().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

// Get cache status
async function getCacheStatus() {
  const staticCache = await caches.open(CACHE_NAME);
  const apiCache = await caches.open(API_CACHE_NAME);
  
  const staticKeys = await staticCache.keys();
  const apiKeys = await apiCache.keys();
  
  return {
    staticCacheSize: staticKeys.length,
    apiCacheSize: apiKeys.length,
    totalCacheSize: staticKeys.length + apiKeys.length,
    lastUpdated: new Date().toISOString()
  };
}

// Clear all caches
async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('🗑️ All caches cleared');
}

console.log('📦 Service Worker loaded');