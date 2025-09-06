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
// 통합 Excel PDF 서비스로 교체
import { UnifiedExcelPdfService } from '../services/unified-excel-pdf-service';
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
    processedPdfFile?: string;
    fileSize: number;
    pdfFileSize?: number;
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

    console.log(`🔍 [DEBUG] Excel 자동화 프로세스 시작 - 파일: ${filePath}`);

    try {
      // 0. 데이터베이스 연결 테스트
      console.log(`🔍 [DEBUG] 0단계: DB 연결 테스트 시작`);
      try {
        await db.select().from(purchaseOrders).limit(1);
        console.log(`✅ [DEBUG] DB 연결 성공`);
      } catch (dbError) {
        console.error(`❌ [DEBUG] DB 연결 실패:`, dbError);
        throw new Error(`데이터베이스 연결 실패: ${dbError instanceof Error ? dbError.message : 'Unknown DB error'}`);
      }
      // 1. Excel 파일 파싱
      console.log(`🔍 [DEBUG] 1단계: Excel 파일 파싱 시작`);
      const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
      console.log(`🔍 [DEBUG] 1단계 완료: ${parseResult.success ? '성공' : '실패'}`);
      
      if (!parseResult.success) {
        console.log(`❌ [DEBUG] Excel 파싱 실패: ${parseResult.error}`);
        return {
          success: false,
          error: `Excel 파싱 실패: ${parseResult.error}`
        };
      }

      console.log(`✅ [DEBUG] Excel 파싱 성공: ${parseResult.totalOrders}개 발주서, ${parseResult.totalItems}개 아이템`);

      // 2. DB에 발주서 데이터 저장
      console.log(`🔍 [DEBUG] 2단계: DB 저장 시작`);
      const saveResult = await POTemplateProcessorMock.saveToDatabase(
        parseResult.orders || [],
        userId
      );
      console.log(`🔍 [DEBUG] 2단계 완료: ${saveResult.success ? '성공' : '실패'}`);

      if (!saveResult.success) {
        console.log(`❌ [DEBUG] DB 저장 실패: ${saveResult.error}`);
        return {
          success: false,
          error: `DB 저장 실패: ${saveResult.error}`
        };
      }

      console.log(`✅ [DEBUG] DB 저장 성공: ${saveResult.savedOrders}개 발주서 저장됨`);

      // 3. 거래처명 검증 및 이메일 추출
      console.log(`🔍 [DEBUG] 3단계: 거래처 검증 시작`);
      const vendorValidation = await this.validateVendorsFromExcel(filePath);
      console.log(`🔍 [DEBUG] 3단계 완료: 유효 거래처 ${vendorValidation.validVendors.length}개, 무효 거래처 ${vendorValidation.invalidVendors.length}개`);
      
      // 4. 이메일 미리보기 생성
      console.log(`🔍 [DEBUG] 4단계: 이메일 미리보기 생성 시작`);
      const emailPreview = await this.generateEmailPreview(filePath, vendorValidation);
      console.log(`🔍 [DEBUG] 4단계 완료: 수신자 ${emailPreview.recipients.length}명`);

      // 발주번호로 발주서 ID들을 조회 (이메일에서 품목 정보를 포함하기 위해)
      const orderIds: number[] = [];
      if (saveResult.savedOrderNumbers && saveResult.savedOrderNumbers.length > 0) {
        try {
          const orders = await db.select({ id: purchaseOrders.id, orderNumber: purchaseOrders.orderNumber })
            .from(purchaseOrders)
            .where(eq(purchaseOrders.orderNumber, saveResult.savedOrderNumbers[0])); // 첫 번째 발주서 ID만 사용
          
          if (orders.length > 0) {
            orderIds.push(orders[0].id);
          }
        } catch (error) {
          console.warn('발주서 ID 조회 실패:', error);
        }
      }

      const result = {
        success: true,
        data: {
          savedOrders: saveResult.savedOrders,
          savedOrderNumbers: saveResult.savedOrderNumbers,
          orderIds, // 첫 번째 발주서 ID 추가
          vendorValidation,
          emailPreview
        }
      };

      console.log(`✅ [DEBUG] 전체 프로세스 성공 완료`);
      DebugLogger.logFunctionExit('ExcelAutomationService.processExcelUpload', result);
      return result;

    } catch (error) {
      console.log(`💥 [DEBUG] 전체 프로세스 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      // PDF 변환 (FR-014, FR-016 요구사항)
      const pdfPath = processedPath.replace(/\.(xlsx?)$/i, '.pdf');
      console.log(`📄 Excel을 PDF로 변환 시도 중: ${pdfPath}`);
      
      let pdfConversionSuccess = false;
      try {
        // 통합 PDF 서비스 사용 (모든 기존 변환기 통합, 자동 fallback)
        const result = await UnifiedExcelPdfService.convertExcelToPDF(processedPath, {
          outputPath: pdfPath,
          quality: 'high',
          orientation: 'landscape',
          excludeSheets: ['Input', 'Settings'],
          watermark: '발주서',
          retryCount: 2
        });

        if (result.success) {
          pdfConversionSuccess = true;
          const fileSize = result.stats ? Math.round(result.stats.fileSize / 1024) : 0;
          console.log(`✅ ${result.engineUsed} 엔진으로 PDF 변환 성공: ${pdfPath} (${fileSize}KB)`);
          if (result.warnings && result.warnings.length > 0) {
            console.warn(`⚠️ 경고: ${result.warnings.join(', ')}`);
          }
        } else {
          throw new Error(result.error || 'PDF 변환 실패');
        }
      } catch (pdfError) {
        console.error('⚠️ 통합 PDF 서비스 실패 - Excel 파일만 첨부됩니다:', pdfError);
        // PDF 변환 실패는 치명적이지 않으므로 계속 진행
        // Excel 파일만으로도 이메일 발송은 가능
      }

      const stats = fs.statSync(processedPath);
      const pdfStats = pdfConversionSuccess && fs.existsSync(pdfPath) ? fs.statSync(pdfPath) : null;

      const emailPreview: EmailPreviewStep = {
        recipients,
        subject: `발주서 - ${path.basename(filePath, path.extname(filePath))} (${new Date().toLocaleDateString('ko-KR')})`,
        attachmentInfo: {
          originalFile: path.basename(filePath),
          processedFile: path.basename(processedPath),
          processedPdfFile: pdfStats ? path.basename(pdfPath) : undefined,
          fileSize: stats.size,
          pdfFileSize: pdfStats ? pdfStats.size : undefined
        },
        canProceed: recipients.length > 0 && !vendorValidation.needsUserAction
      };

      console.log(`📧 이메일 수신자: ${recipients.join(', ')}`);
      console.log(`📎 첨부파일: ${emailPreview.attachmentInfo.processedFile} (${Math.round(stats.size / 1024)}KB)`);
      if (pdfStats) {
        console.log(`📄 PDF 파일: ${emailPreview.attachmentInfo.processedPdfFile} (${Math.round(pdfStats.size / 1024)}KB)`);
      }

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
   * 4단계: 이메일 발송 실행 (Excel과 PDF 첨부)
   */
  static async sendEmails(
    processedFilePath: string,
    recipients: string[],
    emailOptions: {
      subject?: string;
      orderNumber?: string;
      savedOrderNumbers?: string[];
      additionalMessage?: string;
      pdfFilePath?: string;
      orderId?: number;  // 발주서 ID 추가
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
          
          // orderId가 있으면 품목 정보를 포함한 이메일 발송, 없으면 기본 이메일 발송
          const sendResult = emailOptions.orderId
            ? await emailService.sendPOWithOrderItemsFromDB(
                processedFilePath,
                emailOptions.orderId,
                {
                  to: email,
                  subject: emailOptions.subject || `발주서 - ${new Date().toLocaleDateString('ko-KR')}`,
                  orderNumber: emailOptions.orderNumber,
                  additionalMessage: emailOptions.additionalMessage
                }
              )
            : await emailService.sendPOWithOriginalFormat(
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

      // 이메일 발송 성공 시 발주서 상태를 'sent'로 업데이트
      if (result.success && result.sentEmails > 0) {
        const orderNumbersToUpdate = emailOptions.savedOrderNumbers || 
          (emailOptions.orderNumber ? [emailOptions.orderNumber] : []);
        
        console.log(`🔄 [Excel자동화] 발주서 상태 업데이트 시도:`, {
          resultSuccess: result.success,
          sentEmails: result.sentEmails,
          savedOrderNumbers: emailOptions.savedOrderNumbers?.length || 0,
          singleOrderNumber: emailOptions.orderNumber || 'none',
          orderNumbersToUpdate: orderNumbersToUpdate.length
        });
        
        if (orderNumbersToUpdate.length > 0) {
          try {
            await this.updateMultipleOrderStatusToSent(orderNumbersToUpdate);
            console.log(`✅ [Excel자동화] 발주서 상태 업데이트 완료: ${orderNumbersToUpdate.length}개 발주서 → sent`);
            console.log(`📋 업데이트된 발주번호들:`, orderNumbersToUpdate);
          } catch (updateError) {
            console.error(`❌ [Excel자동화] 발주서 상태 업데이트 실패:`, updateError);
            // 상태 업데이트 실패는 이메일 발송 성공에 영향을 주지 않음
          }
        } else {
          console.log(`⚠️ [Excel자동화] 업데이트할 발주번호가 없음`);
        }
      } else {
        console.log(`⚠️ [Excel자동화] 발주서 상태 업데이트 조건 미충족:`, {
          resultSuccess: result.success,
          sentEmails: result.sentEmails
        });
      }

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
   * 발주서 상태를 'sent'로 업데이트하는 헬퍼 메소드
   */
  private static async updateOrderStatusToSent(orderNumber: string): Promise<void> {
    const { db } = await import('../db');
    const { purchaseOrders } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    await db.update(purchaseOrders)
      .set({
        orderStatus: 'sent',
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.orderNumber, orderNumber));
  }

  /**
   * 여러 발주서의 상태를 'sent'로 업데이트하는 헬퍼 메소드
   */
  private static async updateMultipleOrderStatusToSent(orderNumbers: string[]): Promise<void> {
    const { db } = await import('../db');
    const { purchaseOrders } = await import('@shared/schema');
    const { inArray } = await import('drizzle-orm');

    await db.update(purchaseOrders)
      .set({
        orderStatus: 'sent',
        updatedAt: new Date()
      })
      .where(inArray(purchaseOrders.orderNumber, orderNumbers));
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
      
      // PDF 변환 (FR-014, FR-016 요구사항)
      const pdfPath = processedPath.replace(/\.(xlsx?)$/i, '.pdf');
      console.log(`📄 Excel을 PDF로 변환 시도 중: ${pdfPath}`);
      
      let pdfConversionSuccess = false;
      try {
        // 통합 PDF 서비스 사용 (모든 기존 변환기 통합, 자동 fallback)
        const result = await UnifiedExcelPdfService.convertExcelToPDF(processedPath, {
          outputPath: pdfPath,
          quality: 'high',
          orientation: 'landscape',
          excludeSheets: ['Input', 'Settings'],
          watermark: '발주서',
          retryCount: 2
        });

        if (result.success) {
          pdfConversionSuccess = true;
          const fileSize = result.stats ? Math.round(result.stats.fileSize / 1024) : 0;
          console.log(`✅ ${result.engineUsed} 엔진으로 PDF 변환 성공: ${pdfPath} (${fileSize}KB)`);
          if (result.warnings && result.warnings.length > 0) {
            console.warn(`⚠️ 경고: ${result.warnings.join(', ')}`);
          }
        } else {
          throw new Error(result.error || 'PDF 변환 실패');
        }
      } catch (pdfError) {
        console.error('⚠️ 통합 PDF 서비스 실패 - Excel 파일만 첨부됩니다:', pdfError);
        // PDF 변환 실패는 치명적이지 않으므로 계속 진행
      }

      const stats = fs.statSync(processedPath);
      const pdfStats = pdfConversionSuccess && fs.existsSync(pdfPath) ? fs.statSync(pdfPath) : null;

      return {
        recipients,
        subject: `발주서 - ${path.basename(filePath, path.extname(filePath))} (${new Date().toLocaleDateString('ko-KR')})`,
        attachmentInfo: {
          originalFile: path.basename(filePath),
          processedFile: path.basename(processedPath),
          processedPdfFile: pdfStats ? path.basename(pdfPath) : undefined,
          fileSize: stats.size,
          pdfFileSize: pdfStats ? pdfStats.size : undefined
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