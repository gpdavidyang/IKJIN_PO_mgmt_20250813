import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Download,
  Eye,
  Bug,
  Activity
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface CSRFStats {
  totalRequests: number;
  protectedRequests: number;
  blockedRequests: number;
  protectionRate: string;
  blockRate: string;
  blockReasons: Record<string, number>;
  topBlockedIPs: { ip: string; count: number }[];
  topBlockReasons: { reason: string; count: number }[];
  period: string;
  timestamp: string;
}

interface CSRFStatus {
  enabled: boolean;
  environment: string;
  cookieSettings: {
    secure: boolean;
    sameSite: string;
    httpOnly: boolean;
    maxAge: number;
  };
  protectedEndpoints: string[];
  ignoredMethods: string[];
  validationMethods: string[];
}

interface CSRFConfig {
  security: {
    enabled: boolean;
    secret: string;
    cookieName: string;
    headerName: string;
    tokenLength: number;
  };
  cookie: {
    secure: boolean;
    sameSite: string;
    httpOnly: boolean;
    maxAge: number;
  };
  validation: {
    methods: string[];
    ignoredMethods: string[];
    doubleSubmitCookie: boolean;
  };
  endpoints: {
    protected: string[];
    excluded: string[];
  };
  headers: Record<string, string>;
}

export function CSRFSecurityMonitor() {
  const [stats, setStats] = useState<CSRFStats | null>(null);
  const [status, setStatus] = useState<CSRFStatus | null>(null);
  const [config, setConfig] = useState<CSRFConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  // 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusRes, statsRes, configRes] = await Promise.all([
        fetch('/api/csrf/status', { credentials: 'include' }),
        fetch('/api/csrf/stats', { credentials: 'include' }),
        fetch('/api/csrf/config', { credentials: 'include' }),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData.data);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData.data);
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
      const response = await fetch('/api/csrf/reset-stats', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        await loadData();
        alert('CSRF 통계가 초기화되었습니다.');
      } else {
        throw new Error('초기화 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '초기화 실패');
    }
  };

  // 보안 테스트 실행
  const runSecurityTest = async (testType: 'basic' | 'advanced' | 'penetration' = 'basic') => {
    try {
      const response = await fetch('/api/csrf/security-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ testType }),
      });

      if (response.ok) {
        const testData = await response.json();
        setTestResults(testData.data);
      } else {
        throw new Error('보안 테스트 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '보안 테스트 실패');
    }
  };

  // 보고서 다운로드
  const downloadReport = async (format: 'json' | 'csv' = 'json') => {
    try {
      const response = await fetch(`/api/csrf/security-report?format=${format}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `csrf-security-report.${format}`;
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

  useEffect(() => {
    loadData();
  }, []);

  // 차트 데이터 준비
  const protectionData = stats ? [
    { name: '보호된 요청', value: stats.protectedRequests, color: '#00C49F' },
    { name: '일반 요청', value: stats.totalRequests - stats.protectedRequests, color: '#0088FE' },
  ] : [];

  const blockData = stats?.topBlockReasons.map((item, index) => ({
    reason: item.reason,
    count: item.count,
    color: ['#FF8042', '#FFBB28', '#00C49F', '#0088FE', '#8884D8'][index % 5]
  })) || [];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            CSRF 보안 모니터링
          </h1>
          <p className="text-gray-600">Cross-Site Request Forgery 공격 방어 현황을 모니터링합니다</p>
        </div>
        
        <div className="flex gap-2">
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

      {/* 보안 상태 요약 */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Lock className={`h-5 w-5 ${status.enabled ? 'text-green-500' : 'text-red-500'}`} />
                <div>
                  <div className="text-2xl font-bold">
                    {status.enabled ? '활성화' : '비활성화'}
                  </div>
                  <div className="text-sm text-gray-600">CSRF 보호</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{status.environment}</div>
                  <div className="text-sm text-gray-600">실행 환경</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{status.protectedEndpoints.length}</div>
                  <div className="text-sm text-gray-600">보호된 엔드포인트</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{status.validationMethods.length}</div>
                  <div className="text-sm text-gray-600">검증 방법</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 통계 대시보드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
              <div className="text-sm text-gray-600">총 요청 수</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">{stats.protectedRequests.toLocaleString()}</div>
              <div className="text-sm text-gray-600">보호된 요청</div>
              <div className="text-xs text-blue-600">{stats.protectionRate}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-red-600">{stats.blockedRequests.toLocaleString()}</div>
              <div className="text-sm text-gray-600">차단된 요청</div>
              <div className="text-xs text-red-600">{stats.blockRate}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-orange-600">{stats.topBlockedIPs.length}</div>
              <div className="text-sm text-gray-600">차단된 IP</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 차트 */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 보호 비율 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>요청 보호 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={protectionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                  >
                    {protectionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 차단 이유 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>차단 이유별 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={blockData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="reason" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 보안 테스트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            보안 테스트 (개발 환경)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => runSecurityTest('basic')}>
              기본 테스트
            </Button>
            <Button variant="outline" onClick={() => runSecurityTest('advanced')}>
              고급 테스트
            </Button>
            <Button variant="outline" onClick={() => runSecurityTest('penetration')}>
              침투 테스트
            </Button>
          </div>

          {testResults && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={testResults.score === '100%' ? 'default' : 'secondary'}>
                  {testResults.score}
                </Badge>
                <span className="font-medium">{testResults.testName}</span>
                <span className="text-sm text-gray-600">
                  ({testResults.passed}/{testResults.total} 통과)
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {testResults.checks.map((check: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    {check.passed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">{check.name}</span>
                  </div>
                ))}
              </div>

              {testResults.recommendations.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">개선 권장사항:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {testResults.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 설정 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 보호된 엔드포인트 */}
        {status && (
          <Card>
            <CardHeader>
              <CardTitle>보호된 엔드포인트</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {status.protectedEndpoints.map((endpoint, index) => (
                  <div key={index} className="text-sm font-mono p-2 bg-gray-50 rounded">
                    {endpoint}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 보안 설정 */}
        {config && (
          <Card>
            <CardHeader>
              <CardTitle>보안 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">쿠키 설정</h4>
                <div className="text-sm space-y-1">
                  <div>Secure: {config.cookie.secure ? '✅' : '❌'}</div>
                  <div>SameSite: {config.cookie.sameSite}</div>
                  <div>HttpOnly: {config.cookie.httpOnly ? '✅' : '❌'}</div>
                  <div>MaxAge: {Math.round(config.cookie.maxAge / 1000 / 60)}분</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium">검증 방법</h4>
                <div className="text-sm space-y-1">
                  {config.validation.methods.map((method, index) => (
                    <div key={index}>• {method}</div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium">보안 헤더</h4>
                <div className="text-sm space-y-1">
                  {Object.entries(config.headers).map(([header, value]) => (
                    <div key={header} className="font-mono">
                      {header}: {value}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 차단된 IP 및 관리 */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>차단된 IP 목록</span>
              <Button variant="outline" size="sm" onClick={resetStats}>
                통계 초기화
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topBlockedIPs.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-mono">{item.ip}</span>
                  </div>
                  <Badge variant="destructive">{item.count}회 차단</Badge>
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
      )}
    </div>
  );
}

export default CSRFSecurityMonitor;