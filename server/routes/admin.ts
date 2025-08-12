/**
 * Admin and System Management Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin } from "../local-auth";
import { db } from "../db";
import { approvalWorkflowSettings } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// Positions management
router.get("/positions", async (req, res) => {
  try {
    const positions = await storage.getPositions();
    res.json(positions);
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ message: "Failed to fetch positions" });
  }
});

// UI Terms management
router.get("/ui-terms", async (req, res) => {
  try {
    const terms = await storage.getUiTerms();
    res.json(terms);
  } catch (error) {
    console.error("Error fetching UI terms:", error);
    res.status(500).json({ message: "Failed to fetch UI terms" });
  }
});

router.post("/ui-terms", requireAuth, requireAdmin, async (req, res) => {
  try {
    const term = await storage.createUiTerm(req.body);
    res.status(201).json(term);
  } catch (error) {
    console.error("Error creating UI term:", error);
    res.status(500).json({ message: "Failed to create UI term" });
  }
});

// Template management
router.get("/templates", async (req, res) => {
  try {
    const templates = await storage.getOrderTemplates();
    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});

router.get("/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const template = await storage.getOrderTemplate(id);
    
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    res.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

router.post("/templates", requireAuth, async (req, res) => {
  try {
    const template = await storage.createOrderTemplate(req.body);
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ message: "Failed to create template" });
  }
});

router.put("/templates/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const template = await storage.updateOrderTemplate(id, req.body);
    res.json(template);
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ message: "Failed to update template" });
  }
});

router.delete("/templates/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await storage.deleteOrderTemplate(id);
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ message: "Failed to delete template" });
  }
});

// Approval Workflow Settings
router.get("/approval-workflow-settings", requireAuth, requireAdmin, async (req, res) => {
  try {
    // For now, we'll get settings for company_id = 1 or null (global settings)
    const settings = await db
      .select()
      .from(approvalWorkflowSettings)
      .where(
        and(
          eq(approvalWorkflowSettings.isActive, true),
          eq(approvalWorkflowSettings.companyId, 1)
        )
      )
      .limit(1);

    if (settings.length === 0) {
      // Return default settings if none exist
      res.json({
        id: 0,
        companyId: 1,
        approvalMode: "staged",
        directApprovalRoles: [],
        stagedApprovalThresholds: {
          field_worker: 0,
          project_manager: 5000000,
          hq_management: 30000000,
          executive: 100000000,
          admin: 999999999
        },
        requireAllStages: true,
        skipLowerStages: false,
        isActive: true
      });
    } else {
      res.json(settings[0]);
    }
  } catch (error) {
    console.error("Error fetching workflow settings:", error);
    res.status(500).json({ error: "Failed to fetch workflow settings" });
  }
});

// Update workflow settings
router.put("/approval-workflow-settings", requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      approvalMode,
      directApprovalRoles,
      stagedApprovalThresholds,
      requireAllStages,
      skipLowerStages
    } = req.body;

    // Check if settings exist
    const existing = await db
      .select()
      .from(approvalWorkflowSettings)
      .where(eq(approvalWorkflowSettings.companyId, 1))
      .limit(1);

    if (existing.length === 0) {
      // Create new settings
      const [newSettings] = await db
        .insert(approvalWorkflowSettings)
        .values({
          companyId: 1,
          approvalMode,
          directApprovalRoles,
          stagedApprovalThresholds,
          requireAllStages,
          skipLowerStages,
          isActive: true,
          createdBy: req.user!.id
        })
        .returning();

      res.json(newSettings);
    } else {
      // Update existing settings
      const [updatedSettings] = await db
        .update(approvalWorkflowSettings)
        .set({
          approvalMode,
          directApprovalRoles,
          stagedApprovalThresholds,
          requireAllStages,
          skipLowerStages,
          updatedAt: new Date()
        })
        .where(eq(approvalWorkflowSettings.id, existing[0].id))
        .returning();

      res.json(updatedSettings);
    }
  } catch (error) {
    console.error("Error updating workflow settings:", error);
    res.status(500).json({ error: "Failed to update workflow settings" });
  }
});

export default router;