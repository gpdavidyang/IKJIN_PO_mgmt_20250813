import XLSX from 'xlsx';

// Excel 파일 경로
const filePath = './PO_test/generated_purchase_orders/PO_001_서울창호이정선_20230120_1items.xlsx';

try {
  console.log('📊 Excel 파일 구조 분석 시작:', filePath);
  
  // 파일 읽기
  const workbook = XLSX.readFile(filePath);
  
  console.log('📋 시트 목록:', workbook.SheetNames);
  
  // Input 시트 확인
  if (workbook.SheetNames.includes('Input')) {
    const worksheet = workbook.Sheets['Input'];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('\n🔍 Input 시트 구조:');
    console.log('총 행 수:', data.length);
    console.log('첫 번째 행 (헤더):', data[0]);
    
    if (data.length > 1) {
      console.log('\n두 번째 행 (첫 번째 데이터):', data[1]);
      console.log('행 길이:', data[1]?.length);
      
      // 각 컬럼별 값 출력
      if (data[1]) {
        console.log('\n📋 컬럼별 값:');
        data[1].forEach((value, index) => {
          const letter = String.fromCharCode(65 + index); // A, B, C...
          console.log(`${letter}열(${index}): "${value}"`);
        });
      }
    }
    
    // 범위 정보
    const range = worksheet['!ref'];
    console.log('\n📐 시트 범위:', range);
    
    // 특정 셀 확인 (N, O, P열 - 대분류, 중분류, 소분류)
    console.log('\n🎯 분류 관련 셀 확인:');
    console.log('N2(대분류):', worksheet['N2']?.v);
    console.log('O2(중분류):', worksheet['O2']?.v);
    console.log('P2(소분류):', worksheet['P2']?.v);
    
  } else {
    console.log('❌ Input 시트가 없습니다.');
  }
  
} catch (error) {
  console.error('❌ Excel 파일 분석 실패:', error.message);
}