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
 * 건설업계 표준에 맞는 정보 집약적인 발주서 생성
 */
export class ProfessionalPDFGenerationService {
  static async generateProfessionalPDF(orderData: ComprehensivePurchaseOrderData): Promise<Buffer> {
    // CRITICAL: 모든 환경에서 일관된 고품질 PDFKit 버전만 사용
    // 한글 폰트 실패 시에도 고품질 Times-Roman fallback으로 전문적 외관 보장
    console.log('📄 [ProfessionalPDF] 일관된 고품질 PDFKit으로 PDF 생성 시작');
    return await this.generateProfessionalPDFWithPDFKit(orderData);
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

      // PDF 생성 - 항상 PDFKit 사용으로 일관된 고품질 출력 보장
      console.log('📄 [ProfessionalPDF] 고품질 PDFKit으로 PDF 생성 (모든 환경에서 일관된 출력)');
      const pdfBuffer = await this.generateProfessionalPDFWithPDFKit(orderData);
      console.log('✅ [ProfessionalPDF] PDFKit으로 PDF 생성 성공');
      
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
      margin: 12mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Malgun Gothic', 'Nanum Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Arial', sans-serif;
      font-size: 9pt;
      line-height: 1.4;
      color: #1a1a1a;
      background: #fff;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
    }
    
    /* === ENHANCED HEADER SECTION === */
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 16px 20px;
      margin: -12mm -12mm 16px -12mm;
      text-align: center;
      position: relative;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .header::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 0;
      right: 0;
      height: 8px;
      background: linear-gradient(to right, transparent, rgba(37, 99, 235, 0.3), transparent);
    }
    
    .header h1 {
      font-size: 24pt;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: 2px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    
    .header .order-number {
      font-size: 14pt;
      font-weight: 600;
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 12px;
      display: inline-block;
    }
    
    .header .order-date {
      font-size: 11pt;
      margin-top: 6px;
      opacity: 0.9;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 8pt;
      font-weight: 600;
      margin: 4px 6px 0 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-draft { 
      background: linear-gradient(135deg, #fbbf24, #f59e0b); 
      color: white; 
      box-shadow: 0 2px 4px rgba(251, 191, 36, 0.3);
    }
    .status-approved { 
      background: linear-gradient(135deg, #10b981, #059669); 
      color: white; 
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
    }
    .status-sent { 
      background: linear-gradient(135deg, #3b82f6, #2563eb); 
      color: white; 
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    }
    
    /* === ENHANCED INFO GRID === */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .info-box {
      border: 1px solid #e5e7eb;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    
    .info-box h3 {
      font-size: 11pt;
      font-weight: 700;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 2px solid #2563eb;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-row {
      display: grid;
      grid-template-columns: 80px 1fr;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 8pt;
      align-items: center;
    }
    
    .info-label {
      font-weight: 600;
      color: #475569;
      text-align: right;
      padding-right: 4px;
    }
    
    .info-value {
      color: #1e293b;
      font-weight: 500;
      padding: 2px 6px;
      background: rgba(255,255,255,0.7);
      border-radius: 4px;
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
  public static async generateProfessionalPDFWithPDFKit(orderData: ComprehensivePurchaseOrderData): Promise<Buffer> {
    try {
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

        // === 개선된 한글 폰트 관리자를 통한 최적화된 폰트 로딩 ===
        console.log('📝 [ProfessionalPDF] PDFKit으로 PDF 생성 (한글 폰트 최적화 로딩)');
        
        // CRITICAL FIX: 서버리스 환경에서 폰트 초기화 확인 및 재시도
        console.log('🔧 [ProfessionalPDF] 서버리스 환경 폰트 초기화 검증...');
        const availableFontsCount = fontManager.getAvailableFonts().length;
        
        if (availableFontsCount === 0 && process.env.VERCEL) {
          console.log('⚠️ [ProfessionalPDF] 서버리스 환경에서 폰트 없음 - 강제 재초기화 시도');
          // Force re-initialization in serverless environment
          const { KoreanFontManager } = require('../utils/korean-font-manager.js');
          const freshFontManager = KoreanFontManager.getInstance();
          console.log(`🔄 [ProfessionalPDF] 폰트 재초기화 완료: ${freshFontManager.getAvailableFonts().length}개 폰트 발견`);
        }
        
        // 폰트 문제 진단
        const fontDiagnosis = fontManager.diagnoseFontIssues();
        console.log('🔍 [ProfessionalPDF] 폰트 진단 결과:', JSON.stringify(fontDiagnosis, null, 2));
        
        let hasKoreanFont = false;
        let selectedFont: FontInfo | null = null;
        let fontName = 'Helvetica'; // Default fallback font
        
        try {
          // 폰트 관리자에서 최적의 한글 폰트 선택
          selectedFont = fontManager.getBestKoreanFont();
          
          if (selectedFont && selectedFont.available) {
            console.log(`🎯 [ProfessionalPDF] 선택된 한글 폰트: ${selectedFont.name}`);
            
            if (process.env.VERCEL) {
              // Vercel 환경: Base64 방식으로 폰트 로드
              console.log('☁️ [ProfessionalPDF] Vercel 환경: Base64 폰트 로딩 방식');
              
              const fontBuffer = fontManager.getFontBuffer(selectedFont.name);
              if (fontBuffer) {
                doc.registerFont('Korean', fontBuffer);
                fontName = 'Korean';
                hasKoreanFont = true;
                console.log('✅ [ProfessionalPDF] Vercel 환경에서 한글 폰트 등록 성공');
              } else {
                throw new Error('FontBuffer 로드 실패');
              }
            } else {
              // 로컬 환경: 파일 경로 방식으로 폰트 로드
              console.log('🏠 [ProfessionalPDF] 로컬 환경: 파일 경로 폰트 로딩 방식');
              
              doc.registerFont('Korean', selectedFont.path);
              fontName = 'Korean';
              hasKoreanFont = true;
              console.log(`✅ [ProfessionalPDF] 로컬 환경에서 한글 폰트 등록 성공: ${selectedFont.path}`);
            }
          } else {
            throw new Error('사용 가능한 한글 폰트가 없음');
          }
        } catch (fontError) {
          console.warn('⚠️ [ProfessionalPDF] 한글 폰트 등록 실패:', fontError);
          console.warn('⚠️ [ProfessionalPDF] 폰트 진단:', JSON.stringify(fontDiagnosis, null, 2));
          
          // CRITICAL FIX: 폰트 실패 시에도 고품질 fallback 사용
          // Helvetica 대신 Times-Roman을 사용하고 폰트 크기를 조정하여 품질 보장
          try {
            doc.registerFont('FallbackFont', 'Times-Roman');
            fontName = 'FallbackFont';
            console.log('📝 [ProfessionalPDF] 고품질 Times-Roman 대체 폰트 사용');
          } catch {
            fontName = 'Times-Roman';
            console.log('📝 [ProfessionalPDF] 시스템 Times-Roman 폰트 사용');
          }
          hasKoreanFont = false;
          
          // 폰트 지원 상태 보고서 출력
          const fontReport = fontManager.getFontReport();
          console.log('📊 [ProfessionalPDF] 폰트 지원 상태:', JSON.stringify(fontReport, null, 2));
          console.log('📝 [ProfessionalPDF] 고품질 대체 폰트 사용 (한글 지원 모드 비활성화)');
        }
        
        // 항상 선택된 폰트를 적용
        doc.font(fontName);
        
        // 한글 텍스트를 안전하게 처리하는 함수 (개선된 버전 - 폰트 없어도 고품질 보장)
        const safeText = (text: string) => {
          if (!text) return '';
          
          // 한글 폰트가 없어도 텍스트 품질을 보장
          if (hasKoreanFont) {
            return fontManager.safeKoreanText(text, hasKoreanFont);
          } else {
            // 한글 폰트 없을 때도 텍스트를 그대로 출력 (Times-Roman이 일부 한글 지원)
            return text;
          }
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
        
        // === 개선된 헤더 섹션 - 타겟 디자인 매칭 ===
        const headerY = 20;
        
        // 클린한 헤더 (배경색 없음, 심플한 디자인)
        doc.fillColor('black').fontSize(24).font(fontName);
        doc.text(safeText('구매발주서'), 30, headerY);
        
        // 발주번호 (우측 정렬, 적절한 크기)
        doc.fontSize(14);
        doc.text(safeText(`발주번호: ${orderData.orderNumber}`), 400, headerY);
        
        // 헤더 하단 구분선
        doc.moveTo(20, headerY + 35).lineTo(575, headerY + 35).stroke();
        
        // 다음 섹션을 위해 위치 설정
        doc.y = headerY + 50;
        
        // === 타겟 디자인 매칭: 정보 섹션 (2+3 그리드 레이아웃) ===
        const infoY = doc.y + 10;
        const boxHeight = 85;
        
        // 회색 테두리 박스 그리기 함수
        const drawInfoBox = (x: number, width: number, y: number, title: string, items: {label: string, value: string}[]) => {
          // 회색 테두리 박스
          doc.rect(x, y, width, boxHeight).stroke('#d1d5db');
          
          // 제목 (흰 배경에 검은 텍스트)
          doc.fillColor('black').fontSize(10).font(fontName);
          doc.text(safeText(title), x + 8, y + 8);
          
          // 항목들
          doc.fontSize(8);
          items.forEach((item, index) => {
            const itemY = y + 25 + (index * 12);
            // 레이블
            doc.fillColor('#666666');
            doc.text(safeText(item.label), x + 12, itemY);
            // 값
            doc.fillColor('black');
            doc.text(safeText(item.value), x + 80, itemY);
          });
        };
        
        // 첫 번째 행: 발주업체 정보 (좌측) + 수주업체 정보 (우측)
        const firstRowY = infoY;
        const boxWidth = 270;
        
        // 발주업체 정보
        drawInfoBox(20, boxWidth, firstRowY, '발주업체 정보', [
          { label: '업체명', value: orderData.issuerCompany.name },
          { label: '사업자번호', value: orderData.issuerCompany.businessNumber || '-' },
          { label: '대표자', value: orderData.issuerCompany.representative || '-' },
          { label: '주소', value: (orderData.issuerCompany.address || '-').substring(0, 32) + (orderData.issuerCompany.address && orderData.issuerCompany.address.length > 32 ? '...' : '') },
          { label: '연락처', value: orderData.issuerCompany.phone || '-' }
        ]);
        
        // 수주업체 정보
        drawInfoBox(305, boxWidth, firstRowY, '수주업체 정보', [
          { label: '업체명', value: orderData.vendorCompany.name },
          { label: '사업자번호', value: orderData.vendorCompany.businessNumber || '-' },
          { label: '대표자', value: orderData.vendorCompany.representative || '-' },
          { label: '담당자', value: orderData.vendorCompany.contactPerson || '-' },
          { label: '연락처', value: orderData.vendorCompany.phone || '-' }
        ]);
        
        // 두 번째 행: 현장 + 일정 + 담당자 (3개 컬럼)
        const secondRowY = firstRowY + boxHeight + 10;
        const smallBoxWidth = 183;
        
        // 현장 정보
        drawInfoBox(20, smallBoxWidth, secondRowY, '현장', [
          { label: '현장명', value: orderData.project.name },
          { label: '현장코드', value: orderData.project.code || '-' },
          { label: '발주처', value: '-' }
        ]);
        
        // 일정 정보
        drawInfoBox(210, smallBoxWidth, secondRowY, '일정', [
          { label: '발주일', value: formatDate(orderData.orderDate) },
          { label: '납기일', value: formatDate(orderData.deliveryDate) },
          { label: '등록일', value: formatDate(orderData.createdAt) }
        ]);
        
        // 담당자 정보
        drawInfoBox(400, smallBoxWidth, secondRowY, '담당자', [
          { label: '작성자', value: orderData.creator.name },
          { label: '직책', value: '-' },
          { label: '연락처', value: orderData.creator.phone || '-' }
        ]);
        
        doc.y = secondRowY + boxHeight + 15;
        
        // 구분선 제거 (클린한 디자인)
        
        // === 타겟 디자인 매칭: 품목 테이블 ===
        const titleY = doc.y;
        
        // 파란색 테이블 헤더 (타겟과 동일한 스타일)
        const headerHeight = 22;
        doc.rect(20, titleY, 555, headerHeight).fill('#2563eb');
        doc.fillColor('white').fontSize(10).font(fontName);
        doc.text(safeText(`발주 품목 (총 ${orderData.items.length}개 품목)`), 25, titleY + 6);
        
        // 테이블 컬럼 헤더
        const tableHeaderY = titleY + headerHeight;
        const rowHeight = 20;
        
        // 컬럼 정의 (타겟 레이아웃과 정확히 매칭)
        const columns = [
          { text: '순번', x: 25, width: 35, align: 'center' },
          { text: '품목명', x: 65, width: 140, align: 'left' },
          { text: '규격', x: 210, width: 100, align: 'center' },
          { text: '수량', x: 315, width: 40, align: 'center' },
          { text: '단위', x: 360, width: 35, align: 'center' },
          { text: '단가', x: 400, width: 60, align: 'right' },
          { text: '금액', x: 465, width: 70, align: 'right' },
          { text: '특이사항', x: 540, width: 35, align: 'center' }
        ];
        
        // 테이블 헤더 행 (회색 배경)
        doc.rect(20, tableHeaderY, 555, rowHeight).fill('#f3f4f6').stroke('#d1d5db');
        doc.fillColor('black').fontSize(8).font(fontName);
        
        // 컬럼 헤더 텍스트
        columns.forEach(col => {
          let textX = col.x;
          if (col.align === 'center') textX = col.x + (col.width / 2) - 10;
          else if (col.align === 'right') textX = col.x + col.width - 15;
          doc.text(safeText(col.text), textX, tableHeaderY + 6);
        });
        
        // 수직 구분선들
        let currentX = 20;
        columns.forEach((col, index) => {
          if (index > 0) {
            doc.moveTo(currentX, tableHeaderY).lineTo(currentX, tableHeaderY + rowHeight).stroke('#d1d5db');
          }
          currentX += col.width;
        });
        
        doc.fillColor('black');
        
        // 품목 데이터 행들 (교대 배경색으로 가독성 향상)
        let currentY = tableHeaderY + rowHeight;
        orderData.items.slice(0, 15).forEach((item, index) => { // 최대 15개 품목만 표시
          // 교대로 배경색 적용 (타겟 디자인과 매칭)
          const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(20, currentY, 555, rowHeight).fill(bgColor).stroke('#d1d5db');
          doc.fillColor('black').fontSize(7).font(fontName);
          
          // 특이사항 포맷팅
          const formatRemarksForPDF = (item: any) => {
            if (item.deliveryLocation || item.deliveryEmail) {
              return `납품처: ${item.deliveryLocation || ''} ${item.deliveryEmail || ''}`.trim();
            }
            return item.remarks && item.remarks !== '-' ? item.remarks.substring(0, 10) + '...' : '-';
          };
          
          // 각 컬럼에 데이터 정확히 배치 (정렬에 맞춰)
          doc.text(`${item.sequenceNo}`, 37, currentY + 6); // 순번 (중앙정렬)
          doc.text(safeText(item.name.substring(0, 20)), 70, currentY + 6); // 품목명
          doc.text(safeText((item.specification || '-').substring(0, 14)), 240, currentY + 6); // 규격 (중앙정렬)
          doc.text(safeText(item.quantity.toLocaleString()), 325, currentY + 6); // 수량 (중앙정렬)
          doc.text(safeText(item.unit || '-'), 372, currentY + 6); // 단위 (중앙정렬)
          doc.text(safeText(`₩${item.unitPrice.toLocaleString()}`), 450, currentY + 6); // 단가 (우측정렬)
          doc.text(safeText(`₩${item.totalPrice.toLocaleString()}`), 520, currentY + 6); // 금액 (우측정렬)
          doc.text(safeText(formatRemarksForPDF(item)), 545, currentY + 6); // 특이사항
          
          // 수직 구분선들
          let lineX = 20;
          columns.forEach((col, colIndex) => {
            if (colIndex > 0) {
              doc.moveTo(lineX, currentY).lineTo(lineX, currentY + rowHeight).stroke('#d1d5db');
            }
            lineX += col.width;
          });
          
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
        
        // 타겟 디자인 매칭: 금액 합계 섹션
        const summaryY = currentY + 5;
        const summaryHeight = 18;
        
        // 소계 행
        doc.rect(20, summaryY, 555, summaryHeight).fill('#ffffff').stroke('#d1d5db');
        doc.fillColor('black').fontSize(8).font(fontName);
        doc.text(safeText('소계 (부가세 별도)'), 30, summaryY + 5);
        doc.text(safeText(`₩${orderData.financial.subtotalAmount.toLocaleString()}`), 500, summaryY + 5);
        
        // 부가세 행
        const vatY = summaryY + summaryHeight;
        doc.rect(20, vatY, 555, summaryHeight).fill('#ffffff').stroke('#d1d5db');
        doc.fillColor('black').fontSize(8);
        doc.text(safeText(`부가세 (${(orderData.financial.vatRate * 100).toFixed(0)}%)`), 30, vatY + 5);
        doc.text(safeText(`₩${orderData.financial.vatAmount.toLocaleString()}`), 500, vatY + 5);
        
        // 총 금액 행 (강조된 배경)
        const totalY = vatY + summaryHeight;
        doc.rect(20, totalY, 555, summaryHeight + 2).fill('#e5e7eb').stroke('#d1d5db');
        doc.fillColor('black').fontSize(10).font(fontName);
        doc.text(safeText('총 금액'), 30, totalY + 6);
        doc.fontSize(10);
        doc.text(safeText(`₩${orderData.financial.totalAmount.toLocaleString()}`), 490, totalY + 6);
        
        currentY = totalY + summaryHeight + 2;
        
        doc.fillColor('black');
        doc.moveDown(2);
        
        // === 특이사항 섹션 (타겟 디자인 매칭) ===
        if (orderData.metadata.notes) {
          const notesY = currentY + 10;
          const notesHeight = 25;
          
          // 연한 배경의 특이사항 박스
          doc.rect(20, notesY, 555, notesHeight).fill('#fffbeb').stroke('#d1d5db');
          
          doc.fillColor('black').fontSize(8).font(fontName);
          doc.text(safeText(`특이사항: ${orderData.metadata.notes}`), 25, notesY + 8);
          
          currentY = notesY + notesHeight + 5;
        }
        
        // === 결재선 제거 (간소화) ===
        doc.moveDown(2);
        
        // === 타겟 디자인 매칭: 하단 회사 정보 및 문서 메타데이터 ===
        const footerY = currentY + 25;
        doc.y = footerY;
        
        // 구분선
        doc.moveTo(20, doc.y).lineTo(575, doc.y).stroke();
        doc.y += 10;
        
        // 회사명 (중앙 정렬, 큰 폰트)
        doc.fontSize(12).font(fontName);
        doc.text(safeText(orderData.issuerCompany.name), 0, doc.y, { align: 'center', width: 595 });
        doc.moveDown(0.3);
        
        // 대표자 정보
        if (orderData.issuerCompany.representative) {
          doc.fontSize(8);
          doc.text(safeText(`대표자: ${orderData.issuerCompany.representative}`), 0, doc.y, { align: 'center', width: 595 });
          doc.moveDown(0.3);
        }
        
        // 주소
        doc.fontSize(7);
        doc.text(safeText(orderData.issuerCompany.address || ''), 0, doc.y, { align: 'center', width: 595 });
        doc.moveDown(0.3);
        
        // 연락처 정보
        doc.text(safeText(`TEL: ${orderData.issuerCompany.phone || ''} | EMAIL: ${orderData.issuerCompany.email || ''}`), 0, doc.y, { align: 'center', width: 595 });
        doc.moveDown(0.3);
        
        // 사업자등록번호
        if (orderData.issuerCompany.businessNumber) {
          doc.text(safeText(`사업자등록번호: ${orderData.issuerCompany.businessNumber}`), 0, doc.y, { align: 'center', width: 595 });
        }
        
        doc.moveDown(0.5);
        
        // 문서 메타데이터 (3열 레이아웃)
        const metaY = doc.y + 5;
        doc.fontSize(6).fillColor('#666666');
        
        // 좌측: 생성일시
        doc.text(safeText(`생성일시: ${formatDate(orderData.metadata.generatedAt)}`), 20, metaY);
        
        // 중앙: 전자문서 표시
        doc.text(safeText('본 문서는 전자적으로 생성되었습니다'), 0, metaY, { align: 'center', width: 595 });
        
        // 우측: 템플릿 버전
        doc.text(safeText(`Template ${orderData.metadata.templateVersion}`), 0, metaY, { align: 'right', width: 575 });
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
    
    } catch (importError) {
      console.error('❌ [ProfessionalPDF] PDFKit import 실패:', importError);
      throw new Error(`PDFKit을 로드할 수 없습니다 (환경: ${process.env.VERCEL ? 'Vercel' : 'Local'}): ${importError instanceof Error ? importError.message : 'Unknown error'}`);
    }
  }

}