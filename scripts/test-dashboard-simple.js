#!/usr/bin/env node

/**
 * Simple Dashboard Data Testing Tool
 * 기존 MCP Supabase를 통해 대시보드 데이터를 테스트하는 간단한 도구
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m', 
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function showUsage() {
  colorLog('bright', '🎯 대시보드 데이터 테스트 도구 (간단 버전)');
  colorLog('cyan', '\n이 도구는 Claude Code의 MCP Supabase 도구와 함께 사용됩니다.');
  
  console.log('\n📋 테스트 시나리오:');
  console.log('1. 다양한 상태의 발주서 추가');
  console.log('2. 월별 발주 데이터 추가'); 
  console.log('3. 발주서 상태 변경');
  console.log('4. 테스트 데이터 정리');
  
  console.log('\n🔧 Claude Code에서 다음 명령어들을 실행하세요:');
  console.log('');
  
  colorLog('yellow', '# 1. 현재 데이터 확인');
  console.log('mcp__supabase__execute_sql 쿼리로 현재 상태 확인');
  
  colorLog('yellow', '\n# 2. 테스트 데이터 추가 (다양한 상태)');
  console.log(`mcp__supabase__execute_sql 다음 쿼리 실행:`);
  console.log(`INSERT INTO purchase_orders (order_number, status, total_amount, order_date, user_id, vendor_id, project_id) VALUES`);
  console.log(`  ('TEST-PENDING-001', 'pending', 15000000, CURRENT_DATE, 'test_admin_001', 1, 17),`);
  console.log(`  ('TEST-APPROVED-001', 'approved', 25000000, CURRENT_DATE - INTERVAL '15 days', 'test_admin_001', 1, 17),`);
  console.log(`  ('TEST-SENT-001', 'sent', 18000000, CURRENT_DATE - INTERVAL '30 days', 'test_admin_001', 1, 17),`);
  console.log(`  ('TEST-COMPLETED-001', 'completed', 32000000, CURRENT_DATE - INTERVAL '45 days', 'test_admin_001', 1, 17);`);

  colorLog('yellow', '\n# 3. 월별 분산 데이터 추가');
  console.log(`월별 그래프 테스트를 위한 데이터:`);
  console.log(`INSERT INTO purchase_orders (order_number, status, total_amount, order_date, user_id, vendor_id, project_id) VALUES`);
  console.log(`  ('MONTH-2024-07', 'completed', 28000000, '2024-07-15', 'test_admin_001', 1, 17),`);
  console.log(`  ('MONTH-2024-08', 'sent', 35000000, '2024-08-15', 'test_admin_001', 1, 17),`);
  console.log(`  ('MONTH-2024-09', 'approved', 22000000, '2024-09-15', 'test_admin_001', 1, 17),`);
  console.log(`  ('MONTH-2024-10', 'pending', 41000000, '2024-10-15', 'test_admin_001', 1, 17),`);
  console.log(`  ('MONTH-2024-11', 'completed', 29000000, '2024-11-15', 'test_admin_001', 1, 17),`);
  console.log(`  ('MONTH-2024-12', 'sent', 33000000, '2024-12-15', 'test_admin_001', 1, 17),`);
  console.log(`  ('MONTH-2025-01', 'approved', 27000000, '2025-01-15', 'test_admin_001', 1, 17),`);
  console.log(`  ('MONTH-2025-02', 'pending', 38000000, '2025-02-15', 'test_admin_001', 1, 17);`);

  colorLog('yellow', '\n# 4. 상태 변경 테스트');
  console.log(`특정 발주서의 상태를 변경하여 그래프 변화 관찰:`);  
  console.log(`UPDATE purchase_orders SET status = 'approved' WHERE order_number = 'TEST-PENDING-001';`);
  console.log(`UPDATE purchase_orders SET status = 'sent' WHERE order_number = 'TEST-APPROVED-001';`);

  colorLog('yellow', '\n# 5. 결과 확인 쿼리');
  console.log(`# 상태별 분포 확인:`);
  console.log(`SELECT status, COUNT(*) as count FROM purchase_orders GROUP BY status ORDER BY count DESC;`);
  console.log(`\n# 월별 현황 확인:`);
  console.log(`SELECT TO_CHAR(order_date, 'YYYY-MM') as month, COUNT(*) as count, SUM(total_amount) as total`);
  console.log(`FROM purchase_orders WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'`);
  console.log(`GROUP BY TO_CHAR(order_date, 'YYYY-MM') ORDER BY month;`);

  colorLog('yellow', '\n# 6. 테스트 데이터 정리');
  console.log(`테스트 완료 후 정리:`);
  console.log(`DELETE FROM purchase_orders WHERE order_number LIKE 'TEST-%' OR order_number LIKE 'MONTH-%';`);

  colorLog('yellow', '\n# 7. 캐시 초기화');
  console.log(`브라우저에서 localhost:3000/api/dashboard/unified?force=true 호출하거나 새로고침`);
  
  console.log('\n📊 각 단계 후 대시보드를 새로고침하여 그래프 변화를 확인하세요!');
  
  colorLog('cyan', '\n💡 팁: Claude Code의 mcp__supabase__execute_sql 도구를 사용하면');
  colorLog('cyan', '    위 쿼리들을 직접 실행할 수 있습니다.');
}

// 명령행 인수 확인
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help') {
  showUsage();
} else {
  colorLog('red', '❌ 알 수 없는 명령어입니다. 도움말을 보려면:');
  console.log('node scripts/test-dashboard-simple.js help');
}