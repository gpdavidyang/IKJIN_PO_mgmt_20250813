import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { comparePasswords } from '../server/auth-utils';
import { login, logout, getCurrentUser, requireAuth } from '../server/local-auth';
import { LoginAuditService } from '../server/utils/login-audit-service';
import { storage } from '../server/storage';
import { Request, Response } from 'express';

// Mock dependencies
jest.mock('../server/storage');
jest.mock('../server/utils/login-audit-service');

describe('Authentication System', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: {},
      session: {} as any,
      sessionID: 'test-session-id',
      user: undefined,
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Utilities', () => {
    describe('comparePasswords', () => {
      it('should return true for matching passwords', async () => {
        const password = 'testpassword';
        const hashedPassword = '$2b$10$test'; // Mock hash
        
        // Mock bcrypt compare
        const bcrypt = await import('bcrypt');
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
        
        const result = await comparePasswords(password, hashedPassword);
        expect(result).toBe(true);
      });

      it('should return false for non-matching passwords', async () => {
        const password = 'testpassword';
        const hashedPassword = '$2b$10$test';
        
        const bcrypt = await import('bcrypt');
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
        
        const result = await comparePasswords(password, hashedPassword);
        expect(result).toBe(false);
      });
    });
  });

  describe('Login Function', () => {
    it('should return 400 if email or password is missing', async () => {
      mockRequest.body = { email: 'test@example.com' }; // Missing password
      
      await login(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Email and password are required'
      });
    });

    it('should return 423 if account is blocked', async () => {
      mockRequest.body = { email: 'test@example.com', password: 'password' };
      
      // Mock blocked account
      (LoginAuditService.isAccountBlocked as jest.Mock).mockResolvedValue(true);
      
      await login(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(423);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: '계정이 일시적으로 차단되었습니다. 30분 후 다시 시도해주세요.'
      });
    });

    it('should login successfully with test account in development', async () => {
      mockRequest.body = { email: 'test@ikjin.co.kr', password: 'admin123' };
      mockRequest.session = { save: jest.fn((callback) => callback()) } as any;
      
      // Mock development environment
      process.env.NODE_ENV = 'development';
      (LoginAuditService.isAccountBlocked as jest.Mock).mockResolvedValue(false);
      (LoginAuditService.logSuccess as jest.Mock).mockResolvedValue(undefined);
      
      await login(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Login successful',
        user: expect.objectContaining({
          id: 'test_admin_001',
          email: 'test@ikjin.co.kr',
          name: '테스트 관리자',
          role: 'admin'
        })
      });
    });

    it('should return 401 for invalid credentials', async () => {
      mockRequest.body = { email: 'test@example.com', password: 'wrongpassword' };
      
      (LoginAuditService.isAccountBlocked as jest.Mock).mockResolvedValue(false);
      (storage.getUserByEmail as jest.Mock).mockResolvedValue(null);
      
      await login(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid email or password'
      });
    });

    it('should login successfully with valid database user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        password: '$2b$10$hashedpassword',
        name: '사용자',
        role: 'project_manager',
        isActive: true
      };
      
      mockRequest.body = { email: 'user@example.com', password: 'password' };
      mockRequest.session = { save: jest.fn((callback) => callback()) } as any;
      
      (LoginAuditService.isAccountBlocked as jest.Mock).mockResolvedValue(false);
      (storage.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      
      const bcrypt = await import('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      
      await login(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
          email: 'user@example.com',
          name: '사용자',
          role: 'project_manager'
        })
      );
    });
  });

  describe('Logout Function', () => {
    it('should logout successfully', () => {
      mockRequest.session = {
        destroy: jest.fn((callback) => callback()),
        userId: 'user-123'
      } as any;
      
      logout(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logout successful'
      });
    });

    it('should handle logout error', () => {
      mockRequest.session = {
        destroy: jest.fn((callback) => callback(new Error('Session error'))),
        userId: 'user-123'
      } as any;
      
      logout(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logout failed'
      });
    });
  });

  describe('Get Current User', () => {
    it('should return 401 if not authenticated', async () => {
      mockRequest.session = {} as any;
      
      await getCurrentUser(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Not authenticated'
      });
    });

    it('should return test user data', async () => {
      mockRequest.session = { userId: 'test_admin_001' } as any;
      
      await getCurrentUser(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test_admin_001',
          email: 'test@ikjin.co.kr',
          name: '테스트 관리자',
          role: 'admin'
        })
      );
    });

    it('should return database user data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: '사용자',
        role: 'project_manager'
      };
      
      mockRequest.session = { userId: 'user-123' } as any;
      (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
      
      await getCurrentUser(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
          email: 'user@example.com',
          name: '사용자',
          role: 'project_manager'
        })
      );
    });
  });

  describe('Require Auth Middleware', () => {
    it('should return 401 if not authenticated', async () => {
      mockRequest.session = {} as any;
      
      await requireAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Authentication required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() if authenticated with test user', async () => {
      mockRequest.session = { userId: 'test_admin_001' } as any;
      
      await requireAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.user).toEqual(
        expect.objectContaining({
          id: 'test_admin_001',
          role: 'admin'
        })
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() if authenticated with database user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: '사용자',
        role: 'project_manager'
      };
      
      mockRequest.session = { userId: 'user-123' } as any;
      (storage.getUser as jest.Mock).mockResolvedValue(mockUser);
      
      await requireAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 if user not found in database', async () => {
      mockRequest.session = { userId: 'invalid-user' } as any;
      (storage.getUser as jest.Mock).mockResolvedValue(null);
      
      await requireAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid session'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});