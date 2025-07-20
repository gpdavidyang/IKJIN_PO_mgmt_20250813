/**
 * Email Verification Page
 * 
 * Handles email verification from link clicks
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Mail,
  ArrowRight 
} from 'lucide-react';

interface VerificationResult {
  success: boolean;
  message: string;
}

function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/verify-email');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      // Get token from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('유효하지 않은 인증 링크입니다.');
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        
        // Since the server redirects, we need to check the current URL
        const currentUrl = window.location.href;
        
        if (currentUrl.includes('verified=true')) {
          setStatus('success');
          setMessage('이메일 인증이 완료되었습니다. 이제 로그인하실 수 있습니다.');
        } else if (currentUrl.includes('error=verification_failed')) {
          setStatus('error');
          setMessage('유효하지 않거나 만료된 인증 토큰입니다.');
        } else if (currentUrl.includes('error=server_error')) {
          setStatus('error');
          setMessage('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else {
          // Fallback - check response directly if no redirect occurred
          if (response.ok) {
            setStatus('success');
            setMessage('이메일 인증이 완료되었습니다.');
          } else {
            const errorData = await response.json().catch(() => ({}));
            setStatus('error');
            setMessage(errorData.message || '인증 처리 중 오류가 발생했습니다.');
          }
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    };

    verifyEmail();
  }, []);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <CardHeader className="text-center space-y-4">
              <div className="flex items-center justify-center mb-4">
                <Loader2 className="h-20 w-20 text-blue-600 animate-spin" />
              </div>
              <CardTitle className="text-2xl font-bold">
                이메일 인증 중...
              </CardTitle>
              <CardDescription className="text-lg">
                잠시만 기다려주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  이메일 인증을 처리하고 있습니다. 잠시만 기다려주세요.
                </AlertDescription>
              </Alert>
            </CardContent>
          </>
        );

      case 'success':
        return (
          <>
            <CardHeader className="text-center space-y-4">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle2 className="h-20 w-20 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-700">
                이메일 인증 완료!
              </CardTitle>
              <CardDescription className="text-lg">
                {message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  계정이 성공적으로 활성화되었습니다. 
                  이제 익진종합건설 구매발주시스템에 로그인하실 수 있습니다.
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-4">
                <Button
                  onClick={() => setLocation('/login')}
                  size="lg"
                  className="gap-2"
                >
                  로그인하기
                  <ArrowRight className="h-4 w-4" />
                </Button>
                
                <p className="text-sm text-muted-foreground">
                  로그인 페이지로 이동하여 계정에 접속하세요.
                </p>
              </div>
            </CardContent>
          </>
        );

      case 'error':
        return (
          <>
            <CardHeader className="text-center space-y-4">
              <div className="flex items-center justify-center mb-4">
                <XCircle className="h-20 w-20 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-700">
                인증 실패
              </CardTitle>
              <CardDescription className="text-lg">
                {message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  이메일 인증에 실패했습니다. 다음 사항을 확인해주세요:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>인증 링크가 올바른지 확인</li>
                    <li>링크가 24시간 이내에 클릭되었는지 확인</li>
                    <li>이미 인증된 계정이 아닌지 확인</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setLocation('/register')}
                  >
                    다시 회원가입
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setLocation('/register-success')}
                  >
                    인증 이메일 재발송
                  </Button>
                  <Button
                    onClick={() => setLocation('/login')}
                  >
                    로그인 시도
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  문제가 계속된다면 관리자에게 문의해주세요.
                  <br />
                  <strong>관리자 이메일:</strong> admin@ikjin.co.kr
                </p>
              </div>
            </CardContent>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          {renderContent()}
        </Card>
      </div>
    </div>
  );
}

export default VerifyEmailPage;