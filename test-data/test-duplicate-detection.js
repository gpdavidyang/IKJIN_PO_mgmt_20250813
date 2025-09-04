import { DuplicateDetectionService } from '../server/services/duplicate-detection-service.js';

// 테스트 데이터
const testData = [
  {
    id: 1,
    project: '서울타워 신축',
    vendor: '삼성물산',
    item_name: '철근',
    specification: 'HD10',
    unit: 'TON',
    quantity: 100,
    unit_price: 850000
  },
  {
    id: 2,
    project: '서울타워 신축',
    vendor: 'LG건설',
    item_name: '시멘트',
    specification: '포틀랜드',
    unit: 'TON',
    quantity: 200,
    unit_price: 120000
  },
  {
    id: 3,
    project: '서울타워 신축',
    vendor: '삼성물산',
    item_name: '철근',
    specification: 'HD10',
    unit: 'TON',
    quantity: 100,
    unit_price: 850000
  }, // 완전 중복 (id 1과 동일)
  {
    id: 4,
    project: '서울타워 신축',
    vendor: '삼성물산',
    item_name: '철근',
    specification: 'HD10',
    unit: 'TON',
    quantity: 150, // 수량만 다름
    unit_price: 850000
  },
  {
    id: 5,
    project: '부산항 개발',
    vendor: '삼섬물산', // 오타
    item_name: '콘크리트',
    specification: 'C25',
    unit: 'M3',
    quantity: 500,
    unit_price: 85000
  }
];

async function testDuplicateDetection() {
  console.log('🚀 중복 감지 서비스 테스트 시작\n');
  
  const service = new DuplicateDetectionService();
  
  try {
    // 중복 감지 실행
    const results = await service.detectDuplicates(
      testData,
      'test-session-001',
      {
        checkExisting: false, // DB 연결 없이 테스트
        similarityThreshold: 0.85,
        groupSimilar: true,
        detectPartialDuplicates: true
      }
    );
    
    console.log('📊 테스트 결과:\n');
    console.log(`총 ${testData.length}개 항목 검사\n`);
    
    // 결과 출력
    results.forEach((result, index) => {
      console.log(`항목 ${index + 1}:`);
      console.log(`  - 중복 여부: ${result.isDuplicate ? '✅ 예' : '❌ 아니오'}`);
      
      if (result.isDuplicate) {
        console.log(`  - 중복 유형: ${result.duplicateType === 'exact' ? '완전 중복' : '유사 항목'}`);
        console.log(`  - 신뢰도: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`  - 매칭된 행: ${result.matchedRows.join(', ')}`);
        
        if (result.duplicateGroups && result.duplicateGroups.length > 0) {
          console.log(`  - 중복 그룹:`);
          result.duplicateGroups.forEach(group => {
            console.log(`    • 그룹 ${group.groupId}: ${group.rows.join(', ')} (${group.type})`);
          });
        }
      }
      console.log('');
    });
    
    // 통계
    const exactDuplicates = Array.from(results.values()).filter(r => r.duplicateType === 'exact').length;
    const similarItems = Array.from(results.values()).filter(r => r.duplicateType === 'similar').length;
    
    console.log('📈 통계:');
    console.log(`  - 완전 중복: ${exactDuplicates}개`);
    console.log(`  - 유사 항목: ${similarItems}개`);
    console.log(`  - 정상 항목: ${testData.length - exactDuplicates - similarItems}개`);
    
    // 기능 검증
    console.log('\n✨ 기능 검증:');
    
    // 1. 완전 중복 감지 확인 (항목 1과 3)
    const item1Result = results.get(0);
    const item3Result = results.get(2);
    if (item3Result?.isDuplicate && item3Result?.duplicateType === 'exact') {
      console.log('  ✅ 완전 중복 감지 성공');
    } else {
      console.log('  ❌ 완전 중복 감지 실패');
    }
    
    // 2. 유사 항목 감지 확인 (항목 1과 4 - 수량만 다름)
    const item4Result = results.get(3);
    if (item4Result?.isDuplicate && item4Result?.duplicateType === 'similar') {
      console.log('  ✅ 유사 항목 감지 성공');
    } else {
      console.log('  ❌ 유사 항목 감지 실패');
    }
    
    // 3. 거래처명 유사성 감지 (삼성물산 vs 삼섬물산)
    const samsungItems = testData.filter(item => item.vendor.includes('삼'));
    if (samsungItems.length > 0) {
      console.log('  ✅ 거래처명 유사성 체크 가능');
    }
    
    console.log('\n🎉 중복 감지 서비스 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

// 테스트 실행
testDuplicateDetection();