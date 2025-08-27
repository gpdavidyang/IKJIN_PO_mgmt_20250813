/**
 * Approval Management Routes
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../local-auth";
import { db } from "../db";
import { 
  purchaseOrders, 
  approvalStepInstances, 
  orderHistory,
  users,
  projects,
  vendors,
  approvalAuthorities,
  ApprovalStepInstance
} from "../../shared/schema";
import { eq, and, desc, asc, sql, or, inArray } from "drizzle-orm";
import { NotificationService } from "../services/notification-service";
import { ApprovalRoutingService } from "../services/approval-routing-service";

const router = Router();

// Helper function to check approval permission based on role and amount
async function checkApprovalPermission(userRole: string, orderAmount: number): Promise<boolean> {
  try {
    // Get approval authority for the user's role
    const authority = await db
      .select()
      .from(approvalAuthorities)
      .where(
        and(
          eq(approvalAuthorities.role, userRole as any),
          eq(approvalAuthorities.isActive, true)
        )
      )
      .limit(1);
    
    if (authority.length === 0) {
      // No specific authority found, default to admin-only approval
      return userRole === 'admin';
    }
    
    const maxAmount = parseFloat(authority[0].maxAmount);
    return orderAmount <= maxAmount;
    
  } catch (error) {
    console.error('승인 권한 확인 오류:', error);
    // Error case: only allow admin access
    return userRole === 'admin';
  }
}

// Get approval history - 승인 권한이 있는 사용자만 접근 가능
router.get("/approvals/history", requireAuth, requireRole(["admin", "executive", "hq_management", "project_manager"]), async (req, res) => {
  try {
    console.log("📋 Fetching approval history from database...");
    
    // Query approval history with related order and user information
    const approvalHistory = await db
      .select({
        id: orderHistory.id,
        orderId: orderHistory.orderId,
        orderTitle: purchaseOrders.orderNumber,
        approver: users.name,
        approverRole: users.role,
        action: orderHistory.action,
        approvalDate: orderHistory.performedAt,
        comments: orderHistory.notes,
        amount: purchaseOrders.totalAmount,
        createdAt: orderHistory.performedAt
      })
      .from(orderHistory)
      .leftJoin(purchaseOrders, eq(orderHistory.orderId, purchaseOrders.id))
      .leftJoin(users, eq(orderHistory.performedBy, users.id))
      .where(
        inArray(orderHistory.action, ['approved', 'rejected'])
      )
      .orderBy(desc(orderHistory.performedAt))
      .limit(50);
    
    // Process and format the history data
    const allHistory = approvalHistory
      .map(record => ({
        ...record,
        orderTitle: record.orderTitle || `발주서 #${record.orderId}`,
        approver: record.approver || "알 수 없음",
        amount: parseFloat(record.amount || '0'),
        createdAt: record.createdAt?.toISOString() || new Date().toISOString(),
        approvalDate: record.approvalDate?.toISOString() || new Date().toISOString(),
        comments: record.comments || ""
      }))
      .sort((a, b) => new Date(b.approvalDate).getTime() - new Date(a.approvalDate).getTime())
      .slice(0, 50);
    
    console.log(`✅ Successfully returning ${allHistory.length} approval records from database`);
    res.json(allHistory);
  } catch (error) {
    console.error("❌ Error in approvals/history endpoint:", error);
    res.status(500).json({ 
      message: "Failed to fetch approval history",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Get pending approvals - 승인 권한이 있는 사용자만 접근 가능
router.get("/approvals/pending", requireAuth, requireRole(["admin", "executive", "hq_management", "project_manager"]), async (req, res) => {
  try {
    console.log("⏳ Fetching pending approvals from database...");
    
    // 실제 DB에서 승인 대기 중인 발주서 조회
    const pendingOrders = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        totalAmount: purchaseOrders.totalAmount,
        orderDate: purchaseOrders.orderDate,
        status: purchaseOrders.status,
        notes: purchaseOrders.notes,
        createdAt: purchaseOrders.createdAt,
        // Project information
        projectId: projects.id,
        projectName: projects.projectName,
        // User information
        userId: users.id,
        userName: users.name,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        // Vendor information
        vendorId: vendors.id,
        vendorName: vendors.name,
      })
      .from(purchaseOrders)
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .leftJoin(users, eq(purchaseOrders.userId, users.id))
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(eq(purchaseOrders.status, 'pending'))
      .orderBy(desc(purchaseOrders.createdAt));

    // 결과를 클라이언트가 예상하는 형식으로 변환
    const formattedOrders = pendingOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      title: order.orderNumber || `발주서 #${order.id}`,
      requestedBy: order.userName || `${order.userLastName || ''} ${order.userFirstName || ''}`.trim() || "알 수 없음",
      requestDate: order.orderDate,
      totalAmount: parseFloat(order.totalAmount || '0'),
      urgency: parseFloat(order.totalAmount || '0') > 5000000 ? "high" : 
               parseFloat(order.totalAmount || '0') > 1000000 ? "medium" : "low",
      projectName: order.projectName || "프로젝트 미지정",
      status: order.status,
      requiresApproval: true,
      nextApprover: "담당자", // TODO: 실제 승인자 로직 구현 필요
      estimatedItems: 0, // TODO: 발주 아이템 수 계산 필요
      description: order.notes || "",
      vendorName: order.vendorName
    }));
    
    console.log(`✅ Successfully returning ${formattedOrders.length} pending approvals from DB`);
    res.json(formattedOrders);
  } catch (error) {
    console.error("❌ Error in approvals/pending endpoint:", error);
    res.status(500).json({ 
      message: "Failed to fetch pending approvals",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Get approval statistics - 승인 권한이 있는 사용자만 접근 가능
router.get("/approvals/stats", requireAuth, requireRole(["admin", "executive", "hq_management", "project_manager"]), async (req, res) => {
  try {
    console.log("📊 Fetching approval stats from database...");
    
    // 실제 DB에서 승인 통계 조회
    const [totalStats, pendingStats, approvedStats, rejectedStats] = await Promise.all([
      // 전체 발주서 수
      db.select({ count: sql<number>`count(*)` }).from(purchaseOrders),
      
      // 승인 대기 수
      db.select({ count: sql<number>`count(*)` })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.status, 'pending')),
        
      // 승인 완료 수
      db.select({ count: sql<number>`count(*)` })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.status, 'approved')),
        
      // 반려 수
      db.select({ count: sql<number>`count(*)` })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.status, 'rejected'))
    ]);
    
    const totalCount = totalStats[0]?.count || 0;
    const pendingCount = pendingStats[0]?.count || 0;
    const approvedCount = approvedStats[0]?.count || 0;
    const rejectedCount = rejectedStats[0]?.count || 0;
    
    // 승인률 계산
    const approvalRate = totalCount > 0 ? 
      ((approvedCount / (approvedCount + rejectedCount)) * 100) : 0;
    
    // 월별 통계 (최근 3개월)
    const monthlyStatsQuery = await db
      .select({
        month: sql<string>`to_char(created_at, 'YYYY-MM')`,
        status: purchaseOrders.status,
        count: sql<number>`count(*)`
      })
      .from(purchaseOrders)
      .where(sql`created_at >= NOW() - INTERVAL '3 months'`)
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`, purchaseOrders.status)
      .orderBy(sql`to_char(created_at, 'YYYY-MM') DESC`);
    
    // 월별 통계 포맷팅
    const monthlyStats: any[] = [];
    const monthlyData: { [key: string]: any } = {};
    
    monthlyStatsQuery.forEach(row => {
      if (!monthlyData[row.month]) {
        monthlyData[row.month] = { month: row.month, approved: 0, rejected: 0, pending: 0 };
      }
      monthlyData[row.month][row.status] = row.count;
    });
    
    Object.values(monthlyData).forEach(data => monthlyStats.push(data));
    
    const stats = {
      totalApprovals: totalCount,
      approvedCount,
      rejectedCount,
      pendingCount,
      averageApprovalTime: "2.1", // TODO: 실제 계산 로직 구현 필요
      approvalRate: Math.round(approvalRate * 10) / 10,
      monthlyStats,
      topApprovers: [
        // TODO: 실제 승인자 통계 구현 필요
        { name: "관리자", count: approvedCount, avgTime: "2.1" }
      ]
    };
    
    console.log(`✅ Successfully returning approval statistics from DB:`, {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount
    });
    res.json(stats);
  } catch (error) {
    console.error("❌ Error in approvals/stats endpoint:", error);
    res.status(500).json({ 
      message: "Failed to fetch approval statistics",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Process approval (approve/reject) - 승인 권한이 있는 사용자만 접근 가능
router.post("/approvals/:id/process", requireAuth, requireRole(["admin", "executive", "hq_management", "project_manager"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { action, comments } = req.body;
    const user = req.user!; // requireAuth 미들웨어에서 보장됨
    
    console.log(`📋 Processing approval ${id} with action: ${action} by ${user.name} (${user.role})`);
    
    // 1. 발주서 존재 확인
    const existingOrder = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .limit(1);
      
    if (existingOrder.length === 0) {
      return res.status(404).json({ message: "발주서를 찾을 수 없습니다" });
    }
    
    const order = existingOrder[0];
    
    // 2. 승인 권한 확인
    const hasPermission = await checkApprovalPermission(user.role, parseFloat(order.totalAmount || '0'));
    if (!hasPermission) {
      return res.status(403).json({ 
        message: "해당 금액에 대한 승인 권한이 없습니다"
      });
    }
    
    // 3. 발주서 상태 업데이트
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await db
      .update(purchaseOrders)
      .set({
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, id));
    
    // 4. 승인 이력 추가
    const historyEntry = {
      orderId: id,
      action: action === 'approve' ? 'approved' : 'rejected',
      performedBy: user.id,
      performedAt: new Date(),
      notes: comments || "",
      previousStatus: order.status,
      newStatus: newStatus
    };
    
    await db.insert(orderHistory).values(historyEntry);
    
    // 5. 승인/거부 알림 발송
    await NotificationService.sendApprovalResultNotification({
      orderId: id,
      action: action === 'approve' ? 'approval_completed' : 'approval_rejected',
      performedBy: user.id,
      comments: comments
    });
    
    const approvalResult = {
      id: id,
      orderId: id,
      action: action,
      approver: user.name || user.email,
      approverRole: user.role,
      approvalDate: new Date().toISOString(),
      comments: comments || "",
      status: newStatus,
      processedAt: new Date().toISOString()
    };
    
    console.log(`✅ Successfully processed ${action} for order ${id} in database`);
    res.json(approvalResult);
  } catch (error) {
    console.error("❌ Error processing approval:", error);
    res.status(500).json({ 
      message: "Failed to process approval",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Individual Approve API - 클라이언트 호환성을 위한 별도 엔드포인트
router.post("/approvals/:orderId/approve", requireAuth, requireRole(["admin", "executive", "hq_management", "project_manager"]), async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const { note } = req.body;
    const user = req.user!;
    
    console.log(`✅ Processing approval for order ${orderId} by ${user.name} (${user.role})`);
    
    // Call the main process endpoint with approve action
    req.params.id = req.params.orderId;
    req.body = { action: 'approve', comments: note };
    
    // Forward to the main process endpoint
    const result = await new Promise((resolve, reject) => {
      const originalSend = res.json;
      const originalStatus = res.status;
      
      res.json = function(data) {
        resolve(data);
        return this;
      };
      
      res.status = function(statusCode) {
        if (statusCode >= 400) {
          reject(new Error('Approval processing failed'));
        }
        return this;
      };
      
      // Process the approval
      processApproval(req, res, orderId, 'approve', note, user);
    });
    
    res.json(result);
  } catch (error) {
    console.error("❌ Error in approve endpoint:", error);
    res.status(500).json({ 
      message: "Failed to approve order",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Individual Reject API - 클라이언트 호환성을 위한 별도 엔드포인트
router.post("/approvals/:orderId/reject", requireAuth, requireRole(["admin", "executive", "hq_management", "project_manager"]), async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const { note } = req.body;
    const user = req.user!;
    
    console.log(`❌ Processing rejection for order ${orderId} by ${user.name} (${user.role})`);
    
    // Process the rejection
    const result = await processApproval(req, res, orderId, 'reject', note, user);
    res.json(result);
  } catch (error) {
    console.error("❌ Error in reject endpoint:", error);
    res.status(500).json({ 
      message: "Failed to reject order",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Helper function for processing approvals
async function processApproval(req: any, res: any, orderId: number, action: 'approve' | 'reject', note: string, user: any) {
  try {
    // 1. 발주서 존재 확인
    const existingOrder = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId))
      .limit(1);
      
    if (existingOrder.length === 0) {
      throw new Error("발주서를 찾을 수 없습니다");
    }
    
    const order = existingOrder[0];
    
    // 2. 승인 권한 확인
    const hasPermission = await checkApprovalPermission(user.role, parseFloat(order.totalAmount || '0'));
    if (!hasPermission) {
      throw new Error("해당 금액에 대한 승인 권한이 없습니다");
    }
    
    // 3. 발주서 상태 업데이트
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await db
      .update(purchaseOrders)
      .set({
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, orderId));
    
    // 4. 승인 이력 추가
    const historyEntry = {
      orderId: orderId,
      action: action === 'approve' ? 'approved' : 'rejected',
      performedBy: user.id,
      performedAt: new Date(),
      notes: note || "",
      previousStatus: order.status,
      newStatus: newStatus
    };
    
    await db.insert(orderHistory).values(historyEntry);
    
    // 승인/거부 알림 발송
    await NotificationService.sendApprovalResultNotification({
      orderId: orderId,
      action: action === 'approve' ? 'approval_completed' : 'approval_rejected',
      performedBy: user.id,
      comments: note
    });
    
    const approvalResult = {
      id: orderId,
      orderId: orderId,
      action: action,
      approver: user.name || user.email,
      approverRole: user.role,
      approvalDate: new Date().toISOString(),
      comments: note || "",
      status: newStatus,
      processedAt: new Date().toISOString()
    };
    
    console.log(`✅ Successfully processed ${action} for order ${orderId} in database`);
    return approvalResult;
    
  } catch (error) {
    console.error(`❌ Error processing ${action} for order ${orderId}:`, error);
    throw error;
  }
}

// Start multi-stage approval process
router.post("/approvals/:orderId/start-workflow", requireAuth, requireRole(["admin", "executive", "hq_management", "project_manager"]), async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const { companyId } = req.body;
    const user = req.user!;
    
    console.log(`🔄 Starting approval workflow for order ${orderId}`);
    
    // 1. 발주서 정보 조회
    const orderInfo = await db
      .select({
        id: purchaseOrders.id,
        totalAmount: purchaseOrders.totalAmount,
        status: purchaseOrders.status,
        userId: purchaseOrders.userId
      })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId))
      .limit(1);
      
    if (orderInfo.length === 0) {
      return res.status(404).json({ message: "발주서를 찾을 수 없습니다" });
    }
    
    const order = orderInfo[0];
    const orderAmount = parseFloat(order.totalAmount || '0');
    
    // 2. 승인 라우팅 결정
    const approvalContext = {
      orderId,
      orderAmount,
      companyId: companyId || 1, // Default company
      currentUserId: user.id,
      currentUserRole: user.role,
      priority: orderAmount > 10000000 ? 'high' as const : 
                orderAmount > 5000000 ? 'medium' as const : 'low' as const
    };
    
    const routeDecision = await ApprovalRoutingService.determineApprovalRoute(approvalContext);
    
    // 3. 승인 모드에 따른 처리
    if (routeDecision.approvalMode === 'direct') {
      // 직접 승인 모드 - 바로 승인 권한 확인
      if (routeDecision.canDirectApprove) {
        return res.json({
          success: true,
          mode: 'direct',
          canApprove: true,
          message: '직접 승인이 가능합니다',
          reasoning: routeDecision.reasoning
        });
      } else {
        return res.status(403).json({
          success: false,
          mode: 'direct',
          canApprove: false,
          message: '승인 권한이 없습니다',
          reasoning: routeDecision.reasoning
        });
      }
    } else {
      // 단계별 승인 모드 - 승인 인스턴스 생성
      const approvalInstances = await ApprovalRoutingService.createApprovalInstances(orderId, approvalContext);
      
      // 발주서 상태를 승인 대기로 변경
      await db
        .update(purchaseOrders)
        .set({
          status: 'pending',
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, orderId));
      
      // 승인 요청 알림 발송
      await NotificationService.sendApprovalRequestNotification({
        orderId,
        action: 'approval_requested',
        performedBy: user.id
      });
      
      return res.json({
        success: true,
        mode: 'staged',
        approvalSteps: routeDecision.stagedApprovalSteps?.length || 0,
        templateName: routeDecision.templateName,
        message: `${approvalInstances.length}단계 승인 프로세스가 시작되었습니다`,
        reasoning: routeDecision.reasoning,
        instances: approvalInstances
      });
    }
    
  } catch (error) {
    console.error("❌ Error starting approval workflow:", error);
    res.status(500).json({ 
      message: "Failed to start approval workflow",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Get approval workflow progress
router.get("/approvals/:orderId/progress", requireAuth, requireRole(["admin", "executive", "hq_management", "project_manager"]), async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    
    console.log(`📊 Getting approval progress for order ${orderId}`);
    
    const progress = await ApprovalRoutingService.getApprovalProgress(orderId);
    const nextStep = await ApprovalRoutingService.getNextApprovalStep(orderId);
    const isComplete = await ApprovalRoutingService.isApprovalComplete(orderId);
    
    res.json({
      success: true,
      data: {
        ...progress,
        nextStep,
        isComplete
      }
    });
    
  } catch (error) {
    console.error("❌ Error getting approval progress:", error);
    res.status(500).json({ 
      message: "Failed to get approval progress",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Process approval step (for staged approval)
router.post("/approvals/:orderId/step/:stepId", requireAuth, requireRole(["admin", "executive", "hq_management", "project_manager"]), async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const stepId = parseInt(req.params.stepId, 10);
    const { action, comments } = req.body; // 'approve', 'reject', 'skip'
    const user = req.user!;
    
    console.log(`🔄 Processing approval step ${stepId} for order ${orderId} with action: ${action}`);
    
    // 1. 승인 단계 인스턴스 조회
    const stepInstance = await db
      .select()
      .from(approvalStepInstances)
      .where(eq(approvalStepInstances.id, stepId))
      .limit(1);
      
    if (stepInstance.length === 0) {
      return res.status(404).json({ message: "승인 단계를 찾을 수 없습니다" });
    }
    
    const step = stepInstance[0];
    
    // 2. 권한 확인 (해당 역할이 맞는지)
    if (step.requiredRole !== user.role && user.role !== 'admin') {
      return res.status(403).json({ 
        message: `이 단계는 ${step.requiredRole} 역할만 처리할 수 있습니다` 
      });
    }
    
    // 3. 승인 단계 상태 업데이트
    const newStatus = action === 'approve' ? 'approved' : 
                     action === 'reject' ? 'rejected' : 'skipped';
    
    await db
      .update(approvalStepInstances)
      .set({
        status: newStatus,
        approvedBy: user.id,
        approvedAt: new Date(),
        comments: comments || "",
        updatedAt: new Date()
      })
      .where(eq(approvalStepInstances.id, stepId));
    
    // 4. 전체 승인 프로세스 상태 확인
    const isComplete = await ApprovalRoutingService.isApprovalComplete(orderId);
    const progress = await ApprovalRoutingService.getApprovalProgress(orderId);
    
    let finalOrderStatus = 'pending';
    
    if (action === 'reject') {
      // 거부 시 전체 프로세스 중단
      finalOrderStatus = 'rejected';
      
      // 남은 단계들을 모두 취소
      await db
        .update(approvalStepInstances)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(approvalStepInstances.orderId, orderId),
            eq(approvalStepInstances.status, 'pending')
          )
        );
        
    } else if (isComplete) {
      // 모든 단계 완료 시 승인 완료
      finalOrderStatus = 'approved';
    }
    
    // 5. 발주서 상태 업데이트
    if (finalOrderStatus !== 'pending') {
      await db
        .update(purchaseOrders)
        .set({
          status: finalOrderStatus,
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, orderId));
        
      // 이력 추가
      await db.insert(orderHistory).values({
        orderId,
        action: finalOrderStatus === 'approved' ? 'approved' : 'rejected',
        performedBy: user.id,
        performedAt: new Date(),
        notes: comments || "",
        previousStatus: 'pending',
        newStatus: finalOrderStatus
      });
      
      // 최종 결과 알림 발송
      await NotificationService.sendApprovalResultNotification({
        orderId,
        action: finalOrderStatus === 'approved' ? 'approval_completed' : 'approval_rejected',
        performedBy: user.id,
        comments
      });
    }
    
    res.json({
      success: true,
      stepProcessed: {
        stepId,
        action,
        status: newStatus
      },
      progress,
      isComplete,
      finalStatus: finalOrderStatus
    });
    
  } catch (error) {
    console.error("❌ Error processing approval step:", error);
    res.status(500).json({ 
      message: "Failed to process approval step",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

export default router;