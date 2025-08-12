/**
 * Excel 자동화 서비스 단위 테스트
 * 
 * 테스트 범위:
 * - Excel 파일 업로드 및 파싱
 * - 거래처 검증 프로세스
 * - 이메일 미리보기 생성
 * - 이메일 발송 기능
 * - 에러 처리 및 복구
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mock puppeteer before importing modules that use it
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
  executablePath: jest.fn()
}));

// Mock the excel-to-pdf-converter module
jest.mock('../server/utils/excel-to-pdf-converter', () => ({
  ExcelToPDFConverter: {
    convertExcelToPDF: jest.fn()
  }
}));

import { ExcelAutomationService } from '../server/utils/excel-automation-service';
import { POTemplateProcessorMock } from '../server/utils/po-template-processor-mock';
import { validateMultipleVendors } from '../server/utils/vendor-validation';
import { POEmailService } from '../server/utils/po-email-service';
import { removeAllInputSheets } from '../server/utils/excel-input-sheet-remover';
import { ExcelToPDFConverter } from '../server/utils/excel-to-pdf-converter';

// Mock dependencies
jest.mock('../server/utils/po-template-processor-mock');
jest.mock('../server/utils/vendor-validation');
jest.mock('../server/utils/po-email-service');
jest.mock('../server/utils/excel-input-sheet-remover');
jest.mock('../server/utils/excel-to-pdf-converter');
jest.mock('fs');

const mockedPOTemplateProcessor = POTemplateProcessorMock as jest.Mocked<typeof POTemplateProcessorMock>;
const mockedValidateMultipleVendors = validateMultipleVendors as jest.MockedFunction<typeof validateMultipleVendors>;
const mockedPOEmailService = POEmailService as jest.Mocked<typeof POEmailService>;
const mockedRemoveAllInputSheets = removeAllInputSheets as jest.MockedFunction<typeof removeAllInputSheets>;
const mockedExcelToPDFConverter = ExcelToPDFConverter as jest.Mocked<typeof ExcelToPDFConverter>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ExcelAutomationService', () => {
  const testFilePath = '/test/sample.xlsx';
  const testUserId = 'test-user-123';
  const testProcessedPath = '/test/processed-123456789.xlsx';
  const testPdfPath = '/test/processed-123456789.pdf';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockedFs.statSync.mockReturnValue({
      size: 1024 * 50, // 50KB
      isFile: () => true,
      isDirectory: () => false
    } as any);
    
    mockedFs.existsSync.mockReturnValue(true);
    
    // Mock Date.now for consistent timestamps
    const mockTimestamp = 123456789;
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processExcelUpload', () => {
    const mockParseResult = {
      success: true,
      totalOrders: 1,
      totalItems: 1,
      orders: [
        {
          orderNumber: 'PO-2024-001',
          vendorName: '테스트 거래처',
          siteName: '테스트 현장',
          orderDate: '2024-01-15',
          dueDate: '2024-01-25',
          totalAmount: 1000000,
          items: [
            {
              itemName: '테스트 품목',
              specification: 'Test Spec',
              quantity: 10,
              unitPrice: 100000,
              supplyAmount: 909090,
              taxAmount: 90910,
              totalAmount: 1000000,
              categoryLv1: '카테고리1',
              categoryLv2: '카테고리2',
              categoryLv3: '카테고리3',
              vendorName: '테스트 거래처',
              deliveryName: '테스트 납품처',
              notes: ''
            }
          ]
        }
      ]
    };

    const mockSaveResult = {
      success: true,
      savedOrders: 1
    };

    it('should successfully process Excel upload with valid data', async () => {
      // Arrange
      mockedPOTemplateProcessor.parseInputSheet.mockReturnValue(mockParseResult);
      mockedPOTemplateProcessor.saveToDatabase.mockResolvedValue(mockSaveResult);
      
      mockedValidateMultipleVendors.mockResolvedValue({
        vendorValidations: [
          {
            vendorName: '테스트 거래처',
            exists: true,
            exactMatch: {
              id: 1,
              name: '테스트 거래처',
              email: 'test@example.com',
              contactPerson: '담당자'
            },
            suggestions: []
          }
        ],
        deliveryValidations: [],
        emailConflicts: []
      });

      mockedRemoveAllInputSheets.mockResolvedValue({
        success: true,
        removedSheets: ['Input'],
        remainingSheets: ['갑지', '을지'],
        originalFormat: true
      });

      mockedExcelToPDFConverter.convertExcelToPDF.mockResolvedValue(testPdfPath);

      // Act
      const result = await ExcelAutomationService.processExcelUpload(testFilePath, testUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.savedOrders).toBe(1);
      expect(result.data!.vendorValidation.validVendors).toHaveLength(1);
      expect(result.data!.vendorValidation.validVendors[0].email).toBe('test@example.com');
      expect(result.data!.emailPreview.recipients).toContain('test@example.com');
      expect(result.data!.emailPreview.canProceed).toBe(true);

      // Verify function calls
      expect(mockedPOTemplateProcessor.parseInputSheet).toHaveBeenCalledWith(testFilePath);
      expect(mockedPOTemplateProcessor.saveToDatabase).toHaveBeenCalledWith(mockParseResult.orders, testUserId);
      expect(mockedValidateMultipleVendors).toHaveBeenCalled();
      expect(mockedRemoveAllInputSheets).toHaveBeenCalled();
      expect(mockedExcelToPDFConverter.convertExcelToPDF).toHaveBeenCalled();
    });

    it('should handle Excel parsing failure', async () => {
      // Arrange
      mockedPOTemplateProcessor.parseInputSheet.mockReturnValue({
        success: false,
        totalOrders: 0,
        totalItems: 0,
        orders: [],
        error: 'Invalid Excel format'
      });

      // Act
      const result = await ExcelAutomationService.processExcelUpload(testFilePath, testUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Excel 파싱 실패');
      expect(result.error).toContain('Invalid Excel format');
    });

    it('should handle database save failure', async () => {
      // Arrange
      mockedPOTemplateProcessor.parseInputSheet.mockReturnValue(mockParseResult);
      mockedPOTemplateProcessor.saveToDatabase.mockResolvedValue({
        success: false,
        savedOrders: 0,
        error: 'Database connection failed'
      });

      // Act
      const result = await ExcelAutomationService.processExcelUpload(testFilePath, testUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('DB 저장 실패');
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      mockedPOTemplateProcessor.parseInputSheet.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      const result = await ExcelAutomationService.processExcelUpload(testFilePath, testUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });

  describe('validateVendorsFromExcel', () => {
    const mockParseResultWithMultipleVendors = {
      success: true,
      totalOrders: 1,
      totalItems: 2,
      orders: [
        {
          orderNumber: 'PO-2024-001',
          orderDate: '2024-01-15',
          siteName: '테스트 현장',
          dueDate: '2024-01-25',
          vendorName: '메인 거래처',
          totalAmount: 2000000,
          items: [
            {
              itemName: '품목 1',
              specification: '품목1 사양',
              quantity: 10,
              unitPrice: 100000,
              supplyAmount: 909090,
              taxAmount: 90910,
              totalAmount: 1000000,
              categoryLv1: '카테고리1',
              categoryLv2: '카테고리2',
              categoryLv3: '카테고리3',
              vendorName: '거래처 A',
              deliveryName: '납품처 A',
              notes: ''
            },
            {
              itemName: '품목 2',
              specification: '품목2 사양',
              quantity: 10,
              unitPrice: 100000,
              supplyAmount: 909090,
              taxAmount: 90910,
              totalAmount: 1000000,
              categoryLv1: '카테고리1',
              categoryLv2: '카테고리2',
              categoryLv3: '카테고리3',
              vendorName: '거래처 B',
              deliveryName: '납품처 B',
              notes: ''
            }
          ]
        }
      ]
    };

    it('should validate vendors with exact matches', async () => {
      // Arrange
      mockedPOTemplateProcessor.parseInputSheet.mockReturnValue(mockParseResultWithMultipleVendors);
      
      mockedValidateMultipleVendors.mockResolvedValue({
        vendorValidations: [
          {
            vendorName: '거래처 A',
            exists: true,
            exactMatch: {
              id: 1,
              name: '거래처 A',
              email: 'vendorA@example.com',
              contactPerson: '담당자 A'
            },
            suggestions: []
          },
          {
            vendorName: '거래처 B',
            exists: true,
            exactMatch: {
              id: 2,
              name: '거래처 B',
              email: 'vendorB@example.com',
              contactPerson: '담당자 B'
            },
            suggestions: []
          }
        ],
        deliveryValidations: [],
        emailConflicts: []
      });

      // Act
      const result = await ExcelAutomationService.validateVendorsFromExcel(testFilePath);

      // Assert
      expect(result.validVendors).toHaveLength(2);
      expect(result.invalidVendors).toHaveLength(0);
      expect(result.needsUserAction).toBe(false);
      
      expect(result.validVendors[0].vendorName).toBe('거래처 A');
      expect(result.validVendors[0].email).toBe('vendorA@example.com');
      expect(result.validVendors[1].vendorName).toBe('거래처 B');
      expect(result.validVendors[1].email).toBe('vendorB@example.com');
    });

    it('should handle vendors with no matches and provide suggestions', async () => {
      // Arrange
      mockedPOTemplateProcessor.parseInputSheet.mockReturnValue({
        success: true,
        totalOrders: 1,
        totalItems: 1,
        orders: [
          {
            orderNumber: 'PO-2024-001',
            orderDate: '2024-01-15',
            siteName: '테스트 현장',
            dueDate: '2024-01-25',
            vendorName: '존재하지않는거래처',
            totalAmount: 1000000,
            items: [
              {
                itemName: '품목 1',
                specification: '품목1 사양',
                quantity: 10,
                unitPrice: 100000,
                supplyAmount: 909090,
                taxAmount: 90910,
                totalAmount: 1000000,
                categoryLv1: '카테고리1',
                categoryLv2: '카테고리2',
                categoryLv3: '카테고리3',
                vendorName: '존재하지않는거래처',
                deliveryName: '존재하지않는거래처',
                notes: ''
              }
            ]
          }
        ]
      });
      
      mockedValidateMultipleVendors.mockResolvedValue({
        vendorValidations: [
          {
            vendorName: '존재하지않는거래처',
            exists: false,
            exactMatch: undefined,
            suggestions: [
              {
                id: 1,
                name: '비슷한거래처',
                email: 'similar@example.com',
                contactPerson: '비슷한담당자',
                similarity: 0.8,
                distance: 5
              }
            ]
          }
        ],
        deliveryValidations: [],
        emailConflicts: []
      });

      // Act
      const result = await ExcelAutomationService.validateVendorsFromExcel(testFilePath);

      // Assert
      expect(result.validVendors).toHaveLength(0);
      expect(result.invalidVendors).toHaveLength(1);
      expect(result.needsUserAction).toBe(true);
      
      expect(result.invalidVendors[0].vendorName).toBe('존재하지않는거래처');
      expect(result.invalidVendors[0].suggestions).toHaveLength(1);
      expect(result.invalidVendors[0].suggestions[0].name).toBe('비슷한거래처');
    });

    it('should handle Excel parsing failure in validation', async () => {
      // Arrange
      mockedPOTemplateProcessor.parseInputSheet.mockReturnValue({
        success: false,
        totalOrders: 0,
        totalItems: 0,
        orders: [],
        error: 'Parsing failed'
      });

      // Act
      const result = await ExcelAutomationService.validateVendorsFromExcel(testFilePath);

      // Assert
      expect(result.validVendors).toHaveLength(0);
      expect(result.invalidVendors).toHaveLength(0);
      expect(result.needsUserAction).toBe(true);
    });

    it('should handle duplicate vendor names correctly', async () => {
      // Arrange
      mockedPOTemplateProcessor.parseInputSheet.mockReturnValue({
        success: true,
        totalOrders: 1,
        totalItems: 2,
        orders: [
          {
            orderNumber: 'PO-2024-001',
            orderDate: '2024-01-15',
            siteName: '테스트 현장',
            dueDate: '2024-01-25',
            vendorName: '중복거래처',
            totalAmount: 2000000,
            items: [
              {
                itemName: '품목 1',
                specification: '품목1 사양',
                quantity: 10,
                unitPrice: 100000,
                supplyAmount: 909090,
                taxAmount: 90910,
                totalAmount: 1000000,
                categoryLv1: '카테고리1',
                categoryLv2: '카테고리2',
                categoryLv3: '카테고리3',
                vendorName: '중복거래처',
                deliveryName: '납품처 1',
                notes: ''
              },
              {
                itemName: '품목 2',
                specification: '품목2 사양',
                quantity: 10,
                unitPrice: 100000,
                supplyAmount: 909090,
                taxAmount: 90910,
                totalAmount: 1000000,
                categoryLv1: '카테고리1',
                categoryLv2: '카테고리2',
                categoryLv3: '카테고리3',
                vendorName: '중복거래처',
                deliveryName: '납품처 2',
                notes: ''
              }
            ]
          }
        ]
      });
      
      mockedValidateMultipleVendors.mockResolvedValue({
        vendorValidations: [
          {
            vendorName: '중복거래처',
            exists: true,
            exactMatch: {
              id: 1,
              name: '중복거래처',
              email: 'duplicate@example.com',
              contactPerson: '중복담당자'
            },
            suggestions: []
          }
        ],
        deliveryValidations: [],
        emailConflicts: []
      });

      // Act
      const result = await ExcelAutomationService.validateVendorsFromExcel(testFilePath);

      // Assert
      expect(result.validVendors).toHaveLength(1);
      expect(result.validVendors[0].vendorName).toBe('중복거래처');
      
      // Verify that validateMultipleVendors was called with unique vendor pairs
      const calledWith = mockedValidateMultipleVendors.mock.calls[0][0];
      expect(calledWith).toHaveLength(2); // Two unique vendor-delivery pairs
    });
  });

  describe('generateEmailPreview', () => {
    const mockVendorValidation = {
      validVendors: [
        {
          vendorName: '거래처 A',
          email: 'vendorA@example.com',
          vendorId: 1
        },
        {
          vendorName: '거래처 B',
          email: 'vendorB@example.com',
          vendorId: 2
        }
      ],
      invalidVendors: [],
      needsUserAction: false
    };

    it('should generate email preview successfully', async () => {
      // Arrange
      mockedRemoveAllInputSheets.mockResolvedValue({
        success: true,
        removedSheets: ['Input'],
        remainingSheets: ['갑지', '을지'],
        originalFormat: true
      });

      mockedExcelToPDFConverter.convertExcelToPDF.mockResolvedValue(testPdfPath);

      // Mock fs.statSync for both Excel and PDF files
      mockedFs.statSync
        .mockReturnValueOnce({ size: 1024 * 50 } as any) // Excel file
        .mockReturnValueOnce({ size: 1024 * 30 } as any); // PDF file

      mockedFs.existsSync.mockReturnValue(true);

      // Act
      const result = await ExcelAutomationService.generateEmailPreview(testFilePath, mockVendorValidation);

      // Assert
      expect(result.recipients).toEqual(['vendorA@example.com', 'vendorB@example.com']);
      expect(result.subject).toContain('발주서');
      expect(result.subject).toContain('sample');
      expect(result.attachmentInfo.originalFile).toBe('sample.xlsx');
      expect(result.attachmentInfo.processedFile).toBe('processed-123456789.xlsx');
      expect(result.attachmentInfo.processedPdfFile).toBe('processed-123456789.pdf');
      expect(result.attachmentInfo.fileSize).toBe(1024 * 50);
      expect(result.attachmentInfo.pdfFileSize).toBe(1024 * 30);
      expect(result.canProceed).toBe(true);
    });

    it('should handle duplicate emails in recipients', async () => {
      // Arrange
      const vendorValidationWithDuplicates = {
        validVendors: [
          {
            vendorName: '거래처 A',
            email: 'same@example.com',
            vendorId: 1
          },
          {
            vendorName: '거래처 B',
            email: 'same@example.com', // Same email
            vendorId: 2
          }
        ],
        invalidVendors: [],
        needsUserAction: false
      };

      mockedRemoveAllInputSheets.mockResolvedValue({
        success: true,
        removedSheets: ['Input'],
        remainingSheets: ['갑지', '을지'],
        originalFormat: true
      });

      // Act
      const result = await ExcelAutomationService.generateEmailPreview(testFilePath, vendorValidationWithDuplicates);

      // Assert
      expect(result.recipients).toEqual(['same@example.com']);
      expect(result.recipients).toHaveLength(1);
    });

    it('should handle PDF conversion failure gracefully', async () => {
      // Arrange
      mockedRemoveAllInputSheets.mockResolvedValue({
        success: true,
        removedSheets: ['Input'],
        remainingSheets: ['갑지', '을지'],
        originalFormat: true
      });

      mockedExcelToPDFConverter.convertExcelToPDF.mockRejectedValue(new Error('PDF conversion failed'));

      // Mock fs.statSync for Excel file 
      mockedFs.statSync.mockReturnValue({ size: 1024 * 50 } as any); // Excel file stats
      
      // Mock fs.existsSync - the service calls this to check if PDF file exists after conversion
      // Line 303 in service: fs.existsSync(pdfPath) ? fs.statSync(pdfPath) : null
      mockedFs.existsSync.mockReturnValue(false); // PDF file doesn't exist after failed conversion

      // Act
      const result = await ExcelAutomationService.generateEmailPreview(testFilePath, mockVendorValidation);

      // Assert
      expect(result.recipients).toEqual(['vendorA@example.com', 'vendorB@example.com']);
      expect(result.attachmentInfo.processedPdfFile).toBeUndefined();
      expect(result.attachmentInfo.pdfFileSize).toBeUndefined();
      expect(result.canProceed).toBe(true); // Should still proceed even without PDF
    });

    it('should set canProceed to false when user action is needed', async () => {
      // Arrange
      const vendorValidationNeedsAction = {
        ...mockVendorValidation,
        needsUserAction: true
      };

      mockedRemoveAllInputSheets.mockResolvedValue({
        success: true,
        removedSheets: ['Input'],
        remainingSheets: ['갑지', '을지'],
        originalFormat: true
      });

      // Act
      const result = await ExcelAutomationService.generateEmailPreview(testFilePath, vendorValidationNeedsAction);

      // Assert
      expect(result.canProceed).toBe(false);
    });
  });

  describe('sendEmails', () => {
    const testRecipients = ['test1@example.com', 'test2@example.com'];
    const testEmailOptions = {
      subject: '테스트 발주서',
      orderNumber: 'PO-2024-001',
      additionalMessage: '추가 메시지'
    };

    beforeEach(() => {
      // Mock POEmailService instance
      const mockEmailServiceInstance = {
        sendPOWithOriginalFormat: jest.fn()
      };
      
      (POEmailService as any).mockImplementation(() => mockEmailServiceInstance);
    });

    it('should send emails successfully to all recipients', async () => {
      // Arrange
      const mockEmailServiceInstance = new (POEmailService as any)();
      mockEmailServiceInstance.sendPOWithOriginalFormat.mockResolvedValue({
        success: true,
        messageId: 'message-123'
      });

      // Act
      const result = await ExcelAutomationService.sendEmails(testProcessedPath, testRecipients, testEmailOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.sentEmails).toBe(2);
      expect(result.failedEmails).toHaveLength(0);
      expect(result.emailResults).toHaveLength(2);
      
      expect(result.emailResults[0].status).toBe('sent');
      expect(result.emailResults[0].email).toBe('test1@example.com');
      expect(result.emailResults[0].messageId).toBe('message-123');
      
      expect(result.emailResults[1].status).toBe('sent');
      expect(result.emailResults[1].email).toBe('test2@example.com');
      expect(result.emailResults[1].messageId).toBe('message-123');
    });

    it('should handle partial email sending failures', async () => {
      // Arrange
      const mockEmailServiceInstance = new (POEmailService as any)();
      mockEmailServiceInstance.sendPOWithOriginalFormat
        .mockResolvedValueOnce({
          success: true,
          messageId: 'message-123'
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Email delivery failed'
        });

      // Act
      const result = await ExcelAutomationService.sendEmails(testProcessedPath, testRecipients, testEmailOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.sentEmails).toBe(1);
      expect(result.failedEmails).toHaveLength(1);
      expect(result.emailResults).toHaveLength(2);
      
      expect(result.emailResults[0].status).toBe('sent');
      expect(result.emailResults[1].status).toBe('failed');
      expect(result.emailResults[1].error).toBe('Email delivery failed');
      
      expect(result.failedEmails[0].email).toBe('test2@example.com');
      expect(result.failedEmails[0].error).toBe('Email delivery failed');
    });

    it('should handle email service initialization failure', async () => {
      // Arrange
      (POEmailService as any).mockImplementation(() => {
        throw new Error('Email service initialization failed');
      });

      // Act
      const result = await ExcelAutomationService.sendEmails(testProcessedPath, testRecipients, testEmailOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.sentEmails).toBe(0);
      expect(result.failedEmails).toHaveLength(2);
      expect(result.emailResults).toHaveLength(0);
      
      expect(result.failedEmails[0].error).toBe('Email service initialization failed');
      expect(result.failedEmails[1].error).toBe('Email service initialization failed');
    });
  });

  describe('updateEmailPreviewWithVendorSelection', () => {
    const selectedVendors = [
      {
        originalName: '거래처 A',
        selectedVendorId: 1,
        selectedVendorEmail: 'selected1@example.com'
      },
      {
        originalName: '거래처 B',
        selectedVendorId: 2,
        selectedVendorEmail: 'selected2@example.com'
      }
    ];

    it('should update email preview with selected vendors', async () => {
      // Arrange
      mockedRemoveAllInputSheets.mockResolvedValue({
        success: true,
        removedSheets: ['Input'],
        remainingSheets: ['갑지', '을지'],
        originalFormat: true
      });

      mockedExcelToPDFConverter.convertExcelToPDF.mockResolvedValue(testPdfPath);

      // Act
      const result = await ExcelAutomationService.updateEmailPreviewWithVendorSelection(testFilePath, selectedVendors);

      // Assert
      expect(result.recipients).toEqual(['selected1@example.com', 'selected2@example.com']);
      expect(result.canProceed).toBe(true);
      expect(result.subject).toContain('발주서');
      expect(result.attachmentInfo.originalFile).toBe('sample.xlsx');
    });

    it('should handle duplicate emails in selected vendors', async () => {
      // Arrange
      const selectedVendorsWithDuplicates = [
        {
          originalName: '거래처 A',
          selectedVendorId: 1,
          selectedVendorEmail: 'same@example.com'
        },
        {
          originalName: '거래처 B',
          selectedVendorId: 2,
          selectedVendorEmail: 'same@example.com' // Same email
        }
      ];

      mockedRemoveAllInputSheets.mockResolvedValue({
        success: true,
        removedSheets: ['Input'],
        remainingSheets: ['갑지', '을지'],
        originalFormat: true
      });

      // Act
      const result = await ExcelAutomationService.updateEmailPreviewWithVendorSelection(testFilePath, selectedVendorsWithDuplicates);

      // Assert
      expect(result.recipients).toEqual(['same@example.com']);
      expect(result.recipients).toHaveLength(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty vendor list', async () => {
      // Arrange
      const emptyVendorValidation = {
        validVendors: [],
        invalidVendors: [],
        needsUserAction: false
      };

      mockedRemoveAllInputSheets.mockResolvedValue({
        success: true,
        removedSheets: [],
        remainingSheets: ['갑지', '을지'],
        originalFormat: true
      });

      // Act
      const result = await ExcelAutomationService.generateEmailPreview(testFilePath, emptyVendorValidation);

      // Assert
      expect(result.recipients).toHaveLength(0);
      expect(result.canProceed).toBe(false);
    });

    it('should handle file system errors', async () => {
      // Arrange
      mockedRemoveAllInputSheets.mockRejectedValue(new Error('File system error'));

      const vendorValidation = {
        validVendors: [{ vendorName: 'Test', email: 'test@example.com', vendorId: 1 }],
        invalidVendors: [],
        needsUserAction: false
      };

      // Act
      const result = await ExcelAutomationService.generateEmailPreview(testFilePath, vendorValidation);

      // Assert
      expect(result.recipients).toHaveLength(0);
      expect(result.canProceed).toBe(false);
      expect(result.attachmentInfo.originalFile).toBe('');
    });

    it('should filter out empty email addresses', async () => {
      // Arrange
      const vendorValidationWithEmptyEmails = {
        validVendors: [
          {
            vendorName: '거래처 A',
            email: 'valid@example.com',
            vendorId: 1
          },
          {
            vendorName: '거래처 B',
            email: '', // Empty email
            vendorId: 2
          },
          {
            vendorName: '거래처 C',
            email: '   ', // Whitespace only
            vendorId: 3
          }
        ],
        invalidVendors: [],
        needsUserAction: false
      };

      mockedRemoveAllInputSheets.mockResolvedValue({
        success: true,
        removedSheets: ['Input'],
        remainingSheets: ['갑지', '을지'],
        originalFormat: true
      });

      // Act
      const result = await ExcelAutomationService.generateEmailPreview(testFilePath, vendorValidationWithEmptyEmails);

      // Assert
      expect(result.recipients).toEqual(['valid@example.com']);
      expect(result.recipients).toHaveLength(1);
    });
  });
});