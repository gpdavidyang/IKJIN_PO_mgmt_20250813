import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, HelpCircle } from 'lucide-react';

interface TwoFactorVerifyProps {
  userId: string;
  onVerified: () => void;
  onCancel?: () => void;
}

export function TwoFactorVerify({ userId, onVerified, onCancel }: TwoFactorVerifyProps) {
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBackupCode, setShowBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 인증 코드 입력 처리
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // 한 자리만 허용
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    
    // 다음 입력 필드로 자동 이동
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      // 이전 입력 필드로 이동
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 코드 검증
  const verifyCode = async (code: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ userId, token: code })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '인증에 실패했습니다.');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // 세션에 2FA 인증 상태 저장
        const sessionResponse = await fetch('/api/auth/verify-2fa-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ userId })
        });
        
        if (result.data.usedBackupCode) {
          alert('백업 코드가 사용되었습니다. 새로운 백업 코드를 생성하는 것을 권장합니다.');
        }
        
        onVerified();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 인증 앱 코드로 검증
  const handleVerifyCode = () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('6자리 인증 코드를 모두 입력해주세요.');
      return;
    }
    verifyCode(code);
  };

  // 백업 코드로 검증
  const handleVerifyBackupCode = () => {
    if (!backupCode.trim()) {
      setError('백업 코드를 입력해주세요.');
      return;
    }
    verifyCode(backupCode.trim().toUpperCase());
  };

  // 코드 초기화
  const resetCode = () => {
    setVerificationCode(['', '', '', '', '', '']);
    setError(null);
    inputRefs.current[0]?.focus();
  };

  useEffect(() => {
    // 첫 번째 입력 필드에 포커스
    inputRefs.current[0]?.focus();
  }, []);

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5" />
            2단계 인증
          </CardTitle>
          <p className="text-sm text-gray-600">
            인증 앱에서 생성된 6자리 코드를 입력하세요
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!showBackupCode ? (
            // 인증 앱 코드 입력
            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                {verificationCode.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => inputRefs.current[index] = el}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg font-mono"
                    maxLength={1}
                    disabled={loading}
                  />
                ))}
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleVerifyCode}
                  disabled={loading || verificationCode.join('').length !== 6}
                  className="w-full"
                >
                  {loading ? '확인 중...' : '인증'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={resetCode}
                  disabled={loading}
                  className="w-full"
                >
                  다시 입력
                </Button>
              </div>
            </div>
          ) : (
            // 백업 코드 입력
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  백업 코드 입력
                </label>
                <Input
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  placeholder="XXXXXXXX"
                  className="font-mono text-center"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleVerifyBackupCode();
                    }
                  }}
                />
                <p className="text-xs text-gray-600 mt-1">
                  8자리 백업 코드를 입력하세요
                </p>
              </div>
              
              <Button 
                onClick={handleVerifyBackupCode}
                disabled={loading || !backupCode.trim()}
                className="w-full"
              >
                {loading ? '확인 중...' : '백업 코드로 인증'}
              </Button>
            </div>
          )}

          {/* 옵션 버튼들 */}
          <div className="space-y-2 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBackupCode(!showBackupCode)}
              disabled={loading}
              className="text-sm"
            >
              {showBackupCode ? '인증 앱 코드 사용' : '백업 코드 사용'}
            </Button>
            
            {onCancel && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  disabled={loading}
                  className="text-sm text-gray-500"
                >
                  로그인 취소
                </Button>
              </div>
            )}
          </div>

          {/* 도움말 */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">문제가 있나요?</p>
                <ul className="space-y-1 text-xs">
                  <li>• 인증 앱이 동기화되었는지 확인하세요</li>
                  <li>• 시간이 정확한지 확인하세요</li>
                  <li>• 코드를 다시 생성해보세요</li>
                  <li>• 백업 코드를 사용할 수 있습니다</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TwoFactorVerify;