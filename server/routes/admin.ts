/**
 * Admin and System Management Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin } from "../local-auth";

const router = Router();

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

export default router;