import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { db } from '../db';
import { attachments, users, companies, vendors, projects, purchaseOrders, purchaseOrderItems, emailSendHistory } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { fontManager, FontInfo } from '../utils/korean-font-manager';

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
 * 전문적인 PDF 생성 서비스
 * 타겟 PDF와 정확히 일치하는 레이아웃으로 완전히 재작성
 */
export class ProfessionalPDFGenerationService {
  static async generateProfessionalPDF(orderData: ComprehensivePurchaseOrderData): Promise<Buffer> {
    console.log('📄 [ProfessionalPDF] 타겟 매칭 PDF 생성 시작');
    return await this.generateTargetMatchingPDF(orderData);
  }

  private static uploadDir = process.env.VERCEL 
    ? '/tmp/pdf'
    : path.join(process.cwd(), 'uploads/pdf');

  private static readonly TEMPLATE_VERSION = 'v2.0.0';
  private static readonly VAT_RATE = 0.1; // 10% 부가세

  /**
   * 시스템 이메일 설정 가져오기 (DB 우선, 환경변수 fallback)
   */
  private static async getSystemEmail(): Promise<string | null> {
    try {
      const { EmailSettingsService } = await import('../services/email-settings-service');
      const emailService = new EmailSettingsService();
      const settings = await emailService.getDefaultSettings();
      
      if (settings && settings.smtpUser) {
        return settings.smtpUser;
      }
      
      // Fallback to environment variable
      return process.env.SMTP_USER || null;
    } catch (error) {
      console.warn('⚠️ [ProfessionalPDF] 시스템 이메일 조회 실패, 환경변수 사용:', error);
      return process.env.SMTP_USER || null;
    }
  }

  /**
   * 발주서 ID로부터 포괄적인 데이터 수집
   */
  static async gatherComprehensiveOrderData(orderId: number): Promise<ComprehensivePurchaseOrderData | null> {
    try {
      console.log(`📊 [ProfessionalPDF] 포괄적 데이터 수집 시작: Order ID ${orderId}`);

      // 기본 발주서 정보 조회
      const orderQuery = await db
        .select({
          // Purchase Order 정보
          orderNumber: purchaseOrders.orderNumber,
          orderDate: purchaseOrders.orderDate,
          deliveryDate: purchaseOrders.deliveryDate,
          orderStatus: purchaseOrders.orderStatus,
          approvalStatus: purchaseOrders.approvalStatus,
          totalAmount: purchaseOrders.totalAmount,
          notes: purchaseOrders.notes,
          approvalLevel: purchaseOrders.approvalLevel,
          createdAt: purchaseOrders.createdAt,
          updatedAt: purchaseOrders.updatedAt,
          
          // 거래처 정보
          vendorName: vendors.name,
          vendorBusinessNumber: vendors.businessNumber,
          vendorContactPerson: vendors.contactPerson,
          vendorEmail: vendors.email,
          vendorPhone: vendors.phone,
          vendorAddress: vendors.address,
          vendorBusinessType: vendors.businessType,
          
          // 현장 정보
          projectName: projects.projectName,
          projectCode: projects.projectCode,
          projectClientName: projects.clientName,
          projectLocation: projects.location,
          projectStartDate: projects.startDate,
          projectEndDate: projects.endDate,
          projectTotalBudget: projects.totalBudget,
          
          // 작성자 정보
          creatorName: users.name,
          creatorEmail: users.email,
          creatorPhone: users.phoneNumber,
          creatorPosition: users.position,
          creatorRole: users.role,
        })
        .from(purchaseOrders)
        .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
        .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
        .leftJoin(users, eq(purchaseOrders.userId, users.id))
        .where(eq(purchaseOrders.id, orderId))
        .limit(1);

      // 회사 정보 별도 조회 (첫 번째 활성화된 회사)
      const companyQuery = await db
        .select({
          companyName: companies.companyName,
          companyBusinessNumber: companies.businessNumber,
          companyAddress: companies.address,
          companyContactPerson: companies.contactPerson,
          companyPhone: companies.phone,
          companyEmail: companies.email,
          companyFax: companies.fax,
          companyWebsite: companies.website,
          companyRepresentative: companies.representative,
        })
        .from(companies)
        .where(eq(companies.isActive, true))
        .limit(1);

      if (!orderQuery || orderQuery.length === 0) {
        console.error(`❌ [ProfessionalPDF] 발주서 정보 없음: Order ID ${orderId}`);
        return null;
      }

      const orderData = orderQuery[0];

      // 회사 정보 가져오기 (없으면 기본값)
      const companyData = companyQuery.length > 0 ? companyQuery[0] : {
        companyName: '발주업체',
        companyBusinessNumber: null,
        companyAddress: null,
        companyContactPerson: null,
        companyPhone: null,
        companyEmail: null,
        companyRepresentative: null,
      };

      // 품목 정보 조회
      const itemsQuery = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.orderId, orderId));

      // 첨부파일 정보 조회
      const attachmentsQuery = await db
        .select()
        .from(attachments)
        .where(eq(attachments.orderId, orderId));

      // 이메일 발송 이력 조회 (테이블이 있는 경우만)
      let emailHistoryQuery: any[] = [];
      try {
        emailHistoryQuery = await db
          .select()
          .from(emailSendHistory)
          .where(eq(emailSendHistory.orderId, orderId))
          .orderBy(desc(emailSendHistory.sentAt))
          .limit(5);
      } catch (error: any) {
        // 테이블이 없는 경우 무시
        if (error.code !== '42P01') {
          console.error('❌ [ProfessionalPDF] 이메일 이력 조회 오류:', error);
        }
      }

      // 금액 계산
      const subtotalAmount = Number(orderData.totalAmount) || 0;
      const vatAmount = Math.round(subtotalAmount * this.VAT_RATE);
      const totalAmount = subtotalAmount + vatAmount;

      // 포괄적인 데이터 구조 생성
      const comprehensiveData: ComprehensivePurchaseOrderData = {
        orderNumber: orderData.orderNumber,
        orderDate: orderData.orderDate,
        deliveryDate: orderData.deliveryDate,
        createdAt: orderData.createdAt,

        issuerCompany: {
          name: companyData.companyName || '발주업체',
          businessNumber: companyData.companyBusinessNumber,
          representative: companyData.companyRepresentative,
          address: companyData.companyAddress,
          phone: companyData.companyPhone,
          email: companyData.companyEmail || 'ikjin@example.com',
        },

        vendorCompany: {
          name: orderData.vendorName || '거래처명 없음',
          businessNumber: orderData.vendorBusinessNumber,
          representative: orderData.vendorBusinessNumber ? '대표자' : undefined,
          address: orderData.vendorAddress,
          phone: orderData.vendorPhone,
          email: orderData.vendorEmail,
          contactPerson: orderData.vendorContactPerson,
        },

        project: {
          name: orderData.projectName || '현장명 없음',
          code: orderData.projectCode,
          location: orderData.projectLocation,
          projectManager: orderData.creatorName,
          projectManagerContact: orderData.creatorPhone,
          orderManager: orderData.creatorName,
          orderManagerContact: orderData.creatorEmail,
        },

        creator: {
          name: orderData.creatorName || '작성자 정보 없음',
          email: orderData.creatorEmail,
          phone: orderData.creatorPhone,
        },

        items: itemsQuery.map((item: any, index: number) => {
          // 납품처 정보 추출 (remarks에서 파싱)
          let deliveryLocation = '';
          let deliveryEmail = '';
          const remarks = item.notes || '';
          
          // "납품처:" 패턴 찾기
          const deliveryMatch = remarks.match(/납품처:\s*([^,\n]+)/);
          if (deliveryMatch) {
            deliveryLocation = deliveryMatch[1].trim();
          }
          
          // "이메일:" 패턴 찾기
          const emailMatch = remarks.match(/이메일:\s*([^\s,\n]+)/);
          if (emailMatch) {
            deliveryEmail = emailMatch[1].trim();
          }
          
          return {
            sequenceNo: index + 1,
            name: item.itemName,
            specification: item.specification,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalAmount),
            deliveryLocation,
            deliveryEmail,
            remarks: item.notes,
          };
        }),

        financial: {
          subtotalAmount,
          vatRate: this.VAT_RATE,
          vatAmount,
          totalAmount,
          discountAmount: 0,
          currencyCode: 'KRW',
        },

        metadata: {
          notes: orderData.notes,
          documentId: `DOC_${orderId}_${Date.now()}`,
          generatedAt: new Date(),
          generatedBy: orderData.creatorName || 'System',
          templateVersion: this.TEMPLATE_VERSION,
        },
      };

      console.log(`✅ [ProfessionalPDF] 데이터 수집 완료: ${itemsQuery.length}개 품목, ${attachmentsQuery.length}개 첨부파일`);
      return comprehensiveData;

    } catch (error) {
      console.error('❌ [ProfessionalPDF] 데이터 수집 오류:', error);
      return null;
    }
  }

  /**
   * 전문적인 발주서 PDF 생성
   */
  static async generateProfessionalPurchaseOrderPDF(
    orderId: number,
    userId: string
  ): Promise<{ success: boolean; pdfPath?: string; attachmentId?: number; error?: string; pdfBuffer?: Buffer }> {
    try {
      console.log(`📄 [ProfessionalPDF] 전문적 발주서 PDF 생성 시작: Order ID ${orderId}`);

      // 포괄적인 데이터 수집
      const orderData = await this.gatherComprehensiveOrderData(orderId);
      if (!orderData) {
        return {
          success: false,
          error: '발주서 데이터를 찾을 수 없습니다.'
        };
      }

      const timestamp = Date.now();
      const cleanOrderNumber = orderData.orderNumber.startsWith('PO-') ? orderData.orderNumber.substring(3) : orderData.orderNumber;
      const fileName = `PO_Professional_${cleanOrderNumber}_${timestamp}.pdf`;

      // PDF 생성 - 타겟 매칭 방식
      console.log('📄 [ProfessionalPDF] 타겟 매칭 PDF 생성');
      const pdfBuffer = await this.generateTargetMatchingPDF(orderData);
      console.log('✅ [ProfessionalPDF] 타겟 매칭 PDF 생성 성공');
      
      // 파일 저장 및 DB 등록
      const base64Data = pdfBuffer.toString('base64');
      let filePath = '';
      let attachmentId: number;
      
      console.log(`🔍 [ProfessionalPDF] Environment check - VERCEL: ${process.env.VERCEL}, Base64 size: ${base64Data.length} chars`);

      if (process.env.VERCEL) {
        console.log('📝 [ProfessionalPDF] Saving to database with Base64 data...');
        const [attachment] = await db.insert(attachments).values({
          orderId,
          originalName: fileName,
          storedName: fileName,
          filePath: `professional://${fileName}`,
          fileSize: pdfBuffer.length,
          mimeType: 'application/pdf',
          uploadedBy: userId,
          fileData: base64Data
        }).returning();
        
        attachmentId = attachment.id;
        filePath = `professional://${fileName}`;
        
        console.log(`✅ [ProfessionalPDF] PDF 생성 완료 (Vercel): ${fileName}, 크기: ${Math.round(pdfBuffer.length / 1024)}KB`);
      } else {
        const tempDir = path.join(this.uploadDir, 'professional', String(new Date().getFullYear()));
        
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        filePath = path.join(tempDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);
        
        const [attachment] = await db.insert(attachments).values({
          orderId,
          originalName: fileName,
          storedName: fileName,
          filePath,
          fileSize: pdfBuffer.length,
          mimeType: 'application/pdf',
          uploadedBy: userId,
          fileData: base64Data
        }).returning();
        
        attachmentId = attachment.id;
        console.log(`✅ [ProfessionalPDF] PDF 생성 완료 (로컬): ${filePath}, DB에도 Base64 저장`);
      }

      return {
        success: true,
        pdfPath: filePath,
        attachmentId,
        pdfBuffer: process.env.VERCEL ? pdfBuffer : undefined
      };

    } catch (error) {
      console.error('❌ [ProfessionalPDF] PDF 생성 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF 생성 중 오류 발생'
      };
    }
  }

  /**
   * 타겟 PDF와 정확히 일치하는 PDF 생성 (PDFKit 사용)
   * 완전히 새로 작성된 구현
   */
  public static async generateTargetMatchingPDF(orderData: ComprehensivePurchaseOrderData): Promise<Buffer> {
    try {
      const PDFKitDocument = (await import('pdfkit')).default;
      
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFKitDocument({ 
            size: 'A4',
            margins: { top: 30, bottom: 30, left: 30, right: 30 },
            autoFirstPage: false
          });
          
          const buffers: Buffer[] = [];
          doc.on('data', buffers.push.bind(buffers));
          doc.on('end', () => resolve(Buffer.concat(buffers)));
          doc.on('error', reject);

          console.log('📝 [ProfessionalPDF] 타겟 매칭 PDF 생성 시작');
          
          // 한글 폰트 설정
          let hasKoreanFont = false;
          let fontName = 'Helvetica';
          
          try {
            const selectedFont = fontManager.getBestKoreanFont();
            
            if (selectedFont && selectedFont.available) {
              console.log(`🎯 [ProfessionalPDF] 선택된 한글 폰트: ${selectedFont.name}`);
              
              if (process.env.VERCEL) {
                const fontBuffer = fontManager.getFontBuffer(selectedFont.name);
                if (fontBuffer) {
                  doc.registerFont('Korean', fontBuffer);
                  fontName = 'Korean';
                  hasKoreanFont = true;
                  console.log('✅ [ProfessionalPDF] Vercel 환경에서 한글 폰트 등록 성공');
                }
              } else {
                doc.registerFont('Korean', selectedFont.path);
                fontName = 'Korean';
                hasKoreanFont = true;
                console.log(`✅ [ProfessionalPDF] 로컬 환경에서 한글 폰트 등록 성공: ${selectedFont.path}`);
              }
            }
          } catch (fontError) {
            console.warn('⚠️ [ProfessionalPDF] 한글 폰트 등록 실패:', fontError);
            fontName = 'Helvetica';
            hasKoreanFont = false;
          }
          
          doc.font(fontName);
          
          // 안전한 텍스트 처리 함수
          const safeText = (text: string) => {
            if (!text) return '';
            return hasKoreanFont ? text : text;
          };
          
          const formatDate = (date?: Date | null) => {
            if (!date) return '-';
            return format(new Date(date), 'yyyy년 MM월 dd일', { locale: ko });
          };

          // ============ PAGE 1: 클린한 타겟 레이아웃 ============
          doc.addPage();
          
          // === PAGE 1 헤더 ===
          doc.fontSize(20).fillColor('black');
          doc.text(safeText('구매발주서'), 30, 50);
          doc.fontSize(12);
          doc.text(safeText(`발주번호: ${orderData.orderNumber}`), 450, 55);
          
          // 헤더 구분선
          doc.moveTo(30, 85).lineTo(565, 85).stroke('#cccccc');
          
          let currentY = 100;
          
          // === PAGE 1 정보 박스들 ===
          
          // 첫 번째 행: 발주업체 정보 + 수주업체 정보 (2개 나란히)
          const boxWidth = 260;
          const boxHeight = 120;
          
          // 발주업체 정보 박스
          doc.rect(30, currentY, boxWidth, boxHeight).stroke('#e5e7eb');
          doc.fontSize(10).fillColor('black');
          doc.text(safeText('발주업체 정보'), 40, currentY + 10);
          
          // 발주업체 정보 내용
          let infoY = currentY + 30;
          doc.fontSize(8);
          doc.text(safeText('업체명'), 40, infoY);
          doc.text(safeText(orderData.issuerCompany.name), 120, infoY);
          infoY += 15;
          doc.text(safeText('사업자번호'), 40, infoY);
          doc.text(safeText(orderData.issuerCompany.businessNumber || '-'), 120, infoY);
          infoY += 15;
          doc.text(safeText('대표자'), 40, infoY);
          doc.text(safeText(orderData.issuerCompany.representative || '-'), 120, infoY);
          infoY += 15;
          doc.text(safeText('주소'), 40, infoY);
          const address = orderData.issuerCompany.address || '-';
          const shortAddress = address.length > 20 ? address.substring(0, 20) + '...' : address;
          doc.text(safeText(shortAddress), 120, infoY);
          infoY += 15;
          doc.text(safeText('연락처'), 40, infoY);
          doc.text(safeText(orderData.issuerCompany.phone || '-'), 120, infoY);
          
          // 수주업체 정보 박스
          const rightBoxX = 305;
          doc.rect(rightBoxX, currentY, boxWidth, boxHeight).stroke('#e5e7eb');
          doc.fontSize(10);
          doc.text(safeText('수주업체 정보'), rightBoxX + 10, currentY + 10);
          
          // 수주업체 정보 내용
          infoY = currentY + 30;
          doc.fontSize(8);
          doc.text(safeText('업체명'), rightBoxX + 10, infoY);
          doc.text(safeText(orderData.vendorCompany.name), rightBoxX + 90, infoY);
          infoY += 15;
          doc.text(safeText('사업자번호'), rightBoxX + 10, infoY);
          doc.text(safeText(orderData.vendorCompany.businessNumber || '-'), rightBoxX + 90, infoY);
          infoY += 15;
          doc.text(safeText('대표자'), rightBoxX + 10, infoY);
          doc.text(safeText(orderData.vendorCompany.representative || '-'), rightBoxX + 90, infoY);
          infoY += 15;
          doc.text(safeText('담당자'), rightBoxX + 10, infoY);
          doc.text(safeText(orderData.vendorCompany.contactPerson || '-'), rightBoxX + 90, infoY);
          infoY += 15;
          doc.text(safeText('연락처'), rightBoxX + 10, infoY);
          doc.text(safeText(orderData.vendorCompany.phone || '-'), rightBoxX + 90, infoY);
          
          currentY += boxHeight + 20;
          
          // 두 번째 행: 현장 + 일정 + 담당자 (3개 나란히)
          const smallBoxWidth = 175;
          const smallBoxHeight = 90;
          
          // 현장 정보
          doc.rect(30, currentY, smallBoxWidth, smallBoxHeight).stroke('#e5e7eb');
          doc.fontSize(10);
          doc.text(safeText('현장'), 40, currentY + 10);
          
          infoY = currentY + 30;
          doc.fontSize(8);
          doc.text(safeText('현장명'), 40, infoY);
          doc.text(safeText(orderData.project.name), 85, infoY);
          infoY += 15;
          doc.text(safeText('현장코드'), 40, infoY);
          doc.text(safeText(orderData.project.code || '-'), 85, infoY);
          infoY += 15;
          doc.text(safeText('발주처'), 40, infoY);
          doc.text(safeText('-'), 85, infoY);
          
          // 일정 정보
          const scheduleX = 210;
          doc.rect(scheduleX, currentY, smallBoxWidth, smallBoxHeight).stroke('#e5e7eb');
          doc.fontSize(10);
          doc.text(safeText('일정'), scheduleX + 10, currentY + 10);
          
          infoY = currentY + 30;
          doc.fontSize(8);
          doc.text(safeText('발주일'), scheduleX + 10, infoY);
          doc.text(safeText(formatDate(orderData.orderDate)), scheduleX + 55, infoY);
          infoY += 15;
          doc.text(safeText('납기일'), scheduleX + 10, infoY);
          doc.text(safeText(formatDate(orderData.deliveryDate)), scheduleX + 55, infoY);
          infoY += 15;
          doc.text(safeText('등록일'), scheduleX + 10, infoY);
          doc.text(safeText(formatDate(orderData.createdAt)), scheduleX + 55, infoY);
          
          // 담당자 정보
          const managerX = 390;
          doc.rect(managerX, currentY, smallBoxWidth, smallBoxHeight).stroke('#e5e7eb');
          doc.fontSize(10);
          doc.text(safeText('담당자'), managerX + 10, currentY + 10);
          
          infoY = currentY + 30;
          doc.fontSize(8);
          doc.text(safeText('작성자'), managerX + 10, infoY);
          doc.text(safeText(orderData.creator.name), managerX + 55, infoY);
          infoY += 15;
          doc.text(safeText('직책'), managerX + 10, infoY);
          doc.text(safeText('-'), managerX + 55, infoY);
          infoY += 15;
          doc.text(safeText('연락처'), managerX + 10, infoY);
          doc.text(safeText(orderData.creator.phone || '-'), managerX + 55, infoY);
          
          currentY += smallBoxHeight + 30;
          
          // === PAGE 1 품목 테이블 ===
          
          // 파란색 헤더
          doc.rect(30, currentY, 535, 25).fill('#2563eb');
          doc.fontSize(10).fillColor('white');
          doc.text(safeText(`발주 품목 (총 ${orderData.items.length}개 품목)`), 40, currentY + 8);
          currentY += 25;
          
          // 테이블 헤더
          const tableHeaders = ['순번', '품목명', '규격', '수량', '단위', '단가', '금액', '특이사항'];
          const columnWidths = [35, 140, 85, 50, 35, 70, 80, 40];
          let tableX = 30;
          
          doc.rect(30, currentY, 535, 20).fill('#f3f4f6').stroke('#d1d5db');
          doc.fontSize(8).fillColor('black');
          
          tableHeaders.forEach((header, index) => {
            const headerX = tableX + (columnWidths[index] / 2) - 10;
            doc.text(safeText(header), headerX, currentY + 6);
            tableX += columnWidths[index];
          });
          currentY += 20;
          
          // 품목 데이터 행들
          orderData.items.slice(0, 10).forEach((item, index) => {
            const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            doc.rect(30, currentY, 535, 18).fill(bgColor).stroke('#d1d5db');
            doc.fontSize(7).fillColor('black');
            
            tableX = 30;
            
            // 순번
            doc.text(safeText(item.sequenceNo.toString()), tableX + 15, currentY + 5);
            tableX += columnWidths[0];
            
            // 품목명
            const itemName = item.name.length > 18 ? item.name.substring(0, 18) + '...' : item.name;
            doc.text(safeText(itemName), tableX + 2, currentY + 5);
            tableX += columnWidths[1];
            
            // 규격
            const spec = (item.specification || '-').length > 12 ? (item.specification || '-').substring(0, 12) + '...' : (item.specification || '-');
            doc.text(safeText(spec), tableX + 2, currentY + 5);
            tableX += columnWidths[2];
            
            // 수량
            doc.text(safeText(item.quantity.toString()), tableX + 15, currentY + 5);
            tableX += columnWidths[3];
            
            // 단위
            doc.text(safeText(item.unit || '-'), tableX + 12, currentY + 5);
            tableX += columnWidths[4];
            
            // 단가
            doc.text(safeText(`₩${item.unitPrice.toLocaleString()}`), tableX + 5, currentY + 5);
            tableX += columnWidths[5];
            
            // 금액
            doc.text(safeText(`₩${item.totalPrice.toLocaleString()}`), tableX + 5, currentY + 5);
            tableX += columnWidths[6];
            
            // 특이사항
            doc.text(safeText('-'), tableX + 15, currentY + 5);
            
            currentY += 18;
          });
          
          // === PAGE 1 금액 합계 ===
          const summaryY = currentY + 10;
          
          // 소계
          doc.rect(30, summaryY, 535, 18).fill('#ffffff').stroke('#d1d5db');
          doc.fontSize(8).fillColor('black');
          doc.text(safeText('소계 (부가세 별도)'), 400, summaryY + 5);
          doc.text(safeText(`₩${orderData.financial.subtotalAmount.toLocaleString()}`), 480, summaryY + 5);
          
          // 부가세
          doc.rect(30, summaryY + 18, 535, 18).fill('#ffffff').stroke('#d1d5db');
          doc.text(safeText(`부가세 (${(orderData.financial.vatRate * 100).toFixed(0)}%)`), 400, summaryY + 23);
          doc.text(safeText(`₩${orderData.financial.vatAmount.toLocaleString()}`), 480, summaryY + 23);
          
          // 총 금액
          doc.rect(30, summaryY + 36, 535, 20).fill('#e5e7eb').stroke('#d1d5db');
          doc.fontSize(10).fillColor('black');
          doc.text(safeText('총 금액'), 400, summaryY + 42);
          doc.text(safeText(`₩${orderData.financial.totalAmount.toLocaleString()}`), 480, summaryY + 42);
          
          currentY = summaryY + 60;
          
          // === PAGE 1 특이사항 ===
          if (orderData.metadata.notes) {
            doc.rect(30, currentY, 535, 30).fill('#fffbeb').stroke('#d1d5db');
            doc.fontSize(8).fillColor('black');
            doc.text(safeText(`특이사항: ${orderData.metadata.notes}`), 40, currentY + 8);
            currentY += 35;
          }
          
          // === PAGE 1 하단 회사 정보 ===
          doc.moveTo(30, currentY + 20).lineTo(565, currentY + 20).stroke('#374151');
          
          const footerY = currentY + 35;
          doc.fontSize(12).fillColor('black');
          doc.text(safeText(orderData.issuerCompany.name), 0, footerY, { align: 'center', width: 595 });
          
          if (orderData.issuerCompany.representative) {
            doc.fontSize(8);
            doc.text(safeText(`대표자: ${orderData.issuerCompany.representative}`), 0, footerY + 20, { align: 'center', width: 595 });
          }
          
          doc.fontSize(7);
          doc.text(safeText(orderData.issuerCompany.address || ''), 0, footerY + 35, { align: 'center', width: 595 });
          doc.text(safeText(`TEL: ${orderData.issuerCompany.phone || ''} | EMAIL: ${orderData.issuerCompany.email || ''}`), 0, footerY + 50, { align: 'center', width: 595 });
          
          if (orderData.issuerCompany.businessNumber) {
            doc.text(safeText(`사업자등록번호: ${orderData.issuerCompany.businessNumber}`), 0, footerY + 65, { align: 'center', width: 595 });
          }
          
          // 문서 메타데이터
          doc.fontSize(6).fillColor('#666666');
          doc.text(safeText(`생성일시: ${formatDate(orderData.metadata.generatedAt)}`), 30, footerY + 85);
          doc.text(safeText('본 문서는 전자적으로 생성되었습니다'), 0, footerY + 85, { align: 'center', width: 595 });
          doc.text(safeText(`Template ${orderData.metadata.templateVersion}`), 0, footerY + 85, { align: 'right', width: 565 });
          
          // ============ PAGE 2: 파란색 헤더 버전 ============
          doc.addPage();
          
          // === PAGE 2 파란색 헤더 ===
          doc.rect(0, 0, 595, 60).fill('#2563eb');
          doc.fontSize(18).fillColor('white');
          doc.text(safeText('구매발주서'), 30, 20);
          doc.fontSize(12);
          doc.text(safeText(`발주번호: ${orderData.orderNumber}`), 450, 25);
          
          currentY = 80;
          
          // === PAGE 2 파란색 헤더를 가진 정보 박스들 ===
          
          // 첫 번째 행: 발주업체 정보 + 수주업체 정보
          
          // 발주업체 정보 - 파란색 헤더
          doc.rect(30, currentY, boxWidth, 20).fill('#2563eb');
          doc.fontSize(9).fillColor('white');
          doc.text(safeText('발주업체 정보'), 40, currentY + 6);
          
          doc.rect(30, currentY + 20, boxWidth, 100).stroke('#e5e7eb');
          
          infoY = currentY + 35;
          doc.fontSize(8).fillColor('black');
          doc.text(safeText('업체명'), 40, infoY);
          doc.text(safeText(orderData.issuerCompany.name), 120, infoY);
          infoY += 15;
          doc.text(safeText('사업자번호'), 40, infoY);
          doc.text(safeText(orderData.issuerCompany.businessNumber || '-'), 120, infoY);
          infoY += 15;
          doc.text(safeText('대표자'), 40, infoY);
          doc.text(safeText(orderData.issuerCompany.representative || '-'), 120, infoY);
          infoY += 15;
          doc.text(safeText('주소'), 40, infoY);
          doc.text(safeText(shortAddress), 120, infoY);
          infoY += 15;
          doc.text(safeText('연락처'), 40, infoY);
          doc.text(safeText(orderData.issuerCompany.phone || '-'), 120, infoY);
          
          // 수주업체 정보 - 파란색 헤더
          doc.rect(rightBoxX, currentY, boxWidth, 20).fill('#2563eb');
          doc.fontSize(9).fillColor('white');
          doc.text(safeText('수주업체 정보'), rightBoxX + 10, currentY + 6);
          
          doc.rect(rightBoxX, currentY + 20, boxWidth, 100).stroke('#e5e7eb');
          
          infoY = currentY + 35;
          doc.fontSize(8).fillColor('black');
          doc.text(safeText('업체명'), rightBoxX + 10, infoY);
          doc.text(safeText(orderData.vendorCompany.name), rightBoxX + 90, infoY);
          infoY += 15;
          doc.text(safeText('사업자번호'), rightBoxX + 10, infoY);
          doc.text(safeText(orderData.vendorCompany.businessNumber || '-'), rightBoxX + 90, infoY);
          infoY += 15;
          doc.text(safeText('대표자'), rightBoxX + 10, infoY);
          doc.text(safeText(orderData.vendorCompany.representative || '-'), rightBoxX + 90, infoY);
          infoY += 15;
          doc.text(safeText('담당자'), rightBoxX + 10, infoY);
          doc.text(safeText(orderData.vendorCompany.contactPerson || '-'), rightBoxX + 90, infoY);
          infoY += 15;
          doc.text(safeText('연락처'), rightBoxX + 10, infoY);
          doc.text(safeText(orderData.vendorCompany.phone || '-'), rightBoxX + 90, infoY);
          
          currentY += 140;
          
          // 두 번째 행: 현장 + 일정 + 담당자 - 각각 파란색 헤더
          
          // 현장 정보
          doc.rect(30, currentY, smallBoxWidth, 18).fill('#2563eb');
          doc.fontSize(9).fillColor('white');
          doc.text(safeText('현장'), 40, currentY + 5);
          
          doc.rect(30, currentY + 18, smallBoxWidth, 72).stroke('#e5e7eb');
          
          infoY = currentY + 30;
          doc.fontSize(8).fillColor('black');
          doc.text(safeText('현장명'), 40, infoY);
          doc.text(safeText(orderData.project.name), 85, infoY);
          infoY += 15;
          doc.text(safeText('현장코드'), 40, infoY);
          doc.text(safeText(orderData.project.code || '-'), 85, infoY);
          infoY += 15;
          doc.text(safeText('발주처'), 40, infoY);
          doc.text(safeText('-'), 85, infoY);
          
          // 일정 정보
          doc.rect(scheduleX, currentY, smallBoxWidth, 18).fill('#2563eb');
          doc.fontSize(9).fillColor('white');
          doc.text(safeText('일정'), scheduleX + 10, currentY + 5);
          
          doc.rect(scheduleX, currentY + 18, smallBoxWidth, 72).stroke('#e5e7eb');
          
          infoY = currentY + 30;
          doc.fontSize(8).fillColor('black');
          doc.text(safeText('발주일'), scheduleX + 10, infoY);
          doc.text(safeText(formatDate(orderData.orderDate)), scheduleX + 55, infoY);
          infoY += 15;
          doc.text(safeText('납기일'), scheduleX + 10, infoY);
          doc.text(safeText(formatDate(orderData.deliveryDate)), scheduleX + 55, infoY);
          infoY += 15;
          doc.text(safeText('등록일'), scheduleX + 10, infoY);
          doc.text(safeText(formatDate(orderData.createdAt)), scheduleX + 55, infoY);
          
          // 담당자 정보
          doc.rect(managerX, currentY, smallBoxWidth, 18).fill('#2563eb');
          doc.fontSize(9).fillColor('white');
          doc.text(safeText('담당자'), managerX + 10, currentY + 5);
          
          doc.rect(managerX, currentY + 18, smallBoxWidth, 72).stroke('#e5e7eb');
          
          infoY = currentY + 30;
          doc.fontSize(8).fillColor('black');
          doc.text(safeText('작성자'), managerX + 10, infoY);
          doc.text(safeText(orderData.creator.name), managerX + 55, infoY);
          infoY += 15;
          doc.text(safeText('직책'), managerX + 10, infoY);
          doc.text(safeText('-'), managerX + 55, infoY);
          infoY += 15;
          doc.text(safeText('연락처'), managerX + 10, infoY);
          doc.text(safeText(orderData.creator.phone || '-'), managerX + 55, infoY);
          
          currentY += 110;
          
          // === PAGE 2 파란색 품목 테이블 헤더 ===
          doc.rect(30, currentY, 535, 25).fill('#2563eb');
          doc.fontSize(10).fillColor('white');
          doc.text(safeText(`발주 품목 (총 ${orderData.items.length}개 품목)`), 40, currentY + 8);
          currentY += 25;
          
          // PAGE 2 테이블 구조는 PAGE 1과 동일하지만 남은 품목들 표시
          tableX = 30;
          doc.rect(30, currentY, 535, 20).fill('#f3f4f6').stroke('#d1d5db');
          doc.fontSize(8).fillColor('black');
          
          tableHeaders.forEach((header, index) => {
            const headerX = tableX + (columnWidths[index] / 2) - 10;
            doc.text(safeText(header), headerX, currentY + 6);
            tableX += columnWidths[index];
          });
          currentY += 20;
          
          // 남은 품목들 (10개 이후)
          const remainingItems = orderData.items.slice(10);
          if (remainingItems.length > 0) {
            remainingItems.forEach((item, index) => {
              const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
              doc.rect(30, currentY, 535, 18).fill(bgColor).stroke('#d1d5db');
              doc.fontSize(7).fillColor('black');
              
              tableX = 30;
              
              // 순번
              doc.text(safeText(item.sequenceNo.toString()), tableX + 15, currentY + 5);
              tableX += columnWidths[0];
              
              // 품목명
              const itemName = item.name.length > 18 ? item.name.substring(0, 18) + '...' : item.name;
              doc.text(safeText(itemName), tableX + 2, currentY + 5);
              tableX += columnWidths[1];
              
              // 규격
              const spec = (item.specification || '-').length > 12 ? (item.specification || '-').substring(0, 12) + '...' : (item.specification || '-');
              doc.text(safeText(spec), tableX + 2, currentY + 5);
              tableX += columnWidths[2];
              
              // 수량
              doc.text(safeText(item.quantity.toString()), tableX + 15, currentY + 5);
              tableX += columnWidths[3];
              
              // 단위
              doc.text(safeText(item.unit || '-'), tableX + 12, currentY + 5);
              tableX += columnWidths[4];
              
              // 단가
              doc.text(safeText(`₩${item.unitPrice.toLocaleString()}`), tableX + 5, currentY + 5);
              tableX += columnWidths[5];
              
              // 금액
              doc.text(safeText(`₩${item.totalPrice.toLocaleString()}`), tableX + 5, currentY + 5);
              tableX += columnWidths[6];
              
              // 특이사항
              doc.text(safeText('-'), tableX + 15, currentY + 5);
              
              currentY += 18;
            });
          } else {
            // 품목이 10개 이하인 경우 빈 메시지
            doc.rect(30, currentY, 535, 18).fill('#f8fafc').stroke('#d1d5db');
            doc.fontSize(8).fillColor('#666666');
            doc.text(safeText('모든 품목이 첫 번째 페이지에 표시되었습니다.'), 40, currentY + 5);
            currentY += 18;
          }
          
          // === PAGE 2 하단 회사 정보 (PAGE 1과 동일) ===
          doc.moveTo(30, currentY + 30).lineTo(565, currentY + 30).stroke('#374151');
          
          const footer2Y = currentY + 45;
          doc.fontSize(12).fillColor('black');
          doc.text(safeText(orderData.issuerCompany.name), 0, footer2Y, { align: 'center', width: 595 });
          
          if (orderData.issuerCompany.representative) {
            doc.fontSize(8);
            doc.text(safeText(`대표자: ${orderData.issuerCompany.representative}`), 0, footer2Y + 20, { align: 'center', width: 595 });
          }
          
          doc.fontSize(7);
          doc.text(safeText(orderData.issuerCompany.address || ''), 0, footer2Y + 35, { align: 'center', width: 595 });
          doc.text(safeText(`TEL: ${orderData.issuerCompany.phone || ''} | EMAIL: ${orderData.issuerCompany.email || ''}`), 0, footer2Y + 50, { align: 'center', width: 595 });
          
          if (orderData.issuerCompany.businessNumber) {
            doc.text(safeText(`사업자등록번호: ${orderData.issuerCompany.businessNumber}`), 0, footer2Y + 65, { align: 'center', width: 595 });
          }
          
          // 문서 메타데이터
          doc.fontSize(6).fillColor('#666666');
          doc.text(safeText(`생성일시: ${formatDate(orderData.metadata.generatedAt)}`), 30, footer2Y + 85);
          doc.text(safeText('본 문서는 전자적으로 생성되었습니다'), 0, footer2Y + 85, { align: 'center', width: 595 });
          doc.text(safeText(`Template ${orderData.metadata.templateVersion}`), 0, footer2Y + 85, { align: 'right', width: 565 });
          
          doc.end();
          
        } catch (error) {
          reject(error);
        }
      });
      
    } catch (importError) {
      console.error('❌ [ProfessionalPDF] PDFKit import 실패:', importError);
      throw new Error(`PDFKit을 로드할 수 없습니다: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
    }
  }

  /**
   * 기존 호환성을 위한 메서드 (사용되지 않음)
   */
  public static async generateProfessionalPDFWithPDFKit(orderData: ComprehensivePurchaseOrderData): Promise<Buffer> {
    return this.generateTargetMatchingPDF(orderData);
  }
}