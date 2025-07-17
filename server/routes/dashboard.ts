/**
 * Dashboard and Analytics Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { OptimizedDashboardQueries } from "../utils/optimized-queries";

const router = Router();

router.get("/dashboard/unified", async (req, res) => {
  try {
    const stats = await OptimizedDashboardQueries.getUnifiedDashboardData();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

router.get("/dashboard/recent-projects", async (req, res) => {
  try {
    const projects = await storage.getRecentProjects();
    res.json(projects);
  } catch (error) {
    console.error("Error fetching recent projects:", error);
    res.status(500).json({ message: "Failed to fetch recent projects" });
  }
});

router.get("/dashboard/urgent-orders", async (req, res) => {
  try {
    const orders = await storage.getUrgentOrders();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching urgent orders:", error);
    res.status(500).json({ message: "Failed to fetch urgent orders" });
  }
});

export default router;