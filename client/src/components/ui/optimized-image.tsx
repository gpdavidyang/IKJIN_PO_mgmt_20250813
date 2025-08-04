/**
 * Optimized Image Component with Lazy Loading and Performance Features
 * Provides automatic optimization, lazy loading, and fallback handling
 */

import React, { 
  useState, 
  useRef, 
  useEffect, 
  useCallback, 
  ImgHTMLAttributes,
  CSSProperties 
} from 'react';
import { useIntersectionObserver } from '@/hooks/use-performance';
import { cn } from '@/lib/utils';
import { ImageIcon, AlertCircle, Loader2 } from 'lucide-react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  src: string;
  alt: string;
  // Lazy loading options
  lazy?: boolean;
  threshold?: number;
  rootMargin?: string;
  
  // Optimization options
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  sizes?: string;
  
  // Responsive options
  responsive?: boolean;
  aspectRatio?: string; // e.g., "16/9", "4/3", "1/1"
  
  // Fallback options
  fallback?: string;
  placeholder?: 'blur' | 'skeleton' | 'none' | string;
  blurDataURL?: string;
  
  // Loading states
  showLoadingIndicator?: boolean;
  loadingComponent?: React.ComponentType;
  errorComponent?: React.ComponentType<{ retry: () => void }>;
  
  // Performance options
  priority?: boolean; // Disable lazy loading for above-the-fold images
  preload?: boolean;
  
  // Callbacks
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (error: Error) => void;
  onLoadStart?: () => void;
  
  // Container options
  containerClassName?: string;
  containerStyle?: CSSProperties;
}

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export function OptimizedImage({
  src,
  alt,
  className,
  lazy = true,
  threshold = 0.1,
  rootMargin = '50px',
  quality = 75,
  format = 'auto',
  sizes,
  responsive = false,
  aspectRatio,
  fallback,
  placeholder = 'skeleton',
  blurDataURL,
  showLoadingIndicator = true,
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
  priority = false,
  preload = false,
  onLoad,
  onError,
  onLoadStart,
  containerClassName,
  containerStyle,
  ...props
}: OptimizedImageProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Intersection observer for lazy loading
  const isIntersecting = useIntersectionObserver(containerRef, {
    threshold,
    rootMargin,
  });
  
  // Determine if image should load
  const shouldLoad = !lazy || priority || isIntersecting;
  
  // Generate optimized image URL
  const getOptimizedSrc = useCallback((originalSrc: string, targetFormat?: string) => {
    // In a real implementation, you'd have an image optimization service
    // For now, we'll just return the original src with quality parameters
    const url = new URL(originalSrc, window.location.origin);
    
    if (quality !== 75) {
      url.searchParams.set('quality', quality.toString());
    }
    
    if (targetFormat && targetFormat !== 'auto') {
      url.searchParams.set('format', targetFormat);
    }
    
    return url.toString();
  }, [quality]);
  
  // Generate srcSet for responsive images
  const generateSrcSet = useCallback((originalSrc: string) => {
    if (!responsive) return undefined;
    
    const breakpoints = [640, 768, 1024, 1280, 1536];
    return breakpoints
      .map(width => `${getOptimizedSrc(originalSrc)}${originalSrc.includes('?') ? '&' : '?'}w=${width} ${width}w`)
      .join(', ');
  }, [responsive, getOptimizedSrc]);
  
  // Preload image
  const preloadImage = useCallback((imageSrc: string) => {
    if (!preload) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = imageSrc;
    if (sizes) link.setAttribute('imagesizes', sizes);
    document.head.appendChild(link);
  }, [preload, sizes]);
  
  // Load image
  const loadImage = useCallback((imageSrc: string) => {
    if (loadingState === 'loading') return;
    
    setLoadingState('loading');
    onLoadStart?.();
    
    const img = new Image();
    
    img.onload = (event) => {
      setCurrentSrc(imageSrc);
      setLoadingState('loaded');
      onLoad?.(event as any);
    };
    
    img.onerror = () => {
      const error = new Error(`Failed to load image: ${imageSrc}`);
      setLoadingState('error');
      onError?.(error);
    };
    
    // Set srcset for responsive images
    const srcSet = generateSrcSet(imageSrc);
    if (srcSet) img.srcset = srcSet;
    if (sizes) img.sizes = sizes;
    
    img.src = getOptimizedSrc(imageSrc);
  }, [loadingState, onLoad, onError, onLoadStart, generateSrcSet, getOptimizedSrc, sizes]);
  
  // Retry loading
  const retryLoad = useCallback(() => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setLoadingState('idle');
      
      // Try fallback on first retry
      const srcToTry = retryCount === 0 && fallback ? fallback : src;
      setTimeout(() => loadImage(srcToTry), 1000 * retryCount); // Exponential backoff
    }
  }, [retryCount, fallback, src, loadImage]);
  
  // Load image when should load
  useEffect(() => {
    if (shouldLoad && loadingState === 'idle') {
      loadImage(src);
      preloadImage(src);
    }
  }, [shouldLoad, loadingState, src, loadImage, preloadImage]);
  
  // Placeholder component
  const renderPlaceholder = () => {
    if (placeholder === 'none') return null;
    
    if (typeof placeholder === 'string' && placeholder !== 'skeleton' && placeholder !== 'blur') {
      return (
        <img
          src={placeholder}
          alt=""
          className={cn('w-full h-full object-cover', className)}
          aria-hidden="true"
        />
      );
    }
    
    if (placeholder === 'blur' && blurDataURL) {
      return (
        <img
          src={blurDataURL}
          alt=""
          className={cn('w-full h-full object-cover filter blur-sm scale-110', className)}
          aria-hidden="true"
        />
      );
    }
    
    // Default skeleton placeholder
    return (
      <div className={cn(
        'w-full h-full bg-gray-200 animate-pulse flex items-center justify-center',
        className
      )}>
        <ImageIcon className="w-8 h-8 text-gray-400" aria-hidden="true" />
      </div>
    );
  };
  
  // Loading indicator
  const renderLoadingIndicator = () => {
    if (!showLoadingIndicator || loadingState !== 'loading') return null;
    
    if (LoadingComponent) {
      return <LoadingComponent />;
    }
    
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    );
  };
  
  // Error component
  const renderError = () => {
    if (loadingState !== 'error') return null;
    
    if (ErrorComponent) {
      return <ErrorComponent retry={retryLoad} />;
    }
    
    return (
      <div className={cn(
        'w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-500',
        className
      )}>
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm text-center mb-2">이미지를 불러올 수 없습니다</p>
        {retryCount < 3 && (
          <button
            onClick={retryLoad}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            다시 시도
          </button>
        )}
      </div>
    );
  };
  
  // Container style with aspect ratio
  const containerStyles: CSSProperties = {
    ...containerStyle,
    ...(aspectRatio && {
      aspectRatio,
      width: '100%',
    }),
  };
  
  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        responsive && 'w-full',
        containerClassName
      )}
      style={containerStyles}
    >
      {/* Placeholder */}
      {(loadingState === 'idle' || loadingState === 'loading') && renderPlaceholder()}
      
      {/* Actual image */}
      {loadingState === 'loaded' && (
        <img
          ref={imgRef}
          src={currentSrc}
          srcSet={generateSrcSet(src)}
          sizes={sizes}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            loadingState === 'loaded' ? 'opacity-100' : 'opacity-0',
            className
          )}
          {...props}
        />
      )}
      
      {/* Loading indicator */}
      {renderLoadingIndicator()}
      
      {/* Error state */}
      {renderError()}
    </div>
  );
}

/**
 * Image gallery component with lazy loading
 */
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  columns?: number;
  gap?: number;
  aspectRatio?: string;
  className?: string;
  onImageClick?: (image: { src: string; alt: string; caption?: string }, index: number) => void;
}

export function ImageGallery({
  images,
  columns = 3,
  gap = 16,
  aspectRatio = '1/1',
  className,
  onImageClick,
}: ImageGalleryProps) {
  return (
    <div 
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {images.map((image, index) => (
        <div key={index} className="group cursor-pointer" onClick={() => onImageClick?.(image, index)}>
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            aspectRatio={aspectRatio}
            responsive
            className="group-hover:scale-105 transition-transform duration-200"
            containerClassName="rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
          />
          {image.caption && (
            <p className="mt-2 text-sm text-gray-600 text-center">{image.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Hero image component with optimized loading
 */
interface HeroImageProps extends OptimizedImageProps {
  overlay?: boolean;
  overlayColor?: string;
  title?: string;
  subtitle?: string;
}

export function HeroImage({
  overlay = false,
  overlayColor = 'rgba(0, 0, 0, 0.4)',
  title,
  subtitle,
  className,
  containerClassName,
  ...props
}: HeroImageProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <OptimizedImage
        {...props}
        priority // Hero images should load immediately
        lazy={false}
        className={cn('w-full h-full object-cover', className)}
      />
      
      {overlay && (
        <div 
          className="absolute inset-0" 
          style={{ backgroundColor: overlayColor }}
          aria-hidden="true"
        />
      )}
      
      {(title || subtitle) && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-center">
          <div>
            {title && <h1 className="text-4xl md:text-6xl font-bold mb-4">{title}</h1>}
            {subtitle && <p className="text-lg md:text-xl opacity-90">{subtitle}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Avatar component with optimized loading
 */
interface AvatarImageProps extends Omit<OptimizedImageProps, 'aspectRatio'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square' | 'rounded';
  initials?: string;
}

const avatarSizes = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const avatarShapes = {
  circle: 'rounded-full',
  square: 'rounded-none',
  rounded: 'rounded-lg',
};

export function AvatarImage({
  size = 'md',
  shape = 'circle',
  initials,
  className,
  containerClassName,
  ...props
}: AvatarImageProps) {
  const sizeClasses = avatarSizes[size];
  const shapeClasses = avatarShapes[shape];
  
  return (
    <OptimizedImage
      {...props}
      aspectRatio="1/1"
      className={cn('object-cover', shapeClasses, className)}
      containerClassName={cn(sizeClasses, shapeClasses, containerClassName)}
      errorComponent={({ retry }) => (
        <div className={cn(
          'w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium',
          shapeClasses
        )}>
          {initials ? initials.slice(0, 2).toUpperCase() : '?'}
        </div>
      )}
    />
  );
}