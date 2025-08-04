/**
 * Advanced Image Gallery Components
 * Provides various gallery layouts with optimization and lazy loading
 */

import React, { useState, useCallback } from 'react';
import { OptimizedImage, ImageGallery as BaseImageGallery } from './optimized-image';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight, ZoomIn, Download, RotateCw } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogContent } from './dialog';

export interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
}

export interface ImageGalleryProps {
  images: GalleryImage[];
  layout?: 'grid' | 'masonry' | 'carousel' | 'lightbox';
  columns?: number;
  gap?: number;
  aspectRatio?: string;
  className?: string;
  onImageClick?: (image: GalleryImage, index: number) => void;
  enableLightbox?: boolean;
  enableDownload?: boolean;
  showCaptions?: boolean;
}

/**
 * Advanced Image Gallery with multiple layout options
 */
export function AdvancedImageGallery({
  images,
  layout = 'grid',
  columns = 3,
  gap = 16,
  aspectRatio = '1/1',
  className,
  onImageClick,
  enableLightbox = true,
  enableDownload = false,
  showCaptions = true,
}: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentRotation, setCurrentRotation] = useState(0);

  const handleImageClick = useCallback((image: GalleryImage, index: number) => {
    if (enableLightbox) {
      setLightboxIndex(index);
      setCurrentRotation(0);
    }
    onImageClick?.(image, index);
  }, [enableLightbox, onImageClick]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    setCurrentRotation(0);
  }, []);

  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    if (lightboxIndex === null) return;
    
    const newIndex = direction === 'prev' 
      ? (lightboxIndex - 1 + images.length) % images.length
      : (lightboxIndex + 1) % images.length;
    
    setLightboxIndex(newIndex);
    setCurrentRotation(0);
  }, [lightboxIndex, images.length]);

  const rotateLightboxImage = useCallback(() => {
    setCurrentRotation(prev => (prev + 90) % 360);
  }, []);

  const downloadImage = useCallback(async (src: string, filename: string) => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, []);

  const renderGridLayout = () => (
    <div 
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {images.map((image, index) => (
        <div key={index} className="group cursor-pointer" onClick={() => handleImageClick(image, index)}>
          <OptimizedImage
            src={image.thumbnail || image.src}
            alt={image.alt}
            aspectRatio={aspectRatio}
            responsive
            className="group-hover:scale-105 transition-transform duration-200"
            containerClassName="rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
          />
          {image.caption && showCaptions && (
            <p className="mt-2 text-sm text-gray-600 text-center line-clamp-2">{image.caption}</p>
          )}
        </div>
      ))}
    </div>
  );

  const renderMasonryLayout = () => (
    <div 
      className={cn('columns-1 sm:columns-2 md:columns-3 lg:columns-4', className)}
      style={{ columnGap: `${gap}px` }}
    >
      {images.map((image, index) => (
        <div 
          key={index} 
          className="break-inside-avoid mb-4 group cursor-pointer"
          onClick={() => handleImageClick(image, index)}
        >
          <OptimizedImage
            src={image.thumbnail || image.src}
            alt={image.alt}
            responsive
            className="w-full group-hover:scale-105 transition-transform duration-200"
            containerClassName="rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
          />
          {image.caption && showCaptions && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{image.caption}</p>
          )}
        </div>
      ))}
    </div>
  );

  const renderCarouselLayout = () => (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      <div className="flex transition-transform duration-300 ease-in-out">
        {images.map((image, index) => (
          <div key={index} className="flex-shrink-0 w-full">
            <OptimizedImage
              src={image.src}
              alt={image.alt}
              aspectRatio={aspectRatio}
              responsive
              priority={index === 0}
              className="w-full cursor-pointer"
              onClick={() => handleImageClick(image, index)}
            />
            {image.caption && showCaptions && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                <p className="text-sm">{image.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderLightboxLayout = () => (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6', className)} style={{ gap: `${gap}px` }}>
      {images.map((image, index) => (
        <div key={index} className="group cursor-pointer" onClick={() => handleImageClick(image, index)}>
          <div className="relative">
            <OptimizedImage
              src={image.thumbnail || image.src}
              alt={image.alt}
              aspectRatio="1/1"
              responsive
              className="w-full group-hover:scale-105 transition-transform duration-200"
              containerClassName="rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          </div>
          {image.caption && showCaptions && (
            <p className="mt-1 text-xs text-gray-600 text-center line-clamp-1">{image.caption}</p>
          )}
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (layout) {
      case 'masonry':
        return renderMasonryLayout();
      case 'carousel':
        return renderCarouselLayout();
      case 'lightbox':
        return renderLightboxLayout();
      default:
        return renderGridLayout();
    }
  };

  const currentImage = lightboxIndex !== null ? images[lightboxIndex] : null;

  return (
    <>
      {renderContent()}
      
      {/* Lightbox Modal */}
      {enableLightbox && currentImage && lightboxIndex !== null && (
        <Dialog open={true} onOpenChange={closeLightbox}>
          <DialogContent className="max-w-screen-xl max-h-screen p-0 bg-black">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                onClick={closeLightbox}
              >
                <X className="w-4 h-4" />
              </Button>
              
              {/* Navigation Buttons */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                    onClick={() => navigateLightbox('prev')}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                    onClick={() => navigateLightbox('next')}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                </>
              )}
              
              {/* Action Buttons */}
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={rotateLightboxImage}
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
                {enableDownload && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={() => downloadImage(currentImage.src, `image-${lightboxIndex + 1}.jpg`)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              {/* Main Image */}
              <div 
                className="max-w-full max-h-full flex items-center justify-center p-8"
                style={{ transform: `rotate(${currentRotation}deg)` }}
              >
                <OptimizedImage
                  src={currentImage.src}
                  alt={currentImage.alt}
                  priority={true}
                  lazy={false}
                  quality={95}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              
              {/* Image Info */}
              {currentImage.caption && (
                <div className="absolute bottom-4 left-4 right-4 z-10 bg-black bg-opacity-50 text-white p-4 rounded-lg">
                  <p className="text-sm text-center">{currentImage.caption}</p>
                  <p className="text-xs text-gray-300 text-center mt-1">
                    {lightboxIndex + 1} / {images.length}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/**
 * Simple Image Grid for basic use cases
 */
export function SimpleImageGrid({ 
  images, 
  columns = 3, 
  gap = 4, 
  className,
  onImageClick 
}: {
  images: GalleryImage[];
  columns?: number;
  gap?: number;
  className?: string;
  onImageClick?: (image: GalleryImage, index: number) => void;
}) {
  return (
    <BaseImageGallery
      images={images}
      columns={columns}
      gap={gap * 4} // Convert to pixels (gap * 4px)
      className={className}
      onImageClick={onImageClick}
    />
  );
}

/**
 * Product Image Gallery specifically for e-commerce style displays
 */
export function ProductImageGallery({
  images,
  className,
}: {
  images: GalleryImage[];
  className?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  if (images.length === 0) return null;
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Image */}
      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
        <OptimizedImage
          src={images[selectedIndex]?.src}
          alt={images[selectedIndex]?.alt}
          aspectRatio="1/1"
          responsive
          priority={true}
          quality={95}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              className={cn(
                'flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors',
                selectedIndex === index 
                  ? 'border-primary' 
                  : 'border-gray-200 hover:border-gray-300'
              )}
              onClick={() => setSelectedIndex(index)}
            >
              <OptimizedImage
                src={image.thumbnail || image.src}
                alt={image.alt}
                aspectRatio="1/1"
                quality={80}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { BaseImageGallery as ImageGallery };