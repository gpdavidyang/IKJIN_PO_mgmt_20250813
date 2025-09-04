import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Server, Key, TestTube, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// 이메일 설정 스키마
const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, "SMTP 호스트는 필수입니다"),
  smtpPort: z.string().regex(/^\d+$/, "포트는 숫자여야 합니다"),
  smtpUser: z.string().email("올바른 이메일 형식이 아닙니다"),
  smtpPass: z.string().min(1, "비밀번호는 필수입니다"),
});

type EmailSettings = z.infer<typeof emailSettingsSchema>;

export function EmailSettings() {
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmailSettings>({
    resolver: zodResolver(emailSettingsSchema),
  });

  // 현재 설정 가져오기
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ["emailSettings"],
    queryFn: async () => {
      const response = await fetch("/api/email-settings", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("설정을 가져오는데 실패했습니다");
      }
      const result = await response.json();
      return result.data as EmailSettings;
    },
  });

  // 설정 업데이트 mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EmailSettings) => {
      const response = await fetch("/api/email-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "설정 업데이트에 실패했습니다");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSuccessMessage(data.message || "설정이 업데이트되었습니다");
      setErrorMessage("");
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setSuccessMessage("");
    },
  });

  // 테스트 이메일 발송 mutation
  const testMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch("/api/email-settings/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ testEmail: email }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "테스트 이메일 발송에 실패했습니다");
      }
      return response.json();
    },
    onSuccess: () => {
      setTestDialogOpen(false);
      setSuccessMessage("테스트 이메일이 발송되었습니다");
      setTestEmail("");
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  // 현재 설정으로 폼 초기화
  useEffect(() => {
    if (currentSettings) {
      reset(currentSettings);
    }
  }, [currentSettings, reset]);

  const onSubmit = (data: EmailSettings) => {
    updateMutation.mutate(data);
  };

  const handleTestEmail = () => {
    if (!testEmail || !z.string().email().safeParse(testEmail).success) {
      setErrorMessage("유효한 이메일 주소를 입력해주세요");
      return;
    }
    testMutation.mutate(testEmail);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          이메일 발송 설정
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {successMessage && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">
                <Server className="inline h-4 w-4 mr-1" />
                SMTP 서버
              </Label>
              <Input
                id="smtpHost"
                {...register("smtpHost")}
                placeholder="smtp.naver.com"
              />
              {errors.smtpHost && (
                <span className="text-red-500 text-sm">
                  {errors.smtpHost.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpPort">
                포트
              </Label>
              <Input
                id="smtpPort"
                {...register("smtpPort")}
                placeholder="587"
              />
              {errors.smtpPort && (
                <span className="text-red-500 text-sm">
                  {errors.smtpPort.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpUser">
                <Mail className="inline h-4 w-4 mr-1" />
                발송자 이메일
              </Label>
              <Input
                id="smtpUser"
                type="email"
                {...register("smtpUser")}
                placeholder="example@naver.com"
              />
              {errors.smtpUser && (
                <span className="text-red-500 text-sm">
                  {errors.smtpUser.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpPass">
                <Key className="inline h-4 w-4 mr-1" />
                앱 비밀번호
              </Label>
              <Input
                id="smtpPass"
                type="password"
                {...register("smtpPass")}
                placeholder="앱 비밀번호 입력"
              />
              {errors.smtpPass && (
                <span className="text-red-500 text-sm">
                  {errors.smtpPass.message}
                </span>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">설정 안내</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Naver 메일: smtp.naver.com (포트 587)</li>
              <li>• Gmail: smtp.gmail.com (포트 587)</li>
              <li>• 앱 비밀번호는 2단계 인증 후 생성 필요</li>
              <li>• Naver: 메일 설정에서 POP3/SMTP 사용 활성화 필요</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTestDialogOpen(true)}
              disabled={updateMutation.isPending}
            >
              <TestTube className="h-4 w-4 mr-2" />
              테스트
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              저장
            </Button>
          </div>
        </form>

        {/* 테스트 이메일 다이얼로그 */}
        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>이메일 발송 테스트</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testEmail">테스트 수신 이메일</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              {errorMessage && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertDescription className="text-red-800">
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTestDialogOpen(false)}
                disabled={testMutation.isPending}
              >
                취소
              </Button>
              <Button
                onClick={handleTestEmail}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                발송
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}