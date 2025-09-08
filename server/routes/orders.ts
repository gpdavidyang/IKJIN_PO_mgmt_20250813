/**
 * Purchase Order Management Routes
 * Handles order CRUD, approval workflow, file uploads
 */

import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin, requireOrderManager } from "../local-auth";
import { insertPurchaseOrderSchema, purchaseOrders, attachments as attachmentsTable } from "@shared/schema";
import * as schema from "@shared/schema";
import { upload } from "../utils/multer-config";
import { decodeKoreanFilename } from "../utils/korean-filename";
import { OrderService } from "../services/order-service";
import { OptimizedOrderQueries, OptimizedDashboardQueries } from "../utils/optimized-queries";
import { ExcelToPDFConverter } from "../utils/excel-to-pdf-converter";
import { POEmailService } from "../utils/po-email-service";
import ApprovalRoutingService from "../services/approval-routing-service";
import { ProfessionalPDFGenerationService } from "../services/professional-pdf-generation-service";
import { UnifiedOrderCreationService } from "../services/unified-order-creation-service";
import * as database from "../db";
import { eq, and, or, like, desc, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import * as XLSX from "xlsx";
import nodemailer from "nodemailer";
import { EmailSettingsService } from "../services/email-settings-service";
import { generateEmailTemplateData, generateEmailHTML } from "../utils/email-template-generator";
import { progressManager } from "../utils/progress-manager";

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Database and email service instances
const db = database.db;
const emailService = new POEmailService();

// Helper function to update order status after successful email sending
async function updateOrderStatusAfterEmail(orderNumber: string): Promise<void> {
  console.log(`📧 이메일 발송 후 상태 업데이트: ${orderNumber} → sent`);
  
  await database.db.update(purchaseOrders)
    .set({
      orderStatus: 'sent', // 발주상태: 이메일 발송 완료 후 'sent'로 변경
      // approvalStatus는 이미 'approved' 또는 'not_required' 상태이므로 변경하지 않음
      updatedAt: new Date()
    })
    .where(eq(purchaseOrders.orderNumber, orderNumber));
}

// SSE endpoint for order creation progress tracking
router.get("/orders/progress/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  
  console.log(`📡 SSE 연결 시작 - 세션: ${sessionId}`);
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Register client
  progressManager.addClient(sessionId, res);
  
  // Send existing progress
  const existingProgress = progressManager.getSessionProgress(sessionId);
  existingProgress.forEach(update => {
    res.write(`data: ${JSON.stringify(update)}\n\n`);
  });
  
  // Handle client disconnect
  req.on('close', () => {
    console.log(`📡 SSE 연결 종료 - 세션: ${sessionId}`);
    progressManager.removeClient(sessionId, res);
  });
});

// Get all orders with filters and pagination
router.get("/orders", async (req, res) => {
  try {
    const { 
      page = "1", 
      limit = "50",  // Changed default from 20 to 50 to match frontend
      status,
      projectId,
      vendorId,
      startDate,
      endDate,
      userId,
      search
    } = req.query;

    // Debug logging (disabled for performance)
    // console.log('📥 GET /api/orders - Request query:', req.query);

    const filters = {
      orderStatus: status as string,  // Use orderStatus instead of legacy status
      projectId: projectId ? parseInt(projectId as string) : undefined,
      vendorId: vendorId ? parseInt(vendorId as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      userId: userId as string,
      searchText: search as string,  // Changed from 'search' to 'searchText' to match storage.ts
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    // console.log('🔍 GET /api/orders - Parsed filters:', filters);

    const result = await storage.getPurchaseOrders(filters);
    
    // console.log('📤 GET /api/orders - Result:', {
    //   ordersCount: result.orders?.length || 0,
    //   total: result.total,
    //   firstOrder: result.orders?.[0]?.orderNumber
    // });

    res.json(result);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// Export orders to Excel (must be before /:id route)
router.get("/orders/export", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const user = await storage.getUser(userId);
    
    console.log('Export request params:', req.query);
    
    const vendorIdParam = req.query.vendorId;
    const vendorId = vendorIdParam && vendorIdParam !== "all" ? parseInt(vendorIdParam) : undefined;
    
    const projectIdParam = req.query.projectId;
    const projectId = projectIdParam && projectIdParam !== "all" && projectIdParam !== "" ? parseInt(projectIdParam) : undefined;
    
    const filters = {
      userId: user?.role === "admin" && req.query.userId && req.query.userId !== "all" ? req.query.userId : (user?.role === "admin" ? undefined : userId),
      orderStatus: req.query.status && req.query.status !== "all" ? req.query.status : undefined,  // Use orderStatus instead of legacy status
      vendorId: vendorId,
      projectId: projectId,
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : undefined,
      maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount) : undefined,
      searchText: req.query.searchText,
      majorCategory: req.query.majorCategory && req.query.majorCategory !== 'all' ? req.query.majorCategory : undefined,
      middleCategory: req.query.middleCategory && req.query.middleCategory !== 'all' ? req.query.middleCategory : undefined,
      minorCategory: req.query.minorCategory && req.query.minorCategory !== 'all' ? req.query.minorCategory : undefined,
      limit: 1000, // Export more records
    };
    
    console.log('Export filters:', filters);

    const { orders } = await storage.getPurchaseOrders(filters);
    
    // 품목별 상세 정보를 하나의 시트로 통합
    const excelData: any[] = [];
    orders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((item, index) => {
          excelData.push({
            '발주번호': order.orderNumber,
            '거래처': order.vendor?.name || '',
            '거래처 이메일': order.vendor?.email || '',
            '납품처': order.deliverySite || '',
            '납품처 이메일': order.deliverySiteEmail || '',
            '프로젝트명': order.project?.projectName || '',
            '발주일자': order.orderDate,
            '납기희망일': order.deliveryDate,
            '대분류': item.majorCategory || '',
            '중분류': item.middleCategory || '',
            '소분류': item.minorCategory || '',
            '품목명': item.itemName,
            '규격': item.specification || '',
            '단위': item.unit || '',
            '수량': item.quantity,
            '단가': item.unitPrice,
            '공급가액': item.supplyAmount || (item.quantity * item.unitPrice),
            '부가세': item.taxAmount || 0,
            '총금액': item.totalAmount,
            '발주총액': order.totalAmount,
            '상태': order.status,
            '작성자': order.user?.name || '',
            '승인자': order.approver?.name || '',
            '승인일': order.approvedAt || '',
            '품목비고': item.notes || '',
            '발주비고': order.notes || '',
          });
        });
      } else {
        // 품목이 없는 발주서도 포함
        excelData.push({
          '발주번호': order.orderNumber,
          '거래처': order.vendor?.name || '',
          '거래처 이메일': order.vendor?.email || '',
          '납품처': order.deliverySite || '',
          '납품처 이메일': order.deliverySiteEmail || '',
          '프로젝트명': order.project?.projectName || '',
          '발주일자': order.orderDate,
          '납기희망일': order.deliveryDate,
          '대분류': '',
          '중분류': '',
          '소분류': '',
          '품목명': '',
          '규격': '',
          '단위': '',
          '수량': '',
          '단가': '',
          '공급가액': '',
          '부가세': '',
          '총금액': '',
          '발주총액': order.totalAmount,
          '상태': order.status,
          '작성자': order.user?.name || '',
          '승인자': order.approver?.name || '',
          '승인일': order.approvedAt || '',
          '품목비고': '',
          '발주비고': order.notes || '',
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '발주내역');
    
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error exporting orders:", error);
    res.status(500).json({ message: "Failed to export orders" });
  }
});

// Get order by ID
router.get("/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const order = await storage.getPurchaseOrder(id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

// Create new order with unified service
router.post("/orders/create-unified", requireAuth, upload.array('attachments'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    console.log("🚀 통합 발주서 생성 요청:", {
      body: req.body,
      files: req.files?.map(f => ({ 
        originalname: f.originalname, 
        filename: f.filename,
        size: f.size 
      }))
    });

    // Parse items from form data
    let items = [];
    try {
      items = JSON.parse(req.body.items || "[]");
    } catch (parseError) {
      console.error("아이템 파싱 실패:", parseError);
      return res.status(400).json({ message: "Invalid items data" });
    }

    // 세션 ID 생성 (진행상황 추적용)
    const sessionId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 통합 서비스용 데이터 준비
    const orderCreationData = {
      method: 'manual' as const,
      projectId: parseInt(req.body.projectId),
      vendorId: parseInt(req.body.vendorId),
      orderDate: req.body.orderDate,
      deliveryDate: req.body.deliveryDate || null,
      notes: req.body.notes || null,
      userId,
      items: items.map((item: any) => ({
        itemId: item.itemId ? parseInt(item.itemId) : undefined,
        itemName: item.itemName,
        specification: item.specification || null,
        unit: item.unit || null, // 단위 필드 추가
        majorCategory: item.majorCategory || null,
        middleCategory: item.middleCategory || null,
        minorCategory: item.minorCategory || null,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        notes: item.notes || null,
      })),
      attachedFiles: req.files as Express.Multer.File[],
      customFields: req.body.customFields ? JSON.parse(req.body.customFields) : undefined,
    };

    // 통합 서비스로 발주서 생성
    const unifiedService = new UnifiedOrderCreationService();
    const result = await unifiedService.createOrder(orderCreationData, sessionId);

    if (result.success) {
      res.json({
        success: true,
        id: result.orderId,
        orderNumber: result.orderNumber,
        pdfGenerated: result.pdfGenerated,
        attachmentId: result.attachmentId,
        sessionId, // 진행상황 추적용
        message: "발주서가 성공적으로 생성되었습니다."
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: "발주서 생성에 실패했습니다."
      });
    }

  } catch (error) {
    console.error("통합 발주서 생성 오류:", error);
    res.status(500).json({ 
      success: false,
      message: "발주서 생성 중 오류가 발생했습니다.",
      error: error.message 
    });
  }
});

// Create new order (기존 방식 - 하위 호환성)
router.post("/orders", requireAuth, upload.array('attachments'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    console.log("🔧🔧🔧 ORDERS.TS - Order creation request:", {
      body: req.body,
      files: req.files?.map(f => ({ 
        originalname: f.originalname, 
        filename: f.filename,
        size: f.size 
      }))
    });

    // Parse items from form data
    let items = [];
    try {
      items = JSON.parse(req.body.items || "[]");
    } catch (parseError) {
      console.error("🔧🔧🔧 ORDERS.TS - Error parsing items:", parseError);
      return res.status(400).json({ message: "Invalid items data" });
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => 
      sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);

    // First, determine if approval is needed
    const approvalContext = {
      orderId: 0, // Temporary, will be set after order creation
      orderAmount: totalAmount,
      companyId: 1, // Default company ID, should be dynamic based on user's company
      currentUserId: userId,
      currentUserRole: req.user?.role || 'field_worker',
      priority: req.body.priority || 'medium'
    };

    // Check approval requirements
    let initialStatus = "draft";
    try {
      const approvalRoute = await ApprovalRoutingService.determineApprovalRoute(approvalContext);
      console.log("🔧🔧🔧 ORDERS.TS - Approval route preview:", approvalRoute);
      
      // Determine initial status based on approval requirements
      if (req.body.isDirectSubmit || req.body.status === "sent") {
        // User explicitly wants to submit the order
        if (approvalRoute.canDirectApprove || approvalRoute.approvalMode === 'none') {
          // No approval needed, directly send
          initialStatus = "sent";
        } else {
          // Approval needed
          initialStatus = "pending";
        }
      } else {
        // Default to draft if not explicitly submitting
        initialStatus = req.body.status || "draft";
      }
    } catch (error) {
      console.error("Error checking approval requirements:", error);
      // Default to the requested status or draft
      initialStatus = req.body.status || "draft";
    }
    
    const orderData = {
      orderNumber: await OrderService.generateOrderNumber(),
      projectId: parseInt(req.body.projectId),
      vendorId: req.body.vendorId ? parseInt(req.body.vendorId) : null,
      templateId: req.body.templateId ? parseInt(req.body.templateId) : null,
      userId,
      orderDate: req.body.orderDate ? new Date(req.body.orderDate) : new Date(),
      deliveryDate: req.body.deliveryDate ? new Date(req.body.deliveryDate) : null,
      totalAmount,
      notes: req.body.notes || null,
      status: initialStatus as const,
      currentApproverRole: null,
      approvalLevel: 0,
      items
    };

    console.log("🔧🔧🔧 ORDERS.TS - Prepared order data with status:", initialStatus);

    // Create order
    const order = await storage.createPurchaseOrder(orderData);
    console.log("🔧🔧🔧 ORDERS.TS - Created order:", order);

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      const fs = require('fs');
      const path = require('path');
      const { removeAllInputSheets } = require('../utils/excel-input-sheet-remover');
      
      for (const file of req.files as Express.Multer.File[]) {
        const decodedFilename = decodeKoreanFilename(file.originalname);
        console.log("🔧🔧🔧 ORDERS.TS - Processing file:", {
          original: file.originalname,
          decoded: decodedFilename,
          stored: file.filename
        });

        let fileToStore = file.path;
        let fileBuffer: Buffer;
        
        // Excel 파일인 경우 Input 시트 제거 처리
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.originalname.toLowerCase().endsWith('.xlsx')) {
          console.log("📊 Excel 파일 감지, Input 시트 제거 처리 시작...");
          
          const processedPath = file.path.replace(/\.(xlsx?)$/i, '_processed.$1');
          const removeResult = await removeAllInputSheets(file.path, processedPath);
          
          if (removeResult.success && fs.existsSync(processedPath)) {
            console.log(`✅ Input 시트 제거 완료: ${removeResult.removedSheets.join(', ')}`);
            fileToStore = processedPath;
            fileBuffer = fs.readFileSync(processedPath);
            
            // 원본 파일 삭제
            try {
              fs.unlinkSync(file.path);
            } catch (e) {
              console.warn('원본 파일 삭제 실패:', e);
            }
          } else {
            console.warn('⚠️ Input 시트 제거 실패, 원본 파일 사용:', removeResult.error);
            fileBuffer = fs.readFileSync(file.path);
          }
        } else {
          // Excel이 아닌 파일은 원본 그대로 사용
          fileBuffer = fs.readFileSync(file.path);
        }

        const base64Data = fileBuffer.toString('base64');
        
        // 📋 Excel 파일명 표준화: IKJIN_[PO번호]_[날짜].xlsx 형식으로 변환
        let finalOriginalName = decodedFilename;
        let finalStoredName = file.filename;
        
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            decodedFilename.toLowerCase().endsWith('.xlsx')) {
          console.log("📋 Excel 파일명 표준화 시작:", decodedFilename);
          
          // 현재 날짜를 YYYYMMDD 형식으로 포맷
          const today = new Date();
          const dateStr = today.getFullYear().toString() + 
                         (today.getMonth() + 1).toString().padStart(2, '0') + 
                         today.getDate().toString().padStart(2, '0');
          
          // 표준화된 파일명 생성: IKJIN_PO-2025-XXXXX_20250907.xlsx
          const standardizedName = `IKJIN_${order.orderNumber}_${dateStr}.xlsx`;
          
          finalOriginalName = standardizedName;
          finalStoredName = `${Date.now()}-${standardizedName}`; // 타임스탬프 추가로 중복 방지
          
          console.log(`✅ Excel 파일명 표준화 완료: ${decodedFilename} → ${standardizedName}`);
        }
        
        const attachmentData: any = {
          orderId: order.id,
          originalName: finalOriginalName,
          storedName: finalStoredName,
          filePath: `db://${finalStoredName}`, // Use db:// prefix for database storage
          fileSize: fileBuffer.length,
          mimeType: file.mimetype,
          uploadedBy: userId,
        };
        
        // Only add fileData if the column exists (for Vercel compatibility)
        try {
          attachmentData.fileData = base64Data;
          await storage.createAttachment(attachmentData);
        } catch (error) {
          // Fallback: try without fileData field
          console.warn('Failed to save with fileData, falling back to filesystem path:', error);
          attachmentData.filePath = fileToStore;
          delete attachmentData.fileData;
          await storage.createAttachment(attachmentData);
        }
        
        // 처리된 파일이 임시 파일인 경우 정리
        if (fileToStore !== file.path && fs.existsSync(fileToStore)) {
          try {
            fs.unlinkSync(fileToStore);
          } catch (e) {
            console.warn('처리된 임시 파일 삭제 실패:', e);
          }
        }
      }
    }

    // Generate PROFESSIONAL PDF for the order (NEW: Enhanced layout with comprehensive data)
    let pdfGenerationStatus = {
      success: false,
      message: '',
      pdfPath: '',
      attachmentId: null as number | null
    };
    
    try {
      console.log("🔧🔧🔧 ORDERS.TS - Generating PROFESSIONAL PDF for order:", order.id);
      
      // Use the new Professional PDF Generation Service
      // This service automatically gathers all comprehensive data from the database
      const pdfResult = await ProfessionalPDFGenerationService.generateProfessionalPurchaseOrderPDF(
        order.id,
        userId
      );
      
      if (pdfResult.success) {
        console.log("✅ ORDERS.TS - PROFESSIONAL PDF generated successfully:", pdfResult.pdfPath);
        console.log("📄 PDF Attachment ID:", pdfResult.attachmentId);
        pdfGenerationStatus = {
          success: true,
          message: 'PDF 파일이 성공적으로 생성되었습니다',
          pdfPath: pdfResult.pdfPath,
          attachmentId: pdfResult.attachmentId
        };
      } else {
        console.error("⚠️ ORDERS.TS - PROFESSIONAL PDF generation failed:", pdfResult.error);
        pdfGenerationStatus.message = `PDF 생성 실패: ${pdfResult.error}`;
        
        // Fallback to Enhanced PDF if Professional fails
        console.log("🔄 Attempting fallback to Enhanced PDF...");
        
        // Get vendor, project, company, and user details for enhanced PDF
        const vendor = orderData.vendorId ? await storage.getVendor(orderData.vendorId) : null;
        const project = await storage.getProject(orderData.projectId);
        const companies = await storage.getCompanies();
        const company = companies && companies.length > 0 ? companies[0] : null;
        const user = await storage.getUser(userId);
        
        // Get attachments count
        const orderAttachments = await storage.getOrderAttachments(order.id);
        const attachmentCount = orderAttachments?.length || 0;
        const hasAttachments = attachmentCount > 0;
        
        const enhancedPdfData = {
          // 기본 발주 정보
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          deliveryDate: order.deliveryDate,
          status: order.status,
          approvalStatus: order.approvalStatus,
          
          // 프로젝트/현장 정보
          projectName: project?.name,
          projectCode: project?.code,
          projectAddress: project?.address,
          siteManager: project?.manager,
          siteContact: project?.contactPhone,
          
          // 거래처 상세 정보
          vendorName: vendor?.name,
          vendorRegistrationNumber: vendor?.registrationNumber,
          vendorRepresentative: vendor?.representative,
          vendorAddress: vendor?.address,
          vendorPhone: vendor?.phone,
          vendorFax: vendor?.fax,
          vendorEmail: vendor?.email,
          vendorContact: vendor?.contactPerson,
          vendorContactPhone: vendor?.contactPhone,
          
          // 발주업체 상세 정보
          companyName: company?.name,
          companyRegistrationNumber: company?.registrationNumber,
          companyRepresentative: company?.representative,
          companyAddress: company?.address,
          companyPhone: company?.phone,
          companyFax: company?.fax,
          companyEmail: company?.email,
          
          // 작성자/담당자 정보
          createdBy: userId,
          createdByName: user?.name || user?.username,
          createdByEmail: user?.email,
          createdByPhone: user?.phone,
          createdByPosition: user?.position,
          createdByDepartment: user?.department,
          createdAt: order.createdAt,
          
          // 수신자 정보
          receiverName: req.body.receiver,
          receiverEmail: req.body.receiverEmail,
          receiverPhone: req.body.receiverPhone,
          managerName: req.body.manager,
          managerEmail: req.body.managerEmail,
          managerPhone: req.body.managerPhone,
          
          // 품목 정보
          items: items.map(item => ({
            category: item.category,
            subCategory1: item.subCategory1,
            subCategory2: item.subCategory2,
            itemCode: item.itemCode,
            name: item.name || item.item,
            specification: item.specification,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            unitPrice: parseFloat(item.unitPrice),
            price: parseFloat(item.quantity) * parseFloat(item.unitPrice),
            deliveryLocation: item.deliveryLocation,
            remarks: item.remarks
          })),
          
          // 금액 정보
          subtotalAmount: totalAmount / 1.1, // VAT 제외 금액
          taxAmount: totalAmount - (totalAmount / 1.1), // VAT
          totalAmount,
          
          // 기타 정보
          notes: orderData.notes,
          paymentTerms: orderData.paymentTerms || '월말 현금',
          deliveryTerms: orderData.deliveryTerms || '현장 인도',
          attachmentCount,
          hasAttachments,
          attachmentNames: orderAttachments?.map(a => a.originalName) || []
        };
        
        console.error("⚠️ ORDERS.TS - PROFESSIONAL PDF generation failed:", pdfResult.error);
        pdfGenerationStatus.message = `PDF 생성 실패: ${pdfResult.error}`;
        // Note: Fallback PDF generation removed - using ProfessionalPDFGenerationService as primary method
      }
    } catch (pdfError) {
      console.error("❌ ORDERS.TS - Error generating PDF:", pdfError);
      pdfGenerationStatus.message = `PDF 생성 중 오류 발생: ${pdfError instanceof Error ? pdfError.message : '알 수 없는 오류'}`;
      // Continue without PDF - don't fail the entire order creation
    }

    // Set up approval process using the new approval routing service
    try {
      const approvalContext = {
        orderId: order.id,
        orderAmount: totalAmount,
        companyId: 1, // Default company ID, should be dynamic based on user's company
        currentUserId: userId,
        currentUserRole: req.user?.role || 'field_worker',
        priority: req.body.priority || 'medium'
      };

      const approvalRoute = await ApprovalRoutingService.determineApprovalRoute(approvalContext);
      console.log("🔧🔧🔧 ORDERS.TS - Approval route determined:", approvalRoute);

      if (approvalRoute.approvalMode === 'staged') {
        // Create approval step instances for staged approval
        const approvalInstances = await ApprovalRoutingService.createApprovalInstances(
          order.id, 
          approvalContext
        );
        console.log("🔧🔧🔧 ORDERS.TS - Created approval instances:", approvalInstances);
      }

      // Add approval route info to response
      const orderWithApproval = {
        ...order,
        approvalRoute: {
          mode: approvalRoute.approvalMode,
          canDirectApprove: approvalRoute.canDirectApprove,
          reasoning: approvalRoute.reasoning,
          stepsCount: approvalRoute.stagedApprovalSteps?.length || 0
        }
      };

      res.status(201).json({
        ...orderWithApproval,
        pdfGenerationStatus
      });
    } catch (approvalError) {
      console.error("🔧🔧🔧 ORDERS.TS - Error setting up approval process:", approvalError);
      // Still return the order even if approval setup fails
      res.status(201).json({
        ...order,
        approvalRoute: {
          mode: 'direct',
          canDirectApprove: false,
          reasoning: '승인 프로세스 설정 중 오류가 발생하여 기본 설정을 사용합니다.',
          stepsCount: 0
        },
        pdfGenerationStatus
      });
    }
  } catch (error) {
    console.error("🔧🔧🔧 ORDERS.TS - Error creating order:", error);
    res.status(500).json({ message: "Failed to create order" });
  }
});

// Update order
router.put("/orders/:id", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const updateData = req.body;

    // Check if user can edit this order
    const order = await storage.getPurchaseOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only draft orders can be edited by creators
    if (order.status !== 'draft' && order.userId !== req.user?.id) {
      return res.status(403).json({ message: "Cannot edit approved orders" });
    }

    const updatedOrder = await storage.updatePurchaseOrder(orderId, updateData);
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Failed to update order" });
  }
});

// Bulk delete orders (Admin only) - MUST COME BEFORE /:id route to avoid conflicts
router.delete("/orders/bulk-delete", requireAuth, async (req: any, res) => {
  console.log('🗑️ Bulk delete request received');
  
  try {
    const { user } = req;
    const { orderIds } = req.body;

    console.log('👤 User info:', { id: user?.id, role: user?.role, name: user?.name });
    console.log('📄 Request body:', req.body);

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('❌ Access denied: User is not admin');
      return res.status(403).json({ 
        message: "관리자만 일괄 삭제가 가능합니다." 
      });
    }

    // Validate request
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      console.log('❌ Invalid request: Missing or invalid orderIds');
      return res.status(400).json({ 
        message: "삭제할 발주서 ID 목록이 필요합니다." 
      });
    }

    // Convert string IDs to numbers if necessary
    const numericOrderIds = orderIds.map((id: any) => {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(numId)) {
        throw new Error(`Invalid order ID: ${id}`);
      }
      return numId;
    });

    console.log(`🗑️ 관리자 일괄 삭제 요청: ${numericOrderIds.length}개 발주서`, { admin: user.name, orderIds: numericOrderIds });

    // Use simpler individual deletion approach to avoid complex transaction issues
    console.log('🔍 Looking up orders for validation...');
    const validOrders = [];
    for (const orderId of numericOrderIds) {
      const order = await storage.getPurchaseOrder(orderId);
      if (order) {
        validOrders.push(order);
      } else {
        console.log(`⚠️ Order not found: ${orderId}`);
      }
    }

    if (validOrders.length === 0) {
      return res.status(404).json({ 
        message: "삭제할 수 있는 발주서가 없습니다." 
      });
    }

    console.log(`🗑️ Deleting ${validOrders.length} valid orders...`);
    
    // Delete orders individually to avoid transaction complexity
    const deletedOrders = [];
    const failedDeletions = [];
    
    for (const order of validOrders) {
      try {
        console.log(`🗑️ Deleting order ${order.id} (${order.orderNumber})`);
        await storage.deletePurchaseOrder(order.id);
        deletedOrders.push(order);
        console.log(`✅ Successfully deleted order ${order.id}`);
      } catch (deleteError) {
        console.error(`❌ Failed to delete order ${order.id}:`, deleteError);
        failedDeletions.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          error: deleteError instanceof Error ? deleteError.message : 'Unknown error'
        });
      }
    }

    console.log(`✅ 일괄 삭제 완료: ${deletedOrders.length}개 성공, ${failedDeletions.length}개 실패`);

    // Return success even if some deletions failed
    const response: any = { 
      message: `${deletedOrders.length}개의 발주서가 삭제되었습니다.`,
      deletedCount: deletedOrders.length,
      deletedOrders: deletedOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber }))
    };

    if (failedDeletions.length > 0) {
      response.partialFailure = true;
      response.failedCount = failedDeletions.length;
      response.failedDeletions = failedDeletions;
      response.message += ` (${failedDeletions.length}개는 삭제할 수 없습니다.)`;
    }

    res.json(response);
  } catch (error) {
    console.error("❌ 일괄 삭제 오류:", error);
    res.status(500).json({ 
      message: "발주서 일괄 삭제에 실패했습니다.",
      error: error instanceof Error ? error.message : "알 수 없는 오류",
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
    });
  }
});

// Delete single order - Must come AFTER /orders/bulk-delete to avoid route collision
router.delete("/orders/:id", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    
    // Check if user can delete this order
    const order = await storage.getPurchaseOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only draft orders can be deleted
    if (order.status !== 'draft') {
      return res.status(403).json({ message: "Cannot delete submitted orders" });
    }

    await storage.deletePurchaseOrder(orderId);
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

// Order approval workflow - Enhanced with step-based approval
router.post("/orders/:id/approve", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    const { comments, stepInstanceId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Check if this is a step-based approval
    if (stepInstanceId) {
      // Update the specific approval step
      const response = await fetch(`http://localhost:3000/api/approval-settings/step-instances/${stepInstanceId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie || ''
        },
        body: JSON.stringify({
          status: 'approved',
          comments
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update approval step');
      }

      // Check if all approval steps are complete
      const isComplete = await ApprovalRoutingService.isApprovalComplete(orderId);
      
      if (isComplete) {
        // All steps approved - approve the order
        const result = await OrderService.approveOrder(orderId, userId);
        res.json({ 
          ...result, 
          approvalComplete: true,
          message: "모든 승인 단계가 완료되어 주문이 승인되었습니다."
        });
      } else {
        // Get next step info
        const nextStep = await ApprovalRoutingService.getNextApprovalStep(orderId);
        const progress = await ApprovalRoutingService.getApprovalProgress(orderId);
        
        res.json({
          success: true,
          approvalComplete: false,
          nextStep,
          progress,
          message: `승인 단계가 완료되었습니다. (${progress.progressPercentage}% 완료)`
        });
      }
    } else {
      // Direct approval (legacy)
      const result = await OrderService.approveOrder(orderId, userId);
      res.json(result);
    }
  } catch (error) {
    console.error("Error approving order:", error);
    res.status(500).json({ message: "Failed to approve order" });
  }
});

// Get approval progress for an order
router.get("/orders/:id/approval-progress", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    
    const progress = await ApprovalRoutingService.getApprovalProgress(orderId);
    res.json(progress);
  } catch (error) {
    console.error("Error getting approval progress:", error);
    res.status(500).json({ message: "Failed to get approval progress" });
  }
});

router.post("/orders/:id/reject", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const result = await OrderService.rejectOrder(orderId, userId, reason);
    res.json(result);
  } catch (error) {
    console.error("Error rejecting order:", error);
    res.status(500).json({ message: "Failed to reject order" });
  }
});

router.post("/orders/:id/submit", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const result = await OrderService.submitForApproval(orderId, userId);
    res.json(result);
  } catch (error) {
    console.error("Error submitting order:", error);
    res.status(500).json({ message: "Failed to submit order" });
  }
});

// Get orders for approval
router.get("/orders/pending-approval", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const orders = await OptimizedOrderQueries.getPendingApprovalOrders(user.role);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching pending orders:", error);
    res.status(500).json({ message: "Failed to fetch pending orders" });
  }
});

// Get order statistics
router.get("/orders/stats", async (req, res) => {
  try {
    const stats = await OptimizedDashboardQueries.getOrderStatistics();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    res.status(500).json({ message: "Failed to fetch order statistics" });
  }
});

// Test PDF generation endpoint (no auth for testing) - Uses ProfessionalPDFGenerationService
router.post("/orders/test-pdf", async (req, res) => {
  try {
    const testOrderData = {
      orderNumber: "PO-TEST-001",
      projectName: "테스트 프로젝트",
      vendorName: "테스트 거래처",
      totalAmount: 1000000,
      items: [
        {
          name: "테스트 품목 1",
          quantity: 10,
          unit: "EA",
          unitPrice: 50000,
          totalAmount: 500000
        },
        {
          name: "테스트 품목 2", 
          quantity: 5,
          unit: "SET",
          unitPrice: 100000,
          totalAmount: 500000
        }
      ],
      notes: "테스트용 발주서입니다.",
      orderDate: new Date(),
      createdBy: "테스트 사용자"
    };

    console.log('🧪 [Professional PDF] 테스트 PDF 생성 시작:', testOrderData.orderNumber);
    
    // Call the updated generatePDFLogic function
    req.body = { orderData: testOrderData };
    req.user = { id: 'test-user' };
    
    return await generatePDFLogic(req, res);
  } catch (error) {
    console.error('🧪 [Professional PDF] 테스트 오류:', error);
    res.status(500).json({
      success: false,
      error: "PDF 테스트 실패",
      details: error instanceof Error ? error.message : "알 수 없는 오류"
    });
  }
});

// Generate PDF for order - Simplified version using ProfessionalPDFGenerationService only
async function generatePDFLogic(req: any, res: any) {
  try {
    const { orderData, options = {} } = req.body;
    const userId = req.user?.id || 'system';

    console.log(`📄 [PDF Generation] Professional PDF 생성 시작: ${orderData?.orderNumber || 'N/A'}`);

    // Enhanced validation
    if (!orderData) {
      return res.status(400).json({ 
        success: false,
        error: "발주서 데이터가 필요합니다." 
      });
    }

    let result;
    
    if (orderData.id) {
      // Existing order - use comprehensive database data
      console.log(`📄 [PDF Generation] Order ID 존재: ${orderData.id} - 데이터베이스에서 포괄적 데이터 사용`);
      result = await ProfessionalPDFGenerationService.generateProfessionalPurchaseOrderPDF(
        orderData.id, 
        userId
      );
    } else {
      // Preview/new order - use provided data directly  
      console.log(`📄 [PDF Generation] Preview/신규 주문 - 제공된 데이터로 직접 생성`);
      
      // Transform orderData to ComprehensivePurchaseOrderData format
      const comprehensiveData = {
        orderNumber: orderData.orderNumber || 'PO-PREVIEW-001',
        orderDate: orderData.orderDate ? new Date(orderData.orderDate) : new Date(),
        deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate) : null,
        createdAt: orderData.createdAt ? new Date(orderData.createdAt) : new Date(),

        issuerCompany: {
          name: orderData.companyName || '(주)익진엔지니어링',
          businessNumber: orderData.companyBusinessNumber || '123-45-67890',
          representative: orderData.companyContactPerson || '박현호',
          address: orderData.companyAddress || '서울시 강남구 테헤란로 124 삼원타워 9층',
          phone: orderData.companyPhone || '02-1234-5678',
          email: orderData.companyEmail || 'contact@ikjin.com'
        },

        vendorCompany: {
          name: orderData.vendorName || '거래처명',
          businessNumber: orderData.vendorBusinessNumber || null,
          representative: null,
          address: orderData.vendorAddress || null,
          phone: orderData.vendorPhone || null,
          email: orderData.vendorEmail || null,
          contactPerson: orderData.vendorContactPerson || null
        },

        project: {
          name: orderData.projectName || '현장명',
          code: orderData.projectCode || null,
          location: orderData.deliveryPlace || null,
        },

        creator: {
          name: orderData.createdBy || orderData.user?.name || '시스템',
          email: orderData.user?.email || null,
          phone: orderData.user?.phone || null
        },

        items: Array.isArray(orderData.items) ? orderData.items.map((item: any, index: number) => ({
          sequenceNo: index + 1,
          name: item.itemName || item.name || '',
          specification: item.specification || '',
          quantity: Number(item.quantity) || 0,
          unit: item.unit || '',
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice: Number(item.totalAmount || item.totalPrice) || 0,
          deliveryLocation: orderData.deliveryPlace || '',
          deliveryEmail: orderData.vendorEmail || '',
          remarks: item.notes || ''
        })) : [],

        financial: {
          subtotalAmount: Number(orderData.totalAmount) || 0,
          vatRate: 0.1,
          vatAmount: Math.round((Number(orderData.totalAmount) || 0) * 0.1),
          totalAmount: Number(orderData.totalAmount) || 0 + Math.round((Number(orderData.totalAmount) || 0) * 0.1),
          currencyCode: 'KRW'
        },

        metadata: {
          notes: orderData.notes || '',
          documentId: `DOC_PREVIEW_${Date.now()}`,
          generatedAt: new Date(),
          generatedBy: orderData.createdBy || '시스템',
          templateVersion: 'v2.0.0'
        }
      };

      const pdfBuffer = await ProfessionalPDFGenerationService.generateProfessionalPDF(comprehensiveData);
      result = {
        success: true,
        pdfBuffer: pdfBuffer,
        message: "Preview PDF가 성공적으로 생성되었습니다."
      };
    }

    if (result.success) {
      return res.json({
        success: true,
        message: result.message || "PDF가 성공적으로 생성되었습니다.",
        pdfPath: result.pdfPath,
        attachmentId: result.attachmentId,
        downloadUrl: result.attachmentId ? `/api/attachments/${result.attachmentId}` : undefined,
        pdfBuffer: result.pdfBuffer // For Vercel compatibility and preview scenarios
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "PDF 생성에 실패했습니다."
      });
    }
  } catch (error) {
    console.error('📄 [PDF Generation] 오류:', error);
    return res.status(500).json({
      success: false,
      error: "PDF 생성 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : "알 수 없는 오류"
    });
  }
}

// Generate PDF for order (with auth)
router.post("/orders/generate-pdf", requireAuth, async (req, res) => {
  return await generatePDFLogic(req, res);
});

// Regenerate PDF for specific order and save to DB (Now uses PROFESSIONAL PDF)
router.post("/orders/:id/regenerate-pdf", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get order details to verify it exists
    const [order] = await database.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId))
      .limit(1);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    console.log(`📄 [Regenerate PDF] Starting PROFESSIONAL PDF regeneration for Order ID ${orderId}`);

    // Use the new Professional PDF Generation Service
    // This service automatically gathers all comprehensive data from the database
    const result = await ProfessionalPDFGenerationService.generateProfessionalPurchaseOrderPDF(
      orderId,
      userId
    );

    // If Professional PDF fails, return error
    if (!result.success) {
      console.error(`❌ [Regenerate PDF] Professional PDF generation failed`);
      return res.status(500).json({
        success: false,
        message: "PDF 재생성 실패",
        error: result.error || "PDF 생성 중 오류가 발생했습니다"
      });
    }

    // Professional PDF was successful!
    console.log(`✅ [Regenerate PDF] PROFESSIONAL PDF generated successfully`);
    res.json({
      success: true,
      message: "전문적 PDF가 성공적으로 재생성되어 저장되었습니다",
      attachmentId: result.attachmentId,
      pdfPath: result.pdfPath,
      downloadUrl: `/api/attachments/${result.attachmentId}`
    });
  } catch (error) {
    console.error("PDF regeneration error:", error);
    res.status(500).json({
      success: false,
      message: "PDF 재생성 중 오류 발생",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// === PROFESSIONAL PDF GENERATION ROUTES ===

// Generate Professional PDF for specific order (enhanced layout with comprehensive data)
router.post("/orders/:id/generate-professional-pdf", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user?.id;

    console.log(`📄 [Professional PDF] 전문적 PDF 생성 요청: Order ID ${orderId}, User ID ${userId}`);

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "사용자 인증이 필요합니다" 
      });
    }

    // Generate professional PDF
    const result = await ProfessionalPDFGenerationService.generateProfessionalPurchaseOrderPDF(
      orderId, 
      userId
    );

    if (result.success) {
      console.log(`✅ [Professional PDF] PDF 생성 성공: ${result.pdfPath}`);
      
      res.json({
        success: true,
        message: "전문적 발주서 PDF가 성공적으로 생성되었습니다",
        attachmentId: result.attachmentId,
        pdfPath: result.pdfPath,
        downloadUrl: `/api/attachments/${result.attachmentId}`
      });
    } else {
      console.error(`❌ [Professional PDF] PDF 생성 실패: ${result.error}`);
      
      res.status(500).json({
        success: false,
        message: "전문적 PDF 생성에 실패했습니다",
        error: result.error
      });
    }
  } catch (error) {
    console.error("❌ [Professional PDF] 서버 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류로 인한 PDF 생성 실패",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Test Professional PDF generation (development only)
if (process.env.NODE_ENV === 'development') {
  router.post("/orders/test-professional-pdf", async (req, res) => {
    try {
      console.log('🧪 [Professional PDF] 테스트 PDF 생성 시작');
      
      const { orderId = 1, userId = "test-user" } = req.body;
      
      // Generate test professional PDF
      const result = await ProfessionalPDFGenerationService.generateProfessionalPurchaseOrderPDF(
        orderId, 
        userId
      );

      if (result.success) {
        console.log(`✅ [Professional PDF] 테스트 PDF 생성 성공`);
        
        res.json({
          success: true,
          message: "테스트 전문적 PDF 생성 완료",
          attachmentId: result.attachmentId,
          pdfPath: result.pdfPath,
          fileSize: result.pdfBuffer?.length || 0,
          downloadUrl: `/api/attachments/${result.attachmentId}`
        });
      } else {
        console.error(`❌ [Professional PDF] 테스트 PDF 생성 실패: ${result.error}`);
        
        res.status(500).json({
          success: false,
          message: "테스트 PDF 생성 실패",
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ [Professional PDF] 테스트 오류:', error);
      res.status(500).json({
        success: false,
        message: "테스트 PDF 생성 중 오류 발생",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  console.log('🧪 Development mode: Professional PDF test endpoint available at /api/orders/test-professional-pdf');
}

// Remove test endpoint in production
if (process.env.NODE_ENV === 'development') {
  console.log('🧪 Development mode: PDF test endpoint available at /api/orders/test-pdf');
} else {
  // Remove test-pdf route in production by overriding with 404
  router.all("/orders/test-pdf", (req, res) => {
    res.status(404).json({ error: "Test endpoint not available in production" });
  });
}

// Download or preview generated PDF or HTML (with database support for Vercel)
router.get("/orders/download-pdf/:timestamp", async (req, res) => {
  try {
    const { timestamp } = req.params;
    const { download } = req.query; // ?download=true 면 다운로드, 없으면 미리보기
    
    console.log(`📄 PDF 다운로드 요청: timestamp=${timestamp}, download=${download}`);
    
    // Vercel mode: Check database for PDF data first
    if (process.env.VERCEL) {
      try {
        // Look for attachment with db:// path containing the timestamp
        const dbPath = `db://pdf-${timestamp}`;
        console.log(`📄 데이터베이스에서 PDF 조회: ${dbPath}`);
        
        const attachment = await storage.getAttachmentByPath(dbPath);
        
        if (attachment && (attachment as any).fileData) {
          console.log(`📄 데이터베이스에서 PDF 발견: ${attachment.originalName} (크기: ${attachment.fileSize} bytes)`);
          
          // Decode Base64 PDF data
          const pdfBuffer = Buffer.from((attachment as any).fileData, 'base64');
          console.log(`📄 PDF 버퍼 생성 완료: ${pdfBuffer.length} bytes`);
          
          // Set headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET');
          res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
          res.setHeader('X-Frame-Options', 'SAMEORIGIN');
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Length', pdfBuffer.length.toString());
          
          if (download === 'true') {
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('발주서.pdf')}`);
          } else {
            res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent('발주서.pdf')}`);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
          
          res.send(pdfBuffer);
          return;
        } else {
          console.log(`📄 데이터베이스에서 PDF 찾지 못함: ${dbPath}`);
        }
      } catch (dbError) {
        console.error('❌ 데이터베이스 PDF 조회 오류:', dbError);
        // Continue to file system fallback
      }
    }
    
    // File system mode (local or fallback)
    const basePath = process.env.VERCEL 
      ? path.join('/tmp', 'temp-pdf', `order-${timestamp}`)
      : path.join(process.cwd(), 'uploads/temp-pdf', `order-${timestamp}`);
    
    const pdfPath = `${basePath}.pdf`;
    const htmlPath = `${basePath}.html`;
    
    console.log(`📄 파일 시스템에서 파일 요청: ${basePath}.*`);
    console.log(`📄 PDF 존재: ${fs.existsSync(pdfPath)}, HTML 존재: ${fs.existsSync(htmlPath)}`);
    
    // If in serverless and only HTML exists, serve HTML
    if (process.env.VERCEL && !fs.existsSync(pdfPath) && fs.existsSync(htmlPath)) {
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      
      if (download === 'true') {
        res.setHeader('Content-Disposition', `attachment; filename="order-${timestamp}.html"`);
      }
      
      res.send(htmlContent);
      return;
    }

    if (fs.existsSync(pdfPath)) {
      try {
        const stat = fs.statSync(pdfPath);
        console.log(`📊 PDF 파일 정보: 크기 ${(stat.size / 1024).toFixed(2)} KB`);
        
        // CORS headers for iframe/embed support
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        
        if (download === 'true') {
          // 다운로드 모드
          console.log('📥 다운로드 모드로 PDF 제공');
          res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('발주서.pdf')}`);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Length', stat.size.toString());
          
          const downloadStream = fs.createReadStream(pdfPath);
          downloadStream.on('error', (error) => {
            console.error('❌ PDF 다운로드 스트림 오류:', error);
            if (!res.headersSent) {
              res.status(500).json({ error: 'PDF 읽기 실패' });
            }
          });
          
          downloadStream.pipe(res);
        } else {
          // 미리보기 모드 - 브라우저에서 직접 표시
          console.log('👁️ 미리보기 모드로 PDF 제공');
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent('발주서.pdf')}`);
          res.setHeader('Content-Length', stat.size.toString());
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          
          const pdfStream = fs.createReadStream(pdfPath);
          pdfStream.on('error', (error) => {
            console.error('❌ PDF 스트림 오류:', error);
            if (!res.headersSent) {
              res.status(500).json({ 
                success: false,
                error: 'PDF 읽기 실패',
                details: error.message 
              });
            }
          });
          
          pdfStream.on('open', () => {
            console.log('✅ PDF 스트림 시작');
          });
          
          pdfStream.on('end', () => {
            console.log('✅ PDF 스트림 완료');
          });
          
          pdfStream.pipe(res);
        }
      } catch (statError) {
        console.error('❌ PDF 파일 상태 확인 오류:', statError);
        res.status(500).json({
          success: false,
          error: "PDF 파일 정보를 읽을 수 없습니다.",
          details: statError.message
        });
      }
    } else {
      console.warn(`⚠️ PDF 파일 없음: ${pdfPath}`);
      res.status(404).json({
        success: false,
        error: "PDF 파일을 찾을 수 없습니다.",
        details: "파일이 삭제되었거나 생성되지 않았을 수 있습니다."
      });
    }
  } catch (error) {
    console.error("❌ PDF 다운로드 오류:", error);
    res.status(500).json({
      success: false,
      error: "PDF 다운로드 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : "알 수 없는 오류"
    });
  }
});

// Order ID로 PDF 다운로드 (UnifiedOrdersList에서 사용)
router.get("/orders/:id/download-pdf", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    console.log(`📄 Order ID ${orderId}로 PDF 다운로드 요청`);
    
    // 해당 주문의 PDF attachment 찾기
    const attachments = await db
      .select()
      .from(schema.attachments)
      .where(
        and(
          eq(schema.attachments.orderId, orderId),
          or(
            eq(schema.attachments.mimeType, 'application/pdf'),
            like(schema.attachments.originalName, '%.pdf')
          )
        )
      )
      .orderBy(desc(schema.attachments.createdAt))
      .limit(1);
    
    if (!attachments || attachments.length === 0) {
      console.warn(`⚠️ Order ${orderId}에 대한 PDF 없음`);
      return res.status(404).json({ 
        error: "PDF 파일을 찾을 수 없습니다." 
      });
    }
    
    const attachment = attachments[0];
    console.log(`📄 PDF 발견: ${attachment.originalName}`);
    
    // attachment ID로 다운로드 엔드포인트로 리다이렉트
    const downloadUrl = `/api/attachments/${attachment.id}/download?download=true`;
    console.log(`📄 리다이렉트: ${downloadUrl}`);
    
    res.redirect(downloadUrl);
    
  } catch (error) {
    console.error("❌ Order PDF 다운로드 오류:", error);
    res.status(500).json({
      error: "PDF 다운로드 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : "알 수 없는 오류"
    });
  }
});

// 이메일 발송 (POEmailService 사용으로 완전히 재작성)

router.post("/orders/send-email", requireAuth, async (req, res) => {
  console.log('🔍 이메일 발송 엔드포인트 진입');
  
  try {
    const { 
      orderData, 
      to, 
      cc, 
      subject, 
      message, 
      selectedAttachmentIds = []
    } = req.body;
    
    console.log('📧 이메일 발송 요청 (POEmailService 사용):', { 
      orderData, 
      to, 
      cc, 
      subject, 
      message: message ? '[메시지 있음]' : '[메시지 없음]',
      selectedAttachmentIds
    });
    
    // 입력 데이터 로깅
    console.log('📄 수신 데이터:', {
      hasOrderData: !!orderData,
      orderNumber: orderData?.orderNumber,
      orderId: orderData?.orderId,
      toCount: Array.isArray(to) ? to.length : (typeof to === 'string' ? 1 : 0),
      ccCount: Array.isArray(cc) ? cc.length : (typeof cc === 'string' ? 1 : 0),
      hasSubject: !!subject,
      hasMessage: !!message,
      attachmentIds: selectedAttachmentIds
    });
    
    // 수신자 검증
    if (!to || to.length === 0) {
      console.log('❌ 수신자 검증 실패');
      return res.status(400).json({ error: '수신자가 필요합니다.' });
    }

    // 주문 정보 검증
    if (!orderData || !orderData.orderNumber) {
      console.log('❌ 주문 정보 검증 실패:', orderData);
      return res.status(400).json({ error: '주문 정보가 필요합니다.' });
    }

    // 첨부파일 처리: selectedAttachmentIds에서 Excel 파일 찾기
    let excelFilePath = '';
    let additionalAttachments: any[] = [];
    let attachments: any[] = [];
    let attachmentsList: string[] = [];
    
    // emailOptions를 req.body에서 추출하거나 기본값으로 설정
    const emailOptions = {
      orderNumber: orderData.orderNumber,
      vendorName: orderData.vendorName,
      additionalMessage: message,
      to: Array.isArray(to) ? to : [to],
      cc: Array.isArray(cc) ? cc : (cc ? [cc] : []),
      subject: subject || `발주서 - ${orderData.orderNumber}`
    };
    
    if (selectedAttachmentIds && selectedAttachmentIds.length > 0) {
      console.log('📎 선택된 첨부파일 처리:', selectedAttachmentIds);
      
      for (const attachmentId of selectedAttachmentIds) {
        try {
          console.log(`📈 첨부파일 ID ${attachmentId} 처리 시작`);
          
          const [attachment] = await database.db
            .select({
              id: attachmentsTable.id,
              originalName: attachmentsTable.originalName,
              filePath: attachmentsTable.filePath,
              mimeType: attachmentsTable.mimeType,
              fileData: attachmentsTable.fileData
            })
            .from(attachmentsTable)
            .where(eq(attachmentsTable.id, attachmentId));
          
          console.log(`📋 첨부파일 데이터베이스 조회 결과:`, {
            found: !!attachment,
            name: attachment?.originalName,
            mimeType: attachment?.mimeType,
            hasFileData: !!attachment?.fileData,
            hasFilePath: !!attachment?.filePath
          });
            
          if (attachment) {
            const isExcelFile = attachment.mimeType?.includes('excel') || 
                              attachment.mimeType?.includes('spreadsheet') ||
                              attachment.originalName?.toLowerCase().endsWith('.xlsx') ||
                              attachment.originalName?.toLowerCase().endsWith('.xls');
                              
            if (isExcelFile && !excelFilePath) {
              // 첫 번째 Excel 파일을 주 첨부파일로 사용
              if (attachment.fileData) {
                // Base64 데이터를 임시 파일로 저장
                const tempDir = path.join(__dirname, '../../uploads');
                const tempFilePath = path.join(tempDir, `temp-${Date.now()}-${attachment.originalName}`);
                
                if (!fs.existsSync(tempDir)) {
                  fs.mkdirSync(tempDir, { recursive: true });
                }
                
                fs.writeFileSync(tempFilePath, Buffer.from(attachment.fileData, 'base64'));
                excelFilePath = tempFilePath;
                console.log('✅ Excel 파일 임시 저장:', tempFilePath);
              } else if (attachment.filePath && fs.existsSync(attachment.filePath)) {
                excelFilePath = attachment.filePath;
                console.log('✅ Excel 파일 경로 사용:', attachment.filePath);
              }
            } else {
              // Excel이 아닌 파일들은 추가 첨부파일로 처리
              if (attachment.fileData) {
                additionalAttachments.push({
                  filename: attachment.originalName,
                  content: Buffer.from(attachment.fileData, 'base64'),
                  contentType: attachment.mimeType || 'application/octet-stream'
                });
                console.log('✅ 추가 첨부파일 추가 (Base64):', attachment.originalName);
              } else if (attachment.filePath && fs.existsSync(attachment.filePath)) {
                additionalAttachments.push({
                  filename: attachment.originalName,
                  path: attachment.filePath,
                  contentType: attachment.mimeType || 'application/octet-stream'
                });
                console.log('✅ 추가 첨부파일 추가 (파일 경로):', attachment.originalName);
              }
            }
          }
        } catch (error) {
          console.error('❌ 첨부파일 처리 오류, ID:', attachmentId, error);
        }
      }
    }

    // Excel 파일이 없으면 기본 빈 Excel 파일 생성
    if (!excelFilePath) {
      console.log('📎 Excel 파일이 없어 기본 파일 생성');
      const tempDir = path.join(__dirname, '../../uploads');
      const tempFilePath = path.join(tempDir, `default-po-${Date.now()}.xlsx`);
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // 기본 Excel 파일 생성
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([{
        '발주번호': orderData.orderNumber,
        '거래처': orderData.vendorName,
        '발주금액': orderData.totalAmount,
        '발주일자': orderData.orderDate
      }]);
      XLSX.utils.book_append_sheet(workbook, worksheet, '발주서');
      XLSX.writeFile(workbook, tempFilePath);
      
      excelFilePath = tempFilePath;
      console.log('✅ 기본 Excel 파일 생성:', tempFilePath);
    }

    // NEW: Process selectedAttachments/selectedAttachmentIds from frontend modal
    // Support both selectedAttachments and selectedAttachmentIds (frontend sends selectedAttachmentIds)
    const selectedAttachments = req.body.selectedAttachments || [];
    const attachPdf = req.body.attachPdf || false;
    const attachExcel = req.body.attachExcel || false;
    const pdfUrl = req.body.pdfUrl || '';
    const excelUrl = req.body.excelUrl || '';
    
    const attachmentIdsToProcess = (selectedAttachmentIds && selectedAttachmentIds.length > 0) 
      ? selectedAttachmentIds 
      : selectedAttachments;
      
    if (attachmentIdsToProcess && Array.isArray(attachmentIdsToProcess) && attachmentIdsToProcess.length > 0) {
      console.log('📎 처리할 선택된 첨부파일 IDs:', attachmentIdsToProcess);
      console.log('📎 attachPdf:', attachPdf, 'attachExcel:', attachExcel);
      console.log('📎 pdfUrl:', pdfUrl, 'excelUrl:', excelUrl);
      
      // Track which attachment IDs have already been processed by the old logic
      const processedAttachmentIds = new Set();
      
      // Only mark as processed if BOTH the flag is true AND attachment was actually added
      // This prevents skipping attachments when the old logic didn't actually process them
      if (attachPdf && pdfUrl && pdfUrl.includes('/api/attachments/') && pdfUrl.includes('/download')) {
        const pdfAttachmentIdMatch = pdfUrl.match(/\/api\/attachments\/(\d+)\/download/);
        if (pdfAttachmentIdMatch && attachments.length > 0) {
          // Only mark as processed if we actually added a PDF
          const pdfId = parseInt(pdfAttachmentIdMatch[1]);
          console.log('🔍 PDF already processed by old logic, ID:', pdfId);
          processedAttachmentIds.add(pdfId);
        }
      }
      
      if (attachExcel && excelUrl && excelUrl.includes('/api/attachments/') && excelUrl.includes('/download')) {
        const excelAttachmentIdMatch = excelUrl.match(/\/api\/attachments\/(\d+)\/download/);
        if (excelAttachmentIdMatch) {
          const excelId = parseInt(excelAttachmentIdMatch[1]);
          // Check if Excel was actually processed by checking attachments array
          const excelProcessed = attachmentsList.some(item => item.includes('Excel'));
          if (excelProcessed) {
            console.log('🔍 Excel already processed by old logic, ID:', excelId);
            processedAttachmentIds.add(excelId);
          } else {
            console.log('⚠️ Excel URL exists but not processed by old logic, will process in selectedAttachments');
          }
        }
      }
      
      for (const attachmentId of attachmentIdsToProcess) {
        try {
          // Skip if this attachment was already processed by the old logic
          if (processedAttachmentIds.has(attachmentId)) {
            console.log('⚠️ 첨부파일 이미 처리됨 (기존 로직):', attachmentId);
            continue;
          }
          
          const [attachment] = await database.db
            .select({
              id: attachmentsTable.id,
              originalName: attachmentsTable.originalName,
              filePath: attachmentsTable.filePath,
              mimeType: attachmentsTable.mimeType,
              fileData: attachmentsTable.fileData
            })
            .from(attachmentsTable)
            .where(eq(attachmentsTable.id, attachmentId));
            
          if (attachment) {
            if (attachment.fileData) {
              // Use Base64 data from database
              const fileBuffer = Buffer.from(attachment.fileData, 'base64');
              attachments.push({
                filename: attachment.originalName,
                content: fileBuffer,
                contentType: attachment.mimeType || 'application/octet-stream'
              });
              attachmentsList.push(attachment.originalName);
              console.log('✅ 선택된 첨부파일 추가 성공 (DB Base64):', {
                name: attachment.originalName,
                mimeType: attachment.mimeType,
                bufferSize: fileBuffer.length,
                isExcel: attachment.mimeType?.includes('spreadsheet') || attachment.originalName?.endsWith('.xlsx'),
                method: 'content (Buffer)'
              });
            } else if (attachment.filePath && fs.existsSync(attachment.filePath)) {
              // Use file path
              attachments.push({
                filename: attachment.originalName,
                path: attachment.filePath,
                contentType: attachment.mimeType || 'application/octet-stream'
              });
              attachmentsList.push(attachment.originalName);
              console.log('✅ 선택된 첨부파일 추가 성공 (파일 경로):', {
                name: attachment.originalName,
                mimeType: attachment.mimeType,
                filePath: attachment.filePath,
                isExcel: attachment.mimeType?.includes('spreadsheet') || attachment.originalName?.endsWith('.xlsx'),
                method: 'path (File)'
              });
            } else {
              console.log('❌ 선택된 첨부파일 처리 실패 (데이터 없음):', attachment.originalName);
            }
          } else {
            console.log('❌ 선택된 첨부파일 정보 없음, ID:', attachmentId);
          }
        } catch (error) {
          console.error('❌ 선택된 첨부파일 처리 오류, ID:', attachmentId, error);
        }
      }
    }
    
    console.log(`📎 총 ${attachments.length}개 첨부파일:`, attachmentsList);

    // DB에서 실제 주문 데이터를 가져와서 이메일 템플릿 생성
    let emailHtmlContent: string;
    
    if (orderData.orderId) {
      // DB에서 실제 데이터를 가져와서 템플릿 생성
      const templateData = await generateEmailTemplateData(orderData.orderId);
      if (templateData) {
        // 첨부파일 목록 추가
        templateData.attachmentsList = attachmentsList;
        // 추가 메시지 덮어쓰기 (사용자가 입력한 경우)
        if (message) {
          templateData.additionalMessage = message;
        }
        emailHtmlContent = generateEmailHTML(templateData);
        console.log('✅ DB 데이터 기반 이메일 템플릿 생성 완료');
      } else {
        // DB 데이터를 가져올 수 없는 경우 간단한 템플릿 사용
        console.log('⚠️ DB 데이터를 가져올 수 없어 기본 템플릿 사용');
        emailHtmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: 'Malgun Gothic', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #007bff; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                .order-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="header"><h2>📋 발주서 전송</h2></div>
              <div class="content">
                <p>안녕하세요, 발주서를 전송드립니다.</p>
                <div class="order-info">
                  <p><strong>발주번호:</strong> ${orderData.orderNumber || 'N/A'}</p>
                  <p><strong>거래처:</strong> ${orderData.vendorName || 'N/A'}</p>
                  <p><strong>메시지:</strong> ${message || '없음'}</p>
                </div>
              </div>
            </body>
          </html>
        `;
      }
    } else {
      // orderId가 없는 경우 간단한 이메일 템플릿 사용
      emailHtmlContent = `
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
              .order-info {
                background: white;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>📋 발주서 전송</h2>
            </div>
            <div class="content">
              <p>안녕하세요,</p>
              <p>발주서를 전송드립니다.</p>
              <div class="order-info">
                <p><strong>발주번호:</strong> ${orderData.orderNumber || 'N/A'}</p>
                <p><strong>거래처:</strong> ${orderData.vendorName || 'N/A'}</p>
                <p><strong>메시지:</strong> ${message || '없음'}</p>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    // EmailService의 generateEmailContent를 위한 별도 메서드 생성 (fallback용)
    function generateEmailContent(options: any, attachmentsList: string[] = []): string {
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
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📋 발주서 송부</h1>
              <p>구매 발주 관리 시스템</p>
            </div>
            
            <div class="content">
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
                  ${options.totalAmount ? `
                    <tr>
                      <th>총 금액</th>
                      <td><strong>${formatCurrency(options.totalAmount)}</strong></td>
                    </tr>
                  ` : ''}
                </table>
              ` : ''}
              
              ${attachmentsList.length > 0 ? `
                <div class="attachments">
                  <h3>📎 첨부파일</h3>
                  <ul>
                    ${attachmentsList.map(attachment => `<li>${attachment}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              
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

    console.log('📧 sendPOWithOriginalFormat 호출 전 옵션:', {
      to: emailOptions.to,
      cc: emailOptions.cc,
      subject: emailOptions.subject,
      attachmentsCount: attachments.length
    });

    // 이미 위에서 생성한 emailHtmlContent를 사용 (DB 데이터 기반 또는 fallback)
    const emailHtml = emailHtmlContent;
    
    // 동적 SMTP 설정을 사용하여 이메일 발송
    const emailSettingsService = new EmailSettingsService();
    let smtpConfig = await emailSettingsService.getDecryptedSettings();
    
    // Fallback to environment variables if no SMTP config in database
    if (!smtpConfig) {
      console.log('⚠️ DB에서 SMTP 설정을 찾을 수 없음, 환경변수 사용');
      
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        smtpConfig = {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        };
        console.log('✅ 환경변수 SMTP 설정 사용:', { host: smtpConfig.host, user: smtpConfig.auth.user });
      } else {
        throw new Error('이메일 설정을 찾을 수 없습니다. 관리자 설정에서 SMTP 정보를 확인하거나 환경변수를 설정해주세요.');
      }
    }
    
    const transporter = nodemailer.createTransport(smtpConfig);
    
    // 이메일 옵션 설정 - 안전한 attachments 처리
    const safeAttachments = attachments.map(att => {
      const attachment: any = {
        filename: att.filename || 'attachment'
      };
      
      // Set content type if provided
      if (att.contentType) {
        attachment.contentType = att.contentType;
      }
      
      // Handle both path-based and content-based attachments with validation
      try {
        if (att.path && typeof att.path === 'string' && att.path.length > 0) {
          attachment.path = att.path;
          attachment.valid = true;
          console.log(`📎 첨부파일 (파일): ${att.filename} -> ${att.path}`);
        } else if (att.content && Buffer.isBuffer(att.content) && att.content.length > 0) {
          attachment.content = att.content;
          attachment.valid = true;
          console.log(`📎 첨부파일 (버퍼): ${att.filename} -> ${att.content.length} bytes`);
        } else {
          attachment.valid = false;
          console.warn(`⚠️ 첨부파일 데이터 없음: ${att.filename}`);
        }
      } catch (attachError) {
        attachment.valid = false;
        console.error(`❌ 첨부파일 처리 오류: ${att.filename}`, attachError);
      }
      
      return attachment;
    }).filter(att => att.valid).map(att => {
      // Remove the valid flag before sending to nodemailer
      const { valid, ...cleanAtt } = att;
      return cleanAtt;
    });
    
    const mailOptions = {
      from: smtpConfig.auth.user,
      to: Array.isArray(emailOptions.to) ? emailOptions.to.join(', ') : emailOptions.to,
      cc: emailOptions.cc ? (Array.isArray(emailOptions.cc) ? emailOptions.cc.join(', ') : emailOptions.cc) : undefined,
      subject: emailOptions.subject || `발주서 - ${orderData.orderNumber || ''}`,
      html: emailHtml,
      attachments: safeAttachments
    };
    
    // 디버깅: 첨부파일 상세 정보
    console.log('📧 최종 첨부파일 목록:', safeAttachments.map(att => ({
      filename: att.filename,
      hasPath: !!att.path,
      hasContent: !!att.content,
      contentSize: att.content ? att.content.length : 0,
      contentType: att.contentType
    })));
    
    // POEmailService를 사용하여 실제 이메일 발송 (개발 모드 제한 해제)
    console.log('📧 POEmailService를 사용한 이메일 발송 시작');
    
    // 첨부파일을 POEmailService 형식으로 변환
    const poServiceAttachments = attachments.map(att => ({
      filename: att.filename || 'attachment',
      content: att.content || (att.path ? fs.readFileSync(att.path) : Buffer.alloc(0)),
      contentType: att.contentType || 'application/octet-stream'
    })).filter(att => att.content && att.content.length > 0);
    
    // 임시 Excel 파일 생성 (POEmailService가 Excel 파일을 요구하므로)
    const tempExcelPath = path.join(__dirname, '../../uploads', `temp_email_${Date.now()}.txt`);
    fs.writeFileSync(tempExcelPath, `발주서 이메일 첨부파일\n발주번호: ${orderData.orderNumber}\n전송시간: ${new Date().toISOString()}`);
    
    try {
      const result = await emailService.sendPOWithOriginalFormat(tempExcelPath, {
        to: emailOptions.to,
        cc: emailOptions.cc,
        subject: emailOptions.subject,
        orderNumber: orderData.orderNumber,
        vendorName: orderData.vendorName,
        totalAmount: orderData.totalAmount,
        additionalMessage: message || emailOptions.additionalMessage,
        additionalAttachments: poServiceAttachments
      }, {
        orderId: orderData?.orderId,
        senderUserId: req.user?.id
      });

      // 임시 파일 삭제
      try {
        if (fs.existsSync(tempExcelPath)) {
          fs.unlinkSync(tempExcelPath);
        }
      } catch (unlinkError) {
        console.warn('임시 파일 삭제 실패:', unlinkError);
      }

      if (result.success) {
        console.log('✅ POEmailService 이메일 발송 성공');
        
        // 발주서 상태 업데이트
        if (orderData && orderData.orderNumber) {
          try {
            console.log(`🔄 발주서 상태 업데이트 시도: ${orderData.orderNumber} → sent`);
            await updateOrderStatusAfterEmail(orderData.orderNumber);
            console.log(`✅ 발주서 상태 업데이트 완료: ${orderData.orderNumber} → sent`);
          } catch (updateError) {
            console.error(`❌ 발주서 상태 업데이트 실패: ${orderData.orderNumber}`, updateError);
          }
        }
        
        res.json({ 
          success: true, 
          messageId: result.messageId,
          message: '이메일이 성공적으로 발송되었습니다.'
        });
        return;
      } else {
        console.error('❌ POEmailService 이메일 발송 실패:', result.error);
        res.status(500).json({ 
          error: '이메일 발송에 실패했습니다.',
          details: result.error
        });
        return;
      }
    } catch (serviceError) {
      // 임시 파일 삭제 (오류 시에도)
      try {
        if (fs.existsSync(tempExcelPath)) {
          fs.unlinkSync(tempExcelPath);
        }
      } catch (unlinkError) {
        console.warn('임시 파일 삭제 실패 (오류 시):', unlinkError);
      }
      
      console.error('❌ POEmailService 호출 오류:', serviceError);
      res.status(500).json({ 
        error: '이메일 서비스 오류가 발생했습니다.',
        details: serviceError instanceof Error ? serviceError.message : 'Unknown error'
      });
      return;
    }
    
    // 아래 코드는 실행되지 않음 (POEmailService 사용으로 대체됨)
    if (false) {
      console.log('📧 [개발 모드] 이메일 발송 시뮬레이션:', {
        to: mailOptions.to,
        cc: mailOptions.cc,
        subject: mailOptions.subject,
        attachmentsCount: attachments.length
      });
      
      // 개발 환경에서도 이메일 기록 저장
      if (orderData && orderData.orderId) {
        try {
          console.log('💾 이메일 히스토리 DB 저장 시작 (개발 모드)');
          const { emailSendHistory } = await import('@shared/schema');
          
          const recipients = Array.isArray(emailOptions.to) 
            ? emailOptions.to 
            : emailOptions.to.split(',').map((e: string) => e.trim());
          
          const ccRecipients = emailOptions.cc 
            ? (Array.isArray(emailOptions.cc) 
                ? emailOptions.cc 
                : emailOptions.cc.split(',').map((e: string) => e.trim())) 
            : [];
          
          const historyData = {
            orderId: orderData.orderId,
            orderNumber: orderData.orderNumber,
            senderUserId: req.user?.id ? String(req.user.id) : null,
            recipients: recipients,
            cc: ccRecipients,
            bcc: [],
            subject: mailOptions.subject,
            messageContent: message || emailOptions.additionalMessage || '',
            attachmentFiles: attachmentsList,
            status: 'sent',
            sentCount: 1,
            failedCount: 0,
            errorMessage: null,
            sentAt: new Date()
          };
          
          console.log('📋 DB 삽입 데이터:', historyData);
          
          await database.db.insert(emailSendHistory).values(historyData);
          
          console.log('✅ 이메일 히스토리 DB 저장 성공');
          
          console.log(`📧 [개발 모드] 이메일 기록 저장 완료: 발주번호 ${orderData.orderNumber}`);
        } catch (historyError) {
          console.error(`❌ [개발 모드] 이메일 기록 저장 실패 (상세):`, {
            error: historyError,
            message: historyError instanceof Error ? historyError.message : 'Unknown error',
            stack: historyError instanceof Error ? historyError.stack : undefined,
            orderData: {
              orderId: orderData.orderId,
              orderNumber: orderData.orderNumber
            },
            userId: req.user?.id
          });
        }
      }
      
      res.json({ 
        success: true, 
        messageId: `mock-${Date.now()}`,
        mockMode: true,
        message: '개발 환경: 이메일이 실제로 발송되지 않았습니다.'
      });
    } else {
      // 실제 이메일 발송
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 이메일 발송 성공:', info.messageId);
        
        // 이메일 발송 성공 시 발주서 상태를 'sent'로 업데이트 및 이메일 기록 저장
        if (orderData && orderData.orderNumber) {
          try {
            console.log(`🔄 발주서 상태 업데이트 시도: ${orderData.orderNumber} → sent`);
            await updateOrderStatusAfterEmail(orderData.orderNumber);
            console.log(`✅ 발주서 상태 업데이트 완료: ${orderData.orderNumber} → sent`);
            
            // 이메일 발송 기록 저장
            if (orderData.orderId) {
              try {
                console.log('💾 이메일 히스토리 DB 저장 시작 (프로덕션)');
                const { emailSendHistory } = await import('@shared/schema');
                
                // 수신자 목록 정리
                const recipients = Array.isArray(emailOptions.to) 
                  ? emailOptions.to 
                  : emailOptions.to.split(',').map((e: string) => e.trim());
                
                const ccRecipients = emailOptions.cc 
                  ? (Array.isArray(emailOptions.cc) 
                      ? emailOptions.cc 
                      : emailOptions.cc.split(',').map((e: string) => e.trim())) 
                  : [];
                
                const historyData = {
                  orderId: orderData.orderId,
                  orderNumber: orderData.orderNumber,
                  senderUserId: req.user?.id ? String(req.user.id) : null,
                  recipients: recipients,
                  cc: ccRecipients,
                  bcc: [],
                  subject: mailOptions.subject,
                  messageContent: message || emailOptions.additionalMessage || '',
                  attachmentFiles: attachmentsList,
                  status: 'sent',
                  sentCount: 1,
                  failedCount: 0,
                  errorMessage: null,
                  sentAt: new Date()
                };
                
                console.log('📋 DB 삽입 데이터 (프로덕션):', historyData);
                
                await database.db.insert(emailSendHistory).values({
                  orderId: orderData.orderId,
                  orderNumber: orderData.orderNumber,
                  senderUserId: req.user?.id ? String(req.user.id) : null,
                  recipients: recipients,
                  cc: ccRecipients,
                  bcc: [],
                  subject: mailOptions.subject,
                  messageContent: message || emailOptions.additionalMessage || '',
                  attachmentFiles: attachmentsList,
                  status: 'sent',
                  sentCount: 1,
                  failedCount: 0,
                  errorMessage: null,
                  sentAt: new Date()
                });
                
                console.log(`📧 이메일 발송 기록 저장 완료: 발주번호 ${orderData.orderNumber}`);
              } catch (historyError) {
                console.error(`❌ 이메일 기록 저장 실패:`, historyError);
                // 기록 저장 실패는 이메일 발송 성공에 영향을 주지 않음
              }
            }
          } catch (updateError) {
            console.error(`❌ 발주서 상태 업데이트 실패: ${orderData.orderNumber}`, updateError);
            // 상태 업데이트 실패는 이메일 발송 성공에 영향을 주지 않음
          }
        } else {
          console.log(`⚠️ 발주서 정보가 없어 상태 업데이트를 건너뜀:`, { orderData });
        }
        
        res.json({ success: true, messageId: info.messageId });
      } catch (emailError) {
        console.error('📧 이메일 발송 실패:', emailError);
        
        // 이메일 발송 실패 시에도 기록 저장
        if (orderData && orderData.orderId) {
          try {
            const { emailSendHistory } = await import('@shared/schema');
            
            const recipients = Array.isArray(emailOptions.to) 
              ? emailOptions.to 
              : emailOptions.to.split(',').map((e: string) => e.trim());
            
            const ccRecipients = emailOptions.cc 
              ? (Array.isArray(emailOptions.cc) 
                  ? emailOptions.cc 
                  : emailOptions.cc.split(',').map((e: string) => e.trim())) 
              : [];
            
            await database.db.insert(emailSendHistory).values({
              orderId: orderData.orderId,
              orderNumber: orderData.orderNumber,
              senderUserId: req.user?.id ? String(req.user.id) : null,
              recipients: recipients,
              cc: ccRecipients,
              bcc: [],
              subject: mailOptions.subject,
              messageContent: message || emailOptions.additionalMessage || '',
              attachmentFiles: attachmentsList,
              status: 'failed',
              sentCount: 0,
              failedCount: 1,
              errorMessage: emailError instanceof Error ? emailError.message : 'Unknown error',
              sentAt: new Date()
            });
            
            console.log(`📧 이메일 발송 실패 기록 저장 완료: 발주번호 ${orderData.orderNumber}`);
          } catch (historyError) {
            console.error(`❌ 이메일 실패 기록 저장 실패:`, historyError);
          }
        }
        
        res.status(500).json({ 
          error: '이메일 발송 실패',
          details: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
      }
    }

  } catch (error) {
    console.error('❌ 이메일 발송 오류 (상세):', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    // 데이터베이스 관련 오류인지 확인
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isDatabaseError = errorMessage.includes('column') || 
                          errorMessage.includes('relation') || 
                          errorMessage.includes('insert') ||
                          errorMessage.includes('constraint') ||
                          errorMessage.includes('violates');
    
    console.log(`🔍 데이터베이스 오류 여부: ${isDatabaseError}`);
    
    res.status(500).json({ 
      error: '이메일 발송 실패',
      details: errorMessage,
      isDatabaseError,
      timestamp: new Date().toISOString()
    });
  }
});

// 간편 이메일 발송 (bulk order editor용)
router.post("/orders/send-email-simple", requireAuth, async (req, res) => {
  try {
    const { to, cc, subject, body, orderData, attachPdf, attachExcel, selectedAttachmentIds } = req.body;
    
    console.log('📧 간편 이메일 발송 요청:', { to, cc, subject, attachments: { attachPdf, attachExcel, selectedAttachmentIds } });
    
    // 수신자 검증
    if (!to || to.length === 0) {
      return res.status(400).json({ error: '수신자가 필요합니다.' });
    }

    // 이메일 주소 추출 (Recipient 객체에서 email 필드 추출)
    const toEmails = to.map((recipient: any) => 
      typeof recipient === 'string' ? recipient : recipient.email
    ).filter(Boolean);
    
    const ccEmails = cc ? cc.map((recipient: any) => 
      typeof recipient === 'string' ? recipient : recipient.email
    ).filter(Boolean) : [];

    if (toEmails.length === 0) {
      return res.status(400).json({ error: '유효한 이메일 주소가 필요합니다.' });
    }

    // 환경 변수 확인
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ SMTP 설정이 없어서 이메일을 발송할 수 없습니다.');
      console.warn('필요 설정:', { SMTP_HOST: !!process.env.SMTP_HOST, SMTP_USER: !!process.env.SMTP_USER, SMTP_PASS: !!process.env.SMTP_PASS });
      
      // Production에서는 에러 반환
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        return res.status(500).json({ 
          error: 'SMTP 설정이 누락되었습니다.',
          details: 'SMTP_HOST, SMTP_USER, SMTP_PASS 환경변수를 확인해주세요.'
        });
      }
      
      // 개발 환경에서는 성공으로 처리
      return res.json({ 
        success: true, 
        message: '이메일 기능이 아직 설정되지 않았습니다. (개발 모드)',
        mockData: { to: toEmails, cc: ccEmails, subject }
      });
    }

    // emailService를 사용하여 이메일 발송
    const emailData = {
      orderNumber: orderData?.orderNumber || 'PO-' + Date.now(),
      projectName: orderData?.projectName || '프로젝트',
      vendorName: orderData?.vendorName || '거래처',
      location: orderData?.location || '현장',
      orderDate: orderData?.orderDate || new Date().toLocaleDateString('ko-KR'),
      deliveryDate: orderData?.deliveryDate || new Date().toLocaleDateString('ko-KR'),
      totalAmount: orderData?.totalAmount || 0,
      userName: (req as any).user?.name || '담당자',
      userPhone: (req as any).user?.phone || '연락처'
    };

    // 첨부파일 처리 (실제 파일이 있는 경우)
    let excelPath = '';
    if (attachExcel && orderData?.excelFilePath) {
      excelPath = path.join(__dirname, '../../', orderData.excelFilePath.replace(/^\//, ''));
      if (!fs.existsSync(excelPath)) {
        console.warn('⚠️ 엑셀 파일을 찾을 수 없습니다:', excelPath);
        excelPath = '';
      }
    }

    // Process selectedAttachmentIds from frontend modal
    let attachments = [];
    if (selectedAttachmentIds && Array.isArray(selectedAttachmentIds) && selectedAttachmentIds.length > 0) {
      console.log('📎 처리할 선택된 첨부파일 IDs:', selectedAttachmentIds);
      
      for (const attachmentId of selectedAttachmentIds) {
        try {
          // Query attachment data from database
          const attachmentQuery = await db.query(sql`
            SELECT id, original_name, file_data, mime_type
            FROM attachments 
            WHERE id = ${attachmentId}
          `);
          
          if (attachmentQuery.length > 0) {
            const attachment = attachmentQuery[0];
            console.log(`📎 처리 중인 첨부파일: ID=${attachmentId}, name=${attachment.original_name}`);
            
            if (attachment.file_data) {
              // Convert base64 data to buffer
              const fileBuffer = Buffer.from(attachment.file_data, 'base64');
              
              attachments.push({
                filename: attachment.original_name,
                content: fileBuffer,
                contentType: attachment.mime_type || 'application/octet-stream'
              });
              
              console.log(`✅ 첨부파일 추가 완료: ${attachment.original_name} (${fileBuffer.length} bytes)`);
            } else {
              console.warn(`⚠️ 첨부파일 데이터가 없습니다: ID=${attachmentId}`);
            }
          } else {
            console.warn(`⚠️ 첨부파일을 찾을 수 없습니다: ID=${attachmentId}`);
          }
        } catch (attachError) {
          console.error(`❌ 첨부파일 처리 오류: ID=${attachmentId}`, attachError);
        }
      }
    }

    // 임시 엑셀 파일 생성 (첨부파일이 없는 경우)
    if (!excelPath) {
      const tempDir = path.join(__dirname, '../../uploads/temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      excelPath = path.join(tempDir, `temp_${Date.now()}.txt`);
      fs.writeFileSync(excelPath, `발주서 상세 내용\n\n${body}`);
    }

    // 이메일 발송 (POEmailService 사용) - additionalAttachments 지원
    console.log(`📧 이메일 발송: 기본 첨부파일 + 추가 첨부파일 ${attachments.length}개`);
    const result = await emailService.sendPOWithOriginalFormat(excelPath, {
      to: toEmails,
      cc: ccEmails,
      subject: subject || `발주서 - ${emailData.orderNumber}`,
      orderNumber: emailData.orderNumber,
      vendorName: emailData.vendorName,
      totalAmount: emailData.totalAmount,
      additionalMessage: body || `발주서를 첨부합니다.\n\n발주번호: ${emailData.orderNumber}\n프로젝트: ${emailData.projectName}\n거래처: ${emailData.vendorName}`,
      additionalAttachments: attachments // Pass additional attachments
    }, {
      orderId: orderData?.orderId,
      senderUserId: (req as any).user?.id
    });

    // 임시 파일 삭제
    if (excelPath.includes('temp_')) {
      try {
        if (fs.existsSync(excelPath)) {
          fs.unlinkSync(excelPath);
        }
      } catch (err) {
        console.warn('임시 파일 삭제 실패:', err);
      }
    }

    console.log('📧 이메일 발송 성공:', result);
    
    // 이메일 발송 성공 시 발주서 상태를 'sent'로 업데이트
    if (result.success && emailData && emailData.orderNumber) {
      try {
        console.log(`🔄 [간편발송] 발주서 상태 업데이트 시도: ${emailData.orderNumber} → sent`);
        await updateOrderStatusAfterEmail(emailData.orderNumber);
        console.log(`✅ [간편발송] 발주서 상태 업데이트 완료: ${emailData.orderNumber} → sent`);
      } catch (updateError) {
        console.error(`❌ [간편발송] 발주서 상태 업데이트 실패: ${emailData.orderNumber}`, updateError);
        // 상태 업데이트 실패는 이메일 발송 성공에 영향을 주지 않음
      }
    } else {
      console.log(`⚠️ [간편발송] 발주서 정보가 없어 상태 업데이트를 건너뜀:`, { 
        resultSuccess: result.success, 
        emailData: emailData?.orderNumber || 'no orderNumber'
      });
    }
    
    res.json({ success: true, ...result });

  } catch (error) {
    console.error('이메일 발송 오류:', error);
    res.status(500).json({ 
      error: '이메일 발송에 실패했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

// 엑셀 파일과 함께 이메일 발송
router.post("/orders/send-email-with-excel", requireAuth, async (req, res) => {
  try {
    const { emailSettings, excelFilePath, orderData } = req.body;
    
    console.log('📧 엑셀 파일 이메일 발송 요청:', { emailSettings, excelFilePath });
    
    if (!emailSettings.to) {
      return res.status(400).json({ error: '수신자가 필요합니다.' });
    }

    if (!excelFilePath) {
      return res.status(400).json({ error: '엑셀 파일 경로가 필요합니다.' });
    }

    // 엑셀 파일 경로를 절대 경로로 변환
    const absoluteExcelPath = excelFilePath.startsWith('http') 
      ? excelFilePath.replace(/^https?:\/\/[^\/]+/, '') 
      : excelFilePath;
    
    const localExcelPath = path.join(__dirname, '../../', absoluteExcelPath.replace(/^\//, ''));
    
    console.log('📧 엑셀 파일 경로:', localExcelPath);
    
    if (!fs.existsSync(localExcelPath)) {
      return res.status(400).json({ error: '엑셀 파일을 찾을 수 없습니다.' });
    }

    // POEmailService를 사용하여 원본 형식 유지 이메일 발송
    const result = await emailService.sendPOWithOriginalFormat(
      localExcelPath,
      {
        to: emailSettings.to,
        cc: emailSettings.cc,
        subject: emailSettings.subject,
        orderNumber: emailSettings.orderNumber,
        vendorName: emailSettings.vendorName,
        totalAmount: emailSettings.totalAmount,
        additionalMessage: emailSettings.message
      },
      {
        orderId: orderData?.id,
        senderUserId: (req as any).user?.id
      }
    );

    if (result.success) {
      console.log('📧 엑셀 이메일 발송 성공');
      
      // 이메일 발송 성공 시 발주서 상태를 'sent'로 업데이트
      if (emailSettings && emailSettings.orderNumber) {
        try {
          await updateOrderStatusAfterEmail(emailSettings.orderNumber);
          console.log(`📋 발주서 상태 업데이트 완료: ${emailSettings.orderNumber} → sent`);
        } catch (updateError) {
          console.error(`❌ 발주서 상태 업데이트 실패: ${emailSettings.orderNumber}`, updateError);
          // 상태 업데이트 실패는 이메일 발송 성공에 영향을 주지 않음
        }
      }
      
      res.json({ success: true, messageId: result.messageId });
    } else {
      console.error('📧 엑셀 이메일 발송 실패:', result.error);
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('엑셀 이메일 발송 오류:', error);
    res.status(500).json({ 
      error: '엑셀 이메일 발송 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 임시 이메일 테스트 엔드포인트 (인증 불필요)
router.post("/test-email-smtp", async (req, res) => {
  try {
    console.log('🔍 SMTP 테스트 시작...');
    console.log('🔧 SMTP 설정:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS ? '***설정됨***' : '❌ 설정안됨'
    });

    const { testEmail } = req.body;
    const recipientEmail = testEmail || 'davidswyang@gmail.com';

    // 테스트 발주서 데이터
    const testOrderData = {
      orderNumber: 'SMTP-TEST-001',
      projectName: '네이버 SMTP 테스트',
      vendorName: 'System Test',
      location: 'Test Environment',
      orderDate: new Date().toLocaleDateString('ko-KR'),
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR'),
      totalAmount: 999999,
      userName: 'System Tester',
      userPhone: '010-0000-0000'
    };

    // 임시 더미 파일 생성 (Excel 첨부용)
    const fs = require('fs');
    const path = require('path');
    const testExcelPath = path.join(__dirname, '../../uploads/smtp-test.txt');
    fs.writeFileSync(testExcelPath, 'SMTP Test File - ' + new Date().toISOString());

    const result = await emailService.sendPOWithOriginalFormat(testExcelPath, {
      to: [recipientEmail],
      cc: [],
      subject: 'SMTP 테스트 - 발주서',
      orderNumber: 'TEST-001',
      vendorName: '테스트 거래처',
      additionalMessage: 'SMTP 설정 테스트 이메일입니다.'
    }, {
      orderId: 9999,
      senderUserId: 'system-test'
    });

    // 임시 파일 삭제
    try {
      if (fs.existsSync(testExcelPath)) {
        fs.unlinkSync(testExcelPath);
      }
    } catch (e) {
      console.warn('임시 파일 삭제 실패:', e.message);
    }

    if (result.success) {
      console.log('✅ SMTP 테스트 성공!');
      res.json({
        success: true,
        message: '✅ 네이버 SMTP 테스트 성공!',
        messageId: result.messageId,
        acceptedRecipients: result.acceptedRecipients,
        rejectedRecipients: result.rejectedRecipients,
        testEmail: recipientEmail,
        smtp: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER
        }
      });
    } else {
      console.error('❌ SMTP 테스트 실패');
      res.status(500).json({
        success: false,
        message: '❌ SMTP 테스트 실패',
        error: '이메일 발송 실패'
      });
    }

  } catch (error) {
    console.error('❌ SMTP 테스트 오류:', error);
    res.status(500).json({
      success: false,
      message: '❌ SMTP 테스트 오류',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        code: error.code,
        response: error.response
      }
    });
  }
});

// Get all attachments for an order
router.get("/orders/:orderId/attachments", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    
    console.log(`📎 발주서 첨부파일 목록 요청: 발주서 ID ${orderId}`);

    // Get all attachments for this order
    const attachments = await storage.getOrderAttachments(orderId);
    
    const attachmentList = attachments.map(attachment => ({
      id: attachment.id,
      originalName: attachment.originalName,
      storedName: attachment.storedName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      uploadedAt: attachment.uploadedAt,
      uploadedBy: attachment.uploadedBy,
      // 파일 타입 분류
      type: attachment.mimeType === 'application/pdf' ? 'pdf' : 
            attachment.mimeType?.includes('excel') || attachment.originalName?.endsWith('.xlsx') ? 'excel' : 'other'
    }));

    console.log(`📎 발주서 ${orderId}의 첨부파일: ${attachmentList.length}개`);

    res.json({
      success: true,
      orderId,
      attachments: attachmentList
    });

  } catch (error) {
    console.error("Error fetching order attachments:", error);
    res.status(500).json({ 
      success: false,
      error: "첨부파일 목록을 가져오는데 실패했습니다.",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Download attachment file by ID
router.get("/orders/:orderId/attachments/:attachmentId/download", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);

    console.log(`📎 파일 다운로드 요청: 발주서 ID ${orderId}, 첨부파일 ID ${attachmentId}`);

    // Get attachment info from database
    const attachment = await storage.getAttachment(attachmentId);
    
    if (!attachment) {
      console.log(`❌ 첨부파일을 찾을 수 없음: ID ${attachmentId}`);
      return res.status(404).json({ 
        error: "첨부파일을 찾을 수 없습니다.",
        attachmentId 
      });
    }

    console.log(`📎 첨부파일 정보:`, {
      originalName: attachment.originalName,
      storedName: attachment.storedName,
      filePath: attachment.filePath,
      fileSize: attachment.fileSize
    });

    // Set headers for download with proper filename encoding
    const originalName = attachment.originalName || 'download';
    
    // Ensure proper Korean filename encoding
    const encodedFilename = encodeURIComponent(originalName)
      .replace(/['()]/g, escape)
      .replace(/\*/g, '%2A');
    
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Original-Filename', originalName); // Add original filename for debugging

    console.log(`📤 파일 다운로드 시작: ${originalName}`);

    // Check if file is stored in database (Vercel environment)
    if (attachment.filePath.startsWith('db://') && (attachment as any).fileData) {
      console.log(`💾 DB에서 파일 데이터 읽기: ${attachment.filePath}`);
      
      // Decode Base64 data from database
      const fileBuffer = Buffer.from((attachment as any).fileData, 'base64');
      
      res.setHeader('Content-Length', fileBuffer.length);
      console.log(`📊 파일 크기 (DB): ${(fileBuffer.length / 1024).toFixed(2)} KB`);
      
      // Send buffer directly
      res.send(fileBuffer);
      console.log(`✅ 파일 다운로드 완료 (DB): ${originalName}`);
      
    } else {
      // File is stored in file system
      let filePath = attachment.filePath;
      
      // Handle relative paths
      if (!path.isAbsolute(filePath)) {
        filePath = path.join(__dirname, '../../', filePath);
      }

      console.log(`📂 파일 경로: ${filePath}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`❌ 파일이 존재하지 않음: ${filePath}`);
        return res.status(404).json({ 
          error: "파일을 찾을 수 없습니다.",
          filePath: attachment.filePath 
        });
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      console.log(`📊 파일 크기: ${(stats.size / 1024).toFixed(2)} KB`);
      
      res.setHeader('Content-Length', stats.size);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('error', (error) => {
        console.error('❌ 파일 스트림 오류:', error);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: "파일 읽기 중 오류가 발생했습니다.",
            details: error.message 
          });
        }
      });

      fileStream.on('end', () => {
        console.log(`✅ 파일 다운로드 완료: ${originalName}`);
      });

      fileStream.pipe(res);
    }

  } catch (error) {
    console.error('❌ 첨부파일 다운로드 오류:', error);
    res.status(500).json({ 
      error: "파일 다운로드 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : "알 수 없는 오류"
    });
  }
});

// Complete delivery - change status to delivered
router.post("/orders/:id/complete-delivery", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    const orderId = parseInt(req.params.id);
    
    // Get current order
    const order = await storage.getPurchaseOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check permissions - admin or order owner
    if (user?.role !== "admin" && order.userId !== user?.id) {
      return res.status(403).json({ message: "Access denied - insufficient permissions" });
    }

    // Check current status - can complete delivery from 'created' or 'sent' status
    const currentStatus = order.orderStatus || order.status;
    if (currentStatus !== 'created' && currentStatus !== 'sent') {
      return res.status(400).json({ 
        message: "주문이 발주생성 또는 발송됨 상태가 아닙니다. 납품검수완료는 발주생성 또는 발송된 주문에서만 가능합니다." 
      });
    }

    // Update order status to completed/delivered
    const updatedOrder = await storage.updatePurchaseOrder(orderId, {
      status: 'completed',
      orderStatus: 'delivered',
      updatedAt: new Date()
    });

    // Add to order history
    await storage.createOrderHistory({
      orderId: orderId,
      action: 'delivery_completed',
      details: '납품검수완료',
      userId: userId,
      timestamp: new Date()
    });

    res.json({ 
      message: "납품검수가 완료되었습니다.",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error completing delivery:", error);
    res.status(500).json({ 
      message: "납품검수 완료 중 오류가 발생했습니다.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get email history for an order
router.get("/:orderId/email-history", async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const { emailSendHistory, users } = await import('@shared/schema');
    const { eq, desc } = await import('drizzle-orm');
    
    // Get email history with sender details
    const emailHistory = await database.db
      .select({
        id: emailSendHistory.id,
        orderId: emailSendHistory.orderId,
        sentAt: emailSendHistory.sentAt,
        senderUserId: emailSendHistory.senderUserId,
        sentByName: users.name,
        sentByEmail: users.email,
        recipients: emailSendHistory.recipients,
        cc: emailSendHistory.cc,
        bcc: emailSendHistory.bcc,
        subject: emailSendHistory.subject,
        messageContent: emailSendHistory.messageContent,
        attachmentFiles: emailSendHistory.attachmentFiles,
        status: emailSendHistory.status,
        sentCount: emailSendHistory.sentCount,
        failedCount: emailSendHistory.failedCount,
        errorMessage: emailSendHistory.errorMessage,
        createdAt: emailSendHistory.createdAt,
        updatedAt: emailSendHistory.updatedAt,
      })
      .from(emailSendHistory)
      .leftJoin(users, eq(emailSendHistory.senderUserId, users.id))
      .where(eq(emailSendHistory.orderId, orderId))
      .orderBy(desc(emailSendHistory.sentAt));

    console.log(`📧 이메일 기록 조회: orderId=${orderId}, count=${emailHistory.length}`);
    res.json(emailHistory);
  } catch (error) {
    console.error("Error fetching email history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


export default router;
