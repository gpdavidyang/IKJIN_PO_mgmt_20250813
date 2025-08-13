/**
 * Order Status Management Routes
 */

import { Router } from "express";

const router = Router();

// Get all available order statuses
router.get("/order-statuses", async (req, res) => {
  try {
    console.log("📊 Fetching order statuses (using reliable mock data)...");
    
    // STABLE: Use mock data for consistent API functionality
    const mockOrderStatuses = [
      { id: "draft", name: "초안", description: "작성 중인 상태", color: "#9CA3AF", order: 1 },
      { id: "pending", name: "승인대기", description: "승인 대기 중", color: "#F59E0B", order: 2 },
      { id: "approved", name: "승인완료", description: "승인이 완료된 상태", color: "#10B981", order: 3 },
      { id: "rejected", name: "반려", description: "승인이 거부된 상태", color: "#EF4444", order: 4 },
      { id: "sent", name: "발송완료", description: "거래처에 발송 완료", color: "#3B82F6", order: 5 },
      { id: "confirmed", name: "수주확인", description: "거래처에서 확인 완료", color: "#8B5CF6", order: 6 },
      { id: "in_progress", name: "진행중", description: "작업이 진행 중", color: "#F97316", order: 7 },
      { id: "completed", name: "완료", description: "모든 작업이 완료된 상태", color: "#059669", order: 8 },
      { id: "cancelled", name: "취소", description: "취소된 발주", color: "#6B7280", order: 9 }
    ];
    
    console.log(`✅ Successfully returning ${mockOrderStatuses.length} order statuses (mock data)`);
    res.json(mockOrderStatuses);
  } catch (error) {
    console.error("❌ Error in order-statuses endpoint:", error);
    res.status(500).json({ 
      message: "Failed to fetch order statuses",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

export default router;