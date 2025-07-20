/**
 * Forgot Password Page
 * 
 * Allows users to request password reset via email
 */

import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  ArrowLeft, 
  Lock,
  Clock,
  CheckCircle2 
} from 'lucide-react';

interface ForgotPasswordResult {
  success: boolean;
  message: string;
}

function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string): Promise<ForgotPasswordResult> => {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '비밀번호 재설정 요청에 실패했습니다.');
      }

      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        setIsSubmitted(true);
        toast({
          title: '요청 완료',
          description: result.message,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: '요청 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
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

    forgotPasswordMutation.mutate(email);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
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
                이메일 발송 완료!
              </CardTitle>
              <CardDescription className="text-lg">
                비밀번호 재설정 링크를 이메일로 발송했습니다.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription className="text-base">
                  <strong>다음 단계:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li><strong>{email}</strong>로 발송된 이메일을 확인해주세요</li>
                    <li>'비밀번호 재설정하기' 버튼을 클릭해주세요</li>
                    <li>새로운 비밀번호를 설정해주세요</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>주의사항:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>재설정 링크는 2시간 후 만료됩니다</li>
                    <li>이메일이 오지 않았다면 스팸함을 확인해주세요</li>
                    <li>본인이 요청하지 않은 경우, 이 이메일을 무시해주세요</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail('');
                    }}
                  >
                    다시 요청하기
                  </Button>
                  <Button
                    onClick={() => setLocation('/login')}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    로그인 페이지로 돌아가기
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  문제가 계속된다면 관리자에게 문의해주세요.
                  <br />
                  <strong>관리자 이메일:</strong> admin@ikjin.co.kr
                </p>
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
            <CardTitle className="text-2xl font-bold">비밀번호 찾기</CardTitle>
            <CardDescription className="text-base">
              가입할 때 사용한 이메일 주소를 입력하시면
              <br />
              비밀번호 재설정 링크를 보내드립니다.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">이메일 주소</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@ikjin.co.kr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  입력하신 이메일 주소로 비밀번호 재설정 링크를 발송합니다.
                  이메일이 존재하지 않더라도 보안을 위해 동일한 메시지를 표시합니다.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    처리 중...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    재설정 링크 발송
                  </div>
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation('/login')}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  로그인 페이지로 돌아가기
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;