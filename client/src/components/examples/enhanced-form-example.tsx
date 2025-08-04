import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormSelect } from "@/components/ui/form-select";
import { FormCheckbox } from "@/components/ui/form-checkbox";
import { FormRadioGroup } from "@/components/ui/form-radio-group";
import { FormProgress, FormProgressBar } from "@/components/ui/form-progress";
import { ArrowLeft, ArrowRight, Save, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// Example multi-step form with validation
export function EnhancedFormExample() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    name: "",
    email: "",
    phone: "",
    company: "",
    
    // Step 2: Project Details
    projectType: "",
    budget: "",
    timeline: "",
    description: "",
    
    // Step 3: Additional Options
    priority: "normal",
    notifications: true,
    termsAccepted: false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [autoSaved, setAutoSaved] = useState(false);

  const steps = [
    { id: "basic", title: "기본 정보", description: "연락처 정보" },
    { id: "project", title: "프로젝트 정보", description: "프로젝트 세부사항" },
    { id: "options", title: "추가 옵션", description: "기타 설정" },
  ];

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? "" : "올바른 이메일 주소를 입력해주세요";
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9-+() ]+$/;
    return phoneRegex.test(phone) ? "" : "올바른 전화번호를 입력해주세요";
  };

  const validateField = async (field: string, value: string) => {
    setValidating({ ...validating, [field]: true });
    
    // Simulate async validation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let error = "";
    
    switch (field) {
      case "name":
        error = value.length < 2 ? "이름은 2자 이상이어야 합니다" : "";
        break;
      case "email":
        error = validateEmail(value);
        break;
      case "phone":
        error = value ? validatePhone(value) : "";
        break;
      case "company":
        error = value.length < 2 ? "회사명은 2자 이상이어야 합니다" : "";
        break;
      case "projectType":
        error = !value ? "프로젝트 유형을 선택해주세요" : "";
        break;
      case "budget":
        error = !value ? "예산 범위를 선택해주세요" : "";
        break;
    }
    
    setErrors({ ...errors, [field]: error });
    setValidating({ ...validating, [field]: false });
  };

  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleAutoSave = async () => {
    console.log("Auto-saving form data:", formData);
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 2000);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.name && formData.email && formData.company && 
               !errors.name && !errors.email && !errors.company;
      case 1:
        return formData.projectType && formData.budget;
      case 2:
        return formData.termsAccepted;
      default:
        return true;
    }
  };

  const handleSubmit = () => {
    console.log("Submitting form:", formData);
    alert("폼이 성공적으로 제출되었습니다!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Form Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Step Form with Enhanced Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <FormProgress 
            steps={steps} 
            currentStep={currentStep}
            onStepClick={setCurrentStep}
            allowStepClick={true}
          />
        </CardContent>
      </Card>

      {/* Form Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{steps[currentStep].title}</CardTitle>
            {autoSaved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Save className="h-4 w-4" />
                자동 저장됨
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <FormField
                label="이름"
                name="name"
                value={formData.name}
                onChange={(value) => updateFormData("name", value)}
                onBlur={() => validateField("name", formData.name)}
                required
                error={errors.name}
                validating={validating.name}
                helperText="실명을 입력해주세요"
                autoSave
                onAutoSave={handleAutoSave}
              />
              
              <FormField
                label="이메일"
                name="email"
                type="email"
                value={formData.email}
                onChange={(value) => updateFormData("email", value)}
                onBlur={() => validateField("email", formData.email)}
                required
                error={errors.email}
                validating={validating.email}
                tooltip="업무용 이메일 주소를 입력해주세요"
                autoSave
                onAutoSave={handleAutoSave}
              />
              
              <FormField
                label="전화번호"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(value) => updateFormData("phone", value)}
                onBlur={() => validateField("phone", formData.phone)}
                error={errors.phone}
                validating={validating.phone}
                placeholder="010-0000-0000"
                helperText="선택사항입니다"
              />
              
              <FormField
                label="회사명"
                name="company"
                value={formData.company}
                onChange={(value) => updateFormData("company", value)}
                onBlur={() => validateField("company", formData.company)}
                required
                error={errors.company}
                validating={validating.company}
                autoSave
                onAutoSave={handleAutoSave}
              />
            </div>
          )}

          {/* Step 2: Project Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <FormSelect
                label="프로젝트 유형"
                name="projectType"
                value={formData.projectType}
                onChange={(value) => updateFormData("projectType", value)}
                onBlur={() => validateField("projectType", formData.projectType)}
                required
                error={errors.projectType}
                options={[
                  { value: "construction", label: "건설/건축" },
                  { value: "civil", label: "토목공사" },
                  { value: "electrical", label: "전기공사" },
                  { value: "plumbing", label: "배관공사" },
                  { value: "other", label: "기타" },
                ]}
                helperText="주요 프로젝트 유형을 선택해주세요"
              />
              
              <FormSelect
                label="예산 범위"
                name="budget"
                value={formData.budget}
                onChange={(value) => updateFormData("budget", value)}
                onBlur={() => validateField("budget", formData.budget)}
                required
                error={errors.budget}
                options={[
                  { value: "small", label: "1천만원 미만" },
                  { value: "medium", label: "1천만원 - 5천만원" },
                  { value: "large", label: "5천만원 - 1억원" },
                  { value: "xlarge", label: "1억원 이상" },
                ]}
                tooltip="대략적인 예산 범위를 선택해주세요"
              />
              
              <FormRadioGroup
                label="예상 일정"
                name="timeline"
                value={formData.timeline}
                onChange={(value) => updateFormData("timeline", value)}
                options={[
                  { value: "urgent", label: "긴급 (1개월 이내)", helperText: "빠른 처리가 필요한 경우" },
                  { value: "normal", label: "일반 (1-3개월)" },
                  { value: "long", label: "장기 (3개월 이상)" },
                ]}
                orientation="vertical"
              />
              
              <FormField
                label="프로젝트 설명"
                name="description"
                type="textarea"
                value={formData.description}
                onChange={(value) => updateFormData("description", value)}
                rows={4}
                maxLength={500}
                helperText="프로젝트에 대한 간단한 설명을 입력해주세요"
                autoSave
                onAutoSave={handleAutoSave}
              />
            </div>
          )}

          {/* Step 3: Additional Options */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <FormRadioGroup
                label="처리 우선순위"
                name="priority"
                value={formData.priority}
                onChange={(value) => updateFormData("priority", value)}
                options={[
                  { value: "low", label: "낮음" },
                  { value: "normal", label: "보통" },
                  { value: "high", label: "높음", helperText: "추가 비용이 발생할 수 있습니다" },
                ]}
                orientation="horizontal"
              />
              
              <FormCheckbox
                label="이메일 알림 수신"
                name="notifications"
                checked={formData.notifications}
                onChange={(checked) => updateFormData("notifications", checked)}
                helperText="프로젝트 진행 상황을 이메일로 받아보실 수 있습니다"
              />
              
              <div className="pt-4 border-t">
                <FormCheckbox
                  label="서비스 이용약관에 동의합니다"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={(checked) => updateFormData("termsAccepted", checked)}
                  required
                  error={!formData.termsAccepted ? "약관에 동의해주세요" : ""}
                  tooltip="약관 내용을 반드시 확인해주세요"
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              이전
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
              >
                다음
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed()}
              >
                <Send className="h-4 w-4 mr-2" />
                제출하기
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alternative Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Alternative Progress Display</CardTitle>
        </CardHeader>
        <CardContent>
          <FormProgressBar 
            currentStep={currentStep + 1} 
            totalSteps={steps.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}