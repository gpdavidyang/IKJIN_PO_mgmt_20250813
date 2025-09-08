import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { db } from '../db';
import { attachments, users, companies, vendors, projects, purchaseOrders, purchaseOrderItems, emailSendHistory } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * 포괄적인 발주서 PDF 데이터 모델
 * 데이터베이스의 모든 관련 정보를 활용하여 전문적인 발주서 생성
 */
export interface ComprehensivePurchaseOrderData {
  // === 기본 발주 정보 ===
  orderNumber: string;
  orderDate: Date;
  deliveryDate?: Date | null;
  createdAt?: Date;
  
  // === 발주업체 정보 (회사) ===
  issuerCompany: {
    name: string;
    businessNumber?: string;
    representative?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  
  // === 수주업체 정보 (거래처) ===
  vendorCompany: {
    name: string;
    businessNumber?: string;
    representative?: string;
    address?: string;
    phone?: string;
    email?: string;
    contactPerson?: string;
  };
  
  // === 현장 정보 ===
  project: {
    name: string;
    code?: string;
    location?: string;
    projectManager?: string;
    projectManagerContact?: string;
    orderManager?: string;
    orderManagerContact?: string;
  };
  
  // === 작성자/담당자 정보 ===
  creator: {
    name: string;
    email?: string;
    phone?: string;
    position?: string;
  };
  
  // === 품목 정보 ===
  items: Array<{
    sequenceNo: number;
    name: string;
    specification?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    totalPrice: number;
    deliveryLocation?: string;
    deliveryEmail?: string;
    remarks?: string;
  }>;
  
  // === 금액 정보 ===
  financial: {
    subtotalAmount: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
    discountAmount?: number;
    currencyCode: string;
  };
  
  // === 기타 정보 ===
  metadata: {
    notes?: string;
    documentId: string;
    generatedAt: Date;
    generatedBy: string;
    templateVersion: string;
  };
}

/**
 * 전문적인 PDF 생성 서비스 - PDFKit 기반
 * 삼성물산/현대건설 스타일의 전문적인 발주서 생성
 */
export class ProfessionalPDFGenerationService {
  // 색상 정의 - 네이비/그레이 톤
  private static readonly COLORS = {
    navy: '#1e3a5f',        // 메인 네이비
    darkNavy: '#0f2340',    // 진한 네이비
    gray: '#6b7280',        // 중간 그레이
    lightGray: '#f3f4f6',   // 연한 그레이
    borderGray: '#d1d5db',  // 테두리 그레이
    black: '#000000',
    white: '#ffffff',
    blue: '#2563eb',        // 포인트 블루
  };

  // 폰트 설정
  private static readonly FONTS = {
    regular: 'NotoSansKR-Regular',
    bold: 'NotoSansKR-Bold',
    medium: 'NotoSansKR-Medium',
  };

  // 레이아웃 설정 - 더 컴팩트하게 조정
  private static readonly LAYOUT = {
    pageWidth: 595.28,     // A4 width in points
    pageHeight: 841.89,    // A4 height in points
    margin: 30,            // 페이지 여백 (40->30)
    headerHeight: 60,      // 헤더 높이 (80->60)
    footerHeight: 50,      // 푸터 높이 (60->50)
    sectionGap: 10,        // 섹션 간격 (15->10)
    cellPadding: 5,        // 셀 패딩 (8->5)
  };

  /**
   * 전문적인 PDF 생성
   */
  static async generateProfessionalPDF(orderData: ComprehensivePurchaseOrderData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: this.LAYOUT.margin,
          bufferPages: true,
          info: {
            Title: `구매발주서 ${orderData.orderNumber}`,
            Author: orderData.issuerCompany.name,
            Subject: '구매발주서',
            Creator: 'IKJIN PO Management System',
            Producer: 'PDFKit',
            CreationDate: new Date(),
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // 한글 폰트 등록
        await this.registerKoreanFonts(doc);

        // 메인 콘텐츠 렌더링
        await this.renderContent(doc, orderData);

        doc.end();
      } catch (error) {
        console.error('PDF generation error:', error);
        reject(error);
      }
    });
  }

  /**
   * 한글 폰트 등록
   */
  private static async registerKoreanFonts(doc: PDFDocument): Promise<void> {
    try {
      const fontsDir = path.join(process.cwd(), 'server', 'assets', 'fonts');
      
      // 폰트 파일 경로
      const fontPaths = {
        regular: path.join(fontsDir, 'NotoSansKR-Regular.ttf'),
        bold: path.join(fontsDir, 'NotoSansKR-Bold.ttf'),
        medium: path.join(fontsDir, 'NotoSansKR-Medium.ttf'),
      };

      // 폰트 파일 존재 확인 및 등록
      for (const [key, fontPath] of Object.entries(fontPaths)) {
        if (fs.existsSync(fontPath)) {
          doc.registerFont(this.FONTS[key as keyof typeof this.FONTS], fontPath);
        } else {
          console.warn(`Font file not found: ${fontPath}`);
          // 폴백으로 기본 폰트 사용
          doc.registerFont(this.FONTS[key as keyof typeof this.FONTS], 'Helvetica');
        }
      }
    } catch (error) {
      console.error('Font registration error:', error);
      // 폴백으로 기본 폰트 사용
      doc.registerFont(this.FONTS.regular, 'Helvetica');
      doc.registerFont(this.FONTS.bold, 'Helvetica-Bold');
      doc.registerFont(this.FONTS.medium, 'Helvetica');
    }
  }

  /**
   * 메인 콘텐츠 렌더링
   */
  private static async renderContent(doc: PDFDocument, orderData: ComprehensivePurchaseOrderData): Promise<void> {
    let currentY = this.LAYOUT.margin;

    // 1. 헤더 렌더링
    currentY = this.renderHeader(doc, orderData, currentY);
    currentY += this.LAYOUT.sectionGap;

    // 2. 업체 정보 (2단 레이아웃)
    currentY = this.renderCompanyInfo(doc, orderData, currentY);
    currentY += this.LAYOUT.sectionGap;

    // 3. 현장 및 일정 정보
    currentY = this.renderProjectInfo(doc, orderData, currentY);
    currentY += this.LAYOUT.sectionGap;

    // 4. 품목 테이블
    currentY = this.renderItemsTable(doc, orderData, currentY);
    currentY += this.LAYOUT.sectionGap;

    // 5. 금액 요약
    currentY = this.renderFinancialSummary(doc, orderData, currentY);
    currentY += this.LAYOUT.sectionGap;

    // 6. 특이사항
    if (orderData.metadata.notes) {
      currentY = this.renderNotes(doc, orderData, currentY);
    }

    // 7. 푸터 (페이지 하단 고정)
    this.renderFooter(doc, orderData);
  }

  /**
   * 헤더 렌더링 - 제목과 발주번호
   */
  private static renderHeader(doc: PDFDocument, orderData: ComprehensivePurchaseOrderData, y: number): number {
    
    // 제목과 발주번호를 한 줄에 컴팩트하게
    doc.font(this.FONTS.bold)
       .fontSize(20)
       .fillColor(this.COLORS.darkNavy)
       .text('구매발주서', this.LAYOUT.margin, y);

    // 발주번호 박스 - 오른쪽 상단
    const orderNumText = orderData.orderNumber;
    const boxWidth = 120;
    const boxHeight = 25;
    const boxX = this.LAYOUT.pageWidth - this.LAYOUT.margin - boxWidth;
    
    doc.rect(boxX, y, boxWidth, boxHeight)
       .fillColor(this.COLORS.lightGray)
       .fill();
    
    doc.font(this.FONTS.medium)
       .fontSize(10)
       .fillColor(this.COLORS.darkNavy)
       .text(orderNumText, boxX, y + 8, {
         width: boxWidth,
         align: 'center'
       });

    // 발주일자 - 발주번호 박스 아래
    const dateText = format(orderData.orderDate, 'yyyy-MM-dd');
    doc.font(this.FONTS.regular)
       .fontSize(9)
       .fillColor(this.COLORS.gray)
       .text(dateText, boxX, y + boxHeight + 3, {
         width: boxWidth,
         align: 'center'
       });

    // 헤더 하단 선
    const lineY = y + 40;
    doc.moveTo(this.LAYOUT.margin, lineY)
       .lineTo(this.LAYOUT.pageWidth - this.LAYOUT.margin, lineY)
       .strokeColor(this.COLORS.navy)
       .lineWidth(1.5)
       .stroke();

    return lineY;
  }

  /**
   * 업체 정보 렌더링 - 2단 레이아웃
   */
  private static renderCompanyInfo(doc: PDFDocument, orderData: ComprehensivePurchaseOrderData, y: number): number {
    const columnWidth = (this.LAYOUT.pageWidth - (this.LAYOUT.margin * 2) - 20) / 2;
    const startY = y;
    
    // 발주업체 (왼쪽)
    let leftY = this.renderCompanyBox(
      doc,
      '발주업체',
      orderData.issuerCompany,
      this.LAYOUT.margin,
      y,
      columnWidth
    );

    // 수주업체 (오른쪽)
    let rightY = this.renderCompanyBox(
      doc,
      '수주업체',
      orderData.vendorCompany,
      this.LAYOUT.margin + columnWidth + 20,
      y,
      columnWidth
    );

    return Math.max(leftY, rightY);
  }

  /**
   * 회사 정보 박스 렌더링
   */
  private static renderCompanyBox(
    doc: PDFDocument,
    title: string,
    company: any,
    x: number,
    y: number,
    width: number
  ): number {
    // 박스 헤더
    doc.rect(x, y, width, 25)
       .fillColor(this.COLORS.navy)
       .fill();

    doc.font(this.FONTS.bold)
       .fontSize(10)
       .fillColor(this.COLORS.white)
       .text(title, x + 8, y + 7);

    // 박스 본문
    const contentY = y + 25;
    const boxHeight = 85; // 고정 높이로 컴팩트하게
    doc.rect(x, contentY, width, boxHeight)
       .strokeColor(this.COLORS.borderGray)
       .lineWidth(0.5)
       .stroke();

    let currentY = contentY + 8;
    const fontSize = 8;
    const lineHeight = 13;

    // 회사 정보 렌더링
    const renderField = (label: string, value?: string) => {
      if (value) {
        doc.font(this.FONTS.medium)
           .fontSize(fontSize)
           .fillColor(this.COLORS.gray)
           .text(label, x + 10, currentY, { continued: true })
           .font(this.FONTS.regular)
           .fillColor(this.COLORS.black)
           .text(` ${value}`, { width: width - 20 });
        currentY += lineHeight;
      }
    };

    // 필수 정보만 표시하여 컴팩트하게
    renderField('업체명:', company.name);
    renderField('사업자번호:', company.businessNumber);
    renderField('대표자:', company.representative);
    if (company.contactPerson) renderField('담당자:', company.contactPerson);
    renderField('연락처:', company.phone);
    if (company.email && currentY < contentY + boxHeight - lineHeight) {
      renderField('이메일:', company.email);
    }

    return contentY + boxHeight;
  }

  /**
   * 현장 정보 렌더링
   */
  private static renderProjectInfo(doc: PDFDocument, orderData: ComprehensivePurchaseOrderData, y: number): number {
    const pageWidth = this.LAYOUT.pageWidth - (this.LAYOUT.margin * 2);
    
    // 섹션 헤더
    doc.rect(this.LAYOUT.margin, y, pageWidth, 20)
       .fillColor(this.COLORS.lightGray)
       .fill();

    doc.font(this.FONTS.bold)
       .fontSize(9)
       .fillColor(this.COLORS.darkNavy)
       .text('현장 정보', this.LAYOUT.margin + 8, y + 6);

    // 정보 표시 (3열) - 더 컴팩트하게
    const contentY = y + 20;
    const colWidth = pageWidth / 3;
    
    const renderInfo = (label: string, value: string | undefined, x: number, y: number) => {
      doc.font(this.FONTS.medium)
         .fontSize(9)
         .fillColor(this.COLORS.gray)
         .text(label, x + 10, y, { continued: true })
         .font(this.FONTS.regular)
         .fillColor(this.COLORS.black)
         .text(` ${value || '-'}`, { width: colWidth - 20 });
    };

    renderInfo('현장명:', orderData.project.name, this.LAYOUT.margin, contentY + 5);
    renderInfo('현장코드:', orderData.project.code, this.LAYOUT.margin + colWidth, contentY + 5);
    renderInfo('담당자:', orderData.creator.name, this.LAYOUT.margin + colWidth * 2, contentY + 5);

    renderInfo('발주일:', format(orderData.orderDate, 'yyyy-MM-dd'), this.LAYOUT.margin, contentY + 18);
    renderInfo('납기일:', orderData.deliveryDate ? format(orderData.deliveryDate, 'yyyy-MM-dd') : '-', this.LAYOUT.margin + colWidth, contentY + 18);
    renderInfo('연락처:', orderData.creator.phone, this.LAYOUT.margin + colWidth * 2, contentY + 18);

    return contentY + 35;
  }

  /**
   * 품목 테이블 렌더링
   */
  private static renderItemsTable(doc: PDFDocument, orderData: ComprehensivePurchaseOrderData, y: number): number {
    const pageWidth = this.LAYOUT.pageWidth - (this.LAYOUT.margin * 2);
    
    // 테이블 헤더
    const headerHeight = 28;
    doc.rect(this.LAYOUT.margin, y, pageWidth, headerHeight)
       .fillColor(this.COLORS.navy)
       .fill();

    // 컬럼 정의 - 너비 최적화
    const columns = [
      { label: '순번', width: 35, align: 'center' },
      { label: '품목명', width: 155, align: 'left' },
      { label: '규격', width: 95, align: 'left' },
      { label: '수량', width: 45, align: 'center' },
      { label: '단위', width: 35, align: 'center' },
      { label: '단가', width: 85, align: 'right' },
      { label: '금액', width: 95, align: 'right' },
      { label: '비고', width: 40, align: 'center' },
    ];

    // 헤더 텍스트
    let currentX = this.LAYOUT.margin;
    columns.forEach(col => {
      doc.font(this.FONTS.bold)
         .fontSize(9)
         .fillColor(this.COLORS.white)
         .text(col.label, currentX + 3, y + 9, {
           width: col.width - 6,
           align: col.align as any,
         });
      currentX += col.width;
    });

    // 테이블 본문
    let currentY = y + headerHeight;
    orderData.items.forEach((item, index) => {
      const rowHeight = 25; // 행 높이 줄임
      const isEvenRow = index % 2 === 0;
      
      // 행 배경색 (교차)
      if (isEvenRow) {
        doc.rect(this.LAYOUT.margin, currentY, pageWidth, rowHeight)
           .fillColor(this.COLORS.lightGray)
           .fill();
      }

      // 행 데이터
      currentX = this.LAYOUT.margin;
      const values = [
        item.sequenceNo.toString(),
        item.name,
        item.specification || '-',
        item.quantity.toString(),
        item.unit || '-',
        `₩${item.unitPrice.toLocaleString('ko-KR')}`,
        `₩${item.totalPrice.toLocaleString('ko-KR')}`,
        item.remarks || '-',
      ];

      values.forEach((value, i) => {
        doc.font(this.FONTS.regular)
           .fontSize(8)
           .fillColor(this.COLORS.black)
           .text(value, currentX + 3, currentY + 8, {
             width: columns[i].width - 6,
             align: columns[i].align as any,
             ellipsis: true
           });
        currentX += columns[i].width;
      });

      // 행 구분선
      doc.moveTo(this.LAYOUT.margin, currentY + rowHeight)
         .lineTo(this.LAYOUT.pageWidth - this.LAYOUT.margin, currentY + rowHeight)
         .strokeColor(this.COLORS.borderGray)
         .lineWidth(0.5)
         .stroke();

      currentY += rowHeight;
    });

    return currentY;
  }

  /**
   * 금액 요약 렌더링
   */
  private static renderFinancialSummary(doc: PDFDocument, orderData: ComprehensivePurchaseOrderData, y: number): number {
    const summaryWidth = 250;
    const summaryX = this.LAYOUT.pageWidth - this.LAYOUT.margin - summaryWidth;
    
    const rows = [
      { label: '소계 (부가세 별도)', value: `₩${orderData.financial.subtotalAmount.toLocaleString('ko-KR')}` },
      { label: `부가세 (${orderData.financial.vatRate}%)`, value: `₩${orderData.financial.vatAmount.toLocaleString('ko-KR')}` },
    ];

    let currentY = y;
    const rowHeight = 22; // 금액 요약 행 높이 줄임

    // 일반 행
    rows.forEach(row => {
      doc.rect(summaryX, currentY, summaryWidth, rowHeight)
         .strokeColor(this.COLORS.borderGray)
         .lineWidth(0.5)
         .stroke();

      doc.font(this.FONTS.regular)
         .fontSize(10)
         .fillColor(this.COLORS.gray)
         .text(row.label, summaryX + 10, currentY + 8);

      doc.font(this.FONTS.regular)
         .fontSize(10)
         .fillColor(this.COLORS.black)
         .text(row.value, summaryX + 10, currentY + 8, {
           width: summaryWidth - 20,
           align: 'right',
         });

      currentY += rowHeight;
    });

    // 총 금액 (강조)
    doc.rect(summaryX, currentY, summaryWidth, 30)
       .fillColor(this.COLORS.navy)
       .fill();

    doc.font(this.FONTS.bold)
       .fontSize(10)
       .fillColor(this.COLORS.white)
       .text('총 금액', summaryX + 10, currentY + 10);

    doc.font(this.FONTS.bold)
       .fontSize(12)
       .fillColor(this.COLORS.white)
       .text(`₩${orderData.financial.totalAmount.toLocaleString('ko-KR')}`, summaryX + 10, currentY + 9, {
         width: summaryWidth - 20,
         align: 'right',
       });

    return currentY + 30;
  }

  /**
   * 특이사항 렌더링
   */
  private static renderNotes(doc: PDFDocument, orderData: ComprehensivePurchaseOrderData, y: number): number {
    if (!orderData.metadata.notes) return y;

    const pageWidth = this.LAYOUT.pageWidth - (this.LAYOUT.margin * 2);
    
    doc.font(this.FONTS.bold)
       .fontSize(10)
       .fillColor(this.COLORS.darkNavy)
       .text('특이사항', this.LAYOUT.margin, y);

    // 특이사항을 더 컴팩트하게
    const notesHeight = 50;
    doc.rect(this.LAYOUT.margin, y + 15, pageWidth, notesHeight)
       .strokeColor(this.COLORS.borderGray)
       .lineWidth(0.5)
       .stroke();

    doc.font(this.FONTS.regular)
       .fontSize(8)
       .fillColor(this.COLORS.black)
       .text(orderData.metadata.notes, this.LAYOUT.margin + 8, y + 20, {
         width: pageWidth - 16,
         height: notesHeight - 10,
         ellipsis: true
       });

    return y + 15 + notesHeight;
  }

  /**
   * 푸터 렌더링 - 페이지 하단 고정
   */
  private static renderFooter(doc: PDFDocument, orderData: ComprehensivePurchaseOrderData): void {
    const footerY = this.LAYOUT.pageHeight - this.LAYOUT.footerHeight - this.LAYOUT.margin;
    const pageWidth = this.LAYOUT.pageWidth - (this.LAYOUT.margin * 2);

    // 푸터 상단 선
    doc.moveTo(this.LAYOUT.margin, footerY)
       .lineTo(this.LAYOUT.pageWidth - this.LAYOUT.margin, footerY)
       .strokeColor(this.COLORS.borderGray)
       .lineWidth(0.5)
       .stroke();

    // 회사 정보
    doc.font(this.FONTS.bold)
       .fontSize(10)
       .fillColor(this.COLORS.darkNavy)
       .text(orderData.issuerCompany.name, this.LAYOUT.margin, footerY + 10);

    // 푸터 정보를 한 줄로 컴팩트하게
    const footerInfo = [
      orderData.issuerCompany.address,
      `TEL: ${orderData.issuerCompany.phone}`,
      `사업자번호: ${orderData.issuerCompany.businessNumber}`,
    ].filter(Boolean).join(' | ');

    doc.font(this.FONTS.regular)
       .fontSize(7)
       .fillColor(this.COLORS.gray)
       .text(footerInfo, this.LAYOUT.margin, footerY + 20, {
         width: pageWidth,
       });

    // 문서 정보
    const docInfo = `생성일시: ${format(orderData.metadata.generatedAt, 'yyyy-MM-dd HH:mm')} | ${orderData.metadata.templateVersion}`;
    doc.font(this.FONTS.regular)
       .fontSize(6)
       .fillColor(this.COLORS.gray)
       .text(docInfo, this.LAYOUT.margin, footerY + 32, {
         width: pageWidth,
         align: 'right',
       });
  }

  /**
   * 데이터베이스에서 발주 데이터 조회 및 PDF 생성
   */
  static async generatePDFFromOrder(orderId: number): Promise<Buffer> {
    try {
      // 발주 정보 조회
      const orderResult = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, orderId))
        .limit(1);

      if (!orderResult.length) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const order = orderResult[0];

      // 관련 데이터 조회
      const [companyData, vendorData, projectData, userData, itemsData] = await Promise.all([
        order.companyId ? db.select().from(companies).where(eq(companies.id, order.companyId)).limit(1) : [null],
        order.vendorId ? db.select().from(vendors).where(eq(vendors.id, order.vendorId)).limit(1) : [null],
        order.projectId ? db.select().from(projects).where(eq(projects.id, order.projectId)).limit(1) : [null],
        order.userId ? db.select().from(users).where(eq(users.id, order.userId)).limit(1) : [null],
        db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, orderId)),
      ]);

      const company = companyData[0];
      const vendor = vendorData[0];
      const project = projectData[0];
      const user = userData[0];

      // ComprehensivePurchaseOrderData 구성
      const orderData: ComprehensivePurchaseOrderData = {
        orderNumber: order.orderNumber || `PO-${orderId}`,
        orderDate: order.orderDate || new Date(),
        deliveryDate: order.deliveryDate,
        createdAt: order.createdAt || new Date(),
        
        issuerCompany: {
          name: company?.name || '(주)익진엔지니어링',
          businessNumber: company?.businessNumber || '123-45-67890',
          representative: company?.representative || '박현호',
          address: company?.address || '서울시 강남구 테헤란로 124 삼원타워 9층',
          phone: company?.phone || '02-1234-5678',
          email: company?.email || 'contact@ikjin.com',
        },
        
        vendorCompany: {
          name: vendor?.name || '거래처명',
          businessNumber: vendor?.businessNumber,
          representative: vendor?.representative,
          address: vendor?.address,
          phone: vendor?.phone,
          email: vendor?.email,
          contactPerson: vendor?.contactPerson,
        },
        
        project: {
          name: project?.name || '프로젝트명',
          code: project?.code,
          location: project?.location,
        },
        
        creator: {
          name: user?.name || '작성자',
          email: user?.email || undefined,
          phone: user?.phone || undefined,
          position: user?.position || undefined,
        },
        
        items: itemsData.map((item, index) => ({
          sequenceNo: index + 1,
          name: item.name || '품목명',
          specification: item.specification || undefined,
          quantity: item.quantity || 1,
          unit: item.unit || undefined,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || 0,
          remarks: item.remarks || undefined,
        })),
        
        financial: {
          subtotalAmount: order.subtotalAmount || 0,
          vatRate: 10,
          vatAmount: order.vatAmount || 0,
          totalAmount: order.totalAmount || 0,
          currencyCode: 'KRW',
        },
        
        metadata: {
          notes: order.notes || undefined,
          documentId: `DOC-${orderId}-${Date.now()}`,
          generatedAt: new Date(),
          generatedBy: 'System',
          templateVersion: 'Professional v3.0.0',
        },
      };

      // PDF 생성
      const pdfBuffer = await this.generateProfessionalPDF(orderData);

      // 생성 이력 저장
      if (user?.id) {
        await db.insert(emailSendHistory).values({
          orderId,
          userId: user.id,
          recipientEmail: vendor?.email || '',
          recipientName: vendor?.name || '',
          subject: `구매발주서 - ${orderData.orderNumber}`,
          body: 'PDF 생성됨',
          status: 'generated',
          sentAt: new Date(),
          attachmentPaths: [`purchase_order_${orderData.orderNumber}.pdf`],
        });
      }

      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF from order:', error);
      throw error;
    }
  }

  /**
   * 발주서 미리보기용 샘플 데이터로 PDF 생성
   */
  static async generateSamplePDF(): Promise<Buffer> {
    const sampleData: ComprehensivePurchaseOrderData = {
      orderNumber: 'PO-2025-SAMPLE',
      orderDate: new Date(),
      deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14일 후
      createdAt: new Date(),
      
      issuerCompany: {
        name: '(주)익진엔지니어링',
        businessNumber: '123-45-67890',
        representative: '박현호',
        address: '서울시 강남구 테헤란로 124 삼원타워 9층',
        phone: '02-1234-5678',
        email: 'contact@ikjin.com',
      },
      
      vendorCompany: {
        name: '삼성물산(주)',
        businessNumber: '987-65-43210',
        representative: '김대표',
        address: '서울시 서초구 서초대로 74길 11',
        phone: '02-2145-5678',
        email: 'vendor@samsung.com',
        contactPerson: '이과장',
      },
      
      project: {
        name: '래미안 원베일리 신축공사',
        code: 'PRJ-2025-001',
        location: '서울시 강남구',
      },
      
      creator: {
        name: '홍길동',
        email: 'hong@ikjin.com',
        phone: '010-1234-5678',
        position: '과장',
      },
      
      items: [
        {
          sequenceNo: 1,
          name: '철근 SD400 D10',
          specification: 'KS D 3504',
          quantity: 100,
          unit: 'TON',
          unitPrice: 850000,
          totalPrice: 85000000,
          remarks: '긴급',
        },
        {
          sequenceNo: 2,
          name: '레미콘 25-24-150',
          specification: 'KS F 4009',
          quantity: 500,
          unit: 'M3',
          unitPrice: 75000,
          totalPrice: 37500000,
          remarks: '',
        },
        {
          sequenceNo: 3,
          name: '거푸집용 합판',
          specification: '12T',
          quantity: 200,
          unit: '장',
          unitPrice: 25000,
          totalPrice: 5000000,
          remarks: '방수처리',
        },
      ],
      
      financial: {
        subtotalAmount: 127500000,
        vatRate: 10,
        vatAmount: 12750000,
        totalAmount: 140250000,
        currencyCode: 'KRW',
      },
      
      metadata: {
        notes: '1. 납품 시 품질시험 성적서를 첨부하여 주시기 바랍니다.\n2. 대금 지급은 월말 마감 후 익월 25일 현금 지급입니다.\n3. 현장 반입 시 안전관리자와 사전 협의 바랍니다.',
        documentId: 'DOC-SAMPLE-001',
        generatedAt: new Date(),
        generatedBy: 'System',
        templateVersion: 'Professional v3.0.0',
      },
    };

    return await this.generateProfessionalPDF(sampleData);
  }
}

export default ProfessionalPDFGenerationService;