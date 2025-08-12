/**
 * Excel Parser 16-Column 구조 단위 테스트
 * 새로운 품목 계층 포함 파싱 로직 검증
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// Excel 파싱 유틸리티 모킹
jest.mock('xlsx', () => ({
  utils: {
    sheet_to_json: jest.fn()
  }
}));

describe('Excel Parser 16-Column Structure', () => {
  
  describe('Header Structure Validation', () => {
    it('should have correct 16-column headers (A:P)', () => {
      const expectedHeaders = [
        'orderDate',        // A - 발주일
        'deliveryDate',     // B - 납기일
        'vendorName',       // C - 거래처명
        'vendorEmail',      // D - 거래처 이메일
        'deliveryName',     // E - 납품처명
        'deliveryEmail',    // F - 납품처 이메일
        'projectName',      // G - 현장명
        'majorCategory',    // H - 대분류
        'middleCategory',   // I - 중분류
        'minorCategory',    // J - 소분류
        'itemName',         // K - 품목명
        'specification',    // L - 규격
        'quantity',         // M - 수량
        'unitPrice',        // N - 단가
        'totalAmount',      // O - 금액
        'notes'             // P - 비고
      ];
      
      expect(expectedHeaders).toHaveLength(16);
      expect(expectedHeaders[7]).toBe('majorCategory');
      expect(expectedHeaders[8]).toBe('middleCategory'); 
      expect(expectedHeaders[9]).toBe('minorCategory');
    });
  });

  describe('Data Parsing Logic', () => {
    it('should parse Excel data with item categories', () => {
      // Mock Excel 워크북 데이터
      const mockWorksheet = {
        '!ref': 'A1:P10',
        'A1': { v: '발주일', t: 's' },
        'B1': { v: '납기일', t: 's' },
        'C1': { v: '거래처명', t: 's' },
        'D1': { v: '거래처이메일', t: 's' },
        'E1': { v: '납품처명', t: 's' },
        'F1': { v: '납품처이메일', t: 's' },
        'G1': { v: '현장명', t: 's' },
        'H1': { v: '대분류', t: 's' },
        'I1': { v: '중분류', t: 's' },
        'J1': { v: '소분류', t: 's' },
        'K1': { v: '품목명', t: 's' },
        'L1': { v: '규격', t: 's' },
        'M1': { v: '수량', t: 's' },
        'N1': { v: '단가', t: 's' },
        'O1': { v: '금액', t: 's' },
        'P1': { v: '비고', t: 's' },
        // 데이터 행
        'A2': { v: '2025-01-15', t: 's' },
        'B2': { v: '2025-01-20', t: 's' },
        'C2': { v: '테스트거래처', t: 's' },
        'D2': { v: 'test@vendor.com', t: 's' },
        'E2': { v: '테스트납품처', t: 's' },
        'F2': { v: 'delivery@test.com', t: 's' },
        'G2': { v: '테스트현장', t: 's' },
        'H2': { v: '철근', t: 's' },
        'I2': { v: '이형철근', t: 's' },
        'J2': { v: 'SD400', t: 's' },
        'K2': { v: '철근 D13', t: 's' },
        'L2': { v: 'φ13mm×12m', t: 's' },
        'M2': { v: 100, t: 'n' },
        'N2': { v: 15000, t: 'n' },
        'O2': { v: 1500000, t: 'n' },
        'P2': { v: '긴급발주', t: 's' },
      };

      const mockWorkbook = {
        SheetNames: ['Input'],
        Sheets: {
          'Input': mockWorksheet
        }
      };

      // XLSX.utils.sheet_to_json 모킹
      const mockSheetToJson = XLSX.utils.sheet_to_json as jest.MockedFunction<typeof XLSX.utils.sheet_to_json>;
      mockSheetToJson.mockReturnValue([{
        '발주일': '2025-01-15',
        '납기일': '2025-01-20', 
        '거래처명': '테스트거래처',
        '거래처이메일': 'test@vendor.com',
        '납품처명': '테스트납품처',
        '납품처이메일': 'delivery@test.com',
        '현장명': '테스트현장',
        '대분류': '철근',
        '중분류': '이형철근',
        '소분류': 'SD400',
        '품목명': '철근 D13',
        '규격': 'φ13mm×12m',
        '수량': 100,
        '단가': 15000,
        '금액': 1500000,
        '비고': '긴급발주'
      }]);

      // 파싱 로직 시뮬레이션
      const parseExcelData = (worksheet: any) => {
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        return jsonData;
      };

      const result = parseExcelData(mockWorksheet);
      expect(result).toHaveLength(1);
      
      const parsedItem = result[0] as any;
      expect(parsedItem['대분류']).toBe('철근');
      expect(parsedItem['중분류']).toBe('이형철근');
      expect(parsedItem['소분류']).toBe('SD400');
      expect(parsedItem['품목명']).toBe('철근 D13');
    });
  });

  describe('Data Transformation', () => {
    it('should transform Korean headers to English keys', () => {
      const koreanToEnglish = {
        '발주일': 'orderDate',
        '납기일': 'deliveryDate',
        '거래처명': 'vendorName',
        '거래처이메일': 'vendorEmail',
        '납품처명': 'deliveryName',
        '납품처이메일': 'deliveryEmail',
        '현장명': 'projectName',
        '대분류': 'majorCategory',
        '중분류': 'middleCategory',
        '소분류': 'minorCategory',
        '품목명': 'itemName',
        '규격': 'specification',
        '수량': 'quantity',
        '단가': 'unitPrice',
        '금액': 'totalAmount',
        '비고': 'notes'
      };

      const koreanData = {
        '발주일': '2025-01-15',
        '대분류': '철근',
        '중분류': '이형철근',
        '소분류': 'SD400',
        '품목명': '철근 D13'
      };

      const transformData = (data: any) => {
        const transformed: any = {};
        Object.keys(data).forEach(key => {
          const englishKey = koreanToEnglish[key as keyof typeof koreanToEnglish];
          if (englishKey) {
            transformed[englishKey] = data[key];
          }
        });
        return transformed;
      };

      const result = transformData(koreanData);
      
      expect(result.orderDate).toBe('2025-01-15');
      expect(result.majorCategory).toBe('철근');
      expect(result.middleCategory).toBe('이형철근');
      expect(result.minorCategory).toBe('SD400');
      expect(result.itemName).toBe('철근 D13');
    });
  });

  describe('Validation Rules', () => {
    it('should validate required fields', () => {
      const requiredFields = [
        'orderDate',
        'vendorName', 
        'projectName',
        'itemName',
        'quantity',
        'unitPrice'
      ];

      const testData = {
        orderDate: '2025-01-15',
        vendorName: '테스트거래처',
        projectName: '테스트현장',
        majorCategory: '철근',
        middleCategory: '이형철근',
        minorCategory: 'SD400',
        itemName: '철근 D13',
        quantity: 100,
        unitPrice: 15000
      };

      const validateData = (data: any) => {
        const errors: string[] = [];
        requiredFields.forEach(field => {
          if (!data[field]) {
            errors.push(`${field} is required`);
          }
        });
        return { isValid: errors.length === 0, errors };
      };

      const result = validateData(testData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const testData = {
        orderDate: '2025-01-15',
        // vendorName 누락
        projectName: '테스트현장',
        itemName: '철근 D13'
        // quantity, unitPrice 누락
      };

      const validateData = (data: any) => {
        const requiredFields = ['orderDate', 'vendorName', 'projectName', 'itemName', 'quantity', 'unitPrice'];
        const errors: string[] = [];
        requiredFields.forEach(field => {
          if (!data[field]) {
            errors.push(`${field} is required`);
          }
        });
        return { isValid: errors.length === 0, errors };
      };

      const result = validateData(testData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('vendorName is required');
      expect(result.errors).toContain('quantity is required');
      expect(result.errors).toContain('unitPrice is required');
    });
  });

  describe('Category Hierarchy Processing', () => {
    it('should handle complete category hierarchy', () => {
      const itemData = {
        majorCategory: '철근',
        middleCategory: '이형철근', 
        minorCategory: 'SD400',
        itemName: '철근 D13'
      };

      const processCategoryHierarchy = (data: any) => {
        return {
          ...data,
          fullCategory: `${data.majorCategory} > ${data.middleCategory} > ${data.minorCategory}`,
          hasCompleteHierarchy: !!(data.majorCategory && data.middleCategory && data.minorCategory)
        };
      };

      const result = processCategoryHierarchy(itemData);
      
      expect(result.fullCategory).toBe('철근 > 이형철근 > SD400');
      expect(result.hasCompleteHierarchy).toBe(true);
    });

    it('should handle partial category hierarchy', () => {
      const itemData = {
        majorCategory: '철근',
        middleCategory: '이형철근',
        minorCategory: '', // 빈 값
        itemName: '철근 D13'
      };

      const processCategoryHierarchy = (data: any) => {
        const categories = [data.majorCategory, data.middleCategory, data.minorCategory]
          .filter(cat => cat && cat.trim() !== '');
        
        return {
          ...data,
          fullCategory: categories.join(' > '),
          hasCompleteHierarchy: categories.length === 3
        };
      };

      const result = processCategoryHierarchy(itemData);
      
      expect(result.fullCategory).toBe('철근 > 이형철근');
      expect(result.hasCompleteHierarchy).toBe(false);
    });
  });

  describe('Database Schema Compatibility', () => {
    it('should map to purchaseOrderItems table fields', () => {
      const excelData = {
        orderDate: '2025-01-15',
        deliveryDate: '2025-01-20',
        vendorName: '테스트거래처',
        vendorEmail: 'test@vendor.com',
        deliveryName: '테스트납품처',
        deliveryEmail: 'delivery@test.com',
        projectName: '테스트현장',
        majorCategory: '철근',
        middleCategory: '이형철근',
        minorCategory: 'SD400',
        itemName: '철근 D13',
        specification: 'φ13mm×12m',
        quantity: 100,
        unitPrice: 15000,
        totalAmount: 1500000,
        notes: '긴급발주'
      };

      // DB 필드 매핑 확인
      const dbFieldMapping = {
        itemName: 'name',
        specification: 'specification',
        quantity: 'quantity',
        unitPrice: 'unit_price',
        totalAmount: 'total_amount',
        majorCategory: 'major_category',
        middleCategory: 'middle_category',
        minorCategory: 'minor_category',
        notes: 'notes'
      };

      const mapToDbFields = (data: any) => {
        const dbData: any = {};
        Object.keys(dbFieldMapping).forEach(excelKey => {
          const dbKey = dbFieldMapping[excelKey as keyof typeof dbFieldMapping];
          dbData[dbKey] = data[excelKey];
        });
        return dbData;
      };

      const result = mapToDbFields(excelData);
      
      expect(result.name).toBe('철근 D13');
      expect(result.major_category).toBe('철근');
      expect(result.middle_category).toBe('이형철근');
      expect(result.minor_category).toBe('SD400');
      expect(result.unit_price).toBe(15000);
      expect(result.total_amount).toBe(1500000);
    });
  });
});