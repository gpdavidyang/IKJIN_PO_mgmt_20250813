import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useTheme } from "@/components/ui/theme-provider";
import { apiRequest } from "@/lib/queryClient";

const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, "비밀번호는 8글자 이상이어야 합니다")
    .max(128, "비밀번호는 128글자를 초과할 수 없습니다")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

interface TokenVerification {
  valid: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenVerification, setTokenVerification] = useState<TokenVerification | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Extract token from URL
  const urlParams = new URLSearchParams(search);
  const token = urlParams.get('token');

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenVerification({
          valid: false,
          message: "비밀번호 재설정 토큰이 없습니다.",
        });
        setIsVerifying(false);
        return;
      }

      try {
        const response = await apiRequest({
          endpoint: `/api/auth/verify-reset-token/${token}`,
          method: "GET",
        });

        setTokenVerification(response);
      } catch (error: any) {
        console.error("Token verification error:", error);
        setTokenVerification({
          valid: false,
          message: error.message || "토큰 검증에 실패했습니다.",
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (isLoading || !token) return;

    setIsLoading(true);
    try {
      await apiRequest({
        endpoint: "/api/auth/reset-password",
        method: "POST",
        data: {
          token,
          newPassword: data.newPassword,
        },
      });

      setIsSuccess(true);
      toast({
        title: "비밀번호 변경 완료",
        description: "새로운 비밀번호로 로그인해 주세요.",
      });
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast({
        title: "비밀번호 변경 실패",
        description: error.message || "비밀번호 변경 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isVerifying) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Card className={`w-full max-w-md transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              토큰을 검증하고 있습니다...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token state
  if (!tokenVerification?.valid) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="w-full max-w-md">
          <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <CardHeader className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 transition-colors ${isDarkMode ? 'bg-red-900/20' : 'bg-red-100'}`}>
                <AlertCircle className={`h-8 w-8 transition-colors ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
              </div>
              <CardTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                유효하지 않은 링크
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {tokenVerification?.message || "비밀번호 재설정 링크가 유효하지 않습니다."}
              </p>
              
              <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={`text-sm transition-colors ${isDarkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                  <strong>가능한 원인:</strong><br />
                  • 링크가 만료되었습니다 (1시간 제한)<br />
                  • 링크가 이미 사용되었습니다<br />
                  • 잘못된 링크입니다
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => setLocation("/forgot-password")}
                  className="w-full"
                >
                  새로운 재설정 링크 요청
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/login")}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  로그인으로 돌아가기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="w-full max-w-md">
          <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <CardHeader className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 transition-colors ${isDarkMode ? 'bg-green-900/20' : 'bg-green-100'}`}>
                <CheckCircle className={`h-8 w-8 transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <CardTitle className={`transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                비밀번호 변경 완료
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <strong>{tokenVerification.user?.name}</strong>님의<br />
                비밀번호가 성공적으로 변경되었습니다.
              </p>
              
              <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`text-sm transition-colors ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                  <strong>보안을 위해:</strong><br />
                  • 새로운 비밀번호는 안전한 곳에 보관하세요<br />
                  • 정기적으로 비밀번호를 변경하세요<br />
                  • 다른 사이트와 같은 비밀번호는 사용하지 마세요
                </p>
              </div>

              <Button
                onClick={() => setLocation("/login")}
                className="w-full"
              >
                새 비밀번호로 로그인하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-lg mb-4 transition-colors ${isDarkMode ? 'bg-green-900/20' : 'bg-green-100'}`}>
            <Lock className={`h-8 w-8 transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
          </div>
          <h1 className={`text-2xl font-bold mb-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            새 비밀번호 설정
          </h1>
          <p className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <strong>{tokenVerification.user?.name}</strong>님의<br />
            새로운 비밀번호를 설정해 주세요
          </p>
        </div>

        <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`text-center transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              비밀번호 재설정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        새 비밀번호 *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="새로운 비밀번호를 입력하세요"
                            className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400' : 'bg-white border-gray-300'}`}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={`absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent transition-colors ${isDarkMode ? 'hover:bg-gray-600/20' : 'hover:bg-transparent'}`}
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            ) : (
                              <Eye className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        새 비밀번호 확인 *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="새로운 비밀번호를 다시 입력하세요"
                            className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400' : 'bg-white border-gray-300'}`}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={`absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent transition-colors ${isDarkMode ? 'hover:bg-gray-600/20' : 'hover:bg-transparent'}`}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            ) : (
                              <Eye className={`h-4 w-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                    <strong>비밀번호 요구사항:</strong><br />
                    • 8글자 이상<br />
                    • 대문자, 소문자, 숫자 포함<br />
                    • 이전과 다른 비밀번호 사용 권장
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        변경 중...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Lock className="h-4 w-4 mr-2" />
                        비밀번호 변경하기
                      </div>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/login")}
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    로그인으로 돌아가기
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className={`mt-6 text-center text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-200'}`}>
            <p className="mb-2"><strong>⚠️ 보안 안내</strong></p>
            <ul className="text-left space-y-1">
              <li>• 이 링크는 1시간 후 만료됩니다</li>
              <li>• 링크는 한 번만 사용할 수 있습니다</li>
              <li>• 비밀번호 변경 후 모든 기기에서 다시 로그인해야 합니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}