// SMTP 연결 테스트 스크립트
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

async function testEmailConnection() {
  console.log('📧 이메일 연결 테스트 시작...');
  
  // 환경 변수 확인
  console.log('🔍 환경 변수 확인:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  SMTP_USER:', process.env.SMTP_USER);
  console.log('  SMTP_PASS:', process.env.SMTP_PASS ? '설정됨 (길이: ' + process.env.SMTP_PASS.length + ')' : '설정되지 않음');
  
  // 트랜스포터 생성
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.naver.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔗 SMTP 서버 연결 테스트 중...');
    await transporter.verify();
    console.log('✅ SMTP 서버 연결 성공!');
    
    // 테스트 이메일 발송
    console.log('📨 테스트 이메일 발송 중...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER, // 자기 자신에게 발송
      subject: '이메일 연결 테스트',
      text: '이메일 서비스가 정상적으로 작동합니다.',
      html: '<h3>이메일 연결 테스트 성공!</h3><p>이메일 서비스가 정상적으로 작동합니다.</p>'
    });
    
    console.log('✅ 테스트 이메일 발송 성공!');
    console.log('📧 Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ 이메일 연결 테스트 실패:', error);
    
    if (error.code === 'EAUTH') {
      console.error('🚨 인증 실패: SMTP 사용자명/비밀번호를 확인하세요');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🚨 서버 연결 실패: SMTP 호스트를 확인하세요');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🚨 연결 거부: SMTP 포트를 확인하세요');
    }
    
    process.exit(1);
  }
  
  console.log('🎉 이메일 연결 테스트 완료!');
}

testEmailConnection();