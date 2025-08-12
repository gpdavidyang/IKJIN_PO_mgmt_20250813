/**
 * Query Performance Testing Utilities
 * Provides tools to measure and compare React Query performance
 */

import { QueryClient } from '@tanstack/react-query';

export interface QueryPerformanceMetrics {
  queryKey: string;
  executionTime: number;
  cacheHits: number;
  cacheMisses: number;
  networkRequests: number;
  dataSize: number;
  staleTime: number;
  gcTime: number;
}

export interface PerformanceTestResult {
  totalQueries: number;
  averageExecutionTime: number;
  cacheHitRate: number;
  totalDataTransferred: number;
  memoryUsage: number;
  recommendations: string[];
}

class QueryPerformanceMonitor {
  private metrics: Map<string, QueryPerformanceMetrics> = new Map();
  private queryClient: QueryClient;
  private startTime: number = 0;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupMonitoring();
  }

  private setupMonitoring() {
    const cache = this.queryClient.getQueryCache();
    
    cache.subscribe((event) => {
      if (event?.type === 'queryAdded') {
        this.trackQueryStart(event.query.queryKey);
      } else if (event?.type === 'queryUpdated') {
        this.trackQueryEnd(event.query.queryKey, event.query.state);
      }
    });
  }

  private trackQueryStart(queryKey: readonly unknown[]) {
    const keyString = JSON.stringify(queryKey);
    const existing = this.metrics.get(keyString);
    
    if (existing) {
      existing.networkRequests++;
    } else {
      this.metrics.set(keyString, {
        queryKey: keyString,
        executionTime: 0,
        cacheHits: 0,
        cacheMisses: 1,
        networkRequests: 1,
        dataSize: 0,
        staleTime: 0,
        gcTime: 0,
      });
    }
    
    this.startTime = performance.now();
  }

  private trackQueryEnd(queryKey: readonly unknown[], state: any) {
    const keyString = JSON.stringify(queryKey);
    const endTime = performance.now();
    const executionTime = endTime - this.startTime;
    
    const metrics = this.metrics.get(keyString);
    if (metrics) {
      metrics.executionTime = (metrics.executionTime + executionTime) / 2; // Average
      metrics.dataSize = state.data ? JSON.stringify(state.data).length : 0;
      
      if (state.status === 'success' && state.dataUpdatedAt < endTime - 1000) {
        metrics.cacheHits++;
        metrics.cacheMisses = Math.max(0, metrics.cacheMisses - 1);
      }
    }
  }

  public getMetrics(): QueryPerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  public generateReport(): PerformanceTestResult {
    const metrics = this.getMetrics();
    
    if (metrics.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        totalDataTransferred: 0,
        memoryUsage: 0,
        recommendations: ['No queries found to analyze'],
      };
    }

    const totalQueries = metrics.length;
    const averageExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;
    const totalCacheHits = metrics.reduce((sum, m) => sum + m.cacheHits, 0);
    const totalCacheMisses = metrics.reduce((sum, m) => sum + m.cacheMisses, 0);
    const cacheHitRate = totalCacheHits / (totalCacheHits + totalCacheMisses);
    const totalDataTransferred = metrics.reduce((sum, m) => sum + m.dataSize, 0);
    
    // Estimate memory usage
    const memoryUsage = this.estimateMemoryUsage();
    
    const recommendations = this.generateRecommendations(metrics, cacheHitRate, averageExecutionTime);

    return {
      totalQueries,
      averageExecutionTime,
      cacheHitRate,
      totalDataTransferred,
      memoryUsage,
      recommendations,
    };
  }

  private estimateMemoryUsage(): number {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    let totalSize = 0;
    queries.forEach(query => {
      if (query.state.data) {
        totalSize += JSON.stringify(query.state.data).length;
      }
    });
    
    return totalSize;
  }

  private generateRecommendations(
    metrics: QueryPerformanceMetrics[], 
    cacheHitRate: number, 
    avgExecutionTime: number
  ): string[] {
    const recommendations: string[] = [];

    // Cache hit rate analysis
    if (cacheHitRate < 0.7) {
      recommendations.push(
        '🔄 Low cache hit rate detected. Consider increasing staleTime for frequently accessed data.'
      );
    }

    // Execution time analysis
    if (avgExecutionTime > 500) {
      recommendations.push(
        '⚡ High average query time. Consider implementing query prefetching or background updates.'
      );
    }

    // Large data analysis
    const largeQueries = metrics.filter(m => m.dataSize > 100000); // 100KB
    if (largeQueries.length > 0) {
      recommendations.push(
        `📦 ${largeQueries.length} queries returning large datasets. Consider pagination or data chunking.`
      );
    }

    // Frequent network requests
    const frequentQueries = metrics.filter(m => m.networkRequests > 10);
    if (frequentQueries.length > 0) {
      recommendations.push(
        `🌐 ${frequentQueries.length} queries making frequent network requests. Consider background sync or longer staleTime.`
      );
    }

    // Memory usage
    const memoryUsage = this.estimateMemoryUsage();
    if (memoryUsage > 5000000) { // 5MB
      recommendations.push(
        '💾 High memory usage detected. Consider reducing gcTime or implementing cache size limits.'
      );
    }

    // No issues found
    if (recommendations.length === 0) {
      recommendations.push('✅ Query performance looks good! No issues detected.');
    }

    return recommendations;
  }

  public reset() {
    this.metrics.clear();
  }
}

// Performance testing utilities
export class QueryPerformanceTester {
  private monitor: QueryPerformanceMonitor;
  private testResults: PerformanceTestResult[] = [];

  constructor(queryClient: QueryClient) {
    this.monitor = new QueryPerformanceMonitor(queryClient);
  }

  async runPerformanceTest(
    testName: string,
    testFunction: () => Promise<void>,
    iterations: number = 1
  ): Promise<PerformanceTestResult> {
    console.log(`Starting performance test: ${testName}`);
    
    this.monitor.reset();
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      await testFunction();
      
      // Small delay between iterations
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const endTime = performance.now();
    const result = this.monitor.generateReport();
    
    result.totalDataTransferred = result.totalDataTransferred / iterations; // Average per iteration
    
    console.log(`Performance test completed in ${endTime - startTime}ms`);
    console.log('Results:', result);
    
    this.testResults.push(result);
    return result;
  }

  compareResults(baseline: PerformanceTestResult, current: PerformanceTestResult) {
    const comparison = {
      executionTimeImprovement: 
        ((baseline.averageExecutionTime - current.averageExecutionTime) / baseline.averageExecutionTime) * 100,
      cacheHitRateImprovement: 
        ((current.cacheHitRate - baseline.cacheHitRate) / baseline.cacheHitRate) * 100,
      memoryUsageChange: 
        ((current.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) * 100,
      dataTransferReduction: 
        ((baseline.totalDataTransferred - current.totalDataTransferred) / baseline.totalDataTransferred) * 100,
    };

    console.log('Performance Comparison:');
    console.log(`⚡ Execution time: ${comparison.executionTimeImprovement > 0 ? '↓' : '↑'} ${Math.abs(comparison.executionTimeImprovement).toFixed(2)}%`);
    console.log(`🎯 Cache hit rate: ${comparison.cacheHitRateImprovement > 0 ? '↑' : '↓'} ${Math.abs(comparison.cacheHitRateImprovement).toFixed(2)}%`);
    console.log(`💾 Memory usage: ${comparison.memoryUsageChange > 0 ? '↑' : '↓'} ${Math.abs(comparison.memoryUsageChange).toFixed(2)}%`);
    console.log(`📡 Data transfer: ${comparison.dataTransferReduction > 0 ? '↓' : '↑'} ${Math.abs(comparison.dataTransferReduction).toFixed(2)}%`);

    return comparison;
  }

  generatePerformanceReport(): string {
    if (this.testResults.length === 0) {
      return 'No performance tests have been run yet.';
    }

    const latest = this.testResults[this.testResults.length - 1];
    
    return `
# React Query Performance Report

## Overall Metrics
- **Total Queries**: ${latest.totalQueries}
- **Average Execution Time**: ${latest.averageExecutionTime.toFixed(2)}ms
- **Cache Hit Rate**: ${(latest.cacheHitRate * 100).toFixed(2)}%
- **Total Data Transferred**: ${(latest.totalDataTransferred / 1024).toFixed(2)}KB
- **Memory Usage**: ${(latest.memoryUsage / 1024).toFixed(2)}KB

## Recommendations
${latest.recommendations.map(rec => `- ${rec}`).join('\n')}

## Performance Score
${this.calculatePerformanceScore(latest)}/100
    `.trim();
  }

  private calculatePerformanceScore(result: PerformanceTestResult): number {
    let score = 100;
    
    // Deduct points for poor performance
    if (result.averageExecutionTime > 1000) score -= 20;
    else if (result.averageExecutionTime > 500) score -= 10;
    
    if (result.cacheHitRate < 0.5) score -= 20;
    else if (result.cacheHitRate < 0.7) score -= 10;
    
    if (result.memoryUsage > 10000000) score -= 15; // 10MB
    else if (result.memoryUsage > 5000000) score -= 5; // 5MB
    
    return Math.max(0, score);
  }
}

// Export utilities for use in development
export function createPerformanceTester(queryClient: QueryClient) {
  return new QueryPerformanceTester(queryClient);
}

export function logQueryPerformance(queryClient: QueryClient) {
  const monitor = new QueryPerformanceMonitor(queryClient);
  
  setTimeout(() => {
    const report = monitor.generateReport();
    console.group('🔍 React Query Performance Report');
    console.log('📊 Metrics:', report);
    console.log('💡 Recommendations:', report.recommendations);
    console.groupEnd();
  }, 5000); // Wait 5 seconds to collect data
}