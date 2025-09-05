import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as db from '../db';
import { attachments } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface PurchaseOrderPDFData {
  orderNumber: string;
  orderDate: Date;
  deliveryDate?: Date | null;
  projectName?: string;
  vendorName?: string;
  vendorContact?: string;
  vendorEmail?: string;
  items: Array<{
    category?: string;
    subCategory1?: string;
    subCategory2?: string;
    item?: string;
    name: string;
    specification?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    price: number;
    deliveryLocation?: string;
  }>;
  totalAmount: number;
  notes?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyFax?: string;
  receiver?: string;
  manager?: string;
  site?: string;
}

export class PDFGenerationService {
  private static uploadDir = path.join(process.cwd(), 'uploads/pdf');

  /**
   * 발주서 PDF 생성 및 첨부파일 등록
   */
  static async generatePurchaseOrderPDF(
    orderId: number,
    orderData: PurchaseOrderPDFData,
    userId: string
  ): Promise<{ success: boolean; pdfPath?: string; attachmentId?: number; error?: string }> {
    try {
      console.log(`📄 [PDFGenerator] 발주서 PDF 생성 시작: Order ID ${orderId}`);

      // PDF 저장 디렉토리 생성
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const pdfDir = path.join(this.uploadDir, String(year), month);
      
      console.log(`📁 [PDFGenerator] 디렉토리 생성 중: ${pdfDir}`);
      
      if (!fs.existsSync(pdfDir)) {
        try {
          fs.mkdirSync(pdfDir, { recursive: true });
          console.log(`✅ [PDFGenerator] 디렉토리 생성 완료: ${pdfDir}`);
        } catch (dirError) {
          console.error(`❌ [PDFGenerator] 디렉토리 생성 실패: ${pdfDir}`, dirError);
          throw new Error(`디렉토리 생성 실패: ${dirError instanceof Error ? dirError.message : 'Unknown error'}`);
        }
      }

      // PDF 파일명 생성
      const timestamp = Date.now();
      const fileName = `PO_${orderData.orderNumber}_${timestamp}.pdf`;
      const filePath = path.join(pdfDir, fileName);

      // HTML 템플릿 생성
      const htmlContent = this.generateHTMLTemplate(orderData);
      
      // HTML을 PDF로 변환 (임시로 HTML 파일로 저장)
      const htmlPath = filePath.replace('.pdf', '.html');
      fs.writeFileSync(htmlPath, htmlContent);

      // Playwright를 사용한 PDF 생성
      const pdfBuffer = await this.convertHTMLToPDF(htmlPath);
      fs.writeFileSync(filePath, pdfBuffer);
      
      // HTML 임시 파일 삭제
      if (fs.existsSync(htmlPath)) {
        fs.unlinkSync(htmlPath);
      }

      // 파일 크기 확인
      const stats = fs.statSync(filePath);

      // 첨부파일 DB 등록
      const [attachment] = await db.db.insert(attachments).values({
        orderId,
        originalName: fileName,
        storedName: fileName,
        filePath,
        fileSize: stats.size,
        mimeType: 'application/pdf',
        uploadedBy: userId
      }).returning();

      console.log(`✅ [PDFGenerator] PDF 생성 완료: ${filePath}, Attachment ID: ${attachment.id}`);

      return {
        success: true,
        pdfPath: filePath,
        attachmentId: attachment.id
      };

    } catch (error) {
      console.error('❌ [PDFGenerator] PDF 생성 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF 생성 중 오류 발생'
      };
    }
  }

  /**
   * HTML 템플릿 생성
   */
  private static generateHTMLTemplate(data: PurchaseOrderPDFData): string {
    const formatDate = (date?: Date | null) => {
      if (!date) return '-';
      return format(new Date(date), 'yyyy년 MM월 dd일', { locale: ko });
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
      }).format(amount);
    };

    const itemRows = data.items.map((item, index) => `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>${item.category || '-'}</td>
        <td>${item.subCategory1 || '-'}</td>
        <td>${item.subCategory2 || '-'}</td>
        <td>${item.item || item.name}</td>
        <td>${item.specification || '-'}</td>
        <td class="text-right">${item.quantity}</td>
        <td class="text-center">${item.unit}</td>
        <td class="text-right">${formatCurrency(item.unitPrice)}</td>
        <td class="text-right">${formatCurrency(item.price)}</td>
        <td>${item.deliveryLocation || '-'}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>구매 발주서 - ${data.orderNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Malgun Gothic', 'Arial', sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #333;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header .subtitle {
      font-size: 11pt;
      color: #666;
    }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    
    .info-group {
      flex: 1;
    }
    
    .info-item {
      margin-bottom: 5px;
    }
    
    .info-item strong {
      display: inline-block;
      width: 100px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 5px;
      font-size: 9pt;
    }
    
    th {
      background-color: #f5f5f5;
      font-weight: bold;
      text-align: center;
    }
    
    .text-center {
      text-align: center;
    }
    
    .text-right {
      text-align: right;
    }
    
    .total-row {
      background-color: #f9f9f9;
      font-weight: bold;
    }
    
    .notes-section {
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #ddd;
      background-color: #fafafa;
    }
    
    .signature-section {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
    }
    
    .signature-box {
      width: 18%;
      border: 1px solid #ddd;
      padding: 5px;
      text-align: center;
    }
    
    .signature-box .title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .signature-box .signature-area {
      height: 50px;
      border-top: 1px solid #ddd;
      margin-top: 5px;
    }
    
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #333;
    }
    
    .company-info {
      margin-top: 10px;
      font-size: 9pt;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>구매 발주서</h1>
      <div class="subtitle">Purchase Order</div>
    </div>
    
    <div class="info-section">
      <div class="info-group">
        <div class="info-item"><strong>발주서 번호:</strong> ${data.orderNumber}</div>
        <div class="info-item"><strong>작성일:</strong> ${formatDate(data.orderDate)}</div>
        <div class="info-item"><strong>현장:</strong> ${data.site || '-'}</div>
        <div class="info-item"><strong>프로젝트:</strong> ${data.projectName || '-'}</div>
      </div>
      <div class="info-group">
        <div class="info-item"><strong>납품 희망일:</strong> ${formatDate(data.deliveryDate)}</div>
        <div class="info-item"><strong>거래처:</strong> ${data.vendorName || '-'}</div>
        <div class="info-item"><strong>자재 인수자:</strong> ${data.receiver || '-'}</div>
        <div class="info-item"><strong>본사 담당자:</strong> ${data.manager || '-'}</div>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th style="width: 5%">No</th>
          <th style="width: 10%">대분류</th>
          <th style="width: 10%">중분류</th>
          <th style="width: 10%">소분류</th>
          <th style="width: 15%">품목명</th>
          <th style="width: 12%">규격</th>
          <th style="width: 8%">수량</th>
          <th style="width: 5%">단위</th>
          <th style="width: 10%">단가</th>
          <th style="width: 10%">금액</th>
          <th style="width: 5%">납품처</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr class="total-row">
          <td colspan="9" class="text-center">합계</td>
          <td class="text-right">${formatCurrency(data.totalAmount)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    
    ${data.notes ? `
    <div class="notes-section">
      <strong>특이사항:</strong>
      <div style="margin-top: 5px;">${data.notes}</div>
    </div>
    ` : ''}
    
    <div class="signature-section">
      <div class="signature-box">
        <div class="title">담당</div>
        <div class="signature-area"></div>
      </div>
      <div class="signature-box">
        <div class="title">공무</div>
        <div class="signature-area"></div>
      </div>
      <div class="signature-box">
        <div class="title">팀장</div>
        <div class="signature-area"></div>
      </div>
      <div class="signature-box">
        <div class="title">임원</div>
        <div class="signature-area"></div>
      </div>
      <div class="signature-box">
        <div class="title">사장</div>
        <div class="signature-area"></div>
      </div>
    </div>
    
    <div class="footer">
      <strong>${data.companyName || '회사명'}</strong>
      <div class="company-info">
        <div>${data.companyAddress || '주소: 서울특별시'}</div>
        <div>전화: ${data.companyPhone || '02-0000-0000'} | 팩스: ${data.companyFax || '02-0000-0001'}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * HTML을 PDF로 변환 (Playwright 사용)
   */
  private static async convertHTMLToPDF(htmlPath: string): Promise<Buffer> {
    const { chromium } = await import('playwright');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // HTML 파일 로드
      await page.goto(`file://${path.resolve(htmlPath)}`, {
        waitUntil: 'networkidle'
      });
      
      // PDF 생성
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        }
      });
      
      return pdfBuffer;
      
    } finally {
      await browser.close();
    }
  }

  /**
   * 기존 발주서에 대해 PDF 재생성
   */
  static async regeneratePDF(
    orderId: number,
    orderData: PurchaseOrderPDFData,
    userId: string
  ): Promise<{ success: boolean; pdfPath?: string; attachmentId?: number; error?: string }> {
    try {
      // 기존 PDF 첨부파일 삭제
      const existingAttachments = await db.db
        .select()
        .from(attachments)
        .where(eq(attachments.orderId, orderId));
      
      for (const attachment of existingAttachments) {
        if (attachment.mimeType === 'application/pdf' && attachment.originalName.startsWith('PO_')) {
          // 파일 삭제
          if (fs.existsSync(attachment.filePath)) {
            fs.unlinkSync(attachment.filePath);
          }
          // DB 레코드 삭제
          await db.db.delete(attachments).where(eq(attachments.id, attachment.id));
        }
      }
      
      // 새 PDF 생성
      return await this.generatePurchaseOrderPDF(orderId, orderData, userId);
      
    } catch (error) {
      console.error('❌ [PDFGenerator] PDF 재생성 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF 재생성 중 오류 발생'
      };
    }
  }
}