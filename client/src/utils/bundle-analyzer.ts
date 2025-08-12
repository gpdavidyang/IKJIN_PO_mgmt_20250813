/**
 * Runtime Bundle Analyzer
 * Provides bundle size analysis and optimization recommendations
 */

export interface ChunkInfo {
  name: string;
  size: number;
  type: 'vendor' | 'feature' | 'async' | 'main';
  isLoaded: boolean;
  loadTime?: number;
}

export interface BundleInfo {
  totalSize: number;
  gzippedSize: number;
  chunkCount: number;
  chunks: ChunkInfo[];
  recommendations: string[];
  loadTime: number;
}

export class BundleAnalyzer {
  private chunks = new Map<string, ChunkInfo>();
  private startTime = performance.now();

  /**
   * Analyze current bundle state
   */
  analyzeBundle(): BundleInfo {
    this.scanChunks();
    
    const chunks = Array.from(this.chunks.values());
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const gzippedSize = this.estimateGzippedSize(totalSize);
    const recommendations = this.generateRecommendations(chunks);
    const loadTime = performance.now() - this.startTime;
    
    return {
      totalSize,
      gzippedSize,
      chunkCount: chunks.length,
      chunks,
      recommendations,
      loadTime
    };
  }

  /**
   * Scan for loaded script chunks
   */
  private scanChunks(): void {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (!src || !this.isAppChunk(src)) return;
      
      const chunkName = this.extractChunkName(src);
      const chunkType = this.determineChunkType(chunkName, src);
      const estimatedSize = this.estimateChunkSize(src);
      
      this.chunks.set(chunkName, {
        name: chunkName,
        size: estimatedSize,
        type: chunkType,
        isLoaded: true,
        loadTime: this.getChunkLoadTime(src)
      });
    });
  }

  /**
   * Check if script is part of our application bundle
   */
  private isAppChunk(src: string): boolean {
    return src.includes('/assets/') || 
           src.includes('chunk') || 
           src.includes('vendor') ||
           src.includes('main');
  }

  /**
   * Extract chunk name from script source
   */
  private extractChunkName(src: string): string {
    const fileName = src.split('/').pop()?.split('?')[0] || 'unknown';
    return fileName.replace(/\.[^.]+$/, ''); // Remove extension
  }

  /**
   * Determine chunk type based on name and source
   */
  private determineChunkType(name: string, src: string): ChunkInfo['type'] {
    if (name.includes('vendor') || name.includes('react') || name.includes('ui-vendor')) {
      return 'vendor';
    }
    if (name.includes('main') || name.includes('index')) {
      return 'main';
    }
    if (name.includes('chunk') && src.includes('async')) {
      return 'async';
    }
    return 'feature';
  }

  /**
   * Estimate chunk size (simplified heuristic)
   */
  private estimateChunkSize(src: string): number {
    // This is a rough estimation - in production you'd want actual size data
    const fileName = src.split('/').pop() || '';
    
    // Base estimates by chunk type
    if (fileName.includes('vendor')) return 150000; // ~150KB
    if (fileName.includes('react')) return 100000; // ~100KB
    if (fileName.includes('chart')) return 80000; // ~80KB
    if (fileName.includes('main')) return 50000; // ~50KB
    
    return 30000; // ~30KB default
  }

  /**
   * Get chunk load time from performance API
   */
  private getChunkLoadTime(src: string): number | undefined {
    if (!performance.getEntriesByType) return undefined;
    
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const entry = resourceEntries.find(e => e.name.includes(src.split('/').pop() || ''));
    
    return entry ? Math.round(entry.responseEnd - entry.requestStart) : undefined;
  }

  /**
   * Estimate gzipped size (typically 30-40% of original)
   */
  private estimateGzippedSize(totalSize: number): number {
    return Math.round(totalSize * 0.35);
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(chunks: ChunkInfo[]): string[] {
    const recommendations: string[] = [];
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const vendorChunks = chunks.filter(chunk => chunk.type === 'vendor');
    const featureChunks = chunks.filter(chunk => chunk.type === 'feature');
    
    // Bundle size recommendations
    if (totalSize > 1000000) { // > 1MB
      recommendations.push('🚨 Bundle size is large (>1MB). Consider lazy loading more components.');
    }
    
    if (vendorChunks.length > 5) {
      recommendations.push('📦 Many vendor chunks detected. Consider consolidating similar libraries.');
    }
    
    if (featureChunks.some(chunk => chunk.size > 200000)) {
      recommendations.push('✂️ Large feature chunks detected. Split them into smaller modules.');
    }
    
    // Performance recommendations
    const slowChunks = chunks.filter(chunk => chunk.loadTime && chunk.loadTime > 1000);
    if (slowChunks.length > 0) {
      recommendations.push(`⏱️ ${slowChunks.length} chunks are loading slowly (>1s). Consider preloading critical chunks.`);
    }
    
    // Best practice recommendations
    if (chunks.filter(chunk => chunk.type === 'async').length < 3) {
      recommendations.push('🔄 Consider implementing more async chunks for better load performance.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Bundle optimization looks good!');
    }
    
    return recommendations;
  }

  /**
   * Monitor bundle changes over time
   */
  startMonitoring(): void {
    if (process.env.NODE_ENV !== 'development') return;
    
    const checkInterval = 5000; // Check every 5 seconds
    
    setInterval(() => {
      const analysis = this.analyzeBundle();
      
      // Only log if there are significant changes
      if (this.hasSignificantChanges(analysis)) {
        this.logAnalysis(analysis);
      }
    }, checkInterval);
  }

  /**
   * Check if there are significant changes worth logging
   */
  private hasSignificantChanges(analysis: BundleInfo): boolean {
    const currentChunkCount = analysis.chunkCount;
    const lastKnownCount = this.chunks.size;
    
    return Math.abs(currentChunkCount - lastKnownCount) > 0;
  }

  /**
   * Log bundle analysis results
   */
  logAnalysis(analysis?: BundleInfo): void {
    if (process.env.NODE_ENV !== 'development') return;
    
    const data = analysis || this.analyzeBundle();
    
    console.group('📊 Bundle Analysis');
    console.log(`Total Size: ${this.formatBytes(data.totalSize)} (estimated gzipped: ${this.formatBytes(data.gzippedSize)})`);
    console.log(`Chunks Loaded: ${data.chunkCount}`);
    
    // Log chunk details
    const chunksByType = this.groupChunksByType(data.chunks);
    Object.entries(chunksByType).forEach(([type, chunks]) => {
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      console.log(`${this.getTypeEmoji(type as ChunkInfo['type'])} ${type}: ${chunks.length} chunks, ${this.formatBytes(totalSize)}`);
    });
    
    // Log recommendations
    if (data.recommendations.length > 0) {
      console.group('💡 Recommendations');
      data.recommendations.forEach(rec => console.log(rec));
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * Group chunks by type for reporting
   */
  private groupChunksByType(chunks: ChunkInfo[]): Record<string, ChunkInfo[]> {
    return chunks.reduce((groups, chunk) => {
      const type = chunk.type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(chunk);
      return groups;
    }, {} as Record<string, ChunkInfo[]>);
  }

  /**
   * Get emoji for chunk type
   */
  private getTypeEmoji(type: ChunkInfo['type']): string {
    const emojis = {
      vendor: '📚',
      feature: '🧩', 
      async: '🔄',
      main: '🏠'
    };
    return emojis[type] || '📦';
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

// Create global bundle analyzer instance
export const bundleAnalyzer = new BundleAnalyzer();

/**
 * Initialize bundle monitoring in development
 */
export function initializeBundleMonitoring(): void {
  if (process.env.NODE_ENV === 'development') {
    // Log initial analysis
    setTimeout(() => {
      bundleAnalyzer.logAnalysis();
    }, 2000);
    
    // Start continuous monitoring
    bundleAnalyzer.startMonitoring();
  }
}

/**
 * Get current bundle analysis
 */
export function getCurrentBundleAnalysis(): BundleInfo {
  return bundleAnalyzer.analyzeBundle();
}

/**
 * Log bundle analysis on demand
 */
export function logBundleAnalysis(): void {
  bundleAnalyzer.logAnalysis();
}