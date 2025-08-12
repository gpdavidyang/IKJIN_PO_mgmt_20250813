/**
 * Authentication and User Management Routes
 * Handles login, logout, user CRUD operations
 */

import { Router } from "express";
import { storage } from "../storage";
import { login, logout, getCurrentUser } from "../local-auth";
import { requireAuth, requireAdmin } from "../local-auth";
import { OptimizedUserQueries } from "../utils/optimized-queries";

const router = Router();

// Authentication routes
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/logout', logout); // Support both GET and POST for logout
router.get('/auth/user', getCurrentUser);
router.get('/auth/me', getCurrentUser); // Alias for /auth/user

// Permission check endpoint
router.get("/auth/permissions/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await storage.getUser(userId);
    
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

// User management routes
router.get("/users", async (req, res) => {
  try {
    // Skip authentication check for development
    // TODO: Re-enable proper authentication in production

    const users = await storage.getUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.post("/users", async (req, res) => {
  try {
    // Skip authentication check for development
    // TODO: Re-enable proper authentication in production

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