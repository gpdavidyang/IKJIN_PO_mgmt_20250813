/**
 * Approval Authorities Management Routes
 * 승인 권한 관리 라우터
 */

import { Router } from "express";
import { requireAuth, requireRole } from "../local-auth";
import { db } from "../db";
import { 
  approvalAuthorities,
  users,
  insertApprovalAuthoritySchema,
  ApprovalAuthority
} from "../../shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Get all approval authorities
router.get("/approval-authorities", requireAuth, requireRole(["admin"]), async (req, res) => {
  try {
    console.log("📋 Fetching approval authorities...");
    
    const authorities = await db
      .select({
        id: approvalAuthorities.id,
        role: approvalAuthorities.role,
        maxAmount: approvalAuthorities.maxAmount,
        description: approvalAuthorities.description,
        isActive: approvalAuthorities.isActive,
        createdAt: approvalAuthorities.createdAt,
        updatedAt: approvalAuthorities.updatedAt
      })
      .from(approvalAuthorities)
      .orderBy(desc(approvalAuthorities.maxAmount));
    
    const formattedAuthorities = authorities.map(auth => ({
      ...auth,
      maxAmount: parseFloat(auth.maxAmount),
      createdAt: auth.createdAt?.toISOString(),
      updatedAt: auth.updatedAt?.toISOString()
    }));
    
    console.log(`✅ Successfully returning ${formattedAuthorities.length} approval authorities`);
    res.json(formattedAuthorities);
  } catch (error) {
    console.error("❌ Error fetching approval authorities:", error);
    res.status(500).json({ 
      message: "Failed to fetch approval authorities",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Create new approval authority
router.post("/approval-authorities", requireAuth, requireRole(["admin"]), async (req, res) => {
  try {
    console.log("📝 Creating new approval authority:", req.body);
    
    const validatedData = insertApprovalAuthoritySchema.parse(req.body);
    
    // Check if authority for this role already exists
    const existingAuthority = await db
      .select()
      .from(approvalAuthorities)
      .where(
        and(
          eq(approvalAuthorities.role, validatedData.role!),
          eq(approvalAuthorities.isActive, true)
        )
      )
      .limit(1);
    
    if (existingAuthority.length > 0) {
      return res.status(400).json({
        message: "해당 역할에 대한 승인 권한이 이미 존재합니다"
      });
    }
    
    const result = await db
      .insert(approvalAuthorities)
      .values(validatedData)
      .returning();
    
    const newAuthority = {
      ...result[0],
      maxAmount: parseFloat(result[0].maxAmount),
      createdAt: result[0].createdAt?.toISOString(),
      updatedAt: result[0].updatedAt?.toISOString()
    };
    
    console.log("✅ Successfully created approval authority:", newAuthority.id);
    res.status(201).json(newAuthority);
  } catch (error) {
    console.error("❌ Error creating approval authority:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "입력 데이터가 올바르지 않습니다",
        details: error.errors
      });
    }
    res.status(500).json({ 
      message: "Failed to create approval authority",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Update approval authority
router.put("/approval-authorities/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    console.log(`📝 Updating approval authority ${id}:`, req.body);
    
    const validatedData = insertApprovalAuthoritySchema.parse(req.body);
    
    const result = await db
      .update(approvalAuthorities)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(approvalAuthorities.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        message: "승인 권한을 찾을 수 없습니다"
      });
    }
    
    const updatedAuthority = {
      ...result[0],
      maxAmount: parseFloat(result[0].maxAmount),
      createdAt: result[0].createdAt?.toISOString(),
      updatedAt: result[0].updatedAt?.toISOString()
    };
    
    console.log("✅ Successfully updated approval authority:", id);
    res.json(updatedAuthority);
  } catch (error) {
    console.error("❌ Error updating approval authority:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "입력 데이터가 올바르지 않습니다",
        details: error.errors
      });
    }
    res.status(500).json({ 
      message: "Failed to update approval authority",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Delete (deactivate) approval authority
router.delete("/approval-authorities/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    console.log(`🗑️ Deactivating approval authority ${id}`);
    
    const result = await db
      .update(approvalAuthorities)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(approvalAuthorities.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        message: "승인 권한을 찾을 수 없습니다"
      });
    }
    
    console.log("✅ Successfully deactivated approval authority:", id);
    res.json({
      message: "승인 권한이 비활성화되었습니다"
    });
  } catch (error) {
    console.error("❌ Error deactivating approval authority:", error);
    res.status(500).json({ 
      message: "Failed to deactivate approval authority",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Get approval authority for specific role
router.get("/approval-authorities/role/:role", requireAuth, requireRole(["admin", "executive", "hq_management", "project_manager"]), async (req, res) => {
  try {
    const { role } = req.params;
    console.log(`📋 Fetching approval authority for role: ${role}`);
    
    const authority = await db
      .select()
      .from(approvalAuthorities)
      .where(
        and(
          eq(approvalAuthorities.role, role as any),
          eq(approvalAuthorities.isActive, true)
        )
      )
      .limit(1);
    
    if (authority.length === 0) {
      return res.json({
        role,
        maxAmount: 0,
        hasAuthority: false,
        message: "해당 역할에 대한 승인 권한이 설정되지 않았습니다"
      });
    }
    
    const result = {
      ...authority[0],
      maxAmount: parseFloat(authority[0].maxAmount),
      hasAuthority: true,
      createdAt: authority[0].createdAt?.toISOString(),
      updatedAt: authority[0].updatedAt?.toISOString()
    };
    
    console.log(`✅ Found approval authority for ${role}: max ${result.maxAmount}`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching role approval authority:", error);
    res.status(500).json({ 
      message: "Failed to fetch role approval authority",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Check if user can approve specific amount
router.post("/approval-authorities/check-permission", requireAuth, requireRole(["admin", "executive", "hq_management", "project_manager"]), async (req, res) => {
  try {
    const { role, amount, userId } = req.body;
    const checkRole = role || req.user?.role;
    const checkAmount = parseFloat(amount);
    
    console.log(`🔍 Checking approval permission - Role: ${checkRole}, Amount: ${checkAmount}`);
    
    if (!checkRole || isNaN(checkAmount)) {
      return res.status(400).json({
        message: "역할과 금액 정보가 필요합니다"
      });
    }
    
    // Get approval authority for the role
    const authority = await db
      .select()
      .from(approvalAuthorities)
      .where(
        and(
          eq(approvalAuthorities.role, checkRole as any),
          eq(approvalAuthorities.isActive, true)
        )
      )
      .limit(1);
    
    let canApprove = false;
    let maxAmount = 0;
    let message = "";
    
    if (authority.length === 0) {
      // No specific authority found, default behavior
      canApprove = checkRole === 'admin';
      message = canApprove 
        ? "관리자는 모든 금액을 승인할 수 있습니다" 
        : "해당 역할에 대한 승인 권한이 설정되지 않았습니다";
    } else {
      maxAmount = parseFloat(authority[0].maxAmount);
      canApprove = checkAmount <= maxAmount;
      message = canApprove 
        ? `승인 가능 (한도: ${maxAmount.toLocaleString()}원)` 
        : `승인 불가 (한도 초과: ${maxAmount.toLocaleString()}원)`;
    }
    
    const result = {
      canApprove,
      role: checkRole,
      amount: checkAmount,
      maxAmount,
      message,
      hasAuthority: authority.length > 0
    };
    
    console.log(`✅ Permission check result:`, result);
    res.json(result);
  } catch (error) {
    console.error("❌ Error checking approval permission:", error);
    res.status(500).json({ 
      message: "Failed to check approval permission",
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

export default router;