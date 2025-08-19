import { emailService } from './server/services/email-service.js';
import fs from 'fs';

async function testEmailService() {
  try {
    console.log('🔍 이메일 서비스 연결 테스트 시작...');
    console.log('🔧 SMTP 설정:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS ? '***설정됨***' : '❌ 설정안됨'
    });
    
    // 1. 연결 테스트
    const isConnected = await emailService.testEmailConnection();
    
    if (isConnected) {
      console.log('✅ 네이버 SMTP 연결 성공');
      
      // 2. 실제 이메일 발송 테스트
      console.log('📧 테스트 이메일 발송 시작...');
      
      const testOrderData = {
        orderNumber: 'TEST-SYSTEM-001',
        projectName: '시스템 테스트 프로젝트',
        vendorName: '테스트 거래처',
        location: '테스트 현장',
        orderDate: new Date().toLocaleDateString('ko-KR'),
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR'),
        totalAmount: 1000000,
        userName: 'System Test',
        userPhone: '010-0000-0000'
      };

      // 임시 Excel 파일 생성 (실제로는 필요없지만 서비스가 체크함)
      const testExcelPath = '/Users/davidyang/workspace/IKJIN_PO_Mgmt_20250806/uploads/test-temp.xlsx';
      fs.writeFileSync(testExcelPath, 'test'); // 더미 파일

      const result = await emailService.sendPurchaseOrderEmail({
        orderData: testOrderData,
        excelFilePath: testExcelPath,
        recipients: ['davidswyang@gmail.com'],
        cc: [],
        userId: 'system-test',
        orderId: 999
      });

      // 임시 파일 삭제
      fs.unlinkSync(testExcelPath);

      if (result.success) {
        console.log('✅ 테스트 이메일 발송 성공!');
        console.log('📧 메시지 ID:', result.messageId);
        console.log('📧 수신자:', result.acceptedRecipients);
        console.log('❌ 거부된 수신자:', result.rejectedRecipients);
        console.log('\n🎉 네이버 SMTP 설정이 정상적으로 작동합니다!');
      } else {
        console.error('❌ 테스트 이메일 발송 실패');
      }
    } else {
      console.error('❌ 네이버 SMTP 연결 실패');
      console.error('💡 다음을 확인해주세요:');
      console.error('   1. 네이버 계정 정보가 정확한지');
      console.error('   2. 네이버 2단계 인증 및 앱 비밀번호 설정');
      console.error('   3. 네이버 메일에서 IMAP/POP3 설정 활성화');
    }
  } catch (error) {
    console.error('❌ 이메일 서비스 테스트 실패:', error);
  }
}

testEmailService();