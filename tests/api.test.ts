import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { authRoutes } from '../server/routes/auth';
import { ordersRoutes } from '../server/routes/orders';
import { vendorsRoutes } from '../server/routes/vendors';
import { approvalsRoutes } from '../server/routes/approvals';
import { storage } from '../server/storage';

// Mock dependencies
jest.mock('../server/storage');
jest.mock('../server/utils/login-audit-service');

describe('API Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Setup test session
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));

    // Add routes
    app.use('/api/auth', authRoutes);
    app.use('/api/orders', ordersRoutes);
    app.use('/api/vendors', vendorsRoutes);
    app.use('/api/approvals', approvalsRoutes);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Authentication Routes', () => {
    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          name: '테스트 사용자',
          role: 'admin',
          password: '$2b$10$hashedpassword',
          isActive: true
        };

        (storage.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password'
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe('test@example.com');
      });

      it('should reject invalid credentials', async () => {
        (storage.getUserByEmail as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'invalid@example.com',
            password: 'wrongpassword'
          });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid email or password');
      });

      it('should require email and password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com'
            // Missing password
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Email and password are required');
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout successfully', async () => {
        const response = await request(app)
          .post('/api/auth/logout');

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Logout successful');
      });
    });

    describe('GET /api/auth/me', () => {
      it('should return current user', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          name: '테스트 사용자',
          role: 'admin'
        };

        (storage.getUser as jest.Mock).mockResolvedValue(mockUser);

        const agent = request.agent(app);
        
        // Login first
        await agent
          .post('/api/auth/login')
          .send({
            email: 'test@ikjin.co.kr',
            password: 'admin123'
          });

        const response = await agent.get('/api/auth/me');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('email');
      });

      it('should return 401 if not authenticated', async () => {
        const response = await request(app)
          .get('/api/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Not authenticated');
      });
    });
  });

  describe('Orders Routes', () => {
    beforeEach(() => {
      // Mock authenticated user
      jest.spyOn(require('../server/local-auth'), 'requireAuth')
        .mockImplementation((req: any, res: any, next: any) => {
          req.user = {
            id: 'user-123',
            email: 'test@example.com',
            name: '테스트 사용자',
            role: 'admin'
          };
          next();
        });
    });

    describe('GET /api/orders', () => {
      it('should get all orders', async () => {
        const mockOrders = [
          {
            id: 1,
            orderNumber: 'PO-2024-001',
            projectId: 1,
            vendorId: 1,
            totalAmount: 1000000,
            status: 'draft'
          },
          {
            id: 2,
            orderNumber: 'PO-2024-002',
            projectId: 1,
            vendorId: 2,
            totalAmount: 2000000,
            status: 'approved'
          }
        ];

        (storage.getAllOrders as jest.Mock).mockResolvedValue(mockOrders);

        const response = await request(app)
          .get('/api/orders');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0].orderNumber).toBe('PO-2024-001');
      });
    });

    describe('GET /api/orders/:id', () => {
      it('should get order by ID', async () => {
        const mockOrder = {
          id: 1,
          orderNumber: 'PO-2024-001',
          projectId: 1,
          vendorId: 1,
          totalAmount: 1000000,
          status: 'draft'
        };

        (storage.getOrder as jest.Mock).mockResolvedValue(mockOrder);

        const response = await request(app)
          .get('/api/orders/1');

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(1);
        expect(response.body.orderNumber).toBe('PO-2024-001');
      });

      it('should return 404 for non-existent order', async () => {
        (storage.getOrder as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .get('/api/orders/999');

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Order not found');
      });
    });

    describe('POST /api/orders', () => {
      it('should create new order', async () => {
        const newOrder = {
          orderNumber: 'PO-2024-003',
          projectId: 1,
          vendorId: 1,
          totalAmount: 1500000,
          status: 'draft',
          orderDate: new Date().toISOString(),
          requiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          templateId: 1,
          orderItems: JSON.stringify([
            { item: '자재A', quantity: 10, unitPrice: 75000, totalPrice: 750000 },
            { item: '자재B', quantity: 5, unitPrice: 150000, totalPrice: 750000 }
          ])
        };

        const createdOrder = {
          id: 3,
          ...newOrder,
          createdBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        (storage.createPurchaseOrder as jest.Mock).mockResolvedValue(createdOrder);

        const response = await request(app)
          .post('/api/orders')
          .send(newOrder);

        expect(response.status).toBe(201);
        expect(response.body.id).toBe(3);
        expect(response.body.orderNumber).toBe('PO-2024-003');
      });

      it('should validate required fields', async () => {
        const incompleteOrder = {
          orderNumber: 'PO-2024-003'
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/orders')
          .send(incompleteOrder);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('required');
      });
    });

    describe('PUT /api/orders/:id', () => {
      it('should update existing order', async () => {
        const updateData = {
          status: 'pending',
          totalAmount: 1200000
        };

        const updatedOrder = {
          id: 1,
          orderNumber: 'PO-2024-001',
          projectId: 1,
          vendorId: 1,
          totalAmount: 1200000,
          status: 'pending',
          updatedAt: new Date()
        };

        (storage.updateOrder as jest.Mock).mockResolvedValue(updatedOrder);

        const response = await request(app)
          .put('/api/orders/1')
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.totalAmount).toBe(1200000);
        expect(response.body.status).toBe('pending');
      });
    });

    describe('DELETE /api/orders/:id', () => {
      it('should delete draft order', async () => {
        const mockOrder = {
          id: 1,
          orderNumber: 'PO-2024-001',
          status: 'draft'
        };

        (storage.getOrder as jest.Mock).mockResolvedValue(mockOrder);
        (storage.deleteOrder as jest.Mock).mockResolvedValue(true);

        const response = await request(app)
          .delete('/api/orders/1');

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Order deleted successfully');
      });

      it('should not delete approved order', async () => {
        const mockOrder = {
          id: 1,
          orderNumber: 'PO-2024-001',
          status: 'approved'
        };

        (storage.getOrder as jest.Mock).mockResolvedValue(mockOrder);

        const response = await request(app)
          .delete('/api/orders/1');

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Cannot delete approved order');
      });
    });
  });

  describe('Vendors Routes', () => {
    beforeEach(() => {
      // Mock authenticated user
      jest.spyOn(require('../server/local-auth'), 'requireAuth')
        .mockImplementation((req: any, res: any, next: any) => {
          req.user = {
            id: 'user-123',
            email: 'test@example.com',
            name: '테스트 사용자',
            role: 'admin'
          };
          next();
        });
    });

    describe('GET /api/vendors', () => {
      it('should get all vendors', async () => {
        const mockVendors = [
          {
            id: 1,
            name: '거래처A',
            type: '거래처',
            businessNumber: '123-45-67890',
            industry: '제조업',
            isActive: true
          },
          {
            id: 2,
            name: '거래처B',
            type: '거래처',
            businessNumber: '098-76-54321',
            industry: '건설업',
            isActive: true
          }
        ];

        (storage.getAllVendors as jest.Mock).mockResolvedValue(mockVendors);

        const response = await request(app)
          .get('/api/vendors');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0].name).toBe('거래처A');
      });
    });

    describe('POST /api/vendors', () => {
      it('should create new vendor', async () => {
        const newVendor = {
          name: '새로운 거래처',
          type: '거래처',
          businessNumber: '555-55-55555',
          industry: '서비스업',
          representative: '김대표',
          mainContact: '02-5555-5555',
          contactPerson: '이담당',
          email: 'contact@newvendor.com',
          phone: '010-5555-5555',
          address: '서울시 서초구',
          isActive: true
        };

        const createdVendor = {
          id: 3,
          ...newVendor,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        (storage.createVendor as jest.Mock).mockResolvedValue(createdVendor);

        const response = await request(app)
          .post('/api/vendors')
          .send(newVendor);

        expect(response.status).toBe(201);
        expect(response.body.id).toBe(3);
        expect(response.body.name).toBe('새로운 거래처');
      });

      it('should validate required fields', async () => {
        const incompleteVendor = {
          name: '불완전한 거래처'
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/vendors')
          .send(incompleteVendor);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('required');
      });
    });
  });

  describe('Approvals Routes', () => {
    beforeEach(() => {
      // Mock authenticated user with approval permissions
      jest.spyOn(require('../server/local-auth'), 'requireAuth')
        .mockImplementation((req: any, res: any, next: any) => {
          req.user = {
            id: 'manager-123',
            email: 'manager@example.com',
            name: '프로젝트 매니저',
            role: 'project_manager'
          };
          next();
        });
    });

    describe('GET /api/approvals/pending', () => {
      it('should get pending approvals', async () => {
        const mockPendingOrders = [
          {
            id: 1,
            orderNumber: 'PO-2024-001',
            totalAmount: 1000000,
            status: 'pending',
            currentApproverRole: 'project_manager'
          },
          {
            id: 2,
            orderNumber: 'PO-2024-002',
            totalAmount: 2000000,
            status: 'pending',
            currentApproverRole: 'project_manager'
          }
        ];

        jest.spyOn(require('../server/services/approval-service'), 'ApprovalService')
          .getPendingApprovals = jest.fn().mockResolvedValue(mockPendingOrders);

        const response = await request(app)
          .get('/api/approvals/pending');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0].status).toBe('pending');
      });
    });

    describe('POST /api/approvals/:id/approve', () => {
      it('should approve order', async () => {
        const mockResult = {
          success: true,
          message: '발주서가 성공적으로 승인되었습니다.',
          order: {
            id: 1,
            orderNumber: 'PO-2024-001',
            status: 'approved',
            isApproved: true,
            approvedBy: 'manager-123',
            approvedAt: new Date()
          }
        };

        jest.spyOn(require('../server/services/approval-service'), 'ApprovalService')
          .approveOrder = jest.fn().mockResolvedValue(mockResult);

        const response = await request(app)
          .post('/api/approvals/1/approve')
          .send({ comments: '승인 완료' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('발주서가 성공적으로 승인되었습니다.');
      });

      it('should reject approval with insufficient permissions', async () => {
        const mockResult = {
          success: false,
          message: '승인 권한이 없습니다. 해당 금액에 대한 승인 권한이 부족합니다.'
        };

        jest.spyOn(require('../server/services/approval-service'), 'ApprovalService')
          .approveOrder = jest.fn().mockResolvedValue(mockResult);

        const response = await request(app)
          .post('/api/approvals/1/approve')
          .send({ comments: '승인 시도' });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('승인 권한이 없습니다');
      });
    });

    describe('POST /api/approvals/:id/reject', () => {
      it('should reject order', async () => {
        const mockResult = {
          success: true,
          message: '발주서가 성공적으로 반려되었습니다.',
          order: {
            id: 1,
            orderNumber: 'PO-2024-001',
            status: 'draft',
            isApproved: false,
            approvedBy: null,
            approvedAt: null
          }
        };

        jest.spyOn(require('../server/services/approval-service'), 'ApprovalService')
          .rejectOrder = jest.fn().mockResolvedValue(mockResult);

        const response = await request(app)
          .post('/api/approvals/1/reject')
          .send({ comments: '수정 필요' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('발주서가 성공적으로 반려되었습니다.');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should handle server errors gracefully', async () => {
      (storage.getAllOrders as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/orders');

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Internal server error');
    });
  });
});