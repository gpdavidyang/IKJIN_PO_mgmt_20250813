/**
 * Client-side debug logging utilities with environment-based controls
 */

const isDevelopment = import.meta.env.DEV;
const isDebugEnabled = import.meta.env.VITE_DEBUG_LOGGING === 'true';

export const debugLog = {
  orders: (message: string, data?: any) => {
    if (isDevelopment && isDebugEnabled) {
      console.log(`🔍 [ORDERS] ${message}`, data || '');
    }
  },
  
  performance: (message: string, data?: any) => {
    if (isDevelopment && isDebugEnabled) {
      console.log(`⚡ [PERF] ${message}`, data || '');
    }
  },
  
  query: (message: string, data?: any) => {
    if (isDevelopment && isDebugEnabled) {
      console.log(`📊 [QUERY] ${message}`, data || '');
    }
  },
  
  api: (message: string, data?: any) => {
    if (isDevelopment && isDebugEnabled) {
      console.log(`📡 [API] ${message}`, data || '');
    }
  }
};

export const isDebug = isDevelopment && isDebugEnabled;