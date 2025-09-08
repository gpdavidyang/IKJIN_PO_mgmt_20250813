/**
 * Authentication and User Management Routes
 * Handles login, logout, user CRUD operations
 */

import { Router } from "express";
import { storage } from "../storage";
import { login, logout, getCurrentUser } from "../local-auth";
import { requireAuth, requireAdmin } from "../local-auth";
import { OptimizedUserQueries } from "../utils/optimized-queries";
import { logAuditEvent } from "../middleware/audit-logger";
import { UserRegistrationService } from "../services/UserRegistrationService";
import { PasswordResetService } from "../services/PasswordResetService";
import { AuthEmailService } from "../services/AuthEmailService";
import { z } from "zod";
import bcrypt from "bcrypt";
import { 
  securityHeaders,
  sanitizeInput,
  validateRequest,
  secureValidationSchemas,
  logSecurityEvent
} from "../middleware/security";

const router = Router();

// Apply security middleware to all routes
router.use(securityHeaders);
router.use(sanitizeInput);

// Debug endpoint 
router.get('/auth/debug', (req, res) => {
  res.json({ 
    message: "Auth routes are working", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown'
  });
});

// Simple test endpoint without any authentication
router.get('/test/ping', (req, res) => {
  res.json({ 
    message: "Server is alive", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    vercel: process.env.VERCEL || 'false',
    origin: req.get('Origin') || 'none'
  });
});

// JWT authentication test endpoint
router.get('/auth/test-jwt', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const cookies = req.cookies;
    const token = localStorage?.getItem ? 'frontend-only' : null;
    
    console.log('🧪 JWT 테스트 - 요청 정보:', {
      hasAuthHeader: !!authHeader,
      authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      hasCookies: !!cookies,
      cookieKeys: Object.keys(cookies || {}),
      hasAuthTokenCookie: !!(cookies && cookies.auth_token),
      tokenLength: cookies?.auth_token?.length || 0
    });
    
    res.json({
      message: "JWT 테스트 엔드포인트",
      hasAuthHeader: !!authHeader,
      hasCookieToken: !!(cookies && cookies.auth_token),
      cookieTokenLength: cookies?.auth_token?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('JWT 테스트 에러:', error);
    res.status(500).json({ error: 'JWT 테스트 실패' });
  }
});

// Production authentication debug endpoint
router.get('/auth/debug-prod', (req, res) => {
  try {
    const authSession = req.session as any;
    console.log('🔍 Production auth debug:', {
      sessionExists: !!req.session,
      sessionId: req.sessionID,
      sessionUserId: authSession?.userId,
      cookies: req.headers.cookie,
      origin: req.get('Origin'),
      userAgent: req.get('User-Agent'),
      secure: req.secure,
      protocol: req.protocol,
      host: req.get('host')
    });
    
    res.json({
      environment: process.env.NODE_ENV,
      sessionExists: !!req.session,
      sessionId: req.sessionID || null,
      sessionUserId: authSession?.userId || null,
      hasSessionCookie: req.headers.cookie?.includes('connect.sid') || false,
      cookieHeader: req.headers.cookie || null,
      origin: req.get('Origin') || null,
      secure: req.secure,
      protocol: req.protocol,
      host: req.get('host'),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Production auth debug error:', error);
    res.status(500).json({ 
      error: 'Debug failed',
      message: error?.message || 'Unknown error'
    });
  }
});

// Simple test login endpoint without sessions
router.post('/auth/login-simple', (req, res) => {
  try {
    const { username, password, email } = req.body;
    const identifier = username || email;
    
    console.log("🔐 Simple login attempt for:", identifier);
    
    // Mock users
    const users = [
      { id: "admin", username: "admin", email: "admin@company.com", password: "admin123", name: "관리자", role: "admin" },
      { id: "manager", username: "manager", email: "manager@company.com", password: "manager123", name: "김부장", role: "project_manager" },
      { id: "user", username: "user", email: "user@company.com", password: "user123", name: "이기사", role: "field_worker" }
    ];
    
    const user = users.find(u => u.username === identifier || u.email === identifier);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      message: "Login successful (simple mode)", 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error("Simple login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// Simple login without sessions (for testing)
router.post('/auth/login-test', (req, res) => {
  try {
    const { username, password, email } = req.body;
    const identifier = username || email;
    
    console.log("🔐 Test login attempt for:", identifier);
    
    // Mock users
    const users = [
      { id: "admin", username: "admin", email: "admin@company.com", password: "admin123", name: "관리자", role: "admin" },
      { id: "manager", username: "manager", email: "manager@company.com", password: "manager123", name: "김부장", role: "project_manager" },
      { id: "user", username: "user", email: "user@company.com", password: "user123", name: "이기사", role: "field_worker" }
    ];
    
    const user = users.find(u => u.username === identifier || u.email === identifier);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      message: "Login successful (test mode)", 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error("Test login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// SECURITY FIX: Removed global user state - was a critical security vulnerability
// Global state shared authentication across all users/sessions

// Use database-based authentication instead of mock users
router.post('/auth/login', login);
// Use database-based logout function
router.post('/auth/logout', logout);

// Profile update endpoint
router.patch('/auth/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Update user in database
    const updatedUser = await storage.updateUser(userId, { name });
    
    // Return updated user data without password
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// Change password endpoint
router.patch('/auth/change-password', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required" });
    }

    // Get current user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const bcrypt = await import('bcrypt');
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await storage.updateUser(userId, { password: hashedPassword });
    
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

router.get('/logout', (req, res) => {
  // Handle GET logout (redirect after logout) - SECURITY FIX: Remove global state
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: "Logout successful" });
    });
  } else {
    res.json({ message: "Logout successful" });
  }
});

// Force logout endpoint - completely clears all authentication state
router.post('/auth/force-logout', (req, res) => {
  try {
    console.log("🔴 Force logout request - clearing all authentication state");
    
    // SECURITY FIX: Only clear session data, no global state
    
    // Clear session data if it exists
    try {
      if (req.session) {
        req.session.userId = undefined;
        req.session.user = undefined;
        
        // Destroy session completely
        req.session.destroy((err) => {
          if (err) {
            console.log("⚠️ Force session destroy failed (non-fatal):", err);
          } else {
            console.log("✅ Session completely destroyed in force logout");
          }
        });
      }
    } catch (sessionErr) {
      console.log("⚠️ Session clearing failed (non-fatal):", sessionErr);
    }
    
    // Clear any cookies
    res.clearCookie('connect.sid');
    res.clearCookie('sessionId');
    
    console.log("✅ Force logout completed - all authentication state cleared");
    
    res.json({ 
      message: "Force logout successful - all authentication state cleared",
      success: true,
      cleared: {
        session: true,
        cookies: true
      }
    });
  } catch (error) {
    console.error("Force logout error:", error);
    res.status(500).json({ 
      message: "Force logout failed", 
      error: error?.message || "Unknown error",
      success: false 
    });
  }
});

// Authentication status debug endpoint
router.get('/auth/status', (req, res) => {
  try {
    console.log("🔍 Authentication status check");
    
    const authSession = req.session as any;
    const status = {
      sessionExists: !!req.session,
      sessionId: req.sessionID || null,
      sessionUserId: authSession?.userId || null,
      sessionUser: authSession?.user ? {
        id: authSession.user.id,
        name: authSession.user.name,
        role: authSession.user.role
      } : null,
      cookies: req.headers.cookie ? req.headers.cookie.split('; ').length : 0,
      timestamp: new Date().toISOString()
    };
    
    console.log("📊 Current auth status:", status);
    res.json(status);
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ 
      message: "Status check failed", 
      error: error?.message || "Unknown error" 
    });
  }
});

// SECURITY FIX: Use database-based authentication instead of mock session data
router.get('/auth/user', getCurrentUser);

router.get('/auth/me', (req, res) => {
  try {
    console.log("👤 Get me request - LEGACY ENDPOINT");
    
    // Always return null to stop the polling and force frontend to use proper authentication flow
    console.log("🚫 Legacy /auth/me endpoint called - returning null to stop polling");
    res.status(401).json({ 
      message: "Legacy endpoint - please use /api/auth/user", 
      user: null,
      deprecated: true,
      useInstead: "/api/auth/user"
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: "Failed to get user data" });
  }
});

// Permission check endpoint
router.get("/auth/permissions/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    let user = await storage.getUser(userId);
    
    // Handle dev_admin fallback (string ID)
    if (!user && userId === 'dev_admin') {
      user = {
        id: 'dev_admin',
        email: 'admin@company.com',
        name: 'Dev Administrator',
        role: 'admin' as const,
        phoneNumber: null,
        profileImageUrl: null,
        position: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Return permissions based on role
    const permissions = {
      userId: user.id,
      role: user.role,
      permissions: {
        canCreateOrder: true,
        canApproveOrder: ["project_manager", "hq_management", "executive", "admin"].includes(user.role),
        canManageUsers: ["admin"].includes(user.role),
        canManageProjects: ["project_manager", "hq_management", "admin"].includes(user.role),
        canViewReports: ["hq_management", "executive", "admin"].includes(user.role),
        canManageSettings: ["admin"].includes(user.role),
      }
    };
    
    res.json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ message: "Failed to fetch permissions" });
  }
});

// User management routes - SECURITY FIX: Require authentication
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await storage.getUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, name, phoneNumber, role } = req.body;
    
    // Let the storage layer generate standardized ID
    const newUser = await storage.upsertUser({
      email,
      name,
      phoneNumber,
      role: role || "user",
      password: "temp123", // Temporary password - should be changed by user
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    
    // Get current user first
    const currentUser = await storage.getUser(id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user
    const updatedUser = await storage.updateUser(id, updates);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    
    // Get current user first
    const currentUser = await storage.getUser(id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user
    const updatedUser = await storage.updateUser(id, updates);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check if user has any orders before deletion
    const userOrders = await storage.getOrdersByUserId(id);
    if (userOrders && userOrders.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete user with existing orders",
        reason: "data_integrity",
        details: "User has purchase orders that must preserve creator information"
      });
    }

    await storage.deleteUser(id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

router.patch("/users/:id/toggle-active", async (req, res) => {
  try {
    const id = req.params.id;
    const { isActive } = req.body;
    
    const updatedUser = await storage.updateUser(id, { isActive });
    res.json(updatedUser);
  } catch (error) {
    console.error("Error toggling user active status:", error);
    res.status(500).json({ message: "Failed to toggle user active status" });
  }
});

// ============================================================================
// USER REGISTRATION ENDPOINTS
// ============================================================================

// Enhanced registration validation schema
const registrationSchema = z.object({
  email: secureValidationSchemas.email,
  name: secureValidationSchemas.name,
  phoneNumber: secureValidationSchemas.phoneNumber.optional().or(z.literal("")),
  password: secureValidationSchemas.password,
  requestedRole: z.enum(["field_worker", "project_manager", "hq_management", "executive"]).optional(),
});

// Register user endpoint
router.post('/auth/register', async (req, res) => {
  try {
    // Log registration attempt
    logSecurityEvent('REGISTRATION_ATTEMPT', { email: req.body.email }, req, 'low');
    
    // Validate request body
    const validationResult = registrationSchema.safeParse(req.body);
    if (!validationResult.success) {
      logSecurityEvent('REGISTRATION_VALIDATION_FAILED', { 
        email: req.body.email, 
        errors: validationResult.error.issues 
      }, req, 'medium');
      
      return res.status(400).json({
        message: "입력 데이터가 유효하지 않습니다",
        errors: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { email, name, phoneNumber, password, requestedRole } = validationResult.data;

    // Submit registration
    const registration = await UserRegistrationService.submitRegistration({
      email,
      name,
      phoneNumber: phoneNumber || undefined,
      password,
      requestedRole,
    });

    // Send confirmation email to user
    await AuthEmailService.sendRegistrationReceived(registration);

    // Notify admins of new registration
    await AuthEmailService.notifyAdminOfNewRegistration(registration);

    // Log audit event
    try {
      await logAuditEvent({
        eventType: "data_create",
        eventCategory: "auth",
        entityType: "user_registration",
        entityId: registration.id.toString(),
        action: "registration_submitted",
        additionalDetails: {
          email: registration.email,
          name: registration.name,
          requestedRole: registration.requestedRole,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestMethod: req.method,
        requestPath: req.path,
      });
    } catch (auditError) {
      console.error("Audit logging failed:", auditError);
      // Don't fail the registration if audit logging fails
    }

    // Log successful registration
    logSecurityEvent('REGISTRATION_SUCCESS', { 
      email: registration.email,
      registrationId: registration.id 
    }, req, 'low');

    res.status(201).json({
      message: "회원가입 신청이 성공적으로 접수되었습니다. 관리자 승인 후 이메일로 결과를 안내드립니다.",
      registrationId: registration.id,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    
    // Log failed registration attempt
    logSecurityEvent('REGISTRATION_ERROR', { 
      email: req.body.email,
      error: error.message 
    }, req, 'high');
    
    // Log audit event
    try {
      await logAuditEvent({
        eventType: "error",
        eventCategory: "auth",
        entityType: "user_registration",
        action: "registration_failed",
        errorMessage: error.message,
        additionalDetails: {
          email: req.body.email,
          name: req.body.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestMethod: req.method,
        requestPath: req.path,
      });
    } catch (auditError) {
      console.error("Audit logging failed:", auditError);
    }

    res.status(400).json({
      message: error.message || "회원가입 처리 중 오류가 발생했습니다",
    });
  }
});

// Get pending registrations (admin only)
router.get('/admin/pending-registrations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const registrations = await UserRegistrationService.getPendingRegistrations();
    res.json(registrations);
  } catch (error) {
    console.error("Get pending registrations error:", error);
    res.status(500).json({ message: "가입 신청 목록을 가져오는 중 오류가 발생했습니다" });
  }
});

// Get all registrations (admin only)
router.get('/admin/registrations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const registrations = await UserRegistrationService.getAllRegistrations();
    res.json(registrations);
  } catch (error) {
    console.error("Get all registrations error:", error);
    res.status(500).json({ message: "가입 신청 목록을 가져오는 중 오류가 발생했습니다" });
  }
});

// Approve registration (admin only)
router.post('/admin/approve-registration/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const registrationId = parseInt(req.params.id);
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "인증이 필요합니다" });
    }

    if (isNaN(registrationId)) {
      return res.status(400).json({ message: "유효하지 않은 가입 신청 ID입니다" });
    }

    const result = await UserRegistrationService.approveRegistration(registrationId, adminId);

    // Send approval email
    await AuthEmailService.sendRegistrationApproved(result.user);

    // Log audit event
    try {
      await logAuditEvent({
        userId: adminId,
        eventType: "approval_grant",
        eventCategory: "auth",
        entityType: "user_registration",
        entityId: registrationId.toString(),
        action: "registration_approved",
        additionalDetails: {
          approvedUserId: result.user.id,
          approvedUserEmail: result.user.email,
          approvedUserName: result.user.name,
          approvedUserRole: result.user.role,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestMethod: req.method,
        requestPath: req.path,
      });
    } catch (auditError) {
      console.error("Audit logging failed:", auditError);
    }

    res.json({
      message: "가입 신청이 승인되었습니다",
      user: result.user,
      registration: result.registration,
    });
  } catch (error: any) {
    console.error("Approve registration error:", error);
    res.status(400).json({ message: error.message || "가입 승인 처리 중 오류가 발생했습니다" });
  }
});

// Reject registration (admin only)
router.post('/admin/reject-registration/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const registrationId = parseInt(req.params.id);
    const adminId = req.user?.id;
    const { reason } = req.body;

    if (!adminId) {
      return res.status(401).json({ message: "인증이 필요합니다" });
    }

    if (isNaN(registrationId)) {
      return res.status(400).json({ message: "유효하지 않은 가입 신청 ID입니다" });
    }

    const registration = await UserRegistrationService.rejectRegistration(
      registrationId,
      adminId,
      reason
    );

    // Send rejection email
    await AuthEmailService.sendRegistrationRejected(registration, reason);

    // Log audit event
    try {
      await logAuditEvent({
        userId: adminId,
        eventType: "approval_reject",
        eventCategory: "auth",
        entityType: "user_registration",
        entityId: registrationId.toString(),
        action: "registration_rejected",
        additionalDetails: {
          rejectedUserEmail: registration.email,
          rejectedUserName: registration.name,
          rejectionReason: reason,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestMethod: req.method,
        requestPath: req.path,
      });
    } catch (auditError) {
      console.error("Audit logging failed:", auditError);
    }

    res.json({
      message: "가입 신청이 거부되었습니다",
      registration,
    });
  } catch (error: any) {
    console.error("Reject registration error:", error);
    res.status(400).json({ message: error.message || "가입 거부 처리 중 오류가 발생했습니다" });
  }
});

// Delete registration (admin only) - for cleanup
router.delete('/admin/registration/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const registrationId = parseInt(req.params.id);
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "인증이 필요합니다" });
    }

    if (isNaN(registrationId)) {
      return res.status(400).json({ message: "유효하지 않은 가입 신청 ID입니다" });
    }

    const deleted = await UserRegistrationService.deleteRegistration(registrationId);

    if (!deleted) {
      return res.status(404).json({ message: "가입 신청을 찾을 수 없습니다" });
    }

    // Log audit event
    try {
      await logAuditEvent({
        userId: adminId,
        eventType: "data_delete",
        eventCategory: "auth",
        entityType: "user_registration",
        entityId: registrationId.toString(),
        action: "registration_deleted",
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestMethod: req.method,
        requestPath: req.path,
      });
    } catch (auditError) {
      console.error("Audit logging failed:", auditError);
    }

    res.json({ message: "가입 신청이 삭제되었습니다" });
  } catch (error: any) {
    console.error("Delete registration error:", error);
    res.status(400).json({ message: error.message || "가입 신청 삭제 중 오류가 발생했습니다" });
  }
});

// ============================================================================
// PASSWORD RESET ENDPOINTS
// ============================================================================

// Password reset validation schemas
const forgotPasswordSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "토큰이 필요합니다"),
  newPassword: z.string()
    .min(8, "비밀번호는 8글자 이상이어야 합니다")
    .max(128, "비밀번호는 128글자를 초과할 수 없습니다")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다"),
});

// Forgot password - send reset email
router.post('/auth/forgot-password', async (req, res) => {
  try {
    // Validate request body
    const validationResult = forgotPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "유효한 이메일 주소를 입력해주세요",
        errors: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { email } = validationResult.data;

    try {
      // Request password reset
      const { token, user } = await PasswordResetService.requestPasswordReset(email);

      // Send reset email
      const emailSent = await AuthEmailService.sendPasswordReset(user, token, req);
      
      if (!emailSent) {
        console.error("Failed to send password reset email");
        // Don't reveal that email sending failed for security reasons
      }

      // Log audit event
      try {
        await logAuditEvent({
          userId: user.id,
          eventType: "password_change",
          eventCategory: "auth",
          entityType: "password_reset_token",
          action: "password_reset_requested",
          additionalDetails: {
            email: user.email,
            emailSent,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path,
        });
      } catch (auditError) {
        console.error("Audit logging failed:", auditError);
      }

      // Always return success to prevent email enumeration
      res.json({
        message: "비밀번호 재설정 링크를 이메일로 발송했습니다. 이메일을 확인해 주세요.",
      });
    } catch (error: any) {
      // Log failed attempt but still return success message
      console.error("Password reset request error:", error);
      
      try {
        await logAuditEvent({
          eventType: "error",
          eventCategory: "auth",
          action: "password_reset_request_failed",
          errorMessage: error.message,
          additionalDetails: {
            email,
            failureReason: error.message,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path,
        });
      } catch (auditError) {
        console.error("Audit logging failed:", auditError);
      }

      // Always return success to prevent email enumeration
      res.json({
        message: "비밀번호 재설정 링크를 이메일로 발송했습니다. 이메일을 확인해 주세요.",
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "처리 중 오류가 발생했습니다" });
  }
});

// Verify reset token
router.get('/auth/verify-reset-token/:token', async (req, res) => {
  try {
    const token = req.params.token;

    if (!token) {
      return res.status(400).json({ 
        valid: false, 
        message: "토큰이 필요합니다" 
      });
    }

    const verification = await PasswordResetService.verifyResetToken(token);

    if (!verification.isValid) {
      return res.status(400).json({
        valid: false,
        message: verification.errorMessage || "유효하지 않은 토큰입니다",
      });
    }

    // Log verification attempt
    try {
      await logAuditEvent({
        userId: verification.user?.id,
        eventType: "password_change",
        eventCategory: "auth",
        entityType: "password_reset_token",
        action: "reset_token_verified",
        additionalDetails: {
          tokenValid: verification.isValid,
          userEmail: verification.user?.email,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestMethod: req.method,
        requestPath: req.path,
      });
    } catch (auditError) {
      console.error("Audit logging failed:", auditError);
    }

    res.json({
      valid: true,
      message: "유효한 토큰입니다",
      user: {
        id: verification.user?.id,
        email: verification.user?.email,
        name: verification.user?.name,
      },
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    res.status(500).json({ 
      valid: false, 
      message: "토큰 검증 중 오류가 발생했습니다" 
    });
  }
});

// Reset password with token
router.post('/auth/reset-password', async (req, res) => {
  try {
    // Validate request body
    const validationResult = resetPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "입력 데이터가 유효하지 않습니다",
        errors: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { token, newPassword } = validationResult.data;

    // First verify the token to get user info
    const verification = await PasswordResetService.verifyResetToken(token);
    
    if (!verification.isValid || !verification.user) {
      return res.status(400).json({
        success: false,
        message: verification.errorMessage || "유효하지 않은 토큰입니다",
      });
    }

    // Reset the password
    const result = await PasswordResetService.resetPassword(token, newPassword);

    // Log audit event
    try {
      await logAuditEvent({
        userId: verification.user.id,
        eventType: "password_change",
        eventCategory: "auth",
        entityType: "user",
        entityId: verification.user.id,
        action: result.success ? "password_reset_completed" : "password_reset_failed",
        additionalDetails: {
          userEmail: verification.user.email,
          success: result.success,
          failureReason: result.success ? null : result.message,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestMethod: req.method,
        requestPath: req.path,
      });
    } catch (auditError) {
      console.error("Audit logging failed:", auditError);
    }

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다. 새로운 비밀번호로 로그인해 주세요.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ 
      success: false, 
      message: "비밀번호 재설정 중 오류가 발생했습니다" 
    });
  }
});

// Admin endpoint: Get password reset history for a user
router.get('/admin/users/:userId/password-reset-history', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ message: "사용자 ID가 필요합니다" });
    }

    const history = await PasswordResetService.getPasswordResetHistory(userId);
    
    res.json(history);
  } catch (error) {
    console.error("Get password reset history error:", error);
    res.status(500).json({ message: "비밀번호 재설정 이력 조회 중 오류가 발생했습니다" });
  }
});

// Admin endpoint: Cleanup expired tokens
router.post('/admin/cleanup-expired-tokens', requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user?.id;
    const cleanedCount = await PasswordResetService.cleanupExpiredTokens();

    // Log cleanup action
    try {
      await logAuditEvent({
        userId: adminId,
        eventType: "data_delete",
        eventCategory: "auth",
        entityType: "password_reset_token",
        action: "expired_tokens_cleaned",
        additionalDetails: {
          cleanedTokensCount: cleanedCount,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestMethod: req.method,
        requestPath: req.path,
      });
    } catch (auditError) {
      console.error("Audit logging failed:", auditError);
    }

    res.json({
      message: `${cleanedCount}개의 만료된 토큰이 정리되었습니다`,
      cleanedCount,
    });
  } catch (error) {
    console.error("Cleanup expired tokens error:", error);
    res.status(500).json({ message: "토큰 정리 중 오류가 발생했습니다" });
  }
});

// Admin endpoint: Invalidate all tokens for a user
router.post('/admin/users/:userId/invalidate-tokens', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const adminId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ message: "사용자 ID가 필요합니다" });
    }

    await PasswordResetService.invalidateUserTokens(userId);

    // Log token invalidation
    try {
      await logAuditEvent({
        userId: adminId,
        eventType: "security_alert",
        eventCategory: "auth",
        entityType: "password_reset_token",
        entityId: userId,
        action: "user_tokens_invalidated",
        additionalDetails: {
          targetUserId: userId,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestMethod: req.method,
        requestPath: req.path,
      });
    } catch (auditError) {
      console.error("Audit logging failed:", auditError);
    }

    res.json({ message: "사용자의 모든 비밀번호 재설정 토큰이 무효화되었습니다" });
  } catch (error) {
    console.error("Invalidate user tokens error:", error);
    res.status(500).json({ message: "토큰 무효화 중 오류가 발생했습니다" });
  }
});

export default router;