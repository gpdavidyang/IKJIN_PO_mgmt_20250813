/**
 * Environment detection utilities that work reliably in all build scenarios
 */

/**
 * Determines if we're running in development mode using multiple fallback methods
 * This is more reliable than process.env checks which may be optimized away by bundlers
 */
export function isDevelopment(): boolean {
  // Method 1: Check for Vite dev server indicators
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return true;
  }

  // Method 2: Check for common development ports
  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1):(3000|5173|8080|4000)/.test(window.location.host)) {
    return true;
  }

  // Method 3: Check for development-specific globals
  if (typeof window !== 'undefined' && '__VITE_DEV__' in window) {
    return true;
  }

  // Method 4: Check for HMR indicators
  if (typeof module !== 'undefined' && module.hot) {
    return true;
  }

  // Method 5: Check process.env as fallback (may be optimized away)
  try {
    return process.env?.NODE_ENV === 'development';
  } catch {
    return false;
  }
}

/**
 * Determines if we're running in production mode
 */
export function isProduction(): boolean {
  return !isDevelopment();
}

/**
 * Get environment name with fallback detection
 */
export function getEnvironment(): 'development' | 'production' {
  return isDevelopment() ? 'development' : 'production';
}

/**
 * Check if we're running in a serverless environment (Vercel, Netlify, etc.)
 */
export function isServerless(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.location.hostname.includes('vercel.app') ||
         window.location.hostname.includes('netlify.app') ||
         window.location.hostname.includes('heroku.com') ||
         window.location.hostname.includes('railway.app');
}