/**
 * Registration Success Page
 * 
 * Shows after successful registration, prompts for email verification
 */

import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  Mail, 
  Clock, 
  RefreshCw, 
  ArrowLeft,
  AlertCircle 
} from 'lucide-react';

interface ResendResult {
  success: boolean;
  message: string;
}

function RegisterSuccessPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [showResendForm, setShowResendForm] = useState(false);

  const resendMutation = useMutation({
    mutationFn: async (email: string): Promise<ResendResult> => {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '인증 이메일 재발송에 실패했습니다.');
      }

      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: '이메일 재발송 완료',
          description: result.message,
        });
        setShowResendForm(false);
        setEmail('');
      }
    },
    onError: (error: Error) => {
      toast({
        title: '재발송 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleResendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: '입력 오류',
        description: '이메일 주소를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: '입력 오류',
        description: '유효한 이메일 주소를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    resendMutation.mutate(email);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <CheckCircle2 className="h-20 w-20 text-green-600" />
                <Mail className="h-8 w-8 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-700">
              회원가입 신청 완료!
            </CardTitle>
            <CardDescription className="text-lg">
              이메일 인증을 통해 계정을 활성화해주세요.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription className="text-base">
                <strong>다음 단계:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>입력하신 이메일 주소로 인증 메일을 발송했습니다</li>
                  <li>이메일을 확인하고 '이메일 인증하기' 버튼을 클릭해주세요</li>
                  <li>인증 완료 후 로그인하실 수 있습니다</li>
                </ol>
              </AlertDescription>
            </Alert>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>주의사항:</strong> 인증 링크는 24시간 후 만료됩니다. 
                이메일이 오지 않았다면 스팸함을 확인하거나 아래에서 재발송을 요청해주세요.
              </AlertDescription>
            </Alert>

            {/* 이메일 재발송 섹션 */}
            <div className="border-t pt-6">
              {!showResendForm ? (
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">이메일을 받지 못하셨나요?</h3>
                  <p className="text-muted-foreground">
                    이메일이 도착하지 않았거나 스팸함에서도 찾을 수 없다면 재발송을 요청해주세요.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowResendForm(true)}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    인증 이메일 재발송
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResendSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resend-email">이메일 주소</Label>
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="가입할 때 사용한 이메일 주소"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={resendMutation.isPending}
                      className="flex-1 gap-2"
                    >
                      {resendMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          발송 중...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          재발송
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowResendForm(false);
                        setEmail('');
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* 문의 안내 */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                계속해서 문제가 발생한다면 시스템 관리자에게 문의해주세요.
                <br />
                <strong>관리자 이메일:</strong> admin@ikjin.co.kr
              </AlertDescription>
            </Alert>

            {/* 로그인 페이지로 이동 */}
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                이미 이메일 인증을 완료하셨나요?
              </p>
              <Button
                variant="ghost"
                onClick={() => setLocation('/login')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                로그인 페이지로 이동
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default RegisterSuccessPage;