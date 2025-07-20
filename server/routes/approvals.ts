import { Router } from "express";
import { requireAuth } from "../local-auth";
import { ApprovalService } from "../services/approval-service";
import { DebugLogger } from "../utils/debug-logger";

const router = Router();

/**
 * 승인 통계 조회 API
 * GET /api/approvals/stats
 */
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const stats = await ApprovalService.getApprovalStats(req.user?.id || "");
    res.json(stats);
  } catch (error) {
    DebugLogger.logError("getApprovalStats", error);
    res.status(500).json({ message: "승인 통계 조회에 실패했습니다." });
  }
});

/**
 * 승인 대기 목록 조회 API
 * GET /api/approvals/pending
 */
router.get("/pending", requireAuth, async (req, res) => {
  try {
    const pendingApprovals = await ApprovalService.getPendingApprovals(req.user?.id || "");
    res.json(pendingApprovals);
  } catch (error) {
    DebugLogger.logError("getPendingApprovals", error);
    res.status(500).json({ message: "승인 대기 목록 조회에 실패했습니다." });
  }
});

/**
 * 승인 내역 조회 API
 * GET /api/approvals/history
 */
router.get("/history", requireAuth, async (req, res) => {
  try {
    const approvalHistory = await ApprovalService.getApprovalHistory(req.user?.id || "");
    res.json(approvalHistory);
  } catch (error) {
    DebugLogger.logError("getApprovalHistory", error);
    res.status(500).json({ message: "승인 내역 조회에 실패했습니다." });
  }
});

/**
 * 발주서 승인 API
 * POST /api/approvals/:id/approve
 */
router.post("/:id/approve", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { note } = req.body;
    const userId = req.user?.id || "";
    
    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({ message: "유효하지 않은 발주서 ID입니다." });
    }

    const result = await ApprovalService.approveOrder(orderId, userId, note);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({ message: "발주서가 성공적으로 승인되었습니다.", order: result.order });
  } catch (error) {
    DebugLogger.logError("approveOrder", error);
    res.status(500).json({ message: "발주서 승인에 실패했습니다." });
  }
});

/**
 * 발주서 반려 API
 * POST /api/approvals/:id/reject
 */
router.post("/:id/reject", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { note } = req.body;
    const userId = req.user?.id || "";
    
    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({ message: "유효하지 않은 발주서 ID입니다." });
    }

    const result = await ApprovalService.rejectOrder(orderId, userId, note);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({ message: "발주서가 성공적으로 반려되었습니다.", order: result.order });
  } catch (error) {
    DebugLogger.logError("rejectOrder", error);
    res.status(500).json({ message: "발주서 반려에 실패했습니다." });
  }
});

/**
 * 발주서 승인 요청 제출 API
 * POST /api/approvals/:id/submit
 */
router.post("/:id/submit", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user?.id || "";
    
    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({ message: "유효하지 않은 발주서 ID입니다." });
    }

    const result = await ApprovalService.submitForApproval(orderId, userId);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({ message: "발주서가 승인 요청되었습니다.", order: result.order });
  } catch (error) {
    DebugLogger.logError("submitForApproval", error);
    res.status(500).json({ message: "승인 요청 제출에 실패했습니다." });
  }
});

/**
 * 사용자의 승인 권한 확인 API
 * GET /api/approvals/permissions
 */
router.get("/permissions", requireAuth, async (req, res) => {
  try {
    const permissions = await ApprovalService.getUserApprovalPermissions(req.user?.id || "");
    res.json(permissions);
  } catch (error) {
    DebugLogger.logError("getUserApprovalPermissions", error);
    res.status(500).json({ message: "승인 권한 조회에 실패했습니다." });
  }
});

export default router;