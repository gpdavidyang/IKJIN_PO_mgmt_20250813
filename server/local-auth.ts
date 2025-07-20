import { Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { comparePasswords, generateSessionId } from "./auth-utils";
import { User as BaseUser, InsertLoginAuditLog } from "@shared/schema";
import { DebugLogger } from "./utils/debug-logger";
import { LoginAuditService } from "./utils/login-audit-service";

// Extend User type to ensure id field is available
interface User extends BaseUser {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface AuthSession extends session.Session {
  userId?: string;
}

/**
 * Login endpoint for local authentication
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if account is blocked due to too many failed attempts
    const isBlocked = await LoginAuditService.isAccountBlocked(email);
    if (isBlocked) {
      await LoginAuditService.logFailure(req, email, 'account_disabled');
      return res.status(423).json({ 
        message: "계정이 일시적으로 차단되었습니다. 30분 후 다시 시도해주세요." 
      });
    }

    // Hardcoded test users for development (disabled in production)
    const isProduction = process.env.NODE_ENV === "production" || process.env.VITE_ENVIRONMENT === "production";
    if (!isProduction && (email === "test@ikjin.co.kr" || email === "admin@example.com") && password === "admin123") {
      const testUser: User = {
        id: "test_admin_001",
        email: email,
        password: "admin123", // In production, this should be hashed
        name: "테스트 관리자",
        role: "admin",
        phoneNumber: "010-1234-5678",
        profileImageUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create session
      const authSession = req.session as AuthSession;
      authSession.userId = testUser.id;

      // Log successful login
      await LoginAuditService.logSuccess(req, testUser.id, email, req.sessionID);

      // Return user data (excluding password)
      const { password: _, ...userWithoutPassword } = testUser;
      return res.json({ 
        message: "Login successful", 
        user: userWithoutPassword 
      });
    }

    // Find user by email (for other users)
    let user;
    try {
      user = await storage.getUserByEmail(email);
      if (!user) {
        await LoginAuditService.logFailure(req, email, 'user_not_found');
        return res.status(401).json({ message: "Invalid email or password" });
      }
    } catch (dbError) {
      console.warn("Database not available, only hardcoded users can login");
      await LoginAuditService.logFailure(req, email, 'user_not_found');
      return res.status(401).json({ message: "Login failed" });
    }

    // Check if user account is active
    if (!user.isActive) {
      await LoginAuditService.logFailure(req, email, 'account_disabled');
      return res.status(403).json({ message: "계정이 비활성화되었습니다. 관리자에게 문의하세요." });
    }

    // Verify password
    const isValidPassword = await comparePasswords(password, user.password);
    if (!isValidPassword) {
      await LoginAuditService.logFailure(req, email, 'invalid_password');
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Create session
    const authSession = req.session as AuthSession;
    authSession.userId = user.id;

    // Save session explicitly and return user data
    req.session.save(async (err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Session save failed" });
      }
      
      console.log("Session saved successfully for user:", user.id);
      
      // Log successful login
      await LoginAuditService.logSuccess(req, user.id, email, req.sessionID);
      
      // Return user data (exclude password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    });
  } catch (error) {
    console.error("Login error:", error);
    await LoginAuditService.logFailure(req, email, 'user_not_found');
    res.status(500).json({ message: "Login failed" });
  }
}

/**
 * Logout endpoint
 */
export function logout(req: Request, res: Response) {
  const authSession = req.session as AuthSession;
  authSession.userId = undefined;
  
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    res.json({ message: "Logout successful" });
  });
}

/**
 * Get current user endpoint
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const authSession = req.session as AuthSession;
    console.log("getCurrentUser - Session ID:", req.sessionID);
    console.log("getCurrentUser - Session userId:", authSession.userId);
    
    if (!authSession.userId) {
      console.log("getCurrentUser - No userId in session");
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Handle test user
    if (authSession.userId === "test_admin_001") {
      const testUser: User = {
        id: "test_admin_001",
        email: "test@ikjin.co.kr",
        password: "admin123",
        name: "테스트 관리자",
        role: "admin",
        phoneNumber: "010-1234-5678",
        profileImageUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { password: _, ...userWithoutPassword } = testUser;
      return res.json(userWithoutPassword);
    }

    // Get user from database
    const user = await storage.getUser(authSession.userId);
    if (!user) {
      console.log("getCurrentUser - User not found in database:", authSession.userId);
      authSession.userId = undefined;
      return res.status(401).json({ message: "Invalid session" });
    }

    console.log("getCurrentUser - User found:", user.id);
    
    // Set user on request for compatibility
    req.user = user as User;

    // Return user data (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Failed to get user data" });
  }
}

/**
 * Authentication middleware
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authSession = req.session as AuthSession;
    
    if (!authSession.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Handle test user case
    if (authSession.userId === "test_admin_001") {
      const testUser: User = {
        id: "test_admin_001",
        email: "test@ikjin.co.kr",
        password: "admin123",
        name: "테스트 관리자",
        role: "admin",
        phoneNumber: "010-1234-5678",
        profileImageUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      req.user = testUser;
      return next();
    }

    // Get user from database
    const user = await storage.getUser(authSession.userId);
    if (!user) {
      // Clear invalid session
      authSession.userId = undefined;
      return res.status(401).json({ message: "Invalid session" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole(["admin"]);

/**
 * Admin or order manager middleware
 */
export const requireOrderManager = requireRole(["admin", "order_manager"]);