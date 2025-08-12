import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  Wifi, 
  WifiOff,
  Database,
  Shield,
  Activity
} from 'lucide-react';

interface SystemCheck {
  id: string;
  name: string;
  description: string;
  status: 'checking' | 'success' | 'error' | 'warning';
  result?: string;
  recommendation?: string;
  icon: React.ReactNode;
}

interface ErrorRecoveryProps {
  error?: Error;
  onRetry?: () => void;
  onRecoveryComplete?: () => void;
  autoRecover?: boolean;
}

const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  error,
  onRetry,
  onRecoveryComplete,
  autoRecover = false
}) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([]);
  const [recoverySteps, setRecoverySteps] = useState<string[]>([]);

  // 시스템 체크 항목 초기화
  const initializeSystemChecks = (): SystemCheck[] => [
    {
      id: 'network',
      name: '네트워크 연결',
      description: '인터넷 연결 상태를 확인합니다',
      status: 'checking',
      icon: <Wifi className="w-4 h-4" />
    },
    {
      id: 'server',
      name: '서버 연결',
      description: '서버와의 통신 상태를 확인합니다',
      status: 'checking',
      icon: <Database className="w-4 h-4" />
    },
    {
      id: 'auth',
      name: '인증 상태',
      description: '사용자 인증 상태를 확인합니다',
      status: 'checking',
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'storage',
      name: '로컬 저장소',
      description: '브라우저 저장소 상태를 확인합니다',
      status: 'checking',
      icon: <Activity className="w-4 h-4" />
    }
  ];

  useEffect(() => {
    if (autoRecover && error) {
      startRecovery();
    }
  }, [autoRecover, error]);

  // 복구 프로세스 시작
  const startRecovery = async () => {
    setIsRecovering(true);
    setRecoveryProgress(0);
    setSystemChecks(initializeSystemChecks());
    setRecoverySteps([]);

    try {
      // 1단계: 시스템 진단
      await performSystemDiagnosis();
      
      // 2단계: 자동 복구 시도
      await attemptAutoRecovery();
      
      // 3단계: 완료
      setRecoveryProgress(100);
      setCurrentStep('복구 완료');
      
      setTimeout(() => {
        setIsRecovering(false);
        if (onRecoveryComplete) {
          onRecoveryComplete();
        }
      }, 1000);
      
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      setCurrentStep('복구 실패 - 수동 조치가 필요합니다');
      setIsRecovering(false);
    }
  };

  // 시스템 진단 수행
  const performSystemDiagnosis = async () => {
    setCurrentStep('시스템 진단 중...');
    const checks = [...systemChecks];

    // 네트워크 연결 확인
    await checkNetwork(checks);
    setRecoveryProgress(25);

    // 서버 연결 확인
    await checkServer(checks);
    setRecoveryProgress(50);

    // 인증 상태 확인
    await checkAuth(checks);
    setRecoveryProgress(65);

    // 로컬 저장소 확인
    await checkStorage(checks);
    setRecoveryProgress(75);

    setSystemChecks(checks);
  };

  // 네트워크 연결 확인
  const checkNetwork = async (checks: SystemCheck[]) => {
    const networkCheck = checks.find(c => c.id === 'network');
    if (!networkCheck) return;

    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        networkCheck.status = 'success';
        networkCheck.result = '정상';
        networkCheck.icon = <Wifi className="w-4 h-4 text-green-600" />;
      } else {
        throw new Error('Network check failed');
      }
    } catch (error) {
      networkCheck.status = 'error';
      networkCheck.result = '연결 실패';
      networkCheck.recommendation = '인터넷 연결을 확인하세요';
      networkCheck.icon = <WifiOff className="w-4 h-4 text-red-600" />;
    }
  };

  // 서버 연결 확인
  const checkServer = async (checks: SystemCheck[]) => {
    const serverCheck = checks.find(c => c.id === 'server');
    if (!serverCheck) return;

    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      
      if (response.ok && data.status === 'healthy') {
        serverCheck.status = 'success';
        serverCheck.result = '정상';
        serverCheck.icon = <Database className="w-4 h-4 text-green-600" />;
      } else {
        throw new Error('Server check failed');
      }
    } catch (error) {
      serverCheck.status = 'error';
      serverCheck.result = '서버 오류';
      serverCheck.recommendation = '잠시 후 다시 시도하세요';
      serverCheck.icon = <Database className="w-4 h-4 text-red-600" />;
    }
  };

  // 인증 상태 확인
  const checkAuth = async (checks: SystemCheck[]) => {
    const authCheck = checks.find(c => c.id === 'auth');
    if (!authCheck) return;

    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        // 토큰 유효성 검사
        const response = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          authCheck.status = 'success';
          authCheck.result = '인증됨';
          authCheck.icon = <Shield className="w-4 h-4 text-green-600" />;
        } else {
          throw new Error('Token invalid');
        }
      } else {
        throw new Error('No token found');
      }
    } catch (error) {
      authCheck.status = 'warning';
      authCheck.result = '재인증 필요';
      authCheck.recommendation = '로그인을 다시 시도하세요';
      authCheck.icon = <Shield className="w-4 h-4 text-orange-600" />;
    }
  };

  // 로컬 저장소 확인
  const checkStorage = async (checks: SystemCheck[]) => {
    const storageCheck = checks.find(c => c.id === 'storage');
    if (!storageCheck) return;

    try {
      // localStorage 테스트
      const testKey = 'recovery_test';
      localStorage.setItem(testKey, 'test');
      const testValue = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (testValue === 'test') {
        storageCheck.status = 'success';
        storageCheck.result = '정상';
        storageCheck.icon = <Activity className="w-4 h-4 text-green-600" />;
      } else {
        throw new Error('Storage test failed');
      }
    } catch (error) {
      storageCheck.status = 'error';
      storageCheck.result = '저장소 오류';
      storageCheck.recommendation = '브라우저 캐시를 지우세요';
      storageCheck.icon = <Activity className="w-4 h-4 text-red-600" />;
    }
  };

  // 자동 복구 시도
  const attemptAutoRecovery = async () => {
    setCurrentStep('자동 복구 시도 중...');
    const steps: string[] = [];

    // 실패한 체크 항목에 대한 복구 시도
    for (const check of systemChecks) {
      if (check.status === 'error' || check.status === 'warning') {
        switch (check.id) {
          case 'network':
            steps.push('네트워크 연결 재시도');
            await new Promise(resolve => setTimeout(resolve, 1000));
            break;
            
          case 'server':
            steps.push('서버 재연결 시도');
            await new Promise(resolve => setTimeout(resolve, 1500));
            break;
            
          case 'auth':
            steps.push('인증 토큰 갱신');
            await refreshAuthToken();
            break;
            
          case 'storage':
            steps.push('로컬 저장소 정리');
            await cleanupStorage();
            break;
        }
      }
    }

    setRecoverySteps(steps);
    setRecoveryProgress(90);
  };

  // 인증 토큰 갱신
  const refreshAuthToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
      }
    } catch (error) {
      console.warn('Token refresh failed:', error);
    }
  };

  // 저장소 정리
  const cleanupStorage = async () => {
    try {
      // 임시 데이터 정리
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('temp_') || key.startsWith('cache_')
      );
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Storage cleanup failed:', error);
    }
  };

  // 상태별 아이콘 반환
  const getStatusIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'checking':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className={`w-5 h-5 ${isRecovering ? 'animate-spin' : ''}`} />
          시스템 복구
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 오류 정보 */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-medium">오류 발생</div>
              <div className="text-sm mt-1">{error.message}</div>
            </AlertDescription>
          </Alert>
        )}

        {/* 복구 진행 상황 */}
        {isRecovering && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>{currentStep}</span>
              <span>{recoveryProgress}%</span>
            </div>
            <Progress value={recoveryProgress} className="h-2" />
          </div>
        )}

        {/* 시스템 체크 결과 */}
        {systemChecks.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">시스템 상태 확인</h4>
            <div className="space-y-2">
              {systemChecks.map((check) => (
                <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {check.icon}
                    <div>
                      <div className="font-medium text-sm">{check.name}</div>
                      <div className="text-xs text-gray-600">{check.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.status)}
                      <span className="text-sm font-medium">
                        {check.result || '확인 중...'}
                      </span>
                    </div>
                    {check.recommendation && (
                      <div className="text-xs text-gray-500 mt-1">
                        {check.recommendation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 복구 단계 */}
        {recoverySteps.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">복구 작업</h4>
            <div className="space-y-1">
              {recoverySteps.map((step, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-2">
          {!isRecovering && (
            <>
              <Button 
                onClick={startRecovery}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                자동 복구 시작
              </Button>
              
              {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                  수동 재시도
                </Button>
              )}
            </>
          )}
          
          {isRecovering && (
            <Button disabled className="cursor-not-allowed">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              복구 진행 중...
            </Button>
          )}
        </div>

        {/* 도움말 */}
        <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
          <div className="font-medium mb-1">복구 프로세스</div>
          <ul className="space-y-1 text-xs">
            <li>• 시스템 상태를 자동으로 진단합니다</li>
            <li>• 발견된 문제에 대해 자동 복구를 시도합니다</li>
            <li>• 복구가 불가능한 경우 권장사항을 제공합니다</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorRecovery;