import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { POTemplateProcessorMock } from './po-template-processor-mock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export class POEmailServiceMock {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // 이메일 설정이 있는 경우에만 transporter 생성
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransporter({
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
  }

  /**
   * 갑지/을지 시트를 Excel과 PDF로 첨부하여 이메일 발송
   */
  async sendPOWithAttachments(
    originalFilePath: string,
    emailOptions: POEmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string; mockMode?: boolean }> {
    try {
      const timestamp = Date.now();
      const uploadsDir = path.join(__dirname, '../../uploads');
      
      // 1. 갑지/을지 시트 추출
      const extractedPath = path.join(uploadsDir, `po-sheets-${timestamp}.xlsx`);
      const extractResult = POTemplateProcessorMock.extractSheetsToFile(
        originalFilePath,
        extractedPath,
        ['갑지', '을지']
      );

      if (!extractResult.success) {
        return {
          success: false,
          error: `시트 추출 실패: ${extractResult.error}`
        };
      }

      // 2. PDF 변환 시뮬레이션 (실제 변환 대신 더미 파일 생성)
      const pdfPath = path.join(uploadsDir, `po-sheets-${timestamp}.pdf`);
      const pdfResult = await this.createDummyPDF(pdfPath);

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

      // 5. 이메일 발송 (실제 또는 Mock)
      let result;
      if (this.transporter) {
        // 실제 이메일 발송
        result = await this.sendEmail({
          to: emailOptions.to,
          cc: emailOptions.cc,
          bcc: emailOptions.bcc,
          subject: emailOptions.subject,
          html: emailContent,
          attachments
        });
      } else {
        // Mock 이메일 발송
        result = await this.sendMockEmail({
          to: emailOptions.to,
          cc: emailOptions.cc,
          bcc: emailOptions.bcc,
          subject: emailOptions.subject,
          html: emailContent,
          attachments
        });
      }

      // 6. 임시 파일 정리 (5초 후)
      setTimeout(() => {
        this.cleanupTempFiles([extractedPath, pdfPath]);
      }, 5000);

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 실제 이메일 발송
   */
  async sendEmail(options: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: EmailAttachment[];
  }): Promise<{ success: boolean; messageId?: string; error?: string; mockMode?: boolean }> {
    try {
      if (!this.transporter) {
        return this.sendMockEmail(options);
      }

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

      return {
        success: true,
        messageId: info.messageId,
        mockMode: false
      };

    } catch (error) {
      console.error('실제 이메일 발송 실패, Mock 모드로 전환:', error);
      return this.sendMockEmail(options);
    }
  }

  /**
   * Mock 이메일 발송
   */
  async sendMockEmail(options: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: EmailAttachment[];
  }): Promise<{ success: boolean; messageId?: string; error?: string; mockMode: boolean }> {
    
    // Mock 이메일 로그 생성
    const mockLog = {
      timestamp: new Date().toISOString(),
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        size: this.getFileSize(att.path),
        contentType: att.contentType
      }))
    };

    // 콘솔에 Mock 이메일 정보 출력
    console.log('📧 Mock 이메일 발송:');
    console.log('  수신자:', options.to);
    console.log('  제목:', options.subject);
    console.log('  첨부파일:', options.attachments?.length || 0, '개');
    console.log('  발송 시간:', mockLog.timestamp);

    // Mock 이메일 로그 파일 저장
    const logDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, `mock-email-${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(mockLog, null, 2));

    return {
      success: true,
      messageId: `mock-${Date.now()}@po-management.local`,
      mockMode: true
    };
  }

  /**
   * 더미 PDF 파일 생성
   */
  private async createDummyPDF(pdfPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 55
>>
stream
BT
/F1 12 Tf
100 700 Td
(발주서 PDF - Mock 생성) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000379 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
456
%%EOF`;

      fs.writeFileSync(pdfPath, pdfContent);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 파일 크기 반환
   */
  private getFileSize(filePath: string): string {
    try {
      const stats = fs.statSync(filePath);
      const bytes = stats.size;
      if (bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    } catch {
      return 'Unknown';
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
            
            .mock-notice {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 10px;
              border-radius: 5px;
              margin: 15px 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 발주서 송부</h1>
            <p>구매 발주 관리 시스템</p>
          </div>
          
          <div class="content">
            <div class="mock-notice">
              <strong>🧪 테스트 모드:</strong> 이 메일은 시스템 테스트용으로 생성되었습니다.
            </div>
            
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
          console.log(`✅ 임시 파일 정리: ${path.basename(filePath)}`);
        }
      } catch (error) {
        console.error(`❌ 파일 정리 실패: ${filePath}`, error);
      }
    });
  }

  /**
   * 이메일 연결 테스트
   */
  async testConnection(): Promise<{ success: boolean; error?: string; mockMode?: boolean }> {
    try {
      if (!this.transporter) {
        return { 
          success: true, 
          mockMode: true,
          error: 'SMTP 설정 없음 - Mock 모드 사용' 
        };
      }

      await this.transporter.verify();
      return { 
        success: true, 
        mockMode: false 
      };
    } catch (error) {
      return {
        success: true,
        mockMode: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}