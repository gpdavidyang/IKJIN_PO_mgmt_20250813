import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AccessibilityToolbar, 
  AccessibilityProvider,
  useTextSize,
  useMotion
} from "@/components/accessibility/accessibility-toolbar";
import { ContrastProvider, useContrast } from "@/components/accessibility/high-contrast";
import { FocusProvider, FocusTrap, SkipToContent } from "@/components/accessibility/focus-management";
import { 
  AccessibleFormField,
  AccessibleSelect,
  AccessibleAlert,
  AccessibleButton,
  AccessibleProgress
} from "@/components/accessibility/accessible-components";
import { 
  ScreenReaderOnly,
  LiveAnnouncement,
  LoadingAnnouncement,
  StatusAnnouncement
} from "@/components/accessibility/screen-reader";
import { 
  KeyboardNavigable,
  KeyboardTabs,
  useKeyboardShortcuts
} from "@/components/accessibility/keyboard-navigation";
import {
  CheckCircle,
  AlertCircle,
  Info,
  Keyboard,
  Eye,
  Type,
  Volume2,
  Settings,
  User,
  Mail,
  Building2
} from "lucide-react";

// Sample form data
interface FormData {
  name: string;
  email: string;
  company: string;
  role: string;
  department: string;
  message: string;
}

export function AccessibilityExample() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    role: "",
    department: "",
    message: ""
  });
  
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("form");
  const [showModal, setShowModal] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([]);

  // Accessibility context values
  const { textSize } = useTextSize();
  const { isHighContrast, contrastLevel } = useContrast();
  const { prefersReducedMotion } = useMotion();

  // Sample options for select
  const roleOptions = [
    { value: "developer", label: "개발자" },
    { value: "designer", label: "디자이너" },
    { value: "manager", label: "매니저" },
    { value: "admin", label: "관리자" }
  ];

  const departmentOptions = [
    { value: "engineering", label: "개발팀" },
    { value: "design", label: "디자인팀" },
    { value: "marketing", label: "마케팅팀" },
    { value: "sales", label: "영업팀" }
  ];

  // Form validation
  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};
    
    if (!formData.name.trim()) {
      errors.name = "이름은 필수 항목입니다";
    }
    
    if (!formData.email.trim()) {
      errors.email = "이메일은 필수 항목입니다";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "올바른 이메일 형식이 아닙니다";
    }
    
    if (!formData.company.trim()) {
      errors.company = "회사명은 필수 항목입니다";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSubmitStatus("error");
      return;
    }

    setIsSubmitting(true);
    setProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 500);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus("success");
      setProgress(100);
    }, 3000);
  };

  // Keyboard shortcuts
  const shortcuts = [
    {
      key: "s",
      ctrlKey: true,
      action: (e: KeyboardEvent) => {
        e.preventDefault();
        if (!isSubmitting) {
          handleSubmit(e as any);
        }
      },
      description: "폼 제출"
    },
    {
      key: "m",
      altKey: true,
      action: () => setShowModal(true),
      description: "모달 열기"
    }
  ];

  useKeyboardShortcuts(shortcuts);

  // Tab configuration
  const tabItems = [
    {
      id: "form",
      label: "접근성 폼",
      content: (
        <div className="space-y-6">
          <AccessibleAlert 
            type="info" 
            title="접근성 정보"
            dismissible
            onDismiss={() => {}}
          >
            이 폼은 WCAG 2.1 AA 기준을 준수하여 제작되었습니다. 
            키보드 탐색, 스크린 리더, 고대비 모드를 모두 지원합니다.
          </AccessibleAlert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AccessibleFormField
                id="name"
                label="이름"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
                error={formErrors.name}
                placeholder="이름을 입력하세요"
                autoComplete="name"
              />

              <AccessibleFormField
                id="email"
                label="이메일"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData({ ...formData, email: value })}
                required
                error={formErrors.email}
                placeholder="email@example.com"
                autoComplete="email"
              />
            </div>

            <AccessibleFormField
              id="company"
              label="회사명"
              value={formData.company}
              onChange={(value) => setFormData({ ...formData, company: value })}
              required
              error={formErrors.company}
              placeholder="회사명을 입력하세요"
              autoComplete="organization"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AccessibleSelect
                id="role"
                label="역할"
                value={formData.role}
                onChange={(value) => setFormData({ ...formData, role: value })}
                options={roleOptions}
                placeholder="역할을 선택하세요"
              />

              <AccessibleSelect
                id="department"
                label="부서"
                value={formData.department}
                onChange={(value) => setFormData({ ...formData, department: value })}
                options={departmentOptions}
                placeholder="부서를 선택하세요"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                메시지
              </label>
              <textarea
                id="message"
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="메시지를 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                aria-describedby="message-help"
              />
              <p id="message-help" className="mt-1 text-sm text-gray-500">
                선택사항: 추가 정보나 요청사항을 입력하세요.
              </p>
            </div>

            {isSubmitting && (
              <AccessibleProgress
                value={progress}
                label="폼 제출"
                announceChanges
                showPercentage
              />
            )}

            <div className="flex gap-3">
              <AccessibleButton
                type="submit"
                loading={isSubmitting}
                loadingText="제출 중..."
                disabled={isSubmitting}
              >
                제출하기 (Ctrl+S)
              </AccessibleButton>

              <AccessibleButton
                type="button"
                variant="secondary"
                onClick={() => setFormData({
                  name: "",
                  email: "",
                  company: "",
                  role: "",
                  department: "",
                  message: ""
                })}
                disabled={isSubmitting}
              >
                초기화
              </AccessibleButton>
            </div>
          </form>

          {submitStatus === "success" && (
            <AccessibleAlert type="success" title="제출 완료">
              폼이 성공적으로 제출되었습니다.
            </AccessibleAlert>
          )}

          {submitStatus === "error" && (
            <AccessibleAlert type="error" title="제출 실패">
              필수 항목을 모두 입력해주세요.
            </AccessibleAlert>
          )}

          <LoadingAnnouncement 
            isLoading={isSubmitting}
            loadingText="폼을 제출하는 중입니다..."
            completeText="폼 제출이 완료되었습니다"
          />

          <StatusAnnouncement
            status={submitStatus === "success" ? "폼이 성공적으로 제출되었습니다" : ""}
            type="success"
            announce={submitStatus === "success"}
          />
        </div>
      )
    },
    {
      id: "navigation",
      label: "키보드 내비게이션",
      content: (
        <div className="space-y-6">
          <AccessibleAlert type="info" title="키보드 내비게이션 테스트">
            Tab, Shift+Tab, 방향키, Enter, Space, Escape 키를 사용하여 탐색해보세요.
          </AccessibleAlert>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">포커스 가능한 요소들</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["버튼 1", "버튼 2", "버튼 3", "버튼 4"].map((label, index) => (
                <AccessibleButton
                  key={index}
                  variant={index % 2 === 0 ? "primary" : "secondary"}
                  onClick={() => setAnnouncements([...announcements, `${label} 클릭됨`])}
                >
                  {label}
                </AccessibleButton>
              ))}
            </div>
          </div>

          <KeyboardNavigable
            onNavigate={(direction) => {
              setAnnouncements([...announcements, `${direction} 방향으로 이동`]);
            }}
            onSelect={() => {
              setAnnouncements([...announcements, "항목 선택됨"]);
            }}
            onEscape={() => {
              setAnnouncements([...announcements, "Escape 키 눌림"]);
            }}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg"
          >
            <div className="text-center text-gray-600">
              <Keyboard className="h-8 w-8 mx-auto mb-2" />
              <p>방향키로 탐색, Enter로 선택, Escape로 종료</p>
            </div>
          </KeyboardNavigable>

          <div className="space-y-2">
            <h4 className="font-medium">키보드 액션 로그</h4>
            <div className="bg-gray-50 p-3 rounded-md h-32 overflow-y-auto">
              {announcements.length === 0 ? (
                <p className="text-gray-500 text-sm">키보드 액션이 여기에 표시됩니다</p>
              ) : (
                announcements.map((msg, index) => (
                  <div key={index} className="text-sm py-1">
                    {msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      id: "status",
      label: "접근성 상태",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  현재 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">글자 크기</span>
                  <Badge variant="outline">
                    {textSize === "small" && "작게"}
                    {textSize === "normal" && "보통"}
                    {textSize === "large" && "크게"}
                    {textSize === "extra-large" && "매우 크게"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">고대비 모드</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={isHighContrast ? "default" : "outline"}>
                      {isHighContrast ? "켜짐" : "꺼짐"}
                    </Badge>
                    {isHighContrast && (
                      <Badge variant="secondary" className="text-xs">
                        {contrastLevel}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">애니메이션 감소</span>
                  <Badge variant={prefersReducedMotion ? "default" : "outline"}>
                    {prefersReducedMotion ? "켜짐" : "꺼짐"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">키보드 단축키</span>
                  <Badge variant="default">활성화됨</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Accessibility Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  지원 기능
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "WCAG 2.1 AA 준수",
                  "키보드 탐색 지원",
                  "스크린 리더 최적화",
                  "고대비 모드",
                  "확대/축소 가능한 텍스트",
                  "포커스 관리",
                  "ARIA 레이블",
                  "실시간 알림"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Keyboard Shortcuts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Keyboard className="h-5 w-5 mr-2" />
                키보드 단축키
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { keys: "Ctrl + S", action: "폼 제출" },
                  { keys: "Alt + H", action: "고대비 모드 토글" },
                  { keys: "Ctrl + +", action: "글자 크기 확대" },
                  { keys: "Ctrl + -", action: "글자 크기 축소" },
                  { keys: "Alt + ?", action: "단축키 목록 보기" },
                  { keys: "Alt + M", action: "모달 열기" },
                  { keys: "Tab", action: "다음 요소로 이동" },
                  { keys: "Shift + Tab", action: "이전 요소로 이동" }
                ].map((shortcut, index) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <span className="text-sm">{shortcut.action}</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {shortcut.keys}
                    </code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  return (
    <AccessibilityProvider>
      <ContrastProvider>
        <FocusProvider>
          <div className="min-h-screen bg-gray-50">
            <AccessibilityToolbar />

            <main id="main-content" className="container mx-auto px-4 py-8">
              <div className="space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                  <h1 className="text-3xl font-bold text-gray-900">
                    접근성 구현 예시
                  </h1>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    WCAG 2.1 AA 기준을 준수한 완전한 접근성 구현을 보여주는 예시입니다. 
                    키보드 탐색, 스크린 리더, 고대비 모드를 모두 지원합니다.
                  </p>
                </div>

                {/* Main Content */}
                <Card>
                  <CardContent className="p-6">
                    <KeyboardTabs
                      tabs={tabItems}
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                    />
                  </CardContent>
                </Card>

                {/* Modal Example */}
                <div className="text-center">
                  <AccessibleButton
                    onClick={() => setShowModal(true)}
                    variant="secondary"
                  >
                    접근성 모달 열기 (Alt+M)
                  </AccessibleButton>
                </div>

                {/* Focus Trap Modal */}
                {showModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <FocusTrap enabled={showModal}>
                      <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                          <CardTitle>접근성 모달</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p>
                            이 모달은 포커스 트랩을 사용하여 키보드 탐색을 모달 내부로 제한합니다.
                          </p>
                          <div className="flex gap-2">
                            <AccessibleButton
                              onClick={() => setShowModal(false)}
                              variant="primary"
                            >
                              확인
                            </AccessibleButton>
                            <AccessibleButton
                              onClick={() => setShowModal(false)}
                              variant="secondary"
                            >
                              취소
                            </AccessibleButton>
                          </div>
                        </CardContent>
                      </Card>
                    </FocusTrap>
                  </div>
                )}
              </div>
            </main>

            <ScreenReaderOnly>
              <p>
                이 페이지는 웹 접근성 지침을 준수하여 제작되었습니다. 
                키보드만으로도 모든 기능을 사용할 수 있습니다.
              </p>
            </ScreenReaderOnly>

            {/* Live announcements for demonstration */}
            {announcements.length > 0 && (
              <LiveAnnouncement 
                message={announcements[announcements.length - 1]} 
                priority="polite"
              />
            )}
          </div>
        </FocusProvider>
      </ContrastProvider>
    </AccessibilityProvider>
  );
}