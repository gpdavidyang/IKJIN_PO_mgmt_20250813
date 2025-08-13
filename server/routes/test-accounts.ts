/**
 * Test Accounts Management Routes
 * Provides endpoints for easy account switching during testing
 */

import { Router } from "express";

const router = Router();

// Test users data
const testUsers = [
  { 
    id: "admin", 
    username: "admin", 
    email: "admin@company.com", 
    password: "admin123", 
    name: "관리자", 
    role: "admin",
    description: "시스템 관리자 - 모든 권한",
    features: ["사용자 관리", "시스템 설정", "모든 데이터 접근"]
  },
  { 
    id: "manager", 
    username: "manager", 
    email: "manager@company.com", 
    password: "manager123", 
    name: "김부장", 
    role: "project_manager",
    description: "프로젝트 관리자 - 발주 승인 권한",
    features: ["발주서 승인", "프로젝트 관리", "리포트 조회"]
  },
  { 
    id: "user", 
    username: "user", 
    email: "user@company.com", 
    password: "user123", 
    name: "이기사", 
    role: "field_worker",
    description: "현장 작업자 - 발주서 작성 권한",
    features: ["발주서 작성", "프로젝트 조회", "기본 기능"]
  }
];

// Get all available test accounts
router.get("/test-accounts", (req, res) => {
  try {
    console.log("📋 Fetching available test accounts");
    
    // Return accounts without passwords for security
    const accountsInfo = testUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      description: user.description,
      features: user.features
    }));
    
    console.log(`✅ Returning ${accountsInfo.length} test accounts`);
    res.json({
      accounts: accountsInfo,
      instructions: {
        login: "Use POST /api/auth/login with username/email and password",
        forceLogout: "Use POST /api/auth/force-logout to clear all auth state",
        quickLogin: "Use POST /api/test-accounts/quick-login with just the account ID"
      }
    });
  } catch (error) {
    console.error("❌ Error fetching test accounts:", error);
    res.status(500).json({ 
      message: "Failed to fetch test accounts", 
      error: error?.message 
    });
  }
});

// Quick login endpoint for testing
router.post("/test-accounts/quick-login", (req, res) => {
  try {
    const { accountId } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ 
        message: "Account ID is required",
        availableAccounts: testUsers.map(u => ({ id: u.id, name: u.name, role: u.role }))
      });
    }
    
    console.log("⚡ Quick login request for account:", accountId);
    
    const user = testUsers.find(u => u.id === accountId);
    
    if (!user) {
      return res.status(404).json({ 
        message: "Test account not found",
        availableAccounts: testUsers.map(u => ({ id: u.id, name: u.name, role: u.role }))
      });
    }
    
    console.log("✅ Quick login successful for:", user.name);
    
    // Return login credentials for the frontend to use
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      message: `Quick login credentials for ${user.name}`,
      user: userWithoutPassword,
      loginCredentials: {
        username: user.username,
        email: user.email,
        password: user.password
      },
      instructions: "Use these credentials with POST /api/auth/login"
    });
  } catch (error) {
    console.error("❌ Quick login error:", error);
    res.status(500).json({ 
      message: "Quick login failed", 
      error: error?.message 
    });
  }
});

// Account switch endpoint (combines logout + login)
router.post("/test-accounts/switch-to", (req, res) => {
  try {
    const { accountId } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ 
        message: "Account ID is required",
        availableAccounts: testUsers.map(u => ({ id: u.id, name: u.name, role: u.role }))
      });
    }
    
    console.log("🔄 Account switch request to:", accountId);
    
    const user = testUsers.find(u => u.id === accountId);
    
    if (!user) {
      return res.status(404).json({ 
        message: "Test account not found",
        availableAccounts: testUsers.map(u => ({ id: u.id, name: u.name, role: u.role }))
      });
    }
    
    // Clear current authentication state (similar to force logout)
    // Note: In a real implementation, this would clear the global state
    // For now, return instructions for the frontend
    
    console.log("✅ Account switch prepared for:", user.name);
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      message: `Ready to switch to ${user.name}`,
      targetUser: userWithoutPassword,
      instructions: {
        step1: "Call POST /api/auth/force-logout first",
        step2: `Then call POST /api/auth/login with username: "${user.username}" and password: "${user.password}"`
      },
      autoLoginData: {
        username: user.username,
        password: user.password
      }
    });
  } catch (error) {
    console.error("❌ Account switch error:", error);
    res.status(500).json({ 
      message: "Account switch failed", 
      error: error?.message 
    });
  }
});

export default router;