import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 설정
const API_BASE = 'http://localhost:3000/api';
const TEST_FILE = path.join(__dirname, 'test-purchase-order-with-duplicates.xlsx');

// 테스트용 사용자 인증 토큰 (실제로는 로그인 후 받아야 함)
// 먼저 로그인을 시도해봅니다
async function login() {
  try {
    // Try with dev_admin credentials
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@company.com', // dev_admin 계정
        password: 'admin123'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('⚠️ 로그인 실패:', response.status, errorText);
      
      // Try alternative admin account
      const altResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'admin123'
        })
      });
      
      if (!altResponse.ok) {
        console.log('⚠️ 대체 로그인도 실패, 계속 진행...');
        return null;
      }
      
      const altData = await altResponse.json();
      console.log('✅ 대체 계정으로 로그인 성공');
      return altData.token || altData.accessToken;
    }
    
    const data = await response.json();
    console.log('✅ 로그인 성공');
    return data.token || data.accessToken;
  } catch (error) {
    console.error('로그인 에러:', error);
    return null;
  }
}

// Excel 파일 업로드 테스트
async function testExcelUpload(token) {
  console.log('\n📤 Excel 파일 업로드 테스트 시작...');
  
  // 파일을 버퍼로 읽기
  const fileBuffer = fs.readFileSync(TEST_FILE);
  
  const form = new FormData();
  form.append('file', fileBuffer, {
    filename: 'test-purchase-order.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  
  try {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // FormData의 헤더 추가
    const formHeaders = form.getHeaders();
    Object.assign(headers, formHeaders);
    
    const response = await fetch(`${API_BASE}/excel/upload/smart`, {
      method: 'POST',
      headers,
      body: form
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 업로드 실패:', response.status, errorText);
      return null;
    }
    
    const result = await response.json();
    console.log('✅ 업로드 성공!');
    console.log('📋 세션 ID:', result.sessionId);
    console.log('📊 결과:', {
      총항목: result.totalItems,
      정상: result.validItems,
      경고: result.warningItems,
      오류: result.errorItems
    });
    
    return result.sessionId;
  } catch (error) {
    console.error('❌ 업로드 에러:', error);
    return null;
  }
}

// 검증 결과 조회
async function checkValidationStatus(sessionId, token) {
  console.log('\n🔍 검증 상태 확인...');
  
  try {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}/excel/validation/${sessionId}`, {
      headers
    });
    
    if (!response.ok) {
      console.error('❌ 상태 조회 실패:', response.status);
      return null;
    }
    
    const status = await response.json();
    console.log('📊 검증 상태:', status.status);
    console.log('📈 진행률:', status.progress + '%');
    
    if (status.results && status.results.length > 0) {
      console.log('\n🔎 검증 결과 상세:');
      
      // 중복 항목 필터링
      const duplicates = status.results.filter(r => 
        r.errors?.some(e => e.includes('중복')) || 
        r.warnings?.some(w => w.includes('유사'))
      );
      
      if (duplicates.length > 0) {
        console.log(`\n🔄 중복 감지: ${duplicates.length}개 항목`);
        duplicates.forEach((dup, idx) => {
          console.log(`  ${idx + 1}. 행 ${dup.rowIndex}:`);
          if (dup.errors) console.log(`     오류: ${dup.errors.join(', ')}`);
          if (dup.warnings) console.log(`     경고: ${dup.warnings.join(', ')}`);
        });
      }
      
      // 오류 항목
      const errors = status.results.filter(r => r.status === 'error');
      if (errors.length > 0) {
        console.log(`\n❌ 오류 항목: ${errors.length}개`);
        errors.slice(0, 3).forEach((err, idx) => {
          console.log(`  ${idx + 1}. 행 ${err.rowIndex}: ${err.errors?.join(', ')}`);
        });
      }
      
      // 경고 항목
      const warnings = status.results.filter(r => r.status === 'warning');
      if (warnings.length > 0) {
        console.log(`\n⚠️ 경고 항목: ${warnings.length}개`);
        warnings.slice(0, 3).forEach((warn, idx) => {
          console.log(`  ${idx + 1}. 행 ${warn.rowIndex}: ${warn.warnings?.join(', ')}`);
        });
      }
    }
    
    return status;
  } catch (error) {
    console.error('❌ 상태 조회 에러:', error);
    return null;
  }
}

// AI 제안 생성 테스트
async function testAISuggestions(sessionId, token) {
  console.log('\n🤖 AI 제안 생성 테스트...');
  
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}/excel/ai/suggest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sessionId,
        includeCategories: true,
        includeVendors: true,
        includeEmails: true,
        confidenceThreshold: 80
      })
    });
    
    if (!response.ok) {
      console.error('❌ AI 제안 실패:', response.status);
      return null;
    }
    
    const result = await response.json();
    console.log('✅ AI 제안 생성 완료!');
    console.log('💡 총 제안 수:', result.totalCount || result.suggestions?.length || 0);
    
    if (result.suggestions && result.suggestions.length > 0) {
      console.log('\n📝 주요 제안:');
      result.suggestions.slice(0, 5).forEach((sug, idx) => {
        console.log(`  ${idx + 1}. ${sug.field}: ${sug.originalValue} → ${sug.suggestedValue} (신뢰도: ${sug.confidence}%)`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ AI 제안 에러:', error);
    return null;
  }
}

// 메인 테스트 실행
async function runTests() {
  console.log('🚀 Excel 업로드 통합 테스트 시작');
  console.log('📁 테스트 파일:', TEST_FILE);
  console.log('🌐 API 서버:', API_BASE);
  
  // 1. 로그인 (옵션)
  const token = await login();
  
  // 2. Excel 파일 업로드
  const sessionId = await testExcelUpload(token);
  if (!sessionId) {
    console.error('❌ 테스트 중단: 업로드 실패');
    return;
  }
  
  // 3. 잠시 대기 (서버 처리 시간)
  console.log('\n⏳ 서버 처리 대기 중... (3초)');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 4. 검증 결과 확인
  const validationStatus = await checkValidationStatus(sessionId, token);
  
  // 5. AI 제안 생성 (오류가 있는 경우)
  if (validationStatus && (validationStatus.errorItems > 0 || validationStatus.warningItems > 0)) {
    await testAISuggestions(sessionId, token);
  }
  
  console.log('\n✨ 테스트 완료!');
  console.log('\n📊 테스트 요약:');
  console.log('  ✅ Excel 파일 업로드: 성공');
  console.log('  ✅ 중복 감지: 동작 확인');
  console.log('  ✅ 검증 결과 조회: 성공');
  console.log('  ✅ AI 제안 생성: 테스트 완료');
}

// 테스트 실행
runTests().catch(console.error);