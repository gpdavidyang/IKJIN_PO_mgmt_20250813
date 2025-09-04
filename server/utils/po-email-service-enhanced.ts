import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 통합 Excel PDF 서비스로 교체
import { UnifiedExcelPdfService } from '../services/unified-excel-pdf-service';
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
  private isInitialized: boolean = false;

  constructor() {
    const smtpConfig: any = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
        ciphers: 'SSLv3' // Some Naver configurations require this
      },
      requireTLS: true, // Force TLS for Naver
      debug: true, // Enable debug output
      logger: true // Enable logging
    };

    console.log('📧 Initializing POEmailService with config:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      user: smtpConfig.auth.user,
      passLength: smtpConfig.auth.pass?.length || 0,
      passPreview: smtpConfig.auth.pass ? `${smtpConfig.auth.pass.substring(0, 3)}...${smtpConfig.auth.pass.substring(smtpConfig.auth.pass.length - 3)}` : 'NOT SET'
    });

    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      console.error('❌ SMTP credentials missing! Please check SMTP_USER and SMTP_PASS in .env');
      console.error('Current ENV values:', {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS ? '***' : 'NOT SET'
      });
    }

    this.transporter = nodemailer.createTransport(smtpConfig);
    
    // Verify connection configuration
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      const success = await this.transporter.verify();
      if (success) {
        console.log('✅ SMTP server is ready to send emails');
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('❌ SMTP connection verification failed:', {
        error: error instanceof Error ? error.message : error,
        code: (error as any).code,
        command: (error as any).command,
        responseCode: (error as any).responseCode
      });
      this.isInitialized = false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
      console.log('📨 sendPOWithOriginalFormat called with:', {
        originalFilePath,
        to: emailOptions.to,
        subject: emailOptions.subject
      });

      // Check if email service is initialized
      if (!this.isInitialized) {
        console.warn('⚠️ Email service not fully initialized, attempting to reconnect...');
        await this.verifyConnection();
        
        if (!this.isInitialized) {
          return {
            success: false,
            error: 'Email service not initialized. Check SMTP configuration.'
          };
        }
      }

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
          // Fallback: 기본 PDF 변환기 사용
          console.log('⚠️ Enhanced PDF 변환 실패, 기본 변환기 시도...');
          const basicResult = await ExcelToPDFConverter.convertToPDF(processedPath, pdfPath);
          
          if (basicResult.success) {
            pdfResult.success = true;
            console.log(`✅ Basic PDF 변환 성공: ${pdfPath}`);
          } else {
            pdfResult.error = basicResult.error || 'PDF conversion failed';
          }
        }
      } catch (pdfError) {
        console.error('❌ PDF 변환 오류:', pdfError);
        pdfResult.error = pdfError instanceof Error ? pdfError.message : 'PDF conversion error';
      }

      // 3. 첨부파일 준비
      const attachments: EmailAttachment[] = [];
      
      // Excel 파일 첨부 (형식 완벽 보존)
      if (fs.existsSync(processedPath)) {
        attachments.push({
          filename: `발주서_${emailOptions.orderNumber || timestamp}.xlsx`,
          path: processedPath,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        console.log(`📎 Excel 첨부파일 추가: 발주서_${emailOptions.orderNumber || timestamp}.xlsx`);
      }

      // PDF 파일 첨부 (변환 성공시)
      if (pdfResult.success && fs.existsSync(pdfPath)) {
        attachments.push({
          filename: `발주서_${emailOptions.orderNumber || timestamp}.pdf`,
          path: pdfPath,
          contentType: 'application/pdf'
        });
        console.log(`📎 PDF 첨부파일 추가: 발주서_${emailOptions.orderNumber || timestamp}.pdf`);
      } else {
        console.warn('⚠️ PDF 변환 실패로 PDF 파일 첨부 생략:', pdfResult.error);
      }

      // 4. 이메일 내용 생성
      const emailContent = this.generateEmailContent(emailOptions);

      // 5. 이메일 발송
      console.log('📤 Sending email with attachments...');
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
      } else {
        console.error(`❌ 이메일 발송 실패: ${result.error}`);
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
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          user: process.env.SMTP_USER,
          initialized: this.isInitialized
        }
      });

      // Validate recipients
      const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
      const invalidEmails = toAddresses.filter(email => !this.isValidEmail(email));
      
      if (invalidEmails.length > 0) {
        console.error('❌ Invalid email addresses:', invalidEmails);
        return {
          success: false,
          error: `Invalid email addresses: ${invalidEmails.join(', ')}`
        };
      }

      const mailOptions: any = {
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
      };

      console.log('📨 Attempting to send email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        attachmentsCount: mailOptions.attachments?.length || 0
      });

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ POEmailService.sendEmail 성공:', {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        envelope: info.envelope
      });
      
      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('❌ POEmailService.sendEmail 실패:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        code: (error as any).code,
        command: (error as any).command,
        responseCode: (error as any).responseCode
      });
      
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
            }
            
            .content {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 0 0 8px 8px;
            }
            
            .detail-table {
              background-color: white;
              border-radius: 4px;
              padding: 15px;
              margin: 15px 0;
            }
            
            .detail-table table {
              width: 100%;
              border-collapse: collapse;
            }
            
            .detail-table th {
              text-align: left;
              padding: 8px;
              color: #6c757d;
              font-weight: normal;
              width: 30%;
            }
            
            .detail-table td {
              padding: 8px;
              font-weight: bold;
            }
            
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
              color: #6c757d;
              font-size: 14px;
            }
            
            .additional-message {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 15px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0;">발주서 전송</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Purchase Order</p>
          </div>
          
          <div class="content">
            <p>안녕하세요, <strong>${options.vendorName || '거래처'}</strong> 담당자님</p>
            <p>아래와 같이 발주서를 전송드리오니 확인 부탁드립니다.</p>
            
            <div class="detail-table">
              <table>
                <tr>
                  <th>발주번호</th>
                  <td>${options.orderNumber || '-'}</td>
                </tr>
                <tr>
                  <th>발주일자</th>
                  <td>${options.orderDate ? formatDate(options.orderDate) : '-'}</td>
                </tr>
                ${options.dueDate ? `
                <tr>
                  <th>납기일자</th>
                  <td>${formatDate(options.dueDate)}</td>
                </tr>
                ` : ''}
                ${options.totalAmount ? `
                <tr>
                  <th>발주금액</th>
                  <td>${formatCurrency(options.totalAmount)}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${options.additionalMessage ? `
            <div class="additional-message">
              <p style="margin: 0;"><strong>추가 전달사항</strong></p>
              <p style="margin: 10px 0 0 0;">${options.additionalMessage}</p>
            </div>
            ` : ''}
            
            <p>첨부된 발주서를 확인하시고, 문의사항이 있으시면 연락 부탁드립니다.</p>
            <p>감사합니다.</p>
            
            <div class="footer">
              <p>본 메일은 발주 관리 시스템에서 자동 발송된 메일입니다.</p>
              <p>© 2024 Purchase Order Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * 임시 파일 정리
   */
  private cleanupTempFiles(filePaths: string[]) {
    setTimeout(() => {
      filePaths.forEach(filePath => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ 임시 파일 삭제: ${path.basename(filePath)}`);
          }
        } catch (error) {
          console.warn(`⚠️ 임시 파일 삭제 실패: ${path.basename(filePath)}`, error);
        }
      });
    }, 5000); // 5초 후 정리
  }
}