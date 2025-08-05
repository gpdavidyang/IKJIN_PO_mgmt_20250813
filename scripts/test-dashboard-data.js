#!/usr/bin/env node

/**
 * Dashboard Data Testing Tool
 * Supabase 데이터를 변경하여 대시보드 그래프의 실시간 변화를 확인하는 도구
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://tbvugytmskxxyqfvqmup.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidnVneXRtc2t4eHlxZnZxbXVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM3OTUxOCwiZXhwIjoyMDY3OTU1NTE4fQ.1xyuCHnAtXlMailPc52C7z6olHXRob40TkjYaXwuqMY'
);

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 현재 데이터 상태 조회
async function getCurrentData() {
  colorLog('cyan', '\n=== 📊 현재 대시보드 데이터 상태 ===');
  
  // 상태별 발주서 수
  const { data: statusData, error: statusError } = await supabase
    .from('purchase_orders')
    .select('status')
    .then(result => {
      if (result.error) return result;
      
      const statusCounts = result.data.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, {});
      
      return { data: statusCounts, error: null };
    });

  if (statusError) {
    colorLog('red', `❌ 상태 데이터 조회 실패: ${statusError.message}`);
    return;
  }

  colorLog('green', '📈 발주 상태 분포:');
  Object.entries(statusData).forEach(([status, count]) => {
    const statusKor = {
      'draft': '임시저장',
      'pending': '승인대기', 
      'approved': '승인완료',
      'sent': '발송완료',
      'completed': '완료',
      'cancelled': '취소됨'
    }[status] || status;
    
    console.log(`   ${statusKor}: ${count}건`);
  });

  // 월별 발주 현황
  const { data: monthlyData, error: monthlyError } = await supabase
    .rpc('get_monthly_stats');

  if (!monthlyError && monthlyData) {
    colorLog('green', '\n📅 월별 발주 현황:');
    monthlyData.forEach(row => {
      console.log(`   ${row.month}: ${row.count}건 (₩${Number(row.amount).toLocaleString()})`);
    });
  }
}

// 테스트 데이터 추가
async function addTestData() {
  colorLog('yellow', '\n=== ➕ 테스트 데이터 추가 ===');
  
  const testOrders = [
    {
      order_number: `TEST-${Date.now()}-001`,
      status: 'pending',
      total_amount: 15000000,
      order_date: new Date().toISOString(),
      user_id: 'test_admin_001',
      vendor_id: 1,
      project_id: 17
    },
    {
      order_number: `TEST-${Date.now()}-002`, 
      status: 'approved',
      total_amount: 8500000,
      order_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 전
      user_id: 'test_admin_001',
      vendor_id: 1,
      project_id: 17
    },
    {
      order_number: `TEST-${Date.now()}-003`,
      status: 'sent', 
      total_amount: 12000000,
      order_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60일 전
      user_id: 'test_admin_001',
      vendor_id: 1,
      project_id: 17
    }
  ];

  for (const order of testOrders) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert(order)
      .select();

    if (error) {
      colorLog('red', `❌ 데이터 추가 실패: ${error.message}`);
    } else {
      colorLog('green', `✅ 추가됨: ${order.order_number} (${order.status})`);
    }
  }
}

// 특정 발주서 상태 변경
async function changeOrderStatus(orderNumber, newStatus) {
  colorLog('yellow', `\n=== 🔄 발주서 상태 변경: ${orderNumber} → ${newStatus} ===`);
  
  const { data, error } = await supabase
    .from('purchase_orders')
    .update({ status: newStatus })
    .eq('order_number', orderNumber)
    .select();

  if (error) {
    colorLog('red', `❌ 상태 변경 실패: ${error.message}`);
  } else if (data.length === 0) {
    colorLog('red', `❌ 발주서를 찾을 수 없음: ${orderNumber}`);
  } else {
    colorLog('green', `✅ 상태 변경 완료: ${orderNumber} → ${newStatus}`);
  }
}

// 월별 데이터 추가 (다양한 월에 분산)
async function addMonthlyTestData() {
  colorLog('yellow', '\n=== 📅 월별 테스트 데이터 추가 ===');
  
  const months = [
    { date: '2024-07-15', amount: 25000000, status: 'completed' },
    { date: '2024-08-15', amount: 18000000, status: 'sent' },
    { date: '2024-09-15', amount: 32000000, status: 'approved' },
    { date: '2024-10-15', amount: 45000000, status: 'pending' },
    { date: '2024-11-15', amount: 28000000, status: 'completed' },
    { date: '2024-12-15', amount: 35000000, status: 'sent' },
    { date: '2025-01-15', amount: 22000000, status: 'approved' },
    { date: '2025-02-15', amount: 41000000, status: 'pending' }
  ];

  for (const month of months) {
    const testOrder = {
      order_number: `MONTHLY-TEST-${month.date}`,
      status: month.status,
      total_amount: month.amount,
      order_date: month.date,
      user_id: 'test_admin_001',
      vendor_id: 1,
      project_id: 17
    };

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert(testOrder)
      .select();

    if (error) {
      colorLog('red', `❌ ${month.date} 데이터 추가 실패: ${error.message}`);
    } else {
      colorLog('green', `✅ ${month.date}: ₩${month.amount.toLocaleString()} (${month.status})`);
    }
  }
}

// 테스트 데이터 정리
async function cleanupTestData() {
  colorLog('yellow', '\n=== 🧹 테스트 데이터 정리 ===');
  
  const { data, error } = await supabase
    .from('purchase_orders')
    .delete()
    .or('order_number.like.TEST-%,order_number.like.MONTHLY-TEST-%')
    .select();

  if (error) {
    colorLog('red', `❌ 정리 실패: ${error.message}`);
  } else {
    colorLog('green', `✅ ${data.length}개 테스트 데이터 삭제됨`);
  }
}

// 대시보드 캐시 초기화 (프론트엔드에서 최신 데이터 확인용)
async function clearDashboardCache() {
  colorLog('cyan', '\n=== 🔄 대시보드 캐시 초기화 중... ===');
  
  try {
    const response = await fetch('http://localhost:3000/api/dashboard/unified?force=true');
    if (response.ok) {
      colorLog('green', '✅ 캐시 초기화 완료 - 브라우저를 새로고침하세요');
    } else {
      colorLog('yellow', '⚠️ 캐시 초기화 요청 전송 (서버 상태 확인 필요)');
    }
  } catch (error) {
    colorLog('yellow', '⚠️ 로컬 서버가 실행 중이 아님 - 수동으로 새로고침하세요');
  }
}

// 메인 실행 함수
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    colorLog('bright', '🎯 대시보드 데이터 테스트 도구');
    colorLog('white', '\n사용법:');
    console.log('  node scripts/test-dashboard-data.js current           # 현재 데이터 조회');
    console.log('  node scripts/test-dashboard-data.js add              # 테스트 데이터 추가');
    console.log('  node scripts/test-dashboard-data.js monthly          # 월별 테스트 데이터 추가');
    console.log('  node scripts/test-dashboard-data.js change ORDER STATUS # 발주서 상태 변경');
    console.log('  node scripts/test-dashboard-data.js cleanup          # 테스트 데이터 정리');
    console.log('  node scripts/test-dashboard-data.js refresh          # 캐시 초기화');
    console.log('\n예시:');
    console.log('  node scripts/test-dashboard-data.js change TEST-123 approved');
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'current':
        await getCurrentData();
        break;
      case 'add':
        await addTestData();
        await clearDashboardCache();
        break;
      case 'monthly':
        await addMonthlyTestData();
        await clearDashboardCache();
        break;
      case 'change':
        if (args.length < 3) {
          colorLog('red', '❌ 사용법: change [order_number] [new_status]');
          return;
        }
        await changeOrderStatus(args[1], args[2]);
        await clearDashboardCache();
        break;
      case 'cleanup':
        await cleanupTestData();
        await clearDashboardCache();
        break;
      case 'refresh':
        await clearDashboardCache();
        break;
      default:
        colorLog('red', `❌ 알 수 없는 명령어: ${command}`);
    }
  } catch (error) {
    colorLog('red', `❌ 실행 오류: ${error.message}`);
  }

  colorLog('dim', '\n완료. 대시보드를 새로고침하여 변경사항을 확인하세요.');
}

// 스크립트 실행
main().catch(console.error);