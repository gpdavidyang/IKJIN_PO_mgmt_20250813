/**
 * Custom hooks for image lazy loading and optimization
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useIntersectionObserver } from './use-performance';

export interface UseImageLazyLoadingOptions {
  src: string;
  lazy?: boolean;
  threshold?: number;
  rootMargin?: string;
  priority?: boolean;
}

export interface UseImageLazyLoadingReturn {
  shouldLoad: boolean;
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  retry: () => void;
  containerRef: React.RefObject<HTMLElement>;
}

/**
 * Hook for managing image lazy loading with intersection observer
 */
export function useImageLazyLoading({
  src,
  lazy = true,
  threshold = 0.1,
  rootMargin = '50px',
  priority = false,
}: UseImageLazyLoadingOptions): UseImageLazyLoadingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const containerRef = useRef<HTMLElement>(null);
  
  // Use intersection observer for lazy loading
  const isIntersecting = useIntersectionObserver(containerRef, {
    threshold,
    rootMargin,
  });
  
  // Determine if image should load
  const shouldLoad = !lazy || priority || isIntersecting;
  
  // Load image when should load and src changes
  useEffect(() => {
    if (!shouldLoad || !src || isLoaded) return;
    
    setIsLoading(true);
    setHasError(false);
    
    const img = new Image();
    
    const handleLoad = () => {
      setIsLoaded(true);
      setIsLoading(false);
      setHasError(false);
    };
    
    const handleError = () => {
      setIsLoaded(false);
      setIsLoading(false);
      setHasError(true);
    };
    
    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    
    img.src = src;
    
    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [shouldLoad, src, isLoaded, retryCount]);
  
  const retry = useCallback(() => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setIsLoaded(false);
      setHasError(false);
    }
  }, [retryCount]);
  
  return {
    shouldLoad,
    isLoading,
    isLoaded,
    hasError,
    retry,
    containerRef,
  };
}

export interface UseImagePreloadOptions {
  src: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * Hook for preloading images
 */
export function useImagePreload({ src, sizes, priority = false }: UseImagePreloadOptions) {
  useEffect(() => {
    if (!src || !priority) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    
    if (sizes) {
      link.setAttribute('imagesizes', sizes);
    }
    
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, [src, sizes, priority]);
}

export interface UseResponsiveImageOptions {
  src: string;
  breakpoints?: number[];
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
}

/**
 * Hook for generating responsive image sources
 */
export function useResponsiveImage({
  src,
  breakpoints = [640, 768, 1024, 1280, 1536],
  quality = 80,
  format = 'webp',
}: UseResponsiveImageOptions) {
  const srcSet = breakpoints
    .map(width => {
      const url = new URL(src, window.location.origin);
      url.searchParams.set('w', width.toString());
      if (quality !== 80) url.searchParams.set('quality', quality.toString());
      if (format !== 'auto') url.searchParams.set('format', format);
      return `${url.toString()} ${width}w`;
    })
    .join(', ');
    
  const sizes = breakpoints
    .map((width, index) => {
      if (index === breakpoints.length - 1) {
        return `${width}px`;
      }
      return `(max-width: ${width}px) ${width}px`;
    })
    .join(', ');
    
  return { srcSet, sizes };
}

export interface UseImageOptimizationOptions {
  src: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
}

/**
 * Hook for getting optimized image URLs
 */
export function useImageOptimization({
  src,
  width,
  height,
  quality = 80,
  format = 'auto',
}: UseImageOptimizationOptions) {
  const optimizedSrc = (() => {
    try {
      const url = new URL(src, window.location.origin);
      
      if (width) url.searchParams.set('w', width.toString());
      if (height) url.searchParams.set('h', height.toString());
      if (quality !== 80) url.searchParams.set('quality', quality.toString());
      if (format !== 'auto') url.searchParams.set('format', format);
      
      return url.toString();
    } catch {
      return src;
    }
  })();
  
  return optimizedSrc;
}