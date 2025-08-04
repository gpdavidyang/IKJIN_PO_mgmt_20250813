import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    missingFields: string[];
    duplicateOrderNumbers: string[];
  };
}

export interface POTemplateValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'email';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
}

export class POTemplateValidator {
  private static readonly REQUIRED_COLUMNS: string[] = [
    '발주번호',
    '발주일자',
    '현장명',
    '품목명',
    '수량',
    '단가',
    '공급가액',
    '세액',
    '합계',
    '납기일자',
    '거래처명'
  ];

  private static readonly OPTIONAL_COLUMNS: string[] = [
    '대분류',
    '중분류',
    '소분류',
    '규격',
    '납품처',
    '비고'
  ];

  private static readonly VALIDATION_RULES: POTemplateValidationRule[] = [
    {
      field: '발주번호',
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 50,
      pattern: /^[A-Z0-9-]+$/
    },
    {
      field: '발주일자',
      required: true,
      type: 'date'
    },
    {
      field: '현장명',
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100
    },
    {
      field: '품목명',
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    {
      field: '수량',
      required: true,
      type: 'number',
      customValidator: (value) => value > 0
    },
    {
      field: '단가',
      required: true,
      type: 'number',
      customValidator: (value) => value >= 0
    },
    {
      field: '공급가액',
      required: true,
      type: 'number',
      customValidator: (value) => value >= 0
    },
    {
      field: '세액',
      required: true,
      type: 'number',
      customValidator: (value) => value >= 0
    },
    {
      field: '합계',
      required: true,
      type: 'number',
      customValidator: (value) => value >= 0
    },
    {
      field: '납기일자',
      required: true,
      type: 'date'
    },
    {
      field: '거래처명',
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100
    }
  ];

  /**
   * PO Template 파일 전체 유효성 검사
   */
  static async validatePOTemplateFile(filePath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        missingFields: [],
        duplicateOrderNumbers: []
      }
    };

    try {
      // 파일 존재 확인
      if (!fs.existsSync(filePath)) {
        result.isValid = false;
        result.errors.push('파일을 찾을 수 없습니다.');
        return result;
      }

      // 파일 형식 확인
      const ext = path.extname(filePath).toLowerCase();
      if (!['.xlsx', '.xlsm', '.xls'].includes(ext)) {
        result.isValid = false;
        result.errors.push('지원하지 않는 파일 형식입니다. Excel 파일(.xlsx, .xlsm, .xls)만 지원됩니다.');
        return result;
      }

      // Excel 파일 읽기
      const workbook = XLSX.readFile(filePath);
      
      // Input 시트 확인
      if (!workbook.SheetNames.includes('Input')) {
        result.isValid = false;
        result.errors.push('Input 시트를 찾을 수 없습니다.');
        return result;
      }

      const worksheet = workbook.Sheets['Input'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length < 2) {
        result.isValid = false;
        result.errors.push('Input 시트에 데이터가 없거나 헤더만 있습니다.');
        return result;
      }

      // 헤더 검증
      const headers = data[0] as string[];
      const headerValidation = this.validateHeaders(headers);
      if (!headerValidation.isValid) {
        result.isValid = false;
        result.errors.push(...headerValidation.errors);
        result.warnings.push(...headerValidation.warnings);
        result.summary.missingFields = headerValidation.missingFields;
      }

      // 데이터 행 검증
      const dataRows = data.slice(1) as any[][];
      result.summary.totalRows = dataRows.length;

      const orderNumbers = new Set<string>();
      const duplicates = new Set<string>();

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowIndex = i + 2; // Excel 행 번호 (헤더 포함)

        // 빈 행 건너뛰기
        if (this.isEmptyRow(row)) {
          continue;
        }

        const rowValidation = this.validateDataRow(row, headers, rowIndex);
        
        if (rowValidation.isValid) {
          result.summary.validRows++;
          
          // 발주번호 중복 확인
          const orderNumber = String(row[0] || '').trim();
          if (orderNumber) {
            if (orderNumbers.has(orderNumber)) {
              duplicates.add(orderNumber);
            } else {
              orderNumbers.add(orderNumber);
            }
          }
        } else {
          result.summary.invalidRows++;
          result.isValid = false;
          result.errors.push(...rowValidation.errors);
          result.warnings.push(...rowValidation.warnings);
        }
      }

      // 중복 발주번호 처리
      if (duplicates.size > 0) {
        result.summary.duplicateOrderNumbers = Array.from(duplicates);
        result.warnings.push(`중복된 발주번호가 발견되었습니다: ${Array.from(duplicates).join(', ')}`);
      }

      // 필수 시트 확인
      const requiredSheets = ['갑지', '을지'];
      const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));
      if (missingSheets.length > 0) {
        result.warnings.push(`필수 시트가 누락되었습니다: ${missingSheets.join(', ')}`);
      }

      // 최종 유효성 판정
      if (result.summary.validRows === 0) {
        result.isValid = false;
        result.errors.push('유효한 데이터 행이 없습니다.');
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.');
    }

    return result;
  }

  /**
   * 헤더 검증
   */
  private static validateHeaders(headers: string[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    missingFields: string[];
  } {
    const result: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
      missingFields: string[];
    } = {
      isValid: true,
      errors: [],
      warnings: [],
      missingFields: []
    };

    // 필수 컬럼 확인
    const missingRequired = this.REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    if (missingRequired.length > 0) {
      result.isValid = false;
      result.errors.push(`필수 컬럼이 누락되었습니다: ${missingRequired.join(', ')}`);
      result.missingFields = missingRequired;
    }

    // 알 수 없는 컬럼 확인
    const knownColumns = [...this.REQUIRED_COLUMNS, ...this.OPTIONAL_COLUMNS];
    const unknownColumns = headers.filter(col => col && !knownColumns.includes(col));
    if (unknownColumns.length > 0) {
      result.warnings.push(`알 수 없는 컬럼이 있습니다: ${unknownColumns.join(', ')}`);
    }

    return result;
  }

  /**
   * 데이터 행 검증
   */
  private static validateDataRow(
    row: any[],
    headers: string[],
    rowIndex: number
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 각 필드에 대해 유효성 검사
    for (const rule of this.VALIDATION_RULES) {
      const columnIndex = headers.indexOf(rule.field);
      if (columnIndex === -1) continue;

      const value = row[columnIndex];
      const fieldValidation = this.validateField(value, rule, rule.field, rowIndex);
      
      if (!fieldValidation.isValid) {
        result.isValid = false;
        result.errors.push(...fieldValidation.errors);
      }
      
      result.warnings.push(...fieldValidation.warnings);
    }

    // 금액 일치성 검사
    const supplyAmount = this.parseNumber(row[headers.indexOf('공급가액')]);
    const taxAmount = this.parseNumber(row[headers.indexOf('세액')]);
    const totalAmount = this.parseNumber(row[headers.indexOf('합계')]);
    
    if (supplyAmount !== null && taxAmount !== null && totalAmount !== null) {
      const calculatedTotal = supplyAmount + taxAmount;
      if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
        result.warnings.push(`${rowIndex}행: 공급가액(${supplyAmount}) + 세액(${taxAmount}) ≠ 합계(${totalAmount})`);
      }
    }

    // 단가 × 수량 = 공급가액 검사
    const quantity = this.parseNumber(row[headers.indexOf('수량')]);
    const unitPrice = this.parseNumber(row[headers.indexOf('단가')]);
    
    if (quantity !== null && unitPrice !== null && supplyAmount !== null) {
      const calculatedSupply = quantity * unitPrice;
      if (Math.abs(calculatedSupply - supplyAmount) > 0.01) {
        result.warnings.push(`${rowIndex}행: 수량(${quantity}) × 단가(${unitPrice}) ≠ 공급가액(${supplyAmount})`);
      }
    }

    return result;
  }

  /**
   * 개별 필드 유효성 검사
   */
  private static validateField(
    value: any,
    rule: POTemplateValidationRule,
    fieldName: string,
    rowIndex: number
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 필수 필드 확인
    if (rule.required && (value === null || value === undefined || value === '')) {
      result.isValid = false;
      result.errors.push(`${rowIndex}행: ${fieldName}은(는) 필수 항목입니다.`);
      return result;
    }

    // 빈 값이면 추가 검증 생략
    if (value === null || value === undefined || value === '') {
      return result;
    }

    // 타입 검증
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          const stringValue = String(value);
          if (rule.minLength && stringValue.length < rule.minLength) {
            result.isValid = false;
            result.errors.push(`${rowIndex}행: ${fieldName}은(는) 최소 ${rule.minLength}자 이상이어야 합니다.`);
          }
          if (rule.maxLength && stringValue.length > rule.maxLength) {
            result.isValid = false;
            result.errors.push(`${rowIndex}행: ${fieldName}은(는) 최대 ${rule.maxLength}자 이하여야 합니다.`);
          }
          if (rule.pattern && !rule.pattern.test(stringValue)) {
            result.isValid = false;
            result.errors.push(`${rowIndex}행: ${fieldName}의 형식이 올바르지 않습니다.`);
          }
        }
        break;

      case 'number':
        const numValue = this.parseNumber(value);
        if (numValue === null) {
          result.isValid = false;
          result.errors.push(`${rowIndex}행: ${fieldName}은(는) 숫자여야 합니다.`);
        }
        break;

      case 'date':
        const dateValue = this.parseDate(value);
        if (dateValue === null) {
          result.isValid = false;
          result.errors.push(`${rowIndex}행: ${fieldName}은(는) 올바른 날짜 형식이어야 합니다.`);
        }
        break;
    }

    // 사용자 정의 검증
    if (rule.customValidator && !rule.customValidator(value)) {
      result.isValid = false;
      result.errors.push(`${rowIndex}행: ${fieldName}의 값이 유효하지 않습니다.`);
    }

    return result;
  }

  /**
   * 빈 행 확인
   */
  private static isEmptyRow(row: any[]): boolean {
    return row.every(cell => cell === null || cell === undefined || cell === '');
  }

  /**
   * 숫자 파싱
   */
  private static parseNumber(value: any): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * 날짜 파싱
   */
  private static parseDate(value: any): Date | null {
    if (value instanceof Date) return value;
    
    if (typeof value === 'number') {
      // Excel 날짜 시리얼 번호
      const date = new Date((value - 25569) * 86400 * 1000);
      return isNaN(date.getTime()) ? null : date;
    }
    
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  }

  /**
   * 빠른 유효성 검사 (기본적인 구조만 확인)
   */
  static async quickValidate(filePath: string): Promise<{
    isValid: boolean;
    hasInputSheet: boolean;
    hasRequiredSheets: boolean;
    rowCount: number;
    errors: string[];
  }> {
    const result = {
      isValid: true,
      hasInputSheet: false,
      hasRequiredSheets: false,
      rowCount: 0,
      errors: []
    };

    try {
      if (!fs.existsSync(filePath)) {
        result.isValid = false;
        result.errors.push('파일을 찾을 수 없습니다.');
        return result;
      }

      const workbook = XLSX.readFile(filePath);
      
      // Input 시트 확인
      result.hasInputSheet = workbook.SheetNames.includes('Input');
      if (!result.hasInputSheet) {
        result.isValid = false;
        result.errors.push('Input 시트가 없습니다.');
      }

      // 필수 시트 확인
      const requiredSheets = ['갑지', '을지'];
      result.hasRequiredSheets = requiredSheets.every(sheet => workbook.SheetNames.includes(sheet));
      if (!result.hasRequiredSheets) {
        result.errors.push('갑지 또는 을지 시트가 누락되었습니다.');
      }

      // 행 개수 확인
      if (result.hasInputSheet) {
        const worksheet = workbook.Sheets['Input'];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        result.rowCount = Math.max(0, data.length - 1); // 헤더 제외
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : '파일 처리 오류');
    }

    return result;
  }
}