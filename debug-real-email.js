/**
 * 실제 발주서 이메일 발송 디버깅
 * 로그를 통해 500 에러의 정확한 원인 파악
 */

const debugRealEmailSend = async () => {
  const vercelUrl = 'https://ikjin-po-mgmt-20250813-dno9.vercel.app';
  
  // 실제 발주서와 유사한 테스트 데이터 (첨부파일 ID 370 사용)
  const realTestData = {
    orderData: {
      id: 344, // 실제 발주서 ID
      orderId: 344,
      orderNumber: 'TEST-PO-344',
      vendorName: '테스트 거래처',
      orderDate: '2025-09-08',
      totalAmount: 500000
    },
    to: ['davidswyang@gmail.com'],
    cc: [],
    subject: '실제 발주서 이메일 테스트 - ' + new Date().toLocaleString('ko-KR'),
    message: '실제 발주서 데이터를 사용한 이메일 발송 테스트입니다.',
    selectedAttachmentIds: [370] // 실제 첨부파일 ID
  };

  console.log('🔍 실제 발주서 이메일 발송 디버깅 시작...');
  console.log('📧 테스트 데이터:', JSON.stringify(realTestData, null, 2));

  try {
    console.log('🌐 요청 URL:', vercelUrl + '/api/orders/send-email');
    console.log('📦 요청 데이터 크기:', JSON.stringify(realTestData).length, 'bytes');

    const response = await fetch(vercelUrl + '/api/orders/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(realTestData)
    });

    console.log('📊 응답 상태:', response.status, response.statusText);
    console.log('📄 응답 헤더:', Object.fromEntries(response.headers));

    const result = await response.text();
    console.log('📄 원시 응답:', result);

    if (response.ok) {
      try {
        const jsonResult = JSON.parse(result);
        console.log('✅ 이메일 발송 성공!');
        console.log('🆔 메시지 ID:', jsonResult.messageId);
      } catch (parseError) {
        console.log('✅ 이메일 발송 완료 (JSON 파싱 실패)');
        console.log('📄 파싱 에러:', parseError.message);
      }
    } else {
      console.log('❌ HTTP 오류:', response.status);
      console.log('📄 오류 내용:', result);
      
      // 자세한 오류 분석
      if (response.status === 500) {
        console.log('\n🔍 500 에러 상세 분석:');
        try {
          const errorJson = JSON.parse(result);
          console.log('- 에러 메시지:', errorJson.error);
          console.log('- 에러 세부사항:', errorJson.details);
          console.log('- 에러 타입:', typeof errorJson.error);
        } catch (e) {
          console.log('- JSON 파싱 불가, 원시 텍스트:', result);
        }
      }
      
      if (response.status === 401) {
        console.log('\n🔐 401 에러 분석: 인증이 필요합니다');
        console.log('- 세션 쿠키가 없거나 만료되었습니다');
        console.log('- 브라우저에서 로그인 상태를 확인하세요');
      }
    }

  } catch (error) {
    console.error('❌ 네트워크/요청 오류:', error.message);
    console.log('\n🔍 가능한 원인:');
    console.log('- 네트워크 연결 문제');
    console.log('- Vercel 서버가 응답하지 않음');
    console.log('- 요청 데이터 포맷 문제');
    console.log('- CORS 정책 문제');
  }
};

// 실행
console.log('🧪 실제 발주서 이메일 디버깅 시작...\n');
debugRealEmailSend();