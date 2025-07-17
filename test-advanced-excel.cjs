/**
 * 고급 엑셀 처리 방식 테스트 스크립트
 * 3가지 방법을 모두 테스트하고 서식 보존 품질 비교
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 복잡한 서식을 가진 테스트 엑셀 파일 생성
function createAdvancedTestFile(filePath) {
  console.log('📄 고급 테스트용 엑셀 파일 생성 중...');
  
  const wb = XLSX.utils.book_new();
  
  // Input 시트 생성
  const inputData = [
    ['발주일자', '납기일자', '거래처명', '거래처이메일', '납품처명', '납품처이메일', '프로젝트명', '품목명', '규격', '수량', '단가', '총액', '비고'],
    ['2024-01-15', '2024-01-30', '삼성전자', 'samsung@test.com', '삼성전자', 'samsung@test.com', '테스트프로젝트', '케이블', '5m', 100, 1000, 100000, '테스트'],
    ['2024-01-16', '2024-01-31', 'LG전자', 'lg@test.com', 'LG전자', 'lg@test.com', '테스트프로젝트2', '커넥터', '10개', 50, 2000, 100000, '테스트2']
  ];
  const inputWs = XLSX.utils.aoa_to_sheet(inputData);
  XLSX.utils.book_append_sheet(wb, inputWs, 'Input');
  
  // 갑지 시트 생성 (복잡한 서식)
  const gapjiData = [
    ['', '', '', '', '발주서', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['발주번호:', 'PO-2024-001', '', '', '발주일자:', '2024-01-15', '', ''],
    ['거래처:', '삼성전자', '', '', '납기일자:', '2024-01-30', '', ''],
    ['연락처:', '02-1234-5678', '', '', '담당자:', '홍길동', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '품목 상세 내역', '', '', '', '', '', ''],
    ['순번', '품목명', '규격', '수량', '단가', '금액', '비고', '승인'],
    ['1', '케이블', '5m 특수규격', '100개', '1,000원', '100,000원', '긴급', '승인'],
    ['2', '커넥터', '표준형 10개입', '50세트', '2,000원', '100,000원', '일반', '대기'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '합계', '', '200,000원', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['승인란', '', '', '', '', '', '', ''],
    ['팀장', '부장', '이사', '사장', '', '', '', ''],
    ['', '', '', '', '', '', '', '']
  ];
  const gapjiWs = XLSX.utils.aoa_to_sheet(gapjiData);
  
  // 갑지 시트에 여러 병합 셀 추가
  if (!gapjiWs['!merges']) gapjiWs['!merges'] = [];
  gapjiWs['!merges'].push(
    {s: {r: 0, c: 4}, e: {r: 0, c: 6}}, // 발주서 제목
    {s: {r: 6, c: 1}, e: {r: 6, c: 6}}, // 품목 상세 내역
    {s: {r: 11, c: 5}, e: {r: 11, c: 6}}, // 합계
    {s: {r: 13, c: 0}, e: {r: 13, c: 7}}  // 승인란
  );
  
  XLSX.utils.book_append_sheet(wb, gapjiWs, '갑지');
  
  // 을지 시트 생성 (다른 형태의 복잡한 서식)
  const euljiData = [
    ['', '', '', '납품확인서', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['납품번호:', 'DN-2024-001', '', '납품일자:', '2024-01-30', '', ''],
    ['납품처:', '삼성전자 수원사업장', '', '확인자:', '김철수', '', ''],
    ['주소:', '경기도 수원시 영통구', '', '연락처:', '031-1234-5678', '', ''],
    ['', '', '', '', '', '', ''],
    ['납품 품목', '', '', '', '', '', ''],
    ['번호', '품목명', '주문수량', '납품수량', '단가', '납품금액', '상태'],
    ['1', '케이블 (5m)', '100', '100', '1,000', '100,000', '완료'],
    ['2', '커넥터 (10개입)', '50', '45', '2,000', '90,000', '부분'],
    ['', '', '', '', '', '', ''],
    ['', '', '총 주문:', '150', '총 납품:', '190,000', ''],
    ['', '', '', '', '', '', ''],
    ['특이사항:', '커넥터 5개 부족분은 익일 납품 예정', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['확인 서명', '', '', '', '', '', ''],
    ['발주처', '납품처', '운송업체', '품질검사', '', '', '']
  ];
  const euljiWs = XLSX.utils.aoa_to_sheet(euljiData);
  
  // 을지 시트에 병합 셀 추가
  if (!euljiWs['!merges']) euljiWs['!merges'] = [];
  euljiWs['!merges'].push(
    {s: {r: 0, c: 3}, e: {r: 0, c: 5}}, // 납품확인서 제목
    {s: {r: 3, c: 1}, e: {r: 3, c: 2}}, // 납품처 주소
    {s: {r: 4, c: 1}, e: {r: 4, c: 2}}, // 주소
    {s: {r: 6, c: 0}, e: {r: 6, c: 6}}, // 납품 품목
    {s: {r: 13, c: 1}, e: {r: 13, c: 5}}, // 특이사항
    {s: {r: 15, c: 0}, e: {r: 15, c: 6}}  // 확인 서명
  );
  
  XLSX.utils.book_append_sheet(wb, euljiWs, '을지');
  
  // 추가 시트 - 부록
  const appendixData = [
    ['부록: 계약 조건', '', '', ''],
    ['', '', '', ''],
    ['1. 납품 조건', '', '', ''],
    ['   - 납품 장소: 수원사업장', '', '', ''],
    ['   - 납품 시간: 평일 09:00~18:00', '', '', ''],
    ['   - 검수 기간: 납품일로부터 3일', '', '', ''],
    ['', '', '', ''],
    ['2. 결제 조건', '', '', ''],
    ['   - 결제 방법: 계좌이체', '', '', ''],
    ['   - 결제 기간: 납품 확인 후 30일', '', '', ''],
    ['   - 세금계산서: 납품일 기준 발행', '', '', '']
  ];
  const appendixWs = XLSX.utils.aoa_to_sheet(appendixData);
  
  if (!appendixWs['!merges']) appendixWs['!merges'] = [];
  appendixWs['!merges'].push(
    {s: {r: 0, c: 0}, e: {r: 0, c: 3}} // 부록 제목
  );
  
  XLSX.utils.book_append_sheet(wb, appendixWs, '부록');
  
  // 파일 저장
  XLSX.writeFile(wb, filePath);
  console.log(`✅ 고급 테스트 파일 생성 완료: ${filePath}`);
  console.log('📋 포함된 시트: Input, 갑지 (4개 병합셀), 을지 (6개 병합셀), 부록 (1개 병합셀)');
}

// 서식 정보 상세 분석
function analyzeFormatDetails(filePath, description) {
  try {
    const workbook = XLSX.readFile(filePath);
    
    console.log(`\n📊 ${description} 상세 분석:`);
    console.log(`📁 파일: ${filePath}`);
    console.log(`📏 파일 크기: ${fs.statSync(filePath).size} bytes`);
    
    let totalMerges = 0;
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const mergeCount = worksheet['!merges'] ? worksheet['!merges'].length : 0;
      totalMerges += mergeCount;
      
      console.log(`\n  📋 시트 "${sheetName}":`);
      console.log(`    📏 데이터 범위: ${worksheet['!ref'] || 'N/A'}`);
      console.log(`    🔗 병합 셀: ${mergeCount}개`);
      
      if (worksheet['!merges'] && worksheet['!merges'].length > 0) {
        worksheet['!merges'].forEach((merge, index) => {
          console.log(`      ${index + 1}. ${XLSX.utils.encode_range(merge)}`);
        });
      }
      
      // 샘플 셀 내용 확인
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      let cellCount = 0;
      let dataCount = 0;
      
      for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 5); row++) {
        for (let col = range.s.c; col <= Math.min(range.e.c, range.s.c + 5); col++) {
          const cellAddress = XLSX.utils.encode_cell({r: row, c: col});
          const cell = worksheet[cellAddress];
          cellCount++;
          if (cell && cell.v) dataCount++;
        }
      }
      
      console.log(`    📊 데이터 밀도: ${dataCount}/${cellCount} (상위 6x6 영역)`);
    }
    
    console.log(`\n📈 전체 요약:`);
    console.log(`  🗂️ 총 시트: ${workbook.SheetNames.length}개`);
    console.log(`  🔗 총 병합셀: ${totalMerges}개`);
    
    return {
      sheets: workbook.SheetNames.length,
      totalMerges,
      fileSize: fs.statSync(filePath).size,
      sheetNames: workbook.SheetNames
    };
    
  } catch (error) {
    console.error(`❌ ${description} 분석 실패:`, error.message);
    return null;
  }
}

// 품질 비교 분석
function compareQuality(originalInfo, processedInfo, method) {
  console.log(`\n🔍 ${method} 방식 품질 평가:`);
  
  if (!originalInfo || !processedInfo) {
    console.log(`❌ 비교 불가 (분석 정보 부족)`);
    return { score: 0, grade: 'F' };
  }
  
  let score = 100;
  let issues = [];
  
  // 시트 개수 비교 (Input 시트가 제거되어야 함)
  const expectedSheets = originalInfo.sheets - 1;
  if (processedInfo.sheets !== expectedSheets) {
    score -= 30;
    issues.push(`시트 개수 불일치 (예상: ${expectedSheets}, 실제: ${processedInfo.sheets})`);
  }
  
  // 병합셀 개수 비교 (Input 시트 제외하고 유지되어야 함)
  const expectedMerges = originalInfo.totalMerges; // Input 시트에는 병합셀이 없음
  if (processedInfo.totalMerges !== expectedMerges) {
    const mergeLoss = expectedMerges - processedInfo.totalMerges;
    score -= (mergeLoss / expectedMerges) * 40;
    issues.push(`병합셀 손실: ${mergeLoss}개 (${((mergeLoss/expectedMerges)*100).toFixed(1)}%)`);
  }
  
  // 파일 크기 비교 (너무 많이 변하면 서식 손상 가능성)
  const sizeRatio = processedInfo.fileSize / originalInfo.fileSize;
  if (sizeRatio < 0.7 || sizeRatio > 1.3) {
    score -= 20;
    issues.push(`파일 크기 변화율: ${(sizeRatio * 100).toFixed(1)}% (정상 범위: 70-130%)`);
  }
  
  // 점수에 따른 등급 결정
  let grade;
  if (score >= 95) grade = 'A+';
  else if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';
  
  console.log(`  📊 품질 점수: ${score.toFixed(1)}/100 (${grade}등급)`);
  if (issues.length > 0) {
    console.log(`  ⚠️ 발견된 이슈:`);
    issues.forEach(issue => console.log(`    - ${issue}`));
  } else {
    console.log(`  ✅ 완벽한 서식 보존`);
  }
  
  return { score: score.toFixed(1), grade, issues };
}

// 메인 테스트 실행
function runAdvancedTest() {
  console.log('🚀 고급 엑셀 처리 방식 비교 테스트 시작\n');
  
  const testDir = path.join(__dirname, 'advanced-test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const originalFile = path.join(testDir, 'advanced-test-original.xlsx');
  
  try {
    // 1. 복잡한 테스트 파일 생성
    createAdvancedTestFile(originalFile);
    
    // 2. 원본 파일 분석
    console.log('\n📊 원본 파일 분석:');
    const originalInfo = analyzeFormatDetails(originalFile, '원본 파일');
    
    // 3. 각 방법별 처리 시뮬레이션 안내
    console.log('\n🔧 처리 방식별 테스트 가이드:');
    console.log('');
    console.log('1️⃣ ExcelJS 방식 테스트:');
    console.log('   - Node.js 서버에서 다음 API 호출:');
    console.log('   POST /api/po-template/remove-input-sheet-advanced');
    console.log('   { "sourceFilePath": "' + originalFile + '", "method": "exceljs" }');
    
    console.log('\n2️⃣ Python openpyxl 방식 테스트:');
    console.log('   - 터미널에서 직접 실행:');
    console.log('   python3 scripts/excel_format_preserving.py "' + originalFile + '" "' + path.join(testDir, 'python-result.xlsx') + '" --verify --compare');
    
    console.log('\n3️⃣ 바이너리 조작 방식 테스트:');
    console.log('   - Node.js 서버에서 다음 API 호출:');
    console.log('   POST /api/po-template/remove-input-sheet-advanced');
    console.log('   { "sourceFilePath": "' + originalFile + '", "method": "binary" }');
    
    console.log('\n4️⃣ 통합 고급 방식 테스트:');
    console.log('   - Node.js 서버에서 다음 API 호출:');
    console.log('   POST /api/po-template/send-email-original-format');
    console.log('   {');
    console.log('     "filePath": "' + originalFile + '",');
    console.log('     "to": "test@example.com",');
    console.log('     "subject": "고급 서식 보존 테스트"');
    console.log('   }');
    
    console.log('\n📋 예상 결과:');
    console.log('  ✅ Input 시트 제거 (4개 시트 → 3개 시트)');
    console.log('  ✅ 총 11개 병합셀 모두 보존');
    console.log('  ✅ 갑지, 을지, 부록 시트의 모든 서식 유지');
    console.log('  ✅ 파일 크기 적정 수준 유지');
    
    console.log('\n🎯 품질 기준:');
    console.log('  A+ (95-100점): 완벽한 서식 보존');
    console.log('  A  (90-94점): 거의 완벽한 보존');
    console.log('  B  (80-89점): 양호한 보존');
    console.log('  C  (70-79점): 보통 보존');
    console.log('  D  (60-69점): 불충분한 보존');
    console.log('  F  (60점 미만): 심각한 서식 손상');
    
    console.log('\n✅ 테스트 파일 준비 완료!');
    console.log('📁 테스트 파일 위치:');
    console.log(`  원본: ${originalFile}`);
    console.log(`  테스트 디렉토리: ${testDir}`);
    
    // 예시 품질 분석 (XLSX.js 방식으로 처리한 경우 시뮬레이션)
    console.log('\n🔬 예시: XLSX.js 방식 처리 시뮬레이션');
    
    // XLSX.js로 간단 처리 (서식 손상 예상)
    const xlsxTestFile = path.join(testDir, 'xlsx-method-result.xlsx');
    try {
      const workbook = XLSX.readFile(originalFile);
      const newWorkbook = XLSX.utils.book_new();
      
      // Input 시트 제외하고 복사
      for (const sheetName of workbook.SheetNames) {
        if (sheetName !== 'Input') {
          const worksheet = workbook.Sheets[sheetName];
          XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
        }
      }
      
      XLSX.writeFile(newWorkbook, xlsxTestFile);
      
      const xlsxInfo = analyzeFormatDetails(xlsxTestFile, 'XLSX.js 처리 결과');
      const quality = compareQuality(originalInfo, xlsxInfo, 'XLSX.js');
      
      console.log(`\n📈 XLSX.js 방식 예상 성능: ${quality.grade}등급 (${quality.score}점)`);
      console.log('  → 이 결과보다 훨씬 좋은 품질을 목표로 합니다!');
      
    } catch (error) {
      console.log('❌ XLSX.js 시뮬레이션 실패:', error.message);
    }
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
  }
}

// 스크립트 실행
if (require.main === module) {
  runAdvancedTest();
}

module.exports = {
  createAdvancedTestFile,
  analyzeFormatDetails,
  compareQuality
};