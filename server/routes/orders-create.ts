import { Router } from 'express';
import { db } from '../db';
import { purchaseOrders, orderHistory, attachments } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../local-auth';
import { PDFGenerationService } from '../services/pdf-generation-service';
import { z } from 'zod';

const router = Router();

/**
 * POST /api/orders/:id/create-order
 * 임시저장(draft) 상태의 발주서를 정식 발주서로 생성
 * - PDF 생성 및 첨부
 * - 상태 변경: draft → created
 */
router.post('/orders/:id/create-order', requireAuth, async (req, res) => {
  const orderId = parseInt(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  try {
    // 1. 발주서 조회 및 상태 검증
    const [order] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId));

    if (!order) {
      return res.status(404).json({ 
        error: '발주서를 찾을 수 없습니다.',
        orderId 
      });
    }

    // draft 상태 검증
    if (order.orderStatus !== 'draft' && order.status !== 'draft') {
      return res.status(400).json({ 
        error: '임시저장 상태의 발주서만 생성할 수 있습니다.',
        currentStatus: order.orderStatus || order.status
      });
    }

    // 2. 발주서 상세 정보 조회 (PDF 생성용)
    const fullOrderData = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, orderId),
      with: {
        vendor: true,
        project: true,
        items: true,
        user: true
      }
    });

    if (!fullOrderData) {
      return res.status(404).json({ error: '발주서 정보를 불러올 수 없습니다.' });
    }

    // 3. PDF 생성
    console.log(`📄 Creating order PDF for order ${order.orderNumber}...`);
    
    const pdfData = {
      orderNumber: order.orderNumber,
      orderDate: new Date(order.orderDate),
      deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : null,
      projectName: fullOrderData.project?.projectName,
      vendorName: fullOrderData.vendor?.name,
      vendorContact: fullOrderData.vendor?.contactPerson,
      vendorEmail: fullOrderData.vendor?.email,
      items: fullOrderData.items.map(item => ({
        category: item.majorCategory || '',
        subCategory1: item.middleCategory || '',
        subCategory2: item.minorCategory || '',
        name: item.itemName,
        specification: item.specification || '',
        quantity: Number(item.quantity),
        unit: item.unit || '개',
        unitPrice: Number(item.unitPrice),
        price: Number(item.totalAmount),
        deliveryLocation: fullOrderData.project?.location || ''
      })),
      totalAmount: Number(order.totalAmount),
      notes: order.notes || '',
      site: fullOrderData.project?.projectName
    };

    const pdfResult = await PDFGenerationService.generatePurchaseOrderPDF(
      orderId,
      pdfData,
      userId
    );

    if (!pdfResult.success) {
      console.error('❌ PDF generation failed:', pdfResult.error);
      return res.status(500).json({ 
        error: 'PDF 생성에 실패했습니다.',
        details: pdfResult.error 
      });
    }

    console.log(`✅ PDF generated successfully: ${pdfResult.pdfPath}`);

    // 4. 발주서 상태 업데이트
    const [updatedOrder] = await db
      .update(purchaseOrders)
      .set({
        orderStatus: 'created',
        status: 'approved', // 레거시 호환성
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, orderId))
      .returning();

    // 5. 히스토리 기록
    await db.insert(orderHistory).values({
      orderId,
      userId,
      action: 'order_created',
      changes: {
        from: 'draft',
        to: 'created',
        pdfGenerated: true,
        pdfPath: pdfResult.pdfPath,
        attachmentId: pdfResult.attachmentId
      },
      createdAt: new Date()
    });

    console.log(`✅ Order ${order.orderNumber} successfully created with PDF`);

    // 6. 응답
    res.json({
      success: true,
      orderId,
      orderNumber: order.orderNumber,
      status: 'created',
      orderStatus: 'created',
      pdfUrl: `/api/attachments/${pdfResult.attachmentId}/download`,
      attachmentId: pdfResult.attachmentId,
      message: '발주서가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ 
      error: '발주서 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/orders/:id/permissions
 * 발주서에 대한 사용자 권한 조회
 */
router.get('/orders/:id/permissions', requireAuth, async (req, res) => {
  const orderId = parseInt(req.params.id);
  const userId = req.user?.id;
  const userRole = req.user?.role;

  try {
    const [order] = await db
      .select({
        id: purchaseOrders.id,
        status: purchaseOrders.status,
        orderStatus: purchaseOrders.orderStatus,
        approvalStatus: purchaseOrders.approvalStatus,
        userId: purchaseOrders.userId
      })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId));

    if (!order) {
      return res.status(404).json({ error: '발주서를 찾을 수 없습니다.' });
    }

    const isOwner = order.userId === userId;
    const isAdmin = userRole === 'admin';
    const orderStatus = order.orderStatus || order.status;

    const permissions = {
      canEdit: (isOwner || isAdmin) && ['draft', 'created'].includes(orderStatus),
      canDelete: (isOwner || isAdmin) && orderStatus === 'draft',
      canCreateOrder: (isOwner || isAdmin) && orderStatus === 'draft',
      canGeneratePDF: ['created', 'sent', 'delivered'].includes(orderStatus),
      canSendEmail: (isOwner || isAdmin) && orderStatus === 'created',
      canApprove: isAdmin && order.approvalStatus === 'pending',
      canViewHistory: isOwner || isAdmin,
      canDownloadAttachments: true
    };

    res.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: '권한 조회 중 오류가 발생했습니다.' });
  }
});

export default router;