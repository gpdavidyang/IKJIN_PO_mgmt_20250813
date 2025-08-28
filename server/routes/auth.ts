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

const router = Router();

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

export default router;