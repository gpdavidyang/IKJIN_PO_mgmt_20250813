/**
 * Lazy-loaded component definitions for performance optimization
 */
import { lazy } from 'react';
import { LazyWrapper, ChartSkeleton, FormSkeleton, TableSkeleton } from '@/components/common/LazyWrapper';

// Lazy load heavy chart components
export const LazyAdvancedBarChart = lazy(() => 
  import('@/components/charts/advanced-chart').then(module => ({ 
    default: module.AdvancedBarChart 
  }))
);

export const LazyAdvancedPieChart = lazy(() => 
  import('@/components/charts/advanced-chart').then(module => ({ 
    default: module.AdvancedPieChart 
  }))
);

export const LazyAdvancedLineChart = lazy(() => 
  import('@/components/charts/advanced-chart').then(module => ({ 
    default: module.AdvancedLineChart 
  }))
);

export const LazyAdvancedAreaChart = lazy(() => 
  import('@/components/charts/advanced-chart').then(module => ({ 
    default: module.AdvancedAreaChart 
  }))
);

// Lazy load dashboard widgets
export const LazyKPIWidget = lazy(() => 
  import('@/components/charts/dashboard-widgets').then(module => ({ 
    default: module.KPIWidget 
  }))
);

export const LazyChartWidget = lazy(() => 
  import('@/components/charts/dashboard-widgets').then(module => ({ 
    default: module.ChartWidget 
  }))
);

export const LazyDashboardGrid = lazy(() => 
  import('@/components/charts/dashboard-widgets').then(module => ({ 
    default: module.DashboardGrid 
  }))
);

// Lazy load form components
export const LazyOrderForm = lazy(() => 
  import('@/components/order-form').then(module => ({ 
    default: module.default 
  }))
);

export const LazyVendorForm = lazy(() => 
  import('@/components/vendor-form').then(module => ({ 
    default: module.default 
  }))
);

export const LazyItemForm = lazy(() => 
  import('@/components/item-form').then(module => ({ 
    default: module.default 
  }))
);

// Lazy load table components
export const LazyOptimizedDataTable = lazy(() => 
  import('@/components/optimized/OptimizedDataTable').then(module => ({ 
    default: module.OptimizedDataTable 
  }))
);

export const LazyVirtualDataTable = lazy(() => 
  import('@/components/optimized/OptimizedDataTable').then(module => ({ 
    default: module.VirtualDataTable 
  }))
);

// Lazy load virtualization components
export const LazyVirtualScrollList = lazy(() => 
  import('@/components/virtualization/VirtualScrollList').then(module => ({ 
    default: module.VirtualScrollList 
  }))
);

export const LazyInfiniteVirtualList = lazy(() => 
  import('@/components/virtualization/VirtualScrollList').then(module => ({ 
    default: module.InfiniteVirtualList 
  }))
);

export const LazyVirtualOrdersList = lazy(() => 
  import('@/components/virtualization/VirtualOrdersList').then(module => ({ 
    default: module.VirtualOrdersList 
  }))
);

export const LazyVirtualOrdersGrid = lazy(() => 
  import('@/components/virtualization/VirtualOrdersList').then(module => ({ 
    default: module.VirtualOrdersGrid 
  }))
);

// Lazy load Excel components
export const LazyExcelUploadWithValidation = lazy(() => 
  import('@/components/excel-upload-with-validation').then(module => ({ 
    default: module.default 
  }))
);

export const LazyExcelAutomationWizard = lazy(() => 
  import('@/components/excel-automation-wizard').then(module => ({ 
    default: module.default 
  }))
);

// Wrapped components with proper fallbacks
export function LazyBarChartWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<ChartSkeleton height={props.height || 300} />}>
      <LazyAdvancedBarChart {...props} />
    </LazyWrapper>
  );
}

export function LazyPieChartWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<ChartSkeleton height={props.height || 300} />}>
      <LazyAdvancedPieChart {...props} />
    </LazyWrapper>
  );
}

export function LazyLineChartWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<ChartSkeleton height={props.height || 320} />}>
      <LazyAdvancedLineChart {...props} />
    </LazyWrapper>
  );
}

export function LazyAreaChartWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<ChartSkeleton height={props.height || 300} />}>
      <LazyAdvancedAreaChart {...props} />
    </LazyWrapper>
  );
}

export function LazyOrderFormWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<FormSkeleton />}>
      <LazyOrderForm {...props} />
    </LazyWrapper>
  );
}

export function LazyVendorFormWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<FormSkeleton />}>
      <LazyVendorForm {...props} />
    </LazyWrapper>
  );
}

export function LazyItemFormWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<FormSkeleton />}>
      <LazyItemForm {...props} />
    </LazyWrapper>
  );
}

export function LazyDataTableWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<TableSkeleton rows={props.data?.length || 5} />}>
      <LazyOptimizedDataTable {...props} />
    </LazyWrapper>
  );
}

export function LazyVirtualDataTableWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<TableSkeleton rows={10} />}>
      <LazyVirtualDataTable {...props} />
    </LazyWrapper>
  );
}

export function LazyVirtualScrollListWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<TableSkeleton rows={props.items?.length || 10} />}>
      <LazyVirtualScrollList {...props} />
    </LazyWrapper>
  );
}

export function LazyVirtualOrdersListWithFallback(props: any) {
  return (
    <LazyWrapper 
      fallback={
        <div className="space-y-1 border rounded-lg bg-white">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 border-b border-gray-200 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-5 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    >
      <LazyVirtualOrdersList {...props} />
    </LazyWrapper>
  );
}

export function LazyExcelUploadWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<FormSkeleton />}>
      <LazyExcelUploadWithValidation {...props} />
    </LazyWrapper>
  );
}

export function LazyExcelWizardWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<FormSkeleton />}>
      <LazyExcelAutomationWizard {...props} />
    </LazyWrapper>
  );
}

// Dashboard widget wrappers
export function LazyKPIWidgetWithFallback(props: any) {
  return (
    <LazyWrapper 
      fallback={
        <div className="p-4 border rounded-lg space-y-2">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      }
    >
      <LazyKPIWidget {...props} />
    </LazyWrapper>
  );
}

export function LazyChartWidgetWithFallback(props: any) {
  return (
    <LazyWrapper fallback={<ChartSkeleton height={props.height || 320} />}>
      <LazyChartWidget {...props} />
    </LazyWrapper>
  );
}

export function LazyDashboardGridWithFallback(props: any) {
  return (
    <LazyWrapper 
      fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: props.widgets?.length || 3 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      }
    >
      <LazyDashboardGrid {...props} />
    </LazyWrapper>
  );
}

// Performance monitoring wrapper
export function withPerformanceMonitoring<T extends {}>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function MonitoredComponent(props: T) {
    const { usePerformanceMonitor } = require('@/hooks/use-performance');
    const { renderCount } = usePerformanceMonitor(componentName);
    
    return <Component {...props} />;
  };
}

// Export monitored lazy components
export const MonitoredLazyBarChart = withPerformanceMonitoring(
  LazyBarChartWithFallback, 
  'LazyBarChart'
);

export const MonitoredLazyPieChart = withPerformanceMonitoring(
  LazyPieChartWithFallback, 
  'LazyPieChart'
);

export const MonitoredLazyLineChart = withPerformanceMonitoring(
  LazyLineChartWithFallback, 
  'LazyLineChart'
);

export const MonitoredLazyOrderForm = withPerformanceMonitoring(
  LazyOrderFormWithFallback, 
  'LazyOrderForm'
);

export const MonitoredLazyDataTable = withPerformanceMonitoring(
  LazyDataTableWithFallback, 
  'LazyDataTable'
);

export const MonitoredLazyVirtualDataTable = withPerformanceMonitoring(
  LazyVirtualDataTableWithFallback, 
  'LazyVirtualDataTable'
);

export const MonitoredLazyVirtualScrollList = withPerformanceMonitoring(
  LazyVirtualScrollListWithFallback, 
  'LazyVirtualScrollList'
);

export const MonitoredLazyVirtualOrdersList = withPerformanceMonitoring(
  LazyVirtualOrdersListWithFallback, 
  'LazyVirtualOrdersList'
);