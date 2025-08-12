/**
 * Image utility functions for the application
 */

export interface ImageConfig {
  quality: number;
  format: 'webp' | 'jpeg' | 'png' | 'auto';
  lazy: boolean;
  priority: boolean;
}

/**
 * Default image configurations for different use cases
 */
export const IMAGE_CONFIGS: Record<string, ImageConfig> = {
  avatar: {
    quality: 85,
    format: 'webp',
    lazy: false,
    priority: true,
  },
  hero: {
    quality: 90,
    format: 'webp',
    lazy: false,
    priority: true,
  },
  gallery: {
    quality: 80,
    format: 'webp',
    lazy: true,
    priority: false,
  },
  thumbnail: {
    quality: 75,
    format: 'webp',
    lazy: true,
    priority: false,
  },
  icon: {
    quality: 95,
    format: 'auto',
    lazy: false,
    priority: true,
  },
  content: {
    quality: 80,
    format: 'webp',
    lazy: true,
    priority: false,
  },
};

/**
 * Default fallback images for different contexts
 */
export const FALLBACK_IMAGES = {
  avatar: '/images/default-avatar.svg',
  company: '/images/default-company-logo.png',
  product: '/images/placeholder.svg',
  document: '/images/document-placeholder.svg',
  error: '/images/error-placeholder.svg',
} as const;

/**
 * Generate responsive image sizes array
 */
export function generateResponsiveSizes(baseWidth: number = 320): number[] {
  const multipliers = [1, 1.5, 2, 2.5, 3];
  return multipliers.map(m => Math.round(baseWidth * m));
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizesAttribute(breakpoints: Array<{ width: string; size: string }>): string {
  return breakpoints
    .map(bp => `(max-width: ${bp.width}) ${bp.size}`)
    .join(', ');
}

/**
 * Get optimized image URL with parameters
 */
export function getOptimizedImageUrl(
  src: string, 
  options: Partial<ImageConfig> & { width?: number; height?: number } = {}
): string {
  try {
    const url = new URL(src, window.location.origin);
    
    if (options.quality && options.quality !== 75) {
      url.searchParams.set('quality', options.quality.toString());
    }
    
    if (options.format && options.format !== 'auto') {
      url.searchParams.set('format', options.format);
    }
    
    if (options.width) {
      url.searchParams.set('w', options.width.toString());
    }
    
    if (options.height) {
      url.searchParams.set('h', options.height.toString());
    }
    
    return url.toString();
  } catch {
    // If URL parsing fails, return original src
    return src;
  }
}

/**
 * Check if image format is supported by browser
 */
export function isSupportedFormat(format: string): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  try {
    return canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0;
  } catch {
    return false;
  }
}

/**
 * Get best supported image format
 */
export function getBestSupportedFormat(): 'avif' | 'webp' | 'jpeg' {
  if (isSupportedFormat('avif')) return 'avif';
  if (isSupportedFormat('webp')) return 'webp';
  return 'jpeg';
}

/**
 * Preload image for better performance
 */
export function preloadImage(src: string, sizes?: string): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  
  if (sizes) {
    link.setAttribute('imagesizes', sizes);
  }
  
  document.head.appendChild(link);
}

/**
 * Create blur data URL for placeholder
 */
export function createBlurDataUrl(width: number = 10, height: number = 10): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Create gradient blur effect
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(0.5, '#e5e7eb');
  gradient.addColorStop(1, '#d1d5db');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/jpeg', 0.1);
}

/**
 * Calculate aspect ratio from dimensions
 */
export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}/${height / divisor}`;
}

/**
 * Common aspect ratios
 */
export const ASPECT_RATIOS = {
  square: '1/1',
  landscape: '16/9',
  portrait: '3/4',
  widescreen: '21/9',
  golden: '1.618/1',
} as const;