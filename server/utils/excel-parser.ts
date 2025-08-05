import * as XLSX from 'xlsx';
import { z } from 'zod';

// Excel Input Sheet 컬럼 정의 (A:P 열) - 품목 계층 추가
const ExcelRowSchema = z.object({
  orderDate: z.string(), // A열: 발주일자
  deliveryDate: z.string(), // B열: 납기일자  
  vendorName: z.string(), // C열: 거래처명
  vendorEmail: z.string().email().optional(), // D열: 거래처 이메일
  deliveryName: z.string(), // E열: 납품처명
  deliveryEmail: z.string().email().optional(), // F열: 납품처 이메일
  projectName: z.string(), // G열: 프로젝트명
  majorCategory: z.string().optional(), // H열: 대분류
  middleCategory: z.string().optional(), // I열: 중분류
  minorCategory: z.string().optional(), // J열: 소분류
  itemName: z.string(), // K열: 품목명
  specification: z.string().optional(), // L열: 규격
  quantity: z.number(), // M열: 수량
  unitPrice: z.number(), // N열: 단가
  totalAmount: z.number(), // O열: 총금액
  notes: z.string().optional(), // P열: 비고
});

export type ExcelParsedRow = z.infer<typeof ExcelRowSchema>;

// Purchase Orders 테이블 매핑용 스키마
export const PurchaseOrderMappingSchema = z.object({
  orderNumber: z.string(), // 자동 생성
  projectId: z.number(), // 프로젝트명으로 조회
  vendorId: z.number().optional(), // 거래처명으로 조회
  userId: z.string(), // 업로드한 사용자 ID
  templateId: z.number().optional(), // 템플릿 ID (기본값 사용)
  orderDate: z.date(),
  deliveryDate: z.date().optional(),
  status: z.enum(["draft", "pending", "approved", "sent", "completed"]).default("draft"),
  totalAmount: z.number(),
  notes: z.string().optional(),
  customFields: z.record(z.any()).optional(),
  
  // 추가 정보 (매핑 처리용)
  vendorName: z.string(),
  vendorEmail: z.string().optional(),
  deliveryName: z.string(), 
  deliveryEmail: z.string().optional(),
  projectName: z.string(),
  majorCategory: z.string().optional(),
  middleCategory: z.string().optional(),
  minorCategory: z.string().optional(),
  itemName: z.string(),
  specification: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
});

export type PurchaseOrderMapping = z.infer<typeof PurchaseOrderMappingSchema>;

/**
 * 엑셀 파일에서 Input Sheet의 A:M 열을 파싱하여 JSON으로 반환
 * @param buffer 엑셀 파일 버퍼
 * @returns 파싱된 발주서 데이터 배열
 */
export function parseExcelInputSheet(buffer: Buffer): PurchaseOrderMapping[] {
  try {
    console.log('=== 엑셀 파싱 시작 ===');
    console.log('버퍼 크기:', buffer?.length || 'undefined');
    
    if (!buffer || buffer.length === 0) {
      throw new Error('엑셀 파일 데이터가 비어있습니다.');
    }

    // 엑셀 워크북 읽기
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log('워크북 시트 목록:', workbook.SheetNames);
    
    // Input Sheet 확인
    if (!workbook.SheetNames.includes('Input')) {
      throw new Error(`Input 시트가 존재하지 않습니다. 사용 가능한 시트: ${workbook.SheetNames.join(', ')}`);
    }
    
    const worksheet = workbook.Sheets['Input'];
    console.log('Input 시트 로드 완료');
    
    console.log('워크시트 정보:', {
      name: 'Input',
      ref: worksheet['!ref'],
      merges: worksheet['!merges'],
    });

    // 워크시트의 실제 범위 확인
    if (!worksheet['!ref']) {
      throw new Error('Input 시트가 비어있거나 데이터를 찾을 수 없습니다.');
    }

    const fullRange = XLSX.utils.decode_range(worksheet['!ref']);
    console.log('전체 범위:', {
      start: { row: fullRange.s.r, col: fullRange.s.c },
      end: { row: fullRange.e.r, col: fullRange.e.c }
    });

    // A:P 범위의 데이터만 추출 (2행부터) - 품목 계층 컬럼 추가
    const range = {
      s: { c: 0, r: 1 }, // A2부터 시작
      e: { c: 15, r: fullRange.e.r } // P열까지, 마지막 행까지
    };
    
    console.log('파싱 범위:', range);

    // 수동으로 데이터 추출 (더 안전한 방법)
    const jsonData: any[] = [];
    const headers = [
      'orderDate', 'deliveryDate', 'vendorName', 'vendorEmail',
      'deliveryName', 'deliveryEmail', 'projectName', 
      'majorCategory', 'middleCategory', 'minorCategory',
      'itemName', 'specification', 'quantity', 'unitPrice', 'totalAmount', 'notes'
    ];
    
    console.log('헤더 배열:', headers);
    console.log('헤더 길이:', headers.length);
    
    for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
      console.log(`--- 행 ${rowNum + 1} 처리 중 ---`);
      const row: any = {};
      let hasData = false;
      
      for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
        const cell = worksheet[cellAddress];
        
        // 안전한 헤더 인덱스 체크
        if (colNum >= headers.length) {
          console.warn(`컬럼 인덱스 ${colNum}이 헤더 배열 길이 ${headers.length}를 초과합니다.`);
          continue;
        }
        
        const headerKey = headers[colNum];
        
        if (!headerKey) {
          console.warn(`헤더 키가 undefined입니다. colNum: ${colNum}, headers.length: ${headers.length}`);
          continue;
        }
        
        console.log(`  셀 ${cellAddress}: ${cell?.v || 'empty'} -> ${headerKey}`);
        
        if (cell && cell.v !== undefined && cell.v !== null) {
          row[headerKey] = cell.v;
          hasData = true;
        } else {
          row[headerKey] = '';
        }
      }
      
      console.log(`행 ${rowNum + 1} 데이터:`, row);
      console.log(`행 ${rowNum + 1} hasData:`, hasData);
      
      // 최소한 필수 필드가 있는 경우만 추가
      if (hasData && (row.vendorName || row.projectName || row.itemName)) {
        jsonData.push(row);
        console.log(`행 ${rowNum + 1} 추가됨`);
      } else {
        console.log(`행 ${rowNum + 1} 스킵됨 (필수 데이터 없음)`);
      }
    }
    
    console.log(`추출된 데이터 행 수: ${jsonData.length}`);
    
    if (jsonData.length === 0) {
      throw new Error('Input 시트에서 유효한 데이터를 찾을 수 없습니다. 2행부터 데이터가 있는지 확인해주세요.');
    }
    
    // 데이터 검증 및 변환
    const parsedData: PurchaseOrderMapping[] = [];
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      console.log(`=== 검증 단계: 행 ${i + 1} ===`);
      console.log('행 데이터:', JSON.stringify(row, null, 2));
      
      // 안전한 체크
      if (!row || typeof row !== 'object') {
        console.warn(`행 ${i + 1}: 유효하지 않은 행 데이터`);
        continue;
      }
      
      // 빈 행 스킵
      if (!row.orderDate && !row.vendorName && !row.projectName) {
        console.log(`행 ${i + 1}: 빈 행 스킵`);
        continue;
      }
      
      try {
        console.log(`행 ${i + 2} 처리 중:`, {
          orderDate: row.orderDate,
          vendorName: row.vendorName,
          projectName: row.projectName,
          quantity: row.quantity,
          unitPrice: row.unitPrice
        });

        // 날짜 변환 (더 안전한 처리)
        let orderDate: Date;
        let deliveryDate: Date | undefined;
        
        try {
          orderDate = parseExcelDate(row.orderDate);
        } catch (error) {
          throw new Error(`발주일자 파싱 오류: ${row.orderDate}`);
        }
        
        if (row.deliveryDate) {
          try {
            deliveryDate = parseExcelDate(row.deliveryDate);
          } catch (error) {
            console.warn(`납기일자 파싱 경고 (행 ${i + 2}):`, error);
            deliveryDate = undefined;
          }
        }
        
        // 숫자 변환 (더 안전한 처리)
        const quantity = parseNumber(row.quantity, '수량');
        const unitPrice = parseNumber(row.unitPrice, '단가');
        const totalAmount = row.totalAmount ? 
          parseNumber(row.totalAmount, '총금액') : 
          (quantity * unitPrice);
        
        // 발주번호 생성 (임시 - 실제로는 DB에서 생성)
        const orderNumber = generateOrderNumber(orderDate);
        
        // 매핑 객체 생성
        const mappedData: PurchaseOrderMapping = {
          orderNumber,
          projectId: 0, // 프로젝트명으로 조회 후 설정
          userId: '', // 업로드한 사용자 ID로 설정
          orderDate,
          deliveryDate,
          totalAmount,
          notes: row.notes || undefined,
          
          // 원본 데이터
          vendorName: row.vendorName?.trim() || '',
          vendorEmail: row.vendorEmail?.trim() || undefined,
          deliveryName: row.deliveryName?.trim() || '',
          deliveryEmail: row.deliveryEmail?.trim() || undefined,
          projectName: row.projectName?.trim() || '',
          majorCategory: row.majorCategory?.trim() || undefined,
          middleCategory: row.middleCategory?.trim() || undefined,
          minorCategory: row.minorCategory?.trim() || undefined,
          itemName: row.itemName?.trim() || '',
          specification: row.specification?.trim() || undefined,
          quantity,
          unitPrice,
        };
        
        // 스키마 검증
        const validated = PurchaseOrderMappingSchema.parse(mappedData);
        parsedData.push(validated);
        
      } catch (error) {
        console.error(`행 ${i + 2} 파싱 오류:`, error);
        throw new Error(`행 ${i + 2}에서 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    }
    
    if (parsedData.length === 0) {
      throw new Error('파싱할 수 있는 유효한 데이터가 없습니다.');
    }
    
    return parsedData;
    
  } catch (error) {
    console.error('엑셀 파싱 오류:', error);
    console.error('오류 스택:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof Error) {
      throw new Error(`엑셀 파일 파싱 중 오류가 발생했습니다: ${error.message}`);
    } else {
      throw new Error(`엑셀 파일 파싱 중 알 수 없는 오류가 발생했습니다.`);
    }
  }
}

/**
 * 엑셀 날짜 값을 JavaScript Date로 변환
 * @param value 엑셀에서 읽은 날짜 값
 * @returns Date 객체
 */
function parseExcelDate(value: any): Date {
  if (!value) {
    throw new Error('날짜 값이 없습니다.');
  }
  
  // 숫자인 경우 (엑셀 시리얼 날짜)
  if (typeof value === 'number') {
    // Excel 시리얼 날짜를 JavaScript Date로 변환
    // Excel 기준일은 1900년 1월 1일 (시리얼 번호 1)
    const excelEpoch = new Date(1899, 11, 30); // 1899-12-30 (Excel bug compensation)
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
  }
  
  // 문자열인 경우
  if (typeof value === 'string') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`잘못된 날짜 형식: ${value}`);
    }
    return date;
  }
  
  // Date 객체인 경우
  if (value instanceof Date) {
    return value;
  }
  
  throw new Error(`지원되지 않는 날짜 형식: ${typeof value}`);
}

/**
 * 안전한 숫자 파싱
 * @param value 파싱할 값
 * @param fieldName 필드명 (오류 메시지용)
 * @returns 파싱된 숫자
 */
function parseNumber(value: any, fieldName: string): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  if (typeof value === 'string') {
    // 문자열에서 숫자가 아닌 문자 제거 (쉼표, 원화 기호 등)
    const cleanValue = value.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleanValue);
    
    if (isNaN(parsed)) {
      console.warn(`${fieldName} 파싱 경고: "${value}" -> 0으로 처리`);
      return 0;
    }
    
    return parsed;
  }
  
  console.warn(`${fieldName} 파싱 경고: 알 수 없는 타입 "${typeof value}" -> 0으로 처리`);
  return 0;
}

/**
 * 발주번호 생성 (PO-YYYYMMDD-XXX 형식)
 * @param orderDate 발주일자
 * @returns 발주번호
 */
function generateOrderNumber(orderDate: Date): string {
  const year = orderDate.getFullYear();
  const month = String(orderDate.getMonth() + 1).padStart(2, '0');
  const day = String(orderDate.getDate()).padStart(2, '0');
  
  // 실제로는 DB에서 해당 날짜의 순번을 조회해야 함
  const sequence = '001'; // 임시값
  
  return `PO-${year}${month}${day}-${sequence}`;
}

/**
 * 파싱 결과 검증
 * @param data 파싱된 데이터 배열
 * @returns 검증 결과
 */
export function validateParsedData(data: PurchaseOrderMapping[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2; // 엑셀 행번호 (헤더 제외)
    
    // 필수 필드 검증
    if (!row.vendorName) {
      errors.push(`행 ${rowNumber}: 거래처명이 비어있습니다.`);
    }
    
    if (!row.projectName) {
      errors.push(`행 ${rowNumber}: 프로젝트명이 비어있습니다.`);
    }
    
    if (!row.itemName) {
      errors.push(`행 ${rowNumber}: 품목명이 비어있습니다.`);
    }
    
    if (row.quantity <= 0) {
      errors.push(`행 ${rowNumber}: 수량은 0보다 커야 합니다.`);
    }
    
    if (row.unitPrice < 0) {
      errors.push(`행 ${rowNumber}: 단가는 0 이상이어야 합니다.`);
    }
    
    // 경고사항
    if (!row.vendorEmail && !row.deliveryEmail) {
      warnings.push(`행 ${rowNumber}: 거래처 또는 납품처 이메일이 없어 자동 발송이 불가능합니다.`);
    }
    
    if (!row.deliveryDate) {
      warnings.push(`행 ${rowNumber}: 납기일자가 설정되지 않았습니다.`);
    }
    
    // 금액 일치 검증
    const calculatedAmount = row.quantity * row.unitPrice;
    if (Math.abs(calculatedAmount - row.totalAmount) > 0.01) {
      warnings.push(`행 ${rowNumber}: 총금액(${row.totalAmount})이 계산값(${calculatedAmount})과 다릅니다.`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalRows: data.length
  };
}