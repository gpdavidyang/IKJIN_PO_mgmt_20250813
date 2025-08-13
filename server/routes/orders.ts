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
import fs from "fs";
import path from "path";
import { z } from "zod";

const router = Router();

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
      orderDate: new Date(),
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

    res.status(201).json(order);
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

// Delete order
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

// Order approval workflow
router.post("/orders/:id/approve", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const result = await OrderService.approveOrder(orderId, userId);
    res.json(result);
  } catch (error) {
    console.error("Error approving order:", error);
    res.status(500).json({ message: "Failed to approve order" });
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

export default router;