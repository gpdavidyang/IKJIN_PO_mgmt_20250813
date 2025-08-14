import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, Building2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/components/ui/theme-provider";

const loginSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // 복사 함수
  const copyToClipboard = async (text: string, type: 'email' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(type);
      toast({
        title: "복사 완료",
        description: `${type === 'email' ? '이메일' : '비밀번호'}이 클립보드에 복사되었습니다.`,
      });
      
      // 2초 후 복사 상태 초기화
      setTimeout(() => {
        setCopiedItem(null);
      }, 2000);
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "클립보드 복사에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Don't render login form if user is already authenticated
  if (user) {
    return null; // Let the Router handle the redirect
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      await loginMutation.mutateAsync(data);
      toast({
        title: "로그인 성공",
        description: "환영합니다!",
      });
    } catch (error: any) {
      toast({
        title: "로그인 실패",
        description: error.message || "로그인에 실패했습니다",
        variant: "destructive",
      });
    }
  };

  const isLoading = loginMutation.isPending;

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-lg mb-4 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-100'}`}>
            <Building2 className={`h-8 w-8 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <h1 className={`text-2xl font-bold mb-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            발주 관리 시스템
          </h1>
          <p className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            계정에 로그인하여 시스템을 이용하세요
          </p>
        </div>

        <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`text-center transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>이메일</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="이메일을 입력하세요"
                          className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400' : 'bg-white border-gray-300'}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>비밀번호</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="비밀번호를 입력하세요"
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      로그인 중...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <LogIn className="h-4 w-4 mr-2" />
                      로그인
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className={`mt-8 text-center text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p className="mb-3">기본 로그인 정보:</p>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span>이메일: admin@company.com</span>
              <button
                onClick={() => copyToClipboard('admin@company.com', 'email')}
                className={`p-1 rounded transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                title="이메일 복사"
              >
                {copiedItem === 'email' ? (
                  <Check className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                ) : (
                  <Copy className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`} />
                )}
              </button>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span>비밀번호: admin123</span>
              <button
                onClick={() => copyToClipboard('admin123', 'password')}
                className={`p-1 rounded transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                title="비밀번호 복사"
              >
                {copiedItem === 'password' ? (
                  <Check className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                ) : (
                  <Copy className={`h-3 w-3 transition-colors ${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}