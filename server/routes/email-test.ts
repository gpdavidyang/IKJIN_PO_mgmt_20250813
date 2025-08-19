import express from 'express';
import { emailService } from '../services/email-service';

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

    const result = await emailService.sendPurchaseOrderEmail({
      orderData: testOrderData,
      excelFilePath: '/Users/davidyang/workspace/IKJIN_PO_Mgmt_20250806/uploads/test-file.xlsx', // 실제로는 없어도 됨
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

export default router;