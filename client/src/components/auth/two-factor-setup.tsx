import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  QrCode, 
  Copy, 
  CheckCircle, 
  AlertTriangle, 
  RotateCcw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TwoFactorSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

interface TwoFactorStatus {
  enabled: boolean;
  backupCodesCount: number;
  hasSecret: boolean;
}

export function TwoFactorSetup() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'complete'>('status');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // 2FA 상태 조회
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/2fa/status', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('상태 조회에 실패했습니다.');
      }
      
      const result = await response.json();
      setStatus(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 2FA 설정 시작
  const startSetup = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '설정에 실패했습니다.');
      }
      
      const result = await response.json();
      setSetupData(result.data);
      setStep('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 2FA 활성화
  const enableTwoFactor = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('6자리 인증 코드를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ token: verificationCode })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '활성화에 실패했습니다.');
      }
      
      setSuccess('2FA가 성공적으로 활성화되었습니다.');
      setStep('complete');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 2FA 비활성화
  const disableTwoFactor = async () => {
    const code = prompt('2FA를 비활성화하려면 인증 코드 또는 백업 코드를 입력하세요:');
    if (!code) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ token: code })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '비활성화에 실패했습니다.');
      }
      
      setSuccess('2FA가 성공적으로 비활성화되었습니다.');
      setStep('status');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 백업 코드 재생성
  const regenerateBackupCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/2fa/regenerate-backup-codes', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '백업 코드 재생성에 실패했습니다.');
      }
      
      const result = await response.json();
      if (setupData) {
        setSetupData({
          ...setupData,
          backupCodes: result.data.backupCodes
        });
      }
      setSuccess('새로운 백업 코드가 생성되었습니다.');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 클립보드 복사
  const copyToClipboard = async (text: string, type: 'secret' | 'backup') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'secret') {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      } else {
        setCopiedBackup(true);
        setTimeout(() => setCopiedBackup(false), 2000);
      }
    } catch (err) {
      setError('클립보드 복사에 실패했습니다.');
    }
  };

  // 백업 코드 다운로드
  const downloadBackupCodes = () => {
    if (!setupData) return;
    
    const content = [
      '2FA 백업 코드',
      '==============',
      '',
      '다음 백업 코드들을 안전한 곳에 보관하세요.',
      '각 코드는 한 번만 사용할 수 있습니다.',
      '',
      ...setupData.backupCodes.map((code, index) => `${index + 1}. ${code}`),
      '',
      `생성일시: ${new Date().toLocaleString('ko-KR')}`,
    ].join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `2fa-backup-codes-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading && !status) {
    return <div className="flex justify-center p-8">로딩 중...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 에러/성공 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* 2FA 상태 카드 */}
      {step === 'status' && status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              2단계 인증 (2FA)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  2단계 인증 상태: {' '}
                  <Badge variant={status.enabled ? "default" : "secondary"}>
                    {status.enabled ? '활성화됨' : '비활성화됨'}
                  </Badge>
                </p>
                {status.enabled && (
                  <p className="text-sm text-gray-600 mt-1">
                    백업 코드: {status.backupCodesCount}개 남음
                  </p>
                )}
              </div>
              
              <div className="space-x-2">
                {status.enabled ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={regenerateBackupCodes}
                      disabled={loading}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      백업 코드 재생성
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={disableTwoFactor}
                      disabled={loading}
                    >
                      비활성화
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={startSetup}
                    disabled={loading}
                  >
                    2FA 설정하기
                  </Button>
                )}
              </div>
            </div>
            
            {status.enabled && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  2FA가 활성화되어 있습니다
                </p>
                <p className="text-sm text-blue-700">
                  계정 보안이 강화되었습니다. 로그인 시 인증 앱에서 생성된 6자리 코드를 입력해야 합니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2FA 설정 카드 */}
      {step === 'setup' && setupData && (
        <Card>
          <CardHeader>
            <CardTitle>2FA 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR 코드 */}
            <div className="text-center">
              <p className="font-medium mb-4">1. 인증 앱에서 QR 코드를 스캔하세요</p>
              <div className="bg-white p-4 rounded-lg border inline-block">
                <img 
                  src={setupData.qrCodeUrl} 
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Google Authenticator, Authy, 1Password 등의 앱을 사용할 수 있습니다.
              </p>
            </div>

            {/* 수동 입력 */}
            <div>
              <p className="font-medium mb-2">2. 또는 수동으로 키를 입력하세요</p>
              <div className="flex items-center gap-2">
                <Input
                  value={setupData.manualEntryKey}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(setupData.manualEntryKey, 'secret')}
                >
                  {copiedSecret ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* 백업 코드 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">3. 백업 코드를 안전한 곳에 저장하세요</p>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBackupCodes(!showBackupCodes)}
                  >
                    {showBackupCodes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showBackupCodes ? '숨기기' : '보기'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadBackupCodes}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    다운로드
                  </Button>
                </div>
              </div>
              
              {showBackupCodes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {setupData.backupCodes.map((code, index) => (
                      <div key={index} className="font-mono text-sm p-2 bg-white rounded border">
                        {index + 1}. {code}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      각 코드는 한 번만 사용할 수 있습니다.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(setupData.backupCodes.join('\n'), 'backup')}
                    >
                      {copiedBackup ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      전체 복사
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 인증 코드 입력 */}
            <div>
              <Label htmlFor="verification-code">4. 인증 앱에서 6자리 코드를 입력하세요</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="font-mono text-center text-lg"
                  maxLength={6}
                />
                <Button 
                  onClick={enableTwoFactor}
                  disabled={loading || verificationCode.length !== 6}
                >
                  {loading ? '확인 중...' : '활성화'}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('status')}
                disabled={loading}
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 완료 카드 */}
      {step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              2FA 설정 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              2단계 인증이 성공적으로 활성화되었습니다. 이제 로그인 시 인증 앱에서 생성된 코드를 입력해야 합니다.
            </p>
            <Button onClick={() => setStep('status')}>
              확인
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TwoFactorSetup;