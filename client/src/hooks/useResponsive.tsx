/**
 * Responsive Design Hook
 * 
 * Provides responsive breakpoint detection and mobile utilities:
 * - Screen size detection
 * - Mobile/tablet/desktop breakpoints
 * - Orientation detection
 * - Touch device detection
 */

import { useState, useEffect } from 'react';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  isTouchDevice: boolean;
  devicePixelRatio: number;
}

// Tailwind CSS breakpoints
const BREAKPOINTS = {
  mobile: 640,    // sm
  tablet: 768,    // md
  desktop: 1024,  // lg
  largeDesktop: 1280, // xl
} as const;

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
        screenWidth: 1024,
        screenHeight: 768,
        orientation: 'landscape',
        isTouchDevice: false,
        devicePixelRatio: 1,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isMobile: width < BREAKPOINTS.tablet,
      isTablet: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop,
      isDesktop: width >= BREAKPOINTS.desktop && width < BREAKPOINTS.largeDesktop,
      isLargeDesktop: width >= BREAKPOINTS.largeDesktop,
      screenWidth: width,
      screenHeight: height,
      orientation: width > height ? 'landscape' : 'portrait',
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  });

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setState({
        isMobile: width < BREAKPOINTS.tablet,
        isTablet: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop,
        isDesktop: width >= BREAKPOINTS.desktop && width < BREAKPOINTS.largeDesktop,
        isLargeDesktop: width >= BREAKPOINTS.largeDesktop,
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait',
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        devicePixelRatio: window.devicePixelRatio || 1,
      });
    };

    // Debounce resize events
    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateState, 100);
    };

    window.addEventListener('resize', debouncedUpdate);
    window.addEventListener('orientationchange', updateState);

    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      window.removeEventListener('orientationchange', updateState);
      clearTimeout(timeoutId);
    };
  }, []);

  return state;
}

// Utility functions for responsive design
export const useBreakpoint = () => {
  const { isMobile, isTablet, isDesktop, isLargeDesktop } = useResponsive();
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isMobileOrTablet: isMobile || isTablet,
    isDesktopOrLarger: isDesktop || isLargeDesktop,
    getBreakpoint: () => {
      if (isMobile) return 'mobile';
      if (isTablet) return 'tablet';
      if (isDesktop) return 'desktop';
      return 'large-desktop';
    },
  };
};

// Hook for mobile-specific behavior
export const useMobile = () => {
  const { isMobile, isTouchDevice } = useResponsive();
  
  return {
    isMobile,
    isTouchDevice,
    isMobileDevice: isMobile || isTouchDevice,
  };
};

// Hook for adaptive values based on screen size
export function useAdaptiveValue<T>(values: {
  mobile: T;
  tablet?: T;
  desktop?: T;
  largeDesktop?: T;
}): T {
  const { isMobile, isTablet, isDesktop, isLargeDesktop } = useResponsive();
  
  if (isMobile) return values.mobile;
  if (isTablet) return values.tablet ?? values.mobile;
  if (isDesktop) return values.desktop ?? values.tablet ?? values.mobile;
  if (isLargeDesktop) return values.largeDesktop ?? values.desktop ?? values.tablet ?? values.mobile;
  
  return values.mobile;
}

// Hook for responsive grid columns
export const useResponsiveGrid = (options?: {
  mobile?: number;
  tablet?: number;
  desktop?: number;
  largeDesktop?: number;
}) => {
  const defaults = {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    largeDesktop: 4,
  };
  
  const config = { ...defaults, ...options };
  
  return useAdaptiveValue({
    mobile: config.mobile,
    tablet: config.tablet,
    desktop: config.desktop,
    largeDesktop: config.largeDesktop,
  });
};

// Hook for responsive table pagination
export const useResponsivePagination = () => {
  return useAdaptiveValue({
    mobile: 5,      // 5 items per page on mobile
    tablet: 10,     // 10 items per page on tablet
    desktop: 20,    // 20 items per page on desktop
    largeDesktop: 25, // 25 items per page on large desktop
  });
};

// Utility for responsive CSS classes
export const responsiveClasses = {
  // Layout
  container: 'w-full px-4 sm:px-6 lg:px-8',
  maxWidth: 'max-w-7xl mx-auto',
  
  // Grid
  grid: {
    responsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
    twoColumn: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
    threeColumn: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  },
  
  // Flexbox
  flex: {
    responsive: 'flex flex-col sm:flex-row gap-4',
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    mobileStack: 'flex flex-col md:flex-row gap-4',
  },
  
  // Spacing
  padding: {
    page: 'p-4 sm:p-6 lg:p-8',
    card: 'p-4 sm:p-6',
    section: 'py-8 sm:py-12 lg:py-16',
  },
  
  // Typography
  text: {
    title: 'text-xl sm:text-2xl lg:text-3xl font-bold',
    heading: 'text-lg sm:text-xl lg:text-2xl font-semibold',
    body: 'text-sm sm:text-base',
    caption: 'text-xs sm:text-sm text-gray-600',
  },
  
  // Buttons
  button: {
    responsive: 'px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base',
    mobile: 'w-full sm:w-auto',
    icon: 'p-2 sm:p-3',
  },
  
  // Forms
  form: {
    input: 'w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base',
    label: 'text-sm sm:text-base font-medium',
    grid: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  },
  
  // Navigation
  nav: {
    mobile: 'block sm:hidden',
    desktop: 'hidden sm:block',
  },
  
  // Tables
  table: {
    responsive: 'overflow-x-auto',
    mobile: 'block sm:table',
    hideOnMobile: 'hidden sm:table-cell',
    showOnMobile: 'block sm:hidden',
  },
  
  // Cards
  card: {
    responsive: 'rounded-lg border bg-white shadow-sm p-4 sm:p-6',
    mobile: 'border-x-0 sm:border-x rounded-none sm:rounded-lg',
  },
};

export default useResponsive;