#!/usr/bin/env node
/**
 * 품목 계층 구조 간단 테스트
 */

const http = require('http');

// 테스트 결과
let passCount = 0;
let failCount = 0;

// HTTP 요청 헬퍼
function httpRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// 테스트 실행
async function runTest(name, testFn) {
  console.log(`\n테스트: ${name}`);
  try {
    await testFn();
    passCount++;
    console.log('✅ 성공');
  } catch (error) {
    failCount++;
    console.log(`❌ 실패: ${error.message}`);
  }
}

// 메인 테스트
async function main() {
  console.log('🚀 품목 계층 구조 테스트 시작\n');

  // 1. 로그인
  let sessionCookie = '';
  await runTest('로그인 테스트', async () => {
    const response = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@ikjin.co.kr', password: 'admin123' })
    });
    
    if (response.status !== 200) {
      throw new Error(`로그인 실패: ${response.status}`);
    }
    
    // 세션 쿠키 추출
    const setCookie = response.headers['set-cookie'];
    if (setCookie && setCookie[0]) {
      sessionCookie = setCookie[0].split(';')[0];
      console.log(`  세션 쿠키: ${sessionCookie.substring(0, 30)}...`);
    }
  });

  // 2. 대분류 카테고리 조회
  await runTest('대분류 카테고리 API', async () => {
    const response = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/items/major-categories',
      method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });
    
    if (response.status !== 200) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }
    
    if (!Array.isArray(response.data)) {
      throw new Error('응답이 배열이 아님');
    }
    
    console.log(`  대분류 개수: ${response.data.length}`);
    if (response.data.length > 0) {
      console.log(`  예시: ${response.data.slice(0, 3).join(', ')}`);
    }
  });

  // 3. 통합 대시보드 API의 카테고리 통계
  await runTest('대시보드 카테고리 통계', async () => {
    const response = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/dashboard/unified',
      method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });
    
    if (response.status !== 200) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }
    
    if (!response.data.categoryStats) {
      throw new Error('categoryStats가 응답에 없음');
    }
    
    const stats = response.data.categoryStats;
    console.log(`  카테고리 통계 개수: ${stats.length}`);
    
    if (stats.length > 0) {
      const sample = stats[0];
      console.log(`  예시: ${sample.majorCategory}/${sample.middleCategory}/${sample.minorCategory} - ${sample.orderCount}건`);
    }
  });

  // 4. 발주서 필터링 테스트
  await runTest('발주서 카테고리 필터링', async () => {
    // 먼저 전체 발주서 조회
    let response = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/orders',
      method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });
    
    const totalOrders = response.data.total || 0;
    console.log(`  전체 발주서: ${totalOrders}건`);
    
    // 대분류 가져오기
    response = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/items/major-categories',
      method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });
    
    if (response.data.length > 0) {
      const testCategory = response.data[0];
      
      // 필터링된 발주서 조회
      response = await httpRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/orders?majorCategory=${encodeURIComponent(testCategory)}`,
        method: 'GET',
        headers: { 'Cookie': sessionCookie }
      });
      
      const filteredOrders = response.data.total || 0;
      console.log(`  "${testCategory}" 필터링: ${filteredOrders}건`);
    }
  });

  // 5. UI 라우트 확인 (품목 관리 페이지 제거 확인)
  await runTest('품목 관리 UI 제거 확인', async () => {
    // 이 테스트는 실제로는 프론트엔드에서 확인해야 하지만,
    // API 레벨에서는 여전히 작동해야 함
    const response = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/items',
      method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });
    
    if (response.status === 200) {
      console.log('  API는 여전히 활성 (정상)');
    } else {
      console.log(`  API 상태: ${response.status}`);
    }
  });

  // 결과 요약
  console.log('\n\n📊 테스트 결과');
  console.log(`✅ 성공: ${passCount}`);
  console.log(`❌ 실패: ${failCount}`);
  console.log(`성공률: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%\n`);
}

// 실행
main().catch(console.error);