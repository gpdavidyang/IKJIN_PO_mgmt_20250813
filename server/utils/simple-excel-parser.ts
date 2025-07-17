import * as XLSX from 'xlsx';

/**
 * 매우 간단하고 안전한 Excel 파서
 */
export function simpleParseExcel(buffer: Buffer) {
  try {
    console.log('=== 간단 파서 시작 ===');
    
    // 1. 버퍼 체크
    if (!buffer || buffer.length === 0) {
      throw new Error('파일 버퍼가 비어있습니다.');
    }
    console.log('버퍼 크기:', buffer.length);

    // 2. 워크북 읽기
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log('시트 목록:', workbook.SheetNames);

    // 3. Input Sheet 찾기
    const sheetName = workbook.SheetNames.find(name => 
      name === 'Input Sheet' || name.toLowerCase().includes('input')
    );
    
    if (!sheetName) {
      return {
        success: false,
        error: `Input Sheet를 찾을 수 없습니다. 사용 가능한 시트: ${workbook.SheetNames.join(', ')}`
      };
    }

    console.log('사용할 시트:', sheetName);
    const worksheet = workbook.Sheets[sheetName];

    // 4. 기본 정보 확인
    const ref = worksheet['!ref'];
    console.log('시트 범위:', ref);

    if (!ref) {
      return {
        success: false,
        error: '시트가 비어있습니다.'
      };
    }

    // 5. 간단한 JSON 변환 (기본 방법)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('전체 데이터 행 수:', jsonData.length);
    console.log('첫 번째 행 (헤더):', jsonData[0]);
    console.log('두 번째 행 (데이터):', jsonData[1]);

    // 6. 결과 반환
    return {
      success: true,
      data: {
        sheetName,
        totalRows: jsonData.length,
        headers: jsonData[0] || [],
        sampleData: jsonData.slice(0, 5), // 처음 5행만
        rawRange: ref
      }
    };

  } catch (error) {
    console.error('간단 파서 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}