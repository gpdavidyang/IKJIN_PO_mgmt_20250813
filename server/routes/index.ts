/**
 * Main Router Index
 * Consolidates all route modules for clean organization
 */

import { Router } from "express";
import authRoutes from "./auth";
import projectRoutes from "./projects";
import orderRoutes from "./orders";
import vendorRoutes from "./vendors";
import itemRoutes from "./items";
import dashboardRoutes from "./dashboard";
import companyRoutes from "./companies";
import adminRoutes from "./admin";
import excelAutomationRoutes from "./excel-automation";
import poTemplateRoutes from "./po-template-real.js";
import reportRoutes from "./reports";
import importExportRoutes from "./import-export";

const router = Router();

// Mount all route modules
router.use("/api", authRoutes);
router.use("/api", projectRoutes);
router.use("/api", orderRoutes);
router.use("/api", vendorRoutes);
router.use("/api", itemRoutes);
router.use("/api", dashboardRoutes);
router.use("/api", companyRoutes);
router.use("/api", adminRoutes);
router.use("/api/excel-automation", excelAutomationRoutes);
router.use("/api/po-template", poTemplateRoutes);
router.use("/api/reports", reportRoutes);
router.use("/api", importExportRoutes);

export default router;