import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Eye, EyeOff, Lock, Shield } from 'lucide-react';
import { Link } from 'wouter';

// Validation schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요"),
  newPassword: z.string()
    .min(8, "새 비밀번호는 8글자 이상이어야 합니다")
    .max(128, "새 비밀번호는 128글자를 초과할 수 없습니다")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "대문자, 소문자, 숫자를 각각 최소 1개씩 포함해야 합니다"),
  confirmPassword: z.string().min(1, "새 비밀번호를 다시 입력해주세요")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "새 비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"]
});

type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export function ChangePasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset
  } = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange'
  });

  // Watch new password for strength indicator
  const newPassword = watch('newPassword', '');

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    Object.values(checks).forEach(check => check && score++);

    if (score < 3) return { level: 'weak', color: 'text-red-600', bg: 'bg-red-100' };
    if (score < 4) return { level: 'medium', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'strong', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const onSubmit = async (data: ChangePasswordData) => {
    setIsSubmitting(true);
    setSubmitResult(null);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitResult('success');
        reset(); // Clear the form
      } else {
        setSubmitResult('error');
        setErrorMessage(result.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setSubmitResult('error');
      setErrorMessage('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (submitResult === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-700 dark:text-green-300">
              비밀번호 변경 완료
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              비밀번호가 성공적으로 변경되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                보안을 위해 새로운 비밀번호를 안전한 곳에 보관하세요.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/dashboard">대시보드로 돌아가기</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/profile">프로필 설정</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">비밀번호 변경</CardTitle>
          <CardDescription>
            보안을 위해 정기적으로 비밀번호를 변경해주세요.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {submitResult === 'error' && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium">현재 비밀번호</label>
              <div className="relative">
                <Input
                  {...register('currentPassword')}
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="현재 비밀번호를 입력하세요"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium">새 비밀번호</label>
              <div className="relative">
                <Input
                  {...register('newPassword')}
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="새 비밀번호를 입력하세요"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.newPassword.message}
                </p>
              )}
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className={`text-xs p-2 rounded ${passwordStrength.bg}`}>
                  <span className={passwordStrength.color}>
                    비밀번호 강도: {passwordStrength.level === 'weak' ? '약함' : passwordStrength.level === 'medium' ? '보통' : '강함'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium">새 비밀번호 확인</label>
              <div className="relative">
                <Input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Security Notice */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>비밀번호 보안 팁:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• 8글자 이상, 대소문자, 숫자 포함</li>
                  <li>• 개인정보나 추측하기 쉬운 단어 피하기</li>
                  <li>• 다른 사이트와 다른 비밀번호 사용</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting ? '변경 중...' : '비밀번호 변경'}
            </Button>

            {/* Navigation Links */}
            <div className="flex justify-between text-sm">
              <Link 
                href="/dashboard" 
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                대시보드로 돌아가기
              </Link>
              <Link 
                href="/forgot-password" 
                className="text-gray-600 dark:text-gray-400 hover:underline"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}