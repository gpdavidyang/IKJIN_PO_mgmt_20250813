import express from 'express';
import path from 'path';
import { emailService } from '../services/email-service';
import { POEmailService } from '../utils/po-email-service-enhanced';

const router = express.Router();

/**
 * 이메일 서비스 연결 테스트
 */
router.get('/test-connection', async (req, res) => {
  try {
    console.log('🔍 이메일 서비스 연결 테스트 시작...');
    
    const isConnected = await emailService.testEmailConnection();
    
    if (isConnected) {
      console.log('✅ 이메일 서버 연결 성공');
      res.json({
        success: true,
        message: '이메일 서버 연결 성공',
        smtp: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER
        }
      });
    } else {
      console.error('❌ 이메일 서버 연결 실패');
      res.status(500).json({
        success: false,
        message: '이메일 서버 연결 실패',
        smtp: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER
        }
      });
    }
  } catch (error) {
    console.error('❌ 이메일 연결 테스트 오류:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '이메일 연결 테스트 실패',
      error: error
    });
  }
});

/**
 * 테스트 이메일 발송
 */
router.post('/send-test', async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        message: '수신자 이메일이 필요합니다.'
      });
    }

    console.log(`📧 테스트 이메일 발송 시작: ${to}`);
    
    // 임시 Excel 파일 생성 (테스트용)
    const testOrderData = {
      orderNumber: 'TEST-001',
      projectName: '테스트 프로젝트',
      vendorName: '테스트 거래처',
      location: '테스트 현장',
      orderDate: new Date().toLocaleDateString('ko-KR'),
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR'),
      totalAmount: 1000000,
      userName: 'Test User',
      userPhone: '010-1234-5678'
    };

    // 임시 Excel 파일 생성 (실제 파일 없이 이메일만 테스트)
    const dummyFilePath = path.join(process.cwd(), 'uploads', 'test-email.xlsx');
    
    // uploads 디렉토리가 없으면 생성
    const fs = require('fs');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // 더미 파일 생성
    if (!fs.existsSync(dummyFilePath)) {
      fs.writeFileSync(dummyFilePath, 'test content');
    }
    
    const result = await emailService.sendPurchaseOrderEmail({
      orderData: testOrderData,
      excelFilePath: dummyFilePath,
      recipients: [to],
      cc: [],
      userId: 'test-user',
      orderId: 999
    });

    if (result.success) {
      console.log('✅ 테스트 이메일 발송 성공');
      res.json({
        success: true,
        message: '테스트 이메일 발송 성공',
        messageId: result.messageId,
        recipients: result.acceptedRecipients
      });
    } else {
      console.error('❌ 테스트 이메일 발송 실패');
      res.status(500).json({
        success: false,
        message: '테스트 이메일 발송 실패'
      });
    }
  } catch (error) {
    console.error('❌ 테스트 이메일 발송 오류:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '테스트 이메일 발송 실패',
      error: error
    });
  }
});

/**
 * @route GET /api/email-test/config
 * @description 현재 이메일 설정 확인
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      hasPassword: !!process.env.SMTP_PASS,
      passwordLength: process.env.SMTP_PASS?.length || 0
    };
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error("Config check error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * @route POST /api/email-test/simple
 * @description 간단한 이메일 발송 테스트 (POEmailService 직접 사용)
 */
router.post('/simple', async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        message: '수신자 이메일 주소를 입력해주세요.'
      });
    }

    console.log('📧 Simple email test started to:', to);
    
    // POEmailService 직접 사용
    const poEmailService = new POEmailService();
    
    // 간단한 텍스트 이메일 발송
    const result = await poEmailService.sendEmail({
      to: to,
      subject: `[테스트] 발주 시스템 이메일 테스트 - ${new Date().toLocaleString('ko-KR')}`,
      text: '이것은 발주 시스템의 이메일 테스트 메시지입니다.\n\n이메일이 정상적으로 수신되었다면 시스템이 올바르게 설정된 것입니다.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>발주 시스템 이메일 테스트</h2>
          <p>이것은 발주 시스템의 이메일 테스트 메시지입니다.</p>
          <p>이메일이 정상적으로 수신되었다면 시스템이 올바르게 설정된 것입니다.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            발송 시간: ${new Date().toLocaleString('ko-KR')}<br>
            발송 서버: ${process.env.SMTP_HOST || 'unknown'}<br>
            발송자: ${process.env.SMTP_USER || 'unknown'}
          </p>
        </div>
      `
    });

    console.log('📧 Simple email test result:', result);

    if (result.success) {
      res.json({
        success: true,
        message: '테스트 이메일 발송 성공',
        messageId: result.messageId,
        to: to
      });
    } else {
      res.status(500).json({
        success: false,
        message: '테스트 이메일 발송 실패',
        error: result.error,
        to: to
      });
    }
  } catch (error) {
    console.error('❌ Simple email test error:', error);
    res.status(500).json({
      success: false,
      message: '이메일 테스트 중 오류 발생',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;