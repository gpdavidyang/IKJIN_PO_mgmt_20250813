import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Globe,
  Download,
  RefreshCw,
  Ban,
  UnlockKeyhole
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  blockRate: string;
  topBlockedIPs: { ip: string; count: number }[];
  topBlockedUsers: { userId: string; count: number }[];
  topBlockedEndpoints: { endpoint: string; count: number }[];
  period: string;
  timestamp: string;
}

interface RateLimitConfig {
  globalLimits: {
    ip: { windowMs: number; max: number };
    user: { windowMs: number; max: number };
  };
  roleLimits: Record<string, { windowMs: number; max: number }>;
  endpointLimits: Record<string, { windowMs: number; max: number }>;
  whitelist: string[];
  enabled: boolean;
}

interface MonitorData {
  currentActiveConnections: number;
  requestsPerMinute: number;
  topActiveIPs: { ip: string; count: number }[];
  recentBlocks: any[];
  systemStatus: {
    healthy: boolean;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
}

export function RateLimitMonitor() {
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [config, setConfig] = useState<RateLimitConfig | null>(null);
  const [monitor, setMonitor] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ipToUnblock, setIpToUnblock] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, configRes, monitorRes] = await Promise.all([
        fetch('/api/admin/rate-limit/stats', { credentials: 'include' }),
        fetch('/api/admin/rate-limit/config', { credentials: 'include' }),
        fetch('/api/admin/rate-limit/monitor', { credentials: 'include' }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData.data);
      }

      if (monitorRes.ok) {
        const monitorData = await monitorRes.json();
        setMonitor(monitorData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  // 통계 초기화
  const resetStats = async () => {
    try {
      const response = await fetch('/api/admin/rate-limit/reset-stats', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        await loadData();
        alert('통계가 초기화되었습니다.');
      } else {
        throw new Error('초기화 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '초기화 실패');
    }
  };

  // IP 차단 해제
  const unblockIP = async () => {
    if (!ipToUnblock.trim()) {
      alert('IP 주소를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/admin/rate-limit/unblock-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ip: ipToUnblock.trim() }),
      });

      if (response.ok) {
        setIpToUnblock('');
        await loadData();
        alert(`IP ${ipToUnblock}의 차단이 해제되었습니다.`);
      } else {
        throw new Error('차단 해제 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '차단 해제 실패');
    }
  };

  // 보고서 다운로드
  const downloadReport = async (format: 'json' | 'csv' = 'json') => {
    try {
      const response = await fetch(`/api/admin/rate-limit/report?format=${format}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rate-limit-report.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('보고서 다운로드 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '보고서 다운로드 실패');
    }
  };

  // 자동 새로고침
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, 30000); // 30초마다
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  useEffect(() => {
    loadData();
  }, []);

  // 파이 차트 색상
  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // 차트 데이터 준비
  const blockData = stats ? [
    { name: '정상 요청', value: stats.totalRequests - stats.blockedRequests, color: '#00C49F' },
    { name: '차단된 요청', value: stats.blockedRequests, color: '#FF8042' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Rate Limit 모니터링
          </h1>
          <p className="text-gray-600">API 요청 제한 현황을 실시간으로 모니터링합니다</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50' : ''}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? '자동 새로고침 중' : '자동 새로고침'}
          </Button>
          
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          
          <Button variant="outline" onClick={() => downloadReport('json')}>
            <Download className="h-4 w-4 mr-2" />
            보고서 다운로드
          </Button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 시스템 상태 */}
      {monitor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              시스템 상태
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {monitor.systemStatus.healthy ? '정상' : '경고'}
                </div>
                <div className="text-sm text-gray-600">시스템 상태</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {monitor.requestsPerMinute}
                </div>
                <div className="text-sm text-gray-600">분당 요청 수</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(monitor.systemStatus.memoryUsage.heapUsed / 1024 / 1024)}MB
                </div>
                <div className="text-sm text-gray-600">메모리 사용량</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(monitor.systemStatus.uptime / 3600)}h
                </div>
                <div className="text-sm text-gray-600">가동 시간</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 주요 통계 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">총 요청 수</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.blockedRequests.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">차단된 요청</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.blockRate}</div>
                  <div className="text-sm text-gray-600">차단율</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.topBlockedUsers.length}</div>
                  <div className="text-sm text-gray-600">차단된 사용자</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 차트 */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 요청 비율 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>요청 처리 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={blockData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                  >
                    {blockData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top 차단 IP */}
          <Card>
            <CardHeader>
              <CardTitle>차단된 IP Top 10</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.topBlockedIPs.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-mono text-sm">{item.ip}</span>
                    </div>
                    <Badge variant="destructive">{item.count}회</Badge>
                  </div>
                ))}
                {stats.topBlockedIPs.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    차단된 IP가 없습니다
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 상세 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 차단된 사용자 */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>차단된 사용자</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.topBlockedUsers.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="text-sm">{item.userId}</span>
                    </div>
                    <Badge variant="destructive">{item.count}회</Badge>
                  </div>
                ))}
                {stats.topBlockedUsers.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    차단된 사용자가 없습니다
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 차단된 엔드포인트 */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>차단된 엔드포인트</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.topBlockedEndpoints.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-mono text-xs">{item.endpoint}</span>
                    </div>
                    <Badge variant="destructive">{item.count}회</Badge>
                  </div>
                ))}
                {stats.topBlockedEndpoints.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    차단된 엔드포인트가 없습니다
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 관리 도구 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IP 차단 해제 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UnlockKeyhole className="h-5 w-5" />
              IP 차단 해제
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="IP 주소 입력 (예: 192.168.1.1)"
                value={ipToUnblock}
                onChange={(e) => setIpToUnblock(e.target.value)}
              />
              <Button onClick={unblockIP} disabled={!ipToUnblock.trim()}>
                차단 해제
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              특정 IP의 rate limit 차단을 해제합니다.
            </p>
          </CardContent>
        </Card>

        {/* 통계 초기화 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              통계 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetStats}>
                통계 초기화
              </Button>
              <Button variant="outline" onClick={() => downloadReport('csv')}>
                CSV 다운로드
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              모든 rate limit 통계를 초기화하거나 보고서를 다운로드합니다.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 설정 정보 */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>현재 Rate Limit 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 글로벌 제한 */}
              <div>
                <h4 className="font-medium mb-2">글로벌 제한</h4>
                <div className="space-y-1 text-sm">
                  <div>IP: {config.globalLimits.ip.max}개/15분</div>
                  <div>사용자: {config.globalLimits.user.max}개/15분</div>
                </div>
              </div>

              {/* 역할별 제한 */}
              <div>
                <h4 className="font-medium mb-2">역할별 제한</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(config.roleLimits).map(([role, limit]) => (
                    <div key={role}>
                      {role}: {limit.max}개/15분
                    </div>
                  ))}
                </div>
              </div>

              {/* 화이트리스트 */}
              <div>
                <h4 className="font-medium mb-2">화이트리스트</h4>
                <div className="space-y-1 text-sm">
                  {config.whitelist.length > 0 ? (
                    config.whitelist.map((ip, index) => (
                      <div key={index} className="font-mono">{ip}</div>
                    ))
                  ) : (
                    <div className="text-gray-500">없음</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RateLimitMonitor;