import axios from 'axios';

async function verifyStatusFix() {
  try {
    console.log('🔍 발주서 상태 표시 수정 확인 중...\n');
    
    // API 호출
    const response = await axios.get('http://localhost:5001/api/orders-optimized', {
      params: {
        page: 1,
        limit: 10,
        sortBy: 'id',
        sortOrder: 'desc'
      },
      withCredentials: true
    });
    
    if (response.status !== 200) {
      console.error('❌ API 호출 실패:', response.status);
      return;
    }
    
    console.log('✅ API 호출 성공\n');
    console.log('📊 전체 발주서 수:', response.data.total);
    console.log('📄 현재 페이지 발주서 수:', response.data.orders?.length);
    
    // 상태별 카운트
    const statusCount: Record<string, number> = {};
    const statusExamples: Record<string, any[]> = {};
    
    response.data.orders?.forEach((order: any) => {
      const status = order.orderStatus || 'undefined';
      statusCount[status] = (statusCount[status] || 0) + 1;
      
      if (!statusExamples[status]) {
        statusExamples[status] = [];
      }
      if (statusExamples[status].length < 2) {
        statusExamples[status].push({
          id: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          status: order.status
        });
      }
    });
    
    console.log('\n📈 상태별 발주서 분포:');
    console.log('━'.repeat(50));
    
    Object.entries(statusCount).forEach(([status, count]) => {
      const displayText = 
        status === 'draft' ? '임시저장' :
        status === 'created' ? '발주생성' :
        status === 'sent' ? '발주완료' :
        status === 'delivered' ? '납품완료' :
        status === 'undefined' ? '❌ 상태 없음 (오류)' :
        status;
      
      const emoji = 
        status === 'undefined' ? '❌' :
        status === 'draft' ? '📝' :
        status === 'created' ? '📋' :
        status === 'sent' ? '✉️' :
        status === 'delivered' ? '✅' :
        '❓';
        
      console.log(`  ${emoji} ${displayText}: ${count}개`);
      
      // 예시 표시
      if (statusExamples[status]) {
        statusExamples[status].forEach(example => {
          console.log(`     └─ ${example.orderNumber} (ID: ${example.id})`);
        });
      }
    });
    
    console.log('━'.repeat(50));
    
    // 문제 진단
    if (statusCount['undefined'] > 0) {
      console.log('\n⚠️  경고: orderStatus가 없는 발주서가 있습니다!');
      console.log('   → 데이터베이스 또는 API 응답에 문제가 있을 수 있습니다.');
    }
    
    const allDraft = Object.keys(statusCount).length === 1 && statusCount['draft'];
    if (allDraft) {
      console.log('\n❌ 문제 발견: 모든 발주서가 "임시저장" 상태로 표시됩니다!');
      console.log('   → 수정이 제대로 적용되지 않았습니다.');
    } else if (Object.keys(statusCount).length > 1) {
      console.log('\n✅ 정상: 다양한 상태의 발주서가 올바르게 표시되고 있습니다!');
    }
    
    // 특정 ID 확인
    console.log('\n🎯 특정 발주서 상세 확인:');
    const testIds = [257, 256, 255, 250];
    
    for (const testId of testIds) {
      const order = response.data.orders?.find((o: any) => o.id === testId);
      if (order) {
        const displayStatus = 
          order.orderStatus === 'draft' ? '임시저장' :
          order.orderStatus === 'created' ? '발주생성' :
          order.orderStatus === 'sent' ? '발주완료' :
          order.orderStatus === 'delivered' ? '납품완료' :
          `알 수 없음(${order.orderStatus})`;
          
        console.log(`  ID ${testId}: ${order.orderNumber}`);
        console.log(`    - DB status: ${order.status}`);
        console.log(`    - orderStatus: ${order.orderStatus} → "${displayStatus}"`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ 테스트 실패:', error.message);
    if (error.response) {
      console.error('   응답 상태:', error.response.status);
      console.error('   응답 데이터:', error.response.data);
    }
  }
}

verifyStatusFix();