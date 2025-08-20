/**
 * Purchase Order Management Routes
 * Handles order CRUD, approval workflow, file uploads
 */

import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin, requireOrderManager } from "../local-auth";
import { insertPurchaseOrderSchema } from "@shared/schema";
import { upload } from "../utils/multer-config";
import { decodeKoreanFilename } from "../utils/korean-filename";
import { OrderService } from "../services/order-service";
import { OptimizedOrderQueries, OptimizedDashboardQueries } from "../utils/optimized-queries";
import { ExcelToPDFConverter } from "../utils/excel-to-pdf-converter";
import { POEmailService } from "../utils/po-email-service";
import ApprovalRoutingService from "../services/approval-routing-service";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Email service instance
const emailService = new POEmailService();

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
      status: status as string,
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

    // Prepare order data
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
      status: "draft" as const,
      currentApproverRole: null,
      approvalLevel: 0,
      items
    };

    console.log("🔧🔧🔧 ORDERS.TS - Prepared order data:", orderData);

    // Create order
    const order = await storage.createPurchaseOrder(orderData);
    console.log("🔧🔧🔧 ORDERS.TS - Created order:", order);

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      for (const file of req.files as Express.Multer.File[]) {
        const decodedFilename = decodeKoreanFilename(file.originalname);
        console.log("🔧🔧🔧 ORDERS.TS - Processing file:", {
          original: file.originalname,
          decoded: decodedFilename,
          stored: file.filename
        });

        await storage.createAttachment({
          orderId: order.id,
          originalName: decodedFilename,
          storedName: file.filename,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: userId
        });
      }
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

      res.status(201).json(orderWithApproval);
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
        }
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

// Bulk delete orders (Admin only) - Must come BEFORE /orders/:id to avoid route collision
router.delete("/orders/bulk", requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('🗑️ Bulk delete request received:', { body: req.body, orderIds: req.body.orderIds });
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      console.log('❌ Invalid orderIds:', { orderIds, isArray: Array.isArray(orderIds), length: orderIds?.length });
      return res.status(400).json({ message: "Order IDs array is required" });
    }

    // Validate that all IDs are numbers
    console.log('📊 Parsing order IDs:', orderIds);
    const numericOrderIds = orderIds.map(id => {
      console.log('🔍 Processing ID:', id, 'type:', typeof id);
      const numericId = parseInt(id, 10);
      console.log('🔍 Parsed ID:', numericId, 'isNaN:', isNaN(numericId));
      if (isNaN(numericId)) {
        console.log('❌ Invalid order ID detected:', id);
        throw new Error(`Invalid order ID: ${id}`);
      }
      return numericId;
    });

    // Check if all orders exist and get their current status
    console.log('🔍 Looking up orders for IDs:', numericOrderIds);
    const orders = await Promise.all(
      numericOrderIds.map(async (orderId) => {
        console.log('🔍 Looking up order ID:', orderId);
        const order = await storage.getPurchaseOrder(orderId);
        if (!order) {
          console.log('❌ Order not found:', orderId);
          throw new Error(`Order with ID ${orderId} not found`);
        }
        console.log('✅ Found order:', { id: order.id, orderNumber: order.orderNumber, status: order.status });
        return order;
      })
    );
    console.log('📋 All orders found:', orders.map(o => ({ id: o.id, orderNumber: o.orderNumber, status: o.status })));

    // Check if any orders cannot be deleted (only draft orders can be deleted)
    const nonDraftOrders = orders.filter(order => order.status !== 'draft');
    if (nonDraftOrders.length > 0) {
      const nonDraftOrderNumbers = nonDraftOrders.map(order => order.orderNumber).join(', ');
      return res.status(403).json({ 
        message: `Cannot delete non-draft orders: ${nonDraftOrderNumbers}. Only draft orders can be deleted.`,
        nonDeletableOrders: nonDraftOrders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status
        }))
      });
    }

    // Delete all orders
    console.log('🗑️ Starting deletion of orders:', numericOrderIds);
    const deletePromises = numericOrderIds.map(orderId => {
      console.log('🗑️ Deleting order ID:', orderId);
      return storage.deletePurchaseOrder(orderId);
    });
    
    await Promise.all(deletePromises);
    console.log('✅ All orders deleted successfully');

    res.json({ 
      message: `Successfully deleted ${numericOrderIds.length} order(s)`,
      deletedOrderIds: numericOrderIds,
      deletedCount: numericOrderIds.length
    });
  } catch (error) {
    console.error("Error bulk deleting orders:", error);
    
    if (error instanceof Error) {
      // Handle specific error cases
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Invalid order ID")) {
        return res.status(400).json({ message: error.message });
      }
    }
    
    res.status(500).json({ message: "Failed to bulk delete orders" });
  }
});

// Delete single order - Must come AFTER /orders/bulk to avoid route collision
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

// Test PDF generation endpoint (no auth for testing)
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
          unitPrice: 50000
        },
        {
          name: "테스트 품목 2", 
          quantity: 5,
          unit: "SET",
          unitPrice: 100000
        }
      ],
      notes: "테스트용 발주서입니다.",
      orderDate: new Date().toISOString(),
      createdBy: "테스트 사용자"
    };

    console.log('🧪 PDF 테스트 시작:', testOrderData.orderNumber);
    
    // Forward to the main PDF generation logic
    req.body = { orderData: testOrderData, options: {} };
    
    // Call the main PDF generation function
    return await generatePDFLogic(req, res);
  } catch (error) {
    console.error('🧪 PDF 테스트 오류:', error);
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
    const tempDir = path.join(process.cwd(), 'uploads/temp-pdf');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`📁 임시 디렉토리 생성: ${tempDir}`);
    }

    const tempHtmlPath = path.join(tempDir, `order-${timestamp}.html`);
    const tempPdfPath = path.join(tempDir, `order-${timestamp}.pdf`);

    console.log(`📄 임시 파일 경로 - HTML: ${tempHtmlPath}, PDF: ${tempPdfPath}`);

    try {
      // Sanitize and prepare data
      const safeOrderData = {
        orderNumber: orderData.orderNumber || 'PO-TEMP-001',
        projectName: orderData.projectName || '프로젝트 미지정',
        vendorName: orderData.vendorName || '거래처 미지정',
        totalAmount: Number(orderData.totalAmount) || 0,
        items: Array.isArray(orderData.items) ? orderData.items : [],
        notes: orderData.notes || '',
        orderDate: orderData.orderDate || new Date().toISOString(),
        deliveryDate: orderData.deliveryDate || null,
        createdBy: orderData.createdBy || '시스템'
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
      margin: 20mm 15mm;
    }
    body {
      font-family: 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif;
      margin: 0;
      padding: 0;
      line-height: 1.6;
      color: #333;
      font-size: 12px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #3B82F6;
    }
    .header h1 {
      color: #1F2937;
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .header .subtitle {
      margin: 8px 0 0 0;
      color: #6B7280;
      font-size: 14px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 30px;
    }
    .info-item {
      padding: 12px;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      background-color: #F9FAFB;
    }
    .info-label {
      font-weight: bold;
      color: #374151;
      margin-bottom: 5px;
      font-size: 11px;
    }
    .info-value {
      color: #1F2937;
      font-size: 13px;
      word-break: break-all;
    }
    .section-title {
      color: #374151;
      border-bottom: 1px solid #D1D5DB;
      padding-bottom: 8px;
      margin: 25px 0 15px 0;
      font-size: 16px;
      font-weight: bold;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 11px;
    }
    .items-table th,
    .items-table td {
      border: 1px solid #D1D5DB;
      padding: 8px;
      text-align: left;
    }
    .items-table th {
      background-color: #F3F4F6;
      font-weight: bold;
      color: #374151;
      text-align: center;
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
      margin-top: 30px;
      padding: 15px;
      background-color: #F3F4F6;
      border-radius: 6px;
    }
    .notes-title {
      margin-top: 0;
      color: #374151;
      font-size: 14px;
      font-weight: bold;
    }
    .notes-content {
      margin: 8px 0 0 0;
      color: #6B7280;
      line-height: 1.5;
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

  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">발주서 번호</div>
      <div class="info-value">${safeOrderData.orderNumber}</div>
    </div>
    <div class="info-item">
      <div class="info-label">발주일자</div>
      <div class="info-value">${new Date(safeOrderData.orderDate).toLocaleDateString('ko-KR')}</div>
    </div>
    <div class="info-item">
      <div class="info-label">프로젝트</div>
      <div class="info-value">${safeOrderData.projectName}</div>
    </div>
    <div class="info-item">
      <div class="info-label">거래처</div>
      <div class="info-value">${safeOrderData.vendorName}</div>
    </div>
    ${safeOrderData.deliveryDate ? `
    <div class="info-item">
      <div class="info-label">납기일자</div>
      <div class="info-value">${new Date(safeOrderData.deliveryDate).toLocaleDateString('ko-KR')}</div>
    </div>
    ` : ''}
    <div class="info-item">
      <div class="info-label">작성자</div>
      <div class="info-value">${safeOrderData.createdBy}</div>
    </div>
  </div>

  <h3 class="section-title">발주 품목</h3>
  
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 50px;">순번</th>
        <th>품목명</th>
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
            <td>${item.name || item.itemName || '품목명 없음'}</td>
            <td class="amount-cell">${(item.quantity || 0).toLocaleString()}</td>
            <td class="number-cell">${item.unit || 'EA'}</td>
            <td class="amount-cell">₩${(item.unitPrice || 0).toLocaleString()}</td>
            <td class="amount-cell">₩${((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}</td>
          </tr>
        `).join('')
        : 
        '<tr><td colspan="6" class="empty-state">품목 정보가 없습니다.</td></tr>'
      }
      <tr class="total-row">
        <td colspan="5" class="amount-cell" style="font-weight: bold;">총 금액</td>
        <td class="amount-cell" style="font-weight: bold;">₩${safeOrderData.totalAmount.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  ${safeOrderData.notes ? `
  <div class="notes-section">
    <h4 class="notes-title">비고</h4>
    <div class="notes-content">${safeOrderData.notes}</div>
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

      // Enhanced Puppeteer configuration
      let browser = null;
      try {
        console.log('🚀 Puppeteer 브라우저 시작...');
        
        const puppeteer = await import('puppeteer');
        
        browser = await puppeteer.default.launch({
          headless: 'new',
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
        await page.setViewport({ width: 1200, height: 1600 });
        await page.emulateMediaType('print');
        
        console.log('📄 HTML 콘텐츠 로딩...');
        await page.setContent(orderHtml, { 
          waitUntil: ['networkidle0', 'domcontentloaded'],
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

      } catch (puppeteerError) {
        console.error('❌ Puppeteer 오류:', puppeteerError);
        throw new Error(`PDF 생성 실패: ${puppeteerError.message}`);
      } finally {
        if (browser) {
          await browser.close();
          console.log('🔒 Puppeteer 브라우저 종료');
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

// Remove test endpoint in production
if (process.env.NODE_ENV === 'development') {
  console.log('🧪 Development mode: PDF test endpoint available at /api/orders/test-pdf');
} else {
  // Remove test-pdf route in production by overriding with 404
  router.all("/orders/test-pdf", (req, res) => {
    res.status(404).json({ error: "Test endpoint not available in production" });
  });
}

// Download or preview generated PDF
router.get("/orders/download-pdf/:timestamp", (req, res) => {
  try {
    const { timestamp } = req.params;
    const { download } = req.query; // ?download=true 면 다운로드, 없으면 미리보기
    const pdfPath = path.join(process.cwd(), 'uploads/temp-pdf', `order-${timestamp}.pdf`);
    
    console.log(`📄 PDF 다운로드 요청: ${pdfPath}`);
    console.log(`📄 파일 존재 여부: ${fs.existsSync(pdfPath)}`);
    console.log(`📄 다운로드 모드: ${download}`);

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

// 이메일 발송 (PDF만)

router.post("/orders/send-email", requireAuth, async (req, res) => {
  try {
    const { orderData, pdfUrl, recipients, emailSettings } = req.body;
    
    console.log('📧 이메일 발송 요청:', { orderData, pdfUrl, recipients, emailSettings });
    
    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: '수신자가 필요합니다.' });
    }

    // 기본 이메일 발송 (PDF 첨부)
    const emailOptions = {
      to: recipients,
      cc: emailSettings?.cc,
      subject: emailSettings?.subject || `발주서 - ${orderData.orderNumber || ''}`,
      orderNumber: orderData.orderNumber,
      vendorName: orderData.vendorName,
      totalAmount: orderData.totalAmount,
      additionalMessage: emailSettings?.message
    };

    // PDF 파일이 있으면 첨부
    let attachments = [];
    if (pdfUrl) {
      const pdfPath = path.join(__dirname, '../../', pdfUrl.replace(/^\//, ''));
      if (fs.existsSync(pdfPath)) {
        attachments.push({
          filename: `발주서_${orderData.orderNumber || Date.now()}.pdf`,
          path: pdfPath,
          contentType: 'application/pdf'
        });
      }
    }

    // EmailService의 generateEmailContent를 위한 별도 메서드 생성
    const generateEmailContent = (options: any): string => {
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
              
              <div class="attachments">
                <h3>📎 첨부파일</h3>
                <ul>
                  <li>발주서.pdf (PDF 파일)</li>
                </ul>
              </div>
              
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
    };

    console.log('📧 sendEmail 호출 전 옵션:', {
      to: emailOptions.to,
      cc: emailOptions.cc,
      subject: emailOptions.subject,
      attachmentsCount: attachments.length
    });

    const result = await emailService.sendEmail({
      to: emailOptions.to,
      cc: emailOptions.cc,
      subject: emailOptions.subject,
      html: generateEmailContent(emailOptions),
      attachments
    });

    console.log('📧 sendEmail 결과:', result);

    if (result.success) {
      console.log('📧 이메일 발송 성공');
      res.json({ success: true, messageId: result.messageId });
    } else {
      console.error('📧 이메일 발송 실패:', result.error);
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('이메일 발송 오류:', error);
    res.status(500).json({ 
      error: '이메일 발송 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
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

    const result = await emailService.sendPurchaseOrderEmail({
      orderData: testOrderData,
      excelFilePath: testExcelPath,
      recipients: [recipientEmail],
      cc: [],
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

export default router;