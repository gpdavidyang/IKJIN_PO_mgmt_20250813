import express, { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { POEmailService } from "../utils/po-email-service-enhanced";

const router = express.Router();

// 이메일 설정 스키마
const EmailSettingsSchema = z.object({
  smtpHost: z.string().min(1, "SMTP 호스트는 필수입니다"),
  smtpPort: z.string().regex(/^\d+$/, "포트는 숫자여야 합니다"),
  smtpUser: z.string().email("올바른 이메일 형식이 아닙니다"),
  smtpPass: z.string().min(1, "비밀번호는 필수입니다")
});

// .env 파일 경로
const envPath = path.resolve(process.cwd(), ".env");

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

    const settings = {
      smtpHost: process.env.SMTP_HOST || "",
      smtpPort: process.env.SMTP_PORT || "",
      smtpUser: process.env.SMTP_USER || "",
      // 비밀번호는 마스킹 처리
      smtpPass: process.env.SMTP_PASS ? "********" : ""
    };

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

    // .env 파일 읽기
    let envContent = "";
    try {
      envContent = await fs.readFile(envPath, "utf-8");
    } catch (error) {
      console.log(".env 파일이 없습니다. 새로 생성합니다.");
    }

    // 환경 변수 업데이트
    const envLines = envContent.split("\n");
    const updatedLines: string[] = [];
    let smtpHostUpdated = false;
    let smtpPortUpdated = false;
    let smtpUserUpdated = false;
    let smtpPassUpdated = false;

    for (const line of envLines) {
      if (line.startsWith("SMTP_HOST=")) {
        updatedLines.push(`SMTP_HOST=${smtpHost}`);
        smtpHostUpdated = true;
      } else if (line.startsWith("SMTP_PORT=")) {
        updatedLines.push(`SMTP_PORT=${smtpPort}`);
        smtpPortUpdated = true;
      } else if (line.startsWith("SMTP_USER=")) {
        updatedLines.push(`SMTP_USER=${smtpUser}`);
        smtpUserUpdated = true;
      } else if (line.startsWith("SMTP_PASS=")) {
        updatedLines.push(`SMTP_PASS=${smtpPass}`);
        smtpPassUpdated = true;
      } else {
        updatedLines.push(line);
      }
    }

    // 없는 환경 변수 추가
    if (!smtpHostUpdated) {
      updatedLines.push(`SMTP_HOST=${smtpHost}`);
    }
    if (!smtpPortUpdated) {
      updatedLines.push(`SMTP_PORT=${smtpPort}`);
    }
    if (!smtpUserUpdated) {
      updatedLines.push(`SMTP_USER=${smtpUser}`);
    }
    if (!smtpPassUpdated) {
      updatedLines.push(`SMTP_PASS=${smtpPass}`);
    }

    // .env 파일 쓰기
    await fs.writeFile(envPath, updatedLines.join("\n"));

    // 현재 프로세스의 환경 변수도 업데이트
    process.env.SMTP_HOST = smtpHost;
    process.env.SMTP_PORT = smtpPort;
    process.env.SMTP_USER = smtpUser;
    process.env.SMTP_PASS = smtpPass;

    res.json({
      success: true,
      message: "이메일 설정이 업데이트되었습니다. 서버를 재시작해야 변경사항이 완전히 적용됩니다."
    });
  } catch (error) {
    console.error("이메일 설정 업데이트 오류:", error);
    res.status(500).json({
      success: false,
      message: "이메일 설정을 업데이트하는 중 오류가 발생했습니다"
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

    // 이메일 서비스로 테스트 발송
    const emailService = new POEmailService();
    const result = await emailService.sendEmail({
      to: testEmail,
      subject: "[시스템 테스트] 이메일 설정 확인",
      text: "이메일 설정이 올바르게 구성되었습니다.",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>이메일 설정 테스트</h2>
          <p>이메일이 정상적으로 발송되었습니다.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            SMTP 서버: ${process.env.SMTP_HOST}<br>
            발송자: ${process.env.SMTP_USER}<br>
            발송 시간: ${new Date().toLocaleString("ko-KR")}
          </p>
        </div>
      `
    });

    if (result.success) {
      res.json({
        success: true,
        message: "테스트 이메일이 발송되었습니다"
      });
    } else {
      res.status(500).json({
        success: false,
        message: "테스트 이메일 발송 실패",
        error: result.error
      });
    }
  } catch (error) {
    console.error("이메일 테스트 오류:", error);
    res.status(500).json({
      success: false,
      message: "이메일 테스트 중 오류가 발생했습니다"
    });
  }
});

export default router;