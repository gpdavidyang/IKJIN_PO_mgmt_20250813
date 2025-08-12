/**
 * Image Optimization Service
 * Handles client-side image processing, compression, and optimization
 */

interface ImageOptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maintainAspectRatio?: boolean;
}

interface OptimizationResult {
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  dimensions: { width: number; height: number };
}

class ImageOptimizationService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Optimize an image file
   */
  async optimizeImage(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizationResult> {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'jpeg',
      maintainAspectRatio = true,
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            maxWidth,
            maxHeight,
            maintainAspectRatio
          );

          // Set canvas dimensions
          this.canvas.width = width;
          this.canvas.height = height;

          // Clear canvas and draw image
          this.ctx.clearRect(0, 0, width, height);
          this.ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          this.canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to create optimized image blob'));
              return;
            }

            const reader = new FileReader();
            reader.onload = () => {
              const compressionRatio = ((file.size - blob.size) / file.size) * 100;
              
              resolve({
                blob,
                dataUrl: reader.result as string,
                originalSize: file.size,
                optimizedSize: blob.size,
                compressionRatio: Math.max(0, compressionRatio),
                dimensions: { width, height },
              });
            };
            reader.readAsDataURL(blob);
          }, `image/${format}`, quality);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for optimization'));
      };

      // Load image
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Create thumbnail from image
   */
  async createThumbnail(
    file: File,
    size: number = 150,
    quality: number = 0.7
  ): Promise<OptimizationResult> {
    return this.optimizeImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality,
      format: 'jpeg',
      maintainAspectRatio: true,
    });
  }

  /**
   * Create multiple sizes of an image
   */
  async createResponsiveImages(
    file: File,
    sizes: number[] = [320, 640, 768, 1024, 1280],
    quality: number = 0.8
  ): Promise<{ [key: string]: OptimizationResult }> {
    const results: { [key: string]: OptimizationResult } = {};
    
    for (const size of sizes) {
      try {
        const optimized = await this.optimizeImage(file, {
          maxWidth: size,
          quality,
          format: 'jpeg',
        });
        results[`${size}w`] = optimized;
      } catch (error) {
        console.warn(`Failed to create ${size}w version:`, error);
      }
    }
    
    return results;
  }

  /**
   * Compress image while maintaining visual quality
   */
  async smartCompress(
    file: File,
    targetSizeKB?: number
  ): Promise<OptimizationResult> {
    let quality = 0.9;
    let result: OptimizationResult;
    
    do {
      result = await this.optimizeImage(file, {
        quality,
        format: file.type.includes('png') ? 'png' : 'jpeg',
      });
      
      quality -= 0.1;
    } while (
      targetSizeKB && 
      result.optimizedSize > targetSizeKB * 1024 && 
      quality > 0.1
    );
    
    return result;
  }

  /**
   * Calculate optimal dimensions while maintaining aspect ratio
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    maintainAspectRatio: boolean
  ): { width: number; height: number } {
    if (!maintainAspectRatio) {
      return {
        width: Math.min(originalWidth, maxWidth),
        height: Math.min(originalHeight, maxHeight),
      };
    }

    const aspectRatio = originalWidth / originalHeight;
    
    let width = Math.min(originalWidth, maxWidth);
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  /**
   * Check if image needs optimization
   */
  shouldOptimize(file: File, maxSize: number = 1024 * 1024): boolean {
    return file.size > maxSize || 
           !['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(file: File): Promise<{
    width: number;
    height: number;
    aspectRatio: number;
    format: string;
    size: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          format: file.type,
          size: file.size,
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image metadata'));
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
}

// Create singleton instance
export const imageOptimizationService = new ImageOptimizationService();

/**
 * Helper functions for common image operations
 */

export async function optimizeImageFile(
  file: File,
  options?: ImageOptimizationOptions
): Promise<OptimizationResult> {
  return imageOptimizationService.optimizeImage(file, options);
}

export async function createImageThumbnail(
  file: File,
  size?: number
): Promise<OptimizationResult> {
  return imageOptimizationService.createThumbnail(file, size);
}

export async function createResponsiveImageSet(
  file: File,
  sizes?: number[]
): Promise<{ [key: string]: OptimizationResult }> {
  return imageOptimizationService.createResponsiveImages(file, sizes);
}

export async function compressImageSmart(
  file: File,
  targetSizeKB?: number
): Promise<OptimizationResult> {
  return imageOptimizationService.smartCompress(file, targetSizeKB);
}

export function shouldOptimizeImage(file: File): boolean {
  return imageOptimizationService.shouldOptimize(file);
}

export async function getImageInfo(file: File) {
  return imageOptimizationService.getImageMetadata(file);
}

/**
 * React hook for image optimization
 */
import { useState, useCallback } from 'react';

interface UseImageOptimizationReturn {
  optimizeImage: (file: File, options?: ImageOptimizationOptions) => Promise<OptimizationResult>;
  isOptimizing: boolean;
  progress: number;
  error: string | null;
  reset: () => void;
}

export function useImageOptimization(): UseImageOptimizationReturn {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const optimizeImage = useCallback(async (
    file: File, 
    options?: ImageOptimizationOptions
  ): Promise<OptimizationResult> => {
    setIsOptimizing(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(25);
      
      const result = await imageOptimizationService.optimizeImage(file, options);
      
      setProgress(100);
      setIsOptimizing(false);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Image optimization failed';
      setError(errorMessage);
      setIsOptimizing(false);
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setIsOptimizing(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    optimizeImage,
    isOptimizing,
    progress,
    error,
    reset,
  };
}

/**
 * Image format detection and conversion utilities
 */
export const ImageUtils = {
  /**
   * Check if browser supports WebP
   */
  supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  },

  /**
   * Check if browser supports AVIF
   */
  supportsAVIF(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  },

  /**
   * Get best supported format
   */
  getBestFormat(): 'avif' | 'webp' | 'jpeg' {
    if (this.supportsAVIF()) return 'avif';
    if (this.supportsWebP()) return 'webp';
    return 'jpeg';
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  },

  /**
   * Calculate compression savings
   */
  calculateSavings(originalSize: number, optimizedSize: number): {
    savedBytes: number;
    savedPercentage: number;
    savedFormatted: string;
  } {
    const savedBytes = originalSize - optimizedSize;
    const savedPercentage = (savedBytes / originalSize) * 100;
    
    return {
      savedBytes,
      savedPercentage: Math.max(0, savedPercentage),
      savedFormatted: this.formatFileSize(savedBytes),
    };
  },
};