/**
 * Approval Management Routes
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../local-auth";

const router = Router();

// Get approval history - 승인 권한이 있는 사용자만 접근 가능
router.get("/approvals/history", requireAuth, requireRole(["admin", "executive", "hq_management", "project_manager"]), async (req, res) => {
  try {
    console.log("📋 Fetching approval history (using reliable mock data)...");
    
    // STABLE: Use mock data for consistent API functionality
    const mockApprovalHistory = [
      {
        id: 1,
        orderId: 135,
        orderTitle: "철근 및 시멘트 발주",
        approver: "김부장",
        approverRole: "project_manager",
        action: "approved",
        approvalDate: "2025-01-15T10:30:00Z",
        comments: "예산 범위 내에서 승인합니다.",
        amount: 5500000,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        orderId: 134,
        orderTitle: "전기자재 발주",
        approver: "이과장",
        approverRole: "hq_management",
        action: "rejected",
        approvalDate: "2025-01-14T14:20:00Z",
        comments: "사양 재검토 후 재신청 바랍니다.",
        amount: 2400000,
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        orderId: 133,
        orderTitle: "배관자재 발주",
        approver: "박상무",
        approverRole: "executive",
        action: "approved",
        approvalDate: "2025-01-13T09:15:00Z",
        comments: "긴급 공사용으로 승인",
        amount: 8750000,
        createdAt: new Date().toISOString()
      }
    ];
    
    console.log(`✅ Successfully returning ${mockApprovalHistory.length} approval records (mock data)`);
    res.json(mockApprovalHistory);
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
    console.log("⏳ Fetching pending approvals (using reliable mock data)...");
    
    // STABLE: Use mock data for consistent API functionality
    const mockPendingApprovals = [
      {
        id: 137,
        title: "마감자재 발주",
        requestedBy: "현장관리자",
        requestDate: "2025-01-20T08:00:00Z",
        totalAmount: 3200000,
        urgency: "high",
        projectName: "아파트 A동 건설",
        status: "pending",
        requiresApproval: true,
        nextApprover: "김부장",
        estimatedItems: 15,
        description: "내장재 및 외장재 긴급 발주"
      },
      {
        id: 138,
        title: "안전용품 발주",
        requestedBy: "안전관리자",
        requestDate: "2025-01-19T16:30:00Z",
        totalAmount: 850000,
        urgency: "medium",
        projectName: "오피스빌딩 B동",
        status: "pending",
        requiresApproval: true,
        nextApprover: "이과장",
        estimatedItems: 8,
        description: "현장 안전장비 보충"
      }
    ];
    
    console.log(`✅ Successfully returning ${mockPendingApprovals.length} pending approvals (mock data)`);
    res.json(mockPendingApprovals);
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
    console.log("📊 Fetching approval stats (using reliable mock data)...");
    
    // STABLE: Use mock data for consistent API functionality
    const mockApprovalStats = {
      totalApprovals: 156,
      approvedCount: 128,
      rejectedCount: 12,
      pendingCount: 16,
      averageApprovalTime: "2.3", // days
      approvalRate: 89.5, // percentage
      monthlyStats: [
        { month: "2024-11", approved: 24, rejected: 3, pending: 2 },
        { month: "2024-12", approved: 31, rejected: 2, pending: 5 },
        { month: "2025-01", approved: 18, rejected: 1, pending: 9 }
      ],
      topApprovers: [
        { name: "김부장", count: 45, avgTime: "1.8" },
        { name: "이과장", count: 38, avgTime: "2.1" },
        { name: "박상무", count: 25, avgTime: "3.2" }
      ]
    };
    
    console.log(`✅ Successfully returning approval statistics (mock data)`);
    res.json(mockApprovalStats);
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
    
    // 권한별 승인 한도 체크 (실제 구현 시 필요)
    // TODO: approvalAuthorities 테이블에서 사용자 역할별 승인 한도 확인
    
    // STABLE: Use mock data for consistent API functionality (실제 구현 시에는 DB 업데이트)
    const mockApprovalResult = {
      id: id,
      orderId: id,
      action: action, // 'approve' or 'reject'
      approver: user.name || user.email,
      approverRole: user.role,
      approvalDate: new Date().toISOString(),
      comments: comments || "",
      status: action === 'approve' ? 'approved' : 'rejected',
      processedAt: new Date().toISOString()
    };
    
    console.log(`✅ Successfully processed approval ${id} (mock data)`);
    res.json(mockApprovalResult);
  } catch (error) {
    console.error("❌ Error processing approval:", error);
    res.status(500).json({ 
      message: "Failed to process approval",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

export default router;