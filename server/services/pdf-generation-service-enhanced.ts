import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as db from '../db';
import { attachments, users, companies, vendors, projects } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface EnhancedPurchaseOrderPDFData {
  // 기본 발주 정보
  orderNumber: string;
  orderDate: Date;
  deliveryDate?: Date | null;
  status?: string;
  approvalStatus?: string;
  
  // 프로젝트/현장 정보
  projectName?: string;
  projectCode?: string;
  projectAddress?: string;
  siteManager?: string;
  siteContact?: string;
  
  // 거래처 상세 정보
  vendorName?: string;
  vendorRegistrationNumber?: string;
  vendorRepresentative?: string;
  vendorAddress?: string;
  vendorPhone?: string;
  vendorFax?: string;
  vendorEmail?: string;
  vendorContact?: string;
  vendorContactPhone?: string;
  
  // 발주업체 상세 정보
  companyName?: string;
  companyRegistrationNumber?: string;
  companyRepresentative?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyFax?: string;
  companyEmail?: string;
  
  // 작성자/담당자 정보
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByPhone?: string;
  createdByPosition?: string;
  createdByDepartment?: string;
  createdAt?: Date;
  
  // 수신자 정보
  receiverName?: string;
  receiverEmail?: string;
  receiverPhone?: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  
  // 품목 정보 (컴팩트 버전)
  items: Array<{
    category?: string;
    subCategory1?: string;
    subCategory2?: string;
    itemCode?: string;
    name: string;
    specification?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    price: number;
    deliveryLocation?: string;
    remarks?: string;
  }>;
  
  // 금액 정보
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  
  // 기타 정보
  notes?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  attachmentCount?: number;
  hasAttachments?: boolean;
  attachmentNames?: string[];
  
  // 결재 정보
  approvers?: Array<{
    name: string;
    position: string;
    department?: string;
    approvalDate?: Date;
    status?: string;
  }>;
}

export class EnhancedPDFGenerationService {
  private static uploadDir = process.env.VERCEL 
    ? '/tmp/pdf'
    : path.join(process.cwd(), 'uploads/pdf');

  /**
   * 향상된 발주서 PDF 생성
   */
  static async generateEnhancedPurchaseOrderPDF(
    orderId: number,
    orderData: EnhancedPurchaseOrderPDFData,
    userId: string
  ): Promise<{ success: boolean; pdfPath?: string; attachmentId?: number; error?: string; pdfBuffer?: Buffer }> {
    try {
      console.log(`📄 [Enhanced PDFGenerator] 향상된 발주서 PDF 생성 시작: Order ID ${orderId}`);

      const timestamp = Date.now();
      const fileName = `PO_${orderData.orderNumber}_${timestamp}.pdf`;

      // PDF 생성
      let pdfBuffer: Buffer;
      
      if (process.env.VERCEL) {
        console.log('📄 [Enhanced PDFGenerator] Vercel 환경: PDFKit으로 PDF 직접 생성');
        pdfBuffer = await this.generateCompactPDFWithPDFKit(orderData);
      } else {
        console.log('📄 [Enhanced PDFGenerator] 로컬 환경: HTML 템플릿으로 PDF 생성');
        const htmlContent = this.generateCompactHTMLTemplate(orderData);
        pdfBuffer = await this.convertHTMLToPDFFromString(htmlContent);
      }
      
      let filePath = '';
      let attachmentId: number;

      if (process.env.VERCEL) {
        // Vercel 환경: DB에 저장 (fileData 컬럼 호환성 처리)
        const base64Data = pdfBuffer.toString('base64');
        
        let attachment;
        try {
          // fileData 컬럼이 있는 경우 시도
          [attachment] = await db.db.insert(attachments).values({
            orderId,
            originalName: fileName,
            storedName: fileName,
            filePath: `db://${fileName}`,
            fileSize: pdfBuffer.length,
            mimeType: 'application/pdf',
            uploadedBy: userId,
            fileData: base64Data // Base64 encoded PDF data
          }).returning();
          
          console.log(`✅ [Enhanced PDFGenerator] PDF 생성 완료 (DB Base64 저장): ${fileName}`);
        } catch (error) {
          console.warn('⚠️ [Enhanced PDFGenerator] fileData 컬럼 없음, 기본 저장 방식 사용:', error.message);
          // fileData 컬럼이 없는 경우 fallback
          [attachment] = await db.db.insert(attachments).values({
            orderId,
            originalName: fileName,
            storedName: fileName,
            filePath: `db://${fileName}`,
            fileSize: pdfBuffer.length,
            mimeType: 'application/pdf',
            uploadedBy: userId
          }).returning();
          
          console.log(`✅ [Enhanced PDFGenerator] PDF 생성 완료 (DB 경로 저장): ${fileName}`);
        }
        
        attachmentId = attachment.id;
        filePath = `db://${fileName}`;
      } else {
        // 로컬 환경: 파일 시스템에 저장 (fileData 컬럼 호환성 처리)
        const tempDir = path.join(this.uploadDir, String(new Date().getFullYear()), String(new Date().getMonth() + 1).padStart(2, '0'));
        
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        filePath = path.join(tempDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);
        
        const base64Data = pdfBuffer.toString('base64');
        let attachment;
        
        try {
          // fileData 컬럼이 있는 경우 Base64도 함께 저장
          [attachment] = await db.db.insert(attachments).values({
            orderId,
            originalName: fileName,
            storedName: fileName,
            filePath,
            fileSize: pdfBuffer.length,
            mimeType: 'application/pdf',
            uploadedBy: userId,
            fileData: base64Data // Base64도 저장해서 다중 호환성 확보
          }).returning();
          
          console.log(`✅ [Enhanced PDFGenerator] PDF 생성 완료 (파일+Base64): ${filePath}`);
        } catch (error) {
          console.warn('⚠️ [Enhanced PDFGenerator] fileData 컬럼 없음, 파일 경로만 저장:', error.message);
          // fileData 컬럼이 없는 경우 파일 경로만 저장
          [attachment] = await db.db.insert(attachments).values({
            orderId,
            originalName: fileName,
            storedName: fileName,
            filePath,
            fileSize: pdfBuffer.length,
            mimeType: 'application/pdf',
            uploadedBy: userId
          }).returning();
          
          console.log(`✅ [Enhanced PDFGenerator] PDF 생성 완료 (파일만): ${filePath}`);
        }
        
        attachmentId = attachment.id;
      }

      return {
        success: true,
        pdfPath: filePath,
        attachmentId,
        pdfBuffer: process.env.VERCEL ? pdfBuffer : undefined
      };

    } catch (error) {
      console.error('❌ [Enhanced PDFGenerator] PDF 생성 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF 생성 중 오류 발생'
      };
    }
  }

  /**
   * 컴팩트한 HTML 템플릿 생성
   */
  private static generateCompactHTMLTemplate(data: EnhancedPurchaseOrderPDFData): string {
    const formatDate = (date?: Date | null) => {
      if (!date) return '-';
      return format(new Date(date), 'yyyy. M. d.', { locale: ko });
    };

    const formatDateTime = (date?: Date | null) => {
      if (!date) return '-';
      return format(new Date(date), 'yyyy. M. d. a h:mm', { locale: ko });
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
        <td class="text-small">${item.name}</td>
        <td class="text-small">${item.specification || '-'}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-center">${item.unit}</td>
        <td class="text-right">${formatCurrency(item.unitPrice)}</td>
        <td class="text-right">${formatCurrency(item.price)}</td>
      </tr>
    `).join('');

    const categoryInfo = data.items[0] ? `
      <div class="category-info">
        대분류: ${data.items[0].category || '-'} | 
        중분류: ${data.items[0].subCategory1 || '-'} | 
        소분류: ${data.items[0].subCategory2 || '-'}
      </div>
    ` : '';

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
      margin: 10mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Malgun Gothic', 'Arial', sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      color: #000;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
    }
    
    /* Header */
    .header {
      text-align: center;
      padding: 10px 0;
      border-bottom: 3px solid #2563eb;
      margin-bottom: 15px;
    }
    
    .header h1 {
      font-size: 20pt;
      font-weight: bold;
      margin-bottom: 3px;
    }
    
    .header .subtitle {
      font-size: 10pt;
      color: #666;
    }
    
    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .info-box {
      border: 1px solid #ddd;
      padding: 8px;
      background: #f9f9f9;
    }
    
    .info-box h3 {
      font-size: 10pt;
      font-weight: bold;
      margin-bottom: 5px;
      padding-bottom: 3px;
      border-bottom: 1px solid #ddd;
    }
    
    .info-row {
      display: flex;
      margin-bottom: 2px;
    }
    
    .info-label {
      font-weight: bold;
      width: 80px;
      font-size: 8pt;
    }
    
    .info-value {
      flex: 1;
      font-size: 8pt;
    }
    
    /* Compact Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 8pt;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 3px 5px;
    }
    
    th {
      background-color: #e3f2fd;
      font-weight: bold;
      text-align: center;
      font-size: 8pt;
    }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-small { font-size: 7pt; }
    
    .total-row {
      background-color: #f0f4f8;
      font-weight: bold;
    }
    
    .category-info {
      margin: 5px 0;
      padding: 5px;
      background: #fffbf0;
      border: 1px solid #fbbf24;
      font-size: 8pt;
    }
    
    /* Footer Section */
    .footer-section {
      margin-top: 15px;
      padding-top: 10px;
      border-top: 2px solid #333;
    }
    
    .notes-box {
      margin: 10px 0;
      padding: 8px;
      border: 1px solid #ddd;
      background-color: #fafafa;
      font-size: 8pt;
    }
    
    .signature-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 5px;
      margin-top: 15px;
    }
    
    .signature-box {
      border: 1px solid #666;
      padding: 3px;
      text-align: center;
      height: 40px;
    }
    
    .signature-box .title {
      font-size: 8pt;
      font-weight: bold;
    }
    
    .company-footer {
      text-align: center;
      margin-top: 10px;
      font-size: 8pt;
      color: #666;
    }
    
    .attachment-info {
      display: inline-block;
      padding: 2px 8px;
      background: #e3f2fd;
      border: 1px solid #2196f3;
      border-radius: 3px;
      font-size: 8pt;
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>구매 발주서</h1>
      <div class="subtitle">Purchase Order</div>
    </div>
    
    <!-- Order Info Grid -->
    <div class="info-grid">
      <!-- 발주 정보 -->
      <div class="info-box">
        <h3>발주 정보</h3>
        <div class="info-row">
          <span class="info-label">발주서 번호:</span>
          <span class="info-value">${data.orderNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">발주일:</span>
          <span class="info-value">${formatDate(data.orderDate)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">납기일:</span>
          <span class="info-value">${formatDate(data.deliveryDate)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">등록일:</span>
          <span class="info-value">${formatDateTime(data.createdAt)}</span>
        </div>
      </div>
      
      <!-- 현장 정보 -->
      <div class="info-box">
        <h3>현장 정보</h3>
        <div class="info-row">
          <span class="info-label">현장명:</span>
          <span class="info-value">${data.projectName || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">현장코드:</span>
          <span class="info-value">${data.projectCode || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">현장주소:</span>
          <span class="info-value">${data.projectAddress || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">현장담당:</span>
          <span class="info-value">${data.siteManager || '-'}</span>
        </div>
      </div>
      
      <!-- 거래처 정보 -->
      <div class="info-box">
        <h3>거래처 정보</h3>
        <div class="info-row">
          <span class="info-label">거래처명:</span>
          <span class="info-value">${data.vendorName || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">사업자번호:</span>
          <span class="info-value">${data.vendorRegistrationNumber || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">대표자:</span>
          <span class="info-value">${data.vendorRepresentative || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">연락처:</span>
          <span class="info-value">${data.vendorPhone || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">이메일:</span>
          <span class="info-value">${data.vendorEmail || '-'}</span>
        </div>
      </div>
      
      <!-- 작성자/수신자 정보 -->
      <div class="info-box">
        <h3>담당자 정보</h3>
        <div class="info-row">
          <span class="info-label">작성자:</span>
          <span class="info-value">${data.createdByName || '-'} ${data.createdByPosition ? `(${data.createdByPosition})` : ''}</span>
        </div>
        <div class="info-row">
          <span class="info-label">연락처:</span>
          <span class="info-value">${data.createdByPhone || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">이메일:</span>
          <span class="info-value">${data.createdByEmail || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">수신자:</span>
          <span class="info-value">${data.receiverName || '-'}</span>
        </div>
        ${data.hasAttachments ? `
        <div class="info-row">
          <span class="attachment-info">📎 첨부파일 ${data.attachmentCount || 0}개</span>
        </div>
        ` : ''}
      </div>
    </div>
    
    <!-- Category Info -->
    ${categoryInfo}
    
    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 5%">순번</th>
          <th style="width: 35%">품목명</th>
          <th style="width: 20%">규격</th>
          <th style="width: 10%">수량</th>
          <th style="width: 8%">단위</th>
          <th style="width: 11%">단가</th>
          <th style="width: 11%">금액</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr class="total-row">
          <td colspan="6" class="text-center">총 금액</td>
          <td class="text-right">${formatCurrency(data.totalAmount)}</td>
        </tr>
      </tbody>
    </table>
    
    <!-- Notes -->
    ${data.notes ? `
    <div class="notes-box">
      <strong>비고:</strong> ${data.notes}
    </div>
    ` : ''}
    
    <!-- Payment Terms -->
    ${data.paymentTerms ? `
    <div class="notes-box">
      <strong>결제조건:</strong> ${data.paymentTerms}
    </div>
    ` : ''}
    
    <!-- Signature Section -->
    <div class="signature-grid">
      <div class="signature-box">
        <div class="title">담당</div>
      </div>
      <div class="signature-box">
        <div class="title">검토</div>
      </div>
      <div class="signature-box">
        <div class="title">팀장</div>
      </div>
      <div class="signature-box">
        <div class="title">임원</div>
      </div>
      <div class="signature-box">
        <div class="title">대표</div>
      </div>
    </div>
    
    <!-- Company Footer -->
    <div class="footer-section">
      <div class="company-footer">
        <strong>${data.companyName || '발주업체'}</strong><br>
        ${data.companyAddress || ''}<br>
        TEL: ${data.companyPhone || ''} | FAX: ${data.companyFax || ''}<br>
        사업자등록번호: ${data.companyRegistrationNumber || ''}
      </div>
    </div>
    
    <div style="text-align: center; font-size: 7pt; color: #999; margin-top: 10px;">
      이 문서는 시스템에서 자동 생성되었습니다.<br>
      생성일시: ${formatDateTime(new Date())} | 문서 ID: ${Date.now()}
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * HTML을 PDF로 변환
   */
  private static async convertHTMLToPDFFromString(htmlContent: string): Promise<Buffer> {
    if (process.env.VERCEL) {
      return await this.generateCompactPDFWithPDFKit({} as any);
    } else {
      try {
        const { chromium } = await import('playwright');
        
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        try {
          await page.setContent(htmlContent, {
            waitUntil: 'networkidle'
          });
          
          const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
              top: '10mm',
              right: '10mm',
              bottom: '10mm',
              left: '10mm'
            }
          });
          
          return pdfBuffer;
          
        } finally {
          await browser.close();
        }
      } catch (playwrightError) {
        console.warn('⚠️ Playwright 실패, PDFKit으로 대체:', playwrightError);
        return await this.generateCompactPDFWithPDFKit({} as any);
      }
    }
  }

  /**
   * PDFKit으로 컴팩트한 발주서 PDF 생성
   */
  private static async generateCompactPDFWithPDFKit(orderData: EnhancedPurchaseOrderPDFData): Promise<Buffer> {
    const PDFKitDocument = (await import('pdfkit')).default;
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFKitDocument({ 
          size: 'A4',
          margins: { top: 30, bottom: 30, left: 30, right: 30 }
        });
        
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // 폰트 설정
        doc.font('Helvetica');
        
        // 제목
        doc.fontSize(18).text('구매 발주서', { align: 'center' });
        doc.fontSize(10).text('Purchase Order', { align: 'center' });
        doc.moveDown(1);
        
        const formatDate = (date?: Date | null) => {
          if (!date) return '-';
          return format(new Date(date), 'yyyy. M. d.', { locale: ko });
        };

        const formatCurrency = (amount: number) => {
          return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
          }).format(amount);
        };
        
        // 구분선
        doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke();
        doc.moveDown(0.5);
        
        // 정보 섹션 (2열 레이아웃)
        const startY = doc.y;
        const colWidth = 260;
        doc.fontSize(9);
        
        // 왼쪽 열 - 발주 정보
        doc.text(`발주서 번호: ${orderData.orderNumber}`, 30, startY);
        doc.text(`발주일: ${formatDate(orderData.orderDate)}`, 30, startY + 15);
        doc.text(`납기일: ${formatDate(orderData.deliveryDate)}`, 30, startY + 30);
        doc.text(`현장: ${orderData.projectName || '-'}`, 30, startY + 45);
        
        // 오른쪽 열 - 거래처 정보
        doc.text(`거래처: ${orderData.vendorName || '-'}`, 300, startY);
        doc.text(`담당자: ${orderData.vendorContact || '-'}`, 300, startY + 15);
        doc.text(`연락처: ${orderData.vendorPhone || '-'}`, 300, startY + 30);
        doc.text(`작성자: ${orderData.createdByName || '-'}`, 300, startY + 45);
        
        doc.y = startY + 65;
        doc.moveDown(0.5);
        
        // 품목 테이블
        doc.fontSize(8);
        const tableTop = doc.y;
        
        // 헤더
        doc.rect(30, tableTop, 535, 15).fill('#e3f2fd');
        doc.fillColor('black');
        doc.text('No', 35, tableTop + 3);
        doc.text('품목명', 65, tableTop + 3);
        doc.text('규격', 200, tableTop + 3);
        doc.text('수량', 280, tableTop + 3);
        doc.text('단위', 320, tableTop + 3);
        doc.text('단가', 360, tableTop + 3);
        doc.text('금액', 430, tableTop + 3);
        doc.text('비고', 500, tableTop + 3);
        
        doc.rect(30, tableTop, 535, 15).stroke();
        
        // 품목 행들
        let currentY = tableTop + 15;
        orderData.items.forEach((item, index) => {
          const rowHeight = 18;
          
          if (index % 2 === 0) {
            doc.rect(30, currentY, 535, rowHeight).fill('#f9f9f9');
            doc.fillColor('black');
          }
          
          doc.fontSize(7);
          doc.text(`${index + 1}`, 35, currentY + 4);
          doc.text(item.name.substring(0, 20), 65, currentY + 4);
          doc.text((item.specification || '-').substring(0, 15), 200, currentY + 4);
          doc.text(item.quantity.toString(), 280, currentY + 4);
          doc.text(item.unit, 320, currentY + 4);
          doc.text(formatCurrency(item.unitPrice), 360, currentY + 4);
          doc.text(formatCurrency(item.price), 430, currentY + 4);
          doc.text(item.deliveryLocation || '-', 500, currentY + 4);
          
          doc.rect(30, currentY, 535, rowHeight).stroke();
          currentY += rowHeight;
        });
        
        // 합계
        doc.rect(30, currentY, 535, 20).fill('#f0f4f8');
        doc.fillColor('black');
        doc.fontSize(9).text('총 금액', 35, currentY + 5);
        doc.text(formatCurrency(orderData.totalAmount), 430, currentY + 5);
        doc.rect(30, currentY, 535, 20).stroke();
        
        // 특이사항
        if (orderData.notes) {
          doc.moveDown(1);
          doc.fontSize(8).text('비고:', 30, doc.y);
          doc.fontSize(7).text(orderData.notes, 30, doc.y + 10);
        }
        
        // 첨부파일 정보
        if (orderData.hasAttachments) {
          doc.moveDown(0.5);
          doc.fontSize(8).text(`첨부파일: ${orderData.attachmentCount}개`, 30, doc.y);
        }
        
        // 서명란
        doc.moveDown(1);
        const signY = doc.y;
        const signBoxWidth = 100;
        const signBoxHeight = 40;
        
        ['담당', '검토', '팀장', '임원', '대표'].forEach((title, index) => {
          const x = 30 + (index * 105);
          doc.rect(x, signY, signBoxWidth, signBoxHeight).stroke();
          doc.fontSize(8).text(title, x + 40, signY + 5);
        });
        
        // 회사 정보
        doc.moveDown(2);
        doc.fontSize(8);
        doc.text(orderData.companyName || '발주업체', { align: 'center' });
        doc.fontSize(7);
        doc.text(orderData.companyAddress || '', { align: 'center' });
        doc.text(`TEL: ${orderData.companyPhone || ''} | FAX: ${orderData.companyFax || ''}`, { align: 'center' });
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }
}