import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ApprovalService } from '../server/services/approval-service';
import { storage } from '../server/storage';

// Mock dependencies
jest.mock('../server/storage');

describe('Approval System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('ApprovalService', () => {
    describe('getApprovalStats', () => {
      it('should return approval statistics for admin user', async () => {
        const mockUser = {
          id: 'admin-123',
          role: 'admin',
          email: 'admin@test.com',
          name: '관리자'
        };
        
        const mockPendingOrders = [
          { id: 1, totalAmount: 1000000, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { id: 2, totalAmount: 500000, createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
          { id: 3, totalAmount: 2000000, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
        ];
        
        (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
        (storage.getPendingOrders as jest.Mock).mockResolvedValue(mockPendingOrders);
        
        const stats = await ApprovalService.getApprovalStats('admin-123');
        
        expect(stats).toEqual({
          pendingCount: 3,
          urgentCount: 1, // Orders older than 3 days
          averageWaitDays: 2, // Average of 2, 4, 1 days
          pendingAmount: 3500000 // Sum of all amounts
        });
      });

      it('should throw error if user not found', async () => {
        (storage.getUser as jest.Mock).mockResolvedValue(null);
        
        await expect(ApprovalService.getApprovalStats('invalid-user'))
          .rejects.toThrow('사용자를 찾을 수 없습니다.');
      });
    });

    describe('getPendingApprovals', () => {
      it('should return pending approvals for authorized user', async () => {
        const mockUser = {
          id: 'manager-123',
          role: 'project_manager',
          email: 'manager@test.com',
          name: '프로젝트 매니저'
        };
        
        const mockOrders = [
          { id: 1, orderNumber: 'PO-2024-001', totalAmount: 1000000, status: 'pending' },
          { id: 2, orderNumber: 'PO-2024-002', totalAmount: 500000, status: 'pending' }
        ];
        
        (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
        (storage.getPendingOrders as jest.Mock).mockResolvedValue(mockOrders);
        
        const result = await ApprovalService.getPendingApprovals('manager-123');
        
        expect(result).toEqual(mockOrders);
      });
    });

    describe('approveOrder', () => {
      it('should approve order with valid permissions', async () => {
        const mockUser = {
          id: 'manager-123',
          role: 'project_manager',
          email: 'manager@test.com',
          name: '프로젝트 매니저'
        };
        
        const mockOrder = {
          id: 1,
          orderNumber: 'PO-2024-001',
          totalAmount: 1000000,
          status: 'pending'
        };
        
        const mockUpdatedOrder = {
          ...mockOrder,
          status: 'approved',
          isApproved: true,
          approvedBy: 'manager-123',
          approvedAt: new Date()
        };
        
        (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
        (storage.getOrder as jest.Mock).mockResolvedValue(mockOrder);
        (storage.updateOrder as jest.Mock).mockResolvedValue(mockUpdatedOrder);
        (storage.createOrderHistory as jest.Mock).mockResolvedValue({});
        
        const result = await ApprovalService.approveOrder(1, 'manager-123', '승인 완료');
        
        expect(result.success).toBe(true);
        expect(result.message).toBe('발주서가 성공적으로 승인되었습니다.');
        expect(result.order?.status).toBe('approved');
        expect(storage.updateOrder).toHaveBeenCalledWith(1, expect.objectContaining({
          status: 'approved',
          isApproved: true,
          approvedBy: 'manager-123'
        }));
      });

      it('should reject approval if user has insufficient permissions', async () => {
        const mockUser = {
          id: 'worker-123',
          role: 'field_worker',
          email: 'worker@test.com',
          name: '현장 작업자'
        };
        
        const mockOrder = {
          id: 1,
          orderNumber: 'PO-2024-001',
          totalAmount: 10000000, // 1000만원 (field_worker 권한 초과)
          status: 'pending'
        };
        
        (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
        (storage.getOrder as jest.Mock).mockResolvedValue(mockOrder);
        
        const result = await ApprovalService.approveOrder(1, 'worker-123');
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('승인 권한이 없습니다');
      });

      it('should reject approval if order not found', async () => {
        const mockUser = {
          id: 'manager-123',
          role: 'project_manager',
          email: 'manager@test.com',
          name: '프로젝트 매니저'
        };
        
        (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
        (storage.getOrder as jest.Mock).mockResolvedValue(null);
        
        const result = await ApprovalService.approveOrder(999, 'manager-123');
        
        expect(result.success).toBe(false);
        expect(result.message).toBe('발주서를 찾을 수 없습니다.');
      });
    });

    describe('rejectOrder', () => {
      it('should reject order with valid permissions', async () => {
        const mockUser = {
          id: 'manager-123',
          role: 'project_manager',
          email: 'manager@test.com',
          name: '프로젝트 매니저'
        };
        
        const mockOrder = {
          id: 1,
          orderNumber: 'PO-2024-001',
          totalAmount: 1000000,
          status: 'pending'
        };
        
        const mockUpdatedOrder = {
          ...mockOrder,
          status: 'draft',
          isApproved: false,
          approvedBy: null,
          approvedAt: null
        };
        
        (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
        (storage.getOrder as jest.Mock).mockResolvedValue(mockOrder);
        (storage.updateOrder as jest.Mock).mockResolvedValue(mockUpdatedOrder);
        (storage.createOrderHistory as jest.Mock).mockResolvedValue({});
        
        const result = await ApprovalService.rejectOrder(1, 'manager-123', '수정 필요');
        
        expect(result.success).toBe(true);
        expect(result.message).toBe('발주서가 성공적으로 반려되었습니다.');
        expect(result.order?.status).toBe('draft');
        expect(storage.updateOrder).toHaveBeenCalledWith(1, expect.objectContaining({
          status: 'draft',
          isApproved: false,
          approvedBy: null,
          approvedAt: null
        }));
      });
    });

    describe('submitForApproval', () => {
      it('should submit order for approval', async () => {
        const mockUser = {
          id: 'user-123',
          role: 'field_worker',
          email: 'user@test.com',
          name: '현장 작업자'
        };
        
        const mockOrder = {
          id: 1,
          orderNumber: 'PO-2024-001',
          totalAmount: 1000000,
          status: 'draft'
        };
        
        const mockUpdatedOrder = {
          ...mockOrder,
          status: 'pending',
          currentApproverRole: 'project_manager'
        };
        
        (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
        (storage.getOrder as jest.Mock).mockResolvedValue(mockOrder);
        (storage.updateOrder as jest.Mock).mockResolvedValue(mockUpdatedOrder);
        (storage.createOrderHistory as jest.Mock).mockResolvedValue({});
        
        const result = await ApprovalService.submitForApproval(1, 'user-123');
        
        expect(result.success).toBe(true);
        expect(result.message).toBe('발주서가 승인 요청되었습니다.');
        expect(result.order?.status).toBe('pending');
        expect(result.order?.currentApproverRole).toBe('project_manager');
      });

      it('should reject submission if order is not in draft status', async () => {
        const mockUser = {
          id: 'user-123',
          role: 'field_worker',
          email: 'user@test.com',
          name: '현장 작업자'
        };
        
        const mockOrder = {
          id: 1,
          orderNumber: 'PO-2024-001',
          totalAmount: 1000000,
          status: 'pending' // Already submitted
        };
        
        (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
        (storage.getOrder as jest.Mock).mockResolvedValue(mockOrder);
        
        const result = await ApprovalService.submitForApproval(1, 'user-123');
        
        expect(result.success).toBe(false);
        expect(result.message).toBe('작성 중인 발주서만 승인 요청할 수 있습니다.');
      });
    });

    describe('getUserApprovalPermissions', () => {
      it('should return admin permissions', async () => {
        const mockUser = {
          id: 'admin-123',
          role: 'admin',
          email: 'admin@test.com',
          name: '관리자'
        };
        
        (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
        
        const permissions = await ApprovalService.getUserApprovalPermissions('admin-123');
        
        expect(permissions).toEqual({
          canApprove: true,
          maxAmount: Infinity,
          requiredRole: 'admin',
          currentRole: 'admin'
        });
      });

      it('should return project manager permissions', async () => {
        const mockUser = {
          id: 'manager-123',
          role: 'project_manager',
          email: 'manager@test.com',
          name: '프로젝트 매니저'
        };
        
        (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
        
        const permissions = await ApprovalService.getUserApprovalPermissions('manager-123');
        
        expect(permissions).toEqual({
          canApprove: true,
          maxAmount: 5000000, // 500만원
          requiredRole: 'project_manager',
          currentRole: 'project_manager'
        });
      });

      it('should return field worker permissions (no approval rights)', async () => {
        const mockUser = {
          id: 'worker-123',
          role: 'field_worker',
          email: 'worker@test.com',
          name: '현장 작업자'
        };
        
        (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
        
        const permissions = await ApprovalService.getUserApprovalPermissions('worker-123');
        
        expect(permissions).toEqual({
          canApprove: false,
          maxAmount: 0,
          requiredRole: 'field_worker',
          currentRole: 'field_worker'
        });
      });
    });
  });
});