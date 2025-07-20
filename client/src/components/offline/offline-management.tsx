/**
 * Offline Management Component
 * 
 * Admin interface for managing offline functionality:
 * - Cache status and management
 * - Offline actions monitoring
 * - Service Worker control
 * - Storage statistics
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  HardDrive,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Activity,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineCache } from '@/hooks/useOfflineAPI';
import { offlineStorage } from '@/lib/offline-storage';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ServiceWorkerStatus {
  registered: boolean;
  active: boolean;
  waiting: boolean;
  installing: boolean;
  controller: boolean;
  scope: string;
  scriptURL: string;
  state: string;
}

export function OfflineManagement() {
  const {
    isOnline,
    pendingActions,
    syncInProgress,
    syncOfflineActions,
    clearOfflineActions,
  } = useNetworkStatus();

  const { clearCache, getCacheStatus, exportCache } = useOfflineCache();

  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [swStatus, setSWStatus] = useState<ServiceWorkerStatus | null>(null);
  const [offlineActions, setOfflineActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load cache info
      const cache = await getCacheStatus();
      setCacheInfo(cache);

      // Load Service Worker status
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          setSWStatus({
            registered: true,
            active: !!registration.active,
            waiting: !!registration.waiting,
            installing: !!registration.installing,
            controller: !!navigator.serviceWorker.controller,
            scope: registration.scope,
            scriptURL: registration.active?.scriptURL || '',
            state: registration.active?.state || 'unknown',
          });
        } else {
          setSWStatus({
            registered: false,
            active: false,
            waiting: false,
            installing: false,
            controller: false,
            scope: '',
            scriptURL: '',
            state: 'none',
          });
        }
      }

      // Load offline actions
      const actions = await offlineStorage.getPendingActions();
      setOfflineActions(actions);

    } catch (error) {
      console.error('Failed to load offline data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get storage quota
  const [storageQuota, setStorageQuota] = useState<any>(null);
  useEffect(() => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        setStorageQuota(estimate);
      });
    }
  }, []);

  // Handle Service Worker actions
  const handleSWAction = async (action: 'update' | 'unregister') => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      switch (action) {
        case 'update':
          await registration.update();
          await loadData();
          break;
        case 'unregister':
          await registration.unregister();
          await loadData();
          break;
      }
    } catch (error) {
      console.error('Service Worker action failed:', error);
    }
  };

  // Handle offline action retry
  const handleRetryAction = async (actionId: string) => {
    try {
      // This would trigger a single action retry
      await syncOfflineActions();
      await loadData();
    } catch (error) {
      console.error('Failed to retry action:', error);
    }
  };

  // Handle offline action delete
  const handleDeleteAction = async (actionId: string) => {
    try {
      await offlineStorage.removeAction(actionId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete action:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            오프라인 관리
          </h1>
          <p className="text-gray-600">오프라인 기능 상태 및 캐시 관리</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          
          <Button variant="outline" onClick={exportCache}>
            <Download className="h-4 w-4 mr-2" />
            데이터 내보내기
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className={`h-5 w-5 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
              <div>
                <div className="text-2xl font-bold">
                  {isOnline ? '온라인' : '오프라인'}
                </div>
                <div className="text-sm text-gray-600">네트워크 상태</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{pendingActions}</div>
                <div className="text-sm text-gray-600">대기 중인 작업</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Zap className={`h-5 w-5 ${swStatus?.active ? 'text-green-500' : 'text-gray-400'}`} />
              <div>
                <div className="text-2xl font-bold">
                  {swStatus?.active ? '활성화' : '비활성화'}
                </div>
                <div className="text-sm text-gray-600">Service Worker</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {formatSize(cacheInfo?.size?.total || 0)}
                </div>
                <div className="text-sm text-gray-600">캐시 크기</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cache" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cache">캐시 관리</TabsTrigger>
          <TabsTrigger value="actions">오프라인 작업</TabsTrigger>
          <TabsTrigger value="service-worker">Service Worker</TabsTrigger>
          <TabsTrigger value="storage">저장소 정보</TabsTrigger>
        </TabsList>

        {/* Cache Management */}
        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>캐시 현황</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cacheInfo?.status && Object.entries(cacheInfo.status).map(([key, metadata]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{key}</div>
                    <div className="text-sm text-gray-600">
                      {metadata.size}개 항목 • {formatDistanceToNow(new Date(metadata.timestamp), { addSuffix: true, locale: ko })}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {formatSize(metadata.size * 1000)} {/* Approximate size */}
                  </Badge>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={clearCache} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  모든 캐시 삭제
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Offline Actions */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>오프라인 작업 대기열</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={syncOfflineActions}
                    disabled={!isOnline || syncInProgress}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {syncInProgress ? '동기화 중...' : '지금 동기화'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearOfflineActions}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    모두 삭제
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {offlineActions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  대기 중인 오프라인 작업이 없습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {offlineActions.map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{action.type}</Badge>
                          <span className="font-medium">{action.endpoint}</span>
                          {action.status === 'failed' && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {formatDistanceToNow(new Date(action.timestamp), { addSuffix: true, locale: ko })}
                          {action.retryCount > 0 && ` • ${action.retryCount}회 재시도`}
                          {action.error && ` • ${action.error}`}
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRetryAction(action.id)}
                          disabled={!isOnline}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAction(action.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Worker */}
        <TabsContent value="service-worker" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Worker 상태</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {swStatus ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {swStatus.registered ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span>등록됨</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {swStatus.active ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span>활성화</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {swStatus.controller ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span>제어 중</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">상태:</span>
                        <Badge variant="outline" className="ml-2">{swStatus.state}</Badge>
                      </div>
                      <div>
                        <span className="text-gray-600">범위:</span>
                        <code className="ml-2 text-xs">{swStatus.scope}</code>
                      </div>
                    </div>
                  </div>

                  {swStatus.scriptURL && (
                    <div className="text-sm">
                      <span className="text-gray-600">스크립트:</span>
                      <code className="ml-2 text-xs break-all">{swStatus.scriptURL}</code>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSWAction('update')}
                      disabled={!swStatus.registered}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      업데이트
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSWAction('unregister')}
                      disabled={!swStatus.registered}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      등록 해제
                    </Button>
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Service Worker가 지원되지 않거나 등록되지 않았습니다.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Info */}
        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>저장소 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {storageQuota && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>사용량</span>
                      <span>
                        {formatSize(storageQuota.usage || 0)} / {formatSize(storageQuota.quota || 0)}
                      </span>
                    </div>
                    <Progress 
                      value={storageQuota.quota ? (storageQuota.usage / storageQuota.quota) * 100 : 0} 
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">총 할당량:</span>
                      <span className="ml-2 font-medium">{formatSize(storageQuota.quota || 0)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">사용 중:</span>
                      <span className="ml-2 font-medium">{formatSize(storageQuota.usage || 0)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">남은 공간:</span>
                      <span className="ml-2 font-medium">
                        {formatSize((storageQuota.quota || 0) - (storageQuota.usage || 0))}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">사용률:</span>
                      <span className="ml-2 font-medium">
                        {storageQuota.quota ? 
                          ((storageQuota.usage / storageQuota.quota) * 100).toFixed(1) + '%' : 
                          '0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {cacheInfo?.size && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">저장소별 사용량</h4>
                  <div className="space-y-2">
                    {Object.entries(cacheInfo.size.stores).map(([store, size]: [string, any]) => (
                      <div key={store} className="flex justify-between text-sm">
                        <span className="text-gray-600">{store}</span>
                        <span>{formatSize(size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OfflineManagement;