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

// Generate PDF for order
router.post("/orders/generate-pdf", requireAuth, async (req, res) => {
  try {
    const { orderData, options = {} } = req.body;

    if (!orderData) {
      return res.status(400).json({ 
        success: false,
        error: "발주서 데이터가 필요합니다." 
      });
    }

    console.log(`📄 PDF 생성 요청: 발주서 ${orderData.orderNumber || 'N/A'}`);

    // Create temporary directory for PDF generation
    const timestamp = Date.now();
    const tempDir = 'uploads/temp-pdf';
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempHtmlPath = path.join(tempDir, `order-${timestamp}.html`);
    const tempPdfPath = path.join(tempDir, `order-${timestamp}.pdf`);

    try {
      // Create HTML content for PDF generation
      const orderHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>발주서 - ${orderData.orderNumber || '미생성'}</title>
  <style>
    body {
      font-family: 'Malgun Gothic', sans-serif;
      margin: 20px;
      line-height: 1.6;
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
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .info-item {
      padding: 10px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      background-color: #F9FAFB;
    }
    .info-label {
      font-weight: bold;
      color: #374151;
      margin-bottom: 5px;
    }
    .info-value {
      color: #1F2937;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .items-table th, .items-table td {
      border: 1px solid #D1D5DB;
      padding: 12px;
      text-align: left;
    }
    .items-table th {
      background-color: #F3F4F6;
      font-weight: bold;
      color: #374151;
    }
    .items-table tbody tr:nth-child(even) {
      background-color: #F9FAFB;
    }
    .total-row {
      background-color: #EEF2FF !important;
      font-weight: bold;
    }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 60px;
      color: rgba(59, 130, 246, 0.1);
      z-index: -1;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="watermark">발주서</div>
  
  <div class="header">
    <h1>구매 발주서</h1>
    <p style="margin: 5px 0; color: #6B7280;">Purchase Order</p>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">발주서 번호</div>
      <div class="info-value">${orderData.orderNumber || '미생성'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">발주일자</div>
      <div class="info-value">${new Date().toLocaleDateString('ko-KR')}</div>
    </div>
    <div class="info-item">
      <div class="info-label">프로젝트</div>
      <div class="info-value">${orderData.projectName || '미지정'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">거래처</div>
      <div class="info-value">${orderData.vendorName || '미지정'}</div>
    </div>
  </div>

  <h3 style="color: #374151; border-bottom: 1px solid #D1D5DB; padding-bottom: 10px;">발주 품목</h3>
  
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
      ${orderData.items?.map((item: any, index: number) => `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>${item.name || '품목명 없음'}</td>
          <td style="text-align: right;">${item.quantity || 0}</td>
          <td style="text-align: center;">${item.unit || 'EA'}</td>
          <td style="text-align: right;">₩${(item.unitPrice || 0).toLocaleString()}</td>
          <td style="text-align: right;">₩${((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}</td>
        </tr>
      `).join('') || '<tr><td colspan="6" style="text-align: center; color: #6B7280;">품목 정보 없음</td></tr>'}
      <tr class="total-row">
        <td colspan="5" style="text-align: right; font-weight: bold;">총 금액</td>
        <td style="text-align: right; font-weight: bold;">₩${(orderData.totalAmount || 0).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 40px; padding: 20px; background-color: #F3F4F6; border-radius: 8px;">
    <h4 style="margin-top: 0; color: #374151;">비고</h4>
    <p style="margin: 0; color: #6B7280;">
      ${orderData.notes || '특이사항 없음'}
    </p>
  </div>

  <div style="margin-top: 30px; text-align: center; color: #9CA3AF; font-size: 12px;">
    이 문서는 시스템에서 자동 생성되었습니다. (생성일: ${new Date().toLocaleString('ko-KR')})
  </div>
</body>
</html>
      `;

      // Write HTML file
      fs.writeFileSync(tempHtmlPath, orderHtml, 'utf8');

      // Use ExcelToPDFConverter to convert HTML to PDF
      // Note: This is a workaround since ExcelToPDFConverter expects Excel files
      // We could extend it or create a separate HTML to PDF converter
      
      // For now, create a simple PDF using the existing converter's Puppeteer setup
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.default.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      await page.setContent(orderHtml, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      await page.pdf({
        path: tempPdfPath,
        format: 'A4',
        landscape: false,
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        }
      });

      await browser.close();

      // Verify PDF was created
      if (!fs.existsSync(tempPdfPath)) {
        throw new Error('PDF 파일이 생성되지 않았습니다.');
      }

      const pdfUrl = `/api/orders/download-pdf/${timestamp}`;

      console.log(`✅ PDF 생성 완료: ${pdfUrl}`);

      // Clean up HTML file
      if (fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }

      res.json({
        success: true,
        pdfUrl,
        message: "PDF가 성공적으로 생성되었습니다."
      });

    } catch (conversionError) {
      console.error('PDF 변환 오류:', conversionError);
      
      // Clean up temp files
      try {
        if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
      } catch (cleanupError) {
        console.error('임시 파일 정리 실패:', cleanupError);
      }

      res.status(500).json({
        success: false,
        error: "PDF 생성 중 오류가 발생했습니다.",
        details: conversionError instanceof Error ? conversionError.message : "알 수 없는 오류"
      });
    }

  } catch (error) {
    console.error("PDF 생성 API 오류:", error);
    res.status(500).json({ 
      success: false,
      error: "PDF 생성 에러가 발생 함",
      details: error instanceof Error ? error.message : "알 수 없는 오류"
    });
  }
});

// Download generated PDF
router.get("/orders/download-pdf/:timestamp", (req, res) => {
  try {
    const { timestamp } = req.params;
    const pdfPath = path.join('uploads/temp-pdf', `order-${timestamp}.pdf`);

    if (fs.existsSync(pdfPath)) {
      res.download(pdfPath, `발주서_${timestamp}.pdf`);
    } else {
      // Return a placeholder response for now
      res.status(404).json({
        success: false,
        error: "PDF 파일을 찾을 수 없습니다."
      });
    }
  } catch (error) {
    console.error("PDF 다운로드 오류:", error);
    res.status(500).json({
      success: false,
      error: "PDF 다운로드 중 오류가 발생했습니다."
    });
  }
});

export default router;