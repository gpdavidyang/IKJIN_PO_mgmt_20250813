/**
 * Mobile Layout Wrapper
 * 
 * Provides responsive layout management:
 * - Adaptive padding and margins
 * - Mobile-first spacing
 * - Touch-friendly interactions
 * - Safe area handling
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  maxWidth?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  centerContent?: boolean;
  safeArea?: boolean;
}

export function MobileLayout({
  children,
  className,
  padding = 'md',
  maxWidth = 'full',
  centerContent = false,
  safeArea = true,
}: MobileLayoutProps) {
  const { isMobile, isTablet } = useResponsive();

  const getPaddingClass = () => {
    if (padding === 'none') return '';
    
    const paddingMap = {
      sm: 'p-2 sm:p-4',
      md: 'p-4 sm:p-6 lg:p-8',
      lg: 'p-6 sm:p-8 lg:p-12',
    };
    
    return paddingMap[padding] || paddingMap.md;
  };

  const getMaxWidthClass = () => {
    if (maxWidth === 'none' || maxWidth === 'full') return 'w-full';
    
    const maxWidthMap = {
      sm: 'max-w-sm',
      md: 'max-w-2xl',
      lg: 'max-w-4xl',
      xl: 'max-w-6xl',
      '2xl': 'max-w-7xl',
    };
    
    return `w-full ${maxWidthMap[maxWidth]} mx-auto`;
  };

  return (
    <div
      className={cn(
        // Base layout
        'min-h-screen',
        
        // Safe area (for mobile notches/home indicators)
        safeArea && 'safe-area-inset',
        
        // Responsive padding
        getPaddingClass(),
        
        // Max width and centering
        getMaxWidthClass(),
        centerContent && 'flex items-center justify-center',
        
        // Custom classes
        className
      )}
      style={{
        // CSS custom properties for safe areas
        paddingTop: safeArea ? 'env(safe-area-inset-top)' : undefined,
        paddingBottom: safeArea ? 'env(safe-area-inset-bottom)' : undefined,
        paddingLeft: safeArea ? 'env(safe-area-inset-left)' : undefined,
        paddingRight: safeArea ? 'env(safe-area-inset-right)' : undefined,
      }}
    >
      {children}
    </div>
  );
}

// Responsive Grid Component
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    largeDesktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3, largeDesktop: 4 },
  gap = 'md',
  className,
}: ResponsiveGridProps) {
  const getGridClass = () => {
    const { mobile = 1, tablet = 2, desktop = 3, largeDesktop = 4 } = cols;
    
    const gapMap = {
      sm: 'gap-2 sm:gap-3',
      md: 'gap-4 sm:gap-6',
      lg: 'gap-6 sm:gap-8',
    };
    
    return cn(
      'grid',
      `grid-cols-${mobile}`,
      tablet && `sm:grid-cols-${tablet}`,
      desktop && `lg:grid-cols-${desktop}`,
      largeDesktop && `xl:grid-cols-${largeDesktop}`,
      gapMap[gap]
    );
  };

  return (
    <div className={cn(getGridClass(), className)}>
      {children}
    </div>
  );
}

// Responsive Stack Component
interface ResponsiveStackProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal' | 'responsive';
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  className?: string;
}

export function ResponsiveStack({
  children,
  direction = 'responsive',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  className,
}: ResponsiveStackProps) {
  const getFlexClass = () => {
    const gapMap = {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
    };
    
    const alignMap = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    };
    
    const justifyMap = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
    };
    
    const directionClass = direction === 'vertical' 
      ? 'flex-col'
      : direction === 'horizontal' 
      ? 'flex-row'
      : 'flex-col sm:flex-row'; // responsive
    
    return cn(
      'flex',
      directionClass,
      gapMap[gap],
      alignMap[align],
      justifyMap[justify]
    );
  };

  return (
    <div className={cn(getFlexClass(), className)}>
      {children}
    </div>
  );
}

// Mobile-specific components
export function MobileOnly({ children }: { children: React.ReactNode }) {
  return <div className="sm:hidden">{children}</div>;
}

export function DesktopOnly({ children }: { children: React.ReactNode }) {
  return <div className="hidden sm:block">{children}</div>;
}

export function TabletAndUp({ children }: { children: React.ReactNode }) {
  return <div className="hidden md:block">{children}</div>;
}

// Touch-friendly button wrapper
interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function TouchButton({ 
  children, 
  onClick, 
  className,
  disabled = false 
}: TouchButtonProps) {
  const { isTouchDevice } = useResponsive();
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Base styles
        'transition-all duration-200',
        
        // Touch-friendly sizing
        isTouchDevice && 'min-h-[44px] min-w-[44px]',
        
        // Enhanced touch feedback
        isTouchDevice && 'active:scale-95 active:bg-gray-100',
        
        // Focus styles
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',
        
        className
      )}
    >
      {children}
    </button>
  );
}

// Responsive text sizing
interface ResponsiveTextProps {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  className?: string;
}

export function ResponsiveText({
  children,
  size = 'base',
  weight = 'normal',
  className,
}: ResponsiveTextProps) {
  const getSizeClass = () => {
    const sizeMap = {
      xs: 'text-xs sm:text-sm',
      sm: 'text-sm sm:text-base',
      base: 'text-base sm:text-lg',
      lg: 'text-lg sm:text-xl',
      xl: 'text-xl sm:text-2xl',
      '2xl': 'text-2xl sm:text-3xl',
      '3xl': 'text-3xl sm:text-4xl',
    };
    
    return sizeMap[size];
  };
  
  const getWeightClass = () => {
    const weightMap = {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    };
    
    return weightMap[weight];
  };

  return (
    <span className={cn(getSizeClass(), getWeightClass(), className)}>
      {children}
    </span>
  );
}

export default MobileLayout;