/**
 * 간단한 이메일 테스트 엔드포인트 (인증 없음)
 * Vercel 환경에서 SMTP 설정 테스트용
 */

import { Router } from "express";
import { POEmailService } from "../utils/po-email-service";

const router = Router();

// 인증 없이 이메일 연결 테스트
router.get("/test-smtp-connection", async (req, res) => {
  try {
    console.log('🧪 SMTP 연결 테스트 시작');
    console.log('🔧 환경변수 확인:', {
      SMTP_HOST: process.env.SMTP_HOST || '미설정',
      SMTP_PORT: process.env.SMTP_PORT || '미설정', 
      SMTP_USER: process.env.SMTP_USER || '미설정',
      SMTP_PASS: process.env.SMTP_PASS ? '설정됨' : '미설정',
      VERCEL: process.env.VERCEL ? 'Vercel 환경' : 'Local 환경'
    });

    const emailService = new POEmailService();
    const result = await emailService.testConnection();
    
    if (result.success) {
      console.log('✅ SMTP 연결 테스트 성공');
      res.json({
        success: true,
        message: 'SMTP 서버 연결 성공',
        environment: process.env.VERCEL ? 'Vercel' : 'Local',
        smtpHost: process.env.SMTP_HOST
      });
    } else {
      console.log('❌ SMTP 연결 테스트 실패:', result.error);
      res.status(500).json({
        success: false,
        message: 'SMTP 서버 연결 실패',
        error: result.error,
        environment: process.env.VERCEL ? 'Vercel' : 'Local'
      });
    }
  } catch (error) {
    console.error('💥 SMTP 테스트 오류:', error);
    res.status(500).json({
      success: false,
      message: 'SMTP 테스트 중 오류',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.VERCEL ? 'Vercel' : 'Local'
    });
  }
});

// 인증 없이 간단한 이메일 발송 테스트
router.post("/send-test-email", async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        message: '수신자 이메일이 필요합니다'
      });
    }

    console.log('📧 테스트 이메일 발송 시작:', to);
    console.log('🔧 환경변수 상태:', {
      SMTP_HOST: process.env.SMTP_HOST || '미설정',
      SMTP_PORT: process.env.SMTP_PORT || '미설정',
      SMTP_USER: process.env.SMTP_USER || '미설정',
      SMTP_PASS: process.env.SMTP_PASS ? '설정됨' : '미설정',
      VERCEL: process.env.VERCEL ? 'Vercel 환경' : 'Local 환경'
    });

    const emailService = new POEmailService();
    
    // 간단한 테스트 이메일 발송
    const result = await emailService.sendEmail({
      to: to,
      subject: `이메일 발송 테스트 - ${new Date().toLocaleString('ko-KR')}`,
      html: `
        <h2>🧪 이메일 발송 테스트</h2>
        <p>Vercel 환경에서 이메일 발송이 정상적으로 작동합니다!</p>
        <ul>
          <li><strong>환경:</strong> ${process.env.VERCEL ? 'Vercel' : 'Local'}</li>
          <li><strong>SMTP 호스트:</strong> ${process.env.SMTP_HOST}</li>
          <li><strong>발송 시간:</strong> ${new Date().toLocaleString('ko-KR')}</li>
        </ul>
        <p><em>이 메일은 자동화된 테스트 메일입니다.</em></p>
      `
    });

    if (result.success) {
      console.log('✅ 테스트 이메일 발송 성공:', result.messageId);
      res.json({
        success: true,
        message: '테스트 이메일 발송 성공',
        messageId: result.messageId,
        to: to,
        environment: process.env.VERCEL ? 'Vercel' : 'Local'
      });
    } else {
      console.log('❌ 테스트 이메일 발송 실패:', result.error);
      res.status(500).json({
        success: false,
        message: '테스트 이메일 발송 실패',
        error: result.error,
        environment: process.env.VERCEL ? 'Vercel' : 'Local'
      });
    }

  } catch (error) {
    console.error('💥 이메일 발송 테스트 오류:', error);
    res.status(500).json({
      success: false,
      message: '이메일 발송 테스트 중 오류',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.VERCEL ? 'Vercel' : 'Local'
    });
  }
});

export default router;