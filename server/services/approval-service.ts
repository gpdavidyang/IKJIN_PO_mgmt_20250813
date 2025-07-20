import { storage } from "../storage";
import { DebugLogger } from "../utils/debug-logger";
import { PurchaseOrder, User } from "@shared/schema";

export interface ApprovalStats {
  pendingCount: number;
  urgentCount: number;
  averageWaitDays: number;
  pendingAmount: number;
}

export interface ApprovalPermissions {
  canApprove: boolean;
  maxAmount: number;
  requiredRole: string;
  currentRole: string;
}

export interface ApprovalResult {
  success: boolean;
  message: string;
  order?: PurchaseOrder;
}

export class ApprovalService {
  
  /**
   * 역할 계층 구조 정의
   */
  private static readonly ROLE_HIERARCHY = {
    "admin": 5,
    "executive": 4,
    "hq_management": 3,
    "project_manager": 2,
    "field_worker": 1
  };

  /**
   * 금액별 승인 권한 정의
   */
  private static readonly APPROVAL_LIMITS = {
    "field_worker": 0,          // 승인 권한 없음
    "project_manager": 5000000, // 500만원
    "hq_management": 30000000,  // 3,000만원
    "executive": 100000000,     // 1억원
    "admin": Infinity           // 무제한
  };

  /**
   * 승인 통계 조회
   */
  static async getApprovalStats(userId: string): Promise<ApprovalStats> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error("사용자를 찾을 수 없습니다.");
      }

      // 승인 대기 중인 발주서 조회 (사용자 권한에 따라)
      const pendingOrders = await this.getPendingOrdersForUser(user);
      
      // 긴급 발주서 (3일 이상 대기) 계산
      const urgentOrders = pendingOrders.filter(order => {
        const daysSinceCreated = this.getDaysSinceCreated(order.createdAt);
        return daysSinceCreated >= 3;
      });

      // 평균 대기일 계산
      const averageWaitDays = pendingOrders.length > 0 
        ? Math.round(pendingOrders.reduce((sum, order) => 
            sum + this.getDaysSinceCreated(order.createdAt), 0) / pendingOrders.length)
        : 0;

      // 승인 대기 금액 합계
      const pendingAmount = pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0);

      return {
        pendingCount: pendingOrders.length,
        urgentCount: urgentOrders.length,
        averageWaitDays,
        pendingAmount
      };
    } catch (error) {
      DebugLogger.logError("getApprovalStats", error);
      throw error;
    }
  }

  /**
   * 승인 대기 목록 조회
   */
  static async getPendingApprovals(userId: string): Promise<PurchaseOrder[]> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error("사용자를 찾을 수 없습니다.");
      }

      return await this.getPendingOrdersForUser(user);
    } catch (error) {
      DebugLogger.logError("getPendingApprovals", error);
      throw error;
    }
  }

  /**
   * 승인 내역 조회
   */
  static async getApprovalHistory(userId: string): Promise<PurchaseOrder[]> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error("사용자를 찾을 수 없습니다.");
      }

      // 승인 완료된 발주서 조회 (사용자가 승인한 것들)
      const approvedOrders = await storage.getApprovedOrdersByUser(userId);
      
      return approvedOrders.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
    } catch (error) {
      DebugLogger.logError("getApprovalHistory", error);
      throw error;
    }
  }

  /**
   * 발주서 승인
   */
  static async approveOrder(orderId: number, userId: string, note?: string): Promise<ApprovalResult> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, message: "사용자를 찾을 수 없습니다." };
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return { success: false, message: "발주서를 찾을 수 없습니다." };
      }

      // 승인 권한 확인
      const hasPermission = await this.checkApprovalPermission(user, order);
      if (!hasPermission.canApprove) {
        return { success: false, message: hasPermission.message };
      }

      // 승인 처리
      const updatedOrder = await storage.updateOrder(orderId, {
        status: "approved",
        isApproved: true,
        approvedBy: userId,
        approvedAt: new Date(),
        currentApproverRole: user.role,
        updatedAt: new Date()
      });

      // 승인 이력 저장
      await this.createApprovalLog(orderId, userId, "approved", note || "승인 처리되었습니다.");

      DebugLogger.log("orderApproved", `Order ${orderId} approved by ${userId}`);
      
      return { success: true, message: "발주서가 성공적으로 승인되었습니다.", order: updatedOrder };
    } catch (error) {
      DebugLogger.logError("approveOrder", error);
      return { success: false, message: "승인 처리 중 오류가 발생했습니다." };
    }
  }

  /**
   * 발주서 반려
   */
  static async rejectOrder(orderId: number, userId: string, note?: string): Promise<ApprovalResult> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, message: "사용자를 찾을 수 없습니다." };
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return { success: false, message: "발주서를 찾을 수 없습니다." };
      }

      // 승인 권한 확인 (반려도 승인 권한이 있어야 가능)
      const hasPermission = await this.checkApprovalPermission(user, order);
      if (!hasPermission.canApprove) {
        return { success: false, message: hasPermission.message };
      }

      // 반려 처리
      const updatedOrder = await storage.updateOrder(orderId, {
        status: "draft", // 반려 시 다시 작성 상태로
        isApproved: false,
        approvedBy: null,
        approvedAt: null,
        currentApproverRole: null,
        updatedAt: new Date()
      });

      // 반려 이력 저장
      await this.createApprovalLog(orderId, userId, "rejected", note || "반려 처리되었습니다.");

      DebugLogger.log("orderRejected", `Order ${orderId} rejected by ${userId}`);
      
      return { success: true, message: "발주서가 성공적으로 반려되었습니다.", order: updatedOrder };
    } catch (error) {
      DebugLogger.logError("rejectOrder", error);
      return { success: false, message: "반려 처리 중 오류가 발생했습니다." };
    }
  }

  /**
   * 승인 요청 제출
   */
  static async submitForApproval(orderId: number, userId: string): Promise<ApprovalResult> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, message: "사용자를 찾을 수 없습니다." };
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return { success: false, message: "발주서를 찾을 수 없습니다." };
      }

      if (order.status !== "draft") {
        return { success: false, message: "작성 중인 발주서만 승인 요청할 수 있습니다." };
      }

      // 다음 승인자 결정
      const nextApproverRole = this.getNextApproverRole(order.totalAmount);
      
      // 승인 요청 처리
      const updatedOrder = await storage.updateOrder(orderId, {
        status: "pending",
        currentApproverRole: nextApproverRole,
        updatedAt: new Date()
      });

      // 승인 요청 이력 저장
      await this.createApprovalLog(orderId, userId, "submitted", "승인 요청이 제출되었습니다.");

      DebugLogger.log("approvalSubmitted", `Order ${orderId} submitted for approval by ${userId}`);
      
      return { success: true, message: "발주서가 승인 요청되었습니다.", order: updatedOrder };
    } catch (error) {
      DebugLogger.logError("submitForApproval", error);
      return { success: false, message: "승인 요청 제출 중 오류가 발생했습니다." };
    }
  }

  /**
   * 사용자 승인 권한 조회
   */
  static async getUserApprovalPermissions(userId: string): Promise<ApprovalPermissions> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error("사용자를 찾을 수 없습니다.");
      }

      const maxAmount = this.APPROVAL_LIMITS[user.role as keyof typeof this.APPROVAL_LIMITS] || 0;
      const canApprove = maxAmount > 0;

      return {
        canApprove,
        maxAmount,
        requiredRole: user.role,
        currentRole: user.role
      };
    } catch (error) {
      DebugLogger.logError("getUserApprovalPermissions", error);
      throw error;
    }
  }

  /**
   * 승인 권한 확인
   */
  private static async checkApprovalPermission(user: User, order: PurchaseOrder): Promise<{canApprove: boolean, message: string}> {
    // 관리자는 모든 승인 권한
    if (user.role === "admin") {
      return { canApprove: true, message: "승인 권한이 있습니다." };
    }

    // 사용자의 승인 한도 확인
    const userLimit = this.APPROVAL_LIMITS[user.role as keyof typeof this.APPROVAL_LIMITS];
    if (!userLimit || userLimit === 0) {
      return { canApprove: false, message: "승인 권한이 없습니다." };
    }

    // 금액 한도 확인
    if (order.totalAmount > userLimit) {
      return { canApprove: false, message: `승인 한도(${userLimit.toLocaleString()}원)를 초과했습니다.` };
    }

    // 현재 승인 단계 확인
    const requiredRole = this.getNextApproverRole(order.totalAmount);
    const userRoleLevel = this.ROLE_HIERARCHY[user.role as keyof typeof this.ROLE_HIERARCHY];
    const requiredRoleLevel = this.ROLE_HIERARCHY[requiredRole as keyof typeof this.ROLE_HIERARCHY];

    if (userRoleLevel < requiredRoleLevel) {
      return { canApprove: false, message: `${requiredRole} 이상의 권한이 필요합니다.` };
    }

    return { canApprove: true, message: "승인 권한이 있습니다." };
  }

  /**
   * 사용자에게 해당하는 승인 대기 발주서 조회
   */
  private static async getPendingOrdersForUser(user: User): Promise<PurchaseOrder[]> {
    try {
      // 관리자는 모든 승인 대기 발주서 조회
      if (user.role === "admin") {
        return await storage.getPendingOrders();
      }

      // 사용자 권한에 따라 승인 가능한 발주서만 조회
      const allPendingOrders = await storage.getPendingOrders();
      
      return allPendingOrders.filter(order => {
        const permission = this.checkApprovalPermissionSync(user, order);
        return permission.canApprove;
      });
    } catch (error) {
      DebugLogger.logError("getPendingOrdersForUser", error);
      return [];
    }
  }

  /**
   * 동기 버전의 승인 권한 확인 (필터링용)
   */
  private static checkApprovalPermissionSync(user: User, order: PurchaseOrder): {canApprove: boolean} {
    // 관리자는 모든 승인 권한
    if (user.role === "admin") {
      return { canApprove: true };
    }

    // 사용자의 승인 한도 확인
    const userLimit = this.APPROVAL_LIMITS[user.role as keyof typeof this.APPROVAL_LIMITS];
    if (!userLimit || userLimit === 0) {
      return { canApprove: false };
    }

    // 금액 한도 확인
    if (order.totalAmount > userLimit) {
      return { canApprove: false };
    }

    // 현재 승인 단계 확인
    const requiredRole = this.getNextApproverRole(order.totalAmount);
    const userRoleLevel = this.ROLE_HIERARCHY[user.role as keyof typeof this.ROLE_HIERARCHY];
    const requiredRoleLevel = this.ROLE_HIERARCHY[requiredRole as keyof typeof this.ROLE_HIERARCHY];

    if (userRoleLevel < requiredRoleLevel) {
      return { canApprove: false };
    }

    return { canApprove: true };
  }

  /**
   * 금액에 따른 다음 승인자 역할 결정
   */
  private static getNextApproverRole(amount: number): string {
    if (amount >= 100000000) { // 1억원 이상
      return "admin";
    } else if (amount >= 30000000) { // 3,000만원 이상
      return "executive";
    } else if (amount >= 5000000) { // 500만원 이상
      return "hq_management";
    } else {
      return "project_manager";
    }
  }

  /**
   * 승인 이력 저장
   */
  private static async createApprovalLog(orderId: number, userId: string, action: string, notes?: string): Promise<void> {
    try {
      await storage.createOrderHistory({
        orderId,
        userId,
        action,
        changes: { notes },
        createdAt: new Date()
      });
      
      DebugLogger.log("approvalLogCreated", `Approval log created for order ${orderId}: ${action}`);
    } catch (error) {
      DebugLogger.logError("createApprovalLog", error);
    }
  }

  /**
   * 생성일로부터 경과일 계산
   */
  private static getDaysSinceCreated(createdAt: Date | null): number {
    if (!createdAt) return 0;
    
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
}