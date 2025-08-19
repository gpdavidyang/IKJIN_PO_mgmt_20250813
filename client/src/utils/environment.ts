/**
 * Bundle-safe environment detection utilities
 * 
 * Vite's production builds may optimize away process.env checks,
 * so we use multiple detection methods for reliability.
 */

/**
 * Detect if we're running in development environment
 * Uses multiple methods to avoid bundle optimization issues
 */
export function isDevelopmentEnvironment(): boolean {
  // Method 1: Check for development indicators that bundlers won't optimize
  if (typeof window !== 'undefined') {
    // Check hostname patterns
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.includes('local') ||
        hostname.includes('.local') ||
        /:\d+$/.test(window.location.host)) { // Has port number
      return true;
    }
    
    // Check for development-specific globals
    if ((window as any).__VITE_DEV__ || 
        (window as any).module?.hot ||
        (window as any).__DEV__) {
      return true;
    }
    
    // Check URL patterns for development servers
    const url = window.location.href;
    if (url.includes('localhost') || 
        url.includes('127.0.0.1') ||
        url.includes(':3000') ||
        url.includes(':5173') ||
        url.includes(':4173')) {
      return true;
    }
  }
  
  // Method 2: Try process.env (may be optimized away but still try)
  try {
    return process.env.NODE_ENV === 'development';
  } catch {
    // Ignore if process is not defined
  }
  
  // Method 3: Check for development-only modules/features
  try {
    // In development, import.meta.hot should be available
    if (import.meta.hot) {
      return true;
    }
  } catch {
    // Ignore if import.meta is not available
  }
  
  // Default to production for safety
  return false;
}

/**
 * Detect if we're running in production environment
 */
export function isProductionEnvironment(): boolean {
  return !isDevelopmentEnvironment();
}

/**
 * Get current environment string
 */
export function getEnvironment(): 'development' | 'production' {
  return isDevelopmentEnvironment() ? 'development' : 'production';
}

/**
 * Safe console logging that respects environment
 */
export function devLog(message: string, ...args: any[]) {
  if (isDevelopmentEnvironment()) {
    console.log(`[DEV] ${message}`, ...args);
  }
}

export function devWarn(message: string, ...args: any[]) {
  if (isDevelopmentEnvironment()) {
    console.warn(`[DEV] ${message}`, ...args);
  }
}

export function devError(message: string, ...args: any[]) {
  if (isDevelopmentEnvironment()) {
    console.error(`[DEV] ${message}`, ...args);
  }
}