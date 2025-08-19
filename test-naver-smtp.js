import nodemailer from 'nodemailer';

// 네이버 SMTP 설정 테스트
const transporter = nodemailer.createTransport({
  host: 'smtp.naver.com',
  port: 587,
  secure: false,
  auth: {
    user: 'david1611@naver.com',
    pass: '2VQ2DCLBHGB6'
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function testNaverSMTP() {
  try {
    console.log('🔍 네이버 SMTP 연결 테스트 시작...');
    
    // 연결 테스트
    const verified = await transporter.verify();
    console.log('✅ 네이버 SMTP 연결 성공:', verified);
    
    // 실제 테스트 이메일 발송
    console.log('📧 테스트 이메일 발송 시작...');
    const result = await transporter.sendMail({
      from: '"익진엔지니어링" <david1611@naver.com>',
      to: 'davidswyang@gmail.com',
      subject: '테스트 - 네이버 SMTP 연결 확인',
      html: `
        <h2>네이버 SMTP 테스트 이메일</h2>
        <p>이 메일이 받아졌다면 네이버 SMTP 설정이 정상적으로 작동합니다.</p>
        <p>발송 시간: ${new Date().toLocaleString('ko-KR')}</p>
      `,
      text: '네이버 SMTP 테스트 이메일입니다.'
    });
    
    console.log('✅ 테스트 이메일 발송 성공:', result.messageId);
    console.log('📧 수신자:', result.accepted);
    console.log('❌ 거부된 수신자:', result.rejected);
    
  } catch (error) {
    console.error('❌ 네이버 SMTP 테스트 실패:', error);
    
    if (error.code === 'EAUTH') {
      console.error('🔐 인증 실패: 네이버 아이디/비밀번호를 확인하세요.');
      console.error('💡 네이버 2단계 인증이 활성화된 경우 앱 비밀번호를 사용하세요.');
    } else if (error.code === 'ECONNECTION') {
      console.error('🌐 연결 실패: 네트워크 또는 방화벽 문제일 수 있습니다.');
    }
  } finally {
    transporter.close();
  }
}

testNaverSMTP();