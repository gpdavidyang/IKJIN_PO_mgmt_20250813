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
import poTemplateRoutes from "./po-template-real";
import reportRoutes from "./reports";
import importExportRoutes from "./import-export";
import emailHistoryRoutes from "./email-history";
import excelTemplateRoutes from "./excel-template";
import ordersOptimizedRoutes from "./orders-optimized";
import orderStatusesRoutes from "./order-statuses";
import invoicesRoutes from "./invoices";
import verificationLogsRoutes from "./verification-logs";
import itemReceiptsRoutes from "./item-receipts";
import approvalsRoutes from "./approvals";
import projectMembersRoutes from "./project-members";
import projectTypesRoutes from "./project-types";
import simpleAuthRoutes from "./simple-auth";
import testAccountsRoutes from "./test-accounts";
import categoryRoutes from "./categories";
import approvalSettingsRoutes from "./approval-settings";
import approvalAuthoritiesRoutes from "./approval-authorities";
import notificationsRoutes from "./notifications";
import ordersSimpleRoutes from "./orders-simple";
import positionsRoutes from "./positions";

const router = Router();

// Mount all route modules
router.use("/api", authRoutes);
router.use("/api", projectRoutes);
router.use("/api", orderRoutes);
router.use("/api", vendorRoutes);
router.use("/api", itemRoutes);
router.use("/api", dashboardRoutes);
router.use("/api", companyRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api/excel-automation", excelAutomationRoutes);
router.use("/api/po-template", poTemplateRoutes);
router.use("/api/reports", reportRoutes);
router.use("/api", importExportRoutes);
router.use("/api", emailHistoryRoutes);
router.use("/api/excel-template", excelTemplateRoutes);
router.use("/api", ordersOptimizedRoutes);
router.use("/api", orderStatusesRoutes);
router.use("/api", invoicesRoutes);
router.use("/api", verificationLogsRoutes);
router.use("/api", itemReceiptsRoutes);
router.use("/api", approvalsRoutes);
router.use("/api", projectMembersRoutes);
router.use("/api", projectTypesRoutes);
router.use("/api", simpleAuthRoutes);
router.use("/api", testAccountsRoutes);
router.use("/api/categories", categoryRoutes);
router.use("/api/approval-settings", approvalSettingsRoutes);
router.use("/api", approvalAuthoritiesRoutes);
router.use("/api", notificationsRoutes);
router.use("/api/orders", ordersSimpleRoutes);
router.use("/api", positionsRoutes);

export default router;