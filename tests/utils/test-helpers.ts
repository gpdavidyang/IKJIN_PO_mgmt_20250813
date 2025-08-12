import { Express } from 'express';
import request from 'supertest';
import { users, companies, projects, vendors } from '@shared/schema';
import bcrypt from 'bcrypt';
import { testDb } from '../setup';

// Test user data
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!@#',
    name: '테스트 관리자',
    role: 'admin' as const,
    company_id: 1,
    project_id: 1,
    position: '관리자',
  },
  projectManager: {
    email: 'pm@test.com',
    password: 'PM123!@#',
    name: '테스트 PM',
    role: 'project_manager' as const,
    company_id: 1,
    project_id: 1,
    position: '프로젝트 매니저',
  },
  fieldWorker: {
    email: 'worker@test.com',
    password: 'Worker123!@#',
    name: '테스트 작업자',
    role: 'field_worker' as const,
    company_id: 1,
    project_id: 1,
    position: '현장 작업자',
  },
  executive: {
    email: 'exec@test.com',
    password: 'Exec123!@#',
    name: '테스트 임원',
    role: 'executive' as const,
    company_id: 1,
    project_id: 1,
    position: '임원',
  },
};

// Create test users in database
export async function createTestUsers() {
  // Create test company first
  const [company] = await testDb.insert(companies).values({
    name: '테스트 회사',
    business_number: '123-45-67890',
    contact_email: 'test@company.com',
  }).returning();

  // Create test project
  const [project] = await testDb.insert(projects).values({
    name: '테스트 프로젝트',
    code: 'TEST001',
    company_id: company.id,
    location: '서울시 강남구',
    status: 'active',
  }).returning();

  // Create users with hashed passwords
  const createdUsers = [];
  for (const [key, userData] of Object.entries(testUsers)) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await testDb.insert(users).values({
      ...userData,
      password: hashedPassword,
      company_id: company.id,
      project_id: project.id,
    }).returning();
    createdUsers.push(user);
  }

  return { company, project, users: createdUsers };
}

// Create test vendors
export async function createTestVendors() {
  const vendorData = [
    {
      name: '테스트 거래처 1',
      business_number: '111-11-11111',
      contact_person: '김담당',
      contact_phone: '010-1111-1111',
      contact_email: 'vendor1@test.com',
      address: '서울시 중구',
    },
    {
      name: '테스트 거래처 2',
      business_number: '222-22-22222',
      contact_person: '이담당',
      contact_phone: '010-2222-2222',
      contact_email: 'vendor2@test.com',
      address: '서울시 종로구',
    },
  ];

  const createdVendors = await testDb.insert(vendors).values(vendorData).returning();
  return createdVendors;
}

// Login helper for API tests
export async function loginAs(app: Express, userType: keyof typeof testUsers) {
  const user = testUsers[userType];
  const agent = request.agent(app);
  
  await agent
    .post('/api/auth/login')
    .send({
      email: user.email,
      password: user.password,
    })
    .expect(200);
    
  return agent;
}

// Clean up test data
export async function cleanupTestData() {
  // Delete in reverse order of foreign key dependencies
  await testDb.delete(users).where('email', 'like', '%@test.com');
  await testDb.delete(vendors).where('email', 'like', '%@test.com');
  await testDb.delete(projects).where('code', '=', 'TEST001');
  await testDb.delete(companies).where('business_number', '=', '123-45-67890');
}

// Mock file upload
export function mockFileUpload(filename: string, content: Buffer | string) {
  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: typeof content === 'string' ? Buffer.from(content) : content,
    size: typeof content === 'string' ? content.length : content.length,
  };
}

// Wait for async operation with timeout
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Timeout waiting for condition');
}

// Generate test data
export function generateTestPurchaseOrder(overrides = {}) {
  return {
    order_number: `PO-TEST-${Date.now()}`,
    project_id: 1,
    vendor_id: 1,
    total_amount: 1000000,
    tax_amount: 100000,
    grand_total: 1100000,
    order_date: new Date().toISOString(),
    delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    delivery_location: '테스트 현장',
    payment_terms: '30일',
    notes: '테스트 발주서',
    status: 'draft' as const,
    ...overrides,
  };
}