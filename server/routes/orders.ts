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
import * as database from "../db";
import { eq, and, or, like, desc } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import * as XLSX from "xlsx";
import nodemailer from "nodemailer";
import { EmailSettingsService } from "../services/email-settings-service";
import { generateEmailTemplateData, generateEmailHTML } from "../utils/email-template-generator";

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Email service instance
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

// Create new order
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
        
        const fallbackResult = await EnhancedPDFGenerationService.generateEnhancedPurchaseOrderPDF(
          order.id,
          enhancedPdfData,
          userId
        );
        
        if (fallbackResult.success) {
          console.log("✅ ORDERS.TS - Fallback Enhanced PDF generated successfully:", fallbackResult.pdfPath);
          pdfGenerationStatus = {
            success: true,
            message: 'PDF 파일이 생성되었습니다 (대체 방식)',
            pdfPath: fallbackResult.pdfPath,
            attachmentId: fallbackResult.attachmentId
          };
        } else {
          console.error("⚠️ ORDERS.TS - Fallback Enhanced PDF also failed:", fallbackResult.error);
          pdfGenerationStatus.message = 'PDF 생성에 실패했습니다. 관리자에게 문의하세요.';
        }
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

// Generate PDF for order
async function generatePDFLogic(req: any, res: any) {
  try {
    const { orderData, options = {} } = req.body;

    // Enhanced validation
    if (!orderData) {
      return res.status(400).json({ 
        success: false,
        error: "발주서 데이터가 필요합니다." 
      });
    }

    // Validate essential fields
    const requiredFields = ['orderNumber', 'projectName', 'vendorName'];
    const missingFields = requiredFields.filter(field => !orderData[field]);
    if (missingFields.length > 0) {
      console.log(`⚠️ PDF 생성 경고: 필수 필드 누락 - ${missingFields.join(', ')}`);
      // Continue with defaults rather than failing
    }

    console.log(`📄 PDF 생성 요청: 발주서 ${orderData.orderNumber || 'N/A'}`);
    console.log('📄 PDF 생성 데이터:', JSON.stringify(orderData, null, 2));

    // Create temporary directory for PDF generation
    const timestamp = Date.now();
    // Use /tmp directory for serverless environments like Vercel
    const tempDir = process.env.VERCEL ? path.join('/tmp', 'temp-pdf') : path.join(process.cwd(), 'uploads/temp-pdf');
    
    // Ensure temp directory exists
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log(`📁 임시 디렉토리 생성: ${tempDir}`);
      }
    } catch (error) {
      console.error(`⚠️ 임시 디렉토리 생성 실패: ${error}`);
      // For serverless, /tmp should always be writable
      if (process.env.VERCEL) {
        throw new Error('🚀 Vercel 환경에서 /tmp 디렉토리 접근 불가');
      }
      throw error;
    }

    const tempHtmlPath = path.join(tempDir, `order-${timestamp}.html`);
    const tempPdfPath = path.join(tempDir, `order-${timestamp}.pdf`);

    console.log(`📄 임시 파일 경로 - HTML: ${tempHtmlPath}, PDF: ${tempPdfPath}`);

    try {
      // Get company information (발주업체 정보)
      let companyInfo = null;
      try {
        const companies = await storage.getCompanies();
        if (companies && companies.length > 0) {
          // Get the first active company or the first company
          companyInfo = companies.find((c: any) => c.isActive) || companies[0];
          console.log('📄 회사 정보 조회:', companyInfo);
        }
      } catch (error) {
        console.error('⚠️ 회사 정보 조회 실패:', error);
      }

      // Extract delivery place from notes if not directly provided
      let extractedDeliveryPlace = orderData.deliveryPlace || '';
      let extractedMajorCategory = orderData.majorCategory || '';
      let extractedMiddleCategory = orderData.middleCategory || '';
      let extractedMinorCategory = orderData.minorCategory || '';
      let cleanedNotes = orderData.notes || '';
      
      // Parse notes field to extract structured data
      if (orderData.notes) {
        const lines = orderData.notes.split('\n');
        const extractedData: string[] = [];
        const structuredData: string[] = [];
        
        lines.forEach((line: string) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return; // Skip empty lines
          
          if (trimmedLine.startsWith('납품처: ')) {
            if (!extractedDeliveryPlace) {
              extractedDeliveryPlace = trimmedLine.replace('납품처: ', '').trim();
            }
          } else if (trimmedLine.startsWith('대분류: ')) {
            if (!extractedMajorCategory) {
              extractedMajorCategory = trimmedLine.replace('대분류: ', '').trim();
            }
            structuredData.push(`대분류: ${trimmedLine.replace('대분류: ', '').trim()}`);
          } else if (trimmedLine.startsWith('중분류: ')) {
            if (!extractedMiddleCategory) {
              extractedMiddleCategory = trimmedLine.replace('중분류: ', '').trim();
            }
            structuredData.push(`중분류: ${trimmedLine.replace('중분류: ', '').trim()}`);
          } else if (trimmedLine.startsWith('소분류: ')) {
            if (!extractedMinorCategory) {
              extractedMinorCategory = trimmedLine.replace('소분류: ', '').trim();
            }
            structuredData.push(`소분류: ${trimmedLine.replace('소분류: ', '').trim()}`);
          } else if (!trimmedLine.startsWith('납품처 이메일: ')) {
            // Keep other notes that aren't structured data
            extractedData.push(trimmedLine);
          }
        });
        
        // Combine notes with proper formatting
        const allNotes: string[] = [];
        
        // Add structured data if they weren't extracted into separate fields
        if (!orderData.majorCategory && !orderData.middleCategory && !orderData.minorCategory && structuredData.length > 0) {
          allNotes.push(...structuredData);
        }
        
        // Add other notes
        if (extractedData.length > 0) {
          allNotes.push(...extractedData);
        }
        
        // Join with separator
        cleanedNotes = allNotes.length > 0 ? allNotes.join(' | ') : '';
      }

      // Get creator user information for PDF
      let creatorInfo = null;
      if (orderData.createdById || orderData.user?.id) {
        try {
          const userId = orderData.createdById || orderData.user?.id;
          const user = await storage.getUser(userId);
          if (user) {
            creatorInfo = {
              name: user.name || '',
              email: user.email || '',
              phone: user.phone || ''
            };
            console.log('📄 발주 생성자 정보:', creatorInfo);
          }
        } catch (error) {
          console.error('⚠️ 사용자 정보 조회 실패:', error);
        }
      }

      // Sanitize and prepare data
      const safeOrderData = {
        // Company info (발주업체)
        companyName: companyInfo?.companyName || '(주)익진엔지니어링',
        companyBusinessNumber: companyInfo?.businessNumber || '',
        companyAddress: companyInfo?.address || '',
        // Use creator's info for contact person details
        companyPhone: creatorInfo?.phone || companyInfo?.phone || '',
        companyEmail: creatorInfo?.email || companyInfo?.email || '',
        companyContactPerson: creatorInfo?.name || orderData.createdBy || orderData.user?.name || '시스템',
        // Order info
        orderNumber: orderData.orderNumber || 'PO-TEMP-001',
        projectName: orderData.projectName || orderData.project?.projectName || '현장 미지정',
        vendorName: orderData.vendorName || orderData.vendor?.name || '거래처 미지정',
        vendorBusinessNumber: orderData.vendor?.businessNumber || orderData.vendorBusinessNumber || '',
        vendorPhone: orderData.vendor?.phone || orderData.vendorPhone || '',
        vendorEmail: orderData.vendor?.email || orderData.vendorEmail || '',
        vendorAddress: orderData.vendor?.address || orderData.vendorAddress || '',
        vendorContactPerson: orderData.vendor?.contactPerson || orderData.vendorContactPerson || '',
        totalAmount: Number(orderData.totalAmount) || 0,
        items: Array.isArray(orderData.items) ? orderData.items : [],
        notes: cleanedNotes,
        orderDate: orderData.orderDate || new Date().toISOString(),
        deliveryDate: orderData.deliveryDate || null,
        deliveryPlace: extractedDeliveryPlace,
        createdBy: orderData.createdBy || orderData.user?.name || '시스템',
        createdAt: orderData.createdAt || new Date().toISOString(),
        status: orderData.status || 'draft',
        approvedBy: orderData.approvedBy || '',
        approvedAt: orderData.approvedAt || null,
        paymentTerms: orderData.paymentTerms || '',
        deliveryMethod: orderData.deliveryMethod || '',
        majorCategory: extractedMajorCategory,
        middleCategory: extractedMiddleCategory,
        minorCategory: extractedMinorCategory
      };

      // Create enhanced HTML content with better error handling
      const orderHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>발주서 - ${safeOrderData.orderNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 10mm;
    }
    body {
      font-family: 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif;
      margin: 0;
      padding: 0;
      line-height: 1.4;
      color: #333;
      font-size: 11px;
    }
    .header {
      text-align: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #3B82F6;
    }
    .header h1 {
      color: #1F2937;
      margin: 0;
      font-size: 24px;
      font-weight: bold;
    }
    .header .subtitle {
      margin: 5px 0 0 0;
      color: #6B7280;
      font-size: 12px;
    }
    .company-vendor-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .company-box, .vendor-box {
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      padding: 10px;
      background-color: #F9FAFB;
    }
    .box-title {
      font-weight: bold;
      color: #1F2937;
      font-size: 12px;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #E5E7EB;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 15px;
    }
    .info-grid.two-col {
      grid-template-columns: 1fr 1fr;
    }
    .info-item {
      padding: 6px 8px;
      border: 1px solid #E5E7EB;
      border-radius: 4px;
      background-color: #FFFFFF;
    }
    .info-label {
      font-weight: bold;
      color: #6B7280;
      margin-bottom: 2px;
      font-size: 9px;
    }
    .info-value {
      color: #1F2937;
      font-size: 11px;
      word-break: break-all;
    }
    .compact-info {
      display: flex;
      align-items: baseline;
      gap: 5px;
    }
    .compact-label {
      font-weight: bold;
      color: #6B7280;
      font-size: 9px;
    }
    .compact-value {
      color: #1F2937;
      font-size: 10px;
    }
    .section-title {
      color: #374151;
      border-bottom: 1px solid #D1D5DB;
      padding-bottom: 5px;
      margin: 15px 0 10px 0;
      font-size: 13px;
      font-weight: bold;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 10px;
    }
    .items-table th,
    .items-table td {
      border: 1px solid #D1D5DB;
      padding: 4px 6px;
      text-align: left;
    }
    .items-table th {
      background-color: #F3F4F6;
      font-weight: bold;
      color: #374151;
      text-align: center;
      font-size: 9px;
    }
    .items-table tbody tr:nth-child(even) {
      background-color: #F9FAFB;
    }
    .items-table .number-cell {
      text-align: center;
    }
    .items-table .amount-cell {
      text-align: right;
    }
    .total-row {
      background-color: #EEF2FF !important;
      font-weight: bold;
    }
    .notes-section {
      margin-top: 15px;
      padding: 10px;
      background-color: #F3F4F6;
      border-radius: 4px;
    }
    .notes-title {
      margin-top: 0;
      color: #374151;
      font-size: 11px;
      font-weight: bold;
    }
    .notes-content {
      margin: 5px 0 0 0;
      color: #6B7280;
      line-height: 1.4;
      font-size: 10px;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #9CA3AF;
      font-size: 10px;
      border-top: 1px solid #E5E7EB;
      padding-top: 15px;
    }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      color: rgba(59, 130, 246, 0.08);
      z-index: -1;
      pointer-events: none;
      font-weight: bold;
    }
    .empty-state {
      text-align: center;
      color: #6B7280;
      font-style: italic;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="watermark">발주서</div>
  
  <div class="header">
    <h1>구매 발주서</h1>
    <p class="subtitle">Purchase Order</p>
  </div>

  <!-- 발주업체 및 거래처 정보 (좌우 배치) -->
  <div class="company-vendor-section">
    <!-- 발주업체 정보 -->
    <div class="company-box">
      <div class="box-title">발주업체</div>
      <div class="compact-info">
        <span class="compact-label">업체명:</span>
        <span class="compact-value" style="font-weight: bold;">${safeOrderData.companyName}</span>
      </div>
      ${safeOrderData.companyBusinessNumber ? `
      <div class="compact-info">
        <span class="compact-label">사업자번호:</span>
        <span class="compact-value">${safeOrderData.companyBusinessNumber}</span>
      </div>
      ` : ''}
      ${safeOrderData.companyContactPerson ? `
      <div class="compact-info">
        <span class="compact-label">담당자:</span>
        <span class="compact-value">${safeOrderData.companyContactPerson}</span>
      </div>
      ` : ''}
      ${safeOrderData.companyPhone ? `
      <div class="compact-info">
        <span class="compact-label">연락처:</span>
        <span class="compact-value">${safeOrderData.companyPhone}</span>
      </div>
      ` : ''}
      ${safeOrderData.companyEmail ? `
      <div class="compact-info">
        <span class="compact-label">이메일:</span>
        <span class="compact-value">${safeOrderData.companyEmail}</span>
      </div>
      ` : ''}
      ${safeOrderData.companyAddress ? `
      <div class="compact-info">
        <span class="compact-label">주소:</span>
        <span class="compact-value">${safeOrderData.companyAddress}</span>
      </div>
      ` : ''}
    </div>

    <!-- 거래처 정보 -->
    <div class="vendor-box">
      <div class="box-title">거래처</div>
      <div class="compact-info">
        <span class="compact-label">업체명:</span>
        <span class="compact-value" style="font-weight: bold;">${safeOrderData.vendorName}</span>
      </div>
      ${safeOrderData.vendorBusinessNumber ? `
      <div class="compact-info">
        <span class="compact-label">사업자번호:</span>
        <span class="compact-value">${safeOrderData.vendorBusinessNumber}</span>
      </div>
      ` : ''}
      ${safeOrderData.vendorContactPerson ? `
      <div class="compact-info">
        <span class="compact-label">담당자:</span>
        <span class="compact-value">${safeOrderData.vendorContactPerson}</span>
      </div>
      ` : ''}
      ${safeOrderData.vendorPhone ? `
      <div class="compact-info">
        <span class="compact-label">연락처:</span>
        <span class="compact-value">${safeOrderData.vendorPhone}</span>
      </div>
      ` : ''}
      ${safeOrderData.vendorEmail ? `
      <div class="compact-info">
        <span class="compact-label">이메일:</span>
        <span class="compact-value">${safeOrderData.vendorEmail}</span>
      </div>
      ` : ''}
      ${safeOrderData.vendorAddress ? `
      <div class="compact-info">
        <span class="compact-label">주소:</span>
        <span class="compact-value">${safeOrderData.vendorAddress}</span>
      </div>
      ` : ''}
    </div>
  </div>

  <!-- 발주 정보 (컴팩트한 그리드) -->
  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">발주서 번호</div>
      <div class="info-value">${safeOrderData.orderNumber}</div>
    </div>
    <div class="info-item">
      <div class="info-label">발주일</div>
      <div class="info-value">${new Date(safeOrderData.orderDate).toLocaleDateString('ko-KR')}</div>
    </div>
    <div class="info-item">
      <div class="info-label">현장</div>
      <div class="info-value">${safeOrderData.projectName}</div>
    </div>
    <div class="info-item">
      <div class="info-label">납기일</div>
      <div class="info-value">${safeOrderData.deliveryDate ? new Date(safeOrderData.deliveryDate).toLocaleDateString('ko-KR') : '미정'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">납품장소</div>
      <div class="info-value">${safeOrderData.deliveryPlace || '미정'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">작성자</div>
      <div class="info-value">${safeOrderData.createdBy}</div>
    </div>
  </div>

  ${(safeOrderData.majorCategory || safeOrderData.middleCategory || safeOrderData.minorCategory) ? `
  <h3 class="section-title">분류 정보</h3>
  <div class="info-grid">
    ${safeOrderData.majorCategory ? `
    <div class="info-item">
      <div class="info-label">대분류</div>
      <div class="info-value">${safeOrderData.majorCategory}</div>
    </div>
    ` : ''}
    ${safeOrderData.middleCategory ? `
    <div class="info-item">
      <div class="info-label">중분류</div>
      <div class="info-value">${safeOrderData.middleCategory}</div>
    </div>
    ` : ''}
    ${safeOrderData.minorCategory ? `
    <div class="info-item">
      <div class="info-label">소분류</div>
      <div class="info-value">${safeOrderData.minorCategory}</div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <h3 class="section-title">발주 품목</h3>
  
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 50px;">순번</th>
        <th>품목명</th>
        <th>규격</th>
        <th style="width: 80px;">수량</th>
        <th style="width: 60px;">단위</th>
        <th style="width: 120px;">단가</th>
        <th style="width: 120px;">금액</th>
      </tr>
    </thead>
    <tbody>
      ${safeOrderData.items.length > 0 ? 
        safeOrderData.items.map((item: any, index: number) => `
          <tr>
            <td class="number-cell">${index + 1}</td>
            <td>${item.name || item.itemName || item.item_name || '품목명 없음'}</td>
            <td>${item.specification || '-'}</td>
            <td class="amount-cell">${(item.quantity || 0).toLocaleString()}</td>
            <td class="number-cell">${item.unit || 'EA'}</td>
            <td class="amount-cell">₩${(item.unitPrice || item.unit_price || 0).toLocaleString()}</td>
            <td class="amount-cell">₩${(item.totalAmount || item.total_amount || ((item.quantity || 0) * (item.unitPrice || item.unit_price || 0))).toLocaleString()}</td>
          </tr>
        `).join('')
        : 
        '<tr><td colspan="7" class="empty-state">품목 정보가 없습니다.</td></tr>'
      }
      <tr class="total-row">
        <td colspan="6" class="amount-cell" style="font-weight: bold;">총 금액</td>
        <td class="amount-cell" style="font-weight: bold;">₩${safeOrderData.totalAmount.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  ${safeOrderData.notes ? `
  <div class="notes-section">
    <h4 class="notes-title">비고</h4>
    <div class="notes-content">${safeOrderData.notes.replace(/\|/g, '<span style="color: #D1D5DB; margin: 0 8px;">|</span>')}</div>
  </div>
  ` : ''}

  <div class="footer">
    이 문서는 시스템에서 자동 생성되었습니다.<br>
    생성일시: ${new Date().toLocaleString('ko-KR')} | 문서 ID: ${timestamp}
  </div>
</body>
</html>
      `;

      // Write HTML file with error handling
      try {
        fs.writeFileSync(tempHtmlPath, orderHtml, 'utf8');
        console.log(`✅ HTML 파일 생성 완료: ${tempHtmlPath}`);
      } catch (writeError) {
        throw new Error(`HTML 파일 생성 실패: ${writeError.message}`);
      }

      // Check if serverless environment
      const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
      
      if (isServerless) {
        // Use serverless PDF generation for Vercel and other serverless platforms
        console.log('🚀 Serverless 환경 감지 - HTML 기반 PDF 생성');
        
        // Save HTML for client-side PDF generation
        const htmlForPdf = orderHtml.replace(
          '</head>',
          `<script>
            function generatePDF() {
              window.print();
            }
            window.onload = function() {
              if (window.location.search.includes('print=true')) {
                setTimeout(generatePDF, 1000);
              }
            };
          </script>
          </head>`
        );
        
        fs.writeFileSync(tempPdfPath.replace('.pdf', '.html'), htmlForPdf);
        
        // Return HTML path for client-side conversion
        console.log('✅ HTML 파일 생성 완료 (클라이언트 PDF 변환용)');
        
        // Create a placeholder PDF message
        fs.writeFileSync(tempPdfPath, 'PDF generation pending - use browser print');
        
      } else {
        // Use Playwright for local environments
        let browser = null;
        try {
          console.log('🚀 Playwright 브라우저 시작...');
          
          const { chromium } = await import('playwright-chromium');
          
          browser = await chromium.launch({
            headless: true,
            args: [
              '--no-sandbox', 
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu',
              '--disable-background-timer-throttling',
              '--disable-backgrounding-occluded-windows',
              '--disable-renderer-backgrounding'
            ],
            timeout: 60000 // 1 minute timeout
          });

          const page = await browser.newPage();
          
          // Set viewport and media type
          await page.setViewportSize({ width: 1200, height: 1600 });
          await page.emulateMedia({ media: 'print' });
          
          console.log('📄 HTML 콘텐츠 로딩...');
          await page.setContent(orderHtml, { 
            waitUntil: 'networkidle',
            timeout: 30000
          });
          
          console.log('📄 PDF 생성 중...');
          await page.pdf({
            path: tempPdfPath,
            format: 'A4',
            landscape: false,
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
              top: '20mm',
              bottom: '20mm',
              left: '15mm',
              right: '15mm'
            }
          });

          console.log('✅ PDF 생성 완료');

        } catch (playwrightError) {
          console.error('❌ Playwright 오류:', playwrightError);
          throw new Error(`PDF 생성 실패: ${playwrightError.message}`);
        } finally {
          if (browser) {
            await browser.close();
            console.log('🔒 Playwright 브라우저 종료');
          }
        }
      }

      // Verify PDF was created
      if (!fs.existsSync(tempPdfPath)) {
        throw new Error('PDF 파일이 생성되지 않았습니다.');
      }

      // Check file size
      const stats = fs.statSync(tempPdfPath);
      if (stats.size === 0) {
        throw new Error('PDF 파일이 비어있습니다.');
      }

      console.log(`📊 PDF 파일 크기: ${(stats.size / 1024).toFixed(2)} KB`);

      const pdfUrl = `/api/orders/download-pdf/${timestamp}`;

      console.log(`✅ PDF 생성 완료: ${pdfUrl}`);

      // Clean up HTML file
      try {
        if (fs.existsSync(tempHtmlPath)) {
          fs.unlinkSync(tempHtmlPath);
        }
      } catch (cleanupError) {
        console.warn('⚠️ HTML 파일 정리 실패:', cleanupError.message);
      }

      // Schedule PDF cleanup after 1 hour
      setTimeout(() => {
        try {
          if (fs.existsSync(tempPdfPath)) {
            fs.unlinkSync(tempPdfPath);
            console.log(`🗑️ 임시 PDF 파일 정리 완료: ${tempPdfPath}`);
          }
        } catch (cleanupError) {
          console.warn('⚠️ PDF 파일 정리 실패:', cleanupError.message);
        }
      }, 60 * 60 * 1000); // 1 hour

      res.json({
        success: true,
        pdfUrl,
        message: "PDF가 성공적으로 생성되었습니다.",
        fileSize: stats.size
      });

    } catch (conversionError) {
      console.error('❌ PDF 변환 오류:', conversionError);
      
      // Clean up temp files
      try {
        if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
      } catch (cleanupError) {
        console.warn('⚠️ 임시 파일 정리 실패:', cleanupError.message);
      }

      res.status(500).json({
        success: false,
        error: "PDF 생성 중 오류가 발생했습니다.",
        details: conversionError instanceof Error ? conversionError.message : "알 수 없는 오류"
      });
    }

  } catch (error) {
    console.error("❌ PDF 생성 API 오류:", error);
    res.status(500).json({ 
      success: false,
      error: "PDF 생성에 실패했습니다.",
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

// 이메일 발송 (PDF만)

router.post("/orders/send-email", requireAuth, async (req, res) => {
  try {
    const { 
      orderData, 
      pdfUrl, 
      excelUrl, 
      recipients, 
      emailSettings, 
      to, 
      cc, 
      bcc, 
      subject, 
      message, 
      attachPdf = true, 
      attachExcel = false,
      selectedAttachments = [], // NEW: Handle selectedAttachments from frontend
      selectedAttachmentIds = [] // Also accept selectedAttachmentIds from frontend
    } = req.body;
    
    console.log('📧 이메일 발송 요청:', { 
      orderData, 
      pdfUrl, 
      excelUrl, 
      recipients, 
      to, 
      cc, 
      bcc, 
      subject, 
      message, 
      attachPdf, 
      attachExcel,
      selectedAttachments,
      selectedAttachmentIds 
    });
    
    // recipients 또는 to 필드 중 하나를 사용
    const recipientEmails = recipients || to;
    if (!recipientEmails || recipientEmails.length === 0) {
      return res.status(400).json({ error: '수신자가 필요합니다.' });
    }

    // 기본 이메일 발송 옵션
    const emailOptions = {
      to: recipientEmails,
      cc: cc || emailSettings?.cc,
      subject: subject || emailSettings?.subject || `발주서 - ${orderData.orderNumber || ''}`,
      orderNumber: orderData.orderNumber,
      vendorName: orderData.vendorName,
      totalAmount: orderData.totalAmount,
      additionalMessage: message || emailSettings?.message
    };

    // 첨부파일 처리
    let attachments = [];
    let attachmentsList = [];
    
    // PDF 파일 첨부 (attachPdf가 true이고 pdfUrl이 있으면)
    if (attachPdf && pdfUrl) {
      // Check if pdfUrl is an attachment API URL or direct file path
      if (pdfUrl.includes('/api/attachments/') && pdfUrl.includes('/download')) {
        // Extract attachment ID from URL like /api/attachments/123/download
        const attachmentIdMatch = pdfUrl.match(/\/api\/attachments\/(\d+)\/download/);
        if (attachmentIdMatch) {
          const attachmentId = parseInt(attachmentIdMatch[1]);
          console.log('📎 PDF 첨부 시도 (DB에서):', attachmentId);
          
          try {
            // Fetch attachment from database
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
                attachments.push({
                  filename: attachment.originalName || `발주서_${orderData.orderNumber || Date.now()}.pdf`,
                  content: Buffer.from(attachment.fileData, 'base64'),
                  contentType: attachment.mimeType || 'application/pdf'
                });
                attachmentsList.push('발주서.pdf (PDF 파일)');
                console.log('✅ PDF 첨부 성공 (DB Base64)');
              } else if (attachment.filePath && fs.existsSync(attachment.filePath)) {
                // Use file path
                attachments.push({
                  filename: attachment.originalName || `발주서_${orderData.orderNumber || Date.now()}.pdf`,
                  path: attachment.filePath,
                  contentType: attachment.mimeType || 'application/pdf'
                });
                attachmentsList.push('발주서.pdf (PDF 파일)');
                console.log('✅ PDF 첨부 성공 (파일 경로)');
              } else {
                console.log('❌ PDF 첨부 실패: 파일 데이터 없음');
              }
            } else {
              console.log('❌ PDF 첨부 실패: 첨부파일 정보 없음');
            }
          } catch (error) {
            console.error('❌ PDF 첨부 오류:', error);
          }
        }
      } else {
        // Handle direct file path (legacy support)
        const pdfPath = path.join(__dirname, '../../', pdfUrl.replace(/^\//, ''));
        console.log('📎 PDF 첨부 시도 (직접 경로):', pdfPath);
        if (fs.existsSync(pdfPath)) {
          attachments.push({
            filename: `발주서_${orderData.orderNumber || Date.now()}.pdf`,
            path: pdfPath,
            contentType: 'application/pdf'
          });
          attachmentsList.push('발주서.pdf (PDF 파일)');
          console.log('✅ PDF 첨부 성공 (직접 경로)');
        } else {
          console.log('❌ PDF 파일을 찾을 수 없음:', pdfPath);
        }
      }
    }
    
    // Excel 파일 첨부 (attachExcel이 true이고 excelUrl이 있으면)
    if (attachExcel && excelUrl) {
      // Check if excelUrl is an attachment API URL or direct file path
      if (excelUrl.includes('/api/attachments/') && excelUrl.includes('/download')) {
        // Extract attachment ID from URL like /api/attachments/123/download
        const attachmentIdMatch = excelUrl.match(/\/api\/attachments\/(\d+)\/download/);
        if (attachmentIdMatch) {
          const attachmentId = parseInt(attachmentIdMatch[1]);
          console.log('📎 Excel 첨부 시도 (DB에서):', attachmentId);
          
          try {
            // Fetch attachment from database
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
                attachments.push({
                  filename: attachment.originalName || `발주서_${orderData.orderNumber || Date.now()}.xlsx`,
                  content: Buffer.from(attachment.fileData, 'base64'),
                  contentType: attachment.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                attachmentsList.push('발주서.xlsx (Excel 파일)');
                console.log('✅ Excel 첨부 성공 (DB Base64)');
              } else if (attachment.filePath && fs.existsSync(attachment.filePath)) {
                // Use file path
                attachments.push({
                  filename: attachment.originalName || `발주서_${orderData.orderNumber || Date.now()}.xlsx`,
                  path: attachment.filePath,
                  contentType: attachment.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                attachmentsList.push('발주서.xlsx (Excel 파일)');
                console.log('✅ Excel 첨부 성공 (파일 경로)');
              } else {
                console.log('❌ Excel 첨부 실패: 파일 데이터 없음');
              }
            } else {
              console.log('❌ Excel 첨부 실패: 첨부파일 정보 없음');
            }
          } catch (error) {
            console.error('❌ Excel 첨부 오류:', error);
          }
        }
      } else {
        // Handle direct file path (legacy support)
        const excelPath = path.join(__dirname, '../../', excelUrl.replace(/^\//, ''));
        console.log('📎 Excel 첨부 시도 (직접 경로):', excelPath);
        if (fs.existsSync(excelPath)) {
          attachments.push({
            filename: `발주서_${orderData.orderNumber || Date.now()}.xlsx`,
            path: excelPath,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
          attachmentsList.push('발주서.xlsx (Excel 파일)');
          console.log('✅ Excel 첨부 성공 (직접 경로)');
        } else {
          console.log('❌ Excel 파일을 찾을 수 없음:', excelPath);
        }
      }
    }

    // NEW: Process selectedAttachments/selectedAttachmentIds from frontend modal
    // Support both selectedAttachments and selectedAttachmentIds (frontend sends selectedAttachmentIds)
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
              attachments.push({
                filename: attachment.originalName,
                content: Buffer.from(attachment.fileData, 'base64'),
                contentType: attachment.mimeType || 'application/octet-stream'
              });
              attachmentsList.push(attachment.originalName);
              console.log('✅ 선택된 첨부파일 추가 성공 (DB Base64):', attachment.originalName);
            } else if (attachment.filePath && fs.existsSync(attachment.filePath)) {
              // Use file path
              attachments.push({
                filename: attachment.originalName,
                path: attachment.filePath,
                contentType: attachment.mimeType || 'application/octet-stream'
              });
              attachmentsList.push(attachment.originalName);
              console.log('✅ 선택된 첨부파일 추가 성공 (파일 경로):', attachment.originalName);
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
                  <p><strong>발주번호:</strong> ${emailOptions.orderNumber || 'N/A'}</p>
                  <p><strong>거래처:</strong> ${emailOptions.vendorName || 'N/A'}</p>
                  <p><strong>메시지:</strong> ${emailOptions.additionalMessage || '없음'}</p>
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
                <p><strong>발주번호:</strong> ${emailOptions.orderNumber || 'N/A'}</p>
                <p><strong>거래처:</strong> ${emailOptions.vendorName || 'N/A'}</p>
                <p><strong>메시지:</strong> ${emailOptions.additionalMessage || '없음'}</p>
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
    
    // 이메일 옵션 설정
    const mailOptions = {
      from: smtpConfig.auth.user,
      to: Array.isArray(emailOptions.to) ? emailOptions.to.join(', ') : emailOptions.to,
      cc: emailOptions.cc ? (Array.isArray(emailOptions.cc) ? emailOptions.cc.join(', ') : emailOptions.cc) : undefined,
      subject: emailOptions.subject || `발주서 - ${orderData.orderNumber || ''}`,
      html: emailHtml,
      attachments: attachments
    };
    
    // 개발 환경에서는 실제 이메일 발송 대신 로그만 출력
    if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER) {
      console.log('📧 [개발 모드] 이메일 발송 시뮬레이션:', {
        to: mailOptions.to,
        cc: mailOptions.cc,
        subject: mailOptions.subject,
        attachmentsCount: attachments.length
      });
      
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
        
        // 이메일 발송 성공 시 발주서 상태를 'sent'로 업데이트
        if (orderData && orderData.orderNumber) {
          try {
            console.log(`🔄 발주서 상태 업데이트 시도: ${orderData.orderNumber} → sent`);
            await updateOrderStatusAfterEmail(orderData.orderNumber);
            console.log(`✅ 발주서 상태 업데이트 완료: ${orderData.orderNumber} → sent`);
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
        res.status(500).json({ 
          error: '이메일 발송 실패',
          details: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
      }
    }

  } catch (error) {
    console.error('이메일 발송 오류:', error);
    res.status(500).json({ 
      error: '이메일 발송 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 간편 이메일 발송 (bulk order editor용)
router.post("/orders/send-email-simple", requireAuth, async (req, res) => {
  try {
    const { to, cc, subject, body, orderData, attachPdf, attachExcel } = req.body;
    
    console.log('📧 간편 이메일 발송 요청:', { to, cc, subject, attachments: { attachPdf, attachExcel } });
    
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

    // 임시 엑셀 파일 생성 (첨부파일이 없는 경우)
    if (!excelPath) {
      const tempDir = path.join(__dirname, '../../uploads/temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      excelPath = path.join(tempDir, `temp_${Date.now()}.txt`);
      fs.writeFileSync(excelPath, `발주서 상세 내용\n\n${body}`);
    }

    // 이메일 발송 (POEmailService 사용)
    const result = await emailService.sendPOWithOriginalFormat(excelPath, {
      to: toEmails,
      cc: ccEmails,
      subject: subject || `발주서 - ${emailData.orderNumber}`,
      body: body || `발주서를 첨부합니다.\n\n발주번호: ${emailData.orderNumber}\n프로젝트: ${emailData.projectName}\n거래처: ${emailData.vendorName}`,
      orderData: emailData,
      userId: (req as any).user?.id,
      orderId: orderData?.orderId
    });

    // 임시 파일 삭제
    if (excelPath.includes('temp_')) {
      try {
        fs.unlinkSync(excelPath);
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
      body: 'SMTP 설정 테스트 이메일입니다.',
      orderData: testOrderData,
      userId: 'system-test',
      orderId: 9999
    });

    // 임시 파일 삭제
    try {
      fs.unlinkSync(testExcelPath);
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


export default router;
