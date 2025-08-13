/**
 * Simple Authentication Routes (without session dependencies)
 */

import { Router } from "express";

const router = Router();

// Mock users for authentication
const mockUsers = [
  { 
    id: "admin", 
    username: "admin", 
    email: "admin@company.com", 
    password: "admin123", 
    name: "관리자", 
    role: "admin",
    isActive: true,
    position: "시스템관리자",
    department: "IT팀"
  },
  { 
    id: "manager", 
    username: "manager", 
    email: "manager@company.com", 
    password: "manager123", 
    name: "김부장", 
    role: "project_manager",
    isActive: true,
    position: "프로젝트관리자", 
    department: "건설사업부"
  },
  { 
    id: "user", 
    username: "user", 
    email: "user@company.com", 
    password: "user123", 
    name: "이기사", 
    role: "field_worker",
    isActive: true,
    position: "현장기사",
    department: "현장팀"
  }
];

// Simple login endpoint without sessions
router.post('/simple-auth/login', (req, res) => {
  try {
    console.log("🔐 Simple auth login request:", req.body);
    
    const { username, password, email } = req.body;
    const identifier = username || email;
    
    if (!identifier || !password) {
      return res.status(400).json({ 
        message: "Email/username and password are required",
        success: false 
      });
    }
    
    console.log("🔍 Looking for user with identifier:", identifier);
    
    const user = mockUsers.find(u => 
      u.username === identifier || 
      u.email === identifier
    );
    
    if (!user) {
      console.log("❌ User not found:", identifier);
      return res.status(401).json({ 
        message: "Invalid credentials",
        success: false 
      });
    }
    
    if (!user.isActive) {
      console.log("❌ User inactive:", identifier);
      return res.status(401).json({ 
        message: "Account is deactivated",
        success: false 
      });
    }
    
    if (password !== user.password) {
      console.log("❌ Invalid password for user:", identifier);
      return res.status(401).json({ 
        message: "Invalid credentials",
        success: false 
      });
    }
    
    console.log("✅ Simple auth successful for user:", user.name);
    
    // Return user data (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ 
      message: "Login successful", 
      user: userWithoutPassword,
      success: true
    });
  } catch (error) {
    console.error("Simple auth error:", error);
    res.status(500).json({ 
      message: "Login failed", 
      error: error?.message || "Unknown error",
      success: false 
    });
  }
});

// Simple logout endpoint
router.post('/simple-auth/logout', (req, res) => {
  console.log("🚪 Simple logout request");
  res.json({ 
    message: "Logout successful", 
    success: true 
  });
});

// Simple me endpoint (always returns 401 since no sessions)
router.get('/simple-auth/me', (req, res) => {
  console.log("👤 Simple me request (no session support)");
  res.status(401).json({ 
    message: "Not authenticated", 
    success: false 
  });
});

export default router;