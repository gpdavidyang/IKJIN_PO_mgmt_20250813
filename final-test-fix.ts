import axios from 'axios';

async function finalTestFix() {
  try {
    console.log('🔍 최종 수정사항 테스트 중...');
    
    const response = await axios.get('http://localhost:5001/api/orders-optimized', {
      params: {
        page: 1,
        limit: 5,
        sortBy: 'id',
        sortOrder: 'desc'
      },
      withCredentials: true
    });
    
    console.log('\n📊 API 응답:');
    console.log('Status:', response.status);
    console.log('Total orders:', response.data.orders?.length);
    
    console.log('\n📋 상위 3개 발주서 상태:');
    response.data.orders?.slice(0, 3).forEach((order: any, index: number) => {
      console.log(`\n${index + 1}. ${order.orderNumber} (ID: ${order.id}):`);
      console.log(`   - 레거시 status: ${order.status}`);
      console.log(`   - 발주상태 (orderStatus): ${order.orderStatus}`);
      console.log(`   - 승인상태 (approvalStatus): ${order.approvalStatus}`);
      
      // 상태 표시 확인
      const displayStatus = order.orderStatus === 'draft' ? '임시저장' : 
                          order.orderStatus === 'created' ? '발주생성' :
                          order.orderStatus === 'sent' ? '발주완료' : order.orderStatus;
      console.log(`   ➡️  UI 표시: "${displayStatus}"`);
    });
    
    console.log('\n🎯 ID 250 특별 확인:');
    const order250 = response.data.orders?.find((o: any) => o.id === 250);
    if (order250) {
      const displayStatus = order250.orderStatus === 'created' ? '발주생성' : order250.orderStatus;
      console.log(`   - orderStatus: ${order250.orderStatus} ➡️ "${displayStatus}"`);
    } else {
      console.log('   - ID 250을 찾을 수 없음');
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

finalTestFix();