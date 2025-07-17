import * as XLSX from 'xlsx';

/**
 * 테스트용 샘플 Excel 파일 생성
 */
export function generateSampleExcel(): Buffer {
  // Input Sheet 데이터
  const inputSheetData = [
    // 헤더 행 (1행)
    [
      '발주일자', '납기일자', '거래처명', '거래처이메일', 
      '납품처명', '납품처이메일', '프로젝트명', '품목명', 
      '규격', '수량', '단가', '총금액', '비고'
    ],
    // 데이터 행들 (2행부터)
    [
      new Date('2025-01-15'), new Date('2025-01-30'), '㈜삼성전자', 'samsung@example.com',
      '현대건설 본사', 'hyundai@example.com', '서울 오피스텔 건설', 'LED 조명',
      '50W', 100, 50000, 5000000, '긴급 주문'
    ],
    [
      new Date('2025-01-16'), new Date('2025-02-05'), 'LG전자', 'lg@example.com',
      'GS건설 현장사무소', 'gs@example.com', '부산 아파트 단지', '에어컨',
      '2톤급', 50, 1200000, 60000000, '설치 포함'
    ],
    [
      new Date('2025-01-17'), new Date('2025-01-25'), '포스코', 'posco@example.com',
      '대우건설 자재창고', 'daewoo@example.com', '인천 산업단지', '철근',
      'D16', 1000, 8000, 8000000, '품질 검사 필요'
    ]
  ];

  // 갑지 시트 데이터 (간단한 예시)
  const gapjiData = [
    ['발주서 - 갑지 (발주자용)'],
    ['발주번호: PO-20250115-001'],
    ['발주일자: 2025-01-15'],
    ['거래처: ㈜삼성전자'],
    ['품목: LED 조명 50W'],
    ['수량: 100개'],
    ['단가: 50,000원'],
    ['총액: 5,000,000원']
  ];

  // 을지 시트 데이터 (간단한 예시) 
  const euljiData = [
    ['발주서 - 을지 (수주자용)'],
    ['발주번호: PO-20250115-001'],
    ['발주일자: 2025-01-15'],
    ['납품처: 현대건설 본사'],
    ['품목: LED 조명 50W'],
    ['수량: 100개'],
    ['단가: 50,000원'],
    ['총액: 5,000,000원']
  ];

  // 워크북 생성
  const workbook = XLSX.utils.book_new();

  // Input Sheet 생성
  const inputSheet = XLSX.utils.aoa_to_sheet(inputSheetData);
  
  // 컬럼 너비 설정
  const columnWidths = [
    { wch: 12 }, // 발주일자
    { wch: 12 }, // 납기일자
    { wch: 15 }, // 거래처명
    { wch: 20 }, // 거래처이메일
    { wch: 15 }, // 납품처명
    { wch: 20 }, // 납품처이메일
    { wch: 15 }, // 프로젝트명
    { wch: 12 }, // 품목명
    { wch: 10 }, // 규격
    { wch: 8 },  // 수량
    { wch: 10 }, // 단가
    { wch: 12 }, // 총금액
    { wch: 15 }  // 비고
  ];
  inputSheet['!cols'] = columnWidths;

  // 갑지/을지 시트 생성
  const gapjiSheet = XLSX.utils.aoa_to_sheet(gapjiData);
  const euljiSheet = XLSX.utils.aoa_to_sheet(euljiData);

  // 워크북에 시트 추가
  XLSX.utils.book_append_sheet(workbook, inputSheet, 'Input Sheet');
  XLSX.utils.book_append_sheet(workbook, gapjiSheet, '갑지');
  XLSX.utils.book_append_sheet(workbook, euljiSheet, '을지');

  // Buffer로 변환
  const buffer = XLSX.write(workbook, { 
    type: 'buffer', 
    bookType: 'xlsx' 
  });

  return buffer;
}

/**
 * 샘플 Excel 파일의 메타 정보
 */
export const sampleExcelMeta = {
  filename: 'sample-purchase-orders.xlsx',
  description: '발주서 자동화 테스트용 샘플 Excel 파일',
  sheets: ['Input Sheet', '갑지', '을지'],
  dataRows: 3,
  columns: 13
};