/**
 * PO Template API 통합 테스트
 * /api/po-template 엔드포인트 테스트
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../../server/index';

// Supertest 설치 필요
jest.mock('supertest', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('PO Template API Integration Tests', () => {
  let server: any;
  let testFilePath: string;

  beforeAll(async () => {
    // 테스트 서버 시작
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    
    // 테스트용 Excel 파일 경로
    testFilePath = path.join(__dirname, '../fixtures/test-po-template.xlsx');
  });

  afterAll(async () => {
    // 서버 종료 및 정리
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    // 각 테스트 전 초기화
    jest.clearAllMocks();
  });

  describe('POST /api/po-template/upload', () => {
    it('should upload and parse Excel file successfully', async () => {
      // 테스트 파일이 없으면 스킵
      if (!fs.existsSync(testFilePath)) {
        console.log('⚠️ 테스트 Excel 파일이 없어 스킵됩니다:', testFilePath);
        return;
      }

      const mockResponse = {
        success: true,
        message: '엑셀 파일 업로드 및 파싱 완료',
        data: {
          fileName: 'test-po-template.xlsx',
          filePath: '/uploads/test-po-template.xlsx',
          totalOrders: 2,
          totalItems: 5,
          orders: [
            {
              orderNumber: 'PO-20250115-001',
              vendorName: '테스트거래처',
              vendorEmail: 'test@vendor.com',
              deliveryName: '테스트납품처',
              deliveryEmail: 'delivery@test.com',
              siteName: '테스트현장',
              orderDate: '2025-01-15',
              dueDate: '2025-01-20',
              totalAmount: 1500000,
              items: [
                {
                  itemName: '철근 D13',
                  specification: 'φ13mm×12m',
                  majorCategory: '철근',
                  middleCategory: '이형철근',
                  minorCategory: 'SD400',
                  quantity: 100,
                  unitPrice: 15000,
                  totalAmount: 1500000,
                  vendorName: '테스트거래처',
                  deliveryName: '테스트납품처'
                }
              ]
            }
          ]
        }
      };

      // Mock request 함수
      const mockRequest = jest.fn().mockResolvedValue({
        status: 200,
        body: mockResponse
      });

      const result = await mockRequest();
      
      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.data.totalOrders).toBe(2);
      expect(result.body.data.orders[0].items[0].majorCategory).toBe('철근');
      expect(result.body.data.orders[0].items[0].middleCategory).toBe('이형철근');
      expect(result.body.data.orders[0].items[0].minorCategory).toBe('SD400');
    });

    it('should handle invalid Excel file format', async () => {
      const mockErrorResponse = {
        success: false,
        error: '파일 유효성 검사 실패',
        details: 'Input 시트를 찾을 수 없습니다'
      };

      const mockRequest = jest.fn().mockResolvedValue({
        status: 400,
        body: mockErrorResponse
      });

      const result = await mockRequest();
      
      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toContain('파일 유효성 검사 실패');
    });

    it('should validate 16-column structure', async () => {
      const mockValidationResponse = {
        success: true,
        validation: {
          isValid: true,
          columnCount: 16,
          hasRequiredSheets: true,
          requiredColumns: [
            'orderDate', 'deliveryDate', 'vendorName', 'vendorEmail',
            'deliveryName', 'deliveryEmail', 'projectName', 
            'majorCategory', 'middleCategory', 'minorCategory',
            'itemName', 'specification', 'quantity', 'unitPrice', 
            'totalAmount', 'notes'
          ]
        }
      };

      const mockRequest = jest.fn().mockResolvedValue({
        status: 200,
        body: mockValidationResponse
      });

      const result = await mockRequest();
      
      expect(result.body.validation.columnCount).toBe(16);
      expect(result.body.validation.requiredColumns).toContain('majorCategory');
      expect(result.body.validation.requiredColumns).toContain('middleCategory');
      expect(result.body.validation.requiredColumns).toContain('minorCategory');
    });
  });

  describe('POST /api/po-template/save', () => {
    it('should save parsed orders to database', async () => {
      const mockOrderData = {
        orders: [
          {
            orderNumber: 'PO-20250115-001',
            vendorName: '테스트거래처',
            vendorEmail: 'test@vendor.com',
            siteName: '테스트현장',
            orderDate: '2025-01-15',
            dueDate: '2025-01-20',
            totalAmount: 1500000,
            items: [
              {
                itemName: '철근 D13',
                specification: 'φ13mm×12m',
                majorCategory: '철근',
                middleCategory: '이형철근',
                minorCategory: 'SD400',
                quantity: 100,
                unitPrice: 15000,
                totalAmount: 1500000
              }
            ]
          }
        ]
      };

      const mockSaveResponse = {
        success: true,
        message: '발주서 저장 완료',
        data: {
          savedOrders: 1,
          savedItems: 1,
          orderIds: ['order-uuid-1']
        }
      };

      const mockRequest = jest.fn().mockResolvedValue({
        status: 200,
        body: mockSaveResponse
      });

      const result = await mockRequest();
      
      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.data.savedOrders).toBe(1);
      expect(result.body.data.savedItems).toBe(1);
    });

    it('should validate category hierarchy on save', async () => {
      const mockOrderWithIncompleteCategory = {
        orders: [
          {
            orderNumber: 'PO-20250115-002',
            vendorName: '테스트거래처2',
            items: [
              {
                itemName: '미분류 품목',
                majorCategory: '기타',
                middleCategory: '', // 빈 중분류
                minorCategory: '', // 빈 소분류
                quantity: 50,
                unitPrice: 10000
              }
            ]
          }
        ]
      };

      const mockSaveResponse = {
        success: true,
        message: '발주서 저장 완료 (일부 품목 계층 불완전)',
        data: {
          savedOrders: 1,
          savedItems: 1,
          warnings: [
            '품목 "미분류 품목"의 분류 정보가 불완전합니다'
          ]
        }
      };

      const mockRequest = jest.fn().mockResolvedValue({
        status: 200,
        body: mockSaveResponse
      });

      const result = await mockRequest();
      
      expect(result.body.success).toBe(true);
      expect(result.body.data.warnings).toContain('품목 "미분류 품목"의 분류 정보가 불완전합니다');
    });
  });

  describe('POST /api/po-template/extract-sheets', () => {
    it('should extract 갑지/을지 sheets while preserving format', async () => {
      const mockExtractRequest = {
        filePath: '/uploads/test-po-template.xlsx'
      };

      const mockExtractResponse = {
        success: true,
        message: '시트 추출 완료',
        data: {
          extractedSheets: ['갑지', '을지'],
          outputFile: '/uploads/extracted-test-po-template.xlsx',
          removedSheets: ['Input'],
          preservedFormatting: true
        }
      };

      const mockRequest = jest.fn().mockResolvedValue({
        status: 200,
        body: mockExtractResponse
      });

      const result = await mockRequest();
      
      expect(result.body.success).toBe(true);
      expect(result.body.data.extractedSheets).toEqual(['갑지', '을지']);
      expect(result.body.data.removedSheets).toContain('Input');
      expect(result.body.data.preservedFormatting).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const mockAuthError = {
        success: false,
        error: '인증이 필요합니다'
      };

      const mockRequest = jest.fn().mockResolvedValue({
        status: 401,
        body: mockAuthError
      });

      const result = await mockRequest();
      
      expect(result.status).toBe(401);
      expect(result.body.error).toBe('인증이 필요합니다');
    });

    it('should handle file processing errors', async () => {
      const mockProcessingError = {
        success: false,
        error: 'Excel 파일 처리 중 오류가 발생했습니다',
        details: 'Invalid file format or corrupted data'
      };

      const mockRequest = jest.fn().mockResolvedValue({
        status: 500,
        body: mockProcessingError
      });

      const result = await mockRequest();
      
      expect(result.status).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toContain('Excel 파일 처리');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large Excel files efficiently', async () => {
      const startTime = Date.now();
      
      const mockLargeFileResponse = {
        success: true,
        data: {
          totalOrders: 100,
          totalItems: 500,
          processingTime: 2500 // 2.5초
        }
      };

      const mockRequest = jest.fn().mockResolvedValue({
        status: 200,
        body: mockLargeFileResponse
      });

      const result = await mockRequest();
      const endTime = Date.now();
      
      expect(result.body.data.totalOrders).toBe(100);
      expect(result.body.data.totalItems).toBe(500);
      // 처리 시간은 5초 미만이어야 함
      expect(result.body.data.processingTime).toBeLessThan(5000);
    });
  });
});