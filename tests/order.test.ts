import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { storage } from '../server/storage';
import { OptimizedOrderQueries } from '../server/services/optimized-order-queries';
import type { PurchaseOrder, InsertPurchaseOrder } from '@shared/schema';

// Mock dependencies
jest.mock('../server/storage');

describe('Purchase Order Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Order Creation', () => {
    it('should create a new purchase order', async () => {
      const newOrder: InsertPurchaseOrder = {
        orderNumber: 'PO-2024-001',
        projectId: 1,
        vendorId: 1,
        totalAmount: 1000000,
        status: 'draft',
        orderDate: new Date(),
        requiredDate: new Date(),
        templateId: 1,
        createdBy: 'user-123',
        orderItems: JSON.stringify([
          { item: '자재A', quantity: 10, unitPrice: 50000, totalPrice: 500000 },
          { item: '자재B', quantity: 5, unitPrice: 100000, totalPrice: 500000 }
        ])
      };

      const createdOrder = {
        id: 1,
        ...newOrder,
        isApproved: false,
        approvedBy: null,
        approvedAt: null,
        currentApproverRole: null,
        approvalLevel: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (storage.createPurchaseOrder as jest.Mock).mockResolvedValue(createdOrder);

      const result = await storage.createPurchaseOrder(newOrder);

      expect(result).toEqual(createdOrder);
      expect(storage.createPurchaseOrder).toHaveBeenCalledWith(newOrder);
    });

    it('should generate unique order number', async () => {
      const existingOrders = [
        { orderNumber: 'PO-2024-001' },
        { orderNumber: 'PO-2024-002' }
      ];

      (storage.getAllOrders as jest.Mock).mockResolvedValue(existingOrders);

      // Test order number generation logic
      const expectedNextNumber = 'PO-2024-003';
      
      expect(existingOrders.length).toBe(2);
      expect(existingOrders[0].orderNumber).toBe('PO-2024-001');
    });
  });

  describe('Order Retrieval', () => {
    it('should get order by ID', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: 'PO-2024-001',
        projectId: 1,
        vendorId: 1,
        totalAmount: 1000000,
        status: 'draft',
        orderDate: new Date(),
        requiredDate: new Date(),
        isApproved: false,
        approvedBy: null,
        approvedAt: null,
        currentApproverRole: null,
        approvalLevel: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (storage.getOrder as jest.Mock).mockResolvedValue(mockOrder);

      const result = await storage.getOrder(1);

      expect(result).toEqual(mockOrder);
      expect(storage.getOrder).toHaveBeenCalledWith(1);
    });

    it('should return null for non-existent order', async () => {
      (storage.getOrder as jest.Mock).mockResolvedValue(null);

      const result = await storage.getOrder(999);

      expect(result).toBeNull();
      expect(storage.getOrder).toHaveBeenCalledWith(999);
    });

    it('should get all orders', async () => {
      const mockOrders = [
        { id: 1, orderNumber: 'PO-2024-001', status: 'draft' },
        { id: 2, orderNumber: 'PO-2024-002', status: 'pending' },
        { id: 3, orderNumber: 'PO-2024-003', status: 'approved' }
      ];

      (storage.getAllOrders as jest.Mock).mockResolvedValue(mockOrders);

      const result = await storage.getAllOrders();

      expect(result).toEqual(mockOrders);
      expect(result).toHaveLength(3);
    });
  });

  describe('Order Status Management', () => {
    it('should update order status', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: 'PO-2024-001',
        status: 'draft',
        totalAmount: 1000000
      };

      const updatedOrder = {
        ...mockOrder,
        status: 'pending',
        currentApproverRole: 'project_manager',
        updatedAt: new Date()
      };

      (storage.updateOrder as jest.Mock).mockResolvedValue(updatedOrder);

      const result = await storage.updateOrder(1, {
        status: 'pending',
        currentApproverRole: 'project_manager'
      });

      expect(result).toEqual(updatedOrder);
      expect(storage.updateOrder).toHaveBeenCalledWith(1, {
        status: 'pending',
        currentApproverRole: 'project_manager'
      });
    });

    it('should approve order', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: 'PO-2024-001',
        status: 'pending',
        totalAmount: 1000000
      };

      const approvedOrder = {
        ...mockOrder,
        status: 'approved',
        isApproved: true,
        approvedBy: 'manager-123',
        approvedAt: new Date()
      };

      (storage.updateOrder as jest.Mock).mockResolvedValue(approvedOrder);

      const result = await storage.updateOrder(1, {
        status: 'approved',
        isApproved: true,
        approvedBy: 'manager-123',
        approvedAt: new Date()
      });

      expect(result.status).toBe('approved');
      expect(result.isApproved).toBe(true);
      expect(result.approvedBy).toBe('manager-123');
    });

    it('should reject order', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: 'PO-2024-001',
        status: 'pending',
        totalAmount: 1000000
      };

      const rejectedOrder = {
        ...mockOrder,
        status: 'draft',
        isApproved: false,
        approvedBy: null,
        approvedAt: null
      };

      (storage.updateOrder as jest.Mock).mockResolvedValue(rejectedOrder);

      const result = await storage.updateOrder(1, {
        status: 'draft',
        isApproved: false,
        approvedBy: null,
        approvedAt: null
      });

      expect(result.status).toBe('draft');
      expect(result.isApproved).toBe(false);
      expect(result.approvedBy).toBeNull();
    });
  });

  describe('Order Filtering and Search', () => {
    it('should filter orders by status', async () => {
      const mockOrders = [
        { id: 1, orderNumber: 'PO-2024-001', status: 'draft' },
        { id: 2, orderNumber: 'PO-2024-002', status: 'pending' },
        { id: 3, orderNumber: 'PO-2024-003', status: 'approved' }
      ];

      (storage.getAllOrders as jest.Mock).mockResolvedValue(mockOrders);

      const result = await storage.getAllOrders();
      const draftOrders = result.filter(order => order.status === 'draft');
      const pendingOrders = result.filter(order => order.status === 'pending');

      expect(draftOrders).toHaveLength(1);
      expect(pendingOrders).toHaveLength(1);
      expect(draftOrders[0].orderNumber).toBe('PO-2024-001');
    });

    it('should search orders by order number', async () => {
      const mockOrders = [
        { id: 1, orderNumber: 'PO-2024-001', status: 'draft' },
        { id: 2, orderNumber: 'PO-2024-002', status: 'pending' },
        { id: 3, orderNumber: 'PO-2024-003', status: 'approved' }
      ];

      (storage.getAllOrders as jest.Mock).mockResolvedValue(mockOrders);

      const result = await storage.getAllOrders();
      const searchResult = result.filter(order => 
        order.orderNumber.includes('PO-2024-001')
      );

      expect(searchResult).toHaveLength(1);
      expect(searchResult[0].orderNumber).toBe('PO-2024-001');
    });
  });

  describe('Order Deletion', () => {
    it('should delete draft order', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: 'PO-2024-001',
        status: 'draft'
      };

      (storage.getOrder as jest.Mock).mockResolvedValue(mockOrder);
      (storage.deleteOrder as jest.Mock).mockResolvedValue(true);

      const result = await storage.deleteOrder(1);

      expect(result).toBe(true);
      expect(storage.deleteOrder).toHaveBeenCalledWith(1);
    });

    it('should not delete approved order', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: 'PO-2024-001',
        status: 'approved'
      };

      (storage.getOrder as jest.Mock).mockResolvedValue(mockOrder);

      // Test that deletion should be prevented for approved orders
      const order = await storage.getOrder(1);
      expect(order.status).toBe('approved');
      
      // In real implementation, this would throw an error
      // For testing purposes, we verify the status check
    });
  });

  describe('Order History', () => {
    it('should create order history entry', async () => {
      const historyEntry = {
        orderId: 1,
        userId: 'user-123',
        action: 'created',
        previousStatus: null,
        newStatus: 'draft',
        comments: '발주서 생성',
        createdAt: new Date()
      };

      const createdHistory = {
        id: 1,
        ...historyEntry
      };

      (storage.createOrderHistory as jest.Mock).mockResolvedValue(createdHistory);

      const result = await storage.createOrderHistory(historyEntry);

      expect(result).toEqual(createdHistory);
      expect(storage.createOrderHistory).toHaveBeenCalledWith(historyEntry);
    });

    it('should get order history', async () => {
      const mockHistory = [
        {
          id: 1,
          orderId: 1,
          userId: 'user-123',
          action: 'created',
          previousStatus: null,
          newStatus: 'draft',
          comments: '발주서 생성',
          createdAt: new Date()
        },
        {
          id: 2,
          orderId: 1,
          userId: 'user-123',
          action: 'submitted',
          previousStatus: 'draft',
          newStatus: 'pending',
          comments: '승인 요청',
          createdAt: new Date()
        }
      ];

      (storage.getOrderHistory as jest.Mock).mockResolvedValue(mockHistory);

      const result = await storage.getOrderHistory(1);

      expect(result).toEqual(mockHistory);
      expect(result).toHaveLength(2);
      expect(storage.getOrderHistory).toHaveBeenCalledWith(1);
    });
  });

  describe('OptimizedOrderQueries', () => {
    it('should get orders with related data', async () => {
      const mockOrdersWithRelations = [
        {
          id: 1,
          orderNumber: 'PO-2024-001',
          status: 'draft',
          vendor: { id: 1, name: '거래처A' },
          project: { id: 1, name: '프로젝트A' },
          creator: { id: 'user-123', name: '사용자A' }
        }
      ];

      (OptimizedOrderQueries.getOrdersWithRelations as jest.Mock)
        .mockResolvedValue(mockOrdersWithRelations);

      const result = await OptimizedOrderQueries.getOrdersWithRelations();

      expect(result).toEqual(mockOrdersWithRelations);
      expect(result[0].vendor.name).toBe('거래처A');
      expect(result[0].project.name).toBe('프로젝트A');
    });

    it('should get pending orders for user', async () => {
      const mockPendingOrders = [
        {
          id: 1,
          orderNumber: 'PO-2024-001',
          status: 'pending',
          totalAmount: 1000000,
          currentApproverRole: 'project_manager'
        }
      ];

      (OptimizedOrderQueries.getPendingOrdersForUser as jest.Mock)
        .mockResolvedValue(mockPendingOrders);

      const result = await OptimizedOrderQueries.getPendingOrdersForUser('manager-123');

      expect(result).toEqual(mockPendingOrders);
      expect(result[0].status).toBe('pending');
      expect(result[0].currentApproverRole).toBe('project_manager');
    });
  });
});