import bcrypt from 'bcrypt';

// 설정
const API_BASE = 'http://localhost:3000/api';

// 테스트 사용자 생성
async function createTestUser() {
  console.log('🔧 테스트 사용자 생성 시도...');
  
  try {
    // 먼저 관리자로 로그인 시도 (이미 있을 수 있음)
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@ikjin.com',
        password: 'test1234'
      })
    });
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      console.log('✅ 테스트 사용자가 이미 존재합니다');
      console.log('🔑 토큰:', data.token || data.accessToken);
      return data.token || data.accessToken;
    }
    
    // 사용자가 없으면 회원가입 시도
    console.log('👤 새 테스트 사용자 생성 중...');
    const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@ikjin.com',
        password: 'test1234',
        name: 'Test User',
        role: 'admin',
        phoneNumber: '010-1234-5678',
        position: 'Test Manager'
      })
    });
    
    if (!signupResponse.ok) {
      const errorText = await signupResponse.text();
      console.error('❌ 회원가입 실패:', signupResponse.status, errorText);
      
      // dev_admin 계정으로 폴백
      console.log('🔧 dev_admin 계정으로 시도...');
      const adminLogin = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@company.com',
          password: 'admin123'
        })
      });
      
      if (adminLogin.ok) {
        const data = await adminLogin.json();
        console.log('✅ dev_admin 계정으로 로그인 성공');
        return data.token || data.accessToken;
      }
      
      return null;
    }
    
    const signupData = await signupResponse.json();
    console.log('✅ 테스트 사용자 생성 완료');
    return signupData.token || signupData.accessToken;
    
  } catch (error) {
    console.error('❌ 에러:', error);
    return null;
  }
}

// 실행
createTestUser().then(token => {
  if (token) {
    console.log('\n✨ 테스트 준비 완료!');
    console.log('🔑 사용할 토큰:', token);
    console.log('\n다음 명령어로 테스트를 실행하세요:');
    console.log('node test-data/test-excel-upload-api.js');
  } else {
    console.log('\n❌ 테스트 사용자 설정 실패');
  }
});