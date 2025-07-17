/**
 * Project Management Routes
 * Handles CRUD operations for construction sites/projects
 */

import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin } from "../temp-auth-fix";
import { insertProjectSchema } from "@shared/schema";
import { OptimizedOrderQueries } from "../utils/optimized-queries";

const router = Router();

// Get all projects
router.get("/projects", async (req, res) => {
  try {
    const projects = await storage.getProjects();
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});

// Get project by ID
router.get("/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const project = await storage.getProject(id);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Failed to fetch project" });
  }
});

// Create new project
router.post('/projects', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    console.log("Project creation request body:", req.body);
    
    // Transform the data to match schema expectations
    const transformedData = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : null,
      endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      totalBudget: req.body.totalBudget ? req.body.totalBudget : null,
    };
    
    console.log("Transformed project data:", transformedData);
    const validatedData = insertProjectSchema.parse(transformedData);
    console.log("Validated project data:", validatedData);
    
    const project = await storage.createProject(validatedData);
    console.log("Created project:", project);
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Failed to create project", error: error.message });
  }
});

// Update project
router.put("/projects/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const projectId = parseInt(req.params.id, 10);
    console.log("🔧 Updating project ID:", projectId);
    console.log("🔧 Update data received:", req.body);

    // Transform budget to number if provided
    const updateData = { ...req.body };
    if (updateData.totalBudget) {
      console.log("🔧 Original totalBudget:", updateData.totalBudget, typeof updateData.totalBudget);
      updateData.totalBudget = parseFloat(updateData.totalBudget);
      console.log("🔧 Converted totalBudget:", updateData.totalBudget, typeof updateData.totalBudget);
    }

    const updatedProject = await storage.updateProject(projectId, updateData);
    console.log("🔧 Project updated successfully:", updatedProject);
    res.json(updatedProject);
  } catch (error) {
    console.error("🔧 Error updating project:", error);
    res.status(500).json({ message: "Failed to update project" });
  }
});

// Delete project
router.delete("/projects/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const projectId = parseInt(req.params.id, 10);
    await storage.deleteProject(projectId);
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Failed to delete project" });
  }
});

// Get project members
router.get("/projects/:id/members", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const members = await storage.getProjectMembers(projectId);
    res.json(members);
  } catch (error) {
    console.error("Error fetching project members:", error);
    res.status(500).json({ message: "Failed to fetch project members" });
  }
});

// Add project member
router.post("/projects/:id/members", requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { userId } = req.body;
    
    await storage.addProjectMember(projectId, userId);
    res.status(201).json({ message: "Member added successfully" });
  } catch (error) {
    console.error("Error adding project member:", error);
    res.status(500).json({ message: "Failed to add project member" });
  }
});

// Remove project member  
router.delete("/projects/:id/members/:userId", requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const userId = req.params.userId;
    
    await storage.removeProjectMember(projectId, userId);
    res.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error removing project member:", error);
    res.status(500).json({ message: "Failed to remove project member" });
  }
});

// Get project statistics
router.get("/projects/:id/stats", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    
    // Get project orders and statistics
    const orders = await OptimizedOrderQueries.getProjectOrders(projectId);
    const totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    
    const stats = {
      totalOrders: orders.length,
      completedOrders,
      pendingOrders: orders.filter(order => order.status === 'pending').length,
      totalAmount,
      completionRate: orders.length > 0 ? Math.round((completedOrders / orders.length) * 100) : 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching project statistics:", error);
    res.status(500).json({ message: "Failed to fetch project statistics" });
  }
});

export default router;