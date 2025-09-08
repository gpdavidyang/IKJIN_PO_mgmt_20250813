import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getUploadsDir, ensureUploadDir } from './upload-paths';

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 통합 Excel PDF 서비스로 교체
import { UnifiedExcelPdfService } from '../services/unified-excel-pdf-service';
import { POTemplateProcessor } from './po-template-processor';
import { removeAllInputSheets } from './excel-input-sheet-remover';
import * as database from '../db';
import { purchaseOrderItems, emailSendHistory } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Vercel 환경에서도 잘 보이는 로깅 함수
const debugLog = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${message}`;
  
  if (data) {
    // JSON 형태로 출력하여 Vercel 로그에서 가독성 향상
    console.log(prefix, JSON.stringify(data, null, 2));
  } else {
    console.log(prefix);
  }
  
  // Vercel 환경에서 추가적으로 console.error도 사용하여 더 잘 보이도록
  if (process.env.VERCEL) {
    if (message.includes('DEBUG') || message.includes('ERROR')) {
      console.error(prefix, data ? JSON.stringify(data, null, 2) : '');
    }
  }
};

export interface EmailAttachment {
  filename: string;
  path?: string;        // Made optional since we can use content instead
  content?: Buffer;     // Added for in-memory attachments
  contentType?: string;
}

export interface OrderItemSummary {
  itemName?: string;
  specification?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  remarks?: string;
}

export interface POEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  orderNumber?: string;
  vendorName?: string;
  orderDate?: string;
  dueDate?: string;
  totalAmount?: number;
  additionalMessage?: string;
  orderItems?: OrderItemSummary[];
  specialRequirements?: string;
  additionalAttachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export class POEmailService {
  private transporter: nodemailer.Transporter;
  private db = database.db;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.naver.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  /**
   * 발주서 ID로 품목 정보 조회
   */
  async getOrderItemsByOrderId(orderId: number): Promise<OrderItemSummary[]> {
    try {
      const items = await this.db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.orderId, orderId));

      return items.map(item => ({
        itemName: item.itemName || undefined,
        specification: item.specification || undefined,
        unit: item.unit || undefined,
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        totalAmount: item.totalAmount || 0,
        remarks: item.remarks || undefined
      }));
    } catch (error) {
      console.error('품목 정보 조회 실패:', error);
      return [];
    }
  }

  /**
   * 발주서 정보와 품목을 포함한 상세 이메일 발송 (원본 형식 유지)
   */
  async sendPOWithOrderItemsFromDB(
    originalFilePath: string,
    orderId: number,
    emailOptions: Omit<POEmailOptions, 'orderItems'>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // 데이터베이스에서 품목 정보 조회
      const orderItems = await this.getOrderItemsByOrderId(orderId);
      
      // 옵션에 품목 정보 추가
      const enhancedOptions: POEmailOptions = {
        ...emailOptions,
        orderItems
      };

      // 기존 원본 형식 유지 발송 메서드 호출
      return await this.sendPOWithOriginalFormat(originalFilePath, enhancedOptions);
    } catch (error) {
      console.error('❌ 발주서 상세 정보 이메일 발송 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Input 시트만 제거한 원본 형식 유지 엑셀과 PDF로 첨부하여 이메일 발송
   * 기존 방식과 달리 엑셀 파일의 원본 형식(테두리, 병합, 색상 등)을 그대로 유지
   */
  async sendPOWithOriginalFormat(
    originalFilePath: string,
    emailOptions: POEmailOptions,
    orderInfo?: { orderId?: number; senderUserId?: string; skipPdfGeneration?: boolean }
  ): Promise<{ success: boolean; messageId?: string; error?: string; pdfGenerationWarning?: string }> {
    try {
      const timestamp = Date.now();
      const uploadsDir = getUploadsDir();
      ensureUploadDir(uploadsDir);
      const skipPdfGeneration = orderInfo?.skipPdfGeneration || false;
      
      // 파일이 실제 Excel 파일인지 확인 (안전하게 처리)
      let isExcelFile = false;
      let fileExists = false;
      
      try {
        isExcelFile = originalFilePath && (originalFilePath.toLowerCase().endsWith('.xlsx') || originalFilePath.toLowerCase().endsWith('.xls'));
        fileExists = originalFilePath && fs.existsSync(originalFilePath);
      } catch (error) {
        console.warn('⚠️ 파일 확인 중 오류:', error);
        isExcelFile = false;
        fileExists = false;
      }
      
      console.log(`🔍 파일 검증: ${originalFilePath}`);
      console.log(`📁 파일 존재: ${fileExists}`);
      console.log(`📊 Excel 파일: ${isExcelFile}`);
      
      let processedPath = originalFilePath;
      let attachments: EmailAttachment[] = [];
      let pdfPath = '';
      let pdfResult: { success: boolean; pdfPath?: string; error?: string } = { success: false, error: '' };
      
      if (fileExists && isExcelFile) {
        // 1. Excel 파일인 경우: Input 시트 제거 처리
        processedPath = path.join(uploadsDir, `po-advanced-format-${timestamp}.xlsx`);
        const removeResult = await removeAllInputSheets(
          originalFilePath,
          processedPath
        );

        if (!removeResult.success) {
          console.warn(`⚠️ Input 시트 제거 실패, 원본 파일 사용: ${removeResult.error}`);
          processedPath = originalFilePath; // 실패 시 원본 사용
        } else {
          console.log(`📄 고급 형식 보존 파일 생성: ${processedPath}`);
          console.log(`🎯 Input 시트 제거 완료`);
          console.log(`📋 남은 시트: ${removeResult.remainingSheets.join(', ')}`);
        }

        // 2. Excel 파일인 경우: PDF 변환 시도 (skipPdfGeneration이 false인 경우에만)
        if (!skipPdfGeneration) {
          pdfPath = path.join(uploadsDir, `po-advanced-format-${timestamp}.pdf`);
        
          try {
            // 통합 PDF 서비스 사용 (모든 기존 변환기 통합, 자동 fallback)
            const result = await UnifiedExcelPdfService.convertExcelToPDF(processedPath, {
            outputPath: pdfPath,
            quality: 'high',
            orientation: 'landscape',
            excludeSheets: ['Input', 'Settings'],
            watermark: `발주서 - ${emailOptions.orderNumber || ''}`,
            retryCount: 2
          });

          if (result.success) {
            // PDF 파일이 실제로 생성되었고 유효한 크기인지 확인
            if (fs.existsSync(pdfPath)) {
              const stats = fs.statSync(pdfPath);
              const fileSize = Math.round(stats.size / 1024);
              
              if (stats.size > 1024) { // 1KB 이상만 유효하다고 판단
                pdfResult.success = true;
                pdfResult.pdfPath = pdfPath;
                console.log(`✅ ${result.engineUsed} 엔진으로 PDF 변환 성공: ${pdfPath} (${fileSize}KB)`);
                if (result.warnings && result.warnings.length > 0) {
                  console.warn(`⚠️ 경고: ${result.warnings.join(', ')}`);
                }
              } else {
                pdfResult.error = `PDF 파일이 너무 작음 (${fileSize}KB)`;
                console.warn(`⚠️ PDF 변환 결과가 유효하지 않음: ${pdfResult.error}`);
                // 유효하지 않은 PDF 파일 삭제
                try {
                  fs.unlinkSync(pdfPath);
                  console.log(`🗑️ 유효하지 않은 PDF 파일 삭제: ${pdfPath}`);
                } catch (cleanupError) {
                  console.warn(`⚠️ PDF 파일 삭제 실패: ${cleanupError}`);
                }
              }
            } else {
              pdfResult.error = 'PDF 파일이 생성되지 않음';
              console.warn(`⚠️ PDF 변환 완료되었으나 파일이 존재하지 않음: ${pdfPath}`);
            }
          } else {
            pdfResult.error = result.error || '통합 PDF 서비스 변환 실패';
            console.warn(`⚠️ PDF 변환 실패: ${pdfResult.error}, Excel 파일만 첨부합니다.`);
          }
          } catch (error) {
            pdfResult.error = `통합 PDF 서비스 오류: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.warn(`⚠️ PDF 변환 완전 실패: ${pdfResult.error}, Excel 파일만 첨부합니다.`);
          }
        } else {
          console.log('📋 PDF 생성 건너뛰기 플래그가 설정되어 있어 PDF 변환을 생략합니다.');
        }
      }

      // 3. 첨부파일 준비
      if (fileExists && isExcelFile) {
        // Excel 파일 첨부 (원본 형식 유지)
        if (fs.existsSync(processedPath)) {
          const stats = fs.statSync(processedPath);
          if (stats.size > 0) {
            attachments.push({
              filename: `발주서_${emailOptions.orderNumber || timestamp}.xlsx`,
              path: processedPath,
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            console.log(`📎 Excel 첨부파일 추가: 발주서_${emailOptions.orderNumber || timestamp}.xlsx (${Math.round(stats.size / 1024)}KB)`);
          } else {
            console.warn(`⚠️ Excel 파일이 비어있음: ${processedPath}`);
          }
        } else {
          console.warn(`⚠️ 처리된 Excel 파일이 존재하지 않음: ${processedPath}`);
        }

        // PDF 파일 첨부 (변환 성공하고 유효한 파일인 경우에만)
        if (!skipPdfGeneration && pdfResult.success && fs.existsSync(pdfPath)) {
          // PDF 파일 크기 검증 (0KB 파일 방지)
          const pdfStats = fs.statSync(pdfPath);
          const pdfSizeKB = Math.round(pdfStats.size / 1024);
          
          if (pdfStats.size > 1024) { // 최소 1KB 이상만 첨부
            attachments.push({
              filename: `발주서_${emailOptions.orderNumber || timestamp}.pdf`,
              path: pdfPath,
              contentType: 'application/pdf'
            });
            console.log(`📎 PDF 첨부파일 추가: 발주서_${emailOptions.orderNumber || timestamp}.pdf (${pdfSizeKB}KB)`);
          } else {
            console.warn(`⚠️ PDF 파일이 너무 작음 (${pdfSizeKB}KB), 첨부하지 않음: ${pdfPath}`);
            // 0KB 또는 너무 작은 PDF 파일 삭제
            try {
              fs.unlinkSync(pdfPath);
              console.log(`🗑️ 유효하지 않은 PDF 파일 삭제: ${pdfPath}`);
            } catch (cleanupError) {
              console.warn(`⚠️ PDF 파일 삭제 실패: ${cleanupError}`);
            }
          }
        } else if (skipPdfGeneration) {
          console.log(`📋 PDF 첨부 건너뜀 (skipPdfGeneration=true)`);
        } else if (!pdfResult.success) {
          console.log(`📋 PDF 변환 실패로 인해 PDF 첨부 건너뜀: ${pdfResult.error}`);
        }
      } else if (fileExists) {
        // Excel이 아닌 파일이지만 존재하는 경우 (텍스트 파일 등)
        const fileExt = path.extname(originalFilePath) || '.txt';
        const baseName = `발주서_${emailOptions.orderNumber || timestamp}`;
        attachments.push({
          filename: `${baseName}${fileExt}`,
          path: originalFilePath,
          contentType: fileExt === '.txt' ? 'text/plain' : 'application/octet-stream'
        });
        console.log(`📎 텍스트/기타 첨부파일 추가: ${baseName}${fileExt}`);
      }

      // 추가 첨부파일 처리 (selectedAttachmentIds로부터 전달받은 파일들)
      if (emailOptions.additionalAttachments && emailOptions.additionalAttachments.length > 0) {
        console.log(`📎 추가 첨부파일 ${emailOptions.additionalAttachments.length}개 처리 시작`);
        for (const additionalAttachment of emailOptions.additionalAttachments) {
          attachments.push({
            filename: additionalAttachment.filename,
            content: additionalAttachment.content,
            contentType: additionalAttachment.contentType
          });
          console.log(`📎 추가 첨부파일 추가: ${additionalAttachment.filename} (${additionalAttachment.content.length} bytes)`);
        }
      }

      if (attachments.length === 0) {
        return {
          success: false,
          error: '첨부할 파일이 생성되지 않았습니다.'
        };
      }

      // 4. 이메일 내용 생성
      const emailContent = this.generateEmailContent(emailOptions);

      // 5. 이메일 발송
      const result = await this.sendEmail({
        to: emailOptions.to,
        cc: emailOptions.cc,
        bcc: emailOptions.bcc,
        subject: emailOptions.subject || `발주서 전송 - ${emailOptions.orderNumber || ''}`,
        html: emailContent,
        attachments
      }, {
        ...orderInfo,
        orderNumber: emailOptions.orderNumber
      });

      // 6. 임시 파일 정리
      const filesToCleanup = [processedPath, pdfPath].filter(Boolean);
      if (filesToCleanup.length > 0) {
        this.cleanupTempFiles(filesToCleanup);
      }

      if (result.success) {
        console.log(`✅ 원본 형식 유지 이메일 발송 성공: ${emailOptions.to}`);
      }

      return result;

    } catch (error) {
      console.error('❌ 원본 형식 유지 이메일 발송 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 직접 첨부파일을 포함하여 이메일 발송 (사용자 메시지 우선 사용)
   * 새로운 Vercel 최적화 메소드
   */
  async sendEmailWithDirectAttachments(
    emailOptions: POEmailOptions,
    orderInfo?: { orderId?: number; senderUserId?: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      debugLog('📧 [EMAIL SERVICE DEBUG] 직접 첨부파일 이메일 발송 시작', {
        to: emailOptions.to,
        subject: emailOptions.subject,
        hasMessage: !!emailOptions.additionalMessage,
        messageLength: emailOptions.additionalMessage?.length || 0,
        attachmentCount: emailOptions.additionalAttachments?.length || 0
      });
      
      // 첨부파일 상세 로깅
      if (emailOptions.additionalAttachments && emailOptions.additionalAttachments.length > 0) {
        const attachmentDetails = emailOptions.additionalAttachments.map((att, index) => ({
          index,
          filename: att.filename,
          contentType: att.contentType,
          contentSize: att.content ? att.content.length : 0,
          isExcel: att.filename?.toLowerCase().includes('xlsx') || att.filename?.toLowerCase().includes('xls')
        }));
        
        debugLog('📎 [EMAIL SERVICE DEBUG] 받은 첨부파일 상세 분석', attachmentDetails);
      } else {
        debugLog('⚠️ [EMAIL SERVICE DEBUG] 첨부파일이 없음!');
      }

      // 이메일 본문 생성 (사용자 메시지 우선)
      let htmlContent = '';
      
      if (emailOptions.additionalMessage && emailOptions.additionalMessage.trim()) {
        // 사용자가 메시지를 작성한 경우: 사용자 메시지를 기본으로 사용
        console.log('📝 사용자 메시지 우선 사용');
        
        htmlContent = `
          <!DOCTYPE html>
          <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>발주서 전송</title>
            <style>
              body { 
                font-family: "Malgun Gothic", "맑은 고딕", Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px; 
              }
              .message-content { 
                background-color: #f9f9f9; 
                padding: 20px; 
                border-radius: 5px; 
                margin: 20px 0;
                white-space: pre-wrap; 
                word-wrap: break-word;
              }
              .order-info {
                background-color: #e7f3ff;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="message-content">
              ${emailOptions.additionalMessage.replace(/\n/g, '<br>')}
            </div>
            
            ${emailOptions.orderNumber ? `
              <div class="order-info">
                <h3>📋 발주 정보</h3>
                <ul>
                  ${emailOptions.orderNumber ? `<li><strong>발주번호:</strong> ${emailOptions.orderNumber}</li>` : ''}
                  ${emailOptions.vendorName ? `<li><strong>거래처:</strong> ${emailOptions.vendorName}</li>` : ''}
                  ${emailOptions.orderDate ? `<li><strong>발주일자:</strong> ${emailOptions.orderDate}</li>` : ''}
                  ${emailOptions.totalAmount ? `<li><strong>발주금액:</strong> ${emailOptions.totalAmount.toLocaleString()}원</li>` : ''}
                </ul>
              </div>
            ` : ''}
            
            <div class="footer">
              <p>
                이 메일은 구매 발주 관리 시스템에서 발송되었습니다.<br>
                발송 시간: ${new Date().toLocaleString('ko-KR')}
              </p>
            </div>
          </body>
          </html>
        `;
      } else {
        // 사용자 메시지가 없는 경우: 기본 템플릿 사용
        console.log('📧 기본 템플릿 사용');
        htmlContent = this.generateEmailContent(emailOptions);
      }

      // 메일 옵션 설정
      const mailOptions: any = {
        from: process.env.SMTP_USER,
        to: Array.isArray(emailOptions.to) ? emailOptions.to.join(', ') : emailOptions.to,
        subject: emailOptions.subject,
        html: htmlContent
      };

      // CC 설정
      if (emailOptions.cc && emailOptions.cc.length > 0) {
        mailOptions.cc = Array.isArray(emailOptions.cc) ? emailOptions.cc.join(', ') : emailOptions.cc;
      }

      // BCC 설정
      if (emailOptions.bcc && emailOptions.bcc.length > 0) {
        mailOptions.bcc = Array.isArray(emailOptions.bcc) ? emailOptions.bcc.join(', ') : emailOptions.bcc;
      }

      // 첨부파일 설정
      if (emailOptions.additionalAttachments && emailOptions.additionalAttachments.length > 0) {
        mailOptions.attachments = emailOptions.additionalAttachments.map((att, index) => {
          const attachment = {
            filename: att.filename,
            content: att.content,
            contentType: att.contentType
          };
          
          console.log(`📎 [EMAIL SERVICE DEBUG] nodemailer 첨부파일 [${index}] 준비:`, {
            filename: attachment.filename,
            contentType: attachment.contentType,
            contentSize: attachment.content ? attachment.content.length : 0,
            isBuffer: Buffer.isBuffer(attachment.content),
            firstBytes: attachment.content ? Array.from(attachment.content.subarray(0, 10)).join(',') : 'N/A'
          });
          
          return attachment;
        });
        
        debugLog('📎 [EMAIL SERVICE DEBUG] nodemailer 첨부파일 배열 최종 상태', {
          총개수: mailOptions.attachments.length,
          파일목록: mailOptions.attachments.map(att => att.filename).join(', '),
          Excel파일개수: mailOptions.attachments.filter(att => 
            att.filename?.toLowerCase().includes('xlsx') || att.filename?.toLowerCase().includes('xls')
          ).length
        });
      } else {
        debugLog('⚠️ [EMAIL SERVICE DEBUG] nodemailer에 전달할 첨부파일이 없음!');
      }

      console.log('📧 [EMAIL SERVICE DEBUG] nodemailer 최종 메일 옵션:', {
        from: mailOptions.from,
        to: mailOptions.to,
        cc: mailOptions.cc,
        subject: mailOptions.subject,
        attachmentCount: mailOptions.attachments?.length || 0,
        hasAttachments: !!(mailOptions.attachments && mailOptions.attachments.length > 0)
      });

      // 이메일 발송 직전 최종 확인
      debugLog('🚀 [EMAIL SERVICE DEBUG] nodemailer.sendMail 호출 직전');
      if (mailOptions.attachments && mailOptions.attachments.length > 0) {
        debugLog('📎 [EMAIL SERVICE DEBUG] 실제 전송될 첨부파일', 
          mailOptions.attachments.map(att => ({
            filename: att.filename,
            size: att.content?.length || 0
          }))
        );
      }

      // 이메일 발송
      debugLog('📨 [EMAIL SERVICE DEBUG] nodemailer.sendMail 실행 중...');
      const info = await this.transporter.sendMail(mailOptions);
      debugLog('✅ [EMAIL SERVICE DEBUG] nodemailer.sendMail 성공', {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response
      });

      // 이메일 발송 기록 저장
      if (orderInfo?.orderId) {
        try {
          await this.recordEmailSendHistory({
            orderId: orderInfo.orderId,
            senderUserId: orderInfo.senderUserId,
            recipients: Array.isArray(emailOptions.to) ? emailOptions.to : [emailOptions.to],
            subject: emailOptions.subject,
            messageId: info.messageId,
            attachmentCount: emailOptions.additionalAttachments?.length || 0,
            status: 'success'
          });
        } catch (historyError) {
          console.error('이메일 기록 저장 실패:', historyError);
          // 기록 저장 실패는 이메일 발송 성공에 영향을 주지 않음
        }
      }

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData = {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        emailOptions: {
          to: emailOptions.to,
          subject: emailOptions.subject,
          attachmentCount: emailOptions.additionalAttachments?.length || 0
        }
      };
      
      debugLog('❌ [EMAIL SERVICE ERROR] 직접 첨부파일 이메일 발송 오류', errorData);
      
      // 이메일 발송 실패 기록
      if (orderInfo?.orderId) {
        try {
          await this.recordEmailSendHistory({
            orderId: orderInfo.orderId,
            senderUserId: orderInfo.senderUserId,
            recipients: Array.isArray(emailOptions.to) ? emailOptions.to : [emailOptions.to],
            subject: emailOptions.subject,
            attachmentCount: emailOptions.additionalAttachments?.length || 0,
            status: 'failed',
            errorMessage: errorMessage
          });
        } catch (historyError) {
          debugLog('❌ [EMAIL SERVICE ERROR] 이메일 실패 기록 저장 실패', historyError);
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * [기존 방식] 갑지/을지 시트를 Excel과 PDF로 첨부하여 이메일 발송
   * @deprecated 형식 손상 문제로 sendPOWithOriginalFormat 사용 권장
   */
  async sendPOWithAttachments(
    originalFilePath: string,
    emailOptions: POEmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const timestamp = Date.now();
      const uploadsDir = getUploadsDir();
      ensureUploadDir(uploadsDir);
      
      // 1. 갑지/을지 시트 추출
      const extractedPath = path.join(uploadsDir, `po-sheets-${timestamp}.xlsx`);
      const extractResult = POTemplateProcessor.extractSheetsToFile(
        originalFilePath,
        extractedPath,
        ['갑지', '을지']
      );

      const extractResultData = await extractResult;
      if (!extractResultData.success) {
        return {
          success: false,
          error: `시트 추출 실패: ${extractResultData.error}`
        };
      }

      // 2. PDF 변환
      const pdfPath = path.join(uploadsDir, `po-sheets-${timestamp}.pdf`);
      const pdfResult = await UnifiedExcelPdfService.convertExcelToPDF(extractedPath, {
        outputPath: pdfPath,
        quality: 'high',
        orientation: 'landscape',
        excludeSheets: ['Input', 'Settings'],
        watermark: `발주서 - ${emailOptions.orderNumber || ''}`,
        retryCount: 2
      });

      if (!pdfResult.success) {
        return {
          success: false,
          error: `PDF 변환 실패: ${pdfResult.error}`
        };
      }

      // 3. 첨부파일 준비
      const attachments: EmailAttachment[] = [];
      
      // Excel 파일 첨부
      if (fs.existsSync(extractedPath)) {
        attachments.push({
          filename: `발주서_${emailOptions.orderNumber || timestamp}.xlsx`,
          path: extractedPath,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
      }

      // PDF 파일 첨부
      if (fs.existsSync(pdfPath)) {
        attachments.push({
          filename: `발주서_${emailOptions.orderNumber || timestamp}.pdf`,
          path: pdfPath,
          contentType: 'application/pdf'
        });
      }

      // 4. 이메일 내용 생성
      const emailContent = this.generateEmailContent(emailOptions);

      // 5. 이메일 발송
      const result = await this.sendEmail({
        to: emailOptions.to,
        cc: emailOptions.cc,
        bcc: emailOptions.bcc,
        subject: emailOptions.subject,
        html: emailContent,
        attachments
      });

      // 6. 임시 파일 정리
      this.cleanupTempFiles([extractedPath, pdfPath]);

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 기본 이메일 발송
   */
  async sendEmail(options: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: EmailAttachment[];
  }, orderInfo?: { orderId?: number; senderUserId?: string; orderNumber?: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('🔍 POEmailService.sendEmail 호출됨:', {
        to: options.to,
        cc: options.cc,
        subject: options.subject,
        attachmentsCount: options.attachments?.length || 0,
        smtpConfig: {
          host: process.env.SMTP_HOST || 'smtp.naver.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          user: process.env.SMTP_USER
        }
      });

      const info = await this.transporter.sendMail({
        from: `"발주 시스템" <${process.env.SMTP_USER}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments?.map(att => {
          const attachment: any = {
            filename: att.filename,
            contentType: att.contentType
          };
          
          // Handle both path-based and content-based attachments
          if ('path' in att && att.path) {
            attachment.path = att.path;
          } else if ('content' in att && att.content) {
            attachment.content = att.content;
          }
          
          return attachment;
        })
      });

      console.log('✅ POEmailService.sendEmail 성공:', info.messageId);
      
      // 이메일 발송 이력 저장
      console.log('📧 이메일 발송 이력 저장 시도:', {
        hasOrderInfo: !!orderInfo,
        orderId: orderInfo?.orderId,
        senderUserId: orderInfo?.senderUserId,
        orderNumber: orderInfo?.orderNumber
      });
      
      if (orderInfo?.orderId && orderInfo?.senderUserId) {
        try {
          const toArray = Array.isArray(options.to) ? options.to : [options.to];
          const ccArray = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : [];
          const bccArray = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : [];
          
          const attachmentFiles = options.attachments?.map(att => ({
            filename: att.filename,
            path: att.path,
            contentType: att.contentType || 'application/octet-stream',
            size: att.path ? (fs.existsSync(att.path) ? fs.statSync(att.path).size : 0) : 0
          })) || [];

          console.log('📧 이메일 히스토리 데이터 준비:', {
            orderId: orderInfo.orderId,
            orderNumber: orderInfo.orderNumber,
            senderUserId: orderInfo.senderUserId,
            recipientsCount: toArray.length,
            ccCount: ccArray.length,
            attachmentsCount: attachmentFiles.length,
            messageContentLength: (options.html || options.text || '').length
          });

          const historyRecord = await this.db.insert(emailSendHistory).values({
            orderId: orderInfo.orderId,
            orderNumber: orderInfo.orderNumber || null,
            senderUserId: orderInfo.senderUserId,
            recipients: toArray,
            cc: ccArray.length > 0 ? ccArray : null,
            bcc: bccArray.length > 0 ? bccArray : null,
            subject: options.subject,
            messageContent: options.html || options.text || '',
            attachmentFiles: attachmentFiles.length > 0 ? attachmentFiles : null,
            status: 'sent',
            sentCount: 1,
            failedCount: 0,
            sentAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning({ id: emailSendHistory.id });
          
          console.log('✅ 이메일 발송 이력 저장 성공, 생성된 ID:', historyRecord[0]?.id);
        } catch (historyError) {
          console.error('⚠️ 이메일 발송 이력 저장 실패:', historyError);
          console.error('⚠️ 실패한 데이터:', {
            orderId: orderInfo.orderId,
            orderNumber: orderInfo.orderNumber,
            senderUserId: orderInfo.senderUserId,
            errorDetails: historyError instanceof Error ? historyError.message : 'Unknown error'
          });
          // 이력 저장 실패는 이메일 발송 성공에 영향을 주지 않음
        }
      } else {
        console.warn('⚠️ 이메일 발송 이력 저장 건너뜀 - 필수 파라미터 누락:', {
          hasOrderInfo: !!orderInfo,
          orderId: orderInfo?.orderId,
          senderUserId: orderInfo?.senderUserId
        });
      }
      
      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('❌ POEmailService.sendEmail 실패:', error);
      
      // 이메일 발송 실패 이력 저장
      console.log('📧 이메일 발송 실패 이력 저장 시도:', {
        hasOrderInfo: !!orderInfo,
        orderId: orderInfo?.orderId,
        senderUserId: orderInfo?.senderUserId,
        orderNumber: orderInfo?.orderNumber
      });
      
      if (orderInfo?.orderId && orderInfo?.senderUserId) {
        try {
          const toArray = Array.isArray(options.to) ? options.to : [options.to];
          const ccArray = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : [];
          const bccArray = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : [];

          const failureRecord = await this.db.insert(emailSendHistory).values({
            orderId: orderInfo.orderId,
            orderNumber: orderInfo.orderNumber || null,
            senderUserId: orderInfo.senderUserId,
            recipients: toArray,
            cc: ccArray.length > 0 ? ccArray : null,
            bcc: bccArray.length > 0 ? bccArray : null,
            subject: options.subject,
            messageContent: options.html || options.text || '',
            attachmentFiles: null,
            status: 'failed',
            sentCount: 0,
            failedCount: 1,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            sentAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning({ id: emailSendHistory.id });
          
          console.log('✅ 이메일 발송 실패 이력 저장 성공, 생성된 ID:', failureRecord[0]?.id);
        } catch (historyError) {
          console.error('⚠️ 이메일 발송 실패 이력 저장 실패:', historyError);
          console.error('⚠️ 실패한 데이터:', {
            orderId: orderInfo?.orderId,
            orderNumber: orderInfo?.orderNumber,
            senderUserId: orderInfo?.senderUserId,
            errorDetails: historyError instanceof Error ? historyError.message : 'Unknown error'
          });
        }
      } else {
        console.warn('⚠️ 이메일 발송 실패 이력 저장 건너뜀 - 필수 파라미터 누락:', {
          hasOrderInfo: !!orderInfo,
          orderId: orderInfo?.orderId,
          senderUserId: orderInfo?.senderUserId
        });
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 이메일 내용 생성
   */
  private generateEmailContent(options: POEmailOptions): string {
    console.log('📧 이메일 콘텐츠 생성:', {
      orderNumber: options.orderNumber,
      vendorName: options.vendorName,
      hasAdditionalMessage: !!options.additionalMessage,
      additionalMessageLength: options.additionalMessage ? options.additionalMessage.length : 0,
      additionalMessagePreview: options.additionalMessage ? options.additionalMessage.substring(0, 100) : null
    });
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
      }).format(amount);
    };

    const formatNumber = (num: number) => {
      return new Intl.NumberFormat('ko-KR').format(num);
    };

    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        return dateString;
      }
    };

    const generateOrderItemsTable = (items: OrderItemSummary[]) => {
      if (!items || items.length === 0) return '';

      const itemRows = items.map((item, index) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.itemName || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.specification || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.unit || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatNumber(item.quantity)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${formatCurrency(item.totalAmount)}</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.remarks || '-'}</td>
        </tr>
      `).join('');

      const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

      return `
        <div style="margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 10px;">📋 발주 품목 상세</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">번호</th>
                <th style="border: 1px solid #ddd; padding: 8px;">품목명</th>
                <th style="border: 1px solid #ddd; padding: 8px;">규격</th>
                <th style="border: 1px solid #ddd; padding: 8px;">단위</th>
                <th style="border: 1px solid #ddd; padding: 8px;">수량</th>
                <th style="border: 1px solid #ddd; padding: 8px;">단가</th>
                <th style="border: 1px solid #ddd; padding: 8px;">금액</th>
                <th style="border: 1px solid #ddd; padding: 8px;">비고</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <tr style="background-color: #e9ecef; font-weight: bold;">
                <td colspan="6" style="border: 1px solid #ddd; padding: 8px; text-align: right;">합계</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #dc3545;">
                  ${formatCurrency(totalAmount)}
                </td>
                <td style="border: 1px solid #ddd; padding: 8px;"></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Malgun Gothic', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            
            .header {
              background-color: #007bff;
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            
            .content {
              background-color: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            
            .info-table th,
            .info-table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            
            .info-table th {
              background-color: #e9ecef;
              font-weight: bold;
              width: 30%;
            }
            
            .attachments {
              background-color: #e7f3ff;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 발주서 송부</h1>
            <p>구매 발주 관리 시스템</p>
          </div>
          
          <div class="content">
            <p>안녕하세요,</p>
            <p>발주서를 송부드립니다. 첨부된 파일을 확인하여 주시기 바랍니다.</p>
            
            ${options.orderNumber ? `
              <table class="info-table">
                <tr>
                  <th>발주번호</th>
                  <td>${options.orderNumber}</td>
                </tr>
                ${options.vendorName ? `
                  <tr>
                    <th>거래처명</th>
                    <td>${options.vendorName}</td>
                  </tr>
                ` : ''}
                ${options.orderDate ? `
                  <tr>
                    <th>발주일자</th>
                    <td>${formatDate(options.orderDate)}</td>
                  </tr>
                ` : ''}
                ${options.dueDate ? `
                  <tr>
                    <th>납기일자</th>
                    <td>${formatDate(options.dueDate)}</td>
                  </tr>
                ` : ''}
                ${options.totalAmount ? `
                  <tr>
                    <th>총 금액</th>
                    <td><strong>${formatCurrency(options.totalAmount)}</strong></td>
                  </tr>
                ` : ''}
              </table>
            ` : ''}

            ${options.orderItems && options.orderItems.length > 0 ? generateOrderItemsTable(options.orderItems) : ''}
            
            <div class="attachments">
              <h3>📎 첨부파일</h3>
              <ul>
                <li>발주서.xlsx (Excel 파일)</li>
                <li>발주서.pdf (PDF 파일)</li>
              </ul>
              <p><small>* 갑지와 을지 시트가 포함되어 있습니다.</small></p>
            </div>
            
            ${options.specialRequirements ? `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>⚠️ 특이사항</h3>
                <p>${options.specialRequirements}</p>
              </div>
            ` : ''}

            ${options.additionalMessage ? `
              <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>📝 추가 안내사항</h3>
                <p>${options.additionalMessage}</p>
              </div>
            ` : ''}
            
            <p>
              발주서 검토 후 확인 회신 부탁드립니다.<br>
              문의사항이 있으시면 언제든지 연락주시기 바랍니다.
            </p>
            
            <p>감사합니다.</p>
          </div>
          
          <div class="footer">
            <p>
              이 메일은 구매 발주 관리 시스템에서 자동으로 발송되었습니다.<br>
              발송 시간: ${new Date().toLocaleString('ko-KR')}
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * 임시 파일 정리 (Vercel 환경 고려)
   */
  private cleanupTempFiles(filePaths: string[]): void {
    filePaths.forEach(filePath => {
      try {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ 임시 파일 삭제: ${filePath}`);
        }
      } catch (error) {
        // Vercel 환경에서는 파일 삭제 실패가 일반적일 수 있음
        if (process.env.VERCEL) {
          console.warn(`⚠️ Vercel 환경에서 파일 정리 실패 (정상): ${filePath}`);
        } else {
          console.error(`❌ 파일 정리 실패: ${filePath}`, error);
        }
      }
    });
  }

  /**
   * 이메일 발송 이력 저장 (단순화된 버전)
   */
  private async recordEmailSendHistory(historyData: {
    orderId: number;
    senderUserId?: string;
    recipients: string[];
    subject: string;
    messageId?: string;
    attachmentCount?: number;
    status: 'success' | 'failed';
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.db.insert(emailSendHistory).values({
        orderId: historyData.orderId,
        orderNumber: null, // Will be populated by relation if needed
        senderUserId: historyData.senderUserId || null,
        recipients: historyData.recipients,
        cc: null,
        bcc: null,
        subject: historyData.subject,
        messageContent: '', // Basic version doesn't store message content
        attachmentFiles: historyData.attachmentCount ? [{
          filename: 'attachments',
          count: historyData.attachmentCount
        }] : null,
        status: historyData.status === 'success' ? 'sent' : 'failed',
        sentCount: historyData.status === 'success' ? 1 : 0,
        failedCount: historyData.status === 'failed' ? 1 : 0,
        errorMessage: historyData.errorMessage || null,
        sentAt: historyData.status === 'success' ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ 이메일 이력 저장 성공 (recordEmailSendHistory)');
    } catch (error) {
      console.error('❌ 이메일 이력 저장 실패 (recordEmailSendHistory):', error);
      // 이력 저장 실패는 이메일 발송 성공에 영향을 주지 않음
    }
  }

  /**
   * 이메일 연결 테스트
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}