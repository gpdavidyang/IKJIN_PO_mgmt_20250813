/**
 * Vercel 환경에서 이메일 발송 테스트 (간단한 버전)
 */

const testSMTPConnection = async () => {
  const vercelUrl = 'https://ikjin-po-mgmt-20250813-dno9.vercel.app';
  
  console.log('🔧 1단계: SMTP 연결 테스트...');
  
  try {
    const response = await fetch(vercelUrl + '/api/email-test/test-smtp-connection', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('📊 응답 상태:', response.status, response.statusText);
    
    const result = await response.json();
    console.log('📄 연결 테스트 결과:', result);

    if (result.success) {
      console.log('✅ SMTP 연결 성공!');
      return true;
    } else {
      console.log('❌ SMTP 연결 실패:', result.error);
      return false;
    }

  } catch (error) {
    console.error('❌ SMTP 연결 테스트 오류:', error.message);
    return false;
  }
};

const testEmailSend = async () => {
  const vercelUrl = 'https://ikjin-po-mgmt-20250813-dno9.vercel.app';
  
  console.log('📧 2단계: 실제 이메일 발송 테스트...');
  console.log('📬 수신자: davidswyang@gmail.com');

  try {
    const response = await fetch(vercelUrl + '/api/email-test/send-test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        to: 'davidswyang@gmail.com'
      })
    });

    console.log('📊 응답 상태:', response.status, response.statusText);
    
    const result = await response.json();
    console.log('📄 이메일 발송 결과:', result);

    if (result.success) {
      console.log('✅ 이메일 발송 성공!');
      console.log('🆔 메시지 ID:', result.messageId);
      console.log('💌 davidswyang@gmail.com으로 테스트 이메일이 발송되었습니다!');
      console.log('📧 받은편지함을 확인해보세요.');
    } else {
      console.log('❌ 이메일 발송 실패:', result.error);
    }

  } catch (error) {
    console.error('❌ 이메일 발송 테스트 오류:', error.message);
  }
};

// 테스트 실행
const runFullTest = async () => {
  console.log('🧪 Vercel 이메일 테스트 시작...\n');
  
  const smtpOk = await testSMTPConnection();
  console.log(''); // 줄바꿈
  
  if (smtpOk) {
    await testEmailSend();
  } else {
    console.log('❌ SMTP 연결 실패로 이메일 발송 테스트를 건너뜁니다.');
  }
};

runFullTest();