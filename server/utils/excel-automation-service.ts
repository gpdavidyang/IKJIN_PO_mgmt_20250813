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

export interface ExcelAutomationResult {
  success: boolean;
  data?: {
    savedOrders: number;
    vendorValidation: VendorValidationStep;
    emailPreview: EmailPreviewStep;
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
      // 1. Excel 파일 파싱
      const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
      
      if (!parseResult.success) {
        return {
          success: false,
          error: `Excel 파싱 실패: ${parseResult.error}`
        };
      }

      // 2. DB에 발주서 데이터 저장
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

      // 3. 거래처명 검증 및 이메일 추출
      const vendorValidation = await this.validateVendorsFromExcel(filePath);
      
      // 4. 이메일 미리보기 생성
      const emailPreview = await this.generateEmailPreview(filePath, vendorValidation);

      const result = {
        success: true,
        data: {
          savedOrders: saveResult.savedOrders,
          vendorValidation,
          emailPreview
        }
      };

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
      // Excel에서 거래처명 추출
      const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
      
      if (!parseResult.success || !parseResult.orders) {
        throw new Error('Excel 파싱 실패');
      }

      // 고유한 거래처명 및 납품처명 수집 - 모든 아이템의 정보 포함
      const allVendorNames = [];
      const allDeliveryNames = [];
      
      // 발주서 레벨의 거래처명 수집
      for (const order of parseResult.orders) {
        if (order.vendorName && order.vendorName.trim()) {
          allVendorNames.push(order.vendorName.trim());
        }
        
        // 각 아이템의 거래처명과 납품처명 수집
        for (const item of order.items) {
          if (item.vendorName && item.vendorName.trim()) {
            allVendorNames.push(item.vendorName.trim());
          }
          if (item.deliveryName && item.deliveryName.trim()) {
            allDeliveryNames.push(item.deliveryName.trim());
          }
        }
      }
      
      // 중복 제거하여 고유한 거래처명과 납품처명 추출
      const uniqueVendorNames = Array.from(new Set(allVendorNames));
      const uniqueDeliveryNames = Array.from(new Set(allDeliveryNames));

      console.log(`📋 검증할 거래처명 (${uniqueVendorNames.length}개): ${uniqueVendorNames.join(', ')}`);
      console.log(`📋 검증할 납품처명 (${uniqueDeliveryNames.length}개): ${uniqueDeliveryNames.join(', ')}`);
      
      // 모든 고유명칭을 하나의 배열로 합치고 거래처-납품처 매핑 생성
      const vendorDeliveryPairs = [];
      
      // 각 아이템별로 거래처-납품처 쌍 생성
      for (const order of parseResult.orders) {
        for (const item of order.items) {
          const vendorName = item.vendorName?.trim() || order.vendorName?.trim() || '';
          const deliveryName = item.deliveryName?.trim() || vendorName;
          
          if (vendorName) {
            vendorDeliveryPairs.push({
              vendorName,
              deliveryName
            });
          }
        }
      }
      
      // 중복 제거
      const uniquePairs = vendorDeliveryPairs.filter((pair, index, self) => 
        self.findIndex(p => p.vendorName === pair.vendorName && p.deliveryName === pair.deliveryName) === index
      );

      console.log(`📋 검증할 거래처-납품처 쌍 (${uniquePairs.length}개): ${uniquePairs.map(p => `${p.vendorName}→${p.deliveryName}`).join(', ')}`);

      // 거래처-납품처 쌍을 검증을 위한 데이터 구조로 변환
      const vendorData = uniquePairs.map(pair => ({
        vendorName: pair.vendorName,
        deliveryName: pair.deliveryName,
        email: undefined // 이메일은 별도로 추출하지 않음
      }));

      const validationResults = await validateMultipleVendors(vendorData);
      
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
        subject: `발주서 - ${path.basename(filePath, path.extname(filePath))} (${new Date().toLocaleDateString('ko-KR')})`,
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
              subject: emailOptions.subject || `발주서 - ${new Date().toLocaleDateString('ko-KR')}`,
              orderNumber: emailOptions.orderNumber,
              additionalMessage: emailOptions.additionalMessage
            }
          );

          if (sendResult.success) {
            emailResults.push({
              email,
              status: 'sent',
              messageId: sendResult.messageId
            });
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
        subject: `발주서 - ${path.basename(filePath, path.extname(filePath))} (${new Date().toLocaleDateString('ko-KR')})`,
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
}