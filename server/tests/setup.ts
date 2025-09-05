/**
 * Jest 테스트 설정 파일
 */

import dotenv from 'dotenv';

// 테스트 환경 변수 로드
dotenv.config({ path: '.env.test' });

// 전역 테스트 설정
beforeAll(async () => {
  // 테스트 데이터베이스 연결 등 초기 설정
  console.log('🧪 테스트 환경 초기화...');
});

afterAll(async () => {
  // 테스트 종료 후 정리 작업
  console.log('🧹 테스트 환경 정리...');
});

// Mock 전역 함수들
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// 테스트용 유틸리티 함수들
export const testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    ...overrides
  }),

  createMockOrder: (overrides = {}) => ({
    id: 1,
    orderNumber: 'PO-2025-00001',
    orderStatus: 'draft',
    status: 'draft',
    approvalStatus: 'not_required',
    totalAmount: 1000000,
    orderDate: '2025-01-15',
    deliveryDate: null,
    notes: 'Test order',
    ...overrides
  }),

  createMockPDFResult: (success = true) => ({
    success,
    pdfPath: success ? '/uploads/pdf/test.pdf' : null,
    attachmentId: success ? 123 : null,
    error: success ? null : 'PDF generation failed'
  })
};