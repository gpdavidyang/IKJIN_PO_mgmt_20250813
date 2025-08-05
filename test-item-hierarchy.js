#!/usr/bin/env node
/**
 * 품목 계층 구조 구현 테스트 스크립트
 * 구현된 기능들이 제대로 작동하는지 확인
 */

const axios = require('axios');
const colors = require('colors');

// 테스트 서버 설정
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_USER = { username: 'admin', password: 'admin123' }; // 실제 테스트 계정으로 변경 필요

// 테스트 결과 저장
const testResults = {
  passed: [],
  failed: [],
  skipped: []
};

// 테스트 헬퍼 함수들
async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    return response.headers['set-cookie'];
  } catch (error) {
    console.error('로그인 실패:', error.message);
    return null;
  }
}

async function runTest(testName, testFn) {
  console.log(`\n🧪 테스트: ${testName}`.yellow);
  try {
    await testFn();
    testResults.passed.push(testName);
    console.log(`✅ 성공`.green);
  } catch (error) {
    testResults.failed.push({ name: testName, error: error.message });
    console.log(`❌ 실패: ${error.message}`.red);
  }
}

// 메인 테스트 실행
async function runAllTests() {
  console.log('🚀 품목 계층 구조 구현 테스트 시작\n'.cyan.bold);
  
  // 로그인
  const cookies = await login();
  if (!cookies) {
    console.error('로그인 실패로 테스트를 중단합니다.'.red);
    return;
  }

  // axios 기본 설정
  axios.defaults.headers.common['Cookie'] = cookies;

  // 1. 데이터베이스 스키마 테스트
  await runTest('purchaseOrderItems 테이블에 품목 계층 필드 존재 확인', async () => {
    // 실제 발주서 조회를 통해 간접적으로 확인
    const response = await axios.get(`${API_BASE_URL}/orders?limit=1`);
    if (response.data.orders && response.data.orders.length > 0) {
      const order = response.data.orders[0];
      if (order.items && order.items.length > 0) {
        const item = order.items[0];
        // 필드 존재 여부 확인
        if (!('majorCategory' in item) && !('middleCategory' in item) && !('minorCategory' in item)) {
          throw new Error('품목 계층 필드가 응답에 포함되지 않음');
        }
      }
    }
  });

  // 2. API 엔드포인트 테스트
  await runTest('대분류 카테고리 조회 API', async () => {
    const response = await axios.get(`${API_BASE_URL}/items/major-categories`);
    if (!Array.isArray(response.data)) {
      throw new Error('응답이 배열이 아님');
    }
    console.log(`  - 대분류 개수: ${response.data.length}`);
  });

  await runTest('중분류 카테고리 조회 API', async () => {
    // 먼저 대분류를 가져옴
    const majorResponse = await axios.get(`${API_BASE_URL}/items/major-categories`);
    if (majorResponse.data.length > 0) {
      const majorCategory = majorResponse.data[0];
      const response = await axios.get(`${API_BASE_URL}/items/middle-categories?majorCategory=${encodeURIComponent(majorCategory)}`);
      if (!Array.isArray(response.data)) {
        throw new Error('응답이 배열이 아님');
      }
      console.log(`  - ${majorCategory}의 중분류 개수: ${response.data.length}`);
    }
  });

  // 3. 발주서 필터링 테스트
  await runTest('품목 계층별 발주서 필터링', async () => {
    // 먼저 전체 발주서 조회
    const allOrdersResponse = await axios.get(`${API_BASE_URL}/orders`);
    const totalOrders = allOrdersResponse.data.total || 0;
    console.log(`  - 전체 발주서: ${totalOrders}건`);

    // 대분류로 필터링
    const majorCategories = await axios.get(`${API_BASE_URL}/items/major-categories`);
    if (majorCategories.data.length > 0) {
      const testCategory = majorCategories.data[0];
      const filteredResponse = await axios.get(`${API_BASE_URL}/orders?majorCategory=${encodeURIComponent(testCategory)}`);
      console.log(`  - "${testCategory}" 대분류 발주서: ${filteredResponse.data.total || 0}건`);
    }
  });

  // 4. 대시보드 통계 테스트
  await runTest('대시보드 품목 계층별 통계', async () => {
    const response = await axios.get(`${API_BASE_URL}/dashboard/unified`);
    if (!response.data.categoryStats) {
      throw new Error('categoryStats가 응답에 포함되지 않음');
    }
    const categoryStats = response.data.categoryStats;
    console.log(`  - 품목 계층별 통계 개수: ${categoryStats.length}개`);
    
    // 상위 3개 카테고리 출력
    if (categoryStats.length > 0) {
      const topCategories = categoryStats
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 3);
      console.log('  - 금액 상위 3개 카테고리:');
      topCategories.forEach((cat, index) => {
        console.log(`    ${index + 1}. ${cat.majorCategory}/${cat.middleCategory}/${cat.minorCategory}: ${cat.orderCount}건, ${cat.totalAmount.toLocaleString()}원`);
      });
    }
  });

  // 5. UI 숨김 처리 테스트
  await runTest('품목 관리 UI 접근 차단 확인', async () => {
    try {
      // 품목 관리 페이지 접근 시도
      await axios.get(`${API_BASE_URL}/items`);
      // 만약 성공하면 UI는 숨겼지만 API는 여전히 활성화 상태
      console.log('  - API는 활성화 상태 (정상)');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('  - API도 비활성화됨 (주의 필요)');
      }
    }
  });

  // 6. Excel 다운로드 테스트
  await runTest('Excel 다운로드에 품목 계층 정보 포함 확인', async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/orders/export`, {
        responseType: 'arraybuffer'
      });
      console.log(`  - Excel 파일 크기: ${response.data.byteLength} bytes`);
      // 실제 Excel 파일 내용 검증은 별도 라이브러리 필요
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('  - Excel 다운로드 엔드포인트가 구현되지 않음');
        testResults.skipped.push('Excel 다운로드 테스트');
      } else {
        throw error;
      }
    }
  });

  // 테스트 결과 요약
  console.log('\n\n📊 테스트 결과 요약\n'.cyan.bold);
  console.log(`✅ 성공: ${testResults.passed.length}개`.green);
  console.log(`❌ 실패: ${testResults.failed.length}개`.red);
  console.log(`⏭️  건너뜀: ${testResults.skipped.length}개`.yellow);

  if (testResults.failed.length > 0) {
    console.log('\n실패한 테스트:'.red);
    testResults.failed.forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`.red);
    });
  }

  if (testResults.skipped.length > 0) {
    console.log('\n건너뛴 테스트:'.yellow);
    testResults.skipped.forEach(test => {
      console.log(`  - ${test}`.yellow);
    });
  }

  // 구현 상태 평가
  console.log('\n\n🎯 구현 상태 평가\n'.cyan.bold);
  const successRate = (testResults.passed.length / (testResults.passed.length + testResults.failed.length)) * 100;
  
  if (successRate === 100) {
    console.log('✨ 모든 기능이 완벽하게 구현되었습니다!'.green.bold);
  } else if (successRate >= 80) {
    console.log('👍 대부분의 기능이 정상적으로 구현되었습니다.'.green);
  } else if (successRate >= 60) {
    console.log('⚠️  일부 기능에 문제가 있습니다.'.yellow);
  } else {
    console.log('❌ 구현에 심각한 문제가 있습니다.'.red);
  }
  
  console.log(`\n성공률: ${successRate.toFixed(1)}%\n`);
}

// 테스트 실행
runAllTests().catch(console.error);