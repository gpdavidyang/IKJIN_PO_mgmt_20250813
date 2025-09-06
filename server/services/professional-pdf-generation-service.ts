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
  orderStatus?: string;
  approvalStatus?: string;
  createdAt?: Date;
  updatedAt?: Date;
  
  // === 발주업체 정보 (회사) ===
  issuerCompany: {
    name: string;
    businessNumber?: string;
    representative?: string;
    address?: string;
    phone?: string;
    fax?: string;
    email?: string;
    website?: string;
  };
  
  // === 수주업체 정보 (거래처) ===
  vendorCompany: {
    name: string;
    businessNumber?: string;
    representative?: string;
    address?: string;
    phone?: string;
    fax?: string;
    email?: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    businessType?: string;
  };
  
  // === 현장 정보 ===
  project: {
    name: string;
    code?: string;
    clientName?: string;
    location?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    projectManager?: string;
    projectManagerContact?: string;
    orderManager?: string;
    orderManagerContact?: string;
    totalBudget?: number;
  };
  
  // === 작성자/담당자 정보 ===
  creator: {
    name: string;
    email?: string;
    phone?: string;
    position?: string;
    role?: string;
    department?: string;
  };
  
  // === 품목 정보 ===
  items: Array<{
    sequenceNo: number;
    majorCategory?: string;
    middleCategory?: string;
    minorCategory?: string;
    itemCode?: string;
    name: string;
    specification?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    totalPrice: number;
    deliveryLocation?: string;
    remarks?: string;
    categoryPath?: string; // "대분류 > 중분류 > 소분류" 형태
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
  
  // === 계약 조건 ===
  terms: {
    paymentTerms?: string;
    deliveryTerms?: string;
    warrantyPeriod?: string;
    penaltyRate?: string;
    qualityStandard?: string;
    inspectionMethod?: string;
  };
  
  // === 첨부파일 및 커뮤니케이션 ===
  attachments: {
    count: number;
    hasAttachments: boolean;
    fileNames: string[];
    totalSize: number;
  };
  
  communication: {
    emailHistory: Array<{
      sentAt: Date;
      recipient: string;
      subject: string;
      status: string;
    }>;
    lastEmailSent?: Date;
    totalEmailsSent: number;
  };
  
  // === 결재/승인 정보 ===
  approval: {
    currentStatus: string;
    approvalLevel: number;
    approvers: Array<{
      role: string;
      name?: string;
      position?: string;
      department?: string;
      status: string; // pending, approved, rejected
      approvedAt?: Date;
      comments?: string;
    }>;
    requestedAt?: Date;
    completedAt?: Date;
  };
  
  // === 기타 정보 ===
  metadata: {
    notes?: string;
    specialInstructions?: string;
    riskFactors?: string;
    complianceNotes?: string;
    revisionNumber?: number;
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
      const orderQuery = await db.db
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
      const companyQuery = await db.db
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
        companyFax: null,
        companyWebsite: null,
        companyRepresentative: null,
      };

      // 품목 정보 조회
      const itemsQuery = await db.db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.orderId, orderId));

      // 첨부파일 정보 조회
      const attachmentsQuery = await db.db
        .select()
        .from(attachments)
        .where(eq(attachments.orderId, orderId));

      // 이메일 발송 이력 조회 (테이블이 있는 경우만)
      let emailHistoryQuery: any[] = [];
      try {
        emailHistoryQuery = await db.db
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
        orderStatus: orderData.orderStatus || 'draft',
        approvalStatus: orderData.approvalStatus || 'not_required',
        createdAt: orderData.createdAt,
        updatedAt: orderData.updatedAt,

        issuerCompany: {
          name: companyData.companyName || '발주업체',
          businessNumber: companyData.companyBusinessNumber,
          representative: companyData.companyRepresentative,
          address: companyData.companyAddress,
          phone: companyData.companyPhone,
          email: await this.getSystemEmail() || companyData.companyEmail,
          fax: companyData.companyFax,
          website: companyData.companyWebsite,
        },

        vendorCompany: {
          name: orderData.vendorName || '거래처명 없음',
          businessNumber: orderData.vendorBusinessNumber,
          address: orderData.vendorAddress,
          phone: orderData.vendorPhone,
          email: orderData.vendorEmail,
          contactPerson: orderData.vendorContactPerson,
          businessType: orderData.vendorBusinessType,
        },

        project: {
          name: orderData.projectName || '현장명 없음',
          code: orderData.projectCode,
          clientName: orderData.projectClientName,
          location: orderData.projectLocation,
          startDate: orderData.projectStartDate,
          endDate: orderData.projectEndDate,
          totalBudget: Number(orderData.projectTotalBudget) || undefined,
        },

        creator: {
          name: orderData.creatorName || '작성자 정보 없음',
          email: orderData.creatorEmail,
          phone: orderData.creatorPhone,
          position: orderData.creatorPosition,
          role: orderData.creatorRole,
        },

        items: itemsQuery.map((item, index) => ({
          sequenceNo: index + 1,
          majorCategory: item.majorCategory,
          middleCategory: item.middleCategory,
          minorCategory: item.minorCategory,
          name: item.itemName,
          specification: item.specification,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalAmount),
          remarks: item.notes,
          categoryPath: [
            item.majorCategory,
            item.middleCategory,
            item.minorCategory
          ].filter(Boolean).join(' | '),
        })),

        financial: {
          subtotalAmount,
          vatRate: this.VAT_RATE,
          vatAmount,
          totalAmount,
          currencyCode: 'KRW',
        },

        terms: {
          paymentTerms: '계약서에 따름',
          deliveryTerms: '현장 직납',
          warrantyPeriod: '1년',
          qualityStandard: 'KS 기준',
          inspectionMethod: '현장 검수',
        },

        attachments: {
          count: attachmentsQuery.length,
          hasAttachments: attachmentsQuery.length > 0,
          fileNames: attachmentsQuery.map(att => att.originalName),
          totalSize: attachmentsQuery.reduce((sum, att) => sum + (att.fileSize || 0), 0),
        },

        communication: {
          emailHistory: emailHistoryQuery.map(email => ({
            sentAt: email.sentAt,
            recipient: email.recipientEmail,
            subject: email.subject,
            status: email.status,
          })),
          lastEmailSent: emailHistoryQuery[0]?.sentAt,
          totalEmailsSent: emailHistoryQuery.length,
        },

        approval: {
          currentStatus: orderData.approvalStatus || 'not_required',
          approvalLevel: orderData.approvalLevel || 1,
          approvers: [
            { role: 'field_worker', status: 'approved' },
            { role: 'project_manager', status: 'pending' },
            { role: 'hq_management', status: 'pending' },
            { role: 'executive', status: 'pending' },
            { role: 'admin', status: 'pending' },
          ],
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
        console.log('📄 [ProfessionalPDF] 로컬 환경: HTML 템플릿으로 PDF 생성');
        const htmlContent = this.generateProfessionalHTMLTemplate(orderData);
        pdfBuffer = await this.convertHTMLToPDFFromString(htmlContent);
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

    const formatDateTime = (date?: Date | null) => {
      if (!date) return '-';
      return format(new Date(date), 'yyyy.MM.dd HH:mm', { locale: ko });
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

    // 특이사항 포맷팅 함수 (카테고리는 파이프로, 납품처 정보는 글머리표로)
    const formatRemarks = (item: any) => {
      let result = '';
      
      // 카테고리 정보가 있으면 파이프로 구분하여 추가
      if (item.categoryPath && item.categoryPath !== '-') {
        result += item.categoryPath + '<br/>';
      }
      
      // 기존 remarks에서 납품처 정보를 글머리표로 포맷팅
      if (item.remarks && item.remarks !== '-') {
        const formattedRemarks = item.remarks
          .replace(/납품처:/g, '• 납품처:')
          .replace(/이메일:/g, '<br/>• 이메일:');
        result += formattedRemarks;
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

    // 승인자 현황
    const approverBoxes = data.approval.approvers.map(approver => {
      const statusIcon = approver.status === 'approved' ? '✓' : 
                        approver.status === 'rejected' ? '✗' : '○';
      const statusClass = approver.status === 'approved' ? 'approved' : 
                         approver.status === 'rejected' ? 'rejected' : 'pending';
      
      return `
        <div class="approval-box ${statusClass}">
          <div class="approval-title">${this.getRoleDisplayName(approver.role)}</div>
          <div class="approval-status">${statusIcon}</div>
          <div class="approval-name">${approver.name || '-'}</div>
          ${approver.approvedAt ? `<div class="approval-date">${formatDate(approver.approvedAt)}</div>` : ''}
        </div>
      `;
    }).join('');

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
      font-size: 8pt;
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
      <h1 style="margin-bottom: 8px;">구매 발주서</h1>
      <div class="order-number" style="margin-bottom: 5px;">발주번호: ${data.orderNumber}</div>
      <div style="font-size: 6pt; color: #666; line-height: 1.2;">
        생성일: ${formatDate(data.metadata.generatedAt)}
      </div>
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
            <span class="info-value">${data.project.clientName || '-'}</span>
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
            <span class="info-value">${data.creator.position || data.creator.role || '-'}</span>
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
    
    <!-- ATTACHMENTS & COMMUNICATION -->
    <div class="comm-grid">
      <div class="comm-box">
        <h4>첨부파일 (${data.attachments.count}개)</h4>
        ${data.attachments.hasAttachments ? 
          data.attachments.fileNames.slice(0, 3).map(name => 
            `<div class="attachment-item">${name.length > 30 ? name.substring(0, 30) + '...' : name}</div>`
          ).join('') +
          (data.attachments.count > 3 ? `<div class="attachment-item">... 외 ${data.attachments.count - 3}개</div>` : '')
          : '<div style="color: #666;">첨부파일 없음</div>'
        }
        ${data.attachments.totalSize > 0 ? `<div style="margin-top: 3px; font-size: 6pt; color: #666;">총 크기: ${Math.round(data.attachments.totalSize / 1024)}KB</div>` : ''}
      </div>
      
      <div class="comm-box">
        <h4>이메일 발송 이력 (${data.communication.totalEmailsSent}회)</h4>
        ${data.communication.emailHistory.length > 0 ?
          data.communication.emailHistory.slice(0, 2).map(email =>
            `<div class="email-item">${formatDateTime(email.sentAt)} | ${email.recipient.split('@')[0]}@...</div>`
          ).join('') +
          (data.communication.totalEmailsSent > 2 ? `<div class="email-item">... 외 ${data.communication.totalEmailsSent - 2}회</div>` : '')
          : '<div style="color: #666;">발송 이력 없음</div>'
        }
        ${data.communication.lastEmailSent ? `<div style="margin-top: 3px; font-size: 6pt; color: #666;">최종 발송: ${formatDate(data.communication.lastEmailSent)}</div>` : ''}
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
        <div>Template ${data.metadata.templateVersion}</div>
        <div class="center">본 문서는 전자적으로 생성되었습니다</div>
        <div class="right"></div>
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
        const { chromium } = await import('playwright');
        
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
        console.warn('⚠️ Playwright 실패, PDFKit으로 대체:', playwrightError);
        // HTML 템플릿을 사용할 수 없으므로 기본 데이터로 PDFKit 생성
        throw new Error(`PDF 생성 실패: ${playwrightError instanceof Error ? playwrightError.message : 'Playwright 오류'}`);
      }
    }
  }

  /**
   * PDFKit으로 전문적인 발주서 PDF 생성
   */
  private static async generateProfessionalPDFWithPDFKit(orderData: ComprehensivePurchaseOrderData): Promise<Buffer> {
    const PDFKitDocument = (await import('pdfkit')).default;
    
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

        // 폰트 설정 - 한글 지원을 위한 설정
        console.log('📝 [ProfessionalPDF] PDFKit으로 PDF 생성 (한글 텍스트 포함)');
        
        // 한글 텍스트를 안전하게 처리하는 함수
        const safeText = (text: string) => {
          // 한글이 포함된 텍스트도 그대로 유지 (PDFKit이 처리할 수 있도록)
          return text || '';
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
        doc.fontSize(16).text(safeText('구매 발주서'), 20, doc.y);
        doc.fontSize(12).text(safeText(`발주번호: ${orderData.orderNumber}`), 20, doc.y);
        doc.fontSize(6).text(safeText(`생성일시: ${formatDate(orderData.metadata?.generatedAt || new Date())}`), 20, doc.y);
        
        // 구분선
        doc.moveTo(20, doc.y + 5).lineTo(575, doc.y + 5).stroke();
        doc.moveDown(1);
        
        // === 정보 섹션 (3열 레이아웃) ===
        const infoY = doc.y;
        const colWidth = 180;
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
          // 특이사항 포맷팅 (카테고리 + 납품처 정보)
          const formatRemarksForPDF = (item: any) => {
            let result = '';
            // 카테고리 정보 추가
            if (item.categoryPath && item.categoryPath !== '-') {
              result += item.categoryPath.substring(0, 15) + '\\n';
            }
            // 납품처 정보 포맷팅
            if (item.remarks && item.remarks !== '-') {
              const formattedRemarks = item.remarks
                .replace(/납품처:/g, '• 납품처:')
                .replace(/이메일:/g, '\\n• 이메일:')
                .substring(0, 20);
              result += formattedRemarks;
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
        doc.rect(20, currentY, 555, 20).fill('#e3f2fd');
        doc.fillColor('black');
        doc.fontSize(8);
        doc.text(safeText('소계 (부가세별도)'), 25, currentY + 5);
        doc.text(safeText(formatCurrency(orderData.financial.subtotalAmount)), 420, currentY + 5);
        doc.rect(20, currentY, 555, 20).stroke();
        currentY += 20;
        
        doc.rect(20, currentY, 555, 20).fill('#e3f2fd');
        doc.fillColor('black');
        doc.text(safeText(`부가세 (${(orderData.financial.vatRate * 100).toFixed(0)}%)`), 25, currentY + 5);
        doc.text(safeText(formatCurrency(orderData.financial.vatAmount)), 420, currentY + 5);
        doc.rect(20, currentY, 555, 20).stroke();
        currentY += 20;
        
        doc.rect(20, currentY, 555, 20).fill('#1e40af');
        doc.fillColor('white');
        doc.fontSize(9).text(safeText('총 금액'), 25, currentY + 5);
        doc.text(safeText(formatCurrency(orderData.financial.totalAmount)), 420, currentY + 5);
        doc.rect(20, currentY, 555, 20).stroke();
        
        doc.fillColor('black');
        doc.moveDown(2);
        
        // === 추가 정보 섹션 ===
        doc.fontSize(7);
        
        // 첨부파일 정보
        if (orderData.attachments.hasAttachments) {
          doc.text(safeText(`첨부파일: ${orderData.attachments.count}개 (${Math.round(orderData.attachments.totalSize / 1024)}KB)`), 20);
          orderData.attachments.fileNames.slice(0, 3).forEach((fileName, index) => {
            doc.text(safeText(`  ${index + 1}. ${fileName.length > 40 ? fileName.substring(0, 40) + '...' : fileName}`), 20, doc.y + 8);
          });
          if (orderData.attachments.count > 3) {
            doc.text(safeText(`  ... 외 ${orderData.attachments.count - 3}개 파일`), 20, doc.y + 8);
          }
          doc.moveDown(1);
        }
        
        // 이메일 발송 이력
        if (orderData.communication.totalEmailsSent > 0) {
          doc.text(safeText(`이메일 발송: 총 ${orderData.communication.totalEmailsSent}회`), 20);
          doc.text(safeText(`최근 발송: ${formatDate(orderData.communication.lastEmailSent)}`), 20, doc.y + 8);
          doc.moveDown(1);
        }
        
        // 특이사항
        if (orderData.metadata.notes) {
          doc.text(safeText('특이사항:'), 20);
          doc.text(safeText(orderData.metadata.notes), 20, doc.y + 8);
          doc.moveDown(1);
        }
        
        // === 결재선 ===
        doc.moveDown(1);
        const signY = doc.y;
        const signBoxWidth = 105;
        const signBoxHeight = 40;
        
        // 결재선 제목
        doc.fontSize(8).text(safeText('결재'), 20, signY);
        doc.moveDown(0.5);
        
        const finalSignY = doc.y;
        const roles = ['담당', '검토', '팀장', '임원', '대표'];
        
        roles.forEach((role, index) => {
          const x = 20 + (index * 110);
          doc.rect(x, finalSignY, signBoxWidth, signBoxHeight).stroke();
          doc.fontSize(7).text(safeText(role), x + 45, finalSignY + 5);
          
          // 승인 상태 표시
          const approver = orderData.approval.approvers[index];
          if (approver) {
            const statusText = approver.status === 'approved' ? '승인' : 
                             approver.status === 'rejected' ? '반려' : '대기';
            doc.text(safeText(statusText), x + 40, finalSignY + 15);
            if (approver.approvedAt) {
              doc.text(safeText(formatDate(approver.approvedAt)), x + 35, finalSignY + 25);
            }
          }
        });
        
        // === 하단 정보 ===
        doc.y = finalSignY + signBoxHeight + 15;
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
        doc.text(safeText(`문서 ID: ${orderData.metadata.documentId} | Template: ${orderData.metadata.templateVersion} | Generated: ${formatDate(orderData.metadata.generatedAt)}`), { align: 'center' });
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 역할 표시명 반환
   */
  private static getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'field_worker': '담당',
      'project_manager': '검토',
      'hq_management': '팀장',
      'executive': '임원',
      'admin': '대표'
    };
    return roleMap[role] || role;
  }

  /**
   * 상태 표시명 반환
   */
  private static getStatusDisplayName(status?: string): string {
    const statusMap: { [key: string]: string } = {
      'draft': '초안',
      'created': '생성',
      'pending': '검토중',
      'approved': '승인',
      'sent': '발송',
      'delivered': '납품'
    };
    return statusMap[status || 'draft'] || status || '초안';
  }
}