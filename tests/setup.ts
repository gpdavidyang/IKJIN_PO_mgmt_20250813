import { beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock console methods for cleaner test output
const consoleMethods = ['log', 'error', 'warn', 'info', 'debug'] as const;
const originalConsole = {} as any;

beforeAll(() => {
  // Save original console methods
  consoleMethods.forEach(method => {
    originalConsole[method] = console[method];
  });
  
  // Mock console methods in test environment
  if (process.env.NODE_ENV === 'test') {
    consoleMethods.forEach(method => {
      console[method] = jest.fn();
    });
  }
});

afterAll(() => {
  // Restore original console methods
  consoleMethods.forEach(method => {
    console[method] = originalConsole[method];
  });
});

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.resetAllMocks();
});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.SESSION_SECRET = 'test-secret-key';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'testpass';

// Global test utilities
(global as any).testUtils = {
  // Mock user data
  mockUser: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: '테스트 사용자',
    role: 'admin',
    phoneNumber: '010-1234-5678',
    profileImageUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  // Mock order data
  mockOrder: {
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
    updatedAt: new Date(),
  },
  
  // Mock vendor data
  mockVendor: {
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
    updatedAt: new Date(),
  },
};