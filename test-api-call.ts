import axios from 'axios';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'ikjin-po-mgmt-jwt-secret-2025-secure-key';

async function testAPICall() {
  try {
    // JWT 토큰 생성
    const payload = {
      userId: 'test_admin_001',
      email: 'test@ikjin.co.kr',
      role: 'admin'
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    console.log('🔧 JWT 토큰 생성 완료');
    console.log('🔑 Token (first 50 chars):', token.substring(0, 50) + '...');
    
    // API 호출 테스트 - 단순한 발주서 하나로 테스트
    const orderId = 190; // 임시저장 상태 발주서 ID
    console.log(`📞 API 호출 시작: /api/orders/${orderId}/regenerate-pdf`);
    
    const response = await axios.post(`http://localhost:5001/api/orders/${orderId}/regenerate-pdf`, {}, {
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API 호출 성공!');
    console.log('📋 Response:', response.data);
    
  } catch (error) {
    console.error('❌ API 호출 실패:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAPICall();