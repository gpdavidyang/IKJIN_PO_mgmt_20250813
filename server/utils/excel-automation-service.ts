/**
 * Excel 발주서 업로드 및 이메일 발송 자동화 서비스
 * 
 * 프로세스:
 * 1. Excel 파일 파싱 및 DB 저장
 * 2. 거래처명 기반 이메일 추출
 * 3. 사용자 확인 및 승인
 * 4. 이메일 자동 발송
 */

import { db } from '../db';
import { purchaseOrders, purchaseOrderItems, vendors } from '@shared/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { POTemplateProcessorMock } from './po-template-processor-mock';
import { validateMultipleVendors } from './vendor-validation';
import { POEmailService } from './po-email-service';
import { removeAllInputSheets } from './excel-input-sheet-remover';
import { DebugLogger } from './debug-logger';
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

export interface ExcelAutomationResult {
  success: boolean;
  data?: {
    savedOrders: number;
    vendorValidation: VendorValidationStep;
    emailPreview: EmailPreviewStep;
    orders?: Array<{
      orderNumber: string;
      orderDate: string;
      siteName: string;
      vendorName: string;
      totalAmount: number;
      items: any[];
    }>;
  };
  error?: string;
}

export interface VendorValidationStep {
  validVendors: Array<{
    vendorName: string;
    email: string;
    vendorId: number;
  }>;
  invalidVendors: Array<{
    vendorName: string;
    suggestions: Array<{
      id: number;
      name: string;
      email: string;
      similarity: number;
    }>;
  }>;
  needsUserAction: boolean;
}

export interface EmailPreviewStep {
  recipients: string[];
  subject: string;
  attachmentInfo: {
    originalFile: string;
    processedFile: string;
    fileSize: number;
  };
  canProceed: boolean;
}

export interface EmailSendResult {
  success: boolean;
  sentEmails: number;
  failedEmails: Array<{
    email: string;
    error: string;
  }>;
  emailResults: Array<{
    email: string;
    status: 'sent' | 'failed';
    messageId?: string;
    error?: string;
  }>;
}

export class ExcelAutomationService {
  
  /**
   * Excel 파일에서 거래처명만 추출 (DB 저장 없이)
   */
  private static extractVendorNamesOnly(filePath: string): Array<{ vendorName: string; deliveryName: string; email?: string }> {
    try {
      const workbook = XLSX.readFile(filePath);
      
      if (!workbook.SheetNames.includes('Input')) {
        return [];
      }

      const worksheet = workbook.Sheets['Input'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const rows = data.slice(1) as any[][];
      
      const vendorDeliveryPairs = [];
      
      for (const row of rows) {
        if (!row || !row[0]) continue;
        
        const vendorName = String(row[14] || '').trim();
        const deliveryName = String(row[15] || '').trim();
        
        if (vendorName) {
          vendorDeliveryPairs.push({
            vendorName,
            deliveryName: deliveryName || vendorName,
            email: undefined
          });
        }
      }
      
      // 중복 제거
      const uniquePairs = vendorDeliveryPairs.filter((pair, index, self) => 
        self.findIndex(p => p.vendorName === pair.vendorName && p.deliveryName === pair.deliveryName) === index
      );
      
      return uniquePairs;
      
    } catch (error) {
      console.error('거래처명 추출 중 오류:', error);
      return [];
    }
  }
  
  /**
   * Step 0: Excel 파일 사전 검증
   */
  static async preValidateExcel(filePath: string): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
  }> {
    DebugLogger.logFunctionEntry('ExcelAutomationService.preValidateExcel', { filePath });
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const workbook = XLSX.readFile(filePath);
      
      // 1. Input 시트 존재 여부 확인
      if (!workbook.SheetNames.includes('Input')) {
        errors.push('필수 시트 "Input"이 존재하지 않습니다.');
        return { success: false, errors, warnings };
      }
      
      // 2. 필수 시트 존재 여부 확인
      const requiredSheets = ['Input', '갑지', '을지'];
      const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));
      
      if (missingSheets.length > 0) {
        warnings.push(`다음 시트가 누락되었습니다: ${missingSheets.join(', ')}`);
      }
      
      // 3. Input 시트 헤더 검증
      const worksheet = workbook.Sheets['Input'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (data.length === 0) {
        errors.push('Input 시트가 비어있습니다.');
        return { success: false, errors, warnings };
      }
      
      // 헤더 행 확인
      const headers = data[0] as any[];
      const requiredHeaders = [
        '발주번호', '발주일', '현장명', '대분류', '중분류', '소분류',
        '품명', '규격', '수량', '단가', '공급가액', '세액', '합계',
        '납기일', '거래처명', '납품처명', '비고'
      ];
      
      // 헤더 인덱스 매핑 (유연한 헤더 매칭을 위해)
      const headerMap = new Map<string, number>();
      headers.forEach((header, index) => {
        if (header) {
          headerMap.set(String(header).trim(), index);
        }
      });
      
      // 필수 헤더 확인
      const missingHeaders = requiredHeaders.filter(required => {
        return !Array.from(headerMap.keys()).some(header => 
          header.includes(required) || required.includes(header)
        );
      });
      
      if (missingHeaders.length > 0) {
        errors.push(`필수 헤더가 누락되었습니다: ${missingHeaders.join(', ')}`);
      }
      
      // 4. 데이터 행 검증
      const dataRows = data.slice(1);
      
      if (dataRows.length === 0) {
        errors.push('Input 시트에 데이터가 없습니다.');
        return { success: false, errors, warnings };
      }
      
      // 빈 행 및 필수값 검증
      let emptyRowCount = 0;
      let rowsWithMissingData = 0;
      
      dataRows.forEach((row, index) => {
        const rowNum = index + 2; // Excel 행 번호 (1-based, 헤더 제외)
        
        // row가 배열인지 확인
        if (!Array.isArray(row)) {
          return;
        }
        
        // 완전히 빈 행 체크
        if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
          emptyRowCount++;
          return;
        }
        
        // 필수 필드 체크 (발주번호, 발주일, 거래처명)
        const orderNumber = row[0];
        const orderDate = row[1];
        const vendorName = row[14];
        
        if (!orderNumber || String(orderNumber).trim() === '') {
          errors.push(`행 ${rowNum}: 발주번호가 누락되었습니다.`);
          rowsWithMissingData++;
        }
        
        if (!orderDate) {
          warnings.push(`행 ${rowNum}: 발주일이 누락되었습니다.`);
        }
        
        if (!vendorName || String(vendorName).trim() === '') {
          errors.push(`행 ${rowNum}: 거래처명이 누락되었습니다.`);
          rowsWithMissingData++;
        }
      });
      
      if (emptyRowCount > 0) {
        warnings.push(`${emptyRowCount}개의 빈 행이 발견되었습니다. 파싱 시 무시됩니다.`);
      }
      
      // 5. 최소 데이터 확인
      const validDataRows = dataRows.filter(row => 
        Array.isArray(row) && row[0] && String(row[0]).trim() !== ''
      );
      
      if (validDataRows.length === 0) {
        errors.push('유효한 발주 데이터가 없습니다.');
      }
      
      const result = {
        success: errors.length === 0,
        errors,
        warnings
      };
      
      DebugLogger.logFunctionExit('ExcelAutomationService.preValidateExcel', result);
      return result;
      
    } catch (error) {
      DebugLogger.logError('ExcelAutomationService.preValidateExcel', error);
      errors.push(`파일 읽기 오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, errors, warnings };
    }
  }
  
  /**
   * 1단계: Excel 파일 업로드 및 파싱, DB 저장
   */
  static async processExcelUpload(
    filePath: string,
    userId: string
  ): Promise<ExcelAutomationResult> {
    DebugLogger.logFunctionEntry('ExcelAutomationService.processExcelUpload', {
      filePath,
      userId
    });

    try {
      // Step 0: 사전 검증
      const validationResult = await this.preValidateExcel(filePath);
      
      if (!validationResult.success) {
        return {
          success: false,
          error: `Excel 파일 검증 실패:\n${validationResult.errors.join('\n')}`
        };
      }
      
      // 경고사항이 있으면 로그에 기록
      if (validationResult.warnings.length > 0) {
        console.log('⚠️ Excel 검증 경고사항:');
        validationResult.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

      // 1. 거래처명 검증 (DB 저장 전에 수행)
      const vendorValidation = await this.validateVendorsFromExcel(filePath);
      
      console.log('🔍 About to parse Excel file...');
      
      // 2. Excel 파일 파싱 (검증 후 수행)
      const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
      
      console.log('📊 Parse result:', parseResult);
      console.log('📊 Parse result success:', parseResult.success);
      console.log('📊 Parse result orders:', parseResult.orders);
      console.log('📊 Parse result orders length:', parseResult.orders?.length);
      
      if (!parseResult.success) {
        return {
          success: false,
          error: `Excel 파싱 실패: ${parseResult.error}`
        };
      }

      // 3. DB에 발주서 데이터 저장 (이미 검증 완료된 후 수행)
      const saveResult = await POTemplateProcessorMock.saveToDatabase(
        parseResult.orders || [],
        userId
      );

      if (!saveResult.success) {
        return {
          success: false,
          error: `DB 저장 실패: ${saveResult.error}`
        };
      }
      
      // 4. 이메일 미리보기 생성
      const emailPreview = await this.generateEmailPreview(filePath, vendorValidation);

      // orders 데이터 확인을 위한 로그
      console.log('📊 parseResult.orders:', parseResult.orders);
      console.log('📊 Number of orders:', parseResult.orders?.length || 0);
      
      // 테스트용 샘플 데이터 생성
      const sampleOrders = parseResult.orders || [{
        orderNumber: "PO-2025-001",
        orderDate: "2025-07-18",
        siteName: "테스트 현장",
        vendorName: "이노에너지",
        totalAmount: 1000000,
        items: [
          {
            itemName: "철근",
            quantity: 10,
            unitPrice: 50000,
            supplyAmount: 500000,
            vendorName: "이노에너지",
            deliveryName: "이노메탈"
          },
          {
            itemName: "창호",
            quantity: 5,
            unitPrice: 100000,
            supplyAmount: 500000,
            vendorName: "울트라창호",
            deliveryName: "영세엔지텍"
          }
        ]
      }];
      
      // 디버깅: parseResult.orders 확인
      console.log('🔍 parseResult.orders exists:', !!parseResult.orders);
      console.log('🔍 parseResult.orders length:', parseResult.orders?.length);
      console.log('🔍 parseResult.orders data:', JSON.stringify(parseResult.orders, null, 2));

      const result = {
        success: true,
        data: {
          savedOrders: saveResult.savedOrders,
          vendorValidation,
          emailPreview,
          orders: parseResult.orders || [] // 실제 파싱된 발주서 데이터 사용
        }
      };

      // 최종 결과에 orders가 포함되었는지 확인
      console.log('📊 Final result.data.orders exists:', !!result.data.orders);
      console.log('📊 Final result.data.orders length:', result.data.orders?.length);
      console.log('📊 Final result.data.orders data:', JSON.stringify(result.data.orders, null, 2));

      DebugLogger.logFunctionExit('ExcelAutomationService.processExcelUpload', result);
      return result;

    } catch (error) {
      DebugLogger.logError('ExcelAutomationService.processExcelUpload', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 2단계: 거래처명 검증 및 이메일 추출
   */
  static async validateVendorsFromExcel(filePath: string): Promise<VendorValidationStep> {
    DebugLogger.logFunctionEntry('ExcelAutomationService.validateVendorsFromExcel', { filePath });

    try {
      // Mock DB를 원본 데이터로 강제 초기화 (검증 전에 수행)
      if (!process.env.DATABASE_URL) {
        console.log('🔧 Mock DB 초기화 시작...');
        const { MockDB } = await import('./mock-db');
        MockDB.resetToOriginalData();
        console.log('✅ Mock DB 초기화 완료');
      }
      
      // Excel에서 거래처명 직접 추출 (DB 저장 없이)
      const vendorNames = this.extractVendorNamesOnly(filePath);
      
      if (vendorNames.length === 0) {
        console.log('⚠️ 거래처명을 찾을 수 없습니다.');
        return {
          validVendors: [],
          invalidVendors: [],
          needsUserAction: false
        };
      }
      
      console.log(`📋 검증할 거래처명 (${vendorNames.length}개): ${vendorNames.map(v => v.vendorName).join(', ')}`);
      
      const validationResults = await validateMultipleVendors(vendorNames);
      
      const validVendors: VendorValidationStep['validVendors'] = [];
      const invalidVendors: VendorValidationStep['invalidVendors'] = [];

      for (const result of validationResults.vendorValidations) {
        if (result.exists && result.exactMatch) {
          validVendors.push({
            vendorName: result.vendorName,
            email: result.exactMatch.email,
            vendorId: result.exactMatch.id
          });
        } else {
          invalidVendors.push({
            vendorName: result.vendorName,
            suggestions: result.suggestions.map(s => ({
              id: s.id,
              name: s.name,
              email: s.email,
              similarity: s.similarity
            }))
          });
        }
      }

      const validationStep: VendorValidationStep = {
        validVendors,
        invalidVendors,
        needsUserAction: invalidVendors.length > 0
      };

      console.log(`✅ 유효한 거래처: ${validVendors.length}개`);
      console.log(`⚠️ 확인 필요한 거래처: ${invalidVendors.length}개`);

      return validationStep;

    } catch (error) {
      DebugLogger.logError('ExcelAutomationService.validateVendorsFromExcel', error);
      return {
        validVendors: [],
        invalidVendors: [],
        needsUserAction: true
      };
    }
  }

  /**
   * 3단계: 이메일 미리보기 생성
   */
  static async generateEmailPreview(
    filePath: string,
    vendorValidation: VendorValidationStep
  ): Promise<EmailPreviewStep> {
    DebugLogger.logFunctionEntry('ExcelAutomationService.generateEmailPreview', {
      filePath,
      validVendorCount: vendorValidation.validVendors.length
    });

    try {
      // 수신자 이메일 목록 (중복 제거)
      const recipients = Array.from(
        new Set(vendorValidation.validVendors.map(v => v.email))
      ).filter(email => email && email.trim());

      // processed 파일 생성 (Input 시트 제거)
      const timestamp = Date.now();
      const processedPath = path.join(
        path.dirname(filePath),
        `processed-${timestamp}.xlsx`
      );

      await removeAllInputSheets(filePath, processedPath);

      const stats = fs.statSync(processedPath);

      const emailPreview: EmailPreviewStep = {
        recipients,
        subject: `발주서 - ${path.basename(filePath, '.xlsx')} (${new Date().toLocaleDateString('ko-KR')})`,
        attachmentInfo: {
          originalFile: path.basename(filePath),
          processedFile: path.basename(processedPath),
          fileSize: stats.size
        },
        canProceed: recipients.length > 0 && !vendorValidation.needsUserAction
      };

      console.log(`📧 이메일 수신자: ${recipients.join(', ')}`);
      console.log(`📎 첨부파일: ${emailPreview.attachmentInfo.processedFile} (${Math.round(stats.size / 1024)}KB)`);

      return emailPreview;

    } catch (error) {
      DebugLogger.logError('ExcelAutomationService.generateEmailPreview', error);
      return {
        recipients: [],
        subject: '',
        attachmentInfo: {
          originalFile: '',
          processedFile: '',
          fileSize: 0
        },
        canProceed: false
      };
    }
  }

  /**
   * 4단계: 이메일 발송 실행
   */
  static async sendEmails(
    processedFilePath: string,
    recipients: string[],
    emailOptions: {
      subject?: string;
      orderNumber?: string;
      additionalMessage?: string;
      cc?: string[];
      bcc?: string[];
      additionalAttachments?: Array<{
        filename: string;
        originalName: string;
        path: string;
      }>;
    } = {}
  ): Promise<EmailSendResult> {
    DebugLogger.logFunctionEntry('ExcelAutomationService.sendEmails', {
      processedFilePath,
      recipients,
      emailOptions
    });

    try {
      const emailService = new POEmailService();
      const emailResults: EmailSendResult['emailResults'] = [];
      const failedEmails: EmailSendResult['failedEmails'] = [];

      for (const email of recipients) {
        try {
          console.log(`📧 이메일 발송 중: ${email}`);
          
          const sendResult = await emailService.sendPOWithOriginalFormat(
            processedFilePath,
            {
              to: email,
              cc: emailOptions.cc,
              bcc: emailOptions.bcc,
              subject: emailOptions.subject || `발주서 - ${new Date().toLocaleDateString('ko-KR')}`,
              orderNumber: emailOptions.orderNumber,
              additionalMessage: emailOptions.additionalMessage,
              additionalAttachments: emailOptions.additionalAttachments
            }
          );

          if (sendResult.success) {
            emailResults.push({
              email,
              status: 'sent',
              messageId: sendResult.messageId
            });
            
            // 이메일 발송 성공 시 DB 상태 업데이트 (orderNumber가 있는 경우)
            if (emailOptions.orderNumber) {
              await this.updateOrderEmailStatus(emailOptions.orderNumber, 'sent');
            }
          } else {
            throw new Error(sendResult.error || 'Email sending failed');
          }

          console.log(`✅ 이메일 발송 성공: ${email}`);

        } catch (emailError) {
          const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
          
          emailResults.push({
            email,
            status: 'failed',
            error: errorMessage
          });

          failedEmails.push({
            email,
            error: errorMessage
          });
          
          // 이메일 발송 실패 시 DB 상태 업데이트 (orderNumber가 있는 경우)
          if (emailOptions.orderNumber) {
            await this.updateOrderEmailStatus(emailOptions.orderNumber, 'failed', errorMessage);
          }

          console.error(`❌ 이메일 발송 실패: ${email} - ${errorMessage}`);
        }
      }

      const result: EmailSendResult = {
        success: failedEmails.length === 0,
        sentEmails: emailResults.filter(r => r.status === 'sent').length,
        failedEmails,
        emailResults
      };

      DebugLogger.logFunctionExit('ExcelAutomationService.sendEmails', result);
      return result;

    } catch (error) {
      DebugLogger.logError('ExcelAutomationService.sendEmails', error);
      return {
        success: false,
        sentEmails: 0,
        failedEmails: recipients.map(email => ({
          email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })),
        emailResults: []
      };
    }
  }

  /**
   * 거래처 선택 결과를 반영하여 이메일 미리보기 업데이트
   */
  static async updateEmailPreviewWithVendorSelection(
    filePath: string,
    selectedVendors: Array<{
      originalName: string;
      selectedVendorId: number;
      selectedVendorEmail: string;
      selectedVendorContactPerson?: string;
      selectedVendorPhone?: string;
    }>
  ): Promise<EmailPreviewStep> {
    DebugLogger.logFunctionEntry('ExcelAutomationService.updateEmailPreviewWithVendorSelection', {
      filePath,
      selectedVendors
    });

    try {
      // 선택된 거래처들의 이메일로 수신자 목록 업데이트
      const recipients = Array.from(
        new Set(selectedVendors.map(v => v.selectedVendorEmail))
      ).filter(email => email && email.trim());

      // processed 파일 생성
      const timestamp = Date.now();
      const processedPath = path.join(
        path.dirname(filePath),
        `processed-${timestamp}.xlsx`
      );

      await removeAllInputSheets(filePath, processedPath);
      const stats = fs.statSync(processedPath);

      return {
        recipients,
        subject: `발주서 - ${path.basename(filePath, '.xlsx')} (${new Date().toLocaleDateString('ko-KR')})`,
        attachmentInfo: {
          originalFile: path.basename(filePath),
          processedFile: path.basename(processedPath),
          fileSize: stats.size
        },
        canProceed: recipients.length > 0
      };

    } catch (error) {
      DebugLogger.logError('ExcelAutomationService.updateEmailPreviewWithVendorSelection', error);
      return {
        recipients: [],
        subject: '',
        attachmentInfo: {
          originalFile: '',
          processedFile: '',
          fileSize: 0
        },
        canProceed: false
      };
    }
  }
  
  /**
   * 발주서의 이메일 발송 상태 업데이트
   */
  private static async updateOrderEmailStatus(
    orderNumber: string,
    status: 'sent' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      // Mock DB 모드에서는 로그만 출력
      if (!process.env.DATABASE_URL) {
        console.log(`📧 이메일 상태 업데이트 (Mock): ${orderNumber} → ${status}`);
        return;
      }
      
      // 실제 DB 업데이트
      await db
        .update(purchaseOrders)
        .set({
          emailStatus: status,
          emailSentCount: sql`${purchaseOrders.emailSentCount} + 1`,
          sentAt: status === 'sent' ? new Date() : undefined,
          lastEmailError: status === 'failed' ? errorMessage : null,
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.orderNumber, orderNumber));
        
      console.log(`✅ 발주서 ${orderNumber} 이메일 상태 업데이트: ${status}`);
      
    } catch (error) {
      console.error(`❌ 이메일 상태 업데이트 실패 (${orderNumber}):`, error);
      // 상태 업데이트 실패는 전체 프로세스를 중단하지 않음
    }
  }
}