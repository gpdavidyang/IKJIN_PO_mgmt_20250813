import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/components/ui/theme-provider";
import { apiRequest } from "@/lib/queryClient";

const forgotPasswordSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState("");
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await apiRequest({
        endpoint: "/api/auth/forgot-password",
        method: "POST",
        data,
      });

      setEmailSent(data.email);
      setIsSuccess(true);
      toast({
        title: "이메일 발송 완료",
        description: "비밀번호 재설정 링크를 이메일로 발송했습니다.",
      });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      toast({
        title: "오류 발생",
        description: error.message || "비밀번호 재설정 요청 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                이메일 발송 완료
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <strong>{emailSent}</strong>로<br />
                비밀번호 재설정 링크를 발송했습니다.
              </p>
              
              <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <h3 className={`font-semibold mb-2 transition-colors ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  다음 단계
                </h3>
                <ul className={`text-sm space-y-1 text-left transition-colors ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                  <li>• 이메일함을 확인해 주세요</li>
                  <li>• 메일의 링크를 클릭하세요</li>
                  <li>• 새로운 비밀번호를 설정하세요</li>
                  <li>• 링크는 1시간 동안만 유효합니다</li>
                </ul>
              </div>

              <div className={`p-3 rounded-lg transition-colors ${isDarkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={`text-sm transition-colors ${isDarkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                  <strong>이메일이 보이지 않나요?</strong><br />
                  스팸함을 확인하거나 몇 분 후 다시 시도해 주세요.
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full"
                >
                  로그인 페이지로 돌아가기
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSuccess(false);
                    setEmailSent("");
                    form.reset();
                  }}
                  className="w-full"
                >
                  다른 이메일로 다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-lg mb-4 transition-colors ${isDarkMode ? 'bg-orange-900/20' : 'bg-orange-100'}`}>
            <Lock className={`h-8 w-8 transition-colors ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <h1 className={`text-2xl font-bold mb-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            비밀번호 찾기
          </h1>
          <p className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            등록된 이메일로 비밀번호 재설정 링크를 보내드립니다
          </p>
        </div>

        <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`text-center transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              이메일 주소 입력
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        이메일 주소
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <Input
                            type="email"
                            placeholder="등록된 이메일 주소를 입력하세요"
                            className={`pl-10 transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400' : 'bg-white border-gray-300'}`}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                  <h3 className={`font-semibold mb-2 transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    📧 이메일 발송 안내
                  </h3>
                  <ul className={`text-sm space-y-1 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <li>• 등록된 이메일 주소로만 발송됩니다</li>
                    <li>• 재설정 링크는 1시간 동안만 유효합니다</li>
                    <li>• 링크는 한 번만 사용할 수 있습니다</li>
                    <li>• 스팸함도 확인해 주세요</li>
                  </ul>
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
                        발송 중...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        비밀번호 재설정 이메일 발송
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
          <p>
            계정이 없으신가요?{" "}
            <button
              onClick={() => setLocation("/register")}
              className={`font-medium underline transition-colors ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
            >
              회원가입
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}