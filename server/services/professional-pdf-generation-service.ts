import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { db } from '../db';
import { attachments, users, companies, vendors, projects, purchaseOrders, purchaseOrderItems, emailSendHistory } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { fontManager } from '../utils/korean-font-manager';

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
  // 색상 정의 - 네이비/그레이 톤 (더 진하게)
  private static readonly COLORS = {
    navy: '#1e3a5f',        // 메인 네이비
    darkNavy: '#0f2340',    // 진한 네이비
    gray: '#374151',        // 중간 그레이 (더 진하게)
    lightGray: '#f3f4f6',   // 연한 그레이
    borderGray: '#9ca3af',  // 테두리 그레이 (더 진하게)
    black: '#000000',
    darkGray: '#1f2937',    // 진한 그레이 (텍스트용)
    white: '#ffffff',
    blue: '#2563eb',        // 포인트 블루
  };

  // 폰트 설정
  private static readonly FONTS = {
    regular: 'NotoSansKR-Regular',
    bold: 'NotoSansKR-Bold',
    medium: 'NotoSansKR-Medium',
  };

  // 레이아웃 설정 - 매우 컴팩트하게 조정
  private static readonly LAYOUT = {
    pageWidth: 595.28,     // A4 width in points
    pageHeight: 841.89,    // A4 height in points
    margin: 20,            // 페이지 여백 (30->20)
    headerHeight: 45,      // 헤더 높이 (60->45)
    footerHeight: 40,      // 푸터 높이 (50->40)
    sectionGap: 8,         // 섹션 간격 (10->8)
    cellPadding: 3,        // 셀 패딩 (5->3)
  };

  /**
   * 전문적인 PDF 생성 - 향상된 에러 처리로 Vercel 환경 대응
   */
  static async generateProfessionalPDF(orderData: ComprehensivePurchaseOrderData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      let doc: PDFDocument | null = null;
      
      try {
        console.log(`🚀 [PDF] PDF 생성 시작 - 발주번호: ${orderData.orderNumber}`);
        console.log(`📍 [PDF] 환경: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
        
        // PDFDocument 생성
        doc = new PDFDocument({
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
        let isResolved = false;

        // PDF 데이터 수집
        doc.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        // PDF 생성 완료 이벤트
        doc.on('end', () => {
          if (!isResolved) {
            isResolved = true;
            const pdfBuffer = Buffer.concat(chunks);
            console.log(`✅ [PDF] PDF 생성 완료 - 크기: ${Math.round(pdfBuffer.length / 1024)}KB`);
            resolve(pdfBuffer);
          }
        });

        // PDF 에러 이벤트
        doc.on('error', (error) => {
          if (!isResolved) {
            isResolved = true;
            console.error('❌ [PDF] PDFDocument 에러:', error);
            reject(error);
          }
        });

        // 한글 폰트 등록
        console.log('🎨 [PDF] 한글 폰트 등록 단계...');
        await this.registerKoreanFonts(doc);

        // 메인 콘텐츠 렌더링
        console.log('📄 [PDF] 콘텐츠 렌더링 단계...');
        await this.renderContent(doc, orderData);

        // PDF 생성 완료
        console.log('🏁 [PDF] 문서 생성 마무리...');
        doc.end();
        
        // 타임아웃 설정 (30초)
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            console.error('⏰ [PDF] PDF 생성 타임아웃');
            reject(new Error('PDF 생성 시간 초과'));
          }
        }, 30000);

      } catch (error) {
        console.error('💥 [PDF] PDF 생성 중 예외 발생:', error);
        console.error('📊 [PDF] 에러 스택:', error.stack);
        
        // PDFDocument가 생성되었다면 정리
        if (doc) {
          try {
            doc.end();
          } catch (cleanupError) {
            console.warn('⚠️ [PDF] 정리 중 에러:', cleanupError);
          }
        }
        
        // 상세한 에러 정보 제공
        if (error.message) {
          reject(new Error(`PDF 생성 실패: ${error.message}`));
        } else {
          reject(new Error('PDF 생성 중 알 수 없는 오류가 발생했습니다.'));
        }
      }
    });
  }

  /**
   * 한글 폰트 등록 - KoreanFontManager 사용으로 Vercel 환경 대응
   */
  private static async registerKoreanFonts(doc: PDFDocument): Promise<void> {
    try {
      console.log('🎯 [PDF] 한글 폰트 등록 시작...');
      
      // Korean Font Manager를 통해 최적의 폰트 얻기
      const bestFont = fontManager.getBestKoreanFont();
      
      if (bestFont && bestFont.available) {
        console.log(`✅ [PDF] 최적 한글 폰트 발견: ${bestFont.name}`);
        
        try {
          // FontManager에서 폰트 버퍼 가져오기
          const fontBuffer = fontManager.getFontBuffer(bestFont.name);
          
          if (fontBuffer) {
            // 폰트 버퍼를 PDFKit에 등록
            doc.registerFont(this.FONTS.regular, fontBuffer);
            doc.registerFont(this.FONTS.bold, fontBuffer); // 같은 폰트를 Bold로도 사용
            doc.registerFont(this.FONTS.medium, fontBuffer); // 같은 폰트를 Medium으로도 사용
            
            console.log(`✅ [PDF] 한글 폰트 등록 완료: ${bestFont.name}`);
            return;
          }
        } catch (bufferError) {
          console.warn(`⚠️ [PDF] 폰트 버퍼 등록 실패: ${bestFont.name}`, bufferError);
        }
      }
      
      console.log('⚠️ [PDF] 한글 폰트를 찾을 수 없음 - 시스템 폰트로 폴백');
      
      // 시스템 폰트 폴백 시도
      const systemFonts = [
        { name: 'AppleGothic', path: '/System/Library/Fonts/Supplemental/AppleGothic.ttf' },
        { name: 'AppleSDGothicNeo', path: '/System/Library/Fonts/AppleSDGothicNeo.ttc' },
      ];
      
      for (const systemFont of systemFonts) {
        try {
          if (fs.existsSync(systemFont.path)) {
            doc.registerFont(this.FONTS.regular, systemFont.path);
            doc.registerFont(this.FONTS.bold, systemFont.path);
            doc.registerFont(this.FONTS.medium, systemFont.path);
            console.log(`✅ [PDF] 시스템 폰트 등록: ${systemFont.name}`);
            return;
          }
        } catch (systemError) {
          continue;
        }
      }
      
      // 최후 폴백: 기본 폰트
      console.log('🚨 [PDF] 모든 한글 폰트 실패 - 기본 폰트 사용');
      doc.registerFont(this.FONTS.regular, 'Helvetica');
      doc.registerFont(this.FONTS.bold, 'Helvetica-Bold');
      doc.registerFont(this.FONTS.medium, 'Helvetica');
      
    } catch (error) {
      console.error('❌ [PDF] 폰트 등록 중 예외 발생:', error);
      
      // 최종 폴백
      try {
        doc.registerFont(this.FONTS.regular, 'Helvetica');
        doc.registerFont(this.FONTS.bold, 'Helvetica-Bold');
        doc.registerFont(this.FONTS.medium, 'Helvetica');
        console.log('🔧 [PDF] 기본 폰트로 폴백 완료');
      } catch (fallbackError) {
        console.error('💥 [PDF] 기본 폰트 등록도 실패:', fallbackError);
        throw new Error('PDF 폰트 등록 실패: 모든 폰트를 로드할 수 없습니다.');
      }
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
       .fontSize(18)
       .fillColor(this.COLORS.darkNavy)
       .text('구매발주서', this.LAYOUT.margin, y);

    // 발주번호 박스 - 오른쪽 상단 (더 작게)
    const orderNumText = orderData.orderNumber;
    const boxWidth = 100;
    const boxHeight = 22;
    const boxX = this.LAYOUT.pageWidth - this.LAYOUT.margin - boxWidth;
    
    doc.rect(boxX, y, boxWidth, boxHeight)
       .fillColor(this.COLORS.lightGray)
       .fill();
    
    doc.font(this.FONTS.medium)
       .fontSize(8)
       .fillColor(this.COLORS.darkNavy)
       .text(orderNumText, boxX, y + 7, {
         width: boxWidth,
         align: 'center'
       });

    // 발주일자 - 발주번호 박스 아래
    const dateText = format(orderData.orderDate, 'yyyy-MM-dd');
    doc.font(this.FONTS.regular)
       .fontSize(7)
       .fillColor(this.COLORS.gray)
       .text(dateText, boxX, y + boxHeight + 2, {
         width: boxWidth,
         align: 'center'
       });

    // 헤더 하단 선
    const lineY = y + 35;
    doc.moveTo(this.LAYOUT.margin, lineY)
       .lineTo(this.LAYOUT.pageWidth - this.LAYOUT.margin, lineY)
       .strokeColor(this.COLORS.navy)
       .lineWidth(1)
       .stroke();

    return lineY;
  }

  /**
   * 업체 정보 렌더링 - 2단 레이아웃
   */
  private static renderCompanyInfo(doc: PDFDocument, orderData: ComprehensivePurchaseOrderData, y: number): number {
    const columnWidth = (this.LAYOUT.pageWidth - (this.LAYOUT.margin * 2) - 10) / 2;
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
      this.LAYOUT.margin + columnWidth + 10,
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
    doc.rect(x, y, width, 20)
       .fillColor(this.COLORS.navy)
       .fill();

    // 박스 헤더 텍스트 중앙 정렬
    const titleY = y + (20 - 9) / 2; // 20px 박스에서 9px 폰트 중앙
    doc.font(this.FONTS.bold)
       .fontSize(9)
       .fillColor(this.COLORS.white)
       .text(title, x + 5, titleY);

    // 박스 본문
    const contentY = y + 20;
    const boxHeight = 70; // 고정 높이로 더 컴팩트하게
    doc.rect(x, contentY, width, boxHeight)
       .strokeColor(this.COLORS.borderGray)
       .lineWidth(0.5)
       .stroke();

    let currentY = contentY + 5;
    const fontSize = 8;
    const lineHeight = 11;

    // 회사 정보 렌더링
    const renderField = (label: string, value?: string) => {
      if (value) {
        // 텍스트 수직 중앙 정렬
        const textY = currentY + 1; // 약간 위로 조정하여 중앙에 맞춤
        doc.font(this.FONTS.medium)
           .fontSize(fontSize)
           .fillColor(this.COLORS.gray)
           .text(label, x + 5, textY, { continued: true })
           .font(this.FONTS.regular)
           .fillColor(this.COLORS.darkGray)
           .text(` ${value}`, { width: width - 10, ellipsis: true });
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
    doc.rect(this.LAYOUT.margin, y, pageWidth, 18)
       .fillColor(this.COLORS.lightGray)
       .fill();

    // 섹션 헤더 텍스트 수직 중앙
    const sectionTitleY = y + (18 - 8) / 2;
    doc.font(this.FONTS.bold)
       .fontSize(8)
       .fillColor(this.COLORS.darkNavy)
       .text('현장 정보', this.LAYOUT.margin + 5, sectionTitleY);

    // 정보 표시 (3열) - 더 컴팩트하게
    const contentY = y + 18;
    const colWidth = pageWidth / 3;
    
    const renderInfo = (label: string, value: string | undefined, x: number, y: number) => {
      // 현장 정보 텍스트 수직 중앙
      const infoTextY = y + 1;
      doc.font(this.FONTS.medium)
         .fontSize(8)
         .fillColor(this.COLORS.gray)
         .text(label, x + 5, infoTextY, { continued: true })
         .font(this.FONTS.regular)
         .fillColor(this.COLORS.darkGray)
         .text(` ${value || '-'}`, { width: colWidth - 10, ellipsis: true });
    };

    renderInfo('현장명:', orderData.project.name, this.LAYOUT.margin, contentY + 3);
    renderInfo('현장코드:', orderData.project.code, this.LAYOUT.margin + colWidth, contentY + 3);
    renderInfo('담당자:', orderData.creator.name, this.LAYOUT.margin + colWidth * 2, contentY + 3);

    renderInfo('발주일:', format(orderData.orderDate, 'yyyy-MM-dd'), this.LAYOUT.margin, contentY + 14);
    renderInfo('납기일:', orderData.deliveryDate ? format(orderData.deliveryDate, 'yyyy-MM-dd') : '-', this.LAYOUT.margin + colWidth, contentY + 14);
    renderInfo('연락처:', orderData.creator.phone, this.LAYOUT.margin + colWidth * 2, contentY + 14);

    return contentY + 28;
  }

  /**
   * 품목 테이블 렌더링
   */
  private static renderItemsTable(doc: PDFDocument, orderData: ComprehensivePurchaseOrderData, y: number): number {
    const pageWidth = this.LAYOUT.pageWidth - (this.LAYOUT.margin * 2);
    
    // 테이블 헤더
    const headerHeight = 22;
    doc.rect(this.LAYOUT.margin, y, pageWidth, headerHeight)
       .fillColor(this.COLORS.navy)
       .fill();

    // 컬럼 정의 - 컴팩트하게 너비 조정
    const totalWidth = pageWidth;
    const columns = [
      { label: '순번', width: 25, align: 'center' },           // 축소
      { label: '품목명', width: totalWidth * 0.22, align: 'left' },  // 30% → 22%
      { label: '규격', width: totalWidth * 0.12, align: 'left' },    // 18% → 12%
      { label: '수량', width: 35, align: 'center' },           // 40 → 35
      { label: '단위', width: 25, align: 'center' },           // 30 → 25
      { label: '단가', width: totalWidth * 0.12, align: 'right' },   // 15% → 12%
      { label: '금액', width: totalWidth * 0.20, align: 'right' },   // 18% → 20% (더 중요)
      { label: '비고', width: totalWidth * 0.12, align: 'left' },    // 45 → 12%
    ];

    // 헤더 텍스트
    let currentX = this.LAYOUT.margin;
    columns.forEach(col => {
      // 테이블 헤더 텍스트 수직 중앙
      const headerTextY = y + (headerHeight - 8) / 2;
      doc.font(this.FONTS.bold)
         .fontSize(8)
         .fillColor(this.COLORS.white)
         .text(col.label, currentX + 2, headerTextY, {
           width: col.width - 4,
           align: col.align as any,
         });
      currentX += col.width;
    });

    // 테이블 본문
    let currentY = y + headerHeight;
    orderData.items.forEach((item, index) => {
      const rowHeight = 20; // 행 높이 더 줄임
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
        // 테이블 데이터 수직 중앙 정렬
        const cellTextY = currentY + (rowHeight - 7.5) / 2;
        doc.font(this.FONTS.regular)
           .fontSize(7.5)
           .fillColor(this.COLORS.darkGray)
           .text(value, currentX + 2, cellTextY, {
             width: columns[i].width - 4,
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
    const summaryWidth = 220;
    const summaryX = this.LAYOUT.pageWidth - this.LAYOUT.margin - summaryWidth;
    
    const rows = [
      { label: '소계 (부가세 별도)', value: `₩${orderData.financial.subtotalAmount.toLocaleString('ko-KR')}` },
      { label: `부가세 (${orderData.financial.vatRate}%)`, value: `₩${orderData.financial.vatAmount.toLocaleString('ko-KR')}` },
    ];

    let currentY = y;
    const rowHeight = 18; // 금액 요약 행 높이 더 줄임

    // 일반 행
    rows.forEach(row => {
      doc.rect(summaryX, currentY, summaryWidth, rowHeight)
         .strokeColor(this.COLORS.borderGray)
         .lineWidth(0.5)
         .stroke();

      // 금액 요약 텍스트 수직 중앙
      const summaryTextY = currentY + (rowHeight - 8) / 2;
      doc.font(this.FONTS.regular)
         .fontSize(8)
         .fillColor(this.COLORS.gray)
         .text(row.label, summaryX + 5, summaryTextY);

      doc.font(this.FONTS.medium)
         .fontSize(8)
         .fillColor(this.COLORS.darkGray)
         .text(row.value, summaryX + 5, summaryTextY, {
           width: summaryWidth - 10,
           align: 'right',
         });

      currentY += rowHeight;
    });

    // 총 금액 (강조)
    doc.rect(summaryX, currentY, summaryWidth, 22)
       .fillColor(this.COLORS.navy)
       .fill();

    // 총 금액 텍스트 수직 중앙
    const totalTextY = currentY + (22 - 8) / 2;
    doc.font(this.FONTS.bold)
       .fontSize(8)
       .fillColor(this.COLORS.white)
       .text('총 금액', summaryX + 5, totalTextY);

    doc.font(this.FONTS.bold)
       .fontSize(9)
       .fillColor(this.COLORS.white)
       .text(`₩${orderData.financial.totalAmount.toLocaleString('ko-KR')}`, summaryX + 5, totalTextY - 1, {
         width: summaryWidth - 10,
         align: 'right',
       });

    return currentY + 22;
  }

  /**
   * 특이사항 렌더링
   */
  private static renderNotes(doc: PDFDocument, orderData: ComprehensivePurchaseOrderData, y: number): number {
    if (!orderData.metadata.notes) return y;

    const pageWidth = this.LAYOUT.pageWidth - (this.LAYOUT.margin * 2);
    
    doc.font(this.FONTS.bold)
       .fontSize(9)
       .fillColor(this.COLORS.darkNavy)
       .text('특이사항', this.LAYOUT.margin, y);

    // 특이사항을 더 컴팩트하게
    const notesHeight = 40;
    doc.rect(this.LAYOUT.margin, y + 12, pageWidth, notesHeight)
       .strokeColor(this.COLORS.borderGray)
       .lineWidth(0.5)
       .stroke();

    doc.font(this.FONTS.regular)
       .fontSize(7.5)
       .fillColor(this.COLORS.darkGray)
       .text(orderData.metadata.notes, this.LAYOUT.margin + 5, y + 15, {
         width: pageWidth - 10,
         height: notesHeight - 6,
         ellipsis: true,
         lineGap: 1
       });

    return y + 12 + notesHeight;
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

    // 회사 정보 - 줄간격 충분히 확보
    doc.font(this.FONTS.bold)
       .fontSize(8)
       .fillColor(this.COLORS.darkNavy)
       .text(orderData.issuerCompany.name, this.LAYOUT.margin, footerY + 5);

    // 푸터 정보 - 줄간격 개선
    const footerInfo = [
      orderData.issuerCompany.address,
      `TEL: ${orderData.issuerCompany.phone}`,
      `사업자번호: ${orderData.issuerCompany.businessNumber}`,
    ].filter(Boolean).join(' | ');

    doc.font(this.FONTS.regular)
       .fontSize(6.5)
       .fillColor(this.COLORS.gray)
       .text(footerInfo, this.LAYOUT.margin, footerY + 18, {  // 16 -> 18로 증가
         width: pageWidth,
       });

    // 문서 정보
    const docInfo = `생성일시: ${format(orderData.metadata.generatedAt, 'yyyy-MM-dd HH:mm')} | ${orderData.metadata.templateVersion}`;
    doc.font(this.FONTS.regular)
       .fontSize(6)
       .fillColor(this.COLORS.gray)
       .text(docInfo, this.LAYOUT.margin, footerY + 28, {  // 25 -> 28로 증가
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