/**
 * Query Performance DevTools
 * Development-only component for monitoring React Query performance
 */

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useQueryPerformanceMonitor } from '@/lib/query-optimization';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Database, 
  Activity, 
  AlertTriangle, 
  RefreshCw,
  Eye,
  EyeOff,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface QueryDevToolsProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  initialOpen?: boolean;
}

export function QueryDevTools({ 
  position = 'bottom-right', 
  initialOpen = false 
}: QueryDevToolsProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [queries, setQueries] = useState<any[]>([]);
  
  const queryClient = useQueryClient();
  const { getQueryStats } = useQueryPerformanceMonitor();
  
  // Update stats periodically
  useEffect(() => {
    if (!isOpen) return;
    
    const updateStats = () => {
      const currentStats = getQueryStats();
      setStats(currentStats);
      
      const cache = queryClient.getQueryCache();
      const allQueries = cache.getAll().map(query => ({
        queryKey: query.queryKey,
        state: query.state.status,
        isStale: query.isStale(),
        observers: query.getObserversCount(),
        dataSize: query.state.data ? JSON.stringify(query.state.data).length : 0,
        lastUpdated: query.state.dataUpdatedAt,
        fetchStatus: query.state.fetchStatus,
        errorCount: query.state.failureCount || 0,
      }));
      setQueries(allQueries);
    };
    
    updateStats();
    const interval = setInterval(updateStats, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, queryClient, getQueryStats]);
  
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const formatQueryKey = (queryKey: readonly unknown[]) => {
    return JSON.stringify(queryKey).slice(0, 60) + (JSON.stringify(queryKey).length > 60 ? '...' : '');
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'loading': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'error': return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      case 'loading': return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />;
      default: return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors',
          positionClasses[position]
        )}
        title="Open Query DevTools"
      >
        <Database className="w-5 h-5" />
      </button>
    );
  }
  
  return (
    <div
      className={cn(
        'fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl',
        isMinimized ? 'w-80 h-12' : 'w-96 h-96',
        positionClasses[position]
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-sm">Query DevTools</span>
          {stats && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span>{stats.totalQueries} queries</span>
              <span>•</span>
              <span>{formatBytes(stats.cacheSize)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-200 rounded"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-200 rounded"
            title="Close"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <div className="p-3 h-full overflow-hidden flex flex-col">
          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-blue-50 p-2 rounded text-center">
                <div className="text-lg font-bold text-blue-600">{stats.activeQueries}</div>
                <div className="text-xs text-blue-800">Active</div>
              </div>
              <div className="bg-yellow-50 p-2 rounded text-center">
                <div className="text-lg font-bold text-yellow-600">{stats.staleQueries}</div>
                <div className="text-xs text-yellow-800">Stale</div>
              </div>
              <div className="bg-red-50 p-2 rounded text-center">
                <div className="text-lg font-bold text-red-600">{stats.errorQueries}</div>
                <div className="text-xs text-red-800">Errors</div>
              </div>
              <div className="bg-green-50 p-2 rounded text-center">
                <div className="text-lg font-bold text-green-600">{formatBytes(stats.cacheSize)}</div>
                <div className="text-xs text-green-800">Cache</div>
              </div>
            </div>
          )}
          
          {/* Query List */}
          <div className="flex-1 overflow-auto">
            <div className="text-xs font-medium text-gray-700 mb-2">Active Queries</div>
            <div className="space-y-1">
              {queries.slice(0, 10).map((query, index) => (
                <div key={index} className="text-xs border border-gray-100 rounded p-2">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(query.state)}
                    <span className={cn('font-mono', getStatusColor(query.state))}>
                      {query.state}
                    </span>
                    {query.isStale && (
                      <span className="text-yellow-600 bg-yellow-100 px-1 rounded">
                        stale
                      </span>
                    )}
                    {query.observers > 0 && (
                      <span className="text-blue-600 bg-blue-100 px-1 rounded">
                        {query.observers} obs
                      </span>
                    )}
                  </div>
                  <div className="text-gray-600 font-mono break-all">
                    {formatQueryKey(query.queryKey)}
                  </div>
                  <div className="flex justify-between mt-1 text-gray-500">
                    <span>{formatBytes(query.dataSize)}</span>
                    {query.lastUpdated && (
                      <span>
                        {new Date(query.lastUpdated).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {queries.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No queries active
                </div>
              )}
              
              {queries.length > 10 && (
                <div className="text-center text-gray-500 py-2">
                  ... and {queries.length - 10} more queries
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => queryClient.invalidateQueries()}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Invalidate All
            </button>
            <button
              onClick={() => queryClient.clear()}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              <AlertTriangle className="w-3 h-3" />
              Clear Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook to enable/disable devtools based on environment
export function useQueryDevTools() {
  const [enabled, setEnabled] = useState(process.env.NODE_ENV === 'development');
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + Q to toggle devtools
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Q') {
        setEnabled(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return enabled;
}