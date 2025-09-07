import nodemailer from 'nodemailer';

async function testEmailSend() {
  try {
    console.log('🚀 SMTP 설정 시작...');
    
    // SMTP 설정
    const transporter = nodemailer.createTransporter({
      host: 'smtp.naver.com',
      port: 587,
      secure: false,
      auth: {
        user: 'david1611@naver.com',
        pass: 'X5EQ2G55FG72'
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // 이메일 내용
    const mailOptions = {
      from: 'david1611@naver.com',
      to: 'davidswyang@gmail.com',
      subject: '로컬 환경 이메일 테스트 - IKJIN PO 시스템',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>발주서 이메일 테스트</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .order-table th, .order-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .order-table th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>발주서</h1>
          </div>
          <div class="content">
            <h2>발주 정보</h2>
            <p><strong>발주 번호:</strong> TEST-2025-001</p>
            <p><strong>회사명:</strong> 테스트 회사</p>
            <p><strong>발주 일자:</strong> ${new Date().toLocaleDateString('ko-KR')}</p>
            
            <h3>발주 품목</h3>
            <table class="order-table">
              <tr>
                <th>품목명</th>
                <th>수량</th>
                <th>단가</th>
                <th>금액</th>
              </tr>
              <tr>
                <td>테스트 품목 1</td>
                <td>10</td>
                <td>1,000원</td>
                <td>10,000원</td>
              </tr>
              <tr>
                <td>테스트 품목 2</td>
                <td>5</td>
                <td>2,000원</td>
                <td>10,000원</td>
              </tr>
            </table>
            
            <p><strong>총 금액: 20,000원</strong></p>
            
            <hr>
            <p><small>이 이메일은 IKJIN PO 관리 시스템 로컬 환경에서 발송된 테스트 이메일입니다.</small></p>
          </div>
        </body>
        </html>
      `
    };

    console.log('📧 이메일 발송 중...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ 이메일 발송 성공!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);

  } catch (error) {
    console.error('❌ 이메일 발송 실패:', error.message);
    console.error('상세 오류:', error);
  }
}

testEmailSend();