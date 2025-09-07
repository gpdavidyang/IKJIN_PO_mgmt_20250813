import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
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
 * 건설업계 표준에 맞는 정보 집약적인 발주서 생성
 */
export class ProfessionalPDFGenerationService {
  static async generateProfessionalPDF(orderData: ComprehensivePurchaseOrderData): Promise<Buffer> {
    // 환경에 따라 다른 PDF 생성 방식 사용
    if (process.env.VERCEL) {
      console.log('📄 [ProfessionalPDF] Vercel 환경: PDFKit으로 PDF 생성');
      return await this.generateProfessionalPDFWithPDFKit(orderData);
    } else {
      console.log('📄 [ProfessionalPDF] 로컬 환경: HTML 템플릿으로 PDF 생성 시도');
      try {
        const htmlContent = this.generateProfessionalHTMLTemplate(orderData);
        return await this.convertHTMLToPDFFromString(htmlContent);
      } catch (htmlError) {
        console.warn('⚠️ [ProfessionalPDF] HTML 템플릿 생성 실패, PDFKit으로 대체:', htmlError);
        console.log('📄 [ProfessionalPDF] 로컬 환경에서 PDFKit으로 대체 실행');
        return await this.generateProfessionalPDFWithPDFKit(orderData);
      }
    }
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
          email: companyData.companyEmail || 'ikjin@example.com', // 이메일 설정 단순화
        },

        vendorCompany: {
          name: orderData.vendorName || '거래처명 없음',
          businessNumber: orderData.vendorBusinessNumber,
          representative: orderData.vendorBusinessNumber ? '대표자' : undefined, // 실제 대표자 정보가 없으면 제외
          address: orderData.vendorAddress,
          phone: orderData.vendorPhone,
          email: orderData.vendorEmail,
          contactPerson: orderData.vendorContactPerson,
        },

        project: {
          name: orderData.projectName || '현장명 없음',
          code: orderData.projectCode,
          location: orderData.projectLocation,
          projectManager: orderData.creatorName, // 현장 책임자로 작성자 사용
          projectManagerContact: orderData.creatorPhone,
          orderManager: orderData.creatorName, // 발주 담당자로 작성자 사용
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
          discountAmount: 0, // 할인 금액이 있으면 여기에 설정
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
      // orderNumber가 이미 PO-로 시작하므로 중복 제거
      const cleanOrderNumber = orderData.orderNumber.startsWith('PO-') ? orderData.orderNumber.substring(3) : orderData.orderNumber;
      const fileName = `PO_Professional_${cleanOrderNumber}_${timestamp}.pdf`;

      // PDF 생성
      let pdfBuffer: Buffer;
      
      if (process.env.VERCEL) {
        console.log('📄 [ProfessionalPDF] Vercel 환경: PDFKit으로 PDF 직접 생성');
        pdfBuffer = await this.generateProfessionalPDFWithPDFKit(orderData);
      } else {
        try {
          console.log('📄 [ProfessionalPDF] 로컬 환경: HTML 템플릿으로 PDF 생성 시도');
          const htmlContent = this.generateProfessionalHTMLTemplate(orderData);
          pdfBuffer = await this.convertHTMLToPDFFromString(htmlContent);
          console.log('✅ [ProfessionalPDF] HTML to PDF 변환 성공');
        } catch (htmlToPdfError) {
          console.warn('⚠️ [ProfessionalPDF] HTML to PDF 변환 실패, PDFKit으로 대체:', htmlToPdfError);
          console.log('📄 [ProfessionalPDF] PDFKit으로 대체 생성 중...');
          pdfBuffer = await this.generateProfessionalPDFWithPDFKit(orderData);
          console.log('✅ [ProfessionalPDF] PDFKit으로 PDF 생성 성공');
        }
      }
      
      // 파일 저장 및 DB 등록 (항상 Base64로 DB에 저장하여 Vercel 호환성 보장)
      const base64Data = pdfBuffer.toString('base64');
      let filePath = '';
      let attachmentId: number;
      
      console.log(`🔍 [ProfessionalPDF] Environment check - VERCEL: ${process.env.VERCEL}, Base64 size: ${base64Data.length} chars`);

      if (process.env.VERCEL) {
        console.log('📝 [ProfessionalPDF] Saving to database with Base64 data...');
        // Vercel 환경: Base64만 저장
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
        // 로컬 환경: 파일 시스템 + Base64 둘 다 저장 (개발 편의성 + 배포 호환성)
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
          fileData: base64Data // 로컬에서도 Base64 저장하여 배포 시 호환성 보장
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
   * 전문적인 HTML 템플릿 생성
   */
  private static generateProfessionalHTMLTemplate(data: ComprehensivePurchaseOrderData): string {
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

    const formatNumber = (num: number) => {
      return new Intl.NumberFormat('ko-KR').format(num);
    };

    // 특이사항 포맷팅 함수 (납품처 정보를 글머리표로)
    const formatRemarks = (item: any) => {
      let result = '';
      
      // 납품처 정보
      if (item.deliveryLocation) {
        result += `• 납품처: ${item.deliveryLocation}`;
      }
      
      // 이메일 정보
      if (item.deliveryEmail) {
        result += `<br/>• 이메일: ${item.deliveryEmail}`;
      }
      
      // 기타 비고사항
      if (item.remarks && item.remarks !== '-' && 
          !item.remarks.includes('납품처:') && 
          !item.remarks.includes('이메일:')) {
        result += `<br/>${item.remarks}`;
      }
      
      return result || '-';
    };

    // 품목 행 생성
    const itemRows = data.items.map((item) => `
      <tr>
        <td class="text-center">${item.sequenceNo}</td>
        <td class="text-small">${item.name}</td>
        <td class="text-small">${item.specification || '-'}</td>
        <td class="text-center">${formatNumber(item.quantity)}</td>
        <td class="text-center">${item.unit || '-'}</td>
        <td class="text-right">${formatCurrency(item.unitPrice)}</td>
        <td class="text-right">${formatCurrency(item.totalPrice)}</td>
        <td class="text-small">${formatRemarks(item)}</td>
      </tr>
    `).join('');

    // 승인자 현황 제거 (간소화)

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>구매 발주서 - ${data.orderNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 8mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Malgun Gothic', 'Nanum Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Arial', sans-serif;
      font-size: 8pt;
      line-height: 1.2;
      color: #000;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
    }
    
    /* === HEADER SECTION === */
    .header {
      display: grid;
      grid-template-columns: 100px 1fr 100px;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 3px solid #1e40af;
      margin-bottom: 12px;
      align-items: center;
    }
    
    .header-center {
      text-align: center;
    }
    
    .header-center h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .header-center .order-number {
      font-size: 12pt;
      font-weight: bold;
      color: #1e40af;
    }
    
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 7pt;
      font-weight: bold;
      margin: 2px 0;
    }
    
    .status-draft { background: #fef3c7; color: #92400e; }
    .status-approved { background: #d1fae5; color: #065f46; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    
    /* === INFO GRID === */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }
    
    .info-box {
      border: 1px solid #d1d5db;
      background: #f9fafb;
      padding: 6px;
    }
    
    .info-box h3 {
      font-size: 9pt;
      font-weight: bold;
      margin-bottom: 4px;
      padding-bottom: 2px;
      border-bottom: 1px solid #d1d5db;
      color: #1f2937;
    }
    
    .info-row {
      display: grid;
      grid-template-columns: 60px 1fr;
      gap: 4px;
      margin-bottom: 1px;
      font-size: 7pt;
    }
    
    .info-label {
      font-weight: bold;
      color: #374151;
    }
    
    .info-value {
      color: #111827;
    }
    
    /* === PROJECT INFO FULL WIDTH === */
    .project-info {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 8px 0;
    }
    
    /* === ITEMS TABLE === */
    .items-section {
      margin: 10px 0;
    }
    
    .items-header {
      background: #1e40af;
      color: white;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 9pt;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7pt;
      margin-bottom: 8px;
    }
    
    th, td {
      border: 1px solid #d1d5db;
      padding: 2px 4px;
      vertical-align: middle;
    }
    
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      text-align: center;
      font-size: 7pt;
    }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-small { font-size: 6pt; }
    
    .financial-summary {
      margin-top: 5px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    
    .financial-row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 10px;
      padding: 3px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 7pt;
    }
    
    .financial-row:last-child {
      border-bottom: none;
      font-weight: bold;
      background: #e2e8f0;
    }
    
    /* === TERMS & CONDITIONS === */
    .terms-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin: 8px 0;
    }
    
    .terms-box {
      border: 1px solid #d1d5db;
      padding: 4px;
      background: #fffbeb;
    }
    
    .terms-box h4 {
      font-size: 8pt;
      font-weight: bold;
      margin-bottom: 3px;
      color: #92400e;
    }
    
    .terms-content {
      font-size: 7pt;
      color: #451a03;
    }
    
    /* === ATTACHMENTS & COMMUNICATION === */
    .comm-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin: 8px 0;
    }
    
    .comm-box {
      border: 1px solid #d1d5db;
      padding: 4px;
      background: #f0f9ff;
      font-size: 7pt;
    }
    
    .comm-box h4 {
      font-size: 8pt;
      font-weight: bold;
      margin-bottom: 3px;
      color: #1e40af;
    }
    
    .attachment-item {
      background: #e0e7ff;
      padding: 2px 4px;
      margin: 1px 0;
      border-radius: 2px;
      font-size: 6pt;
    }
    
    .email-item {
      background: #f0f9ff;
      padding: 2px 4px;
      margin: 1px 0;
      border-radius: 2px;
      font-size: 6pt;
    }
    
    
    /* Approval styles removed */
    .removed-approval-header {
      background: #1e40af;
      color: white;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 9pt;
    }
    
    .approval-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1px;
      padding: 4px;
    }
    
    .approval-box {
      border: 1px solid #d1d5db;
      padding: 4px;
      text-align: center;
      background: white;
      min-height: 50px;
    }
    
    .approval-box.approved {
      background: #d1fae5;
      border-color: #10b981;
    }
    
    .approval-box.rejected {
      background: #fee2e2;
      border-color: #ef4444;
    }
    
    .approval-box.pending {
      background: #fef3c7;
      border-color: #f59e0b;
    }
    
    .approval-title {
      font-size: 7pt;
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .approval-status {
      font-size: 12pt;
      font-weight: bold;
      margin: 3px 0;
    }
    
    .approval-name {
      font-size: 6pt;
      margin-bottom: 1px;
    }
    
    .approval-date {
      font-size: 6pt;
      color: #666;
    }
    
    /* === FOOTER === */
    .footer {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 2px solid #374151;
      font-size: 7pt;
      color: #374151;
    }
    
    .company-info {
      text-align: center;
      margin-bottom: 6px;
    }
    
    .company-info .name {
      font-size: 10pt;
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .doc-metadata {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 10px;
      align-items: center;
      font-size: 6pt;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 4px;
    }
    
    .doc-metadata .center {
      text-align: center;
    }
    
    .doc-metadata .right {
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header" style="text-align: left; padding: 20px 0;">
      <h1 style="margin-bottom: 8px; white-space: nowrap;">구매발주서</h1>
      <div class="order-number" style="margin-bottom: 5px;">발주번호: ${data.orderNumber}</div>
    </div>
    
    <!-- COMPANY & VENDOR INFO -->
    <div class="info-grid">
      <div class="info-box">
        <h3>발주업체 정보</h3>
        <div class="info-row">
          <span class="info-label">업체명</span>
          <span class="info-value">${data.issuerCompany.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">사업자번호</span>
          <span class="info-value">${data.issuerCompany.businessNumber || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">대표자</span>
          <span class="info-value">${data.issuerCompany.representative || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">주소</span>
          <span class="info-value">${data.issuerCompany.address || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">연락처</span>
          <span class="info-value">${data.issuerCompany.phone || '-'}</span>
        </div>
      </div>
      
      <div class="info-box">
        <h3>수주업체 정보</h3>
        <div class="info-row">
          <span class="info-label">업체명</span>
          <span class="info-value">${data.vendorCompany.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">사업자번호</span>
          <span class="info-value">${data.vendorCompany.businessNumber || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">대표자</span>
          <span class="info-value">${data.vendorCompany.representative || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">담당자</span>
          <span class="info-value">${data.vendorCompany.contactPerson || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">연락처</span>
          <span class="info-value">${data.vendorCompany.phone || '-'}</span>
        </div>
      </div>
      
      <!-- PROJECT INFO (FULL WIDTH) -->
      <div class="project-info">
        <div class="info-box">
          <h3>현장</h3>
          <div class="info-row">
            <span class="info-label">현장명</span>
            <span class="info-value">${data.project.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">현장코드</span>
            <span class="info-value">${data.project.code || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">발주처</span>
            <span class="info-value">-</span>
          </div>
        </div>
        
        <div class="info-box">
          <h3>일정</h3>
          <div class="info-row">
            <span class="info-label">발주일</span>
            <span class="info-value">${formatDate(data.orderDate)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">납기일</span>
            <span class="info-value">${formatDate(data.deliveryDate)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">등록일</span>
            <span class="info-value">${formatDate(data.createdAt)}</span>
          </div>
        </div>
        
        <div class="info-box">
          <h3>담당자</h3>
          <div class="info-row">
            <span class="info-label">작성자</span>
            <span class="info-value">${data.creator.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">직책</span>
            <span class="info-value">-</span>
          </div>
          <div class="info-row">
            <span class="info-label">연락처</span>
            <span class="info-value">${data.creator.phone || '-'}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- ITEMS SECTION -->
    <div class="items-section">
      <div class="items-header">발주 품목 (총 ${data.items.length}개 품목)</div>
      <table>
        <thead>
          <tr>
            <th style="width: 5%">순번</th>
            <th style="width: 22%">품목명</th>
            <th style="width: 17%">규격</th>
            <th style="width: 8%">수량</th>
            <th style="width: 6%">단위</th>
            <th style="width: 12%">단가</th>
            <th style="width: 12%">금액</th>
            <th style="width: 23%">특이사항</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
      
      <!-- FINANCIAL SUMMARY -->
      <div class="financial-summary">
        <div class="financial-row">
          <span>소계 (부가세 별도)</span>
          <span></span>
          <span>${formatCurrency(data.financial.subtotalAmount)}</span>
        </div>
        <div class="financial-row">
          <span>부가세 (${(data.financial.vatRate * 100).toFixed(0)}%)</span>
          <span></span>
          <span>${formatCurrency(data.financial.vatAmount)}</span>
        </div>
        <div class="financial-row">
          <span>총 금액</span>
          <span></span>
          <span>${formatCurrency(data.financial.totalAmount)}</span>
        </div>
      </div>
    </div>
    
    
    <!-- NOTES -->
    ${data.metadata.notes ? `
    <div style="margin: 8px 0; padding: 6px; border: 1px solid #d1d5db; background: #fffbeb; font-size: 7pt;">
      <strong>특이사항:</strong> ${data.metadata.notes}
    </div>
    ` : ''}
    
    <!-- FOOTER -->
    <div class="footer">
      <div class="company-info">
        <div class="name">${data.issuerCompany.name}</div>
        ${data.issuerCompany.representative ? `<div>대표자: ${data.issuerCompany.representative}</div>` : ''}
        <div>${data.issuerCompany.address || ''}</div>
        <div>TEL: ${data.issuerCompany.phone || ''} | EMAIL: ${data.issuerCompany.email || ''}</div>
        ${data.issuerCompany.businessNumber ? `<div>사업자등록번호: ${data.issuerCompany.businessNumber}</div>` : ''}
      </div>
      
      <div class="doc-metadata">
        <div>생성일시: ${formatDate(data.metadata.generatedAt)}</div>
        <div class="center">본 문서는 전자적으로 생성되었습니다</div>
        <div class="right">Template ${data.metadata.templateVersion}</div>
      </div>
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
      // Vercel에서는 Playwright 사용 불가하므로 PDFKit으로 대체
      throw new Error('HTML to PDF conversion not supported in Vercel - use PDFKit instead');
    } else {
      try {
        const { chromium } = await import('playwright-chromium');
        
        const browser = await chromium.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-dev-shm-usage'] 
        });
        const page = await browser.newPage();
        
        try {
          await page.setContent(htmlContent, {
            waitUntil: 'networkidle'
          });
          
          const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
              top: '8mm',
              right: '8mm',
              bottom: '8mm',
              left: '8mm'
            }
          });
          
          return pdfBuffer;
          
        } finally {
          await browser.close();
        }
      } catch (playwrightError) {
        console.warn('⚠️ Playwright 실패:', playwrightError);
        // Playwright 오류를 상위로 전달하여 PDFKit으로 대체할 수 있도록 함
        throw playwrightError;
      }
    }
  }

  /**
   * PDFKit으로 전문적인 발주서 PDF 생성
   */
  private static async generateProfessionalPDFWithPDFKit(orderData: ComprehensivePurchaseOrderData): Promise<Buffer> {
    const PDFKitDocument = (await import('pdfkit')).default;
    const fs = await import('fs');
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFKitDocument({ 
          size: 'A4',
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
          autoFirstPage: true
        });
        
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // 한글 폰트 등록 - 한글 지원을 위한 설정
        console.log('📝 [ProfessionalPDF] PDFKit으로 PDF 생성 (한글 폰트 등록)');
        
        // 한글 폰트 경로 설정 (크로스 플랫폼 지원)
        let koreanFontPath = null;
        const possibleFonts = [
          // 프로젝트에 포함된 폰트 우선 사용
          path.join(process.cwd(), 'fonts', 'NotoSansKR-Regular.ttf'),
          path.join(process.cwd(), 'fonts', 'NanumGothic.ttf'),
          path.join(__dirname, '../../fonts', 'NotoSansKR-Regular.ttf'),
          path.join(__dirname, '../../fonts', 'NanumGothic.ttf'),
          // 시스템 폰트
          '/System/Library/Fonts/Supplemental/AppleGothic.ttf', // macOS
          '/System/Library/Fonts/AppleSDGothicNeo.ttc', // macOS AppleSDGothicNeo
          '/System/Library/Fonts/Supplemental/AppleMyungjo.ttf', // macOS 명조
          '/System/Library/Fonts/NanumGothic.ttc', // macOS Nanum Gothic
          'C:\\Windows\\Fonts\\malgun.ttf', // Windows
          'C:\\Windows\\Fonts\\gulim.ttf', // Windows 굴림
          'C:\\Windows\\Fonts\\batang.ttc', // Windows 바탕
          '/usr/share/fonts/truetype/nanum/NanumGothic.ttf', // Linux
          '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', // Linux Noto
          '/usr/share/fonts/truetype/fonts-nanum/NanumGothic.ttf' // Linux Nanum alternative
        ];
        
        // 사용 가능한 폰트 찾기
        for (const fontPath of possibleFonts) {
          try {
            if (fs.existsSync(fontPath)) {
              koreanFontPath = fontPath;
              console.log(`✅ [ProfessionalPDF] 한글 폰트 발견: ${fontPath}`);
              break;
            }
          } catch (error) {
            // 파일 시스템 에러 무시하고 다음 폰트 시도
            continue;
          }
        }
        
        // 한글 폰트 등록 및 설정
        if (koreanFontPath) {
          try {
            // PDFKit에서 한글 폰트 등록
            doc.registerFont('Korean', koreanFontPath);
            doc.font('Korean'); // 기본 폰트를 한글 폰트로 설정
            console.log(`✅ [ProfessionalPDF] 한글 폰트 등록 성공: ${koreanFontPath}`);
          } catch (fontError) {
            console.warn('⚠️ [ProfessionalPDF] 한글 폰트 등록 실패:', fontError);
            // Fallback: 기본 폰트 사용하고 한글을 영문으로 대체
            doc.font('Helvetica');
            console.log('📝 [ProfessionalPDF] 기본 폰트 사용 (한글 -> 영문 대체 모드)');
          }
        } else {
          console.warn('⚠️ [ProfessionalPDF] 한글 폰트를 찾을 수 없음');
          // Fallback: 기본 폰트 사용하고 한글을 영문으로 대체
          doc.font('Helvetica');
          console.log('📝 [ProfessionalPDF] 기본 폰트 사용 (한글 -> 영문 대체 모드)');
        }
        
        // 한글 텍스트를 안전하게 처리하는 함수
        const safeText = (text: string) => {
          if (!text) return '';
          
          // 한글 폰트가 없으면 영문으로 대체
          if (!koreanFontPath) {
            // 기본적인 한글 -> 영문 매핑
            const koreanToEnglish: { [key: string]: string } = {
              '발주서': 'Purchase Order',
              '발주번호': 'Order No',
              '거래처': 'Vendor',
              '품목': 'Item',
              '수량': 'Qty',
              '단가': 'Unit Price',
              '금액': 'Amount',
              '합계': 'Total',
              '부가세': 'VAT',
              '사업자등록번호': 'Business No',
              '대표자': 'Representative',
              '주소': 'Address',
              '전화번호': 'Phone',
              '이메일': 'Email',
              '현장명': 'Project',
              '발주일': 'Order Date',
              '납기일': 'Delivery Date',
              '담당자': 'Contact Person',
              '참고사항': 'Remarks',
              '소계': 'Subtotal',
              '총 금액': 'Total Amount'
            };
            
            // 주요 한글 단어를 영문으로 대체
            let result = text;
            for (const [kor, eng] of Object.entries(koreanToEnglish)) {
              result = result.replace(new RegExp(kor, 'g'), eng);
            }
            
            // 남은 한글 문자를 [Korean Text]로 대체
            if (/[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯ힰ-퟿]/g.test(result)) {
              // 아직 한글이 남아있으면 영문 표기
              result = result.replace(/[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯ힰ-퟿]+/g, '[Korean Text]');
            }
            
            return result
              .replace(/[\x00-\x1F\x7F]/g, '') // 제어 문자 제거
              .replace(/[\u2028\u2029]/g, '') // 줄 구분자 제거
              .trim();
          }
          
          // 한글 폰트가 있으면 그대로 사용
          return text
            .replace(/[\x00-\x1F\x7F]/g, '') // 제어 문자 제거
            .replace(/[\u2028\u2029]/g, '') // 줄 구분자 제거
            .trim();
        };
        
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
        
        // === 헤더 섹션 ===
        // 제목 및 발주서 번호 (왼쪽 정렬)
        doc.fontSize(16).text(safeText('구매발주서'), 20, doc.y);
        doc.fontSize(12).text(safeText(`발주번호: ${orderData.orderNumber}`), 20, doc.y);
        
        // 구분선
        doc.moveTo(20, doc.y + 5).lineTo(575, doc.y + 5).stroke();
        doc.moveDown(1);
        
        // === 정보 섹션 (3열 레이아웃) ===
        const infoY = doc.y;
        doc.fontSize(8);
        
        // 좌측 열 - 발주업체
        doc.text(safeText('【발주업체】'), 20, infoY);
        doc.text(safeText(`업체명: ${orderData.issuerCompany.name}`), 20, infoY + 12);
        doc.text(safeText(`사업자번호: ${orderData.issuerCompany.businessNumber || '-'}`), 20, infoY + 24);
        doc.text(safeText(`연락처: ${orderData.issuerCompany.phone || '-'}`), 20, infoY + 36);
        doc.text(safeText(`주소: ${orderData.issuerCompany.address || '-'}`), 20, infoY + 48);
        
        // 중간 열 - 수주업체
        doc.text(safeText('【수주업체】'), 200, infoY);
        doc.text(safeText(`업체명: ${orderData.vendorCompany.name}`), 200, infoY + 12);
        doc.text(safeText(`사업자번호: ${orderData.vendorCompany.businessNumber || '-'}`), 200, infoY + 24);
        doc.text(safeText(`담당자: ${orderData.vendorCompany.contactPerson || '-'}`), 200, infoY + 36);
        doc.text(safeText(`연락처: ${orderData.vendorCompany.phone || '-'}`), 200, infoY + 48);
        
        // 우측 열 - 현장/일정
        doc.text(safeText('【현장정보】'), 380, infoY);
        doc.text(safeText(`현장명: ${orderData.project.name}`), 380, infoY + 12);
        doc.text(safeText(`발주일: ${formatDate(orderData.orderDate)}`), 380, infoY + 24);
        doc.text(safeText(`납기일: ${formatDate(orderData.deliveryDate)}`), 380, infoY + 36);
        doc.text(safeText(`작성자: ${orderData.creator.name}`), 380, infoY + 48);
        
        doc.y = infoY + 70;
        
        // 구분선
        doc.moveTo(20, doc.y).lineTo(575, doc.y).stroke();
        doc.moveDown(1);
        
        // === 품목 테이블 ===
        doc.fontSize(9).text(safeText(`발주 품목 (총 ${orderData.items.length}개)`), 20);
        doc.moveDown(0.5);
        
        const tableTop = doc.y;
        doc.fontSize(7);
        
        // 테이블 헤더
        doc.rect(20, tableTop, 555, 15).fill('#e5e7eb');
        doc.fillColor('black');
        doc.text('No', 25, tableTop + 3);
        doc.text(safeText('품목명'), 50, tableTop + 3);
        doc.text(safeText('규격'), 180, tableTop + 3);
        doc.text(safeText('수량'), 260, tableTop + 3);
        doc.text(safeText('단위'), 300, tableTop + 3);
        doc.text(safeText('단가'), 340, tableTop + 3);
        doc.text(safeText('금액'), 420, tableTop + 3);
        doc.text(safeText('특이사항'), 500, tableTop + 3);
        
        doc.rect(20, tableTop, 555, 15).stroke();
        
        // 품목 행들
        let currentY = tableTop + 15;
        orderData.items.slice(0, 15).forEach((item, index) => { // 최대 15개 품목만 표시
          const rowHeight = 16;
          
          if (index % 2 === 0) {
            doc.rect(20, currentY, 555, rowHeight).fill('#f9fafb');
            doc.fillColor('black');
          }
          
          doc.fontSize(6);
          doc.text(`${item.sequenceNo}`, 25, currentY + 3);
          doc.text(safeText(item.name.substring(0, 25)), 50, currentY + 3);
          doc.text(safeText((item.specification || '-').substring(0, 15)), 180, currentY + 3);
          doc.text(safeText(item.quantity.toString()), 260, currentY + 3);
          doc.text(safeText(item.unit || '-'), 300, currentY + 3);
          doc.text(safeText(formatCurrency(item.unitPrice)), 340, currentY + 3);
          doc.text(safeText(formatCurrency(item.totalPrice)), 420, currentY + 3);
          // 특이사항 포맷팅 (납품처 정보)
          const formatRemarksForPDF = (item: any) => {
            let result = '';
            // 납품처 정보
            if (item.deliveryLocation) {
              result += `• ${item.deliveryLocation.substring(0, 15)}`;
            }
            // 이메일 정보
            if (item.deliveryEmail) {
              result += `\\n${item.deliveryEmail.substring(0, 20)}`;
            }
            return result || '-';
          };
          doc.text(safeText(formatRemarksForPDF(item)), 500, currentY + 3);
          
          doc.rect(20, currentY, 555, rowHeight).stroke();
          currentY += rowHeight;
        });
        
        // 더 많은 품목이 있는 경우 표시
        if (orderData.items.length > 15) {
          doc.rect(20, currentY, 555, 16).fill('#fef3c7');
          doc.fillColor('black');
          doc.fontSize(7).text(safeText(`... 외 ${orderData.items.length - 15}개 품목 (별도 첨부자료 참고)`), 25, currentY + 3);
          doc.rect(20, currentY, 555, 16).stroke();
          currentY += 16;
        }
        
        // 금액 합계
        doc.rect(20, currentY, 555, 16).fill('#e3f2fd');
        doc.fillColor('black');
        doc.fontSize(6);
        doc.text(safeText('소계 (부가세별도)'), 25, currentY + 3);
        doc.text(safeText(formatCurrency(orderData.financial.subtotalAmount)), 420, currentY + 3);
        doc.rect(20, currentY, 555, 16).stroke();
        currentY += 16;
        
        doc.rect(20, currentY, 555, 16).fill('#e3f2fd');
        doc.fillColor('black');
        doc.fontSize(6);
        doc.text(safeText(`부가세 (${(orderData.financial.vatRate * 100).toFixed(0)}%)`), 25, currentY + 3);
        doc.text(safeText(formatCurrency(orderData.financial.vatAmount)), 420, currentY + 3);
        doc.rect(20, currentY, 555, 16).stroke();
        currentY += 16;
        
        doc.rect(20, currentY, 555, 16).fill('#1e40af');
        doc.fillColor('white');
        doc.fontSize(7).text(safeText('총 금액'), 25, currentY + 3);
        doc.text(safeText(formatCurrency(orderData.financial.totalAmount)), 420, currentY + 3);
        doc.rect(20, currentY, 555, 16).stroke();
        
        doc.fillColor('black');
        doc.moveDown(2);
        
        // === 추가 정보 섹션 ===
        doc.fontSize(7);
        
        // 특이사항
        if (orderData.metadata.notes) {
          doc.text(safeText('특이사항:'), 20);
          doc.text(safeText(orderData.metadata.notes), 20, doc.y + 8);
          doc.moveDown(1);
        }
        
        // === 결재선 제거 (간소화) ===
        doc.moveDown(2);
        
        // === 하단 정보 ===
        doc.y = doc.y + 15;
        doc.fontSize(8);
        doc.text(safeText(orderData.issuerCompany.name), { align: 'center' });
        if (orderData.issuerCompany.representative) {
          doc.text(safeText(`대표자: ${orderData.issuerCompany.representative}`), { align: 'center' });
        }
        doc.fontSize(6);
        doc.text(safeText(orderData.issuerCompany.address || ''), { align: 'center' });
        doc.text(safeText(`TEL: ${orderData.issuerCompany.phone || ''} | EMAIL: ${orderData.issuerCompany.email || ''}`), { align: 'center' });
        doc.text(safeText(`사업자등록번호: ${orderData.issuerCompany.businessNumber || ''}`), { align: 'center' });
        
        doc.moveDown(1);
        doc.fontSize(6);
        doc.text(safeText(`문서 ID: ${orderData.metadata.documentId} | 생성일시: ${formatDate(orderData.metadata.generatedAt)} | Template: ${orderData.metadata.templateVersion}`), { align: 'center' });
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }

}