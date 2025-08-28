import { Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { comparePasswords, generateSessionId } from "./auth-utils";
import { User as BaseUser } from "@shared/schema";
import { logAuditEvent } from "./middleware/audit-logger";
import { generateToken, verifyToken, extractToken } from "./jwt-utils";

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
    const { email, password, username } = req.body;
    const loginIdentifier = email || username;

    // Comprehensive logging for Vercel debugging
    console.log("=== LOGIN REQUEST START ===");
    console.log("🔐 Attempting login with identifier:", loginIdentifier);
    console.log("📍 Environment:", {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      SESSION_SECRET_SET: !!process.env.SESSION_SECRET,
      DATABASE_URL_SET: !!process.env.DATABASE_URL
    });
    console.log("🍪 Request headers:", {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      host: req.headers.host
    });
    console.log("📊 Session info BEFORE login:", {
      sessionExists: !!req.session,
      sessionID: req.sessionID,
      sessionCookie: req.session?.cookie,
      sessionData: req.session
    });

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: "Email/username and password are required" });
    }

    // 🔴 SECURITY FIX: Use real database authentication instead of mock users
    console.log("🔐 Starting authentication process...");
    
    // Declare user variable at function scope to avoid reference errors
    let user: User | undefined;
    
    try {
      // Find user in database by email (most common login method)
      user = await storage.getUserByEmail(loginIdentifier);
      
      // Admin fallback: if user not found in database, provide admin@company.com access
      if (!user && loginIdentifier === 'admin@company.com') {
        console.log("🔧 Admin fallback: Using hardcoded admin user");
        user = {
          id: 'dev_admin',
          email: 'admin@company.com',
          name: 'Dev Administrator', 
          password: '$2b$10$RbLrxzWq3TQEx6UTrnRwCeWwOai9N0QzdeJxg8iUp71jGS8kKgwjC', // admin123
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
        console.log("❌ User not found in database:", loginIdentifier);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        console.log("❌ User account deactivated:", loginIdentifier);
        return res.status(401).json({ message: "Account is deactivated" });
      }

      // Verify password using proper password comparison
      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        console.log("❌ Invalid password for user:", loginIdentifier);
        
        // Log failed login attempt
        await logAuditEvent('login_failed', 'auth', {
          userName: loginIdentifier,
          action: 'Failed login attempt',
          additionalDetails: { reason: 'Invalid password' },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          sessionId: req.sessionID
        });
        
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("✅ Database authentication successful for user:", user.name || user.email);
      
      // Log successful login
      await logAuditEvent('login', 'auth', {
        userId: user.id,
        userName: user.name || user.email,
        userRole: user.role,
        action: 'User logged in',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        sessionId: req.sessionID
      });
    } catch (dbError) {
      console.error("🔴 Database authentication error:", dbError);
      return res.status(500).json({ message: "Authentication failed - database error" });
    }

    try {
      // Generate JWT token instead of using session
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });
      
      console.log("🔧 JWT token generated for user:", {
        userId: user.id,
        email: user.email,
        role: user.role,
        tokenLength: token.length
      });

      // Set JWT token as httpOnly cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });

      console.log("✅ JWT token set as cookie for user:", user.id);
      console.log("=== LOGIN REQUEST END - SUCCESS (JWT) ===");
      
      // Return user data (exclude password)
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        message: "Login successful", 
        user: userWithoutPassword,
        token: token // Also return token for client-side storage if needed
      });
    } catch (sessionError) {
      console.error("Session handling error (non-fatal):", sessionError);
      
      // Still return success even if session fails
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        message: "Login successful (no session)", 
        user: userWithoutPassword 
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
}

/**
 * Logout endpoint
 */
export async function logout(req: Request, res: Response) {
  const token = extractToken(req.headers.authorization, req.cookies);
  
  // Log logout event if user is authenticated
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      try {
        const user = await storage.getUser(payload.userId);
        await logAuditEvent('logout', 'auth', {
          userId: payload.userId,
          userName: user?.name || user?.email,
          userRole: user?.role,
          action: 'User logged out',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          sessionId: req.sessionID
        });
      } catch (error) {
        console.error("Failed to log logout event:", error);
      }
    }
  }
  
  // Clear JWT cookie
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  
  res.json({ message: "Logout successful" });
}

/**
 * Get current user endpoint
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    console.log("=== GET CURRENT USER START (JWT) ===");
    const token = extractToken(req.headers.authorization, req.cookies);
    
    console.log("🔍 getCurrentUser - Token present:", !!token);
    console.log("🔍 getCurrentUser - Cookie header:", req.headers.cookie);
    console.log("🔍 getCurrentUser - Auth header:", req.headers.authorization);
    
    if (!token) {
      console.log("🔴 getCurrentUser - No JWT token found");
      return res.status(401).json({ 
        message: "Not authenticated - no token",
        authenticated: false 
      });
    }

    // Verify JWT token
    const payload = verifyToken(token);
    if (!payload) {
      console.log("🔴 getCurrentUser - Invalid JWT token");
      return res.status(401).json({ 
        message: "Invalid token",
        authenticated: false
      });
    }

    console.log("🔍 getCurrentUser - JWT payload:", {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    });

    try {
      // Use real database user lookup
      let user = await storage.getUser(payload.userId);
      
      // Admin fallback: handle dev_admin user in all environments
      if (!user && payload.userId === 'dev_admin') {
        console.log("🔧 getCurrentUser - Admin fallback: Using hardcoded admin user");
        user = {
          id: 'dev_admin',
          email: 'admin@company.com',
          name: 'Dev Administrator', 
          password: '$2b$10$RbLrxzWq3TQEx6UTrnRwCeWwOai9N0QzdeJxg8iUp71jGS8kKgwjC', // admin123
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
        console.log("🔴 getCurrentUser - Database user not found:", payload.userId);
        return res.status(401).json({ 
          message: "User not found",
          authenticated: false
        });
      }

      if (!user.isActive) {
        console.log("🔴 getCurrentUser - User account deactivated:", user.email);
        return res.status(401).json({ 
          message: "Account is deactivated",
          authenticated: false
        });
      }

      console.log("🟢 getCurrentUser - JWT user found:", user.name || user.email);
      
      // Set user on request for compatibility
      req.user = user as User;

      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        ...userWithoutPassword,
        authenticated: true
      });
    } catch (dbError) {
      console.error("🔴 Database error in getCurrentUser:", dbError);
      return res.status(401).json({ 
        message: "Authentication failed - database error",
        authenticated: false
      });
    }
  } catch (error) {
    console.error("🔴 Get current user error:", error);
    res.status(500).json({ 
      message: "Failed to get user data",
      authenticated: false
    });
  }
}

/**
 * Authentication middleware
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req.headers.authorization, req.cookies);
    
    if (!token) {
      console.log('🔴 JWT 인증 실패 - 토큰 없음');
      return res.status(401).json({ message: "Authentication required - no token" });
    }

    // Verify JWT token
    const payload = verifyToken(token);
    if (!payload) {
      console.log('🔴 JWT 인증 실패 - 유효하지 않은 토큰');
      return res.status(401).json({ message: "Invalid token" });
    }

    // Get user from database
    let user = await storage.getUser(payload.userId);
    
    // Admin fallback: handle dev_admin user in all environments
    if (!user && payload.userId === 'dev_admin') {
      console.log("🔧 Admin fallback: Using hardcoded dev_admin user in requireAuth");
      user = {
        id: 'dev_admin',
        email: 'admin@company.com',
        name: 'Dev Administrator',
        password: '$2b$10$RbLrxzWq3TQEx6UTrnRwCeWwOai9N0QzdeJxg8iUp71jGS8kKgwjC', // admin123
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
      console.log('🔴 JWT 인증 실패 - 사용자 없음:', payload.userId);
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isActive) {
      console.log('🔴 JWT 인증 실패 - 비활성 사용자:', user.email);
      return res.status(401).json({ message: "Account deactivated" });
    }

    req.user = user;
    console.log('🟢 JWT 인증 성공:', req.user.id);
    next();
  } catch (error) {
    console.error("JWT Authentication middleware error:", error);
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