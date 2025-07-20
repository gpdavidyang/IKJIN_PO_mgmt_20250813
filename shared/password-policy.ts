import { z } from "zod";

// 비밀번호 정책 설정
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  preventCommonPasswords: true,
  preventUserInfo: true, // 이메일, 이름 등 포함 금지
};

// 자주 사용되는 약한 비밀번호 목록
const COMMON_PASSWORDS = [
  "password",
  "12345678",
  "qwerty",
  "admin123",
  "password123",
  "letmein",
  "welcome",
  "123456789",
  "password1",
  "admin",
];

// 비밀번호 강도 레벨
export type PasswordStrength = "weak" | "medium" | "strong" | "very_strong";

// 비밀번호 유효성 검사 스키마
export const passwordSchema = z
  .string()
  .min(PASSWORD_POLICY.minLength, `비밀번호는 최소 ${PASSWORD_POLICY.minLength}자 이상이어야 합니다.`)
  .max(PASSWORD_POLICY.maxLength, `비밀번호는 최대 ${PASSWORD_POLICY.maxLength}자까지 가능합니다.`)
  .refine(
    (password) => {
      if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
        return false;
      }
      if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
        return false;
      }
      if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password)) {
        return false;
      }
      if (PASSWORD_POLICY.requireSpecialChars) {
        const specialCharsRegex = new RegExp(`[${PASSWORD_POLICY.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
        if (!specialCharsRegex.test(password)) {
          return false;
        }
      }
      return true;
    },
    {
      message: "비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.",
    }
  )
  .refine(
    (password) => {
      if (!PASSWORD_POLICY.preventCommonPasswords) return true;
      const lowerPassword = password.toLowerCase();
      return !COMMON_PASSWORDS.some((common) => lowerPassword.includes(common));
    },
    {
      message: "너무 일반적인 비밀번호입니다. 다른 비밀번호를 사용해주세요.",
    }
  );

// 사용자 정보를 포함한 비밀번호 검사
export function validatePasswordWithUserInfo(
  password: string,
  userInfo?: { email?: string; name?: string }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 기본 스키마 검사
  try {
    passwordSchema.parse(password);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map((e) => e.message));
    }
  }

  // 사용자 정보 포함 검사
  if (PASSWORD_POLICY.preventUserInfo && userInfo) {
    const lowerPassword = password.toLowerCase();
    
    if (userInfo.email) {
      const emailPart = userInfo.email.split("@")[0].toLowerCase();
      if (lowerPassword.includes(emailPart)) {
        errors.push("비밀번호에 이메일 주소를 포함할 수 없습니다.");
      }
    }
    
    if (userInfo.name) {
      const nameParts = userInfo.name.toLowerCase().split(/\s+/);
      for (const part of nameParts) {
        if (part.length > 2 && lowerPassword.includes(part)) {
          errors.push("비밀번호에 이름을 포함할 수 없습니다.");
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// 비밀번호 강도 계산
export function calculatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  // 길이 점수
  if (password.length >= 12) score += 2;
  else if (password.length >= 10) score += 1;

  // 문자 종류 점수
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 2;

  // 연속 문자 감점
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push("동일한 문자가 연속으로 사용되었습니다.");
  }

  // 순차적 문자 감점
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    score -= 1;
    feedback.push("순차적인 문자나 숫자가 포함되어 있습니다.");
  }

  // 강도 결정
  let strength: PasswordStrength;
  if (score >= 7) {
    strength = "very_strong";
  } else if (score >= 5) {
    strength = "strong";
  } else if (score >= 3) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  // 피드백 추가
  if (password.length < 12) {
    feedback.push("더 긴 비밀번호를 사용하면 보안이 향상됩니다.");
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push("특수문자를 추가하면 보안이 향상됩니다.");
  }

  return {
    strength,
    score: Math.max(0, Math.min(10, score)),
    feedback,
  };
}

// 비밀번호 강도별 색상
export function getPasswordStrengthColor(strength: PasswordStrength): string {
  const colors: Record<PasswordStrength, string> = {
    weak: "text-red-600",
    medium: "text-yellow-600",
    strong: "text-green-600",
    very_strong: "text-blue-600",
  };
  return colors[strength];
}

// 비밀번호 강도별 설명
export function getPasswordStrengthLabel(strength: PasswordStrength): string {
  const labels: Record<PasswordStrength, string> = {
    weak: "약함",
    medium: "보통",
    strong: "강함",
    very_strong: "매우 강함",
  };
  return labels[strength];
}