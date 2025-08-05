#!/usr/bin/env node
/**
 * 카테고리 API 디버깅 테스트
 */

const http = require('http');

// 로그인하고 API 테스트
async function testCategoryAPI() {
  console.log('🔍 카테고리 API 디버깅 시작\n');
  
  // 1. 로그인
  const loginResponse = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'];
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data, cookies });
      });
    });
    
    req.write(JSON.stringify({ email: 'test@ikjin.co.kr', password: 'admin123' }));
    req.end();
  });
  
  if (loginResponse.status !== 200) {
    console.error('로그인 실패:', loginResponse.status);
    return;
  }
  
  const sessionCookie = loginResponse.cookies[0].split(';')[0];
  console.log('✅ 로그인 성공');
  console.log(`세션: ${sessionCookie.substring(0, 30)}...\n`);
  
  // 2. 직접 데이터베이스 조회 테스트
  console.log('📊 purchaseOrderItems 테이블의 카테고리 데이터 확인:');
  
  const ordersResponse = await new Promise((resolve) => {
    http.get({
      hostname: 'localhost',
      port: 3000,
      path: '/api/orders?limit=1',
      headers: { 'Cookie': sessionCookie }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: null });
        }
      });
    });
  });
  
  if (ordersResponse.data && ordersResponse.data.orders && ordersResponse.data.orders.length > 0) {
    const order = ordersResponse.data.orders[0];
    console.log(`발주서 ID: ${order.id}`);
    
    if (order.items && order.items.length > 0) {
      console.log(`품목 개수: ${order.items.length}`);
      const sampleItem = order.items[0];
      console.log('\n첫 번째 품목의 카테고리 정보:');
      console.log(`- majorCategory: ${sampleItem.majorCategory || '없음'}`);
      console.log(`- middleCategory: ${sampleItem.middleCategory || '없음'}`);
      console.log(`- minorCategory: ${sampleItem.minorCategory || '없음'}`);
    }
  }
  
  // 3. 대시보드 API 테스트
  console.log('\n📈 대시보드 API의 카테고리 통계:');
  
  const dashboardResponse = await new Promise((resolve) => {
    http.get({
      hostname: 'localhost',
      port: 3000,
      path: '/api/dashboard/unified',
      headers: { 'Cookie': sessionCookie }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: null });
        }
      });
    });
  });
  
  if (dashboardResponse.data) {
    console.log(`대시보드 API 응답 키: ${Object.keys(dashboardResponse.data).join(', ')}`);
    
    if (dashboardResponse.data.categoryStats) {
      const stats = dashboardResponse.data.categoryStats;
      console.log(`\n카테고리 통계 개수: ${stats.length}`);
      
      if (stats.length > 0) {
        console.log('\n상위 3개 카테고리:');
        stats.slice(0, 3).forEach((cat, i) => {
          console.log(`${i + 1}. ${cat.majorCategory}/${cat.middleCategory}/${cat.minorCategory}`);
          console.log(`   - 발주 건수: ${cat.orderCount}`);
          console.log(`   - 총 금액: ${cat.totalAmount?.toLocaleString() || 0}원`);
        });
      }
    } else {
      console.log('❌ categoryStats가 응답에 없음');
    }
  }
  
  // 4. API 에러 상세 정보 확인
  console.log('\n🔧 대분류 카테고리 API 에러 확인:');
  
  const majorCatResponse = await new Promise((resolve) => {
    http.get({
      hostname: 'localhost',
      port: 3000,
      path: '/api/items/major-categories',
      headers: { 'Cookie': sessionCookie }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          data: data,
          headers: res.headers
        });
      });
    });
  });
  
  console.log(`상태 코드: ${majorCatResponse.status}`);
  console.log(`응답: ${majorCatResponse.data}`);
}

// 실행
testCategoryAPI().catch(console.error);