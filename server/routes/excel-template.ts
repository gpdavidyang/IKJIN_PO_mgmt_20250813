import express from 'express';
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Excel 템플릿 다운로드 엔드포인트
router.get('/download', async (req, res) => {
  try {
    // 16개 컬럼 구조의 Excel 템플릿 생성
    const templateData = [
      // 헤더 행
      [
        '발주일자', '납기일자', '거래처명', '거래처 이메일', '납품처명', '납품처 이메일',
        '프로젝트명', '대분류', '중분류', '소분류', '품목명', '규격',
        '수량', '단가', '총금액', '비고'
      ],
      // 샘플 데이터 행 1
      [
        '2025-08-05', '2025-08-12', '(주)익진', 'ikjin@example.com', '(주)익진', 'ikjin@example.com',
        '서울 아파트 신축공사', '철근', '봉강', 'D19', 'D19 철근', 'KS D 3504',
        100, 50000, 5000000, '긴급 납품 요청'
      ],
      // 샘플 데이터 행 2
      [
        '2025-08-05', '2025-08-15', '삼성건설', 'samsung@example.com', '삼성건설', 'samsung@example.com',
        '부산 상가 건설', '콘크리트', '레미콘', 'C24', '레미콘 C24', '24MPa',
        50, 120000, 6000000, '현장 직납'
      ],
      // 샘플 데이터 행 3
      [
        '2025-08-05', '2025-08-10', '현대건설', 'hyundai@example.com', '현대건설', 'hyundai@example.com',
        '대전 공장 증축', '강재', 'H빔', 'H-400x200', 'H빔 400x200', 'SS400',
        20, 150000, 3000000, '품질 검사 필수'
      ]
    ];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // Input 시트 생성
    const inputWorksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // 컬럼 너비 설정 (16개 컬럼)
    const columnWidths = [
      { wch: 12 }, // A: 발주일자
      { wch: 12 }, // B: 납기일자
      { wch: 15 }, // C: 거래처명
      { wch: 20 }, // D: 거래처 이메일
      { wch: 15 }, // E: 납품처명
      { wch: 20 }, // F: 납품처 이메일
      { wch: 20 }, // G: 프로젝트명
      { wch: 10 }, // H: 대분류
      { wch: 10 }, // I: 중분류
      { wch: 10 }, // J: 소분류
      { wch: 20 }, // K: 품목명
      { wch: 15 }, // L: 규격
      { wch: 10 }, // M: 수량
      { wch: 12 }, // N: 단가
      { wch: 15 }, // O: 총금액
      { wch: 20 }  // P: 비고
    ];
    
    inputWorksheet['!cols'] = columnWidths;
    
    // 헤더 스타일 설정
    const headerStyle = {
      fill: { fgColor: { rgb: "CCCCCC" } },
      font: { bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
    
    // 헤더 행 스타일 적용 (A1:P1)
    for (let col = 0; col < 16; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!inputWorksheet[cellRef]) inputWorksheet[cellRef] = { v: '', t: 's' };
      inputWorksheet[cellRef].s = headerStyle;
    }
    
    // 데이터 행 테두리 설정
    const dataBorder = {
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } }
      }
    };
    
    // 데이터 행에 테두리 적용 (A2:P4)
    for (let row = 1; row <= 3; row++) {
      for (let col = 0; col < 16; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!inputWorksheet[cellRef]) inputWorksheet[cellRef] = { v: '', t: 's' };
        inputWorksheet[cellRef].s = dataBorder;
      }
    }
    
    // Input 시트를 워크북에 추가
    XLSX.utils.book_append_sheet(workbook, inputWorksheet, 'Input');
    
    // 갑지 시트 생성 (예시)
    const gapjiData = [
      ['발주서 (갑지)', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['발주번호:', '', '발주일자:', '', '', ''],
      ['거래처:', '', '납기일자:', '', '', ''],
      ['납품처:', '', '프로젝트:', '', '', ''],
      ['', '', '', '', '', ''],
      ['순번', '품목명', '규격', '수량', '단가', '금액'],
      ['1', '', '', '', '', ''],
      ['2', '', '', '', '', ''],
      ['3', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['', '', '', '합계:', '', '']
    ];
    
    const gapjiWorksheet = XLSX.utils.aoa_to_sheet(gapjiData);
    gapjiWorksheet['!cols'] = [
      { wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, gapjiWorksheet, '갑지');
    
    // 을지 시트 생성 (예시)
    const euljiData = [
      ['발주서 (을지)', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['발주번호:', '', '발주일자:', '', '', ''],
      ['거래처:', '', '납기일자:', '', '', ''],
      ['납품처:', '', '프로젝트:', '', '', ''],
      ['', '', '', '', '', ''],
      ['순번', '품목명', '규격', '수량', '단가', '금액'],
      ['1', '', '', '', '', ''],
      ['2', '', '', '', '', ''],
      ['3', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['', '', '', '합계:', '', '']
    ];
    
    const euljiWorksheet = XLSX.utils.aoa_to_sheet(euljiData);
    euljiWorksheet['!cols'] = [
      { wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, euljiWorksheet, '을지');
    
    // Excel 파일을 버퍼로 생성
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      cellStyles: true,
      bookSST: false
    });
    
    // 한글 파일명 처리
    const filename = 'PO_Excel_Template.xlsx';
    const encodedFilename = encodeURIComponent(filename);
    
    // 응답 헤더 설정
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', buffer.length.toString());
    
    // 파일 전송
    res.send(buffer);
    
  } catch (error) {
    console.error('Excel 템플릿 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Excel 템플릿 생성 중 오류가 발생했습니다.'
    });
  }
});

// 템플릿 정보 조회 엔드포인트
router.get('/info', (req, res) => {
  try {
    const templateInfo = {
      success: true,
      data: {
        fileName: 'PO_Excel_Template.xlsx',
        description: '16개 컬럼 구조의 표준 발주서 Excel 템플릿',
        columns: [
          { column: 'A', name: '발주일자', required: true, description: '발주서 작성 날짜 (YYYY-MM-DD)' },
          { column: 'B', name: '납기일자', required: false, description: '납품 예정 날짜 (YYYY-MM-DD)' },
          { column: 'C', name: '거래처명', required: true, description: '공급업체 이름' },
          { column: 'D', name: '거래처 이메일', required: false, description: '공급업체 이메일 주소' },
          { column: 'E', name: '납품처명', required: true, description: '납품받을 업체명' },
          { column: 'F', name: '납품처 이메일', required: false, description: '납품처 이메일 주소' },
          { column: 'G', name: '프로젝트명', required: true, description: '해당 프로젝트/현장명' },
          { column: 'H', name: '대분류', required: true, description: '품목 대분류' },
          { column: 'I', name: '중분류', required: false, description: '품목 중분류' },
          { column: 'J', name: '소분류', required: false, description: '품목 소분류' },
          { column: 'K', name: '품목명', required: true, description: '구체적인 품목 이름' },
          { column: 'L', name: '규격', required: false, description: '품목 규격/사양' },
          { column: 'M', name: '수량', required: true, description: '주문 수량' },
          { column: 'N', name: '단가', required: true, description: '품목 단가' },
          { column: 'O', name: '총금액', required: true, description: '수량 × 단가 = 총 금액' },
          { column: 'P', name: '비고', required: false, description: '추가 설명/메모' }
        ],
        sheets: ['Input', '갑지', '을지'],
        rules: [
          '필수 컬럼 누락 시 검증 오류 발생',
          '총금액(O열) = 수량(M열) × 단가(N열) 자동 계산 검증',
          '거래처명이 있으면 납품처명에 자동 복사',
          '프로젝트명이 없으면 기본값 "프로젝트명" 설정'
        ]
      }
    };
    
    res.json(templateInfo);
    
  } catch (error) {
    console.error('템플릿 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '템플릿 정보 조회 중 오류가 발생했습니다.'
    });
  }
});

export default router;