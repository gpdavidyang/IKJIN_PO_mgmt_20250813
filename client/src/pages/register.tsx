import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Building2, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/components/ui/theme-provider";
import { apiRequest } from "@/lib/queryClient";

const registrationSchema = z.object({
  email: z.string()
    .email("유효한 이메일 주소를 입력해주세요")
    .max(254, "이메일이 너무 깁니다")
    .toLowerCase()
    .refine((email) => {
      // Client-side security check
      const dangerousPatterns = [/<script/i, /javascript:/i, /on\w+=/i];
      return !dangerousPatterns.some(pattern => pattern.test(email));
    }, "이메일에 허용되지 않은 문자가 포함되어 있습니다"),
  name: z.string()
    .min(2, "이름은 2글자 이상이어야 합니다")
    .max(50, "이름은 50글자를 초과할 수 없습니다")
    .regex(/^[가-힣a-zA-Z\s.-]+$/, "이름에는 한글, 영문, 공백, '.', '-'만 포함할 수 있습니다"),
  phoneNumber: z.string()
    .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, "올바른 휴대폰 번호 형식이 아닙니다")
    .transform(phone => phone.replace(/-/g, '')) // Remove hyphens
    .optional()
    .or(z.literal("")),
  password: z.string()
    .min(8, "비밀번호는 8글자 이상이어야 합니다")
    .max(128, "비밀번호는 128글자를 초과할 수 없습니다")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "비밀번호는 대문자, 소문자, 숫자를 각각 최소 1개씩 포함해야 합니다")
    .refine((password) => {
      // Check against common weak passwords
      const weakPasswords = ['password', '12345678', 'qwerty123', 'admin123'];
      return !weakPasswords.includes(password.toLowerCase());
    }, "너무 간단한 비밀번호입니다"),
  confirmPassword: z.string(),
  requestedRole: z.enum(["field_worker", "project_manager", "hq_management", "executive"]).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type RegistrationForm = z.infer<typeof registrationSchema>;

const roleOptions = [
  { value: "field_worker", label: "현장 작업자" },
  { value: "project_manager", label: "프로젝트 관리자" },
  { value: "hq_management", label: "본사 관리자" },
  { value: "executive", label: "경영진" },
];

export default function RegisterPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: "",
      name: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      requestedRole: "field_worker",
    },
  });

  const onSubmit = async (data: RegistrationForm) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const { confirmPassword, ...registrationData } = data;
      
      await apiRequest({
        endpoint: "/api/auth/register",
        method: "POST",
        data: {
          ...registrationData,
          phoneNumber: registrationData.phoneNumber || undefined,
        },
      });

      setIsSuccess(true);
      toast({
        title: "회원가입 신청 완료",
        description: "관리자 승인 후 이메일로 결과를 안내드립니다.",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "회원가입 실패",
        description: error.message || "회원가입 처리 중 오류가 발생했습니다",
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
                회원가입 신청 완료
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                회원가입 신청이 성공적으로 접수되었습니다.
              </p>
              <div className={`p-4 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <h3 className={`font-semibold mb-2 transition-colors ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  다음 단계
                </h3>
                <ul className={`text-sm space-y-1 text-left transition-colors ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                  <li>• 관리자가 신청 내용을 검토합니다</li>
                  <li>• 승인 완료 후 이메일로 안내드립니다</li>
                  <li>• 승인되면 즉시 로그인이 가능합니다</li>
                </ul>
              </div>
              <p className={`text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <strong>검토 소요시간:</strong> 영업일 기준 1-2일
              </p>
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
                    form.reset();
                  }}
                  className="w-full"
                >
                  다른 계정으로 신청하기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-8 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-lg mb-4 transition-colors ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-100'}`}>
            <Building2 className={`h-8 w-8 transition-colors ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <h1 className={`text-2xl font-bold mb-2 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            발주 관리 시스템
          </h1>
          <p className={`transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            회원가입을 통해 시스템을 이용하세요
          </p>
        </div>

        <Card className={`transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`text-center transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              회원가입
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        이메일 *
                      </FormLabel>
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        이름 *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="이름을 입력하세요"
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
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        전화번호
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="전화번호를 입력하세요 (선택사항)"
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
                  name="requestedRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        요청 권한 *
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'}`}>
                            <SelectValue placeholder="권한을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={`transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                          {roleOptions.map((option) => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                              className={`transition-colors ${isDarkMode ? 'text-gray-100 hover:bg-gray-600' : 'text-gray-900 hover:bg-gray-100'}`}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        비밀번호 *
                      </FormLabel>
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

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        비밀번호 확인 *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="비밀번호를 다시 입력하세요"
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
                    • 대문자, 소문자, 숫자 포함
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
                        처리 중...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <UserPlus className="h-4 w-4 mr-2" />
                        회원가입 신청
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
            <p className="mb-2"><strong>안내사항:</strong></p>
            <ul className="text-left space-y-1">
              <li>• 관리자 승인 후 계정이 활성화됩니다</li>
              <li>• 승인 결과는 이메일로 안내드립니다</li>
              <li>• 문의사항이 있으시면 관리자에게 연락해 주세요</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}