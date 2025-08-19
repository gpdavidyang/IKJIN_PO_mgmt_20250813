import nodemailer from 'nodemailer';

// Gmail SMTP 설정 테스트
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS 사용
  auth: {
    user: 'davidswyang@gmail.com',
    pass: 'nhyzcxvcmocvogtq' // Gmail 앱 비밀번호
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function testGmailSMTP() {
  try {
    console.log('🔍 Gmail SMTP 연결 테스트 시작...');
    
    // 연결 테스트
    const verified = await transporter.verify();
    console.log('✅ Gmail SMTP 연결 성공:', verified);
    
    // 실제 테스트 이메일 발송
    console.log('📧 테스트 이메일 발송 시작...');
    const result = await transporter.sendMail({
      from: '"익진엔지니어링" <davidswyang@gmail.com>',
      to: 'davidswyang@gmail.com', // 자기 자신에게 테스트
      subject: '테스트 - Gmail SMTP 연결 확인',
      html: `
        <h2>Gmail SMTP 테스트 이메일</h2>
        <p>이 메일이 받아졌다면 Gmail SMTP 설정이 정상적으로 작동합니다.</p>
        <p>발송 시간: ${new Date().toLocaleString('ko-KR')}</p>
        <p>SMTP 설정: Gmail (smtp.gmail.com:587)</p>
      `,
      text: 'Gmail SMTP 테스트 이메일입니다.'
    });
    
    console.log('✅ 테스트 이메일 발송 성공:', result.messageId);
    console.log('📧 수신자:', result.accepted);
    console.log('❌ 거부된 수신자:', result.rejected);
    console.log('📨 Gmail에서 이메일을 확인하세요!');
    
  } catch (error) {
    console.error('❌ Gmail SMTP 테스트 실패:', error);
    
    if (error.code === 'EAUTH') {
      console.error('🔐 인증 실패: Gmail 앱 비밀번호를 확인하세요.');
      console.error('💡 Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호에서 생성하세요.');
      console.error('💡 생성된 16자리 비밀번호에서 공백을 제거했는지 확인하세요.');
    } else if (error.code === 'ECONNECTION') {
      console.error('🌐 연결 실패: 네트워크 또는 방화벽 문제일 수 있습니다.');
    }
  } finally {
    transporter.close();
  }
}

testGmailSMTP();