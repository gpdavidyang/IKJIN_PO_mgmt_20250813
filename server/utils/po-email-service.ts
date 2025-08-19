import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { convertExcelToPdf } from './excel-to-pdf';
import { ExcelToPDFConverter } from './excel-to-pdf-converter';
import { EnhancedExcelToPDFConverter } from './enhanced-excel-to-pdf';
import { POTemplateProcessor } from './po-template-processor';
import { removeAllInputSheets } from './excel-input-sheet-remover';

export interface EmailAttachment {
  filename: string;
  path: string;
  contentType?: string;
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
}

export class POEmailService {
  private transporter: nodemailer.Transporter;

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
   * Input 시트만 제거한 원본 형식 유지 엑셀과 PDF로 첨부하여 이메일 발송
   * 기존 방식과 달리 엑셀 파일의 원본 형식(테두리, 병합, 색상 등)을 그대로 유지
   */
  async sendPOWithOriginalFormat(
    originalFilePath: string,
    emailOptions: POEmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const timestamp = Date.now();
      const uploadsDir = path.join(__dirname, '../../uploads');
      
      // 1. 고급 방식으로 Input 시트만 제거하고 원본 형식 완벽 유지
      const processedPath = path.join(uploadsDir, `po-advanced-format-${timestamp}.xlsx`);
      const removeResult = await removeAllInputSheets(
        originalFilePath,
        processedPath
      );

      if (!removeResult.success) {
        return {
          success: false,
          error: `Input 시트 제거 실패: ${removeResult.error}`
        };
      }

      console.log(`📄 고급 형식 보존 파일 생성: ${processedPath}`);
      console.log(`🎯 Input 시트 제거 완료`);
      console.log(`📋 남은 시트: ${removeResult.remainingSheets.join(', ')}`);

      // 2. PDF 변환 (남은 모든 시트) - PRD 요구사항: 엑셀파일을 PDF화 한 파일도 첨부
      const pdfPath = path.join(uploadsDir, `po-advanced-format-${timestamp}.pdf`);
      let pdfResult: { success: boolean; pdfPath?: string; error?: string } = { success: false, error: '' };
      
      try {
        // Enhanced PDF 변환기 우선 사용 (PRD 요구사항 완벽 구현)
        const enhancedResult = await EnhancedExcelToPDFConverter.convertExcelToPDF(processedPath, {
          outputPath: pdfPath,
          quality: 'high',
          orientation: 'landscape',
          excludeSheets: ['Input', 'Settings'],
          watermark: `발주서 - ${emailOptions.orderNumber || ''}`
        });

        if (enhancedResult.success) {
          pdfResult.success = true;
          console.log(`✅ Enhanced PDF 변환 성공: ${pdfPath} (${Math.round(enhancedResult.stats!.fileSize / 1024)}KB)`);
        } else {
          throw new Error(enhancedResult.error || 'Enhanced PDF 변환 실패');
        }
      } catch (error) {
        console.warn(`⚠️ Enhanced PDF 변환 실패, 기존 변환기로 fallback: ${error}`);
        
        // 실패 시 기존 변환기로 fallback
        try {
          await ExcelToPDFConverter.convertExcelToPDF(processedPath, pdfPath);
          pdfResult.success = true;
          console.log(`✅ 기존 PDF 변환기로 성공: ${pdfPath}`);
        } catch (fallbackError) {
          // 마지막 fallback
          try {
            pdfResult = await convertExcelToPdf(processedPath, pdfPath, removeResult.remainingSheets);
          } catch (finalError) {
            pdfResult.error = `모든 PDF 변환 실패: ${finalError}`;
            console.warn(`⚠️ PDF 변환 완전 실패: ${pdfResult.error}, Excel 파일만 첨부합니다.`);
          }
        }
      }

      // 3. 첨부파일 준비
      const attachments: EmailAttachment[] = [];
      
      // Excel 파일 첨부 (원본 형식 유지)
      if (fs.existsSync(processedPath)) {
        attachments.push({
          filename: `발주서_${emailOptions.orderNumber || timestamp}.xlsx`,
          path: processedPath,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        console.log(`📎 Excel 첨부파일 추가: 발주서_${emailOptions.orderNumber || timestamp}.xlsx`);
      }

      // PDF 파일 첨부 (변환 성공한 경우에만)
      if (pdfResult.success && fs.existsSync(pdfPath)) {
        attachments.push({
          filename: `발주서_${emailOptions.orderNumber || timestamp}.pdf`,
          path: pdfPath,
          contentType: 'application/pdf'
        });
        console.log(`📎 PDF 첨부파일 추가: 발주서_${emailOptions.orderNumber || timestamp}.pdf`);
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
      });

      // 6. 임시 파일 정리
      this.cleanupTempFiles([processedPath, pdfPath]);

      if (result.success) {
        console.log(`✅ 원본 형식 유지 이메일 발송 성공: ${emailOptions.to}`);
      }

      return result;

    } catch (error) {
      console.error('❌ 원본 형식 유지 이메일 발송 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
      const uploadsDir = path.join(__dirname, '../../uploads');
      
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
      const pdfResult = await convertExcelToPdf(extractedPath, pdfPath, ['갑지', '을지']);

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
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
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
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          path: att.path,
          contentType: att.contentType
        }))
      });

      console.log('✅ POEmailService.sendEmail 성공:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('❌ POEmailService.sendEmail 실패:', error);
      
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
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
      }).format(amount);
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
            
            <div class="attachments">
              <h3>📎 첨부파일</h3>
              <ul>
                <li>발주서.xlsx (Excel 파일)</li>
                <li>발주서.pdf (PDF 파일)</li>
              </ul>
              <p><small>* 갑지와 을지 시트가 포함되어 있습니다.</small></p>
            </div>
            
            ${options.additionalMessage ? `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
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
   * 임시 파일 정리
   */
  private cleanupTempFiles(filePaths: string[]): void {
    filePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`파일 정리 실패: ${filePath}`, error);
      }
    });
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