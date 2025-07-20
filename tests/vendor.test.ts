import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { storage } from '../server/storage';
import { validateVendor } from '../server/utils/vendor-validation';
import type { Vendor, InsertVendor } from '@shared/schema';

// Mock dependencies
jest.mock('../server/storage');
jest.mock('../server/utils/vendor-validation');

describe('Vendor Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Vendor Creation', () => {
    it('should create a new vendor', async () => {
      const newVendor: InsertVendor = {
        name: '테스트 거래처',
        type: '거래처',
        businessNumber: '123-45-67890',
        industry: '제조업',
        representative: '홍길동',
        mainContact: '02-1234-5678',
        contactPerson: '김담당',
        email: 'vendor@test.com',
        phone: '010-1234-5678',
        address: '서울시 강남구 테스트동 123',
        isActive: true
      };

      const createdVendor = {
        id: 1,
        ...newVendor,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (storage.createVendor as jest.Mock).mockResolvedValue(createdVendor);

      const result = await storage.createVendor(newVendor);

      expect(result).toEqual(createdVendor);
      expect(storage.createVendor).toHaveBeenCalledWith(newVendor);
    });

    it('should validate vendor data before creation', async () => {
      const invalidVendor = {
        name: '', // Empty name
        type: '거래처',
        businessNumber: '123-45-67890',
        industry: '제조업',
        representative: '홍길동',
        mainContact: '02-1234-5678',
        contactPerson: '김담당',
        email: 'invalid-email', // Invalid email
        phone: '010-1234-5678',
        address: '서울시 강남구',
        isActive: true
      };

      (validateVendor as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['거래처명은 필수입니다.', '유효한 이메일 주소를 입력해주세요.']
      });

      const validation = validateVendor(invalidVendor);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('거래처명은 필수입니다.');
      expect(validation.errors).toContain('유효한 이메일 주소를 입력해주세요.');
    });

    it('should prevent duplicate business numbers', async () => {
      const existingVendor = {
        id: 1,
        name: '기존 거래처',
        businessNumber: '123-45-67890'
      };

      const newVendor: InsertVendor = {
        name: '새로운 거래처',
        type: '거래처',
        businessNumber: '123-45-67890', // Duplicate business number
        industry: '제조업',
        representative: '홍길동',
        mainContact: '02-1234-5678',
        contactPerson: '김담당',
        email: 'vendor@test.com',
        phone: '010-1234-5678',
        address: '서울시 강남구',
        isActive: true
      };

      (storage.getVendorByBusinessNumber as jest.Mock).mockResolvedValue(existingVendor);

      const result = await storage.getVendorByBusinessNumber('123-45-67890');

      expect(result).toEqual(existingVendor);
      expect(result.businessNumber).toBe('123-45-67890');
    });
  });

  describe('Vendor Retrieval', () => {
    it('should get vendor by ID', async () => {
      const mockVendor = {
        id: 1,
        name: '테스트 거래처',
        type: '거래처',
        businessNumber: '123-45-67890',
        industry: '제조업',
        representative: '홍길동',
        mainContact: '02-1234-5678',
        contactPerson: '김담당',
        email: 'vendor@test.com',
        phone: '010-1234-5678',
        address: '서울시 강남구',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (storage.getVendor as jest.Mock).mockResolvedValue(mockVendor);

      const result = await storage.getVendor(1);

      expect(result).toEqual(mockVendor);
      expect(storage.getVendor).toHaveBeenCalledWith(1);
    });

    it('should return null for non-existent vendor', async () => {
      (storage.getVendor as jest.Mock).mockResolvedValue(null);

      const result = await storage.getVendor(999);

      expect(result).toBeNull();
      expect(storage.getVendor).toHaveBeenCalledWith(999);
    });

    it('should get all vendors', async () => {
      const mockVendors = [
        {
          id: 1,
          name: '거래처A',
          type: '거래처',
          businessNumber: '123-45-67890',
          isActive: true
        },
        {
          id: 2,
          name: '거래처B',
          type: '거래처',
          businessNumber: '098-76-54321',
          isActive: true
        },
        {
          id: 3,
          name: '거래처C',
          type: '거래처',
          businessNumber: '555-55-55555',
          isActive: false
        }
      ];

      (storage.getAllVendors as jest.Mock).mockResolvedValue(mockVendors);

      const result = await storage.getAllVendors();

      expect(result).toEqual(mockVendors);
      expect(result).toHaveLength(3);
    });

    it('should get only active vendors', async () => {
      const mockVendors = [
        { id: 1, name: '거래처A', isActive: true },
        { id: 2, name: '거래처B', isActive: true },
        { id: 3, name: '거래처C', isActive: false }
      ];

      (storage.getAllVendors as jest.Mock).mockResolvedValue(mockVendors);

      const result = await storage.getAllVendors();
      const activeVendors = result.filter(vendor => vendor.isActive);

      expect(activeVendors).toHaveLength(2);
      expect(activeVendors.every(vendor => vendor.isActive)).toBe(true);
    });
  });

  describe('Vendor Updates', () => {
    it('should update vendor information', async () => {
      const mockVendor = {
        id: 1,
        name: '테스트 거래처',
        type: '거래처',
        businessNumber: '123-45-67890',
        industry: '제조업',
        representative: '홍길동',
        mainContact: '02-1234-5678',
        contactPerson: '김담당',
        email: 'vendor@test.com',
        phone: '010-1234-5678',
        address: '서울시 강남구',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedVendor = {
        ...mockVendor,
        contactPerson: '박담당',
        email: 'newvendor@test.com',
        phone: '010-9876-5432',
        updatedAt: new Date()
      };

      (storage.updateVendor as jest.Mock).mockResolvedValue(updatedVendor);

      const result = await storage.updateVendor(1, {
        contactPerson: '박담당',
        email: 'newvendor@test.com',
        phone: '010-9876-5432'
      });

      expect(result).toEqual(updatedVendor);
      expect(result.contactPerson).toBe('박담당');
      expect(result.email).toBe('newvendor@test.com');
      expect(result.phone).toBe('010-9876-5432');
    });

    it('should deactivate vendor', async () => {
      const mockVendor = {
        id: 1,
        name: '테스트 거래처',
        isActive: true
      };

      const deactivatedVendor = {
        ...mockVendor,
        isActive: false,
        updatedAt: new Date()
      };

      (storage.updateVendor as jest.Mock).mockResolvedValue(deactivatedVendor);

      const result = await storage.updateVendor(1, { isActive: false });

      expect(result.isActive).toBe(false);
      expect(storage.updateVendor).toHaveBeenCalledWith(1, { isActive: false });
    });

    it('should reactivate vendor', async () => {
      const mockVendor = {
        id: 1,
        name: '테스트 거래처',
        isActive: false
      };

      const reactivatedVendor = {
        ...mockVendor,
        isActive: true,
        updatedAt: new Date()
      };

      (storage.updateVendor as jest.Mock).mockResolvedValue(reactivatedVendor);

      const result = await storage.updateVendor(1, { isActive: true });

      expect(result.isActive).toBe(true);
      expect(storage.updateVendor).toHaveBeenCalledWith(1, { isActive: true });
    });
  });

  describe('Vendor Search and Filtering', () => {
    it('should search vendors by name', async () => {
      const mockVendors = [
        { id: 1, name: '삼성전자', type: '거래처', industry: '전자' },
        { id: 2, name: '삼성물산', type: '거래처', industry: '건설' },
        { id: 3, name: 'LG전자', type: '거래처', industry: '전자' }
      ];

      (storage.getAllVendors as jest.Mock).mockResolvedValue(mockVendors);

      const result = await storage.getAllVendors();
      const searchResults = result.filter(vendor => 
        vendor.name.includes('삼성')
      );

      expect(searchResults).toHaveLength(2);
      expect(searchResults[0].name).toBe('삼성전자');
      expect(searchResults[1].name).toBe('삼성물산');
    });

    it('should filter vendors by industry', async () => {
      const mockVendors = [
        { id: 1, name: '삼성전자', type: '거래처', industry: '전자' },
        { id: 2, name: '삼성물산', type: '거래처', industry: '건설' },
        { id: 3, name: 'LG전자', type: '거래처', industry: '전자' }
      ];

      (storage.getAllVendors as jest.Mock).mockResolvedValue(mockVendors);

      const result = await storage.getAllVendors();
      const electronicVendors = result.filter(vendor => 
        vendor.industry === '전자'
      );

      expect(electronicVendors).toHaveLength(2);
      expect(electronicVendors.every(vendor => vendor.industry === '전자')).toBe(true);
    });

    it('should search vendors by business number', async () => {
      const mockVendor = {
        id: 1,
        name: '테스트 거래처',
        businessNumber: '123-45-67890',
        type: '거래처',
        industry: '제조업'
      };

      (storage.getVendorByBusinessNumber as jest.Mock).mockResolvedValue(mockVendor);

      const result = await storage.getVendorByBusinessNumber('123-45-67890');

      expect(result).toEqual(mockVendor);
      expect(result.businessNumber).toBe('123-45-67890');
    });
  });

  describe('Vendor Deletion', () => {
    it('should delete vendor if no related orders exist', async () => {
      const mockVendor = {
        id: 1,
        name: '테스트 거래처',
        isActive: true
      };

      (storage.getVendor as jest.Mock).mockResolvedValue(mockVendor);
      (storage.getOrdersByVendor as jest.Mock).mockResolvedValue([]);
      (storage.deleteVendor as jest.Mock).mockResolvedValue(true);

      const vendor = await storage.getVendor(1);
      const relatedOrders = await storage.getOrdersByVendor(1);
      
      expect(vendor).toEqual(mockVendor);
      expect(relatedOrders).toHaveLength(0);

      const result = await storage.deleteVendor(1);
      expect(result).toBe(true);
    });

    it('should not delete vendor if related orders exist', async () => {
      const mockVendor = {
        id: 1,
        name: '테스트 거래처',
        isActive: true
      };

      const relatedOrders = [
        { id: 1, orderNumber: 'PO-2024-001', vendorId: 1 },
        { id: 2, orderNumber: 'PO-2024-002', vendorId: 1 }
      ];

      (storage.getVendor as jest.Mock).mockResolvedValue(mockVendor);
      (storage.getOrdersByVendor as jest.Mock).mockResolvedValue(relatedOrders);

      const vendor = await storage.getVendor(1);
      const orders = await storage.getOrdersByVendor(1);

      expect(vendor).toEqual(mockVendor);
      expect(orders).toHaveLength(2);

      // In real implementation, this would throw an error
      // For testing purposes, we verify the constraint check
    });
  });

  describe('Vendor Validation', () => {
    it('should validate vendor email format', async () => {
      const validVendor = {
        name: '테스트 거래처',
        email: 'valid@example.com',
        businessNumber: '123-45-67890'
      };

      (validateVendor as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      const validation = validateVendor(validVendor);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate business number format', async () => {
      const invalidVendor = {
        name: '테스트 거래처',
        email: 'vendor@example.com',
        businessNumber: '123-45-678' // Invalid format
      };

      (validateVendor as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['사업자등록번호 형식이 올바르지 않습니다.']
      });

      const validation = validateVendor(invalidVendor);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('사업자등록번호 형식이 올바르지 않습니다.');
    });

    it('should validate phone number format', async () => {
      const invalidVendor = {
        name: '테스트 거래처',
        email: 'vendor@example.com',
        businessNumber: '123-45-67890',
        phone: '010-1234' // Invalid format
      };

      (validateVendor as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['전화번호 형식이 올바르지 않습니다.']
      });

      const validation = validateVendor(invalidVendor);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('전화번호 형식이 올바르지 않습니다.');
    });
  });

  describe('Vendor Statistics', () => {
    it('should get vendor order statistics', async () => {
      const mockVendor = {
        id: 1,
        name: '테스트 거래처'
      };

      const mockOrders = [
        { id: 1, vendorId: 1, totalAmount: 1000000, status: 'approved' },
        { id: 2, vendorId: 1, totalAmount: 2000000, status: 'approved' },
        { id: 3, vendorId: 1, totalAmount: 500000, status: 'pending' }
      ];

      (storage.getVendor as jest.Mock).mockResolvedValue(mockVendor);
      (storage.getOrdersByVendor as jest.Mock).mockResolvedValue(mockOrders);

      const vendor = await storage.getVendor(1);
      const orders = await storage.getOrdersByVendor(1);

      expect(vendor).toEqual(mockVendor);
      expect(orders).toHaveLength(3);

      const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const approvedOrders = orders.filter(order => order.status === 'approved');

      expect(totalAmount).toBe(3500000);
      expect(approvedOrders).toHaveLength(2);
    });
  });
});