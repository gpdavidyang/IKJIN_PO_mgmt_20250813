/**
 * Reset Password Page
 * 
 * Allows users to set a new password using a reset token
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowRight,
  AlertCircle,
  Shield 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResetPasswordData {
  token: string;
  newPassword: string;
}

interface ResetPasswordResult {
  success: boolean;
  message: string;
}

function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Get token from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      toast({
        title: '오류',
        description: '유효하지 않은 재설정 링크입니다.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData): Promise<ResetPasswordResult> => {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '비밀번호 재설정에 실패했습니다.');
      }

      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        setIsSuccess(true);
        toast({
          title: '재설정 완료',
          description: result.message,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: '재설정 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return '비밀번호는 8자 이상이어야 합니다.';
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
      return '비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.';
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: '오류',
        description: '유효하지 않은 토큰입니다.',
        variant: 'destructive',
      });
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast({
        title: '입력 오류',
        description: '새 비밀번호와 확인 비밀번호를 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast({
        title: '비밀번호 오류',
        description: passwordError,
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: '비밀번호 불일치',
        description: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.',
        variant: 'destructive',
      });
      return;
    }

    resetPasswordMutation.mutate({
      token,
      newPassword,
    });
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthColors = ['bg-red-500', 'bg-red-400', 'bg-yellow-500', 'bg-yellow-400', 'bg-green-500'];
  const strengthLabels = ['매우 약함', '약함', '보통', '강함', '매우 강함'];

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center space-y-4">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle2 className="h-20 w-20 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-700">
                비밀번호 재설정 완료!
              </CardTitle>
              <CardDescription className="text-lg">
                새로운 비밀번호로 로그인하실 수 있습니다.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  비밀번호가 성공적으로 변경되었습니다. 
                  보안을 위해 새로운 비밀번호로 즉시 로그인해주세요.
                </AlertDescription>
              </Alert>

              <div className="text-center">
                <Button
                  onClick={() => setLocation('/login')}
                  size="lg"
                  className="w-full gap-2"
                >
                  로그인하기
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center space-y-4">
              <div className="flex items-center justify-center mb-4">
                <AlertCircle className="h-20 w-20 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-700">
                유효하지 않은 링크
              </CardTitle>
              <CardDescription className="text-lg">
                비밀번호 재설정 링크가 유효하지 않습니다.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  다음 사항을 확인해주세요:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>링크가 올바른지 확인</li>
                    <li>링크가 2시간 이내에 클릭되었는지 확인</li>
                    <li>이미 사용된 링크가 아닌지 확인</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-2">
                <Button
                  onClick={() => setLocation('/forgot-password')}
                  className="w-full"
                >
                  새로운 재설정 링크 요청
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setLocation('/login')}
                >
                  로그인 페이지로 이동
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Lock className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">새 비밀번호 설정</CardTitle>
            <CardDescription className="text-base">
              안전한 새 비밀번호를 설정해주세요.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="8자 이상, 대소문자/숫자/특수문자 포함"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={cn(
                            'h-2 flex-1 rounded',
                            level <= passwordStrength
                              ? strengthColors[Math.min(passwordStrength - 1, 4)]
                              : 'bg-gray-200'
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      비밀번호 강도: {strengthLabels[Math.min(passwordStrength - 1, 4)] || '매우 약함'}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="새 비밀번호를 다시 입력하세요"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-600">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>보안 정책:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>최소 8자 이상</li>
                    <li>대문자, 소문자, 숫자, 특수문자 각각 1개 이상</li>
                    <li>이전 비밀번호와 다른 비밀번호</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    처리 중...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    비밀번호 재설정
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ResetPasswordPage;