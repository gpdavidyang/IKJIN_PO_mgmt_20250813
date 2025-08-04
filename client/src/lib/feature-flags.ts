// Feature flags for environment separation
export const FEATURE_FLAGS = {
  // Excel upload feature (for development environment)
  EXCEL_UPLOAD: import.meta.env.VITE_ENABLE_EXCEL_UPLOAD === 'true' || false,
  
  // Future features (disabled by default)
  HANDSONTABLE: import.meta.env.VITE_ENABLE_HANDSONTABLE === 'true' || false,
  APPROVAL_WORKFLOW: import.meta.env.VITE_ENABLE_APPROVAL === 'true' || false,
  ADVANCED_PERMISSIONS: import.meta.env.VITE_ENABLE_PERMISSIONS === 'true' || false,
} as const;

// Environment detection
export const IS_PRODUCTION_ENV = import.meta.env.VITE_ENVIRONMENT === 'production';
export const IS_DEVELOPMENT_ENV = import.meta.env.VITE_ENVIRONMENT === 'development';

// Helper function to check if feature is enabled
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

// Environment-specific configuration
export const ENV_CONFIG = {
  // Production: Stable features only for QA team
  production: {
    EXCEL_UPLOAD: false,
    HANDSONTABLE: false,
    APPROVAL_WORKFLOW: false,
    ADVANCED_PERMISSIONS: false,
  },
  
  // Development: All features enabled for development team
  development: {
    EXCEL_UPLOAD: true,
    HANDSONTABLE: true,
    APPROVAL_WORKFLOW: true,
    ADVANCED_PERMISSIONS: true,
  },
  
  // Default: Conservative approach
  default: {
    EXCEL_UPLOAD: false,
    HANDSONTABLE: false,
    APPROVAL_WORKFLOW: false,
    ADVANCED_PERMISSIONS: false,
  },
} as const;

// Get environment-specific feature flags
export function getEnvironmentFeatures() {
  const env = import.meta.env.VITE_ENVIRONMENT as keyof typeof ENV_CONFIG;
  return ENV_CONFIG[env] || ENV_CONFIG.default;
}

// Environment badge helper
export function getEnvironmentBadge() {
  if (IS_DEVELOPMENT_ENV) {
    return { text: 'DEV', color: 'bg-blue-500' };
  }
  if (IS_PRODUCTION_ENV) {
    return { text: 'PROD', color: 'bg-green-500' };
  }
  return { text: 'UNKNOWN', color: 'bg-gray-500' };
}

// Development detection
export const isDevelopment = IS_DEVELOPMENT_ENV;

// Debug info helper
export function getDebugInfo() {
  return {
    environment: import.meta.env.VITE_ENVIRONMENT || 'unknown',
    features: FEATURE_FLAGS,
    timestamp: new Date().toISOString()
  };
}