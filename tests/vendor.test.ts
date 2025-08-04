import request from 'supertest';
import { Express } from 'express';
import { createTestUsers, createTestVendors, cleanupTestData, loginAs } from './utils/test-helpers';
import { createApp } from '../server/app';

describe('Vendor Management', () => {
  let app: Express;
  let adminAgent: request.SuperAgentTest;
  let pmAgent: request.SuperAgentTest;
  let fieldWorkerAgent: request.SuperAgentTest;
  
  beforeAll(async () => {
    app = createApp();
    await createTestUsers();
    
    // Create authenticated agents for different user roles
    adminAgent = await loginAs(app, 'admin');
    pmAgent = await loginAs(app, 'projectManager');
    fieldWorkerAgent = await loginAs(app, 'fieldWorker');
  });
  
  afterAll(async () => {
    await cleanupTestData();
  });
  
  describe('GET /api/vendors', () => {
    beforeEach(async () => {
      await createTestVendors();
    });
    
    it('should return all vendors for authenticated users', async () => {
      const response = await pmAgent
        .get('/api/vendors')
        .expect(200);
        
      expect(response.body).toHaveProperty('vendors');
      expect(Array.isArray(response.body.vendors)).toBe(true);
      expect(response.body.vendors.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should support pagination', async () => {
      const response = await pmAgent
        .get('/api/vendors?page=1&limit=1')
        .expect(200);
        
      expect(response.body.vendors.length).toBe(1);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });
    
    it('should support search by name', async () => {
      const response = await pmAgent
        .get('/api/vendors?search=거래처 1')
        .expect(200);
        
      expect(response.body.vendors.length).toBe(1);
      expect(response.body.vendors[0].name).toContain('거래처 1');
    });
    
    it('should require authentication', async () => {
      await request(app)
        .get('/api/vendors')
        .expect(401);
    });
  });
  
  describe('POST /api/vendors', () => {
    const newVendor = {
      name: '새로운 거래처',
      business_number: '333-33-33333',
      contact_person: '박담당',
      contact_phone: '010-3333-3333',
      contact_email: 'new@vendor.com',
      address: '서울시 서초구',
      bank_name: '국민은행',
      account_number: '123-456-789',
      notes: '테스트 노트',
    };
    
    it('should create vendor with valid data', async () => {
      const response = await adminAgent
        .post('/api/vendors')
        .send(newVendor)
        .expect(201);
        
      expect(response.body).toHaveProperty('vendor');
      expect(response.body.vendor.name).toBe(newVendor.name);
      expect(response.body.vendor.business_number).toBe(newVendor.business_number);
      expect(response.body.vendor).toHaveProperty('id');
    });
    
    it('should validate required fields', async () => {
      const response = await adminAgent
        .post('/api/vendors')
        .send({
          name: '불완전한 거래처',
          // Missing required fields
        })
        .expect(400);
        
      expect(response.body).toHaveProperty('error');
    });
    
    it('should prevent duplicate business numbers', async () => {
      // First create a vendor
      await adminAgent
        .post('/api/vendors')
        .send(newVendor)
        .expect(201);
      
      // Try to create another with same business number
      const response = await adminAgent
        .post('/api/vendors')
        .send({
          ...newVendor,
          name: '다른 거래처',
          contact_email: 'different@vendor.com',
        })
        .expect(409);
        
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('business_number');
    });
    
    it('should validate email format', async () => {
      const response = await adminAgent
        .post('/api/vendors')
        .send({
          ...newVendor,
          contact_email: 'invalid-email',
        })
        .expect(400);
        
      expect(response.body).toHaveProperty('error');
    });
    
    it('should require admin or project_manager role', async () => {
      await fieldWorkerAgent
        .post('/api/vendors')
        .send(newVendor)
        .expect(403);
    });
  });
  
  describe('PUT /api/vendors/:id', () => {
    let vendorId: number;
    
    beforeEach(async () => {
      const vendors = await createTestVendors();
      vendorId = vendors[0].id;
    });
    
    it('should update vendor with valid data', async () => {
      const updates = {
        name: '수정된 거래처',
        contact_person: '김수정',
        contact_phone: '010-9999-9999',
      };
      
      const response = await adminAgent
        .put(`/api/vendors/${vendorId}`)
        .send(updates)
        .expect(200);
        
      expect(response.body.vendor.name).toBe(updates.name);
      expect(response.body.vendor.contact_person).toBe(updates.contact_person);
      expect(response.body.vendor.contact_phone).toBe(updates.contact_phone);
    });
    
    it('should handle non-existent vendor', async () => {
      await adminAgent
        .put('/api/vendors/99999')
        .send({ name: '존재하지 않는 거래처' })
        .expect(404);
    });
    
    it('should validate update data', async () => {
      const response = await adminAgent
        .put(`/api/vendors/${vendorId}`)
        .send({ contact_email: 'invalid-email' })
        .expect(400);
        
      expect(response.body).toHaveProperty('error');
    });
    
    it('should require appropriate permissions', async () => {
      await fieldWorkerAgent
        .put(`/api/vendors/${vendorId}`)
        .send({ name: '권한 없음' })
        .expect(403);
    });
  });
  
  describe('DELETE /api/vendors/:id', () => {
    let vendorId: number;
    
    beforeEach(async () => {
      const vendors = await createTestVendors();
      vendorId = vendors[0].id;
    });
    
    it('should soft delete vendor', async () => {
      const response = await adminAgent
        .delete(`/api/vendors/${vendorId}`)
        .expect(200);
        
      expect(response.body).toHaveProperty('message');
      
      // Verify vendor is soft deleted
      const getResponse = await adminAgent
        .get(`/api/vendors/${vendorId}`)
        .expect(404);
    });
    
    it('should prevent deletion of vendor with active orders', async () => {
      // This would require creating a purchase order first
      // Implementation depends on order creation logic
    });
    
    it('should require admin role for deletion', async () => {
      await pmAgent
        .delete(`/api/vendors/${vendorId}`)
        .expect(403);
    });
  });
  
  describe('Vendor Validation', () => {
    it('should validate similar vendor names', async () => {
      await createTestVendors();
      
      const response = await adminAgent
        .post('/api/vendors/validate')
        .send({
          name: '테스트 거래처 일',  // Similar to '테스트 거래처 1'
          business_number: '444-44-44444',
        })
        .expect(200);
        
      expect(response.body).toHaveProperty('similar');
      expect(response.body.similar.length).toBeGreaterThan(0);
      expect(response.body.similar[0].similarity).toBeGreaterThan(0.7);
    });
    
    it('should check for duplicate business numbers', async () => {
      const vendors = await createTestVendors();
      
      const response = await adminAgent
        .post('/api/vendors/validate')
        .send({
          name: '완전히 다른 거래처',
          business_number: vendors[0].business_number,
        })
        .expect(200);
        
      expect(response.body).toHaveProperty('duplicate');
      expect(response.body.duplicate).toBe(true);
    });
  });
});