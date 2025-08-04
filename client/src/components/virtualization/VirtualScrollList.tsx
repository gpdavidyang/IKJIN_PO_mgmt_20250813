/**
 * Advanced Virtual Scrolling Component for Large Lists
 * Optimized for performance with dynamic heights and smooth scrolling
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePerformanceMonitor, useWindowSize } from '@/hooks/use-performance';
import { Skeleton } from '@/components/ui/skeleton';

interface VirtualScrollListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  itemHeight: number | ((index: number) => number);
  containerHeight?: number;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  onReachEnd?: () => void;
  scrollEndThreshold?: number;
  enableSmoothScrolling?: boolean;
  loadingItemsCount?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  EmptyComponent?: React.ComponentType;
  LoadingComponent?: React.ComponentType<{ count: number }>;
}

export function VirtualScrollList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  className,
  onScroll,
  onReachEnd,
  scrollEndThreshold = 100,
  enableSmoothScrolling = true,
  loadingItemsCount = 3,
  isLoading = false,
  emptyMessage = "항목이 없습니다",
  EmptyComponent,
  LoadingComponent,
}: VirtualScrollListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Performance monitoring
  usePerformanceMonitor('VirtualScrollList');
  const { height: windowHeight } = useWindowSize();
  
  // Auto-calculate container height if not provided
  const calculatedHeight = containerHeight || Math.min(windowHeight * 0.6, 500);
  
  // Calculate item heights
  const getItemHeight = useCallback((index: number): number => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
  }, [itemHeight]);
  
  // Memoized calculations for visible range
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    if (items.length === 0) {
      return { startIndex: 0, endIndex: 0, totalHeight: 0, offsetY: 0 };
    }
    
    let currentHeight = 0;
    let start = 0;
    let end = 0;
    let offset = 0;
    
    // Find start index
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      if (currentHeight + height > scrollTop) {
        start = Math.max(0, i - overscan);
        offset = currentHeight - (i - start) * (typeof itemHeight === 'number' ? itemHeight : 50);
        break;
      }
      currentHeight += height;
    }
    
    // Find end index
    currentHeight = 0;
    for (let i = start; i < items.length; i++) {
      currentHeight += getItemHeight(i);
      if (currentHeight > calculatedHeight + scrollTop) {
        end = Math.min(items.length, i + overscan);
        break;
      }
    }
    
    if (end === 0) end = items.length;
    
    // Calculate total height
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemHeight(i);
    }
    
    return {
      startIndex: start,
      endIndex: end,
      totalHeight: total,
      offsetY: offset
    };
  }, [items.length, scrollTop, calculatedHeight, overscan, getItemHeight]);
  
  // Visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      globalIndex: startIndex + index,
    }));
  }, [items, startIndex, endIndex]);
  
  // Scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);
    
    onScroll?.(newScrollTop);
    
    // Check if reached end
    const { scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - newScrollTop - clientHeight < scrollEndThreshold) {
      onReachEnd?.();
    }
    
    // Clear scrolling state after delay
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [onScroll, onReachEnd, scrollEndThreshold]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);
  
  // Loading state
  if (isLoading && items.length === 0) {
    if (LoadingComponent) {
      return <LoadingComponent count={loadingItemsCount} />;
    }
    
    return (
      <div className={cn("space-y-2 p-4", className)} style={{ height: calculatedHeight }}>
        {Array.from({ length: loadingItemsCount }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  
  // Empty state
  if (items.length === 0) {
    if (EmptyComponent) {
      return <EmptyComponent />;
    }
    
    return (
      <div 
        className={cn("flex items-center justify-center text-gray-500 bg-gray-50", className)}
        style={{ height: calculatedHeight }}
      >
        <div className="text-center">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-auto",
        enableSmoothScrolling && "scroll-smooth",
        className
      )}
      style={{ height: calculatedHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index, globalIndex }) => (
            <div
              key={globalIndex}
              style={{ height: getItemHeight(globalIndex) }}
              className="flex flex-col justify-center"
            >
              {renderItem(item, globalIndex, !isScrolling)}
            </div>
          ))}
          
          {/* Loading indicator at the end */}
          {isLoading && items.length > 0 && (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
              <p className="text-xs text-gray-500 mt-2">로딩 중...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Infinite scrolling list with virtual scrolling
 */
interface InfiniteVirtualListProps<T> extends Omit<VirtualScrollListProps<T>, 'onReachEnd'> {
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
}

export function InfiniteVirtualList<T>({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  ...props
}: InfiniteVirtualListProps<T>) {
  const handleReachEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && fetchNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  return (
    <VirtualScrollList
      {...props}
      onReachEnd={handleReachEnd}
      isLoading={isFetchingNextPage}
    />
  );
}

/**
 * Grid virtual scrolling for card layouts
 */
interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columnCount: number;
  itemHeight: number;
  itemWidth?: number;
  gap?: number;
  containerHeight?: number;
  className?: string;
}

export function VirtualGrid<T>({
  items,
  renderItem,
  columnCount,
  itemHeight,
  itemWidth,
  gap = 16,
  containerHeight = 400,
  className,
}: VirtualGridProps<T>) {
  const rowCount = Math.ceil(items.length / columnCount);
  const rowHeight = itemHeight + gap;
  
  return (
    <VirtualScrollList
      items={Array.from({ length: rowCount }, (_, rowIndex) => rowIndex)}
      itemHeight={rowHeight}
      containerHeight={containerHeight}
      className={className}
      renderItem={(rowIndex) => (
        <div 
          className="flex gap-4"
          style={{ gap }}
        >
          {Array.from({ length: columnCount }, (_, colIndex) => {
            const itemIndex = rowIndex * columnCount + colIndex;
            const item = items[itemIndex];
            
            if (!item) return <div key={colIndex} style={{ width: itemWidth, flex: itemWidth ? 'none' : '1' }} />;
            
            return (
              <div 
                key={colIndex}
                style={{ width: itemWidth, flex: itemWidth ? 'none' : '1' }}
              >
                {renderItem(item, itemIndex)}
              </div>
            );
          })}
        </div>
      )}
    />
  );
}

/**
 * Horizontal virtual scrolling list
 */
interface HorizontalVirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemWidth: number;
  containerWidth?: number;
  containerHeight?: number;
  gap?: number;
  className?: string;
}

export function HorizontalVirtualList<T>({
  items,
  renderItem,
  itemWidth,
  containerWidth = 800,
  containerHeight = 200,
  gap = 12,
  className,
}: HorizontalVirtualListProps<T>) {
  const [scrollLeft, setScrollLeft] = useState(0);
  
  const visibleCount = Math.ceil(containerWidth / (itemWidth + gap)) + 2;
  const startIndex = Math.max(0, Math.floor(scrollLeft / (itemWidth + gap)) - 1);
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  const totalWidth = items.length * (itemWidth + gap);
  
  const visibleItems = items.slice(startIndex, endIndex);
  
  return (
    <div
      className={cn("overflow-x-auto overflow-y-hidden", className)}
      style={{ width: containerWidth, height: containerHeight }}
      onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
    >
      <div 
        style={{ width: totalWidth, height: '100%', position: 'relative' }}
      >
        <div
          style={{
            transform: `translateX(${startIndex * (itemWidth + gap)}px)`,
            position: 'absolute',
            height: '100%',
            display: 'flex',
            gap,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ width: itemWidth, flexShrink: 0 }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}