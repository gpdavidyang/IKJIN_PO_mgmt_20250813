import request from 'supertest';
import { Express } from 'express';
import { createTestUsers, cleanupTestData, testUsers } from './utils/test-helpers';
import { createApp } from '../server/app'; // Assuming app is exported

describe('Authentication System', () => {
  let app: Express;
  
  beforeAll(async () => {
    // Initialize Express app
    app = createApp();
    
    // Create test users
    await createTestUsers();
  });
  
  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });
  
  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.admin.email,
          password: testUsers.admin.password,
        });
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUsers.admin.email);
      expect(response.body.user.role).toBe(testUsers.admin.role);
      expect(response.body.user).not.toHaveProperty('password');
    });
    
    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.admin.email,
          password: 'wrongpassword',
        });
        
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'somepassword',
        });
        
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'somepassword',
        });
        
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should logout successfully when logged in', async () => {
      const agent = request.agent(app);
      
      // First login
      await agent
        .post('/api/auth/login')
        .send({
          email: testUsers.admin.email,
          password: testUsers.admin.password,
        })
        .expect(200);
      
      // Then logout
      const response = await agent
        .post('/api/auth/logout')
        .expect(200);
        
      expect(response.body).toHaveProperty('message');
      
      // Verify session is destroyed
      const profileResponse = await agent
        .get('/api/auth/profile')
        .expect(401);
    });
    
    it('should handle logout when not logged in', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);
        
      expect(response.body).toHaveProperty('message');
    });
  });
  
  describe('GET /api/auth/profile', () => {
    it('should return user profile when authenticated', async () => {
      const agent = request.agent(app);
      
      // Login first
      await agent
        .post('/api/auth/login')
        .send({
          email: testUsers.projectManager.email,
          password: testUsers.projectManager.password,
        })
        .expect(200);
      
      // Get profile
      const response = await agent
        .get('/api/auth/profile')
        .expect(200);
        
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUsers.projectManager.email);
      expect(response.body.user.role).toBe(testUsers.projectManager.role);
      expect(response.body.user).not.toHaveProperty('password');
    });
    
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);
        
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('Session Management', () => {
    it('should maintain session across multiple requests', async () => {
      const agent = request.agent(app);
      
      // Login
      await agent
        .post('/api/auth/login')
        .send({
          email: testUsers.fieldWorker.email,
          password: testUsers.fieldWorker.password,
        })
        .expect(200);
      
      // Make multiple authenticated requests
      for (let i = 0; i < 3; i++) {
        const response = await agent
          .get('/api/auth/profile')
          .expect(200);
          
        expect(response.body.user.email).toBe(testUsers.fieldWorker.email);
      }
    });
    
    it('should handle session expiration', async () => {
      // This would require mocking session expiration
      // Implementation depends on session configuration
    });
  });
  
  describe('Role-Based Access Control', () => {
    it('should allow admin access to admin endpoints', async () => {
      const agent = request.agent(app);
      
      // Login as admin
      await agent
        .post('/api/auth/login')
        .send({
          email: testUsers.admin.email,
          password: testUsers.admin.password,
        })
        .expect(200);
      
      // Access admin endpoint
      const response = await agent
        .get('/api/admin/users')
        .expect(200);
    });
    
    it('should deny non-admin access to admin endpoints', async () => {
      const agent = request.agent(app);
      
      // Login as field worker
      await agent
        .post('/api/auth/login')
        .send({
          email: testUsers.fieldWorker.email,
          password: testUsers.fieldWorker.password,
        })
        .expect(200);
      
      // Try to access admin endpoint
      const response = await agent
        .get('/api/admin/users')
        .expect(403);
        
      expect(response.body).toHaveProperty('error');
    });
  });
});