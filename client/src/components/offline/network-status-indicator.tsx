/**
 * Network Status Indicator Component
 * 
 * Displays current network status and offline capabilities:
 * - Online/offline indicator
 * - Connection speed info
 * - Pending sync actions count
 * - Manual sync trigger
 */

import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Signal, 
  SignalLow, 
  SignalMedium, 
  SignalHigh,
  RefreshCw,
  Database,
  Upload,
  Download,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineCache } from '@/hooks/useOfflineAPI';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function NetworkStatusIndicator() {
  const {
    isOnline,
    isSlowConnection,
    connectionType,
    lastOnline,
    lastOffline,
    pendingActions,
    syncInProgress,
    retryConnection,
    syncOfflineActions,
    clearOfflineActions,
  } = useNetworkStatus();

  const { clearCache, getCacheStatus } = useOfflineCache();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);

  // Load cache info when popover opens
  const handlePopoverOpen = async (open: boolean) => {
    setIsPopoverOpen(open);
    if (open) {
      const info = await getCacheStatus();
      setCacheInfo(info);
    }
  };

  // Get connection icon based on status and speed
  const getConnectionIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }

    if (isSlowConnection) {
      return <SignalLow className="h-4 w-4 text-yellow-500" />;
    }

    switch (connectionType) {
      case '4g':
        return <SignalHigh className="h-4 w-4 text-green-500" />;
      case '3g':
        return <SignalMedium className="h-4 w-4 text-blue-500" />;
      case '2g':
      case 'slow-2g':
        return <SignalLow className="h-4 w-4 text-yellow-500" />;
      default:
        return <Wifi className="h-4 w-4 text-green-500" />;
    }
  };

  // Get status color
  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-100 text-red-800 border-red-200';
    if (isSlowConnection) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  // Get status text
  const getStatusText = () => {
    if (!isOnline) return '오프라인';
    if (isSlowConnection) return '느린 연결';
    return '온라인';
  };

  // Handle sync action
  const handleSync = async () => {
    if (syncInProgress) return;
    await syncOfflineActions();
  };

  // Handle retry connection
  const handleRetry = async () => {
    await retryConnection();
  };

  // Format cache size
  const formatCacheSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`relative border ${getStatusColor()}`}
        >
          {getConnectionIcon()}
          
          {/* Pending actions badge */}
          {pendingActions > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {pendingActions > 99 ? '99+' : pendingActions}
            </Badge>
          )}
          
          {/* Sync indicator */}
          {syncInProgress && (
            <RefreshCw className="absolute -bottom-1 -right-1 h-3 w-3 text-blue-500 animate-spin" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardContent className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium">네트워크 상태</h3>
              <Badge className={getStatusColor()}>
                {getStatusText()}
              </Badge>
            </div>

            {/* Connection details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">연결 유형</span>
                <span className="font-medium">{connectionType}</span>
              </div>
              
              {lastOnline && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">마지막 온라인</span>
                  <span className="font-medium">
                    {formatDistanceToNow(lastOnline, { addSuffix: true, locale: ko })}
                  </span>
                </div>
              )}
              
              {!isOnline && lastOffline && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">오프라인 시작</span>
                  <span className="font-medium">
                    {formatDistanceToNow(lastOffline, { addSuffix: true, locale: ko })}
                  </span>
                </div>
              )}
            </div>

            {/* Offline actions */}
            {pendingActions > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">대기 중인 작업</span>
                  <Badge variant="outline">{pendingActions}개</Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSync}
                    disabled={!isOnline || syncInProgress}
                    className="flex-1"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {syncInProgress ? '동기화 중...' : '지금 동기화'}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearOfflineActions}
                    className="text-red-600 hover:text-red-700"
                  >
                    삭제
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {!isOnline && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  className="w-full"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  연결 재시도
                </Button>
              )}

              {/* Cache info */}
              {cacheInfo && (
                <div className="border-t pt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">오프라인 캐시</span>
                  </div>
                  
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>총 크기</span>
                      <span>{formatCacheSize(cacheInfo.size?.total || 0)}</span>
                    </div>
                    
                    {Object.entries(cacheInfo.status || {}).map(([key, metadata]: [string, any]) => (
                      <div key={key} className="flex justify-between text-gray-500">
                        <span>{key}</span>
                        <span>{metadata.size}개 항목</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearCache}
                    className="w-full text-red-600 hover:text-red-700"
                  >
                    캐시 삭제
                  </Button>
                </div>
              )}
            </div>

            {/* Offline features info */}
            {!isOnline && (
              <div className="border-t pt-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="text-xs text-gray-600">
                    <p className="font-medium mb-1">오프라인 모드</p>
                    <ul className="space-y-0.5">
                      <li>• 저장된 데이터 보기</li>
                      <li>• 임시 작업 생성</li>
                      <li>• 온라인 시 자동 동기화</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

export default NetworkStatusIndicator;