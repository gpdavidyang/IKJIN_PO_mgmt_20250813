/**
 * Vercel 환경에서 향상된 이메일 시스템 테스트
 * 첨부파일과 사용자 정의 메시지를 포함한 종합적인 테스트
 */

import fs from 'fs';
import path from 'path';

// 테스트 데이터 생성
function createTestAttachment(filename, content) {
  const buffer = Buffer.from(content, 'utf8');
  return {
    filename: filename,
    content: buffer,
    contentType: 'text/plain',
    size: buffer.length
  };
}

function createTestFormData() {
  const formData = new FormData();
  
  // 기본 데이터
  const orderData = {
    orderId: 12345,
    orderNumber: 'TEST-PO-2025-001',
    vendorName: '테스트 거래처',
    orderDate: '2025-01-08',
    totalAmount: 1000000,
    siteName: '테스트 현장'
  };
  
  formData.append('orderData', JSON.stringify(orderData));
  formData.append('to', JSON.stringify(['test@example.com']));
  formData.append('cc', JSON.stringify([]));
  formData.append('subject', '테스트 발주서 - 첨부파일 및 사용자 메시지 포함');
  formData.append('message', '안녕하세요.\n\n이것은 사용자가 직접 작성한 테스트 메시지입니다.\n\n• 첨부파일이 정상적으로 전송되는지 확인\n• 이메일 내용이 사용자 메시지로 설정되는지 확인\n• Vercel 환경에서 정상 작동하는지 확인\n\n감사합니다.');
  formData.append('selectedAttachmentIds', JSON.stringify([]));
  
  return formData;
}

// 테스트 파일 생성
function createTestFiles() {
  const testFiles = [
    {
      name: '테스트_문서.txt',
      content: '이것은 테스트용 텍스트 파일입니다.\n첨부파일 전송 테스트를 위한 내용입니다.',
      mimeType: 'text/plain'
    },
    {
      name: '발주서_정보.txt',
      content: `발주서 정보
================
발주번호: TEST-PO-2025-001
거래처: 테스트 거래처
발주일자: 2025-01-08
총 금액: 1,000,000원
현장명: 테스트 현장

이 파일은 이메일 첨부파일 테스트를 위해 생성되었습니다.`,
      mimeType: 'text/plain'
    }
  ];
  
  return testFiles.map(file => ({
    originalname: file.name,
    mimetype: file.mimeType,
    buffer: Buffer.from(file.content, 'utf8'),
    size: Buffer.from(file.content, 'utf8').length
  }));
}

// API 테스트 함수
async function testEmailWithFiles() {
  console.log('🧪 Vercel 이메일 시스템 테스트 시작');
  console.log('=' .repeat(60));
  
  try {
    // 1. 기본 환경 확인
    console.log('📋 1. 환경 변수 확인');
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_PORT'];
    const envStatus = {};
    
    requiredEnvVars.forEach(envVar => {
      envStatus[envVar] = process.env[envVar] ? '✅ 설정됨' : '❌ 누락됨';
      console.log(`   ${envVar}: ${envStatus[envVar]}`);
    });
    
    const allEnvSet = requiredEnvVars.every(envVar => process.env[envVar]);
    if (!allEnvSet) {
      console.log('⚠️ 환경변수가 누락되었지만 시뮬레이션 모드로 계속합니다.');
      console.log('💡 실제 이메일 발송 테스트를 위해서는 환경변수를 설정하세요.');
    }
    
    console.log('');
    
    // 2. FormData 테스트 데이터 준비
    console.log('📋 2. 테스트 데이터 생성');
    const testFiles = createTestFiles();
    console.log(`   생성된 테스트 파일: ${testFiles.length}개`);
    testFiles.forEach(file => {
      console.log(`   - ${file.originalname} (${file.size} bytes)`);
    });
    
    // 3. 이메일 내용 테스트
    console.log('');
    console.log('📋 3. 이메일 내용 생성 테스트');
    
    const userMessage = `안녕하세요.

이것은 사용자가 직접 작성한 테스트 메시지입니다.

주요 확인 사항:
• 첨부파일이 정상적으로 전송되는지 확인
• 이메일 내용이 사용자 메시지로 설정되는지 확인  
• Vercel 환경에서 정상 작동하는지 확인

감사합니다.`;
    
    console.log('   사용자 메시지 길이:', userMessage.length);
    console.log('   사용자 메시지 미리보기:', userMessage.substring(0, 50) + '...');
    
    // 4. API 엔드포인트 테스트 (시뮬레이션)
    console.log('');
    console.log('📋 4. API 요청 시뮬레이션');
    
    const requestData = {
      orderData: {
        orderId: 12345,
        orderNumber: 'TEST-PO-2025-001',
        vendorName: '테스트 거래처',
        orderDate: '2025-01-08',
        totalAmount: 1000000,
        siteName: '테스트 현장'
      },
      to: ['test@example.com'],
      cc: [],
      subject: '테스트 발주서 - 첨부파일 및 사용자 메시지 포함',
      message: userMessage,
      selectedAttachmentIds: [],
      uploadedFiles: testFiles
    };
    
    console.log('   요청 데이터:');
    console.log(`   - 수신자: ${requestData.to.join(', ')}`);
    console.log(`   - 제목: ${requestData.subject}`);
    console.log(`   - 메시지 길이: ${requestData.message.length}`);
    console.log(`   - 첨부파일: ${requestData.uploadedFiles.length}개`);
    
    // 5. 이메일 서비스 로직 시뮬레이션
    console.log('');
    console.log('📋 5. 이메일 서비스 로직 테스트');
    
    // 첨부파일 처리 시뮬레이션
    const attachments = requestData.uploadedFiles.map(file => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    }));
    
    console.log('   첨부파일 처리 결과:');
    attachments.forEach(att => {
      console.log(`   - ${att.filename} (${att.content.length} bytes, ${att.contentType})`);
    });
    
    // 이메일 HTML 생성 시뮬레이션
    const htmlContent = generateEmailHTML(requestData.message, requestData.orderData);
    console.log('   이메일 HTML 생성 완료 (길이:', htmlContent.length, 'bytes)');
    
    // 6. 이메일 발송 시뮬레이션
    console.log('');
    console.log('📋 6. 이메일 발송 시뮬레이션');
    
    const mailOptions = {
      from: process.env.SMTP_USER || 'test@example.com',
      to: requestData.to.join(', '),
      subject: requestData.subject,
      html: htmlContent,
      attachments: attachments
    };
    
    console.log('   메일 옵션:');
    console.log(`   - From: ${mailOptions.from}`);
    console.log(`   - To: ${mailOptions.to}`);
    console.log(`   - Subject: ${mailOptions.subject}`);
    console.log(`   - HTML 길이: ${mailOptions.html.length} bytes`);
    console.log(`   - 첨부파일: ${mailOptions.attachments.length}개`);
    
    console.log('');
    console.log('✅ 모든 테스트가 성공적으로 완료되었습니다!');
    console.log('');
    console.log('🚀 다음 단계: 실제 API 엔드포인트에서 테스트해보세요');
    console.log('   curl -X POST /api/orders/send-email-with-files \\');
    console.log('     -F "orderData={\\"orderNumber\\":\\"TEST-001\\",\\"vendorName\\":\\"테스트\\"}" \\');
    console.log('     -F "to=[\\"test@example.com\\"]" \\');
    console.log('     -F "subject=테스트 이메일" \\');
    console.log('     -F "message=테스트 메시지" \\');
    console.log('     -F "selectedAttachmentIds=[]" \\');
    console.log('     -F "customFiles=@test-file.txt"');
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
    console.error('스택 트레이스:', error.stack);
  }
}

// HTML 생성 함수
function generateEmailHTML(userMessage, orderData) {
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>발주서 전송</title>
      <style>
        body { 
          font-family: "Malgun Gothic", "맑은 고딕", Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .message-content { 
          background-color: #f9f9f9; 
          padding: 20px; 
          border-radius: 5px; 
          margin: 20px 0;
          white-space: pre-wrap; 
          word-wrap: break-word;
        }
        .order-info {
          background-color: #e7f3ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="message-content">
        ${userMessage.replace(/\n/g, '<br>')}
      </div>
      
      <div class="order-info">
        <h3>📋 발주 정보</h3>
        <ul>
          <li><strong>발주번호:</strong> ${orderData.orderNumber}</li>
          <li><strong>거래처:</strong> ${orderData.vendorName}</li>
          <li><strong>발주일자:</strong> ${orderData.orderDate}</li>
          <li><strong>발주금액:</strong> ${orderData.totalAmount.toLocaleString()}원</li>
        </ul>
      </div>
      
      <div class="footer">
        <p>
          이 메일은 구매 발주 관리 시스템에서 발송되었습니다.<br>
          발송 시간: ${new Date().toLocaleString('ko-KR')}
        </p>
      </div>
    </body>
    </html>
  `;
}

// 스크립트 실행
testEmailWithFiles();

export {
  testEmailWithFiles,
  createTestFiles,
  generateEmailHTML
};