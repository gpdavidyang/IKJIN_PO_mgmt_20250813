import express, { Request, Response } from "express";
import { z } from "zod";
import { EmailSettingsService } from "../services/email-settings-service";
import { EmailSettingsEncryption } from "../utils/email-settings-encryption";

const router = express.Router();

// 이메일 설정 스키마
const EmailSettingsSchema = z.object({
  smtpHost: z.string().min(1, "SMTP 호스트는 필수입니다"),
  smtpPort: z.string().regex(/^\d+$/, "포트는 숫자여야 합니다"),
  smtpUser: z.string().email("올바른 이메일 형식이 아닙니다"),
  smtpPass: z.string().min(1, "비밀번호는 필수입니다")
});

// 이메일 설정 서비스 인스턴스
const emailService = new EmailSettingsService();

/**
 * 현재 이메일 설정 조회
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    // 관리자 권한 확인
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "관리자 권한이 필요합니다"
      });
    }

    const emailService = new EmailSettingsService();
    const dbSettings = await emailService.getDefaultSettings();

    let settings;
    
    if (dbSettings) {
      // DB에서 설정 가져오기 (마스킹 처리)
      settings = emailService.getMaskedSettings(dbSettings);
    } else {
      // DB에 설정이 없으면 환경 변수에서 가져오기
      const envSettings = emailService.getSettingsFromEnv();
      settings = {
        smtpHost: envSettings.smtpHost || "",
        smtpPort: envSettings.smtpPort?.toString() || "",
        smtpUser: envSettings.smtpUser || "",
        smtpPass: process.env.SMTP_PASS ? "********" : ""
      };
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("이메일 설정 조회 오류:", error);
    res.status(500).json({
      success: false,
      message: "이메일 설정을 조회하는 중 오류가 발생했습니다"
    });
  }
});

/**
 * 이메일 설정 업데이트
 */
router.put("/", async (req: Request, res: Response) => {
  try {
    // 관리자 권한 확인
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "관리자 권한이 필요합니다"
      });
    }

    // 입력 검증
    const validationResult = EmailSettingsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "입력값이 유효하지 않습니다",
        errors: validationResult.error.flatten().fieldErrors
      });
    }

    const { smtpHost, smtpPort, smtpUser, smtpPass } = validationResult.data;
    const userId = req.user?.id || 'system';

    // 기존 설정 확인
    const existingSettings = await emailService.getDefaultSettings();
    
    let updatedSettings;
    if (existingSettings) {
      // 기존 설정 업데이트
      updatedSettings = await emailService.updateSettings(existingSettings.id, {
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpUser,
        smtpPass: smtpPass !== '********' ? smtpPass : undefined, // 마스킹된 값이면 변경하지 않음
        isDefault: true,
        isActive: true,
      }, userId);
    } else {
      // 새 설정 생성
      updatedSettings = await emailService.createSettings({
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpUser,
        smtpPass,
        fromName: 'IKJIN 구매 발주 시스템',
        description: '웹 UI에서 설정된 SMTP 구성',
        isActive: true,
        isDefault: true,
      }, userId);
    }

    // 환경 변수도 동시에 업데이트 (런타임 적용)
    process.env.SMTP_HOST = smtpHost;
    process.env.SMTP_PORT = smtpPort;
    process.env.SMTP_USER = smtpUser;
    if (smtpPass !== '********') {
      process.env.SMTP_PASS = smtpPass;
    }

    res.json({
      success: true,
      message: "이메일 설정이 데이터베이스에 저장되고 즉시 적용되었습니다.",
      data: emailService.getMaskedSettings(updatedSettings)
    });
  } catch (error) {
    console.error("이메일 설정 업데이트 오류:", error);
    res.status(500).json({
      success: false,
      message: "이메일 설정을 업데이트하는 중 오류가 발생했습니다",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 이메일 설정 테스트
 */
router.post("/test", async (req: Request, res: Response) => {
  try {
    // 관리자 권한 확인
    if (!req.isAuthenticated() || req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "관리자 권한이 필요합니다"
      });
    }

    const { testEmail } = req.body;
    
    if (!testEmail || !z.string().email().safeParse(testEmail).success) {
      return res.status(400).json({
        success: false,
        message: "유효한 테스트 이메일 주소를 입력해주세요"
      });
    }

    // 현재 활성 설정 가져오기
    const currentSettings = await emailService.getDefaultSettings();
    
    if (!currentSettings) {
      return res.status(404).json({
        success: false,
        message: "활성화된 이메일 설정을 찾을 수 없습니다. 먼저 설정을 저장해주세요."
      });
    }

    // SMTP 연결 및 테스트 이메일 발송
    const testResult = await emailService.testSMTPConnection(currentSettings, testEmail);

    if (testResult.success) {
      res.json({
        success: true,
        message: "테스트 이메일이 성공적으로 발송되었습니다",
        data: {
          messageId: testResult.messageId,
          testEmail,
          testedAt: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: "테스트 이메일 발송에 실패했습니다",
        error: testResult.error
      });
    }
  } catch (error) {
    console.error("이메일 테스트 오류:", error);
    res.status(500).json({
      success: false,
      message: "이메일 테스트 중 오류가 발생했습니다",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;