/**
 * Test script to identify timeout issues in Excel processing
 * This creates a simple Excel file and tests the full pipeline
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Create a simple test Excel file
function createTestExcelFile() {
  const testData = [
    // Header row
    ['발주일자', '납기일자', '거래처명', '거래처이메일', '납품처명', '납품처이메일', 
     '프로젝트명', '대분류', '중분류', '소분류', '품목명', '규격', '수량', '단가', '총금액', '비고'],
    // Data rows
    ['2024-08-19', '2024-08-26', '테스트거래처1', 'test1@example.com', '테스트납품처1', '', 
     '테스트프로젝트', '건설자재', '철근', '10mm', '철근 10mm', '길이 6m', 100, 5000, 500000, '테스트 주문'],
    ['2024-08-19', '2024-08-26', '테스트거래처2', 'test2@example.com', '테스트납품처2', '', 
     '테스트프로젝트', '건설자재', '시멘트', '25kg', '포틀랜드 시멘트', '25kg 포대', 50, 8000, 400000, '긴급 주문']
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(testData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Input');

  const testFilePath = path.join(process.cwd(), 'test-excel-upload.xlsx');
  XLSX.writeFile(workbook, testFilePath);
  
  console.log(`✅ 테스트 Excel 파일 생성: ${testFilePath}`);
  return testFilePath;
}

// Test the timeout issues
async function testExcelProcessingTimeout() {
  console.log('🚀 Excel 처리 타임아웃 테스트 시작...\n');

  // Create test file
  const testFilePath = createTestExcelFile();

  try {
    // Test 1: File upload simulation
    console.log('📤 테스트 1: 파일 업로드 시뮬레이션');
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(testFilePath);
    const blob = new Blob([fileBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    formData.append('file', blob, 'test-excel-upload.xlsx');

    const startTime = Date.now();
    console.log(`⏰ 요청 시작 시간: ${new Date(startTime).toLocaleString()}`);

    // Set a timeout for the request
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
    );

    const requestPromise = fetch('http://localhost:5000/api/excel-automation/upload-and-process', {
      method: 'POST',
      body: formData,
      // Add timeout headers
      headers: {
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30'
      }
    });

    try {
      const response = await Promise.race([requestPromise, timeoutPromise]);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏰ 요청 완료 시간: ${new Date(endTime).toLocaleString()}`);
      console.log(`⌛ 총 소요시간: ${duration}ms (${(duration/1000).toFixed(2)}초)`);
      console.log(`📊 응답 상태: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 처리 성공:', JSON.stringify(result, null, 2));
      } else {
        const error = await response.text();
        console.log('❌ 처리 실패:', error);
      }

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`💥 요청 실패 시간: ${new Date(endTime).toLocaleString()}`);
      console.log(`⌛ 실패까지 소요시간: ${duration}ms (${(duration/1000).toFixed(2)}초)`);
      
      if (error.message === 'Request timeout after 30 seconds') {
        console.log('⚠️ 타임아웃 발생: 30초 이내에 응답이 오지 않았습니다.');
        console.log('🔍 이는 다음 중 하나일 수 있습니다:');
        console.log('   1. 서버 처리 시간이 너무 오래 걸림');
        console.log('   2. 데이터베이스 연결 문제');
        console.log('   3. 서버리스 환경에서의 콜드 스타트');
        console.log('   4. Excel 처리 중 무한 루프 또는 블로킹');
      } else {
        console.log('❌ 기타 오류:', error.message);
      }
    }

  } finally {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log(`🗑️ 테스트 파일 정리: ${testFilePath}`);
    }
  }
}

// Test database connection separately
async function testDatabaseConnection() {
  console.log('\n🔍 데이터베이스 연결 테스트...');
  
  try {
    const response = await fetch('http://localhost:5000/api/vendors', {
      method: 'GET'
    });
    
    if (response.ok) {
      console.log('✅ 데이터베이스 연결 정상');
    } else {
      console.log('⚠️ 데이터베이스 응답 이상:', response.status);
    }
  } catch (error) {
    console.log('❌ 데이터베이스 연결 실패:', error.message);
  }
}

// Main execution
async function main() {
  await testDatabaseConnection();
  await testExcelProcessingTimeout();
}

main().catch(console.error);