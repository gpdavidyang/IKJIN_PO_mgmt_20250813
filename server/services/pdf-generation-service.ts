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
  private static uploadDir = process.env.VERCEL 
    ? '/tmp/pdf' // Vercel only allows writing to /tmp
    : path.join(process.cwd(), 'uploads/pdf');

  /**
   * 발주서 PDF 생성 및 첨부파일 등록
   */
  static async generatePurchaseOrderPDF(
    orderId: number,
    orderData: PurchaseOrderPDFData,
    userId: string
  ): Promise<{ success: boolean; pdfPath?: string; attachmentId?: number; error?: string; pdfBuffer?: Buffer }> {
    try {
      console.log(`📄 [PDFGenerator] 발주서 PDF 생성 시작: Order ID ${orderId}`);

      const timestamp = Date.now();
      const fileName = `PO_${orderData.orderNumber}_${timestamp}.pdf`;

      // PDF 생성 방식 선택
      let pdfBuffer: Buffer;
      
      // Initialize tempDir for local environment (needed for file saving later)
      const tempDir = path.join(this.uploadDir, String(new Date().getFullYear()), String(new Date().getMonth() + 1).padStart(2, '0'));
      
      if (process.env.VERCEL) {
        // Vercel: 브라우저 없이 직접 PDF 생성 (더 안정적)
        console.log('📄 [PDFGenerator] Vercel 환경: PDFKit으로 PDF 직접 생성');
        pdfBuffer = await this.generatePDFWithPDFKit(orderData);
      } else {
        // 로컬: HTML 템플릿을 통한 PDF 생성
        console.log('📄 [PDFGenerator] 로컬 환경: HTML 템플릿으로 PDF 생성');
        
        // 로컬 환경에서만 디렉토리 생성
        console.log(`📁 [PDFGenerator] 디렉토리 생성 중: ${tempDir}`);
        
        if (!fs.existsSync(tempDir)) {
          try {
            fs.mkdirSync(tempDir, { recursive: true });
            console.log(`✅ [PDFGenerator] 디렉토리 생성 완료: ${tempDir}`);
          } catch (dirError) {
            console.error(`❌ [PDFGenerator] 디렉토리 생성 실패: ${tempDir}`, dirError);
            throw new Error(`디렉토리 생성 실패: ${dirError instanceof Error ? dirError.message : 'Unknown error'}`);
          }
        }
        
        const htmlContent = this.generateHTMLTemplate(orderData);
        pdfBuffer = await this.convertHTMLToPDFFromString(htmlContent);
      }
      
      let filePath = '';
      let attachmentId: number;

      if (process.env.VERCEL) {
        // Vercel 환경: PDF 데이터를 Base64로 DB에 직접 저장
        const base64Data = pdfBuffer.toString('base64');
        
        let attachment;
        try {
          [attachment] = await db.db.insert(attachments).values({
            orderId,
            originalName: fileName,
            storedName: fileName,
            filePath: `db://${fileName}`, // DB 저장 위치 표시
            fileSize: pdfBuffer.length,
            mimeType: 'application/pdf',
            uploadedBy: userId,
            fileData: base64Data // PDF 데이터를 Base64로 DB에 저장
          }).returning();
        } catch (error) {
          // Fallback: save without fileData for older schema compatibility
          console.warn('Failed to save with fileData, using fallback:', error);
          [attachment] = await db.db.insert(attachments).values({
            orderId,
            originalName: fileName,
            storedName: fileName,
            filePath: `db://${fileName}`,
            fileSize: pdfBuffer.length,
            mimeType: 'application/pdf',
            uploadedBy: userId,
          }).returning();
        }
        
        attachmentId = attachment.id;
        filePath = `db://${fileName}`;
        
        console.log(`✅ [PDFGenerator] PDF 생성 완료 (DB 저장): ${fileName}, Attachment ID: ${attachment.id}, 크기: ${Math.round(base64Data.length / 1024)}KB`);
      } else {
        // 로컬 환경: 파일 시스템에 저장 + Base64 백업
        filePath = path.join(tempDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);
        
        // Also save Base64 data as backup for Vercel deployment
        const base64Data = pdfBuffer.toString('base64');
        
        let attachment;
        try {
          [attachment] = await db.db.insert(attachments).values({
            orderId,
            originalName: fileName,
            storedName: fileName,
            filePath: `db://${fileName}`, // Changed to use db:// prefix for consistency
            fileSize: pdfBuffer.length,
            mimeType: 'application/pdf',
            uploadedBy: userId,
            fileData: base64Data // Save Base64 data for Vercel compatibility
          }).returning();
        } catch (error) {
          // Fallback: save without fileData for older schema compatibility
          console.warn('Failed to save with fileData, using fallback:', error);
          [attachment] = await db.db.insert(attachments).values({
            orderId,
            originalName: fileName,
            storedName: fileName,
            filePath: filePath, // Use original filesystem path as fallback
            fileSize: pdfBuffer.length,
            mimeType: 'application/pdf',
            uploadedBy: userId,
          }).returning();
        }
        
        attachmentId = attachment.id;
        console.log(`✅ [PDFGenerator] PDF 생성 완료: ${filePath}, Attachment ID: ${attachment.id}`);
      }

      return {
        success: true,
        pdfPath: filePath,
        attachmentId,
        pdfBuffer: process.env.VERCEL ? pdfBuffer : undefined
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
   * HTML을 PDF로 변환 (Playwright 사용 - 파일 기반)
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
   * PDF를 순수 JavaScript로 생성 (브라우저 의존성 제거)
   */
  private static async convertHTMLToPDFFromString(htmlContent: string): Promise<Buffer> {
    if (process.env.VERCEL) {
      // Vercel 환경: PDFKit으로 직접 PDF 생성 (브라우저 불필요)
      return await this.generatePDFWithPDFKit(htmlContent);
    } else {
      // 로컬 환경: 기존 Playwright 사용
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
      } catch (playwrightError) {
        console.warn('⚠️ Playwright 실패, PDFKit으로 대체:', playwrightError);
        // 로컬에서도 Playwright 실패 시 PDFKit 사용
        return await this.generatePDFWithPDFKit(htmlContent);
      }
    }
  }

  /**
   * PDFKit으로 발주서 PDF 직접 생성 (브라우저 의존성 제거)
   */
  private static async generatePDFWithPDFKit(orderData: PurchaseOrderPDFData): Promise<Buffer> {
    const PDFKitDocument = (await import('pdfkit')).default;
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFKitDocument({ 
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // 한글 폰트 설정 (기본 폰트 사용)
        doc.font('Helvetica');
        
        // 제목
        doc.fontSize(20).text('구매 발주서', { align: 'center' });
        doc.fontSize(12).text('Purchase Order', { align: 'center' });
        doc.moveDown(2);
        
        // 날짜 포맷팅 함수
        const formatDate = (date?: Date | null) => {
          if (!date) return '-';
          return format(new Date(date), 'yyyy년 MM월 dd일', { locale: ko });
        };

        // 금액 포맷팅 함수
        const formatCurrency = (amount: number) => {
          return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
          }).format(amount);
        };
        
        // 발주서 정보 섹션
        const startY = doc.y;
        doc.fontSize(10);
        
        // 좌측 정보
        doc.text(`발주서 번호: ${orderData.orderNumber}`, 50, startY);
        doc.text(`작성일: ${formatDate(orderData.orderDate)}`, 50, startY + 20);
        doc.text(`거래처: ${orderData.vendorName || '-'}`, 50, startY + 40);
        doc.text(`담당자: ${orderData.vendorContact || '-'}`, 50, startY + 60);
        
        // 우측 정보  
        doc.text(`프로젝트: ${orderData.projectName || '-'}`, 300, startY);
        doc.text(`현장: ${orderData.site || '-'}`, 300, startY + 20);
        doc.text(`납기일: ${formatDate(orderData.deliveryDate)}`, 300, startY + 40);
        doc.text(`총 금액: ${formatCurrency(orderData.totalAmount)}`, 300, startY + 60);
        
        doc.moveDown(5);
        
        // 구분선
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);
        
        // 품목 테이블 헤더
        const tableTop = doc.y;
        doc.fontSize(9);
        
        // 헤더 배경
        doc.rect(50, tableTop, 495, 15).fill('#f0f0f0');
        
        // 헤더 텍스트
        doc.fillColor('black');
        doc.text('No', 55, tableTop + 3);
        doc.text('품목명', 90, tableTop + 3);
        doc.text('규격', 220, tableTop + 3);
        doc.text('수량', 290, tableTop + 3);
        doc.text('단위', 330, tableTop + 3);
        doc.text('단가', 370, tableTop + 3);
        doc.text('금액', 430, tableTop + 3);
        doc.text('납품처', 490, tableTop + 3);
        
        // 테이블 경계선
        doc.rect(50, tableTop, 495, 15).stroke();
        doc.moveDown(1.2);
        
        // 품목 행들
        let currentY = doc.y;
        orderData.items.forEach((item, index) => {
          const rowHeight = 20;
          
          // 행 배경 (짝수 행)
          if (index % 2 === 0) {
            doc.rect(50, currentY, 495, rowHeight).fill('#f9f9f9');
            doc.fillColor('black');
          }
          
          // 품목 정보
          doc.text(`${index + 1}`, 55, currentY + 5);
          doc.text(item.name.substring(0, 15) + (item.name.length > 15 ? '...' : ''), 90, currentY + 5);
          doc.text((item.specification || '-').substring(0, 8), 220, currentY + 5);
          doc.text(item.quantity.toString(), 290, currentY + 5);
          doc.text(item.unit, 330, currentY + 5);
          doc.text(formatCurrency(item.unitPrice), 370, currentY + 5);
          doc.text(formatCurrency(item.price), 430, currentY + 5);
          doc.text(item.deliveryLocation?.substring(0, 6) || '-', 490, currentY + 5);
          
          // 행 경계선
          doc.rect(50, currentY, 495, rowHeight).stroke();
          
          currentY += rowHeight;
        });
        
        // 합계 행
        doc.rect(50, currentY, 495, 20).fill('#e0e0e0');
        doc.fillColor('black');
        doc.fontSize(10).text('합계', 55, currentY + 5);
        doc.text(formatCurrency(orderData.totalAmount), 430, currentY + 5);
        doc.rect(50, currentY, 495, 20).stroke();
        
        doc.moveDown(2);
        
        // 특이사항
        if (orderData.notes) {
          doc.fontSize(10).text('특이사항:', 50, doc.y);
          doc.fontSize(9).text(orderData.notes, 50, doc.y + 15);
          doc.moveDown(2);
        }
        
        // 하단 서명란
        doc.moveDown(2);
        const signY = doc.y;
        const signBoxWidth = 80;
        const signBoxHeight = 50;
        
        ['담당', '공무', '팀장', '임원', '사장'].forEach((title, index) => {
          const x = 50 + (index * 95);
          doc.rect(x, signY, signBoxWidth, signBoxHeight).stroke();
          doc.fontSize(9).text(title, x + 30, signY + 5);
        });
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
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