#!/usr/bin/env node

import { POEmailServiceMock } from './server/utils/po-email-service-mock.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testEmailService() {
  console.log('🧪 Mock 이메일 서비스 테스트 시작...\n');

  const emailService = new POEmailServiceMock();
  
  // 테스트할 엑셀 파일 경로 (가장 최근 업로드된 파일)
  const excelPath = path.join(__dirname, 'uploads/1752708976132-PO_Template01__Ext_20250716_2.xlsx');
  
  const emailOptions = {
    to: 'test@example.com',
    subject: '발주서 전송 - PO-2025-001',
    orderNumber: 'PO-2025-001',
    vendorName: '엘림메탈테크',
    orderDate: '2024-06-12',
    dueDate: '2024-07-01',
    totalAmount: 1000000,
    additionalMessage: '테스트 발주서입니다.'
  };

  try {
    console.log('📧 이메일 발송 시작...');
    console.log('수신자:', emailOptions.to);
    console.log('제목:', emailOptions.subject);
    console.log('발주번호:', emailOptions.orderNumber);
    console.log('거래처:', emailOptions.vendorName);
    console.log('총액:', emailOptions.totalAmount.toLocaleString() + '원\n');

    const result = await emailService.sendPOWithAttachments(excelPath, emailOptions);
    
    if (result.success) {
      console.log('✅ 이메일 발송 성공!');
      console.log('메시지 ID:', result.messageId);
      if (result.mockMode) {
        console.log('📝 Mock 모드로 발송됨 - 실제 이메일은 발송되지 않았습니다.');
        console.log('📂 로그 파일을 확인하세요: logs/mock-email-*.json');
      }
    } else {
      console.log('❌ 이메일 발송 실패:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }

  console.log('\n🔍 생성된 파일들 확인:');
  console.log('- 추출된 엑셀: uploads/po-sheets-*.xlsx');
  console.log('- 생성된 PDF: uploads/po-sheets-*.pdf'); 
  console.log('- 이메일 로그: logs/mock-email-*.json');
}

testEmailService().catch(console.error);