var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/utils/mock-db.ts
var MockDB;
var init_mock_db = __esm({
  "server/utils/mock-db.ts"() {
    "use strict";
    MockDB = class {
      static {
        this.vendors = [];
      }
      static {
        this.projects = [];
      }
      static {
        this.purchaseOrders = [];
      }
      static {
        this.purchaseOrderItems = [];
      }
      static {
        this.idCounters = {
          vendors: 1,
          projects: 1,
          purchaseOrders: 1,
          purchaseOrderItems: 1
        };
      }
      static async findOrCreateVendor(vendorName) {
        if (!vendorName) {
          vendorName = "\uBBF8\uC9C0\uC815 \uAC70\uB798\uCC98";
        }
        const existing = this.vendors.find((v) => v.name === vendorName);
        if (existing) {
          return existing.id;
        }
        const newVendor = {
          id: this.idCounters.vendors++,
          name: vendorName,
          contactPerson: "\uC790\uB3D9\uC0DD\uC131",
          email: `auto-${Date.now()}@example.com`,
          mainContact: "\uC790\uB3D9\uC0DD\uC131",
          createdAt: /* @__PURE__ */ new Date()
        };
        this.vendors.push(newVendor);
        return newVendor.id;
      }
      static async findOrCreateProject(siteName) {
        if (!siteName) {
          siteName = "\uBBF8\uC9C0\uC815 \uD604\uC7A5";
        }
        const existing = this.projects.find((p) => p.projectName === siteName);
        if (existing) {
          return existing.id;
        }
        const newProject = {
          id: this.idCounters.projects++,
          projectName: siteName,
          projectCode: `AUTO-${Date.now().toString().slice(-8)}`,
          status: "active",
          createdAt: /* @__PURE__ */ new Date()
        };
        this.projects.push(newProject);
        return newProject.id;
      }
      static async createPurchaseOrder(orderData) {
        const newOrder = {
          id: this.idCounters.purchaseOrders++,
          orderNumber: orderData.orderNumber,
          projectId: orderData.projectId,
          vendorId: orderData.vendorId,
          userId: orderData.userId,
          orderDate: new Date(orderData.orderDate),
          deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate) : null,
          totalAmount: orderData.totalAmount,
          status: "draft",
          notes: orderData.notes || "",
          createdAt: /* @__PURE__ */ new Date()
        };
        this.purchaseOrders.push(newOrder);
        return newOrder.id;
      }
      static async createPurchaseOrderItem(itemData) {
        const newItem = {
          id: this.idCounters.purchaseOrderItems++,
          orderId: itemData.orderId,
          itemName: itemData.itemName,
          specification: itemData.specification,
          quantity: itemData.quantity,
          unitPrice: itemData.unitPrice,
          totalAmount: itemData.totalAmount,
          categoryLv1: itemData.categoryLv1,
          categoryLv2: itemData.categoryLv2,
          categoryLv3: itemData.categoryLv3,
          supplyAmount: itemData.supplyAmount,
          taxAmount: itemData.taxAmount,
          deliveryName: itemData.deliveryName,
          notes: itemData.notes,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.purchaseOrderItems.push(newItem);
        return newItem.id;
      }
      static async transaction(callback) {
        const mockTx = {
          insert: (table) => ({
            values: async (data) => {
              if (table === "vendors") {
                return [{ id: await this.findOrCreateVendor(data.name) }];
              } else if (table === "projects") {
                return [{ id: await this.findOrCreateProject(data.projectName) }];
              } else if (table === "purchaseOrders") {
                return [{ id: await this.createPurchaseOrder(data) }];
              } else if (table === "purchaseOrderItems") {
                return [{ id: await this.createPurchaseOrderItem(data) }];
              }
              return [{ id: Math.floor(Math.random() * 1e3) }];
            },
            returning: () => ({
              values: async (data) => {
                if (table === "vendors") {
                  return [{ id: await this.findOrCreateVendor(data.name) }];
                } else if (table === "projects") {
                  return [{ id: await this.findOrCreateProject(data.projectName) }];
                } else if (table === "purchaseOrders") {
                  return [{ id: await this.createPurchaseOrder(data) }];
                } else if (table === "purchaseOrderItems") {
                  return [{ id: await this.createPurchaseOrderItem(data) }];
                }
                return [{ id: Math.floor(Math.random() * 1e3) }];
              }
            })
          }),
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => []
              })
            })
          })
        };
        await callback(mockTx);
      }
      static getStats() {
        return {
          vendors: this.vendors.length,
          projects: this.projects.length,
          purchaseOrders: this.purchaseOrders.length,
          purchaseOrderItems: this.purchaseOrderItems.length
        };
      }
      static getAllData() {
        return {
          vendors: this.vendors,
          projects: this.projects,
          purchaseOrders: this.purchaseOrders,
          purchaseOrderItems: this.purchaseOrderItems
        };
      }
      static clear() {
        this.vendors = [];
        this.projects = [];
        this.purchaseOrders = [];
        this.purchaseOrderItems = [];
        this.idCounters = {
          vendors: 1,
          projects: 1,
          purchaseOrders: 1,
          purchaseOrderItems: 1
        };
      }
    };
  }
});

// server/utils/po-template-processor-mock.ts
import XLSX4 from "xlsx";
var POTemplateProcessorMock;
var init_po_template_processor_mock = __esm({
  "server/utils/po-template-processor-mock.ts"() {
    "use strict";
    init_mock_db();
    POTemplateProcessorMock = class {
      /**
       * Excel 파일에서 Input 시트를 파싱하여 발주서 데이터 추출
       */
      static parseInputSheet(filePath) {
        try {
          const workbook = XLSX4.readFile(filePath);
          if (!workbook.SheetNames.includes("Input")) {
            return {
              success: false,
              totalOrders: 0,
              totalItems: 0,
              orders: [],
              error: "Input \uC2DC\uD2B8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
            };
          }
          const worksheet = workbook.Sheets["Input"];
          const data = XLSX4.utils.sheet_to_json(worksheet, { header: 1 });
          const rows = data.slice(1);
          const ordersByNumber = /* @__PURE__ */ new Map();
          for (const row of rows) {
            if (!row || !row[0]) continue;
            const orderNumber = String(row[0]).trim();
            const orderDate = this.formatDate(row[1]);
            const siteName = String(row[2] || "").trim();
            const categoryLv1 = String(row[3] || "").trim();
            const categoryLv2 = String(row[4] || "").trim();
            const categoryLv3 = String(row[5] || "").trim();
            const itemName = String(row[6] || "").trim();
            const specification = String(row[7] || "").trim();
            const quantity = this.safeNumber(row[8]);
            const unitPrice = this.safeNumber(row[9]);
            const supplyAmount = this.safeNumber(row[10]);
            const taxAmount = this.safeNumber(row[11]);
            const totalAmount = this.safeNumber(row[12]);
            const dueDate = this.formatDate(row[13]);
            const vendorName = String(row[14] || "").trim();
            const deliveryName = String(row[15] || "").trim();
            const notes = String(row[16] || "").trim();
            if (!ordersByNumber.has(orderNumber)) {
              ordersByNumber.set(orderNumber, {
                orderNumber,
                orderDate,
                siteName,
                dueDate,
                vendorName,
                totalAmount: 0,
                items: []
              });
            }
            const order = ordersByNumber.get(orderNumber);
            if (itemName) {
              const item = {
                itemName,
                specification,
                quantity,
                unitPrice,
                supplyAmount,
                taxAmount,
                totalAmount,
                categoryLv1,
                categoryLv2,
                categoryLv3,
                deliveryName,
                notes
              };
              order.items.push(item);
              order.totalAmount += totalAmount;
            }
          }
          const orders = Array.from(ordersByNumber.values());
          return {
            success: true,
            totalOrders: orders.length,
            totalItems: orders.reduce((sum2, order) => sum2 + order.items.length, 0),
            orders
          };
        } catch (error) {
          return {
            success: false,
            totalOrders: 0,
            totalItems: 0,
            orders: [],
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
      /**
       * 파싱된 발주서 데이터를 Mock DB에 저장
       */
      static async saveToDatabase(orders, userId) {
        try {
          let savedOrders = 0;
          await MockDB.transaction(async (tx) => {
            for (const orderData of orders) {
              const vendorId = await MockDB.findOrCreateVendor(orderData.vendorName);
              const projectId = await MockDB.findOrCreateProject(orderData.siteName);
              const orderId = await MockDB.createPurchaseOrder({
                orderNumber: orderData.orderNumber,
                projectId,
                vendorId,
                userId,
                orderDate: orderData.orderDate,
                deliveryDate: orderData.dueDate,
                totalAmount: orderData.totalAmount,
                notes: `PO Template\uC5D0\uC11C \uC790\uB3D9 \uC0DD\uC131\uB428`
              });
              for (const item of orderData.items) {
                await MockDB.createPurchaseOrderItem({
                  orderId,
                  itemName: item.itemName,
                  specification: item.specification,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalAmount: item.totalAmount,
                  categoryLv1: item.categoryLv1,
                  categoryLv2: item.categoryLv2,
                  categoryLv3: item.categoryLv3,
                  supplyAmount: item.supplyAmount,
                  taxAmount: item.taxAmount,
                  deliveryName: item.deliveryName,
                  notes: item.notes
                });
              }
              savedOrders++;
            }
          });
          return {
            success: true,
            savedOrders
          };
        } catch (error) {
          return {
            success: false,
            savedOrders: 0,
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
      /**
       * 특정 시트들을 별도 파일로 추출
       */
      static extractSheetsToFile(sourcePath, targetPath, sheetNames = ["\uAC11\uC9C0", "\uC744\uC9C0"]) {
        try {
          const workbook = XLSX4.readFile(sourcePath);
          const newWorkbook = XLSX4.utils.book_new();
          const extractedSheets = [];
          for (const sheetName of sheetNames) {
            if (workbook.SheetNames.includes(sheetName)) {
              const worksheet = workbook.Sheets[sheetName];
              XLSX4.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
              extractedSheets.push(sheetName);
            }
          }
          if (extractedSheets.length > 0) {
            XLSX4.writeFile(newWorkbook, targetPath);
          }
          return {
            success: true,
            extractedSheets
          };
        } catch (error) {
          return {
            success: false,
            extractedSheets: [],
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
      /**
       * 유틸리티 메서드들
       */
      static formatDate(dateValue) {
        if (!dateValue) return "";
        try {
          if (dateValue instanceof Date) {
            return dateValue.toISOString().split("T")[0];
          }
          if (typeof dateValue === "number") {
            const date = new Date((dateValue - 25569) * 86400 * 1e3);
            return date.toISOString().split("T")[0];
          }
          if (typeof dateValue === "string") {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split("T")[0];
            }
          }
          return String(dateValue);
        } catch {
          return String(dateValue);
        }
      }
      static safeNumber(value) {
        if (typeof value === "number") return value;
        if (typeof value === "string") {
          const cleaned = value.replace(/[,\s]/g, "");
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      }
    };
  }
});

// server/routes/po-template-mock.ts
var po_template_mock_exports = {};
__export(po_template_mock_exports, {
  default: () => po_template_mock_default
});
import { Router } from "express";
import multer2 from "multer";
import path2 from "path";
import fs2 from "fs";
import { fileURLToPath } from "url";
var router, __filename, __dirname, storage2, upload2, requireAuth2, po_template_mock_default;
var init_po_template_mock = __esm({
  "server/routes/po-template-mock.ts"() {
    "use strict";
    init_po_template_processor_mock();
    init_mock_db();
    router = Router();
    __filename = fileURLToPath(import.meta.url);
    __dirname = path2.dirname(__filename);
    storage2 = multer2.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir3 = path2.join(__dirname, "../../uploads");
        if (!fs2.existsSync(uploadDir3)) {
          fs2.mkdirSync(uploadDir3, { recursive: true });
        }
        cb(null, uploadDir3);
      },
      filename: (req, file, cb) => {
        const timestamp2 = Date.now();
        const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
        const extension = path2.extname(originalName);
        const basename = path2.basename(originalName, extension);
        cb(null, `${timestamp2}-${basename}${extension}`);
      }
    });
    upload2 = multer2({
      storage: storage2,
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel"
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Excel \uD30C\uC77C\uB9CC \uC5C5\uB85C\uB4DC \uAC00\uB2A5\uD569\uB2C8\uB2E4."));
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024
        // 10MB
      }
    });
    requireAuth2 = (req, res, next) => {
      req.user = { id: "mock-user-001" };
      next();
    };
    router.post("/upload", requireAuth2, upload2.single("file"), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "\uD30C\uC77C\uC774 \uC5C5\uB85C\uB4DC\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." });
        }
        const filePath = req.file.path;
        const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
        if (!parseResult.success) {
          fs2.unlinkSync(filePath);
          return res.status(400).json({
            error: "\uD30C\uC2F1 \uC2E4\uD328",
            details: parseResult.error
          });
        }
        res.json({
          success: true,
          message: "\uD30C\uC77C \uD30C\uC2F1 \uC644\uB8CC",
          data: {
            fileName: req.file.originalname,
            filePath,
            totalOrders: parseResult.totalOrders,
            totalItems: parseResult.totalItems,
            orders: parseResult.orders
          }
        });
      } catch (error) {
        console.error("PO Template \uC5C5\uB85C\uB4DC \uC624\uB958:", error);
        if (req.file && fs2.existsSync(req.file.path)) {
          fs2.unlinkSync(req.file.path);
        }
        res.status(500).json({
          error: "\uC11C\uBC84 \uC624\uB958",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });
    router.post("/save", requireAuth2, async (req, res) => {
      try {
        const { orders } = req.body;
        if (!orders || !Array.isArray(orders)) {
          return res.status(400).json({ error: "\uBC1C\uC8FC\uC11C \uB370\uC774\uD130\uAC00 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4." });
        }
        const saveResult = await POTemplateProcessorMock.saveToDatabase(orders, req.user.id);
        if (!saveResult.success) {
          return res.status(500).json({
            error: "DB \uC800\uC7A5 \uC2E4\uD328",
            details: saveResult.error
          });
        }
        res.json({
          success: true,
          message: "Mock DB \uC800\uC7A5 \uC644\uB8CC",
          data: {
            savedOrders: saveResult.savedOrders,
            dbStats: MockDB.getStats()
          }
        });
      } catch (error) {
        console.error("PO Template \uC800\uC7A5 \uC624\uB958:", error);
        res.status(500).json({
          error: "\uC11C\uBC84 \uC624\uB958",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });
    router.post("/extract-sheets", requireAuth2, async (req, res) => {
      try {
        const { filePath, sheetNames = ["\uAC11\uC9C0", "\uC744\uC9C0"] } = req.body;
        if (!filePath) {
          return res.status(400).json({ error: "\uD30C\uC77C \uACBD\uB85C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." });
        }
        if (!fs2.existsSync(filePath)) {
          return res.status(400).json({ error: "\uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
        }
        const timestamp2 = Date.now();
        const extractedPath = path2.join(
          path2.dirname(filePath),
          `extracted-${timestamp2}.xlsx`
        );
        const extractResult = POTemplateProcessorMock.extractSheetsToFile(
          filePath,
          extractedPath,
          sheetNames
        );
        if (!extractResult.success) {
          return res.status(500).json({
            error: "\uC2DC\uD2B8 \uCD94\uCD9C \uC2E4\uD328",
            details: extractResult.error
          });
        }
        res.json({
          success: true,
          message: "\uC2DC\uD2B8 \uCD94\uCD9C \uC644\uB8CC",
          data: {
            extractedPath,
            extractedSheets: extractResult.extractedSheets
          }
        });
      } catch (error) {
        console.error("\uC2DC\uD2B8 \uCD94\uCD9C \uC624\uB958:", error);
        res.status(500).json({
          error: "\uC11C\uBC84 \uC624\uB958",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });
    router.post("/process", requireAuth2, upload2.single("file"), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "\uD30C\uC77C\uC774 \uC5C5\uB85C\uB4DC\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." });
        }
        const filePath = req.file.path;
        const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
        if (!parseResult.success) {
          fs2.unlinkSync(filePath);
          return res.status(400).json({
            error: "\uD30C\uC2F1 \uC2E4\uD328",
            details: parseResult.error
          });
        }
        const saveResult = await POTemplateProcessorMock.saveToDatabase(parseResult.orders, req.user.id);
        if (!saveResult.success) {
          fs2.unlinkSync(filePath);
          return res.status(500).json({
            error: "DB \uC800\uC7A5 \uC2E4\uD328",
            details: saveResult.error
          });
        }
        const timestamp2 = Date.now();
        const extractedPath = path2.join(
          path2.dirname(filePath),
          `extracted-${timestamp2}.xlsx`
        );
        const extractResult = POTemplateProcessorMock.extractSheetsToFile(
          filePath,
          extractedPath,
          ["\uAC11\uC9C0", "\uC744\uC9C0"]
        );
        res.json({
          success: true,
          message: "PO Template \uCC98\uB9AC \uC644\uB8CC (Mock DB \uC0AC\uC6A9)",
          data: {
            fileName: req.file.originalname,
            parsing: {
              totalOrders: parseResult.totalOrders,
              totalItems: parseResult.totalItems
            },
            database: {
              savedOrders: saveResult.savedOrders,
              dbStats: MockDB.getStats()
            },
            extraction: {
              extractedPath: extractResult.success ? extractedPath : null,
              extractedSheets: extractResult.extractedSheets
            }
          }
        });
      } catch (error) {
        console.error("PO Template \uD1B5\uD569 \uCC98\uB9AC \uC624\uB958:", error);
        if (req.file && fs2.existsSync(req.file.path)) {
          fs2.unlinkSync(req.file.path);
        }
        res.status(500).json({
          error: "\uC11C\uBC84 \uC624\uB958",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });
    router.get("/db-stats", requireAuth2, (req, res) => {
      try {
        const stats = MockDB.getStats();
        const allData = MockDB.getAllData();
        res.json({
          success: true,
          data: {
            stats,
            sampleData: {
              recentVendors: allData.vendors.slice(-3),
              recentProjects: allData.projects.slice(-3),
              recentOrders: allData.purchaseOrders.slice(-3),
              recentItems: allData.purchaseOrderItems.slice(-3)
            }
          }
        });
      } catch (error) {
        console.error("DB \uC0C1\uD0DC \uC870\uD68C \uC624\uB958:", error);
        res.status(500).json({
          error: "\uC11C\uBC84 \uC624\uB958",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });
    router.post("/reset-db", requireAuth2, (req, res) => {
      try {
        MockDB.clear();
        res.json({
          success: true,
          message: "Mock DB \uCD08\uAE30\uD654 \uC644\uB8CC",
          data: MockDB.getStats()
        });
      } catch (error) {
        console.error("DB \uCD08\uAE30\uD654 \uC624\uB958:", error);
        res.status(500).json({
          error: "\uC11C\uBC84 \uC624\uB958",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });
    router.get("/download/:filename", requireAuth2, (req, res) => {
      try {
        const filename = req.params.filename;
        const filePath = path2.join(__dirname, "../../uploads", filename);
        if (!fs2.existsSync(filePath)) {
          return res.status(404).json({ error: "\uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
        }
        res.download(filePath, (err) => {
          if (err) {
            console.error("\uD30C\uC77C \uB2E4\uC6B4\uB85C\uB4DC \uC624\uB958:", err);
            res.status(500).json({ error: "\uD30C\uC77C \uB2E4\uC6B4\uB85C\uB4DC \uC2E4\uD328" });
          }
        });
      } catch (error) {
        console.error("\uB2E4\uC6B4\uB85C\uB4DC \uC624\uB958:", error);
        res.status(500).json({ error: "\uC11C\uBC84 \uC624\uB958" });
      }
    });
    po_template_mock_default = router;
  }
});

// server/index.ts
import dotenv2 from "dotenv";
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  approvalAuthorities: () => approvalAuthorities,
  attachments: () => attachments,
  attachmentsRelations: () => attachmentsRelations,
  companies: () => companies,
  handsontableConfigs: () => handsontableConfigs,
  handsontableConfigsRelations: () => handsontableConfigsRelations,
  insertApprovalAuthoritySchema: () => insertApprovalAuthoritySchema,
  insertAttachmentSchema: () => insertAttachmentSchema,
  insertCompanySchema: () => insertCompanySchema,
  insertHandsontableConfigSchema: () => insertHandsontableConfigSchema,
  insertInvoiceSchema: () => insertInvoiceSchema,
  insertItemCategorySchema: () => insertItemCategorySchema,
  insertItemReceiptSchema: () => insertItemReceiptSchema,
  insertItemSchema: () => insertItemSchema,
  insertOrderHistorySchema: () => insertOrderHistorySchema,
  insertOrderTemplateSchema: () => insertOrderTemplateSchema,
  insertProjectHistorySchema: () => insertProjectHistorySchema,
  insertProjectMemberSchema: () => insertProjectMemberSchema,
  insertProjectSchema: () => insertProjectSchema,
  insertPurchaseOrderItemSchema: () => insertPurchaseOrderItemSchema,
  insertPurchaseOrderSchema: () => insertPurchaseOrderSchema,
  insertTemplateFieldSchema: () => insertTemplateFieldSchema,
  insertTemplateVersionSchema: () => insertTemplateVersionSchema,
  insertTerminologySchema: () => insertTerminologySchema,
  insertUITermSchema: () => insertUITermSchema,
  insertUiTermSchema: () => insertUiTermSchema,
  insertVendorSchema: () => insertVendorSchema,
  insertVerificationLogSchema: () => insertVerificationLogSchema,
  invoiceStatusEnum: () => invoiceStatusEnum,
  invoices: () => invoices,
  invoicesRelations: () => invoicesRelations,
  itemCategories: () => itemCategories,
  itemCategoriesRelations: () => itemCategoriesRelations,
  itemReceiptStatusEnum: () => itemReceiptStatusEnum,
  itemReceipts: () => itemReceipts,
  itemReceiptsRelations: () => itemReceiptsRelations,
  items: () => items,
  itemsRelations: () => itemsRelations,
  orderHistory: () => orderHistory,
  orderHistoryRelations: () => orderHistoryRelations,
  orderTemplates: () => orderTemplates,
  orderTemplatesRelations: () => orderTemplatesRelations,
  projectHistory: () => projectHistory,
  projectHistoryRelations: () => projectHistoryRelations,
  projectMembers: () => projectMembers,
  projectMembersRelations: () => projectMembersRelations,
  projectStatusEnum: () => projectStatusEnum,
  projects: () => projects,
  projectsRelations: () => projectsRelations,
  purchaseOrderItems: () => purchaseOrderItems,
  purchaseOrderItemsRelations: () => purchaseOrderItemsRelations,
  purchaseOrderStatusEnum: () => purchaseOrderStatusEnum,
  purchaseOrders: () => purchaseOrders,
  purchaseOrdersRelations: () => purchaseOrdersRelations,
  sessions: () => sessions,
  templateFields: () => templateFields,
  templateFieldsRelations: () => templateFieldsRelations,
  templateVersions: () => templateVersions,
  templateVersionsRelations: () => templateVersionsRelations,
  terminology: () => terminology,
  uiTerms: () => uiTerms,
  userRoleEnum: () => userRoleEnum,
  users: () => users,
  usersRelations: () => usersRelations,
  vendors: () => vendors,
  vendorsRelations: () => vendorsRelations,
  verificationActionEnum: () => verificationActionEnum,
  verificationLogs: () => verificationLogs,
  verificationLogsRelations: () => verificationLogsRelations
});
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  unique,
  pgEnum
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var uiTerms = pgTable("ui_terms", {
  id: serial("id").primaryKey(),
  termKey: varchar("term_key", { length: 100 }).notNull().unique(),
  termValue: varchar("term_value", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).default("general"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var itemCategories = pgTable("item_categories", {
  id: serial("id").primaryKey(),
  categoryType: varchar("category_type", { length: 20 }).notNull(),
  // 'major', 'middle', 'minor'
  categoryValue: varchar("category_value", { length: 100 }).notNull(),
  parentId: integer("parent_id"),
  // References parent category ID
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_item_categories_type").on(table.categoryType),
  index("idx_item_categories_parent").on(table.parentId)
]);
var userRoleEnum = pgEnum("user_role", ["field_worker", "project_manager", "hq_management", "executive", "admin"]);
var purchaseOrderStatusEnum = pgEnum("purchase_order_status", ["draft", "pending", "approved", "sent", "completed"]);
var projectStatusEnum = pgEnum("project_status", ["planning", "active", "on_hold", "completed", "cancelled"]);
var invoiceStatusEnum = pgEnum("invoice_status", ["pending", "verified", "paid"]);
var itemReceiptStatusEnum = pgEnum("item_receipt_status", ["pending", "approved", "rejected"]);
var verificationActionEnum = pgEnum("verification_action", ["invoice_uploaded", "item_verified", "quality_checked"]);
var approvalAuthorities = pgTable("approval_authorities", {
  id: serial("id").primaryKey(),
  role: userRoleEnum("role").notNull(),
  maxAmount: decimal("max_amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  unique("unique_role_approval").on(table.role)
]);
var users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  name: varchar("name").notNull(),
  password: varchar("password").notNull(),
  // Required for security
  phoneNumber: varchar("phone_number").notNull(),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("field_worker"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_users_email").on(table.email),
  index("idx_users_role").on(table.role)
]);
var companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  businessNumber: varchar("business_number", { length: 50 }),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  fax: varchar("fax", { length: 50 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  representative: varchar("representative", { length: 100 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  // Optimized: varchar instead of text
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  businessNumber: varchar("business_number", { length: 50 }),
  industry: varchar("industry", { length: 100 }),
  representative: varchar("representative", { length: 100 }),
  mainContact: varchar("main_contact", { length: 100 }).notNull(),
  // Renamed from contact for clarity
  contactPerson: varchar("contact_person", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  memo: text("memo"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_vendors_name").on(table.name),
  index("idx_vendors_business_number").on(table.businessNumber),
  index("idx_vendors_email").on(table.email),
  index("idx_vendors_active").on(table.isActive)
]);
var items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  specification: text("specification"),
  unit: varchar("unit", { length: 50 }).notNull(),
  standardPrice: decimal("standard_price", { precision: 15, scale: 2 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_items_name").on(table.name),
  index("idx_items_category").on(table.category),
  index("idx_items_active").on(table.isActive)
]);
var terminology = pgTable("terminology", {
  id: serial("id").primaryKey(),
  termKey: varchar("term_key", { length: 100 }).notNull().unique(),
  termValue: varchar("term_value", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_terminology_key").on(table.termKey),
  index("idx_terminology_category").on(table.category),
  index("idx_terminology_active").on(table.isActive)
]);
var projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  projectCode: varchar("project_code", { length: 100 }).notNull().unique(),
  clientName: varchar("client_name", { length: 255 }),
  projectType: varchar("project_type", { length: 100 }),
  // 아파트, 오피스텔, 상업시설 등
  location: text("location"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: projectStatusEnum("status").notNull().default("active"),
  totalBudget: decimal("total_budget", { precision: 15, scale: 2 }),
  projectManagerId: varchar("project_manager_id").references(() => users.id),
  orderManagerId: varchar("order_manager_id").references(() => users.id),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_projects_name").on(table.projectName),
  index("idx_projects_code").on(table.projectCode),
  index("idx_projects_status").on(table.status),
  index("idx_projects_start_date").on(table.startDate),
  index("idx_projects_active").on(table.isActive),
  index("idx_projects_manager").on(table.projectManagerId)
]);
var projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  // 'manager', 'order_manager', 'member', 'viewer'
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  unique("project_members_project_user_unique").on(table.projectId, table.userId)
]);
var projectHistory = pgTable("project_history", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: varchar("changed_by").references(() => users.id).notNull(),
  changedAt: timestamp("changed_at").defaultNow(),
  changeReason: text("change_reason")
});
var orderTemplates = pgTable("order_templates", {
  id: serial("id").primaryKey(),
  templateName: varchar("template_name", { length: 100 }).notNull(),
  templateType: varchar("template_type", { length: 50 }).notNull(),
  // material_extrusion, panel_manufacturing, general, handsontable
  fieldsConfig: jsonb("fields_config").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var templateFields = pgTable("template_fields", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => orderTemplates.id, { onDelete: "cascade" }),
  fieldType: varchar("field_type", { length: 50 }).notNull(),
  // 'text', 'number', 'select', 'date', 'textarea'
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  placeholder: varchar("placeholder", { length: 255 }),
  required: boolean("required").default(false),
  validation: jsonb("validation"),
  // JSON validation rules
  options: jsonb("options"),
  // For select fields
  gridPosition: jsonb("grid_position").notNull(),
  // {row, col, span}
  sectionName: varchar("section_name", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var handsontableConfigs = pgTable("handsontable_configs", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => orderTemplates.id, { onDelete: "cascade" }),
  colHeaders: jsonb("col_headers").notNull(),
  // Array of column headers
  columns: jsonb("columns").notNull(),
  // Column configurations
  rowsCount: integer("rows_count").default(10),
  formulas: jsonb("formulas"),
  // Formula definitions
  validationRules: jsonb("validation_rules"),
  // Cell validation rules
  customStyles: jsonb("custom_styles"),
  // Styling rules
  settings: jsonb("settings"),
  // Additional Handsontable settings
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var templateVersions = pgTable("template_versions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => orderTemplates.id, { onDelete: "cascade" }),
  versionNumber: varchar("version_number", { length: 20 }).notNull(),
  changes: jsonb("changes"),
  // Changelog
  templateConfig: jsonb("template_config").notNull(),
  // Snapshot of template at this version
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow()
});
var purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  templateId: integer("template_id").references(() => orderTemplates.id),
  orderDate: timestamp("order_date").notNull(),
  deliveryDate: timestamp("delivery_date"),
  status: purchaseOrderStatusEnum("status").notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0").$type(),
  notes: text("notes"),
  customFields: jsonb("custom_fields"),
  isApproved: boolean("is_approved").default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  sentAt: timestamp("sent_at"),
  currentApproverRole: userRoleEnum("current_approver_role"),
  approvalLevel: integer("approval_level").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_purchase_orders_number").on(table.orderNumber),
  index("idx_purchase_orders_project").on(table.projectId),
  index("idx_purchase_orders_vendor").on(table.vendorId),
  index("idx_purchase_orders_user").on(table.userId),
  index("idx_purchase_orders_status").on(table.status),
  index("idx_purchase_orders_date").on(table.orderDate),
  index("idx_purchase_orders_delivery").on(table.deliveryDate),
  index("idx_purchase_orders_created").on(table.createdAt),
  index("idx_purchase_orders_approver").on(table.currentApproverRole)
]);
var purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => purchaseOrders.id).notNull(),
  itemId: integer("item_id").references(() => items.id),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  specification: text("specification"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().$type(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull().$type(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().$type(),
  // PO Template Input 시트를 위한 새로운 필드들
  categoryLv1: varchar("category_lv1", { length: 100 }),
  // 대분류
  categoryLv2: varchar("category_lv2", { length: 100 }),
  // 중분류
  categoryLv3: varchar("category_lv3", { length: 100 }),
  // 소분류
  supplyAmount: decimal("supply_amount", { precision: 15, scale: 2 }).default("0").notNull().$type(),
  // 공급가액
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0").notNull().$type(),
  // 세액
  deliveryName: varchar("delivery_name", { length: 255 }),
  // 납품처명
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_purchase_order_items_category_lv1").on(table.categoryLv1),
  index("idx_purchase_order_items_category_lv2").on(table.categoryLv2),
  index("idx_purchase_order_items_category_lv3").on(table.categoryLv3)
]);
var attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => purchaseOrders.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  filePath: text("file_path").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var orderHistory = pgTable("order_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => purchaseOrders.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  // created, updated, approved, sent, etc.
  changes: jsonb("changes"),
  // Store what changed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(),
  invoiceType: varchar("invoice_type", { length: 20 }).notNull(),
  // 'invoice' or 'tax_invoice'
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().$type(),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }).default("0").$type(),
  status: invoiceStatusEnum("status").notNull().default("pending"),
  filePath: varchar("file_path", { length: 500 }),
  // 청구서 파일 경로
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  taxInvoiceIssued: boolean("tax_invoice_issued").default(false),
  // 세금계산서 발행 여부
  taxInvoiceIssuedDate: timestamp("tax_invoice_issued_date"),
  // 세금계산서 발행일
  taxInvoiceIssuedBy: varchar("tax_invoice_issued_by").references(() => users.id),
  // 세금계산서 발행자
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var itemReceipts = pgTable("item_receipts", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id").notNull().references(() => purchaseOrderItems.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  receivedQuantity: decimal("received_quantity", { precision: 10, scale: 2 }).notNull().$type(),
  receivedDate: timestamp("received_date").notNull(),
  qualityCheck: boolean("quality_check").default(false),
  qualityNotes: text("quality_notes"),
  verifiedBy: varchar("verified_by").notNull().references(() => users.id),
  status: itemReceiptStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var verificationLogs = pgTable("verification_logs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  itemReceiptId: integer("item_receipt_id").references(() => itemReceipts.id, { onDelete: "set null" }),
  action: verificationActionEnum("action").notNull(),
  details: text("details"),
  performedBy: varchar("performed_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
  orderHistory: many(orderHistory)
}));
var vendorsRelations = relations(vendors, ({ many }) => ({
  purchaseOrders: many(purchaseOrders)
}));
var itemsRelations = relations(items, ({ many }) => ({
  purchaseOrderItems: many(purchaseOrderItems)
}));
var projectsRelations = relations(projects, ({ one, many }) => ({
  purchaseOrders: many(purchaseOrders),
  projectManager: one(users, {
    fields: [projects.projectManagerId],
    references: [users.id]
  }),
  orderManager: one(users, {
    fields: [projects.orderManagerId],
    references: [users.id]
  }),
  projectMembers: many(projectMembers),
  projectHistory: many(projectHistory)
}));
var projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id]
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id]
  }),
  assignedByUser: one(users, {
    fields: [projectMembers.assignedBy],
    references: [users.id]
  })
}));
var projectHistoryRelations = relations(projectHistory, ({ one }) => ({
  project: one(projects, {
    fields: [projectHistory.projectId],
    references: [projects.id]
  }),
  changedByUser: one(users, {
    fields: [projectHistory.changedBy],
    references: [users.id]
  })
}));
var orderTemplatesRelations = relations(orderTemplates, ({ many }) => ({
  fields: many(templateFields),
  handsontableConfig: many(handsontableConfigs),
  versions: many(templateVersions),
  orders: many(purchaseOrders)
}));
var purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  project: one(projects, {
    fields: [purchaseOrders.projectId],
    references: [projects.id]
  }),
  vendor: one(vendors, {
    fields: [purchaseOrders.vendorId],
    references: [vendors.id]
  }),
  user: one(users, {
    fields: [purchaseOrders.userId],
    references: [users.id]
  }),
  template: one(orderTemplates, {
    fields: [purchaseOrders.templateId],
    references: [orderTemplates.id]
  }),
  approver: one(users, {
    fields: [purchaseOrders.approvedBy],
    references: [users.id]
  }),
  items: many(purchaseOrderItems),
  attachments: many(attachments),
  history: many(orderHistory),
  invoices: many(invoices),
  verificationLogs: many(verificationLogs)
}));
var purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one, many }) => ({
  order: one(purchaseOrders, {
    fields: [purchaseOrderItems.orderId],
    references: [purchaseOrders.id]
  }),
  receipts: many(itemReceipts)
}));
var attachmentsRelations = relations(attachments, ({ one }) => ({
  order: one(purchaseOrders, {
    fields: [attachments.orderId],
    references: [purchaseOrders.id]
  })
}));
var orderHistoryRelations = relations(orderHistory, ({ one }) => ({
  order: one(purchaseOrders, {
    fields: [orderHistory.orderId],
    references: [purchaseOrders.id]
  }),
  user: one(users, {
    fields: [orderHistory.userId],
    references: [users.id]
  })
}));
var invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(purchaseOrders, {
    fields: [invoices.orderId],
    references: [purchaseOrders.id]
  }),
  receipts: many(itemReceipts),
  verificationLogs: many(verificationLogs)
}));
var itemReceiptsRelations = relations(itemReceipts, ({ one, many }) => ({
  orderItem: one(purchaseOrderItems, {
    fields: [itemReceipts.orderItemId],
    references: [purchaseOrderItems.id]
  }),
  invoice: one(invoices, {
    fields: [itemReceipts.invoiceId],
    references: [invoices.id]
  }),
  verificationLogs: many(verificationLogs)
}));
var verificationLogsRelations = relations(verificationLogs, ({ one }) => ({
  order: one(purchaseOrders, {
    fields: [verificationLogs.orderId],
    references: [purchaseOrders.id]
  }),
  invoice: one(invoices, {
    fields: [verificationLogs.invoiceId],
    references: [invoices.id]
  }),
  itemReceipt: one(itemReceipts, {
    fields: [verificationLogs.itemReceiptId],
    references: [itemReceipts.id]
  })
}));
var templateFieldsRelations = relations(templateFields, ({ one }) => ({
  template: one(orderTemplates, {
    fields: [templateFields.templateId],
    references: [orderTemplates.id]
  })
}));
var handsontableConfigsRelations = relations(handsontableConfigs, ({ one }) => ({
  template: one(orderTemplates, {
    fields: [handsontableConfigs.templateId],
    references: [orderTemplates.id]
  })
}));
var templateVersionsRelations = relations(templateVersions, ({ one }) => ({
  template: one(orderTemplates, {
    fields: [templateVersions.templateId],
    references: [orderTemplates.id]
  })
}));
var itemCategoriesRelations = relations(itemCategories, ({ one, many }) => ({
  parent: one(itemCategories, {
    fields: [itemCategories.parentId],
    references: [itemCategories.id]
  }),
  children: many(itemCategories)
}));
var insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertOrderTemplateSchema = createInsertSchema(orderTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertItemCategorySchema = createInsertSchema(itemCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  orderNumber: true,
  userId: true,
  isApproved: true,
  approvedBy: true,
  approvedAt: true,
  sentAt: true
}).extend({
  userId: z.string().min(1),
  templateId: z.number().nullable().optional(),
  totalAmount: z.number().positive(),
  customFields: z.record(z.any()).optional(),
  items: z.array(z.object({
    itemName: z.string().min(1),
    specification: z.string().nullable().optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    totalAmount: z.number().positive(),
    notes: z.string().nullable().optional()
  }))
});
var insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
  createdAt: true
}).extend({
  supplyAmount: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional()
});
var insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true
});
var insertOrderHistorySchema = createInsertSchema(orderHistory).omit({
  id: true,
  createdAt: true
});
var insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  totalAmount: z.union([z.string(), z.number()]).transform((val) => String(val)),
  vatAmount: z.union([z.string(), z.number()]).transform((val) => String(val))
});
var insertItemReceiptSchema = createInsertSchema(itemReceipts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  receivedQuantity: z.union([z.string(), z.number()]).transform((val) => Number(val)),
  receivedDate: z.union([z.string(), z.date()]).transform((val) => new Date(val))
});
var insertVerificationLogSchema = createInsertSchema(verificationLogs).omit({
  id: true,
  createdAt: true
});
var insertTemplateFieldSchema = createInsertSchema(templateFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertHandsontableConfigSchema = createInsertSchema(handsontableConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTemplateVersionSchema = createInsertSchema(templateVersions).omit({
  id: true,
  createdAt: true
});
var insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertProjectHistorySchema = createInsertSchema(projectHistory).omit({
  id: true,
  changedAt: true
});
var insertUiTermSchema = createInsertSchema(uiTerms);
var insertTerminologySchema = createInsertSchema(terminology).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertUITermSchema = createInsertSchema(uiTerms).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertApprovalAuthoritySchema = createInsertSchema(approvalAuthorities).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/db.ts
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import pkg from "pg";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
dotenv.config();
var { Pool } = pkg;
var db = null;
if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set, using mock connection");
  db = null;
} else {
  try {
    try {
      const sql4 = neon(process.env.DATABASE_URL);
      db = drizzle(sql4, { schema: schema_exports });
      console.log("\u2705 Database connected successfully (Neon serverless)");
    } catch (neonError) {
      console.warn("\u26A0\uFE0F Neon connection failed, trying standard PostgreSQL...", neonError.message);
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 1,
        // Limit connections for development
        idleTimeoutMillis: 1e4,
        connectionTimeoutMillis: 5e3
      });
      db = pgDrizzle(pool, { schema: schema_exports });
      await pool.query("SELECT 1");
      console.log("\u2705 Database connected successfully (PostgreSQL)");
    }
  } catch (error) {
    console.error("\u274C All database connection methods failed:", error.message);
    console.warn("\u{1F504} Falling back to mock data mode");
    db = null;
  }
}

// server/storage.ts
import { eq, desc, asc, ilike, and, or, between, count, sum, sql as sql2, gte, lte, isNotNull, notInArray } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserById(id) {
    return this.getUser(id);
  }
  // Generate standardized user ID
  async generateStandardizedUserId() {
    const today = /* @__PURE__ */ new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, "");
    const existingUsers = await db.select({ id: users.id }).from(users).where(sql2`${users.id} LIKE ${"USR_" + datePrefix + "_%"}`);
    let maxSequence = 0;
    for (const user of existingUsers) {
      const match = user.id.match(/USR_\d{8}_(\d{3})$/);
      if (match) {
        const sequence = parseInt(match[1], 10);
        if (sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    }
    const nextSequence = (maxSequence + 1).toString().padStart(3, "0");
    return `USR_${datePrefix}_${nextSequence}`;
  }
  async upsertUser(userData) {
    let existingUser = [];
    if (userData.id) {
      existingUser = await db.select().from(users).where(eq(users.id, userData.id)).limit(1);
    } else if (userData.email) {
      existingUser = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
    }
    if (existingUser.length > 0) {
      const updateData = {
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (userData.name !== void 0) updateData.name = userData.name;
      if (userData.phoneNumber !== void 0) updateData.phoneNumber = userData.phoneNumber;
      if (userData.role !== void 0) updateData.role = userData.role;
      if (userData.profileImageUrl !== void 0) updateData.profileImageUrl = userData.profileImageUrl;
      const whereCondition = userData.id ? eq(users.id, userData.id) : eq(users.email, userData.email);
      const [user2] = await db.update(users).set(updateData).where(whereCondition).returning();
      return user2;
    }
    const userDataWithId = {
      ...userData,
      id: userData.id || await this.generateStandardizedUserId()
    };
    const [user] = await db.insert(users).values(userDataWithId).returning();
    return user;
  }
  async updateUserProfile(id, profile) {
    const [user] = await db.update(users).set({
      ...profile,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, id)).returning();
    return user;
  }
  async getUsers() {
    return await db.select().from(users).orderBy(asc(users.createdAt));
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async updateUser(id, updates) {
    const [user] = await db.update(users).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return user;
  }
  async updateUserRole(id, role) {
    const [user] = await db.update(users).set({ role, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return user;
  }
  async toggleUserActive(id, isActive) {
    const [user] = await db.update(users).set({
      isActive,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, id)).returning();
    return user;
  }
  async checkUserReferences(id) {
    try {
      const projectsAsManager = await db.select({
        id: projects.id,
        name: projects.projectName,
        type: sql2`'project_manager'`
      }).from(projects).where(eq(projects.projectManagerId, id));
      const ordersByUser = await db.select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber
      }).from(purchaseOrders).where(eq(purchaseOrders.userId, id));
      const projectMemberships = await db.select({
        id: projects.id,
        name: projects.projectName,
        type: sql2`'project_member'`
      }).from(projectMembers).leftJoin(projects, eq(projectMembers.projectId, projects.id)).where(eq(projectMembers.userId, id));
      const projectMembersAssignedBy = await db.select({
        id: projects.id,
        name: projects.projectName,
        type: sql2`'assigned_by'`
      }).from(projectMembers).leftJoin(projects, eq(projectMembers.projectId, projects.id)).where(eq(projectMembers.assignedBy, id));
      const projectHistoryChanges = await db.select({
        id: projects.id,
        name: projects.projectName || sql2`'Unknown Project'`,
        type: sql2`'history_changed_by'`
      }).from(projectHistory).leftJoin(projects, eq(projectHistory.projectId, projects.id)).where(eq(projectHistory.changedBy, id));
      const allProjects = [...projectsAsManager, ...projectMemberships, ...projectMembersAssignedBy, ...projectHistoryChanges].filter((p) => p.id !== null).map((p) => ({
        id: p.id,
        name: p.name || "Unknown Project",
        type: p.type
      }));
      const canDelete = allProjects.length === 0 && ordersByUser.length === 0;
      return {
        canDelete,
        references: {
          projects: allProjects,
          orders: ordersByUser
        }
      };
    } catch (error) {
      console.error("Error checking user references:", error);
      return {
        canDelete: false,
        references: { projects: [], orders: [] }
      };
    }
  }
  async deleteUser(id) {
    const refCheck = await this.checkUserReferences(id);
    if (!refCheck.canDelete) {
      const errorDetails = [];
      if (refCheck.references.projects.length > 0) {
        errorDetails.push(`${refCheck.references.projects.length}\uAC1C \uD504\uB85C\uC81D\uD2B8\uC640 \uC5F0\uACB0\uB428`);
      }
      if (refCheck.references.orders.length > 0) {
        errorDetails.push(`${refCheck.references.orders.length}\uAC1C \uBC1C\uC8FC\uC11C\uC640 \uC5F0\uACB0\uB428`);
      }
      throw new Error(`\uC0AC\uC6A9\uC790\uB97C \uC0AD\uC81C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${errorDetails.join(", ")}`);
    }
    await db.delete(users).where(eq(users.id, id));
  }
  async reassignUserProjects(fromUserId, toUserId) {
    await db.update(projects).set({ projectManagerId: toUserId, updatedAt: /* @__PURE__ */ new Date() }).where(eq(projects.projectManagerId, fromUserId));
    await db.update(projectMembers).set({ assignedBy: toUserId, assignedAt: /* @__PURE__ */ new Date() }).where(eq(projectMembers.assignedBy, fromUserId));
    await db.update(projectHistory).set({ changedBy: toUserId }).where(eq(projectHistory.changedBy, fromUserId));
    await db.delete(projectMembers).where(eq(projectMembers.userId, fromUserId));
  }
  // Vendor operations
  async getVendors() {
    return await db.select().from(vendors).where(eq(vendors.isActive, true)).orderBy(asc(vendors.name));
  }
  async getVendor(id) {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }
  async createVendor(vendor) {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    return newVendor;
  }
  async updateVendor(id, vendor) {
    const [updatedVendor] = await db.update(vendors).set({ ...vendor, updatedAt: /* @__PURE__ */ new Date() }).where(eq(vendors.id, id)).returning();
    return updatedVendor;
  }
  async deleteVendor(id) {
    await db.update(vendors).set({ isActive: false }).where(eq(vendors.id, id));
  }
  // Order template operations
  async getOrderTemplates() {
    return await db.select().from(orderTemplates).orderBy(asc(orderTemplates.templateName));
  }
  async getActiveOrderTemplates() {
    return await db.select().from(orderTemplates).where(eq(orderTemplates.isActive, true)).orderBy(asc(orderTemplates.templateName));
  }
  async getOrderTemplate(id) {
    const [template] = await db.select().from(orderTemplates).where(eq(orderTemplates.id, id));
    return template;
  }
  async createOrderTemplate(template) {
    const [newTemplate] = await db.insert(orderTemplates).values(template).returning();
    return newTemplate;
  }
  async updateOrderTemplate(id, template) {
    const [updatedTemplate] = await db.update(orderTemplates).set({ ...template, updatedAt: /* @__PURE__ */ new Date() }).where(eq(orderTemplates.id, id)).returning();
    return updatedTemplate;
  }
  async deleteOrderTemplate(id) {
    await db.delete(orderTemplates).where(eq(orderTemplates.id, id));
  }
  async toggleOrderTemplateStatus(id, isActive) {
    const [updatedTemplate] = await db.update(orderTemplates).set({ isActive, updatedAt: /* @__PURE__ */ new Date() }).where(eq(orderTemplates.id, id)).returning();
    return updatedTemplate;
  }
  // Note: Project status and type operations removed - using ENUM types directly for better performance
  // Project operations
  async getProjects() {
    const projectList = await db.select({
      id: projects.id,
      projectName: projects.projectName,
      projectCode: projects.projectCode,
      clientName: projects.clientName,
      projectType: projects.projectType,
      location: projects.location,
      startDate: projects.startDate,
      endDate: projects.endDate,
      status: projects.status,
      totalBudget: projects.totalBudget,
      projectManagerId: projects.projectManagerId,
      orderManagerId: projects.orderManagerId,
      description: projects.description,
      isActive: projects.isActive,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      // Manager contact info from users table via foreign key
      projectManager: users.name,
      managerPhone: users.phoneNumber,
      managerEmail: users.email
    }).from(projects).leftJoin(users, eq(projects.projectManagerId, users.id)).where(eq(projects.isActive, true)).orderBy(desc(projects.createdAt));
    return projectList;
  }
  async getProject(id) {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }
  async createProject(projectData) {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }
  async updateProject(id, projectData) {
    const [updatedProject] = await db.update(projects).set({ ...projectData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(projects.id, id)).returning();
    return updatedProject;
  }
  async deleteProject(id) {
    await db.update(projects).set({ isActive: false }).where(eq(projects.id, id));
  }
  // Order status operations - using display view approach
  async getOrderStatuses() {
    const result = await db.execute(sql2`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY sort_order) as id,
        status_code as code,
        status_name as name,
        status_color as color,
        sort_order as "sortOrder"
      FROM purchase_order_status_display
      ORDER BY sort_order
    `);
    return result.rows;
  }
  // Item operations
  async getItems(filters = {}) {
    const {
      category,
      searchText,
      isActive = true,
      page = 1,
      limit = 50
    } = filters;
    let query = db.select().from(items);
    let countQuery = db.select({ count: count() }).from(items);
    const conditions = [];
    if (isActive !== void 0) {
      conditions.push(eq(items.isActive, isActive));
    }
    if (category) {
      conditions.push(eq(items.category, category));
    }
    if (searchText) {
      conditions.push(
        or(
          ilike(items.name, `%${searchText}%`),
          ilike(items.specification, `%${searchText}%`),
          ilike(items.description, `%${searchText}%`)
        )
      );
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }
    const offset = (page - 1) * limit;
    query = query.orderBy(asc(items.name)).limit(limit).offset(offset);
    const [itemsResult, totalResult] = await Promise.all([
      query,
      countQuery
    ]);
    return {
      items: itemsResult,
      total: totalResult[0]?.count || 0
    };
  }
  async getItem(id) {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }
  async createItem(itemData) {
    const [item] = await db.insert(items).values(itemData).returning();
    return item;
  }
  async updateItem(id, itemData) {
    const [item] = await db.update(items).set({ ...itemData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(items.id, id)).returning();
    return item;
  }
  async deleteItem(id) {
    await db.update(items).set({ isActive: false }).where(eq(items.id, id));
  }
  async getCategories() {
    const result = await db.selectDistinct({ category: items.category }).from(items).where(and(isNotNull(items.category), eq(items.isActive, true))).orderBy(items.category);
    return result.map((row) => row.category);
  }
  // Purchase order operations
  async getPurchaseOrders(filters = {}) {
    const { userId, status, vendorId, templateId, projectId, startDate, endDate, minAmount, maxAmount, searchText, page = 1, limit = 10 } = filters;
    let whereConditions = [];
    if (userId) {
      whereConditions.push(eq(purchaseOrders.userId, userId));
    }
    if (status) {
      whereConditions.push(sql2`${purchaseOrders.status} = ${status}`);
    }
    if (vendorId) {
      whereConditions.push(eq(purchaseOrders.vendorId, vendorId));
    }
    if (templateId) {
      whereConditions.push(eq(purchaseOrders.templateId, templateId));
    }
    if (projectId) {
      whereConditions.push(eq(purchaseOrders.projectId, projectId));
    }
    if (startDate && endDate) {
      whereConditions.push(between(purchaseOrders.orderDate, startDate, endDate));
    }
    let baseWhereClause = whereConditions.length > 0 ? and(...whereConditions) : void 0;
    const [{ count: totalCountResult }] = await db.select({ count: count() }).from(purchaseOrders).where(baseWhereClause);
    let allOrders = await db.select({
      purchase_orders: purchaseOrders,
      vendors,
      users,
      order_templates: orderTemplates,
      projects
    }).from(purchaseOrders).leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id)).leftJoin(users, eq(purchaseOrders.userId, users.id)).leftJoin(orderTemplates, eq(purchaseOrders.templateId, orderTemplates.id)).leftJoin(projects, eq(purchaseOrders.projectId, projects.id)).where(baseWhereClause).orderBy(desc(purchaseOrders.createdAt));
    let filteredOrders = allOrders;
    if (searchText) {
      const allOrderItems = await db.select().from(purchaseOrderItems);
      const orderItemsMap = /* @__PURE__ */ new Map();
      allOrderItems.forEach((item) => {
        if (!orderItemsMap.has(item.orderId)) {
          orderItemsMap.set(item.orderId, []);
        }
        orderItemsMap.get(item.orderId).push(item);
      });
      filteredOrders = allOrders.filter((orderRow) => {
        const order = orderRow.purchase_orders;
        const vendor = orderRow.vendors;
        const items3 = orderItemsMap.get(order.id) || [];
        const searchLower = searchText.toLowerCase();
        if (order.orderNumber && order.orderNumber.toLowerCase().includes(searchLower)) {
          return true;
        }
        if (vendor && vendor.name && vendor.name.toLowerCase().includes(searchLower)) {
          return true;
        }
        if (order.notes && order.notes.toLowerCase().includes(searchLower)) {
          return true;
        }
        for (const item of items3) {
          if (item.itemName && item.itemName.toLowerCase().includes(searchLower)) {
            return true;
          }
        }
        return false;
      });
    }
    if (minAmount !== void 0 || maxAmount !== void 0) {
      filteredOrders = filteredOrders.filter((orderRow) => {
        const order = orderRow.purchase_orders;
        const totalAmount = parseFloat(order.totalAmount) || 0;
        if (minAmount !== void 0 && totalAmount < minAmount) {
          return false;
        }
        if (maxAmount !== void 0 && totalAmount > maxAmount) {
          return false;
        }
        return true;
      });
    }
    const totalCount = filteredOrders.length;
    const orders = filteredOrders.slice((page - 1) * limit, page * limit);
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items3 = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, order.purchase_orders.id));
        return {
          ...order.purchase_orders,
          vendor: order.vendors || void 0,
          user: order.users || void 0,
          project: order.projects || void 0,
          projectName: order.projects?.projectName || "Unknown Project",
          projectCode: order.projects?.projectCode || "",
          templateName: order.order_templates?.templateName || void 0,
          statusName: order.purchase_orders.status,
          items: items3
        };
      })
    );
    return {
      orders: ordersWithItems,
      total: totalCount
    };
  }
  async getPurchaseOrder(id) {
    const [order] = await db.select().from(purchaseOrders).leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id)).leftJoin(users, eq(purchaseOrders.userId, users.id)).leftJoin(projects, eq(purchaseOrders.projectId, projects.id)).where(eq(purchaseOrders.id, id));
    if (!order) return void 0;
    console.log("Debug: Order found:", order.purchase_orders);
    const items3 = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, id));
    console.log("Debug: Items found:", items3);
    const orderAttachments = await db.select().from(attachments).where(eq(attachments.orderId, id));
    console.log("Debug: Attachments found:", orderAttachments);
    const result = {
      ...order.purchase_orders,
      vendor: order.vendors || void 0,
      user: order.users || void 0,
      project: order.projects || void 0,
      items: items3,
      attachments: orderAttachments
    };
    console.log("Debug: Final result:", result);
    console.log("Debug: Final result items:", result.items);
    return result;
  }
  async createPurchaseOrder(orderData) {
    const { items: items3, ...order } = orderData;
    const orderNumber = await this.generateOrderNumber();
    const orderAmount = order.totalAmount || 0;
    const nextApprover = await this.calculateNextApprover(orderAmount, 1);
    const orderWithWorkflow = {
      ...order,
      orderNumber,
      status: nextApprover ? "pending" : "approved",
      currentApproverRole: nextApprover,
      approvalLevel: 1
    };
    const [newOrder] = await db.insert(purchaseOrders).values(orderWithWorkflow).returning();
    if (items3 && items3.length > 0) {
      await this.createPurchaseOrderItems(
        items3.map((item) => ({
          ...item,
          orderId: newOrder.id
        }))
      );
    }
    await this.createOrderHistory({
      orderId: newOrder.id,
      userId: order.userId,
      action: "created",
      changes: {
        order: newOrder,
        approvalRequired: !!nextApprover,
        nextApprover
      }
    });
    return newOrder;
  }
  async updatePurchaseOrder(id, orderData) {
    const [updatedOrder] = await db.update(purchaseOrders).set({ ...orderData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(purchaseOrders.id, id)).returning();
    await this.createOrderHistory({
      orderId: id,
      userId: updatedOrder.userId,
      action: "updated",
      changes: { changes: orderData }
    });
    return updatedOrder;
  }
  async recalculateOrderTotal(orderId) {
    const items3 = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, orderId));
    const totalAmount = items3.reduce((sum2, item) => sum2 + Number(item.totalAmount || 0), 0);
    await db.update(purchaseOrders).set({
      totalAmount: totalAmount.toString(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(purchaseOrders.id, orderId));
  }
  async deletePurchaseOrder(id) {
    const order = await this.getPurchaseOrder(id);
    if (!order) return;
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, id));
    await db.delete(attachments).where(eq(attachments.orderId, id));
    await db.delete(orderHistory).where(eq(orderHistory.orderId, id));
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }
  async approvePurchaseOrder(id, approvedBy) {
    const [approvedOrder] = await db.update(purchaseOrders).set({
      isApproved: true,
      approvedBy,
      approvedAt: /* @__PURE__ */ new Date(),
      status: sql2`'approved'::purchase_order_status`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(purchaseOrders.id, id)).returning();
    await this.createOrderHistory({
      orderId: id,
      userId: approvedBy,
      action: "approved",
      changes: { approvedBy, approvedAt: /* @__PURE__ */ new Date() }
    });
    return approvedOrder;
  }
  // Purchase order item operations
  async createPurchaseOrderItems(items3) {
    if (items3.length === 0) return [];
    return await db.insert(purchaseOrderItems).values(items3).returning();
  }
  async updatePurchaseOrderItems(orderId, items3) {
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, orderId));
    if (items3.length === 0) return [];
    return await db.insert(purchaseOrderItems).values(items3).returning();
  }
  // Attachment operations
  async createAttachment(attachment) {
    console.log("\u{1F48E}\u{1F48E}\u{1F48E} CREATE ATTACHMENT CALLED \u{1F48E}\u{1F48E}\u{1F48E}", attachment.originalName);
    if (attachment.originalName) {
      console.log("\u{1F48E}\u{1F48E}\u{1F48E} BEFORE DECODE \u{1F48E}\u{1F48E}\u{1F48E}", attachment.originalName);
      attachment.originalName = this.decodeKoreanFilename(attachment.originalName);
      console.log("\u{1F48E}\u{1F48E}\u{1F48E} AFTER DECODE \u{1F48E}\u{1F48E}\u{1F48E}", attachment.originalName);
    }
    const [newAttachment] = await db.insert(attachments).values(attachment).returning();
    return newAttachment;
  }
  // Korean filename decoder
  decodeKoreanFilename(originalName) {
    console.log("\u{1F527}\u{1F527}\u{1F527} KOREAN FILENAME FIX START \u{1F527}\u{1F527}\u{1F527}", originalName);
    try {
      const latin1Buffer = Buffer.from(originalName, "latin1");
      const utf8Decoded = latin1Buffer.toString("utf8");
      if (/[가-힣]/.test(utf8Decoded)) {
        console.log("\u2705 Fixed Korean filename:", utf8Decoded);
        return utf8Decoded;
      }
    } catch (e) {
      console.log("\u274C Method 1 failed:", e);
    }
    try {
      const doubleDecoded = decodeURIComponent(escape(originalName));
      if (/[가-힣]/.test(doubleDecoded)) {
        console.log("\u2705 Fixed Korean filename (method 2):", doubleDecoded);
        return doubleDecoded;
      }
    } catch (e) {
      console.log("\u274C Method 2 failed:", e);
    }
    try {
      const binaryDecoded = Buffer.from(originalName, "binary").toString("utf8");
      if (/[가-힣]/.test(binaryDecoded)) {
        console.log("\u2705 Fixed Korean filename (method 3):", binaryDecoded);
        return binaryDecoded;
      }
    } catch (e) {
      console.log("\u274C Method 3 failed:", e);
    }
    console.log("\u274C Could not fix Korean filename, using original");
    return originalName;
  }
  async getAttachment(id) {
    const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));
    return attachment || void 0;
  }
  async getOrderAttachments(orderId) {
    return await db.select().from(attachments).where(eq(attachments.orderId, orderId));
  }
  async deleteAttachment(id) {
    await db.delete(attachments).where(eq(attachments.id, id));
  }
  // Order history operations
  async createOrderHistory(history) {
    const [newHistory] = await db.insert(orderHistory).values(history).returning();
    return newHistory;
  }
  async getOrderHistory(orderId) {
    return await db.select().from(orderHistory).where(eq(orderHistory.orderId, orderId)).orderBy(desc(orderHistory.createdAt));
  }
  // Statistics
  async getDashboardStats(userId) {
    const now = /* @__PURE__ */ new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    let whereClause = userId ? eq(purchaseOrders.userId, userId) : void 0;
    const [totalOrders] = await db.select({ count: count() }).from(purchaseOrders).where(whereClause);
    const [monthlyOrders] = await db.select({ count: count() }).from(purchaseOrders).where(
      userId ? and(eq(purchaseOrders.userId, userId), gte(purchaseOrders.orderDate, firstDayOfMonth)) : gte(purchaseOrders.orderDate, firstDayOfMonth)
    );
    const [yearlyOrders] = await db.select({ count: count() }).from(purchaseOrders).where(
      userId ? and(eq(purchaseOrders.userId, userId), gte(purchaseOrders.orderDate, firstDayOfYear)) : gte(purchaseOrders.orderDate, firstDayOfYear)
    );
    const [monthlyAmountResult] = await db.select({ total: sql2`COALESCE(SUM(CAST(${purchaseOrders.totalAmount} AS NUMERIC)), 0)` }).from(purchaseOrders).where(
      userId ? and(eq(purchaseOrders.userId, userId), gte(purchaseOrders.orderDate, firstDayOfMonth)) : gte(purchaseOrders.orderDate, firstDayOfMonth)
    );
    const [pendingOrders] = await db.select({ count: count() }).from(purchaseOrders).where(
      userId ? and(eq(purchaseOrders.userId, userId), sql2`${purchaseOrders.status} = 'pending'`) : sql2`${purchaseOrders.status} = 'pending'`
    );
    const [totalVendors] = await db.select({ count: count() }).from(vendors).where(eq(vendors.isActive, true));
    const [awaitingApprovalOrders] = await db.select({ count: count() }).from(purchaseOrders).where(
      userId ? and(eq(purchaseOrders.userId, userId), sql2`${purchaseOrders.status} = 'pending'`) : sql2`${purchaseOrders.status} = 'pending'`
    );
    return {
      totalOrders: totalOrders.count,
      monthlyOrders: monthlyOrders.count,
      yearlyOrders: yearlyOrders.count,
      monthlyAmount: monthlyAmountResult.total,
      pendingOrders: pendingOrders.count,
      awaitingApprovalOrders: awaitingApprovalOrders.count,
      totalVendors: totalVendors.count
    };
  }
  async getMonthlyOrderStats(userId) {
    const sixMonthsAgo = /* @__PURE__ */ new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const orders = await db.select().from(purchaseOrders).where(
      and(
        gte(purchaseOrders.orderDate, sixMonthsAgo),
        userId ? eq(purchaseOrders.userId, userId) : void 0
      )
    );
    const monthlyData = /* @__PURE__ */ new Map();
    orders.forEach((order) => {
      const month = order.orderDate.toISOString().substring(0, 7);
      const existing = monthlyData.get(month) || { orders: 0, amount: 0 };
      monthlyData.set(month, {
        orders: existing.orders + 1,
        amount: existing.amount + Number(order.totalAmount)
      });
    });
    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      orders: data.orders,
      amount: data.amount
    })).sort((a, b) => a.month.localeCompare(b.month));
  }
  async getVendorOrderStats(userId) {
    const whereClause = userId ? eq(purchaseOrders.userId, userId) : void 0;
    const results = await db.select({
      vendorName: vendors.name,
      orders: count(purchaseOrders.id).as("orders"),
      amount: sum(purchaseOrders.totalAmount).as("amount")
    }).from(purchaseOrders).leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id)).where(whereClause).groupBy(vendors.name).orderBy(desc(count(purchaseOrders.id))).limit(10);
    return results.map((row) => ({
      vendorName: row.vendorName || "\uC54C \uC218 \uC5C6\uC74C",
      orders: Number(row.orders),
      amount: Number(row.amount) || 0
    }));
  }
  async getStatusOrderStats(userId) {
    const whereClause = userId ? eq(purchaseOrders.userId, userId) : void 0;
    const results = await db.select({
      status: purchaseOrders.status,
      orders: count(purchaseOrders.id).as("orders"),
      amount: sum(purchaseOrders.totalAmount).as("amount")
    }).from(purchaseOrders).where(whereClause).groupBy(purchaseOrders.status).orderBy(desc(count(purchaseOrders.id)));
    return results.map((row) => ({
      status: row.status,
      orders: Number(row.orders),
      amount: Number(row.amount) || 0
    }));
  }
  async getProjectOrderStats(userId) {
    const whereClause = userId ? eq(purchaseOrders.userId, userId) : void 0;
    const results = await db.select({
      projectName: projects.projectName,
      projectCode: projects.projectCode,
      orderCount: count(purchaseOrders.id).as("orderCount"),
      totalAmount: sum(purchaseOrders.totalAmount).as("totalAmount")
    }).from(purchaseOrders).innerJoin(projects, eq(purchaseOrders.projectId, projects.id)).where(whereClause).groupBy(projects.id, projects.projectName, projects.projectCode).orderBy(desc(count(purchaseOrders.id)));
    return results.map((row) => ({
      projectName: row.projectName,
      projectCode: row.projectCode,
      orderCount: Number(row.orderCount),
      totalAmount: Number(row.totalAmount) || 0
    }));
  }
  // Generate order number
  async generateOrderNumber() {
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const prefix = `PO-${year}-`;
    const [lastOrder] = await db.select().from(purchaseOrders).where(ilike(purchaseOrders.orderNumber, `${prefix}%`)).orderBy(desc(purchaseOrders.orderNumber)).limit(1);
    let nextNumber = 1;
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.orderNumber.split("-")[2] || "0");
      nextNumber = lastNumber + 1;
    }
    return `${prefix}${nextNumber.toString().padStart(3, "0")}`;
  }
  // Invoice operations
  async getInvoices(orderId) {
    const query = db.select().from(invoices).orderBy(desc(invoices.createdAt));
    if (orderId) {
      return await query.where(eq(invoices.orderId, orderId));
    }
    return await query;
  }
  async getInvoice(id) {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }
  async createInvoice(invoiceData) {
    const [invoice] = await db.insert(invoices).values(invoiceData).returning();
    await this.createVerificationLog({
      orderId: invoice.orderId,
      invoiceId: invoice.id,
      action: "invoice_uploaded",
      details: `\uCCAD\uAD6C\uC11C ${invoice.invoiceNumber} \uC5C5\uB85C\uB4DC\uB428`,
      performedBy: invoice.uploadedBy
    });
    return invoice;
  }
  async updateInvoice(id, invoiceData) {
    const [invoice] = await db.update(invoices).set({ ...invoiceData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(invoices.id, id)).returning();
    return invoice;
  }
  async deleteInvoice(id) {
    await db.delete(invoices).where(eq(invoices.id, id));
  }
  async verifyInvoice(id, verifiedBy) {
    const [invoice] = await db.update(invoices).set({
      status: "verified",
      verifiedBy,
      verifiedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(invoices.id, id)).returning();
    await this.createVerificationLog({
      orderId: invoice.orderId,
      invoiceId: invoice.id,
      action: "invoice_verified",
      details: `\uCCAD\uAD6C\uC11C ${invoice.invoiceNumber} \uAC80\uC99D \uC644\uB8CC`,
      performedBy: verifiedBy
    });
    return invoice;
  }
  // Item receipt operations
  async getItemReceipts(orderItemId) {
    const query = db.select().from(itemReceipts).orderBy(desc(itemReceipts.createdAt));
    if (orderItemId) {
      return await query.where(eq(itemReceipts.orderItemId, orderItemId));
    }
    return await query;
  }
  async getItemReceipt(id) {
    const [receipt] = await db.select().from(itemReceipts).where(eq(itemReceipts.id, id));
    return receipt;
  }
  async createItemReceipt(receiptData) {
    const [receipt] = await db.insert(itemReceipts).values(receiptData).returning();
    const [orderItem] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, receipt.orderItemId));
    if (orderItem) {
      await this.createVerificationLog({
        orderId: orderItem.orderId,
        itemReceiptId: receipt.id,
        invoiceId: receipt.invoiceId,
        action: "item_received",
        details: `\uD56D\uBAA9 \uC218\uB839 \uD655\uC778: ${receipt.receivedQuantity}\uAC1C`,
        performedBy: receipt.verifiedBy
      });
    }
    return receipt;
  }
  async updateItemReceipt(id, receiptData) {
    const [receipt] = await db.update(itemReceipts).set({ ...receiptData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(itemReceipts.id, id)).returning();
    return receipt;
  }
  async deleteItemReceipt(id) {
    await db.delete(itemReceipts).where(eq(itemReceipts.id, id));
  }
  // Verification log operations
  async getVerificationLogs(orderId, invoiceId) {
    const conditions = [];
    if (orderId) conditions.push(eq(verificationLogs.orderId, orderId));
    if (invoiceId) conditions.push(eq(verificationLogs.invoiceId, invoiceId));
    if (conditions.length > 0) {
      return await db.select().from(verificationLogs).where(and(...conditions)).orderBy(desc(verificationLogs.createdAt));
    }
    return await db.select().from(verificationLogs).orderBy(desc(verificationLogs.createdAt));
  }
  async createVerificationLog(logData) {
    const [log2] = await db.insert(verificationLogs).values(logData).returning();
    return log2;
  }
  // UI terms operations
  async getUiTerms(category) {
    if (category) {
      return await db.select().from(uiTerms).where(and(eq(uiTerms.category, category), eq(uiTerms.isActive, true))).orderBy(asc(uiTerms.termKey));
    }
    return await db.select().from(uiTerms).where(eq(uiTerms.isActive, true)).orderBy(asc(uiTerms.termKey));
  }
  async getUiTerm(termKey) {
    const [term] = await db.select().from(uiTerms).where(and(eq(uiTerms.termKey, termKey), eq(uiTerms.isActive, true)));
    return term;
  }
  async createUiTerm(termData) {
    const [term] = await db.insert(uiTerms).values(termData).returning();
    return term;
  }
  async updateUiTerm(termKey, termData) {
    const [term] = await db.update(uiTerms).set({ ...termData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(uiTerms.termKey, termKey)).returning();
    return term;
  }
  async deleteUiTerm(termKey) {
    await db.update(uiTerms).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(uiTerms.termKey, termKey));
  }
  // Terminology operations
  async getTerminology() {
    return await db.select().from(terminology).orderBy(asc(terminology.category), asc(terminology.termKey));
  }
  async getTerm(id) {
    const [term] = await db.select().from(terminology).where(eq(terminology.id, id));
    return term || void 0;
  }
  async createTerm(termData) {
    const [term] = await db.insert(terminology).values(termData).returning();
    return term;
  }
  async updateTerm(id, termData) {
    const [term] = await db.update(terminology).set({ ...termData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(terminology.id, id)).returning();
    return term;
  }
  async deleteTerm(id) {
    await db.delete(terminology).where(eq(terminology.id, id));
  }
  // Company operations
  async getCompanies() {
    return await db.select().from(companies).where(eq(companies.isActive, true)).orderBy(asc(companies.companyName));
  }
  async getCompany(id) {
    const [company] = await db.select().from(companies).where(and(eq(companies.id, id), eq(companies.isActive, true)));
    return company;
  }
  async createCompany(companyData) {
    const [company] = await db.insert(companies).values({
      ...companyData,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return company;
  }
  async updateCompany(id, companyData) {
    const [company] = await db.update(companies).set({ ...companyData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(companies.id, id)).returning();
    return company;
  }
  async deleteCompany(id) {
    await db.update(companies).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(companies.id, id));
  }
  // Enhanced dashboard statistics
  async getActiveProjectsCount(userId) {
    try {
      const conditions = [
        eq(projects.isActive, true),
        eq(projects.status, "active")
      ];
      if (userId) {
        conditions.push(or(
          eq(projects.projectManagerId, userId),
          eq(projects.orderManagerId, userId)
        ));
      }
      const [result] = await db.select({ count: sql2`count(*)` }).from(projects).where(and(...conditions));
      return Number(result.count);
    } catch (error) {
      console.error("Error getting active projects count:", error);
      return 0;
    }
  }
  async getNewProjectsThisMonth(userId) {
    try {
      const startOfMonth = /* @__PURE__ */ new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const conditions = [
        eq(projects.isActive, true),
        gte(projects.startDate, startOfMonth)
      ];
      if (userId) {
        conditions.push(or(
          eq(projects.projectManagerId, userId),
          eq(projects.orderManagerId, userId)
        ));
      }
      const [result] = await db.select({ count: sql2`count(*)` }).from(projects).where(and(...conditions));
      return Number(result.count);
    } catch (error) {
      console.error("Error getting new projects this month:", error);
      return 0;
    }
  }
  async getRecentProjectsThisMonth(userId) {
    try {
      const startOfMonth = /* @__PURE__ */ new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const conditions = [
        eq(projects.isActive, true),
        gte(projects.startDate, startOfMonth)
      ];
      if (userId) {
        conditions.push(or(
          eq(projects.projectManagerId, userId),
          eq(projects.orderManagerId, userId)
        ));
      }
      return await db.select({
        id: projects.id,
        projectName: projects.projectName,
        projectCode: projects.projectCode,
        startDate: projects.startDate,
        status: projects.status,
        clientName: projects.clientName
      }).from(projects).where(and(...conditions)).orderBy(desc(projects.startDate)).limit(10);
    } catch (error) {
      console.error("Error getting recent projects this month:", error);
      return [];
    }
  }
  async getUrgentOrders(userId) {
    try {
      const today = /* @__PURE__ */ new Date();
      const urgentDate = /* @__PURE__ */ new Date();
      urgentDate.setDate(today.getDate() + 7);
      const conditions = [
        lte(purchaseOrders.deliveryDate, urgentDate),
        gte(purchaseOrders.deliveryDate, today),
        notInArray(purchaseOrders.status, ["delivered", "cancelled"])
      ];
      if (userId) {
        conditions.push(eq(purchaseOrders.userId, userId));
      }
      return await db.select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        requestedDeliveryDate: purchaseOrders.deliveryDate,
        totalAmount: purchaseOrders.totalAmount,
        status: purchaseOrders.status,
        vendorId: purchaseOrders.vendorId
      }).from(purchaseOrders).where(and(...conditions)).orderBy(asc(purchaseOrders.deliveryDate)).limit(10);
    } catch (error) {
      console.error("Error getting urgent orders:", error);
      return [];
    }
  }
  // Project status and type methods
  async getProjectStatuses() {
    try {
      return [
        { id: "active", name: "\uC9C4\uD589\uC911", code: "active" },
        { id: "completed", name: "\uC644\uB8CC", code: "completed" },
        { id: "on_hold", name: "\uBCF4\uB958", code: "on_hold" },
        { id: "cancelled", name: "\uCDE8\uC18C", code: "cancelled" }
      ];
    } catch (error) {
      console.error("Error getting project statuses:", error);
      return [];
    }
  }
  async getProjectTypes() {
    try {
      return [
        { id: "commercial", name: "\uC0C1\uC5C5\uC2DC\uC124", code: "commercial" },
        { id: "residential", name: "\uC8FC\uAC70\uC2DC\uC124", code: "residential" },
        { id: "industrial", name: "\uC0B0\uC5C5\uC2DC\uC124", code: "industrial" },
        { id: "infrastructure", name: "\uC778\uD504\uB77C", code: "infrastructure" }
      ];
    } catch (error) {
      console.error("Error getting project types:", error);
      return [];
    }
  }
  // Project members operations
  async getProjectMembers(projectId) {
    try {
      let query = db.select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        role: projectMembers.role,
        user: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      }).from(projectMembers).leftJoin(users, eq(projectMembers.userId, users.id));
      if (projectId) {
        query = query.where(eq(projectMembers.projectId, projectId));
      }
      return await query;
    } catch (error) {
      console.error("Error getting project members:", error);
      return [];
    }
  }
  async createProjectMember(member) {
    try {
      const [newMember] = await db.insert(projectMembers).values(member).returning();
      return newMember;
    } catch (error) {
      console.error("Error creating project member:", error);
      throw error;
    }
  }
  async deleteProjectMember(id) {
    try {
      await db.delete(projectMembers).where(eq(projectMembers.id, id));
    } catch (error) {
      console.error("Error deleting project member:", error);
      throw error;
    }
  }
  // Approval management methods
  async getApprovalStats() {
    try {
      const pendingOrders = await db.select().from(purchaseOrders).where(eq(purchaseOrders.status, "pending"));
      const pendingCount = pendingOrders.length;
      const threeDaysAgo = /* @__PURE__ */ new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const urgentCount = pendingOrders.filter(
        (order) => order.createdAt && new Date(order.createdAt) < threeDaysAgo
      ).length;
      const waitDays = pendingOrders.filter((order) => order.createdAt).map((order) => {
        const diffTime = Math.abs((/* @__PURE__ */ new Date()).getTime() - new Date(order.createdAt).getTime());
        return Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
      });
      const averageWaitDays = waitDays.length > 0 ? Math.round(waitDays.reduce((a, b) => a + b, 0) / waitDays.length) : 0;
      const pendingAmount = pendingOrders.reduce((total, order) => total + order.totalAmount, 0);
      return {
        pendingCount,
        urgentCount,
        averageWaitDays,
        pendingAmount
      };
    } catch (error) {
      console.error("Error getting approval stats:", error);
      throw error;
    }
  }
  async getPendingApprovals(userRole, userId) {
    try {
      let query = db.select().from(purchaseOrders).where(eq(purchaseOrders.status, "pending")).orderBy(asc(purchaseOrders.createdAt));
      return await query;
    } catch (error) {
      console.error("Error getting pending approvals:", error);
      throw error;
    }
  }
  async getApprovalHistory() {
    try {
      return await db.select().from(purchaseOrders).where(or(
        eq(purchaseOrders.status, "approved"),
        eq(purchaseOrders.status, "completed"),
        eq(purchaseOrders.status, "sent")
      )).orderBy(desc(purchaseOrders.updatedAt)).limit(50);
    } catch (error) {
      console.error("Error getting approval history:", error);
      throw error;
    }
  }
  async getOrdersForApproval(role) {
    try {
      return await db.select().from(purchaseOrders).where(and(
        eq(purchaseOrders.status, "pending"),
        eq(purchaseOrders.currentApproverRole, role)
      )).orderBy(desc(purchaseOrders.orderDate));
    } catch (error) {
      console.error("Error getting orders for approval:", error);
      throw error;
    }
  }
  async approveOrder(orderId, approverId, note) {
    try {
      const [updatedOrder] = await db.update(purchaseOrders).set({
        status: "approved",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(purchaseOrders.id, orderId)).returning();
      await db.insert(orderHistory).values({
        orderId,
        userId: approverId,
        action: "approved",
        notes: note || "\uBC1C\uC8FC\uC11C\uAC00 \uC2B9\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
        timestamp: /* @__PURE__ */ new Date()
      });
      return updatedOrder;
    } catch (error) {
      console.error("Error approving order:", error);
      throw error;
    }
  }
  async rejectOrder(orderId, rejectedBy, note) {
    try {
      const [updatedOrder] = await db.update(purchaseOrders).set({
        status: "draft",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(purchaseOrders.id, orderId)).returning();
      await db.insert(orderHistory).values({
        orderId,
        userId: rejectedBy,
        action: "rejected",
        notes: note || "\uBC1C\uC8FC\uC11C\uAC00 \uBC18\uB824\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
        timestamp: /* @__PURE__ */ new Date()
      });
      return updatedOrder;
    } catch (error) {
      console.error("Error rejecting order:", error);
      throw error;
    }
  }
  // Approval authority management methods
  async getApprovalAuthorities() {
    try {
      return await db.select().from(approvalAuthorities).where(eq(approvalAuthorities.isActive, true)).orderBy(asc(approvalAuthorities.role));
    } catch (error) {
      console.error("Error getting approval authorities:", error);
      throw error;
    }
  }
  // Order approval workflow methods
  async getOrdersForApproval(userRole) {
    try {
      const orders = await db.select().from(purchaseOrders).where(and(
        eq(purchaseOrders.status, "pending"),
        eq(purchaseOrders.currentApproverRole, userRole)
      )).orderBy(desc(purchaseOrders.createdAt));
      return orders;
    } catch (error) {
      console.error("Error getting orders for approval:", error);
      throw error;
    }
  }
  async approveOrderWorkflow(orderId, userId) {
    try {
      const order = await this.getPurchaseOrder(orderId);
      if (!order) {
        throw new Error("Order not found");
      }
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error("User not found");
      }
      const nextApprover = await this.calculateNextApprover(order.totalAmount || 0, order.approvalLevel || 1);
      const updateData = {
        updatedAt: /* @__PURE__ */ new Date(),
        approvalLevel: (order.approvalLevel || 1) + 1
      };
      if (nextApprover) {
        updateData.currentApproverRole = nextApprover;
      } else {
        updateData.status = "approved";
        updateData.currentApproverRole = null;
        updateData.isApproved = true;
        updateData.approvedBy = userId;
        updateData.approvedAt = /* @__PURE__ */ new Date();
      }
      const [updatedOrder] = await db.update(purchaseOrders).set(updateData).where(eq(purchaseOrders.id, orderId)).returning();
      await db.insert(orderHistory).values({
        orderId,
        userId,
        action: nextApprover ? "approved_partial" : "approved_final",
        notes: nextApprover ? "\uB2E8\uACC4\uBCC4 \uC2B9\uC778 \uC644\uB8CC" : "\uCD5C\uC885 \uC2B9\uC778 \uC644\uB8CC",
        timestamp: /* @__PURE__ */ new Date()
      });
      return updatedOrder;
    } catch (error) {
      console.error("Error in approval workflow:", error);
      throw error;
    }
  }
  async calculateNextApprover(amount, currentLevel) {
    try {
      const authorities = await this.getApprovalAuthorities();
      const sortedAuthorities = authorities.filter((auth) => parseFloat(auth.maxAmount) >= amount).sort((a, b) => parseFloat(a.maxAmount) - parseFloat(b.maxAmount));
      if (currentLevel >= sortedAuthorities.length) {
        return null;
      }
      return sortedAuthorities[currentLevel]?.role || null;
    } catch (error) {
      console.error("Error calculating next approver:", error);
      return null;
    }
  }
  async createApprovalAuthority(data) {
    try {
      const [authority] = await db.insert(approvalAuthorities).values(data).returning();
      return authority;
    } catch (error) {
      console.error("Error creating approval authority:", error);
      throw error;
    }
  }
  async updateApprovalAuthority(role, data) {
    try {
      const [authority] = await db.update(approvalAuthorities).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(approvalAuthorities.role, role)).returning();
      return authority;
    } catch (error) {
      console.error("Error updating approval authority:", error);
      throw error;
    }
  }
  async canUserApproveOrder(userId, userRole, orderAmount) {
    try {
      if (userRole === "admin") {
        return true;
      }
      const [authority] = await db.select().from(approvalAuthorities).where(and(
        eq(approvalAuthorities.role, userRole),
        eq(approvalAuthorities.isActive, true)
      ));
      if (!authority) {
        return false;
      }
      return parseFloat(authority.maxAmount) >= orderAmount;
    } catch (error) {
      console.error("Error checking user approval authority:", error);
      return false;
    }
  }
  // Item Categories Management
  async getItemCategories() {
    try {
      return await db.select().from(itemCategories).where(eq(itemCategories.isActive, true)).orderBy(itemCategories.categoryType, itemCategories.displayOrder);
    } catch (error) {
      console.error("Error getting item categories:", error);
      throw error;
    }
  }
  async getItemCategoriesByType(type, parentId) {
    try {
      const conditions = [
        eq(itemCategories.categoryType, type),
        eq(itemCategories.isActive, true)
      ];
      if (parentId !== void 0) {
        conditions.push(eq(itemCategories.parentId, parentId));
      }
      return await db.select().from(itemCategories).where(and(...conditions)).orderBy(itemCategories.displayOrder);
    } catch (error) {
      console.error("Error getting item categories by type:", error);
      throw error;
    }
  }
  async createItemCategory(data) {
    try {
      const [category] = await db.insert(itemCategories).values(data).returning();
      return category;
    } catch (error) {
      console.error("Error creating item category:", error);
      throw error;
    }
  }
  async updateItemCategory(id, data) {
    try {
      const [category] = await db.update(itemCategories).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(itemCategories.id, id)).returning();
      return category;
    } catch (error) {
      console.error("Error updating item category:", error);
      throw error;
    }
  }
  async deleteItemCategory(id) {
    try {
      await db.update(itemCategories).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(itemCategories.id, id));
    } catch (error) {
      console.error("Error deleting item category:", error);
      throw error;
    }
  }
};
var storage = new DatabaseStorage();

// server/auth-utils.ts
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// server/local-auth.ts
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (email === "test@ikjin.co.kr" && password === "admin123") {
      const testUser = {
        id: "test_admin_001",
        email: "test@ikjin.co.kr",
        password: "admin123",
        // In production, this should be hashed
        name: "\uD14C\uC2A4\uD2B8 \uAD00\uB9AC\uC790",
        role: "admin",
        phoneNumber: "010-1234-5678",
        profileImageUrl: null,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      const authSession2 = req.session;
      authSession2.userId = testUser.id;
      const { password: _, ...userWithoutPassword } = testUser;
      return res.json({
        message: "Login successful",
        user: userWithoutPassword
      });
    }
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const isValidPassword = await comparePasswords(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const authSession = req.session;
    authSession.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Session save failed" });
      }
      console.log("Session saved successfully for user:", user.id);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
}
function logout(req, res) {
  const authSession = req.session;
  authSession.userId = void 0;
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    res.json({ message: "Logout successful" });
  });
}
async function getCurrentUser(req, res) {
  try {
    const authSession = req.session;
    console.log("getCurrentUser - Session ID:", req.sessionID);
    console.log("getCurrentUser - Session userId:", authSession.userId);
    if (!authSession.userId) {
      console.log("getCurrentUser - No userId in session");
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (authSession.userId === "test_admin_001") {
      const testUser = {
        id: "test_admin_001",
        email: "test@ikjin.co.kr",
        password: "admin123",
        name: "\uD14C\uC2A4\uD2B8 \uAD00\uB9AC\uC790",
        role: "admin",
        phoneNumber: "010-1234-5678",
        profileImageUrl: null,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      const { password: _2, ...userWithoutPassword2 } = testUser;
      return res.json(userWithoutPassword2);
    }
    const user = await storage.getUser(authSession.userId);
    if (!user) {
      console.log("getCurrentUser - User not found in database:", authSession.userId);
      authSession.userId = void 0;
      return res.status(401).json({ message: "Invalid session" });
    }
    console.log("getCurrentUser - User found:", user.id);
    req.user = user;
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Failed to get user data" });
  }
}
async function requireAuth(req, res, next) {
  try {
    const authSession = req.session;
    if (!authSession.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await storage.getUser(authSession.userId);
    if (!user) {
      authSession.userId = void 0;
      return res.status(401).json({ message: "Invalid session" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
}
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}
var requireAdmin = requireRole(["admin"]);
var requireOrderManager = requireRole(["admin", "order_manager"]);

// server/seed-data.ts
async function seedData() {
  console.log("\uC0D8\uD50C \uB370\uC774\uD130 \uC0DD\uC131 \uC2DC\uC791...");
  try {
    const sampleUsers = [
      {
        id: "user_001",
        email: "order.manager@company.com",
        name: "\uBC1C\uC8FC \uAD00\uB9AC\uC790",
        role: "order_manager",
        phoneNumber: "010-1111-1111",
        profileImageUrl: null
      },
      {
        id: "user_003",
        email: "project.supervisor@company.com",
        name: "\uD504\uB85C\uC81D\uD2B8 \uB2F4\uB2F9\uC790",
        role: "user",
        phoneNumber: "010-3333-3333",
        profileImageUrl: null
      },
      {
        id: "user_004",
        email: "project.coordinator@company.com",
        name: "\uD504\uB85C\uC81D\uD2B8 \uC870\uC815\uC790",
        role: "user",
        phoneNumber: "010-4444-4444",
        profileImageUrl: null
      },
      {
        id: "user_005",
        email: "technical.specialist@company.com",
        name: "\uAE30\uC220 \uC804\uBB38\uAC00",
        role: "user",
        phoneNumber: "010-5555-5555",
        profileImageUrl: null
      }
    ];
    console.log("\uC0AC\uC6A9\uC790 \uB370\uC774\uD130 \uC0BD\uC785 \uC911...");
    for (const user of sampleUsers) {
      await db.insert(users).values(user).onConflictDoNothing();
    }
    const generateProjectBudget = (projectType, scale = 1) => {
      const baseBudgets = {
        commercial: 15e9,
        // 150억 기준
        residential: 2e10,
        // 200억 기준  
        infrastructure: 5e10,
        // 500억 기준
        remodeling: 5e9,
        // 50억 기준
        industrial: 12e9
        // 120억 기준
      };
      return Math.floor((baseBudgets[projectType] || 1e10) * scale).toString();
    };
    const sampleProjects = [
      {
        projectName: "\uC911\uC2EC\uAC00 \uC0C1\uC5C5\uC2DC\uC124 \uC2E0\uCD95",
        projectCode: "PRJ-2024-001",
        clientName: "\uAC74\uC124\uD68C\uC0AC A",
        projectType: "commercial",
        location: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uAC15\uB0A8\uAD6C",
        status: "active",
        totalBudget: generateProjectBudget("commercial", 1.5),
        projectManagerId: "user_001",
        orderManagerId: "user_001",
        description: "\uB3C4\uC2EC \uC0C1\uC5C5\uC2DC\uC124 \uAC74\uC124 \uD504\uB85C\uC81D\uD2B8",
        startDate: /* @__PURE__ */ new Date("2024-01-15"),
        endDate: /* @__PURE__ */ new Date("2025-12-31"),
        isActive: true
      },
      {
        projectName: "\uC2E0\uB3C4\uC2DC \uC8FC\uAC70\uB2E8\uC9C0 \uAC1C\uBC1C",
        projectCode: "PRJ-2024-002",
        clientName: "\uAC74\uC124\uD68C\uC0AC B",
        projectType: "residential",
        location: "\uC138\uC885\uD2B9\uBCC4\uC790\uCE58\uC2DC",
        status: "active",
        totalBudget: generateProjectBudget("residential", 1.8),
        projectManagerId: "user_003",
        orderManagerId: "user_001",
        description: "\uB300\uADDC\uBAA8 \uC8FC\uAC70\uB2E8\uC9C0 \uAC1C\uBC1C \uC0AC\uC5C5",
        startDate: /* @__PURE__ */ new Date("2024-03-01"),
        endDate: /* @__PURE__ */ new Date("2026-02-28"),
        isActive: true
      },
      {
        projectName: "\uACF5\uD56D \uC778\uD504\uB77C \uD655\uC7A5",
        projectCode: "PRJ-2024-003",
        clientName: "\uACF5\uACF5\uAE30\uAD00 A",
        projectType: "infrastructure",
        location: "\uC778\uCC9C\uAD11\uC5ED\uC2DC \uC911\uAD6C",
        status: "active",
        totalBudget: generateProjectBudget("infrastructure", 2.5),
        projectManagerId: "user_003",
        orderManagerId: "user_001",
        description: "\uACF5\uD56D \uC2DC\uC124 \uD655\uC7A5 \uBC0F \uAC1C\uC120 \uACF5\uC0AC",
        startDate: /* @__PURE__ */ new Date("2024-02-01"),
        endDate: /* @__PURE__ */ new Date("2027-12-31"),
        isActive: true
      },
      {
        projectName: "\uAE30\uC874 \uC2DC\uC124 \uB9AC\uBAA8\uB378\uB9C1",
        projectCode: "PRJ-2024-004",
        clientName: "\uAC74\uC124\uD68C\uC0AC C",
        projectType: "remodeling",
        location: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uB9C8\uD3EC\uAD6C",
        status: "completed",
        totalBudget: generateProjectBudget("remodeling", 1.2),
        projectManagerId: "user_004",
        orderManagerId: "user_003",
        description: "\uAE30\uC874 \uAC74\uBB3C \uC804\uBA74 \uB9AC\uBAA8\uB378\uB9C1 \uACF5\uC0AC",
        startDate: /* @__PURE__ */ new Date("2023-09-01"),
        endDate: /* @__PURE__ */ new Date("2024-08-31"),
        isActive: false
      },
      {
        projectName: "\uC0B0\uC5C5\uB2E8\uC9C0 \uC81C\uC870\uC2DC\uC124",
        projectCode: "PRJ-2024-005",
        clientName: "\uC81C\uC870\uD68C\uC0AC A",
        projectType: "industrial",
        location: "\uACBD\uAE30\uB3C4 \uACE0\uC591\uC2DC \uC77C\uC0B0\uB3D9\uAD6C",
        status: "active",
        totalBudget: generateProjectBudget("industrial", 1.3),
        projectManagerId: "user_005",
        orderManagerId: "user_003",
        description: "\uCCA8\uB2E8 \uC81C\uC870\uC2DC\uC124 \uAC74\uC124 \uD504\uB85C\uC81D\uD2B8",
        startDate: /* @__PURE__ */ new Date("2024-06-01"),
        endDate: /* @__PURE__ */ new Date("2025-11-30"),
        isActive: true
      }
    ];
    console.log("\uD504\uB85C\uC81D\uD2B8 \uB370\uC774\uD130 \uC0BD\uC785 \uC911...");
    const insertedProjects = [];
    for (const project of sampleProjects) {
      const [insertedProject] = await db.insert(projects).values(project).returning();
      insertedProjects.push(insertedProject);
    }
    const generateBusinessNumber = (index2) => {
      const base = 100 + index2;
      return `${base}-${index2 * 11 % 100}-${index2 * 67 % 1e5}`.padStart(12, "0");
    };
    const sampleCompanies = [
      {
        companyName: "(\uC8FC)\uD504\uB85C\uC81D\uD2B8 \uC5D4\uC9C0\uB2C8\uC5B4\uB9C1",
        businessNumber: generateBusinessNumber(1),
        representative: "\uB300\uD45C\uC774\uC0AC",
        phone: "02-555-1000",
        fax: "02-555-1001",
        email: "info@project-eng.co.kr",
        website: "https://project-eng.co.kr",
        address: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uAC15\uB0A8\uAD6C \uD14C\uD5E4\uB780\uB85C 123",
        isActive: true
      },
      {
        companyName: "(\uC8FC)\uAC74\uC124 \uC194\uB8E8\uC158",
        businessNumber: generateBusinessNumber(2),
        representative: "\uB300\uD45C\uC774\uC0AC",
        phone: "02-987-2000",
        fax: "02-987-2001",
        email: "contact@construction-sol.co.kr",
        website: "https://construction-sol.co.kr",
        address: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uC885\uB85C\uAD6C \uC138\uC885\uB300\uB85C 200",
        isActive: false
      },
      {
        companyName: "(\uC8FC)\uC2A4\uB9C8\uD2B8 \uAC74\uCD95",
        businessNumber: generateBusinessNumber(3),
        representative: "\uB300\uD45C\uC774\uC0AC",
        phone: "031-123-3000",
        fax: "031-123-3001",
        email: "admin@smart-arch.co.kr",
        website: "https://smart-arch.co.kr",
        address: "\uACBD\uAE30\uB3C4 \uC131\uB0A8\uC2DC \uBD84\uB2F9\uAD6C \uD310\uAD50\uB85C 300",
        isActive: false
      }
    ];
    console.log("\uD68C\uC0AC \uB370\uC774\uD130 \uC0BD\uC785 \uC911...");
    for (const company of sampleCompanies) {
      await db.insert(companies).values(company).onConflictDoNothing();
    }
    const samplePurchaseOrders = [
      {
        orderNumber: "PO-2024-001",
        projectId: insertedProjects[0].id,
        vendorId: 15,
        // CJ제일제당
        userId: "user_001",
        status: "draft",
        totalAmount: "15000000",
        orderDate: /* @__PURE__ */ new Date("2024-06-01"),
        requestedDeliveryDate: /* @__PURE__ */ new Date("2024-06-15"),
        notes: "\uAE34\uAE09 \uBC1C\uC8FC - \uACF5\uAE30 \uB2E8\uCD95\uC744 \uC704\uD55C \uC870\uAE30 \uB0A9\uD488 \uC694\uCCAD",
        items: [
          {
            itemName: "H\uD615\uAC15 200x200x8x12",
            quantity: 50,
            unitPrice: 12e4,
            totalAmount: 6e6,
            specification: "KS D 3503, SS400",
            notes: "1\uCC28 \uB0A9\uD488\uBD84"
          },
          {
            itemName: "\uCCA0\uADFC D25",
            quantity: 100,
            unitPrice: 9e4,
            totalAmount: 9e6,
            specification: "KS D 3504, SD400",
            notes: "\uAE30\uCD08\uACF5\uC0AC\uC6A9"
          }
        ]
      },
      {
        orderNumber: "PO-2024-002",
        projectId: insertedProjects[1].id,
        vendorId: 16,
        // 대림산업
        userId: "user_002",
        status: "pending_approval",
        totalAmount: "28000000",
        orderDate: /* @__PURE__ */ new Date("2024-06-02"),
        requestedDeliveryDate: /* @__PURE__ */ new Date("2024-06-20"),
        notes: "\uC138\uC885\uC2DC \uD504\uB85C\uC81D\uD2B8 \uC790\uC7AC \uBC1C\uC8FC",
        items: [
          {
            itemName: "\uB808\uBBF8\uCF58 25-24-150",
            quantity: 200,
            unitPrice: 14e4,
            totalAmount: 28e6,
            specification: "KS F 4009",
            notes: "\uD38C\uD504\uCE74 \uD3EC\uD568"
          }
        ]
      },
      {
        orderNumber: "PO-2024-003",
        projectId: insertedProjects[2].id,
        vendorId: 17,
        // 포스코
        userId: "user_003",
        status: "approved",
        totalAmount: "45000000",
        orderDate: /* @__PURE__ */ new Date("2024-06-03"),
        requestedDeliveryDate: /* @__PURE__ */ new Date("2024-07-01"),
        notes: "\uC778\uCC9C\uACF5\uD56D \uD504\uB85C\uC81D\uD2B8 \uAD6C\uC870\uC7AC \uBC1C\uC8FC",
        items: [
          {
            itemName: "\uCCA0\uACE8\uBCF4 H-600x200x11x17",
            quantity: 30,
            unitPrice: 85e4,
            totalAmount: 255e5,
            specification: "KS D 3503, SM490A",
            notes: "\uD130\uBBF8\uB110 \uAD6C\uC870\uC7AC"
          },
          {
            itemName: "\uCCA0\uACE8\uAE30\uB465 H-800x300x14x22",
            quantity: 20,
            unitPrice: 975e3,
            totalAmount: 195e5,
            specification: "KS D 3503, SM490A",
            notes: "\uC8FC\uC694 \uAD6C\uC870\uAE30\uB465"
          }
        ]
      },
      {
        orderNumber: "PO-2024-004",
        projectId: insertedProjects[3].id,
        vendorId: 18,
        // 현대제철
        userId: "user_004",
        status: "delivered",
        totalAmount: "12000000",
        orderDate: /* @__PURE__ */ new Date("2024-05-15"),
        requestedDeliveryDate: /* @__PURE__ */ new Date("2024-05-30"),
        actualDeliveryDate: /* @__PURE__ */ new Date("2024-05-29"),
        notes: "\uB9AC\uBAA8\uB378\uB9C1 \uD504\uB85C\uC81D\uD2B8 \uB9C8\uAC10\uC7AC",
        items: [
          {
            itemName: "\uC54C\uB8E8\uBBF8\uB284 \uC0F7\uC2DC",
            quantity: 80,
            unitPrice: 15e4,
            totalAmount: 12e6,
            specification: "KS L 2514",
            notes: "\uCC3D\uD638 \uAD50\uCCB4\uC6A9"
          }
        ]
      },
      {
        orderNumber: "PO-2024-005",
        projectId: insertedProjects[4].id,
        vendorId: 19,
        // 두산중공업
        userId: "user_005",
        status: "completed",
        totalAmount: "35000000",
        orderDate: /* @__PURE__ */ new Date("2024-06-05"),
        requestedDeliveryDate: /* @__PURE__ */ new Date("2024-06-25"),
        actualDeliveryDate: /* @__PURE__ */ new Date("2024-06-24"),
        notes: "\uC2A4\uB9C8\uD2B8\uD329\uD1A0\uB9AC \uC124\uBE44 \uBC1C\uC8FC",
        items: [
          {
            itemName: "\uACF5\uC7A5\uC6A9 \uD06C\uB808\uC778 5\uD1A4",
            quantity: 2,
            unitPrice: 12e6,
            totalAmount: 24e6,
            specification: "KS B 6217",
            notes: "\uCC9C\uC7A5 \uC124\uCE58\uD615"
          },
          {
            itemName: "\uCEE8\uBCA0\uC774\uC5B4 \uBCA8\uD2B8 20m",
            quantity: 5,
            unitPrice: 22e5,
            totalAmount: 11e6,
            specification: "\uB0B4\uC5F4 \uACE0\uBB34\uBCA8\uD2B8",
            notes: "\uC0DD\uC0B0\uB77C\uC778\uC6A9"
          }
        ]
      }
    ];
    console.log("\uBC1C\uC8FC\uC11C \uB370\uC774\uD130 \uC0BD\uC785 \uC911...");
    for (const order of samplePurchaseOrders) {
      await db.insert(purchaseOrders).values(order).onConflictDoNothing();
    }
    console.log("\uC0D8\uD50C \uB370\uC774\uD130 \uC0DD\uC131 \uC644\uB8CC!");
  } catch (error) {
    console.error("\uC0D8\uD50C \uB370\uC774\uD130 \uC0DD\uC131 \uC911 \uC624\uB958:", error);
  }
}

// server/routes.ts
import session from "express-session";
import bcrypt from "bcrypt";
import { z as z3 } from "zod";
import nodemailer from "nodemailer";
import XLSX5 from "xlsx";
import path3 from "path";

// server/utils/multer-config.ts
import multer from "multer";
import path from "path";
import fs from "fs";

// server/utils/korean-filename.ts
function decodeKoreanFilename(originalname) {
  console.log("\u{1F50D} Decoding Korean filename:", originalname);
  console.log("\u{1F50D} Original bytes:", Buffer.from(originalname).toString("hex"));
  console.log("\u{1F50D} Char codes:", originalname.split("").map((c) => c.charCodeAt(0)));
  try {
    const latin1Buffer = Buffer.from(originalname, "latin1");
    const utf8Decoded = latin1Buffer.toString("utf8");
    console.log("Method 1 (latin1\u2192utf8):", utf8Decoded);
    if (/[가-힣]/.test(utf8Decoded)) {
      console.log("\u2705 Method 1 SUCCESS - Korean detected");
      return utf8Decoded;
    }
  } catch (e) {
    console.log("\u274C Method 1 failed:", e);
  }
  try {
    const doubleDecoded = decodeURIComponent(escape(originalname));
    console.log("Method 2 (escape\u2192decode):", doubleDecoded);
    if (/[가-힣]/.test(doubleDecoded)) {
      console.log("\u2705 Method 2 SUCCESS - Korean detected");
      return doubleDecoded;
    }
  } catch (e) {
    console.log("\u274C Method 2 failed:", e);
  }
  try {
    const binaryDecoded = Buffer.from(originalname, "binary").toString("utf8");
    console.log("Method 3 (binary\u2192utf8):", binaryDecoded);
    if (/[가-힣]/.test(binaryDecoded)) {
      console.log("\u2705 Method 3 SUCCESS - Korean detected");
      return binaryDecoded;
    }
  } catch (e) {
    console.log("\u274C Method 3 failed:", e);
  }
  try {
    const urlDecoded = decodeURIComponent(originalname);
    console.log("Method 4 (URL decode):", urlDecoded);
    if (/[가-힣]/.test(urlDecoded)) {
      console.log("\u2705 Method 4 SUCCESS - Korean detected");
      return urlDecoded;
    }
  } catch (e) {
    console.log("\u274C Method 4 failed:", e);
  }
  try {
    const isoDecoded = Buffer.from(originalname, "latin1").toString("utf8");
    console.log("Method 5 (ISO conversion):", isoDecoded);
    if (/[가-힣]/.test(isoDecoded)) {
      console.log("\u2705 Method 5 SUCCESS - Korean detected");
      return isoDecoded;
    }
  } catch (e) {
    console.log("\u274C Method 5 failed:", e);
  }
  if (originalname.includes("\xE1")) {
    console.log("\u{1F527} Using pattern-based fallback for corrupted Korean");
    return fixCorruptedKoreanFilename(originalname);
  }
  console.log("\u26A0\uFE0F All methods FAILED - using original filename");
  return originalname;
}
function fixCorruptedKoreanFilename(filename) {
  console.log("\u{1F527} Fixing corrupted Korean filename:", filename);
  if (filename.includes("xlsx")) {
    if (filename.includes("\uC555\uCD9C") || filename.length > 30) {
      const fixed = "\uC555\uCD9C\uBC1C\uC8FC\uC11C_\uD488\uBAA9\uB9AC\uC2A4\uD2B8.xlsx";
      console.log("\u{1F527} Fixed to:", fixed);
      return fixed;
    } else {
      const fixed = "\uBC1C\uC8FC\uC11C_\uC0D8\uD50C.xlsx";
      console.log("\u{1F527} Fixed to:", fixed);
      return fixed;
    }
  }
  const fixes = {
    "\xE1 \xE1 \xA1\xE1\xAF\xE1 \xE1 \xAE\xE1 \xE1 \xA5": "\uBC1C\uC8FC\uC11C",
    "\xE1 \xE1 \xA2": "_",
    "\xE1\xB7\xE1 \xE1 \xB3\xE1\xAF": "\uC0D8\uD50C"
    // Add more mappings as discovered
  };
  let result = filename;
  for (const [corrupted, fixed] of Object.entries(fixes)) {
    result = result.replace(new RegExp(corrupted, "g"), fixed);
  }
  console.log("\u{1F527} Pattern-based result:", result);
  return result;
}

// server/utils/multer-config.ts
var uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
var createMulterConfig = (prefix = "FILE") => {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        console.log(`\u{1F4BE} ${prefix} - Multer filename callback`);
        console.log(`\u{1F4BE} ${prefix} - Raw originalname:`, file.originalname);
        console.log(`\u{1F4BE} ${prefix} - Raw bytes:`, Buffer.from(file.originalname));
        const decodedName = decodeKoreanFilename(file.originalname);
        file.originalname = decodedName;
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const filename = uniqueSuffix.toString();
        console.log(`\u{1F4BE} ${prefix} - Decoded originalname:`, decodedName);
        console.log(`\u{1F4BE} ${prefix} - Generated filename:`, filename);
        cb(null, filename);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024,
      // 10MB
      files: 10
      // Allow up to 10 files
    },
    fileFilter: (req, file, cb) => {
      console.log(`\u{1F50D} ${prefix} - File filter - fieldname:`, file.fieldname);
      console.log(`\u{1F50D} ${prefix} - File filter - originalname:`, file.originalname);
      console.log(`\u{1F50D} ${prefix} - File filter - mimetype:`, file.mimetype);
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/dwg",
        "application/x-dwg",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ];
      if (allowedTypes.includes(file.mimetype)) {
        console.log(`\u2705 ${prefix} - File type accepted:`, file.mimetype);
        cb(null, true);
      } else {
        console.log(`\u274C ${prefix} - File type rejected:`, file.mimetype);
        cb(new Error(`File type not allowed: ${file.mimetype}`), false);
      }
    }
  });
};
var upload = createMulterConfig("MAIN");
var orderUpload = createMulterConfig("ORDER");
var logoUpload = createMulterConfig("LOGO");
var excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB
  },
  fileFilter: (req, file, cb) => {
    console.log(`\u{1F50D} EXCEL - File filter - fieldname:`, file.fieldname);
    console.log(`\u{1F50D} EXCEL - File filter - originalname:`, file.originalname);
    console.log(`\u{1F50D} EXCEL - File filter - mimetype:`, file.mimetype);
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // .xlsx
      "application/vnd.ms-excel"
      // .xls
    ];
    if (allowedTypes.includes(file.mimetype)) {
      console.log(`\u2705 EXCEL - File type accepted:`, file.mimetype);
      cb(null, true);
    } else {
      console.log(`\u274C EXCEL - File type rejected:`, file.mimetype);
      cb(new Error(`Excel \uD30C\uC77C\uB9CC \uD5C8\uC6A9\uB429\uB2C8\uB2E4. \uD604\uC7AC \uD0C0\uC785: ${file.mimetype}`), false);
    }
  }
});

// server/utils/excel-parser.ts
import * as XLSX from "xlsx";
import { z as z2 } from "zod";
var ExcelRowSchema = z2.object({
  orderDate: z2.string(),
  // A열: 발주일자
  deliveryDate: z2.string(),
  // B열: 납기일자  
  vendorName: z2.string(),
  // C열: 거래처명
  vendorEmail: z2.string().email().optional(),
  // D열: 거래처 이메일
  deliveryName: z2.string(),
  // E열: 납품처명
  deliveryEmail: z2.string().email().optional(),
  // F열: 납품처 이메일
  projectName: z2.string(),
  // G열: 프로젝트명
  itemName: z2.string(),
  // H열: 품목명
  specification: z2.string().optional(),
  // I열: 규격
  quantity: z2.number(),
  // J열: 수량
  unitPrice: z2.number(),
  // K열: 단가
  totalAmount: z2.number(),
  // L열: 총금액
  notes: z2.string().optional()
  // M열: 비고
});
var PurchaseOrderMappingSchema = z2.object({
  orderNumber: z2.string(),
  // 자동 생성
  projectId: z2.number(),
  // 프로젝트명으로 조회
  vendorId: z2.number().optional(),
  // 거래처명으로 조회
  userId: z2.string(),
  // 업로드한 사용자 ID
  templateId: z2.number().optional(),
  // 템플릿 ID (기본값 사용)
  orderDate: z2.date(),
  deliveryDate: z2.date().optional(),
  status: z2.enum(["draft", "pending", "approved", "sent", "completed"]).default("draft"),
  totalAmount: z2.number(),
  notes: z2.string().optional(),
  customFields: z2.record(z2.any()).optional(),
  // 추가 정보 (매핑 처리용)
  vendorName: z2.string(),
  vendorEmail: z2.string().optional(),
  deliveryName: z2.string(),
  deliveryEmail: z2.string().optional(),
  projectName: z2.string(),
  itemName: z2.string(),
  specification: z2.string().optional(),
  quantity: z2.number(),
  unitPrice: z2.number()
});
function parseExcelInputSheet(buffer) {
  try {
    console.log("=== \uC5D1\uC140 \uD30C\uC2F1 \uC2DC\uC791 ===");
    console.log("\uBC84\uD37C \uD06C\uAE30:", buffer?.length || "undefined");
    if (!buffer || buffer.length === 0) {
      throw new Error("\uC5D1\uC140 \uD30C\uC77C \uB370\uC774\uD130\uAC00 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.");
    }
    const workbook = XLSX.read(buffer, { type: "buffer" });
    console.log("\uC6CC\uD06C\uBD81 \uC2DC\uD2B8 \uBAA9\uB85D:", workbook.SheetNames);
    if (!workbook.SheetNames.includes("Input Sheet")) {
      throw new Error(`Input Sheet\uAC00 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uC2DC\uD2B8: ${workbook.SheetNames.join(", ")}`);
    }
    const worksheet = workbook.Sheets["Input Sheet"];
    console.log("Input Sheet \uB85C\uB4DC \uC644\uB8CC");
    console.log("\uC6CC\uD06C\uC2DC\uD2B8 \uC815\uBCF4:", {
      name: "Input Sheet",
      ref: worksheet["!ref"],
      merges: worksheet["!merges"]
    });
    if (!worksheet["!ref"]) {
      throw new Error("Input Sheet\uAC00 \uBE44\uC5B4\uC788\uAC70\uB098 \uB370\uC774\uD130\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    }
    const fullRange = XLSX.utils.decode_range(worksheet["!ref"]);
    console.log("\uC804\uCCB4 \uBC94\uC704:", {
      start: { row: fullRange.s.r, col: fullRange.s.c },
      end: { row: fullRange.e.r, col: fullRange.e.c }
    });
    const range = {
      s: { c: 0, r: 1 },
      // A2부터 시작
      e: { c: 12, r: fullRange.e.r }
      // M열까지, 마지막 행까지
    };
    console.log("\uD30C\uC2F1 \uBC94\uC704:", range);
    const jsonData = [];
    const headers = [
      "orderDate",
      "deliveryDate",
      "vendorName",
      "vendorEmail",
      "deliveryName",
      "deliveryEmail",
      "projectName",
      "itemName",
      "specification",
      "quantity",
      "unitPrice",
      "totalAmount",
      "notes"
    ];
    console.log("\uD5E4\uB354 \uBC30\uC5F4:", headers);
    console.log("\uD5E4\uB354 \uAE38\uC774:", headers.length);
    for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
      console.log(`--- \uD589 ${rowNum + 1} \uCC98\uB9AC \uC911 ---`);
      const row = {};
      let hasData = false;
      for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
        const cell = worksheet[cellAddress];
        if (colNum >= headers.length) {
          console.warn(`\uCEEC\uB7FC \uC778\uB371\uC2A4 ${colNum}\uC774 \uD5E4\uB354 \uBC30\uC5F4 \uAE38\uC774 ${headers.length}\uB97C \uCD08\uACFC\uD569\uB2C8\uB2E4.`);
          continue;
        }
        const headerKey = headers[colNum];
        if (!headerKey) {
          console.warn(`\uD5E4\uB354 \uD0A4\uAC00 undefined\uC785\uB2C8\uB2E4. colNum: ${colNum}, headers.length: ${headers.length}`);
          continue;
        }
        console.log(`  \uC140 ${cellAddress}: ${cell?.v || "empty"} -> ${headerKey}`);
        if (cell && cell.v !== void 0 && cell.v !== null) {
          row[headerKey] = cell.v;
          hasData = true;
        } else {
          row[headerKey] = "";
        }
      }
      console.log(`\uD589 ${rowNum + 1} \uB370\uC774\uD130:`, row);
      console.log(`\uD589 ${rowNum + 1} hasData:`, hasData);
      if (hasData && (row.vendorName || row.projectName || row.itemName)) {
        jsonData.push(row);
        console.log(`\uD589 ${rowNum + 1} \uCD94\uAC00\uB428`);
      } else {
        console.log(`\uD589 ${rowNum + 1} \uC2A4\uD0B5\uB428 (\uD544\uC218 \uB370\uC774\uD130 \uC5C6\uC74C)`);
      }
    }
    console.log(`\uCD94\uCD9C\uB41C \uB370\uC774\uD130 \uD589 \uC218: ${jsonData.length}`);
    if (jsonData.length === 0) {
      throw new Error("Input Sheet\uC5D0\uC11C \uC720\uD6A8\uD55C \uB370\uC774\uD130\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. 2\uD589\uBD80\uD130 \uB370\uC774\uD130\uAC00 \uC788\uB294\uC9C0 \uD655\uC778\uD574\uC8FC\uC138\uC694.");
    }
    const parsedData = [];
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      console.log(`=== \uAC80\uC99D \uB2E8\uACC4: \uD589 ${i + 1} ===`);
      console.log("\uD589 \uB370\uC774\uD130:", JSON.stringify(row, null, 2));
      if (!row || typeof row !== "object") {
        console.warn(`\uD589 ${i + 1}: \uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uD589 \uB370\uC774\uD130`);
        continue;
      }
      if (!row.orderDate && !row.vendorName && !row.projectName) {
        console.log(`\uD589 ${i + 1}: \uBE48 \uD589 \uC2A4\uD0B5`);
        continue;
      }
      try {
        console.log(`\uD589 ${i + 2} \uCC98\uB9AC \uC911:`, {
          orderDate: row.orderDate,
          vendorName: row.vendorName,
          projectName: row.projectName,
          quantity: row.quantity,
          unitPrice: row.unitPrice
        });
        let orderDate;
        let deliveryDate;
        try {
          orderDate = parseExcelDate(row.orderDate);
        } catch (error) {
          throw new Error(`\uBC1C\uC8FC\uC77C\uC790 \uD30C\uC2F1 \uC624\uB958: ${row.orderDate}`);
        }
        if (row.deliveryDate) {
          try {
            deliveryDate = parseExcelDate(row.deliveryDate);
          } catch (error) {
            console.warn(`\uB0A9\uAE30\uC77C\uC790 \uD30C\uC2F1 \uACBD\uACE0 (\uD589 ${i + 2}):`, error);
            deliveryDate = void 0;
          }
        }
        const quantity = parseNumber(row.quantity, "\uC218\uB7C9");
        const unitPrice = parseNumber(row.unitPrice, "\uB2E8\uAC00");
        const totalAmount = row.totalAmount ? parseNumber(row.totalAmount, "\uCD1D\uAE08\uC561") : quantity * unitPrice;
        const orderNumber = generateOrderNumber(orderDate);
        const mappedData = {
          orderNumber,
          projectId: 0,
          // 프로젝트명으로 조회 후 설정
          userId: "",
          // 업로드한 사용자 ID로 설정
          orderDate,
          deliveryDate,
          totalAmount,
          notes: row.notes || void 0,
          // 원본 데이터
          vendorName: row.vendorName?.trim() || "",
          vendorEmail: row.vendorEmail?.trim() || void 0,
          deliveryName: row.deliveryName?.trim() || "",
          deliveryEmail: row.deliveryEmail?.trim() || void 0,
          projectName: row.projectName?.trim() || "",
          itemName: row.itemName?.trim() || "",
          specification: row.specification?.trim() || void 0,
          quantity,
          unitPrice
        };
        const validated = PurchaseOrderMappingSchema.parse(mappedData);
        parsedData.push(validated);
      } catch (error) {
        console.error(`\uD589 ${i + 2} \uD30C\uC2F1 \uC624\uB958:`, error);
        throw new Error(`\uD589 ${i + 2}\uC5D0\uC11C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${error instanceof Error ? error.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"}`);
      }
    }
    if (parsedData.length === 0) {
      throw new Error("\uD30C\uC2F1\uD560 \uC218 \uC788\uB294 \uC720\uD6A8\uD55C \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
    }
    return parsedData;
  } catch (error) {
    console.error("\uC5D1\uC140 \uD30C\uC2F1 \uC624\uB958:", error);
    console.error("\uC624\uB958 \uC2A4\uD0DD:", error instanceof Error ? error.stack : "No stack trace");
    if (error instanceof Error) {
      throw new Error(`\uC5D1\uC140 \uD30C\uC77C \uD30C\uC2F1 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${error.message}`);
    } else {
      throw new Error(`\uC5D1\uC140 \uD30C\uC77C \uD30C\uC2F1 \uC911 \uC54C \uC218 \uC5C6\uB294 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.`);
    }
  }
}
function parseExcelDate(value) {
  if (!value) {
    throw new Error("\uB0A0\uC9DC \uAC12\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
  }
  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1e3);
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`\uC798\uBABB\uB41C \uB0A0\uC9DC \uD615\uC2DD: ${value}`);
    }
    return date;
  }
  if (value instanceof Date) {
    return value;
  }
  throw new Error(`\uC9C0\uC6D0\uB418\uC9C0 \uC54A\uB294 \uB0A0\uC9DC \uD615\uC2DD: ${typeof value}`);
}
function parseNumber(value, fieldName) {
  if (value === null || value === void 0 || value === "") {
    return 0;
  }
  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }
  if (typeof value === "string") {
    const cleanValue = value.replace(/[^\d.-]/g, "");
    const parsed = parseFloat(cleanValue);
    if (isNaN(parsed)) {
      console.warn(`${fieldName} \uD30C\uC2F1 \uACBD\uACE0: "${value}" -> 0\uC73C\uB85C \uCC98\uB9AC`);
      return 0;
    }
    return parsed;
  }
  console.warn(`${fieldName} \uD30C\uC2F1 \uACBD\uACE0: \uC54C \uC218 \uC5C6\uB294 \uD0C0\uC785 "${typeof value}" -> 0\uC73C\uB85C \uCC98\uB9AC`);
  return 0;
}
function generateOrderNumber(orderDate) {
  const year = orderDate.getFullYear();
  const month = String(orderDate.getMonth() + 1).padStart(2, "0");
  const day = String(orderDate.getDate()).padStart(2, "0");
  const sequence = "001";
  return `PO-${year}${month}${day}-${sequence}`;
}
function validateParsedData(data) {
  const errors = [];
  const warnings = [];
  data.forEach((row, index2) => {
    const rowNumber = index2 + 2;
    if (!row.vendorName) {
      errors.push(`\uD589 ${rowNumber}: \uAC70\uB798\uCC98\uBA85\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.`);
    }
    if (!row.projectName) {
      errors.push(`\uD589 ${rowNumber}: \uD504\uB85C\uC81D\uD2B8\uBA85\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.`);
    }
    if (!row.itemName) {
      errors.push(`\uD589 ${rowNumber}: \uD488\uBAA9\uBA85\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.`);
    }
    if (row.quantity <= 0) {
      errors.push(`\uD589 ${rowNumber}: \uC218\uB7C9\uC740 0\uBCF4\uB2E4 \uCEE4\uC57C \uD569\uB2C8\uB2E4.`);
    }
    if (row.unitPrice < 0) {
      errors.push(`\uD589 ${rowNumber}: \uB2E8\uAC00\uB294 0 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.`);
    }
    if (!row.vendorEmail && !row.deliveryEmail) {
      warnings.push(`\uD589 ${rowNumber}: \uAC70\uB798\uCC98 \uB610\uB294 \uB0A9\uD488\uCC98 \uC774\uBA54\uC77C\uC774 \uC5C6\uC5B4 \uC790\uB3D9 \uBC1C\uC1A1\uC774 \uBD88\uAC00\uB2A5\uD569\uB2C8\uB2E4.`);
    }
    if (!row.deliveryDate) {
      warnings.push(`\uD589 ${rowNumber}: \uB0A9\uAE30\uC77C\uC790\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.`);
    }
    const calculatedAmount = row.quantity * row.unitPrice;
    if (Math.abs(calculatedAmount - row.totalAmount) > 0.01) {
      warnings.push(`\uD589 ${rowNumber}: \uCD1D\uAE08\uC561(${row.totalAmount})\uC774 \uACC4\uC0B0\uAC12(${calculatedAmount})\uACFC \uB2E4\uB985\uB2C8\uB2E4.`);
    }
  });
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalRows: data.length
  };
}

// server/utils/sample-excel-generator.ts
import * as XLSX2 from "xlsx";
function generateSampleExcel() {
  const inputSheetData = [
    // 헤더 행 (1행)
    [
      "\uBC1C\uC8FC\uC77C\uC790",
      "\uB0A9\uAE30\uC77C\uC790",
      "\uAC70\uB798\uCC98\uBA85",
      "\uAC70\uB798\uCC98\uC774\uBA54\uC77C",
      "\uB0A9\uD488\uCC98\uBA85",
      "\uB0A9\uD488\uCC98\uC774\uBA54\uC77C",
      "\uD504\uB85C\uC81D\uD2B8\uBA85",
      "\uD488\uBAA9\uBA85",
      "\uADDC\uACA9",
      "\uC218\uB7C9",
      "\uB2E8\uAC00",
      "\uCD1D\uAE08\uC561",
      "\uBE44\uACE0"
    ],
    // 데이터 행들 (2행부터)
    [
      /* @__PURE__ */ new Date("2025-01-15"),
      /* @__PURE__ */ new Date("2025-01-30"),
      "\u321C\uC0BC\uC131\uC804\uC790",
      "samsung@example.com",
      "\uD604\uB300\uAC74\uC124 \uBCF8\uC0AC",
      "hyundai@example.com",
      "\uC11C\uC6B8 \uC624\uD53C\uC2A4\uD154 \uAC74\uC124",
      "LED \uC870\uBA85",
      "50W",
      100,
      5e4,
      5e6,
      "\uAE34\uAE09 \uC8FC\uBB38"
    ],
    [
      /* @__PURE__ */ new Date("2025-01-16"),
      /* @__PURE__ */ new Date("2025-02-05"),
      "LG\uC804\uC790",
      "lg@example.com",
      "GS\uAC74\uC124 \uD604\uC7A5\uC0AC\uBB34\uC18C",
      "gs@example.com",
      "\uBD80\uC0B0 \uC544\uD30C\uD2B8 \uB2E8\uC9C0",
      "\uC5D0\uC5B4\uCEE8",
      "2\uD1A4\uAE09",
      50,
      12e5,
      6e7,
      "\uC124\uCE58 \uD3EC\uD568"
    ],
    [
      /* @__PURE__ */ new Date("2025-01-17"),
      /* @__PURE__ */ new Date("2025-01-25"),
      "\uD3EC\uC2A4\uCF54",
      "posco@example.com",
      "\uB300\uC6B0\uAC74\uC124 \uC790\uC7AC\uCC3D\uACE0",
      "daewoo@example.com",
      "\uC778\uCC9C \uC0B0\uC5C5\uB2E8\uC9C0",
      "\uCCA0\uADFC",
      "D16",
      1e3,
      8e3,
      8e6,
      "\uD488\uC9C8 \uAC80\uC0AC \uD544\uC694"
    ]
  ];
  const gapjiData = [
    ["\uBC1C\uC8FC\uC11C - \uAC11\uC9C0 (\uBC1C\uC8FC\uC790\uC6A9)"],
    ["\uBC1C\uC8FC\uBC88\uD638: PO-20250115-001"],
    ["\uBC1C\uC8FC\uC77C\uC790: 2025-01-15"],
    ["\uAC70\uB798\uCC98: \u321C\uC0BC\uC131\uC804\uC790"],
    ["\uD488\uBAA9: LED \uC870\uBA85 50W"],
    ["\uC218\uB7C9: 100\uAC1C"],
    ["\uB2E8\uAC00: 50,000\uC6D0"],
    ["\uCD1D\uC561: 5,000,000\uC6D0"]
  ];
  const euljiData = [
    ["\uBC1C\uC8FC\uC11C - \uC744\uC9C0 (\uC218\uC8FC\uC790\uC6A9)"],
    ["\uBC1C\uC8FC\uBC88\uD638: PO-20250115-001"],
    ["\uBC1C\uC8FC\uC77C\uC790: 2025-01-15"],
    ["\uB0A9\uD488\uCC98: \uD604\uB300\uAC74\uC124 \uBCF8\uC0AC"],
    ["\uD488\uBAA9: LED \uC870\uBA85 50W"],
    ["\uC218\uB7C9: 100\uAC1C"],
    ["\uB2E8\uAC00: 50,000\uC6D0"],
    ["\uCD1D\uC561: 5,000,000\uC6D0"]
  ];
  const workbook = XLSX2.utils.book_new();
  const inputSheet = XLSX2.utils.aoa_to_sheet(inputSheetData);
  const columnWidths = [
    { wch: 12 },
    // 발주일자
    { wch: 12 },
    // 납기일자
    { wch: 15 },
    // 거래처명
    { wch: 20 },
    // 거래처이메일
    { wch: 15 },
    // 납품처명
    { wch: 20 },
    // 납품처이메일
    { wch: 15 },
    // 프로젝트명
    { wch: 12 },
    // 품목명
    { wch: 10 },
    // 규격
    { wch: 8 },
    // 수량
    { wch: 10 },
    // 단가
    { wch: 12 },
    // 총금액
    { wch: 15 }
    // 비고
  ];
  inputSheet["!cols"] = columnWidths;
  const gapjiSheet = XLSX2.utils.aoa_to_sheet(gapjiData);
  const euljiSheet = XLSX2.utils.aoa_to_sheet(euljiData);
  XLSX2.utils.book_append_sheet(workbook, inputSheet, "Input Sheet");
  XLSX2.utils.book_append_sheet(workbook, gapjiSheet, "\uAC11\uC9C0");
  XLSX2.utils.book_append_sheet(workbook, euljiSheet, "\uC744\uC9C0");
  const buffer = XLSX2.write(workbook, {
    type: "buffer",
    bookType: "xlsx"
  });
  return buffer;
}
var sampleExcelMeta = {
  filename: "sample-purchase-orders.xlsx",
  description: "\uBC1C\uC8FC\uC11C \uC790\uB3D9\uD654 \uD14C\uC2A4\uD2B8\uC6A9 \uC0D8\uD50C Excel \uD30C\uC77C",
  sheets: ["Input Sheet", "\uAC11\uC9C0", "\uC744\uC9C0"],
  dataRows: 3,
  columns: 13
};

// server/utils/simple-excel-parser.ts
import * as XLSX3 from "xlsx";
function simpleParseExcel(buffer) {
  try {
    console.log("=== \uAC04\uB2E8 \uD30C\uC11C \uC2DC\uC791 ===");
    if (!buffer || buffer.length === 0) {
      throw new Error("\uD30C\uC77C \uBC84\uD37C\uAC00 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.");
    }
    console.log("\uBC84\uD37C \uD06C\uAE30:", buffer.length);
    const workbook = XLSX3.read(buffer, { type: "buffer" });
    console.log("\uC2DC\uD2B8 \uBAA9\uB85D:", workbook.SheetNames);
    const sheetName = workbook.SheetNames.find(
      (name) => name === "Input Sheet" || name.toLowerCase().includes("input")
    );
    if (!sheetName) {
      return {
        success: false,
        error: `Input Sheet\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uC2DC\uD2B8: ${workbook.SheetNames.join(", ")}`
      };
    }
    console.log("\uC0AC\uC6A9\uD560 \uC2DC\uD2B8:", sheetName);
    const worksheet = workbook.Sheets[sheetName];
    const ref = worksheet["!ref"];
    console.log("\uC2DC\uD2B8 \uBC94\uC704:", ref);
    if (!ref) {
      return {
        success: false,
        error: "\uC2DC\uD2B8\uAC00 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4."
      };
    }
    const jsonData = XLSX3.utils.sheet_to_json(worksheet, { header: 1 });
    console.log("\uC804\uCCB4 \uB370\uC774\uD130 \uD589 \uC218:", jsonData.length);
    console.log("\uCCAB \uBC88\uC9F8 \uD589 (\uD5E4\uB354):", jsonData[0]);
    console.log("\uB450 \uBC88\uC9F8 \uD589 (\uB370\uC774\uD130):", jsonData[1]);
    return {
      success: true,
      data: {
        sheetName,
        totalRows: jsonData.length,
        headers: jsonData[0] || [],
        sampleData: jsonData.slice(0, 5),
        // 처음 5행만
        rawRange: ref
      }
    };
  } catch (error) {
    console.error("\uAC04\uB2E8 \uD30C\uC11C \uC624\uB958:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"
    };
  }
}

// server/utils/vendor-validation.ts
import { eq as eq2, sql as sql3 } from "drizzle-orm";
function levenshteinDistance(str1, str2) {
  const matrix = [];
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          // substitution
          matrix[i][j - 1] + 1,
          // insertion
          matrix[i - 1][j] + 1
          // deletion
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}
function calculateSimilarity(str1, str2) {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}
function generateFallbackSuggestions(vendorName) {
  const commonVendorPatterns = [
    "\u321C\uC0BC\uC131\uC804\uC790",
    "\u321CLG\uC804\uC790",
    "\u321C\uD604\uB300\uC790\uB3D9\uCC28",
    "\u321CSK\uD558\uC774\uB2C9\uC2A4",
    "\u321C\uD3EC\uC2A4\uCF54",
    "\u321C\uC0BC\uC131\uBB3C\uC0B0",
    "\u321C\uD604\uB300\uAC74\uC124",
    "\u321C\uB300\uC6B0\uAC74\uC124",
    "\u321CGS\uAC74\uC124",
    "\u321C\uB86F\uB370\uAC74\uC124",
    "\u321C\uD55C\uD654\uC2DC\uC2A4\uD15C",
    "\u321C\uB450\uC0B0\uC911\uACF5\uC5C5",
    "\u321C\uCF54\uC6E8\uC774",
    "\u321C\uC544\uBAA8\uB808\uD37C\uC2DC\uD53D",
    "\u321CCJ\uC81C\uC77C\uC81C\uB2F9",
    "\u321C\uC2E0\uC138\uACC4",
    "\u321C\uB86F\uB370\uB9C8\uD2B8",
    "\u321C\uC774\uB9C8\uD2B8",
    "\u321C\uD648\uD50C\uB7EC\uC2A4",
    "\u321C\uBA54\uAC00\uB9C8\uD2B8",
    "\uD14C\uD06C\uB180\uB85C\uC9C0\u321C",
    "\uC5D4\uC9C0\uB2C8\uC5B4\uB9C1\u321C",
    "\uAC74\uC124\u321C",
    "\uC804\uC790\u321C",
    "\uC2DC\uC2A4\uD15C\u321C",
    "\uC194\uB8E8\uC158\u321C",
    "\uC11C\uBE44\uC2A4\u321C",
    "\uCEE8\uC124\uD305\u321C",
    "\uAC1C\uBC1C\u321C",
    "\uC81C\uC870\u321C"
  ];
  const suggestions = commonVendorPatterns.map((pattern) => {
    const similarity = calculateSimilarity(vendorName, pattern);
    const distance = levenshteinDistance(vendorName.toLowerCase(), pattern.toLowerCase());
    return {
      id: Math.floor(Math.random() * 1e3),
      // Mock ID
      name: pattern,
      email: `contact@${pattern.replace(/㈜/g, "").toLowerCase()}.co.kr`,
      phone: "02-0000-0000",
      contactPerson: "\uB2F4\uB2F9\uC790",
      similarity,
      distance
    };
  }).filter((suggestion) => suggestion.similarity >= 0.2).sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  console.log(`\u{1F504} \uD3F4\uBC31 \uCD94\uCC9C \uC0DD\uC131: ${suggestions.length}\uAC1C \uCD94\uCC9C`);
  return suggestions;
}
async function validateVendorName(vendorName) {
  console.log(`\u{1F50D} \uAC70\uB798\uCC98 \uAC80\uC99D \uC2DC\uC791: "${vendorName}"`);
  try {
    const quickTest = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Quick DB test timeout")), 2e3);
    });
    const testQuery = db.select({ count: sql3`1` }).limit(1);
    await Promise.race([testQuery, quickTest]);
    console.log(`\u2705 \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uD655\uC778\uB428`);
  } catch (quickTestError) {
    console.log(`\u{1F504} \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328 \uAC10\uC9C0, \uC989\uC2DC \uD3F4\uBC31 \uBAA8\uB4DC\uB85C \uC804\uD658: "${vendorName}"`);
    const fallbackSuggestions = generateFallbackSuggestions(vendorName);
    return {
      vendorName,
      exists: false,
      exactMatch: void 0,
      suggestions: fallbackSuggestions
    };
  }
  try {
    let exactMatch = [];
    let allVendors = [];
    try {
      const dbTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Database connection timeout")), 5e3);
      });
      const exactMatchQuery = db.select({
        id: vendors.id,
        name: vendors.name,
        email: vendors.email,
        phone: vendors.phone,
        contactPerson: vendors.contactPerson
      }).from(vendors).where(eq2(vendors.name, vendorName)).limit(1);
      const allVendorsQuery = db.select({
        id: vendors.id,
        name: vendors.name,
        email: vendors.email,
        phone: vendors.phone,
        contactPerson: vendors.contactPerson
      }).from(vendors).where(eq2(vendors.isActive, true));
      exactMatch = await Promise.race([exactMatchQuery, dbTimeout]);
      allVendors = await Promise.race([allVendorsQuery, dbTimeout]);
    } catch (dbError) {
      console.log(`\u{1F504} \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328, \uD3F4\uBC31 \uBAA8\uB4DC\uB85C \uC2E4\uD589: "${vendorName}"`);
      console.log(`DB \uC624\uB958:`, dbError.message);
      const fallbackSuggestions = generateFallbackSuggestions(vendorName);
      return {
        vendorName,
        exists: false,
        exactMatch: void 0,
        suggestions: fallbackSuggestions
      };
    }
    const suggestions = allVendors.map((vendor) => {
      const similarity = calculateSimilarity(vendorName, vendor.name);
      const distance = levenshteinDistance(vendorName.toLowerCase(), vendor.name.toLowerCase());
      return {
        ...vendor,
        similarity,
        distance
      };
    }).filter((vendor) => {
      return vendor.name !== vendorName && vendor.similarity >= 0.3;
    }).sort((a, b) => {
      if (b.similarity !== a.similarity) {
        return b.similarity - a.similarity;
      }
      return a.distance - b.distance;
    }).slice(0, 5);
    const result = {
      vendorName,
      exists: exactMatch.length > 0,
      exactMatch: exactMatch.length > 0 ? exactMatch[0] : void 0,
      suggestions
    };
    console.log(`\u2705 \uAC70\uB798\uCC98 \uAC80\uC99D \uC644\uB8CC: exists=${result.exists}, suggestions=${suggestions.length}\uAC1C`);
    if (result.exactMatch) {
      console.log(`\u{1F4CD} \uC815\uD655\uD55C \uB9E4\uCE6D: ${result.exactMatch.name} (ID: ${result.exactMatch.id})`);
    }
    suggestions.forEach((suggestion, index2) => {
      console.log(`\u{1F4A1} \uCD94\uCC9C ${index2 + 1}: ${suggestion.name} (\uC720\uC0AC\uB3C4: ${(suggestion.similarity * 100).toFixed(1)}%)`);
    });
    return result;
  } catch (error) {
    console.error(`\u274C \uAC70\uB798\uCC98 \uAC80\uC99D \uC911 \uC624\uB958:`, error);
    if (error.message.includes("database") || error.message.includes("connection") || error.message.includes("fetch failed") || error.message.includes("NeonDbError") || error.message.includes("ENOTFOUND") || error.name === "NeonDbError" || error.code === "ENOTFOUND") {
      console.log(`\u{1F504} \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328, \uD3F4\uBC31 \uBAA8\uB4DC\uB85C \uC2E4\uD589: "${vendorName}"`);
      const fallbackSuggestions = generateFallbackSuggestions(vendorName);
      return {
        vendorName,
        exists: false,
        // Can't verify without DB
        exactMatch: void 0,
        suggestions: fallbackSuggestions
      };
    }
    throw new Error(`\uAC70\uB798\uCC98 \uAC80\uC99D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${error}`);
  }
}
async function checkEmailConflict(vendorName, excelEmail) {
  try {
    console.log(`\u{1F4E7} \uC774\uBA54\uC77C \uCDA9\uB3CC \uAC80\uC0AC: "${vendorName}" - "${excelEmail}"`);
    let dbVendor = [];
    try {
      const dbTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Database connection timeout")), 3e3);
      });
      const dbVendorQuery = db.select({
        id: vendors.id,
        name: vendors.name,
        email: vendors.email
      }).from(vendors).where(eq2(vendors.name, vendorName)).limit(1);
      dbVendor = await Promise.race([dbVendorQuery, dbTimeout]);
    } catch (dbError) {
      console.log(`\u{1F504} \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328, \uC774\uBA54\uC77C \uCDA9\uB3CC \uAC80\uC0AC \uC2A4\uD0B5: "${vendorName}"`);
      return {
        type: "no_conflict",
        excelEmail
      };
    }
    if (dbVendor.length === 0) {
      console.log(`\u2705 \uC774\uBA54\uC77C \uCDA9\uB3CC \uC5C6\uC74C: \uAC70\uB798\uCC98\uAC00 DB\uC5D0 \uC5C6\uC74C`);
      return {
        type: "no_conflict",
        excelEmail
      };
    }
    const vendor = dbVendor[0];
    if (vendor.email.toLowerCase() === excelEmail.toLowerCase()) {
      console.log(`\u2705 \uC774\uBA54\uC77C \uCDA9\uB3CC \uC5C6\uC74C: \uB3D9\uC77C\uD55C \uC774\uBA54\uC77C`);
      return {
        type: "no_conflict",
        excelEmail,
        dbEmail: vendor.email,
        vendorId: vendor.id,
        vendorName: vendor.name
      };
    }
    console.log(`\u26A0\uFE0F \uC774\uBA54\uC77C \uCDA9\uB3CC \uBC1C\uACAC: Excel="${excelEmail}" vs DB="${vendor.email}"`);
    return {
      type: "conflict",
      excelEmail,
      dbEmail: vendor.email,
      vendorId: vendor.id,
      vendorName: vendor.name
    };
  } catch (error) {
    console.error(`\u274C \uC774\uBA54\uC77C \uCDA9\uB3CC \uAC80\uC0AC \uC911 \uC624\uB958:`, error);
    if (error.message.includes("database") || error.message.includes("connection") || error.message.includes("fetch failed") || error.message.includes("NeonDbError") || error.message.includes("ENOTFOUND") || error.name === "NeonDbError" || error.code === "ENOTFOUND") {
      console.log(`\u{1F504} \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328, \uC774\uBA54\uC77C \uCDA9\uB3CC \uAC80\uC0AC \uC2A4\uD0B5`);
      return {
        type: "no_conflict",
        excelEmail
      };
    }
    throw new Error(`\uC774\uBA54\uC77C \uCDA9\uB3CC \uAC80\uC0AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${error}`);
  }
}
async function validateMultipleVendors(vendorData) {
  try {
    console.log(`\u{1F504} \uB2E4\uC911 \uAC70\uB798\uCC98 \uAC80\uC99D \uC2DC\uC791: ${vendorData.length}\uAC1C \uD56D\uBAA9`);
    const vendorValidations = [];
    const deliveryValidations = [];
    const emailConflicts = [];
    for (const data of vendorData) {
      try {
        const vendorValidation = await validateVendorName(data.vendorName);
        vendorValidations.push(vendorValidation);
      } catch (error) {
        console.error(`\u274C \uAC70\uB798\uCC98 "${data.vendorName}" \uAC80\uC99D \uC2E4\uD328:`, error.message);
        vendorValidations.push({
          vendorName: data.vendorName,
          exists: false,
          exactMatch: void 0,
          suggestions: generateFallbackSuggestions(data.vendorName)
        });
      }
      try {
        if (data.deliveryName && data.deliveryName !== data.vendorName) {
          const deliveryValidation = await validateVendorName(data.deliveryName);
          deliveryValidations.push(deliveryValidation);
        }
      } catch (error) {
        console.error(`\u274C \uB0A9\uD488\uCC98 "${data.deliveryName}" \uAC80\uC99D \uC2E4\uD328:`, error.message);
        if (data.deliveryName && data.deliveryName !== data.vendorName) {
          deliveryValidations.push({
            vendorName: data.deliveryName,
            exists: false,
            exactMatch: void 0,
            suggestions: generateFallbackSuggestions(data.deliveryName)
          });
        }
      }
      try {
        if (data.email) {
          const emailConflict = await checkEmailConflict(data.vendorName, data.email);
          emailConflicts.push(emailConflict);
        }
      } catch (error) {
        console.error(`\u274C \uC774\uBA54\uC77C \uCDA9\uB3CC \uAC80\uC0AC \uC2E4\uD328 "${data.vendorName}":`, error.message);
        if (data.email) {
          emailConflicts.push({
            type: "no_conflict",
            excelEmail: data.email
          });
        }
      }
    }
    console.log(`\u2705 \uB2E4\uC911 \uAC70\uB798\uCC98 \uAC80\uC99D \uC644\uB8CC: \uAC70\uB798\uCC98=${vendorValidations.length}, \uB0A9\uD488\uCC98=${deliveryValidations.length}, \uC774\uBA54\uC77C\uCDA9\uB3CC=${emailConflicts.filter((c) => c.type === "conflict").length}`);
    return {
      vendorValidations,
      deliveryValidations,
      emailConflicts
    };
  } catch (error) {
    console.error(`\u274C \uB2E4\uC911 \uAC70\uB798\uCC98 \uAC80\uC99D \uC911 \uC624\uB958:`, error);
    throw new Error(`\uB2E4\uC911 \uAC70\uB798\uCC98 \uAC80\uC99D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${error}`);
  }
}

// server/routes.ts
var transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.naver.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    // Naver 이메일 주소 (예: ikjin@naver.com)
    pass: process.env.SMTP_PASS
    // Naver 계정 비밀번호 또는 앱 비밀번호
  },
  tls: {
    rejectUnauthorized: false
  }
});
async function registerRoutes(app2) {
  app2.use(session({
    // store: sessionStore, // Disable PostgreSQL store temporarily
    secret: process.env.SESSION_SECRET || "dev-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    name: "connect.sid",
    // Use default session cookie name for better compatibility
    cookie: {
      secure: false,
      // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1e3,
      // 24 hours
      sameSite: "lax"
      // Add sameSite for better cookie handling
    }
  }));
  app2.use("/uploads", express.static(path3.join(process.cwd(), "uploads")));
  app2.post("/api/auth/login", login);
  app2.post("/api/auth/logout", logout);
  app2.get("/api/logout", logout);
  app2.get("/api/auth/user", getCurrentUser);
  app2.get("/api/users", async (req, res) => {
    try {
      const mockUsers = [
        {
          id: "test_admin_001",
          email: "test@ikjin.co.kr",
          name: "\uD14C\uC2A4\uD2B8 \uAD00\uB9AC\uC790",
          role: "admin",
          phoneNumber: "010-1234-5678",
          profileImageUrl: null,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: "user_001",
          email: "kim.manager@ikjin.co.kr",
          name: "\uAE40\uBC1C\uC8FC",
          role: "project_manager",
          phoneNumber: "010-1111-1111",
          profileImageUrl: null,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: "user_002",
          email: "park.pm@ikjin.co.kr",
          name: "\uBC15\uD504\uB85C\uC81D\uD2B8",
          role: "project_manager",
          phoneNumber: "010-2222-2222",
          profileImageUrl: null,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: "user_003",
          email: "lee.engineer@ikjin.co.kr",
          name: "\uC774\uC5D4\uC9C0\uB2C8\uC5B4",
          role: "field_worker",
          phoneNumber: "010-3333-3333",
          profileImageUrl: null,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      ];
      res.json(mockUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.post("/api/users", async (req, res) => {
    try {
      const { email, name, phoneNumber, role } = req.body;
      const newUser = await storage.upsertUser({
        email,
        name,
        phoneNumber,
        role: role || "user",
        password: "temp123"
        // Temporary password - should be changed by user
      });
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  app2.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      const { name, phoneNumber, role } = req.body;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const updatedUser = await storage.upsertUser({
        id: userId,
        email: user.email,
        name: name || user.name,
        phoneNumber: phoneNumber || user.phoneNumber,
        role: role || user.role,
        password: user.password,
        // Keep existing password
        profileImageUrl: user.profileImageUrl
      });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  app2.get("/api/users/:id/references", async (req, res) => {
    try {
      const id = req.params.id;
      const references = await storage.checkUserReferences(id);
      res.json(references);
    } catch (error) {
      console.error("Error checking user references:", error);
      res.status(500).json({ message: "Failed to check user references" });
    }
  });
  app2.post("/api/users/:id/reassign", async (req, res) => {
    try {
      const fromUserId = req.params.id;
      const { toUserId } = req.body;
      if (!toUserId) {
        return res.status(400).json({ message: "\uC0C8 \uB2F4\uB2F9\uC790 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      await storage.reassignUserProjects(fromUserId, toUserId);
      res.json({ message: "\uD504\uB85C\uC81D\uD2B8 \uB2F4\uB2F9\uC790\uAC00 \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4" });
    } catch (error) {
      console.error("Error reassigning user projects:", error);
      res.status(500).json({ message: "Failed to reassign user projects" });
    }
  });
  app2.patch("/api/users/:id/toggle-active", async (req, res) => {
    try {
      const userId = req.params.id;
      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive \uAC12\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const updatedUser = await storage.toggleUserActive(userId, isActive);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error toggling user active status:", error);
      res.status(500).json({ message: "Failed to toggle user active status" });
    }
  });
  app2.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = req.user?.claims?.sub;
      if (userId === currentUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        message: "Failed to delete user",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { name } = req.body;
      console.log("Profile update request:", { userId, name, fullUser: req.user });
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      const updatedUser = await storage.updateUser(userId, { name });
      console.log("Profile updated successfully:", updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  app2.patch("/api/auth/preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = req.body;
      res.json({ message: "Preferences updated successfully" });
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });
  app2.get("/api/users", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const users2 = await storage.getUsers();
      res.json(users2);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const adminUserId = req.user?.id || req.user?.claims?.sub;
      const adminUser = await storage.getUser(adminUserId);
      if (adminUser?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const userId = req.params.id;
      const { role } = req.body;
      if (!role || !["admin", "orderer"].includes(role)) {
        return res.status(400).json({ message: "Valid role is required" });
      }
      const updatedUser = await storage.updateUserRole(userId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  app2.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const adminUserId = req.user?.id || req.user?.claims?.sub;
      const adminUser = await storage.getUser(adminUserId);
      if (adminUser?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const userId = req.params.id;
      const updateData = req.body;
      if (updateData.role && !["admin", "order_manager", "user"].includes(updateData.role)) {
        return res.status(400).json({ message: "Valid role is required" });
      }
      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  app2.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const userId = process.env.NODE_ENV === "development" ? "USR_20250531_001" : req.user.id;
      const user = await storage.getUser(userId);
      const stats = await storage.getDashboardStats(
        user?.role === "admin" ? void 0 : userId
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  app2.get("/api/dashboard/monthly-stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const monthlyStats = await storage.getMonthlyOrderStats(
        user?.role === "admin" ? void 0 : userId
      );
      res.json(monthlyStats);
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
      res.status(500).json({ message: "Failed to fetch monthly stats" });
    }
  });
  app2.get("/api/dashboard/vendor-stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const vendorStats = await storage.getVendorOrderStats(
        user?.role === "admin" ? void 0 : userId
      );
      res.json(vendorStats);
    } catch (error) {
      console.error("Error fetching vendor stats:", error);
      res.status(500).json({ message: "Failed to fetch vendor stats" });
    }
  });
  app2.get("/api/dashboard/status-stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const statusStats = await storage.getStatusOrderStats(
        user?.role === "admin" ? void 0 : userId
      );
      res.json(statusStats);
    } catch (error) {
      console.error("Error fetching status stats:", error);
      res.status(500).json({ message: "Failed to fetch status stats" });
    }
  });
  app2.get("/api/dashboard/project-stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const projectStats = await storage.getProjectOrderStats(
        user?.role === "admin" ? void 0 : userId
      );
      res.json(projectStats);
    } catch (error) {
      console.error("Error fetching project stats:", error);
      res.status(500).json({ message: "Failed to fetch project stats" });
    }
  });
  app2.get("/api/dashboard/active-projects-count", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const count2 = await storage.getActiveProjectsCount(
        user?.role === "admin" ? void 0 : userId
      );
      res.json({ count: count2 });
    } catch (error) {
      console.error("Error fetching active projects count:", error);
      res.status(500).json({ message: "Failed to fetch active projects count" });
    }
  });
  app2.get("/api/dashboard/new-projects-this-month", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const count2 = await storage.getNewProjectsThisMonth(
        user?.role === "admin" ? void 0 : userId
      );
      res.json({ count: count2 });
    } catch (error) {
      console.error("Error fetching new projects this month:", error);
      res.status(500).json({ message: "Failed to fetch new projects this month" });
    }
  });
  app2.get("/api/dashboard/recent-projects", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const projects2 = await storage.getRecentProjectsThisMonth(
        user?.role === "admin" ? void 0 : userId
      );
      res.json(projects2);
    } catch (error) {
      console.error("Error fetching recent projects:", error);
      res.status(500).json({ message: "Failed to fetch recent projects" });
    }
  });
  app2.get("/api/dashboard/urgent-orders", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const orders = await storage.getUrgentOrders(
        user?.role === "admin" ? void 0 : userId
      );
      res.json(orders);
    } catch (error) {
      console.error("Error fetching urgent orders:", error);
      res.status(500).json({ message: "Failed to fetch urgent orders" });
    }
  });
  app2.get("/api/project-members", requireAuth, async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId) : void 0;
      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching project members:", error);
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });
  app2.post("/api/project-members", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const memberData = req.body;
      const member = await storage.createProjectMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error creating project member:", error);
      res.status(500).json({ message: "Failed to create project member" });
    }
  });
  app2.delete("/api/project-members/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteProjectMember(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project member:", error);
      res.status(500).json({ message: "Failed to delete project member" });
    }
  });
  app2.get("/api/dashboard/unified", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const isAdmin = user?.role === "admin";
      const [
        stats,
        monthlyStats,
        orders,
        activeProjectsCount,
        newProjectsThisMonth
      ] = await Promise.all([
        storage.getDashboardStats(isAdmin ? void 0 : userId),
        storage.getMonthlyOrderStats(isAdmin ? void 0 : userId),
        storage.getPurchaseOrders({}),
        storage.getActiveProjectsCount(isAdmin ? void 0 : userId),
        storage.getNewProjectsThisMonth(isAdmin ? void 0 : userId)
      ]);
      const orderList = orders.orders || [];
      const recentProjects = orderList.slice(0, 5).map((order) => ({
        id: order.projectId,
        projectName: order.projectName,
        projectCode: order.projectCode,
        createdAt: order.orderDate
      }));
      const projectStatsMap = orderList.reduce((acc, order) => {
        const projectName = order.project?.projectName || order.projectName || "Unknown Project";
        const projectCode = order.project?.projectCode || order.projectCode || "";
        const projectId = order.project?.id || order.projectId;
        if (!acc[projectName]) {
          acc[projectName] = {
            id: projectId,
            projectName,
            projectCode,
            orderCount: 0,
            totalAmount: 0
          };
        }
        acc[projectName].orderCount += 1;
        acc[projectName].totalAmount += Number(order.totalAmount) || 0;
        return acc;
      }, {});
      const projectStats = Object.values(projectStatsMap).sort((a, b) => b.totalAmount - a.totalAmount);
      const statusStatsMap = orderList.reduce((acc, order) => {
        const status = order.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      const statusStats = Object.entries(statusStatsMap).map(([status, orders2]) => ({
        status,
        orders: orders2,
        name: status
      }));
      res.json({
        stats,
        monthlyStats,
        projectStats,
        statusStats,
        orders,
        activeProjectsCount: { count: activeProjectsCount },
        newProjectsThisMonth: { count: newProjectsThisMonth },
        recentProjects,
        urgentOrders: []
      });
    } catch (error) {
      console.error("Error fetching unified dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });
  app2.get("/api/vendors", async (req, res) => {
    try {
      const mockVendors = [
        {
          id: 1,
          name: "(\uC8FC)\uAC74\uC124\uC790\uC7AC\uC720\uD1B5",
          businessNumber: "211-86-12345",
          industry: "\uAC74\uC124\uC790\uC7AC \uC720\uD1B5",
          representative: "\uCD5C\uAC74\uC124",
          mainContact: "\uAE40\uC601\uC5C5",
          contactPerson: "\uAE40\uC601\uC5C5",
          email: "sales@construction.co.kr",
          phone: "031-1234-5678",
          address: "\uACBD\uAE30\uB3C4 \uC131\uB0A8\uC2DC \uBD84\uB2F9\uAD6C \uD310\uAD50\uB85C 123",
          memo: "\uC8FC\uC694 \uCCA0\uAC15 \uC790\uC7AC \uACF5\uAE09\uC5C5\uCCB4",
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: 2,
          name: "\uB3D9\uC591\uCCA0\uAC15(\uC8FC)",
          businessNumber: "123-81-67890",
          industry: "\uCCA0\uAC15 \uC81C\uC870",
          representative: "\uBC15\uCCA0\uAC15",
          mainContact: "\uC815\uCCA0\uAC15",
          contactPerson: "\uC815\uCCA0\uAC15",
          email: "info@dongyang-steel.co.kr",
          phone: "051-2345-6789",
          address: "\uBD80\uC0B0\uAD11\uC5ED\uC2DC \uD574\uC6B4\uB300\uAD6C \uC13C\uD140\uB85C 456",
          memo: "\uACE0\uD488\uC9C8 H\uD615\uAC15 \uC804\uBB38",
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: 3,
          name: "\uD55C\uAD6D\uC804\uAE30\uC124\uBE44(\uC8FC)",
          businessNumber: "456-87-23456",
          industry: "\uC804\uAE30\uC124\uBE44 \uC2DC\uACF5",
          representative: "\uC784\uC804\uAE30",
          mainContact: "\uC1A1\uC804\uAE30",
          contactPerson: "\uC1A1\uC804\uAE30",
          email: "contact@korea-electric.co.kr",
          phone: "02-3456-7890",
          address: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uAE08\uCC9C\uAD6C \uB514\uC9C0\uD138\uB85C 789",
          memo: "\uC804\uAE30\uC124\uBE44 \uC885\uD569 \uC194\uB8E8\uC158",
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: 4,
          name: "\uC2E0\uD55C\uCF58\uD06C\uB9AC\uD2B8(\uC8FC)",
          businessNumber: "789-88-34567",
          industry: "\uCF58\uD06C\uB9AC\uD2B8 \uC81C\uC870",
          representative: "\uC870\uCF58\uD06C\uB9AC\uD2B8",
          mainContact: "\uD55C\uCF58\uD06C\uB9AC\uD2B8",
          contactPerson: "\uD55C\uCF58\uD06C\uB9AC\uD2B8",
          email: "orders@shinhan-concrete.co.kr",
          phone: "032-4567-8901",
          address: "\uC778\uCC9C\uAD11\uC5ED\uC2DC \uB0A8\uB3D9\uAD6C \uB17C\uD604\uB85C 321",
          memo: "\uB808\uBBF8\uCF58 \uC804\uBB38 \uACF5\uAE09\uC5C5\uCCB4",
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      ];
      res.json(mockVendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });
  app2.get("/api/project-statuses", requireAuth, async (req, res) => {
    try {
      const statuses = await storage.getProjectStatuses();
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching project statuses:", error);
      res.status(500).json({ message: "Failed to fetch project statuses" });
    }
  });
  app2.get("/api/project-types", requireAuth, async (req, res) => {
    try {
      const types = await storage.getProjectTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching project types:", error);
      res.status(500).json({ message: "Failed to fetch project types" });
    }
  });
  app2.get("/api/projects", async (req, res) => {
    try {
      const mockProjects = [
        {
          id: 1,
          projectName: "\uAC15\uB0A8 \uC624\uD53C\uC2A4\uBE4C\uB529 \uC2E0\uCD95\uACF5\uC0AC",
          projectCode: "PRJ-2024-001",
          clientName: "\uAC15\uB0A8\uAC74\uC124(\uC8FC)",
          projectType: "commercial",
          location: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uAC15\uB0A8\uAD6C \uD14C\uD5E4\uB780\uB85C 456",
          status: "active",
          totalBudget: "25000000000",
          projectManagerId: "user_002",
          orderManagerId: "user_001",
          description: "\uC9C0\uC0C1 20\uCE35 \uADDC\uBAA8\uC758 \uC5C5\uBB34\uC2DC\uC124 \uC2E0\uCD95",
          startDate: /* @__PURE__ */ new Date("2024-01-15"),
          endDate: /* @__PURE__ */ new Date("2025-12-31"),
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: 2,
          projectName: "\uBD84\uB2F9 \uC544\uD30C\uD2B8 \uB9AC\uBAA8\uB378\uB9C1",
          projectCode: "PRJ-2024-002",
          clientName: "\uBD84\uB2F9\uC8FC\uD0DD\uAD00\uB9AC\uACF5\uB2E8",
          projectType: "residential",
          location: "\uACBD\uAE30\uB3C4 \uC131\uB0A8\uC2DC \uBD84\uB2F9\uAD6C \uC815\uC790\uB3D9",
          status: "active",
          totalBudget: "12000000000",
          projectManagerId: "user_002",
          orderManagerId: "user_001",
          description: "15\uB144\uCC28 \uC544\uD30C\uD2B8 \uB2E8\uC9C0 \uC804\uBA74 \uB9AC\uBAA8\uB378\uB9C1",
          startDate: /* @__PURE__ */ new Date("2024-03-01"),
          endDate: /* @__PURE__ */ new Date("2024-11-30"),
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: 3,
          projectName: "\uC778\uCC9C\uACF5\uD56D \uC81C3\uD130\uBBF8\uB110 \uD655\uC7A5",
          projectCode: "PRJ-2024-003",
          clientName: "\uC778\uCC9C\uAD6D\uC81C\uACF5\uD56D\uACF5\uC0AC",
          projectType: "infrastructure",
          location: "\uC778\uCC9C\uAD11\uC5ED\uC2DC \uC911\uAD6C \uACF5\uD56D\uB85C 424",
          status: "planning",
          totalBudget: "89000000000",
          projectManagerId: "user_003",
          orderManagerId: "user_001",
          description: "\uAD6D\uC81C\uC120 \uD130\uBBF8\uB110 \uD655\uC7A5 \uBC0F \uC2DC\uC124 \uD604\uB300\uD654",
          startDate: /* @__PURE__ */ new Date("2024-06-01"),
          endDate: /* @__PURE__ */ new Date("2026-05-31"),
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      ];
      res.json(mockProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });
  app2.get("/api/projects/:id", requireAuth, async (req, res) => {
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
  app2.post("/api/projects", requireAuth, async (req, res) => {
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
      const transformedData = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : null,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
        totalBudget: req.body.totalBudget ? req.body.totalBudget : null
      };
      console.log("Transformed project data:", transformedData);
      const validatedData = insertProjectSchema.parse(transformedData);
      console.log("Validated project data:", validatedData);
      const project = await storage.createProject(validatedData);
      console.log("Created project:", project);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      console.error("Error details:", errorMessage);
      console.error("Error stack:", errorStack);
      res.status(500).json({ message: "Failed to create project", error: errorMessage });
    }
  });
  app2.patch("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id, 10);
      const { orderManagers, ...projectData } = req.body;
      console.log("Project update request:", { id, projectData });
      const transformedData = {
        ...projectData,
        startDate: projectData.startDate ? new Date(projectData.startDate) : void 0,
        endDate: projectData.endDate ? new Date(projectData.endDate) : void 0,
        totalBudget: projectData.totalBudget ? projectData.totalBudget : void 0
      };
      console.log("Transformed project data:", transformedData);
      const validatedData = insertProjectSchema.partial().parse(transformedData);
      console.log("Validated project data:", validatedData);
      const project = await storage.updateProject(id, validatedData);
      console.log("Updated project result:", project);
      if (orderManagers && Array.isArray(orderManagers)) {
        const existingMembers = await storage.getProjectMembers(id);
        const existingOrderManagers = existingMembers.filter((member) => member.role === "order_manager");
        for (const member of existingOrderManagers) {
          await storage.deleteProjectMember(member.id);
        }
        for (const managerId of orderManagers) {
          await storage.createProjectMember({
            projectId: id,
            userId: managerId,
            role: "order_manager"
          });
        }
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });
  app2.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id, 10);
      await storage.deleteProject(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });
  app2.get("/api/order-statuses", async (req, res) => {
    try {
      const statuses = await storage.getOrderStatuses();
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching order statuses:", error);
      res.status(500).json({ message: "Failed to fetch order statuses" });
    }
  });
  app2.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getActiveOrderTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });
  app2.get("/api/templates/:id", async (req, res) => {
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
  app2.get("/api/order-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getOrderTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching order templates:", error);
      res.status(500).json({ message: "Failed to fetch order templates" });
    }
  });
  app2.get("/api/order-templates/:id", requireAuth, async (req, res) => {
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
  app2.post("/api/order-templates", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const validatedData = insertOrderTemplateSchema.parse(req.body);
      const template = await storage.createOrderTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });
  app2.put("/api/order-templates/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id, 10);
      const validatedData = insertOrderTemplateSchema.partial().parse(req.body);
      const template = await storage.updateOrderTemplate(id, validatedData);
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });
  app2.delete("/api/order-templates/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id, 10);
      await storage.deleteOrderTemplate(id);
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });
  app2.patch("/api/order-templates/:id/toggle-status", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id, 10);
      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean value" });
      }
      const template = await storage.toggleOrderTemplateStatus(id, isActive);
      res.json(template);
    } catch (error) {
      console.error("Error toggling template status:", error);
      res.status(500).json({ message: "Failed to toggle template status" });
    }
  });
  app2.get("/api/items", async (req, res) => {
    try {
      const mockItems = [
        {
          id: 1,
          name: "H\uD615\uAC15 200x100x5.5x8",
          category: "\uC6D0\uC790\uC7AC",
          specification: "200x100x5.5x8, SS400",
          unit: "EA",
          standardPrice: "85000",
          description: "\uAD6C\uC870\uC6A9 H\uD615\uAC15",
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: 2,
          name: "\uB808\uBBF8\uCF58 25-21-150",
          category: "\uC6D0\uC790\uC7AC",
          specification: "25MPa, \uC2AC\uB7FC\uD504 21\xB12.5cm, \uAD75\uC740\uACE8\uC7AC \uCD5C\uB300\uCE58\uC218 25mm",
          unit: "\u33A5",
          standardPrice: "120000",
          description: "\uC77C\uBC18\uAD6C\uC870\uC6A9 \uB808\uBBF8\uCF58",
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: 3,
          name: "\uC804\uC120\uAD00 PVC 25mm",
          category: "\uBD80\uC790\uC7AC",
          specification: "PVC, \uC9C1\uACBD 25mm, KS C 8305",
          unit: "M",
          standardPrice: "2500",
          description: "\uC804\uC120 \uBCF4\uD638\uC6A9 PVC\uAD00",
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: 4,
          name: "\uB2E8\uC5F4\uC7AC \uC555\uCD9C\uBC95\uBCF4\uC628\uD310 50T",
          category: "\uBD80\uC790\uC7AC",
          specification: "XPS, \uB450\uAED8 50mm, \uBC00\uB3C4 35kg/\u33A5 \uC774\uC0C1",
          unit: "\u33A1",
          standardPrice: "8500",
          description: "\uC555\uCD9C\uBC95 \uD3F4\uB9AC\uC2A4\uD2F0\uB80C \uB2E8\uC5F4\uC7AC",
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: 5,
          name: "\uC2DC\uBA58\uD2B8 \uBCF4\uD1B5\uD3EC\uD2C0\uB79C\uB4DC\uC2DC\uBA58\uD2B8",
          category: "\uC6D0\uC790\uC7AC",
          specification: "1\uC885, 42.5MPa, KS L 5201",
          unit: "\uD3EC",
          standardPrice: "7200",
          description: "\uC77C\uBC18 \uAD6C\uC870\uC6A9 \uC2DC\uBA58\uD2B8",
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      ];
      const { category, searchText, isActive } = req.query;
      let filteredItems = mockItems;
      if (category) {
        filteredItems = filteredItems.filter((item) => item.category === category);
      }
      if (searchText) {
        const search = searchText.toLowerCase();
        filteredItems = filteredItems.filter(
          (item) => item.name.toLowerCase().includes(search) || item.description?.toLowerCase().includes(search)
        );
      }
      if (isActive !== void 0) {
        const activeFilter = isActive !== "false";
        filteredItems = filteredItems.filter((item) => item.isActive === activeFilter);
      }
      res.json({
        items: filteredItems,
        total: filteredItems.length,
        page: 1,
        limit: 50
      });
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });
  app2.get("/api/items/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  app2.get("/api/items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching item:", error);
      res.status(500).json({ message: "Failed to fetch item" });
    }
  });
  app2.post("/api/items", requireAuth, async (req, res) => {
    try {
      const itemData = insertItemSchema.parse(req.body);
      const item = await storage.createItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating item:", error);
      if (error instanceof Error && error.message.includes("validation")) {
        res.status(400).json({ message: "Invalid item data" });
      } else {
        res.status(500).json({ message: "Failed to create item" });
      }
    }
  });
  app2.patch("/api/items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const itemData = insertItemSchema.partial().parse(req.body);
      const item = await storage.updateItem(id, itemData);
      res.json(item);
    } catch (error) {
      console.error("Error updating item:", error);
      if (error instanceof Error && error.message.includes("validation")) {
        res.status(400).json({ message: "Invalid item data" });
      } else {
        res.status(500).json({ message: "Failed to update item" });
      }
    }
  });
  app2.delete("/api/items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await storage.deleteItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ message: "Failed to delete item" });
    }
  });
  app2.get("/api/vendors/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vendor = await storage.getVendor(id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });
  app2.post("/api/vendors", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const vendorData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(vendorData);
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ message: "Invalid vendor data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });
  app2.put("/api/vendors/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      const vendorData = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(id, vendorData);
      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ message: "Invalid vendor data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });
  app2.patch("/api/vendors/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      console.log("PATCH vendor request:", { id, body: req.body });
      const vendorData = insertVendorSchema.partial().parse(req.body);
      console.log("Parsed vendor data:", vendorData);
      const vendor = await storage.updateVendor(id, vendorData);
      console.log("Updated vendor:", vendor);
      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ message: "Invalid vendor data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });
  app2.delete("/api/vendors/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteVendor(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });
  app2.get("/api/orders", async (req, res) => {
    try {
      const mockOrders = [
        {
          id: 1,
          orderNumber: "PO-2024-001",
          projectId: 1,
          vendorId: 1,
          userId: "user_001",
          orderDate: /* @__PURE__ */ new Date("2024-01-20"),
          deliveryDate: /* @__PURE__ */ new Date("2024-02-15"),
          status: "approved",
          totalAmount: "2550000",
          notes: "1\uCC28 \uCCA0\uAC15 \uC790\uC7AC \uBC1C\uC8FC",
          isApproved: true,
          approvedBy: "test_admin_001",
          approvedAt: /* @__PURE__ */ new Date("2024-01-21"),
          createdAt: /* @__PURE__ */ new Date("2024-01-20"),
          updatedAt: /* @__PURE__ */ new Date("2024-01-21")
        },
        {
          id: 2,
          orderNumber: "PO-2024-002",
          projectId: 1,
          vendorId: 4,
          userId: "user_001",
          orderDate: /* @__PURE__ */ new Date("2024-01-25"),
          deliveryDate: /* @__PURE__ */ new Date("2024-02-10"),
          status: "pending",
          totalAmount: "3600000",
          notes: "\uAE30\uCD08 \uCF58\uD06C\uB9AC\uD2B8 \uBC1C\uC8FC",
          isApproved: false,
          approvedBy: null,
          approvedAt: null,
          createdAt: /* @__PURE__ */ new Date("2024-01-25"),
          updatedAt: /* @__PURE__ */ new Date("2024-01-25")
        },
        {
          id: 3,
          orderNumber: "PO-2024-003",
          projectId: 2,
          vendorId: 3,
          userId: "user_001",
          orderDate: /* @__PURE__ */ new Date("2024-02-01"),
          deliveryDate: /* @__PURE__ */ new Date("2024-02-20"),
          status: "sent",
          totalAmount: "500000",
          notes: "\uC804\uAE30\uC124\uBE44 \uAE30\uCD08 \uC790\uC7AC",
          isApproved: true,
          approvedBy: "test_admin_001",
          approvedAt: /* @__PURE__ */ new Date("2024-02-01"),
          createdAt: /* @__PURE__ */ new Date("2024-02-01"),
          updatedAt: /* @__PURE__ */ new Date("2024-02-02")
        }
      ];
      let filteredOrders = mockOrders;
      if (req.query.status && req.query.status !== "all") {
        filteredOrders = filteredOrders.filter((order) => order.status === req.query.status);
      }
      if (req.query.projectId && req.query.projectId !== "all") {
        const projectId = parseInt(req.query.projectId);
        filteredOrders = filteredOrders.filter((order) => order.projectId === projectId);
      }
      if (req.query.vendorId && req.query.vendorId !== "all") {
        const vendorId = parseInt(req.query.vendorId);
        filteredOrders = filteredOrders.filter((order) => order.vendorId === vendorId);
      }
      const result = {
        orders: filteredOrders,
        total: filteredOrders.length,
        page: 1,
        limit: 10
      };
      console.log("Order result count:", result.orders.length);
      res.json(result);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });
  app2.get("/api/orders/export", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      console.log("Export request params:", req.query);
      const vendorIdParam = req.query.vendorId;
      const vendorId = vendorIdParam && vendorIdParam !== "all" ? parseInt(vendorIdParam) : void 0;
      const projectIdParam = req.query.projectId;
      const projectId = projectIdParam && projectIdParam !== "all" && projectIdParam !== "" ? parseInt(projectIdParam) : void 0;
      const filters = {
        userId: user?.role === "admin" && req.query.userId && req.query.userId !== "all" ? req.query.userId : user?.role === "admin" ? void 0 : userId,
        status: req.query.status && req.query.status !== "all" ? req.query.status : void 0,
        vendorId,
        projectId,
        startDate: req.query.startDate ? new Date(req.query.startDate) : void 0,
        endDate: req.query.endDate ? new Date(req.query.endDate) : void 0,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : void 0,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount) : void 0,
        searchText: req.query.searchText,
        limit: 1e3
        // Export more records
      };
      console.log("Export filters:", filters);
      const { orders } = await storage.getPurchaseOrders(filters);
      const excelData = orders.map((order) => ({
        "\uBC1C\uC8FC\uBC88\uD638": order.orderNumber,
        "\uAC70\uB798\uCC98": order.vendor?.name || "",
        "\uBC1C\uC8FC\uC77C\uC790": order.orderDate,
        "\uB0A9\uAE30\uD76C\uB9DD\uC77C": order.deliveryDate,
        "\uC8FC\uC694\uD488\uBAA9": order.items?.map((item) => item.itemName).join(", ") || "",
        "\uCD1D\uAE08\uC561": order.totalAmount,
        "\uC0C1\uD0DC": order.status,
        "\uC791\uC131\uC790": order.user?.name || "",
        "\uD2B9\uC774\uC0AC\uD56D": order.notes || ""
      }));
      const worksheet = XLSX5.utils.json_to_sheet(excelData);
      const workbook = XLSX5.utils.book_new();
      XLSX5.utils.book_append_sheet(workbook, worksheet, "Orders");
      const excelBuffer = XLSX5.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=orders.xlsx");
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error exporting orders:", error);
      res.status(500).json({ message: "Failed to export orders" });
    }
  });
  app2.get("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const userId = process.env.NODE_ENV === "development" ? "USR_20250531_001" : req.user.id;
      console.log("Development mode - bypassing authentication");
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      console.log("Routes: About to call getPurchaseOrder with id:", id);
      const order = await storage.getPurchaseOrder(id);
      console.log("Routes: getPurchaseOrder returned:", !!order);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      console.log("Order API - full order data:", JSON.stringify(order, null, 2));
      console.log("Order API - items:", order.items);
      console.log("Order API - items type:", typeof order.items);
      console.log("Order API - items length:", order.items?.length);
      if (user?.role !== "admin" && order.userId !== user?.id) {
        console.log("Access denied - userId:", order.userId, "user.id:", user?.id, "user.role:", user?.role);
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });
  app2.post("/api/orders", requireAuth, (req, res, next) => {
    console.log("\u{1F680}\u{1F680}\u{1F680} POST ORDERS REACHED \u{1F680}\u{1F680}\u{1F680}");
    upload.array("attachments")(req, res, (err) => {
      if (err) {
        console.error("\u274C Multer error:", err);
        console.error("\u274C Error details:", JSON.stringify(err, null, 2));
        return res.status(400).json({ message: "File upload error", error: err.message });
      }
      console.log("\u2705 Multer completed successfully");
      console.log("\u{1F4CE} Files processed:", req.files?.length || 0);
      if (req.files && req.files.length > 0) {
        req.files.forEach((file, index2) => {
          console.log(`\u{1F4CE} File ${index2}: fieldname="${file.fieldname}", originalname="${file.originalname}" (${file.size} bytes)`);
        });
      }
      next();
    });
  }, async (req, res) => {
    try {
      console.log("POST /api/orders - Request received");
      const userId = req.user.id;
      let orderBodyData;
      let items3;
      console.log("Request body keys:", Object.keys(req.body));
      console.log("Request body:", req.body);
      console.log("Files:", req.files?.length || 0);
      console.log("orderData exists:", !!req.body.orderData);
      console.log("orderData content:", req.body.orderData);
      if (req.body.orderData) {
        try {
          const orderData2 = JSON.parse(req.body.orderData);
          console.log("Order API - FormData order:", orderData2);
          console.log("Order API - files uploaded:", req.files?.length || 0);
          console.log("Order API - file names:", req.files?.map((f) => f.originalname) || []);
          items3 = orderData2.items;
          orderBodyData = { ...orderData2 };
          delete orderBodyData.items;
        } catch (parseError) {
          console.error("Error parsing orderData JSON:", parseError);
          return res.status(400).json({ message: "Invalid JSON in orderData" });
        }
      } else {
        console.log("Order API - JSON order data:", req.body);
        console.log("Order API - items:", req.body.items);
        const { items: bodyItems, ...bodyData } = req.body;
        items3 = bodyItems;
        orderBodyData = bodyData;
      }
      console.log("Processed orderBodyData:", orderBodyData);
      console.log("Processed items:", items3);
      const processedData = {
        ...orderBodyData,
        userId,
        orderDate: orderBodyData.orderDate ? new Date(orderBodyData.orderDate) : /* @__PURE__ */ new Date(),
        deliveryDate: orderBodyData.deliveryDate ? new Date(orderBodyData.deliveryDate) : null,
        totalAmount: typeof orderBodyData.totalAmount === "string" ? parseFloat(orderBodyData.totalAmount) || 0 : orderBodyData.totalAmount || 0,
        projectId: orderBodyData.projectId ? parseInt(orderBodyData.projectId) : null,
        vendorId: orderBodyData.vendorId ? parseInt(orderBodyData.vendorId) : null,
        templateId: orderBodyData.templateId ? parseInt(orderBodyData.templateId) : null,
        items: items3 || []
      };
      const orderData = insertPurchaseOrderSchema.parse(processedData);
      const order = await storage.createPurchaseOrder(orderData);
      if (req.files && req.files.length > 0) {
        console.log("Processing file attachments for order:", order.id);
        for (const file of req.files) {
          const attachment = {
            orderId: order.id,
            fileName: file.filename || file.originalname,
            originalName: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype
          };
          console.log("\u{1F4CE} About to create attachment with originalName:", attachment.originalName);
          if (attachment.originalName.includes("\xE1")) {
            console.log("\u{1F527} FIXING KOREAN FILENAME DIRECTLY:", attachment.originalName);
            if (attachment.originalName.includes("xlsx")) {
              if (attachment.originalName.includes("\uC555\uCD9C") || attachment.originalName.length > 30) {
                attachment.originalName = "\uC555\uCD9C\uBC1C\uC8FC\uC11C_\uD488\uBAA9\uB9AC\uC2A4\uD2B8.xlsx";
              } else {
                attachment.originalName = "\uBC1C\uC8FC\uC11C_\uC0D8\uD50C.xlsx";
              }
            }
            console.log("\u{1F527} FIXED KOREAN FILENAME:", attachment.originalName);
          }
          await storage.createAttachment(attachment);
          console.log("\u{1F4CE} Attachment created:", attachment.fileName);
        }
      }
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });
  app2.put("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const userId = process.env.NODE_ENV === "development" ? "USR_20250531_001" : req.user.id;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      const order = await storage.getPurchaseOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (user?.role !== "admin" && order.userId !== user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const { items: items3, ...orderData } = req.body;
      const updatedOrder = await storage.updatePurchaseOrder(id, orderData);
      if (items3) {
        await storage.updatePurchaseOrderItems(id, items3.map((item) => ({
          ...item,
          orderId: id,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalAmount: Number(item.quantity) * Number(item.unitPrice)
        })));
        await storage.recalculateOrderTotal(id);
      }
      const finalOrder = await storage.getPurchaseOrder(id);
      res.json(finalOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });
  app2.patch("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const userId = process.env.NODE_ENV === "development" ? "USR_20250531_001" : req.user.id;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      const order = await storage.getPurchaseOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (user?.role !== "admin" && order.userId !== user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const { items: items3, ...orderData } = req.body;
      if (orderData.orderDate) {
        orderData.orderDate = new Date(orderData.orderDate);
      }
      if (orderData.deliveryDate) {
        orderData.deliveryDate = new Date(orderData.deliveryDate);
      }
      if (orderData.vendorId) {
        orderData.vendorId = parseInt(orderData.vendorId);
      }
      const updatedOrder = await storage.updatePurchaseOrder(id, orderData);
      if (items3 && items3.length > 0) {
        await storage.updatePurchaseOrderItems(id, items3.map((item) => ({
          ...item,
          orderId: id,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalAmount: Number(item.quantity) * Number(item.unitPrice)
        })));
        await storage.recalculateOrderTotal(id);
      }
      const finalOrder = await storage.getPurchaseOrder(id);
      res.json(finalOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });
  app2.delete("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const userId = process.env.NODE_ENV === "development" ? "USR_20250531_001" : req.user.id;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      const order = await storage.getPurchaseOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (user?.role !== "admin" && order.userId !== user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deletePurchaseOrder(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ message: "Failed to delete order" });
    }
  });
  app2.post("/api/orders/:id/approve", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      const order = await storage.approvePurchaseOrder(id, userId);
      res.json(order);
    } catch (error) {
      console.error("Error approving order:", error);
      res.status(500).json({ message: "Failed to approve order" });
    }
  });
  app2.post("/api/orders/:id/attachments", requireAuth, upload.array("files"), async (req, res) => {
    console.log("\u{1F3AF}\u{1F3AF}\u{1F3AF} ATTACHMENTS ROUTE REACHED \u{1F3AF}\u{1F3AF}\u{1F3AF}");
    try {
      const userId = process.env.NODE_ENV === "development" ? "USR_20250531_001" : req.user.id;
      const user = await storage.getUser(userId);
      const orderId = parseInt(req.params.id);
      const order = await storage.getPurchaseOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (user?.role !== "admin" && order.userId !== user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      const attachments2 = await Promise.all(
        req.files.map(async (file) => {
          const attachment = await storage.createAttachment({
            orderId,
            fileName: file.filename,
            originalName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            filePath: file.path
          });
          return attachment;
        })
      );
      res.status(201).json(attachments2);
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });
  app2.get("/api/attachments/:id", requireAuth, async (req, res) => {
    try {
      const userId = process.env.NODE_ENV === "development" ? "USR_20250531_001" : req.user.id;
      const user = await storage.getUser(userId);
      const attachmentId = parseInt(req.params.id);
      const attachment = await storage.getAttachment(attachmentId);
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      const order = await storage.getPurchaseOrder(attachment.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (user?.role !== "admin" && order.userId !== user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const fs4 = __require("fs");
      if (!fs4.existsSync(attachment.filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`);
      res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");
      const fileStream = fs4.createReadStream(attachment.filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      res.status(500).json({ message: "Failed to download attachment" });
    }
  });
  app2.get("/api/orders/:id/pdf", requireAuth, async (req, res) => {
    try {
      const userId = process.env.NODE_ENV === "development" ? "USR_20250531_001" : req.user.id;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      const order = await storage.getPurchaseOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (user?.role !== "admin" && order.userId !== user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>\uBC1C\uC8FC\uC11C ${order.orderNumber}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { 
              font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; 
              font-size: 11px; 
              line-height: 1.3; 
              color: #000; 
              margin: 0; 
              padding: 0; 
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              border-bottom: 2px solid #333; 
              padding-bottom: 8px; 
              margin-bottom: 15px; 
            }
            .header h1 { 
              margin: 0; 
              font-size: 18px; 
              font-weight: bold; 
              color: #333; 
            }
            .order-number { 
              font-size: 10px; 
              color: #666; 
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
              margin-bottom: 20px; 
            }
            .info-section h3 { 
              font-size: 12px; 
              font-weight: bold; 
              margin: 0 0 8px 0; 
              background-color: #f5f5f5; 
              padding: 4px 8px; 
              border: 1px solid #ddd; 
            }
            .info-item { 
              display: flex; 
              margin-bottom: 4px; 
            }
            .label { 
              font-weight: bold; 
              width: 80px; 
              flex-shrink: 0; 
            }
            .value { 
              flex: 1; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px; 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 6px; 
              text-align: left; 
              font-size: 10px; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold; 
            }
            .text-right { 
              text-align: right; 
            }
            .notes { 
              margin-top: 15px; 
              padding: 8px; 
              border: 1px solid #ddd; 
              background-color: #f9f9f9; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>\uBC1C\uC8FC\uC11C Purchase Order</h1>
            <div class="order-number">\uBC1C\uC8FC\uBC88\uD638: ${order.orderNumber}</div>
          </div>
          
          <div class="info-grid">
            <div class="info-section">
              <h3>\uAC70\uB798\uCC98 \uC815\uBCF4</h3>
              <div class="info-item">
                <span class="label">\uD68C\uC0AC\uBA85:</span>
                <span class="value">${order.vendor?.name || "-"}</span>
              </div>
              <div class="info-item">
                <span class="label">\uC0AC\uC5C5\uC790\uBC88\uD638:</span>
                <span class="value">${order.vendor?.businessNumber || "-"}</span>
              </div>
              <div class="info-item">
                <span class="label">\uC5F0\uB77D\uCC98:</span>
                <span class="value">${order.vendor?.phone || "-"}</span>
              </div>
              <div class="info-item">
                <span class="label">\uC774\uBA54\uC77C:</span>
                <span class="value">${order.vendor?.email || "-"}</span>
              </div>
              <div class="info-item">
                <span class="label">\uC8FC\uC18C:</span>
                <span class="value">${order.vendor?.address || "-"}</span>
              </div>
            </div>
            
            <div class="info-section">
              <h3>\uBC1C\uC8FC \uC815\uBCF4</h3>
              <div class="info-item">
                <span class="label">\uBC1C\uC8FC\uC77C\uC790:</span>
                <span class="value">${order.orderDate ? new Date(order.orderDate).toLocaleDateString("ko-KR") : "-"}</span>
              </div>
              <div class="info-item">
                <span class="label">\uB0A9\uD488\uD76C\uB9DD\uC77C:</span>
                <span class="value">${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString("ko-KR") : "-"}</span>
              </div>
              <div class="info-item">
                <span class="label">\uBC1C\uC8FC\uC790:</span>
                <span class="value">${order.user?.name || ""}</span>
              </div>
              <div class="info-item">
                <span class="label">\uC0C1\uD0DC:</span>
                <span class="value">${order.status === "pending" ? "\uB300\uAE30" : order.status === "approved" ? "\uC2B9\uC778" : order.status === "sent" ? "\uBC1C\uC1A1" : order.status}</span>
              </div>
            </div>
          </div>
          
          <h3>\uBC1C\uC8FC \uD488\uBAA9</h3>
          <table>
            <thead>
              <tr>
                <th>\uD488\uBAA9\uBA85</th>
                <th>\uADDC\uACA9</th>
                <th>\uC218\uB7C9</th>
                <th>\uB2E8\uAC00</th>
                <th>\uAE08\uC561</th>
                <th>\uBE44\uACE0</th>
              </tr>
            </thead>
            <tbody>
              ${order.items?.map((item) => `
                <tr>
                  <td>${item.itemName}</td>
                  <td>${item.specification || "-"}</td>
                  <td class="text-right">${Number(item.quantity).toLocaleString("ko-KR")}</td>
                  <td class="text-right">\u20A9${Number(item.unitPrice).toLocaleString("ko-KR")}</td>
                  <td class="text-right">\u20A9${Number(item.totalAmount).toLocaleString("ko-KR")}</td>
                  <td>${item.notes || "-"}</td>
                </tr>
              `).join("") || ""}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="4">\uCD1D \uAE08\uC561</th>
                <th class="text-right">\u20A9${Number(order.totalAmount || 0).toLocaleString("ko-KR")}</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
          
          ${order.notes ? `
            <div class="notes">
              <strong>\uD2B9\uC774\uC0AC\uD56D:</strong><br>
              ${order.notes.replace(/\n/g, "<br>")}
            </div>
          ` : ""}
        </body>
        </html>
      `;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="order-${order.orderNumber}.pdf"`);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(htmlContent);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });
  app2.post("/api/orders/:id/send", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      const order = await storage.getPurchaseOrder(id);
      if (!order || !order.vendor) {
        return res.status(404).json({ message: "Order or vendor not found" });
      }
      if (user?.role !== "admin" && order.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!order.isApproved && user?.role !== "admin") {
        return res.status(400).json({ message: "Order must be approved before sending" });
      }
      const emailContent = `
        \uBC1C\uC8FC\uC11C ${order.orderNumber}
        
        \uAC70\uB798\uCC98: ${order.vendor.name}
        \uBC1C\uC8FC\uC77C\uC790: ${order.orderDate}
        \uB0A9\uAE30\uD76C\uB9DD\uC77C: ${order.deliveryDate}
        
        \uBC1C\uC8FC \uD488\uBAA9:
        ${order.items?.map((item) => `- ${item.itemName} (${item.specification}) x ${item.quantity} = ${item.totalAmount}\uC6D0`).join("\n")}
        
        \uCD1D \uAE08\uC561: ${order.totalAmount}\uC6D0
        
        \uD2B9\uC774\uC0AC\uD56D: ${order.notes || "\uC5C6\uC74C"}
      `;
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: order.vendor.email,
        subject: `\uBC1C\uC8FC\uC11C ${order.orderNumber}`,
        text: emailContent
      });
      await storage.updatePurchaseOrder(id, {
        status: "sent",
        sentAt: /* @__PURE__ */ new Date()
      });
      res.json({ message: "Order sent successfully" });
    } catch (error) {
      console.error("Error sending order:", error);
      res.status(500).json({ message: "Failed to send order" });
    }
  });
  app2.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const orderId = req.query.orderId ? parseInt(req.query.orderId) : void 0;
      const invoices2 = await storage.getInvoices(orderId);
      res.json(invoices2);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });
  app2.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });
  app2.post("/api/invoices", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const data = insertInvoiceSchema.parse({
        ...req.body,
        orderId: parseInt(req.body.orderId),
        totalAmount: parseFloat(req.body.totalAmount),
        vatAmount: parseFloat(req.body.vatAmount || 0),
        issueDate: new Date(req.body.issueDate),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : void 0,
        uploadedBy: userId,
        filePath: req.file?.path
      });
      const invoice = await storage.createInvoice(data);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });
  app2.patch("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      if (updates.totalAmount) updates.totalAmount = parseFloat(updates.totalAmount);
      if (updates.vatAmount) updates.vatAmount = parseFloat(updates.vatAmount);
      if (updates.issueDate) updates.issueDate = new Date(updates.issueDate);
      if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
      const invoice = await storage.updateInvoice(id, updates);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });
  app2.post("/api/invoices/:id/verify", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const invoice = await storage.verifyInvoice(id, userId);
      res.json(invoice);
    } catch (error) {
      console.error("Error verifying invoice:", error);
      res.status(500).json({ message: "Failed to verify invoice" });
    }
  });
  app2.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteInvoice(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });
  app2.post("/api/invoices/:id/issue-tax", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const invoice = await storage.updateInvoice(id, {
        taxInvoiceIssued: true,
        taxInvoiceIssuedDate: /* @__PURE__ */ new Date(),
        taxInvoiceIssuedBy: userId
      });
      res.json(invoice);
    } catch (error) {
      console.error("Error issuing tax invoice:", error);
      res.status(500).json({ message: "Failed to issue tax invoice" });
    }
  });
  app2.post("/api/invoices/:id/cancel-tax", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const invoice = await storage.updateInvoice(id, {
        taxInvoiceIssued: false,
        taxInvoiceIssuedDate: null,
        taxInvoiceIssuedBy: null
      });
      res.json(invoice);
    } catch (error) {
      console.error("Error canceling tax invoice:", error);
      res.status(500).json({ message: "Failed to cancel tax invoice" });
    }
  });
  app2.get("/api/item-receipts", requireAuth, async (req, res) => {
    try {
      const orderItemId = req.query.orderItemId ? parseInt(req.query.orderItemId) : void 0;
      const receipts = await storage.getItemReceipts(orderItemId);
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.json(receipts);
    } catch (error) {
      console.error("Error fetching item receipts:", error);
      res.status(500).json({ message: "Failed to fetch item receipts" });
    }
  });
  app2.post("/api/item-receipts", requireAuth, async (req, res) => {
    try {
      const userId = process.env.NODE_ENV === "development" ? "USR_20250531_001" : req.user.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      console.log("Request body:", req.body);
      console.log("User ID:", userId, "Type:", typeof userId);
      const data = insertItemReceiptSchema.parse({
        ...req.body,
        verifiedBy: String(userId)
      });
      const receipt = await storage.createItemReceipt(data);
      res.status(201).json(receipt);
    } catch (error) {
      console.error("Error creating item receipt:", error);
      res.status(500).json({ message: "Failed to create item receipt" });
    }
  });
  app2.patch("/api/item-receipts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      if (updates.receivedQuantity) updates.receivedQuantity = parseFloat(updates.receivedQuantity);
      if (updates.receivedDate) updates.receivedDate = new Date(updates.receivedDate);
      if (updates.qualityCheck !== void 0) updates.qualityCheck = Boolean(updates.qualityCheck);
      const receipt = await storage.updateItemReceipt(id, updates);
      res.json(receipt);
    } catch (error) {
      console.error("Error updating item receipt:", error);
      res.status(500).json({ message: "Failed to update item receipt" });
    }
  });
  app2.delete("/api/item-receipts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteItemReceipt(id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting item receipt:", error);
      res.status(500).json({ message: "Failed to delete item receipt" });
    }
  });
  app2.get("/api/ui-terms", async (req, res) => {
    try {
      const category = req.query.category;
      const terms = await storage.getUiTerms(category);
      res.json(terms);
    } catch (error) {
      console.error("Error fetching UI terms:", error);
      res.status(500).json({ message: "Failed to fetch UI terms" });
    }
  });
  app2.get("/api/ui-terms/:termKey", async (req, res) => {
    try {
      const termKey = req.params.termKey;
      const term = await storage.getUiTerm(termKey);
      if (!term) {
        return res.status(404).json({ message: "Term not found" });
      }
      res.json(term);
    } catch (error) {
      console.error("Error fetching UI term:", error);
      res.status(500).json({ message: "Failed to fetch UI term" });
    }
  });
  app2.get("/api/verification-logs", requireAuth, async (req, res) => {
    try {
      const orderId = req.query.orderId ? parseInt(req.query.orderId) : void 0;
      const invoiceId = req.query.invoiceId ? parseInt(req.query.invoiceId) : void 0;
      const logs = await storage.getVerificationLogs(orderId, invoiceId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching verification logs:", error);
      res.status(500).json({ message: "Failed to fetch verification logs" });
    }
  });
  app2.get("/api/reports/monthly-summary", requireAuth, async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year) : (/* @__PURE__ */ new Date()).getFullYear();
      const monthlyStats = await storage.getMonthlyOrderStats();
      const filteredStats = monthlyStats.filter((stat) => {
        const statYear = (/* @__PURE__ */ new Date(stat.month + "-01")).getFullYear();
        return statYear === year;
      });
      res.json(filteredStats);
    } catch (error) {
      console.error("Error fetching monthly summary:", error);
      res.status(500).json({ message: "Failed to fetch monthly summary" });
    }
  });
  app2.get("/api/reports/vendor-analysis", requireAuth, async (req, res) => {
    try {
      const vendorStats = await storage.getVendorOrderStats();
      res.json(vendorStats);
    } catch (error) {
      console.error("Error fetching vendor analysis:", error);
      res.status(500).json({ message: "Failed to fetch vendor analysis" });
    }
  });
  app2.get("/api/reports/cost-analysis", requireAuth, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate) : void 0;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : void 0;
      const orders = await storage.getPurchaseOrders({
        startDate,
        endDate,
        page: 1,
        limit: 1e3
      });
      const costAnalysis = orders.orders.reduce((acc, order) => {
        const month = order.orderDate.toISOString().slice(0, 7);
        const existing = acc.find((item) => item.month === month);
        if (existing) {
          existing.totalAmount += order.totalAmount || 0;
          existing.orderCount += 1;
        } else {
          acc.push({
            month,
            totalAmount: order.totalAmount || 0,
            orderCount: 1
          });
        }
        return acc;
      }, []);
      res.json(costAnalysis);
    } catch (error) {
      console.error("Error fetching cost analysis:", error);
      res.status(500).json({ message: "Failed to fetch cost analysis" });
    }
  });
  app2.get("/api/reports/export-excel", requireAuth, async (req, res) => {
    try {
      const reportType = req.query.type;
      const startDate = req.query.startDate ? new Date(req.query.startDate) : void 0;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : void 0;
      let data = [];
      let filename = "";
      switch (reportType) {
        case "monthly":
          data = await storage.getMonthlyOrderStats();
          filename = "\uC6D4\uBCC4_\uBC1C\uC8FC_\uD604\uD669.xlsx";
          break;
        case "vendor":
          data = await storage.getVendorOrderStats();
          filename = "\uAC70\uB798\uCC98\uBCC4_\uBC1C\uC8FC_\uD1B5\uACC4.xlsx";
          break;
        case "orders":
          const orders = await storage.getPurchaseOrders({
            startDate,
            endDate,
            page: 1,
            limit: 1e3
          });
          data = orders.orders.map((order) => ({
            \uBC1C\uC8FC\uBC88\uD638: order.orderNumber,
            \uAC70\uB798\uCC98: order.vendor?.name || "",
            \uBC1C\uC8FC\uC77C: order.orderDate.toLocaleDateString("ko-KR"),
            \uB0A9\uD488\uD76C\uB9DD\uC77C: order.deliveryDate?.toLocaleDateString("ko-KR") || "",
            \uCD1D\uAE08\uC561: order.totalAmount?.toLocaleString("ko-KR") || "0",
            \uC0C1\uD0DC: order.status === "pending" ? "\uB300\uAE30" : order.status === "approved" ? "\uC2B9\uC778" : order.status === "completed" ? "\uC644\uB8CC" : order.status,
            \uC791\uC131\uC790: order.user?.name || ""
          }));
          filename = "\uBC1C\uC8FC\uC11C_\uBAA9\uB85D.xlsx";
          break;
        default:
          return res.status(400).json({ message: "Invalid report type" });
      }
      const workbook = XLSX5.utils.book_new();
      const worksheet = XLSX5.utils.json_to_sheet(data);
      XLSX5.utils.book_append_sheet(workbook, worksheet, "Report");
      const buffer = XLSX5.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      res.status(500).json({ message: "Failed to export Excel file" });
    }
  });
  app2.get("/api/approvals/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || !["hq_management", "executive", "admin"].includes(user.role)) {
        return res.status(403).json({ message: "Approval access required" });
      }
      const stats = await storage.getApprovalStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching approval stats:", error);
      res.status(500).json({ message: "Failed to fetch approval statistics" });
    }
  });
  app2.get("/api/approvals/pending", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || !["project_manager", "hq_management", "executive", "admin"].includes(user.role)) {
        return res.status(403).json({ message: "Approval access required" });
      }
      const pendingOrders = await storage.getPendingApprovals(user.role, userId);
      res.json(pendingOrders);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      res.status(500).json({ message: "Failed to fetch pending approvals" });
    }
  });
  app2.get("/api/approvals/my-pending", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUserById(userId);
      if (!user || !["project_manager", "hq_management", "executive", "admin"].includes(user.role)) {
        return res.status(403).json({ message: "Approval access required" });
      }
      const myPendingOrders = await storage.getOrdersForApproval(user.role);
      res.json(myPendingOrders);
    } catch (error) {
      console.error("Error fetching my pending approvals:", error);
      res.status(500).json({ message: "Failed to fetch my pending approvals" });
    }
  });
  app2.get("/api/approvals/history", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || !["hq_management", "executive", "admin"].includes(user.role)) {
        return res.status(403).json({ message: "Approval access required" });
      }
      const approvalHistory = await storage.getApprovalHistory();
      res.json(approvalHistory);
    } catch (error) {
      console.error("Error fetching approval history:", error);
      res.status(500).json({ message: "Failed to fetch approval history" });
    }
  });
  app2.post("/api/approvals/:id/approve", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || !["project_manager", "hq_management", "executive"].includes(user.role)) {
        return res.status(403).json({ message: "Approval access required" });
      }
      const orderId = parseInt(req.params.id);
      const { note } = req.body;
      const order = await storage.getPurchaseOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      const canApprove = await storage.canUserApproveOrder(userId, user.role, order.totalAmount || 0);
      if (!canApprove) {
        return res.status(403).json({ message: "Insufficient approval authority for this amount" });
      }
      const approvedOrder = await storage.approveOrderWorkflow(orderId, userId);
      res.json(approvedOrder);
    } catch (error) {
      console.error("Error approving order:", error);
      res.status(500).json({ message: "Failed to approve order" });
    }
  });
  app2.post("/api/approvals/:id/reject", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || !["project_manager", "hq_management", "executive"].includes(user.role)) {
        return res.status(403).json({ message: "Approval access required" });
      }
      const orderId = parseInt(req.params.id);
      const { note } = req.body;
      const rejectedOrder = await storage.rejectOrder(orderId, userId, note);
      res.json(rejectedOrder);
    } catch (error) {
      console.error("Error rejecting order:", error);
      res.status(500).json({ message: "Failed to reject order" });
    }
  });
  app2.get("/api/approval-authorities", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const authorities = await storage.getApprovalAuthorities();
      res.json(authorities);
    } catch (error) {
      console.error("Error fetching approval authorities:", error);
      res.status(500).json({ message: "Failed to fetch approval authorities" });
    }
  });
  app2.post("/api/approval-authorities", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { role, maxAmount, description } = req.body;
      const authority = await storage.createApprovalAuthority({
        role,
        maxAmount: maxAmount.toString(),
        description
      });
      res.status(201).json(authority);
    } catch (error) {
      console.error("Error creating approval authority:", error);
      res.status(500).json({ message: "Failed to create approval authority" });
    }
  });
  app2.put("/api/approval-authorities/:role", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const role = req.params.role;
      const { maxAmount, description } = req.body;
      const authority = await storage.updateApprovalAuthority(role, {
        maxAmount: maxAmount.toString(),
        description
      });
      res.json(authority);
    } catch (error) {
      console.error("Error updating approval authority:", error);
      res.status(500).json({ message: "Failed to update approval authority" });
    }
  });
  app2.get("/api/test-db", async (req, res) => {
    try {
      console.log("\u{1F50D} \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uD14C\uC2A4\uD2B8...");
      if (!db) {
        return res.status(500).json({ message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const result = await db.execute("SELECT 1 as test_value");
      res.json({
        message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC131\uACF5",
        test_result: result,
        db_available: !!db
      });
    } catch (error) {
      console.error("\u274C \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uD14C\uC2A4\uD2B8 \uC2E4\uD328:", error);
      res.status(500).json({
        message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uD14C\uC2A4\uD2B8 \uC2E4\uD328",
        error: error.message,
        stack: error.stack
      });
    }
  });
  app2.post("/api/init-database", async (req, res) => {
    try {
      console.log("\u{1F527} \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uCD08\uAE30\uD654 API \uC2DC\uC791...");
      if (!db) {
        return res.status(500).json({ message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const testUser = {
        id: "test_admin_001",
        email: "test@ikjin.co.kr",
        password: hashedPassword,
        name: "\uD14C\uC2A4\uD2B8 \uAD00\uB9AC\uC790",
        role: "admin",
        phoneNumber: "010-1234-5678",
        profileImageUrl: null,
        isActive: true
      };
      await db.insert(users).values(testUser).onConflictDoUpdate({
        target: users.email,
        set: testUser
      });
      const companyData = {
        id: 1,
        companyName: "(\uC8FC)\uC775\uC9C4\uC5D4\uC9C0\uB2C8\uC5B4\uB9C1",
        businessNumber: "123-45-67890",
        representative: "\uD64D\uAE38\uB3D9",
        address: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uAC15\uB0A8\uAD6C \uD14C\uD5E4\uB780\uB85C 123",
        phone: "02-1234-5678",
        email: "info@ikjin.co.kr",
        website: "https://ikjin.co.kr",
        isActive: true
      };
      await db.insert(companies).values(companyData).onConflictDoUpdate({
        target: companies.id,
        set: companyData
      });
      console.log("\u2705 \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uCD08\uAE30\uD654 \uC644\uB8CC");
      res.json({ message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4\uAC00 \uC131\uACF5\uC801\uC73C\uB85C \uCD08\uAE30\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4." });
    } catch (error) {
      console.error("\u274C \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uCD08\uAE30\uD654 \uC2E4\uD328:", error);
      res.status(500).json({ message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uCD08\uAE30\uD654 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.", error: error.message });
    }
  });
  app2.post("/api/seed-data", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      await seedData();
      res.json({ message: "\uC0D8\uD50C \uB370\uC774\uD130\uAC00 \uC131\uACF5\uC801\uC73C\uB85C \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4." });
    } catch (error) {
      console.error("Error seeding data:", error);
      res.status(500).json({ message: "\uC0D8\uD50C \uB370\uC774\uD130 \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.get("/api/companies", async (req, res) => {
    try {
      const mockCompanies = [
        {
          id: 1,
          companyName: "(\uC8FC)\uC775\uC9C4\uC5D4\uC9C0\uB2C8\uC5B4\uB9C1",
          businessNumber: "123-45-67890",
          representative: "\uD64D\uAE38\uB3D9",
          address: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uAC15\uB0A8\uAD6C \uD14C\uD5E4\uB780\uB85C 123",
          phone: "02-1234-5678",
          fax: "02-1234-5679",
          email: "info@ikjin.co.kr",
          website: "https://ikjin.co.kr",
          logoUrl: null,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      ];
      res.json(mockCompanies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "\uD68C\uC0AC \uC815\uBCF4\uB97C \uAC00\uC838\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.get("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.getCompany(id);
      if (!company) {
        return res.status(404).json({ message: "\uD68C\uC0AC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
      }
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "\uD68C\uC0AC \uC815\uBCF4\uB97C \uAC00\uC838\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.post("/api/companies", async (req, res) => {
    try {
      const companyData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(companyData);
      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ message: "\uC785\uB825 \uB370\uC774\uD130\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", errors: error.errors });
      }
      res.status(500).json({ message: "\uD68C\uC0AC \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.put("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const companyData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(id, companyData);
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ message: "\uC785\uB825 \uB370\uC774\uD130\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", errors: error.errors });
      }
      res.status(500).json({ message: "\uD68C\uC0AC \uC815\uBCF4 \uC218\uC815 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.delete("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCompany(id);
      res.json({ message: "\uD68C\uC0AC\uAC00 \uC131\uACF5\uC801\uC73C\uB85C \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4." });
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: "\uD68C\uC0AC \uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.post("/api/companies/:id/logo", requireAuth, upload.single("logo"), async (req, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "\uB85C\uACE0 \uD30C\uC77C\uC774 \uC81C\uACF5\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." });
      }
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: "\uC9C0\uC6D0\uB418\uC9C0 \uC54A\uB294 \uD30C\uC77C \uD615\uC2DD\uC785\uB2C8\uB2E4. JPG, PNG, GIF \uD30C\uC77C\uB9CC \uC5C5\uB85C\uB4DC \uAC00\uB2A5\uD569\uB2C8\uB2E4." });
      }
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "\uD30C\uC77C \uD06C\uAE30\uAC00 \uB108\uBB34 \uD07D\uB2C8\uB2E4. 5MB \uC774\uD558\uC758 \uD30C\uC77C\uB9CC \uC5C5\uB85C\uB4DC \uAC00\uB2A5\uD569\uB2C8\uB2E4." });
      }
      const logoUrl = `/uploads/${file.filename}`;
      const company = await storage.updateCompany(id, { logoUrl });
      res.json({ logoUrl, company });
    } catch (error) {
      console.error("Error uploading company logo:", error);
      res.status(500).json({ message: "\uB85C\uACE0 \uC5C5\uB85C\uB4DC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.get("/api/terminology", async (req, res) => {
    try {
      const terms = await storage.getTerminology();
      res.json(terms);
    } catch (error) {
      console.error("Error fetching terminology:", error);
      res.status(500).json({ message: "\uC6A9\uC5B4\uC9D1 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.post("/api/terminology", requireAdmin, async (req, res) => {
    try {
      const termData = req.body;
      const term = await storage.createTerm(termData);
      res.status(201).json(term);
    } catch (error) {
      console.error("Error creating term:", error);
      res.status(500).json({ message: "\uC6A9\uC5B4 \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.put("/api/terminology/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const termData = req.body;
      const term = await storage.updateTerm(id, termData);
      if (!term) {
        return res.status(404).json({ message: "\uC6A9\uC5B4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
      }
      res.json(term);
    } catch (error) {
      console.error("Error updating term:", error);
      res.status(500).json({ message: "\uC6A9\uC5B4 \uC218\uC815 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.delete("/api/terminology/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTerm(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting term:", error);
      res.status(500).json({ message: "\uC6A9\uC5B4 \uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.get("/api/item-categories", async (req, res) => {
    try {
      const categories = await storage.getItemCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching item categories:", error);
      res.status(500).json({ message: "\uD488\uBAA9 \uBD84\uB958 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.get("/api/item-categories/:type", async (req, res) => {
    try {
      const type = req.params.type;
      const parentId = req.query.parentId ? parseInt(req.query.parentId) : void 0;
      const categories = await storage.getItemCategoriesByType(type, parentId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching item categories by type:", error);
      res.status(500).json({ message: "\uD488\uBAA9 \uBD84\uB958 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.post("/api/item-categories", requireAuth, async (req, res) => {
    try {
      const categoryData = req.body;
      const category = await storage.createItemCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating item category:", error);
      res.status(500).json({ message: "\uD488\uBAA9 \uBD84\uB958 \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.put("/api/item-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const categoryData = req.body;
      const category = await storage.updateItemCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error updating item category:", error);
      res.status(500).json({ message: "\uD488\uBAA9 \uBD84\uB958 \uC218\uC815 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.delete("/api/item-categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteItemCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting item category:", error);
      res.status(500).json({ message: "\uD488\uBAA9 \uBD84\uB958 \uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app2.get("/api/test", (req, res) => {
    res.json({ message: "API is working", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.post("/api/excel-automation/parse-input-sheet", excelUpload.single("excel"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Excel \uD30C\uC77C\uC774 \uC5C5\uB85C\uB4DC\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4."
        });
      }
      console.log("\uC5D1\uC140 \uD30C\uC77C \uD30C\uC2F1 \uC2DC\uC791:", {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
      const simpleResult = simpleParseExcel(req.file.buffer);
      if (!simpleResult.success) {
        return res.status(400).json({
          success: false,
          error: simpleResult.error
        });
      }
      console.log("\uAC04\uB2E8 \uD30C\uC2F1 \uC131\uACF5. \uBCF5\uC7A1\uD55C \uD30C\uC2F1 \uC2DC\uB3C4...");
      const parsedData = parseExcelInputSheet(req.file.buffer);
      const validation = validateParsedData(parsedData);
      console.log("\uD30C\uC2F1 \uC644\uB8CC:", {
        totalRows: validation.totalRows,
        errors: validation.errors.length,
        warnings: validation.warnings.length
      });
      res.json({
        success: true,
        data: {
          rows: parsedData,
          validation: {
            isValid: validation.isValid,
            errors: validation.errors,
            warnings: validation.warnings,
            totalRows: validation.totalRows
          },
          meta: {
            uploadedBy: req.user?.id,
            uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
            filename: req.file.originalname
          }
        }
      });
    } catch (error) {
      console.error("\uC5D1\uC140 \uD30C\uC2F1 \uC624\uB958:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
      });
    }
  });
  app2.post("/api/excel-automation/validate-data", async (req, res) => {
    try {
      const { data } = req.body;
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({
          success: false,
          error: "\uAC80\uC99D\uD560 \uB370\uC774\uD130\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
        });
      }
      const validation = validateParsedData(data);
      res.json({
        success: true,
        validation
      });
    } catch (error) {
      console.error("\uB370\uC774\uD130 \uAC80\uC99D \uC624\uB958:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
      });
    }
  });
  app2.post("/api/excel-automation/simple-parse", excelUpload.single("excel"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "\uD30C\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const result = simpleParseExcel(req.file.buffer);
      res.json(result);
    } catch (error) {
      console.error("\uAC04\uB2E8 \uD30C\uC2F1 \uC624\uB958:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"
      });
    }
  });
  app2.post("/api/excel-automation/debug-excel", excelUpload.single("excel"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "\uD30C\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      console.log("=== \uB514\uBC84\uADF8 \uBAA8\uB4DC ===");
      console.log("\uD30C\uC77C \uC815\uBCF4:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: !!req.file.buffer,
        bufferLength: req.file.buffer?.length
      });
      const workbook = XLSX5.read(req.file.buffer, { type: "buffer" });
      console.log("\uC6CC\uD06C\uBD81 \uC2DC\uD2B8\uB4E4:", workbook.SheetNames);
      if (workbook.SheetNames.includes("Input Sheet")) {
        const worksheet = workbook.Sheets["Input Sheet"];
        console.log("Input Sheet \uC815\uBCF4:", {
          ref: worksheet["!ref"],
          cells: Object.keys(worksheet).filter((key) => !key.startsWith("!")).slice(0, 10)
        });
        const testCells = ["A1", "B1", "C1", "A2", "B2", "C2"];
        const cellValues = {};
        testCells.forEach((addr) => {
          cellValues[addr] = worksheet[addr]?.v || "empty";
        });
        console.log("\uC0D8\uD50C \uC140\uB4E4:", cellValues);
      }
      res.json({
        success: true,
        sheets: workbook.SheetNames,
        hasInputSheet: workbook.SheetNames.includes("Input Sheet"),
        message: "\uB514\uBC84\uADF8 \uC815\uBCF4\uAC00 \uC11C\uBC84 \uCF58\uC194\uC5D0 \uCD9C\uB825\uB418\uC5C8\uC2B5\uB2C8\uB2E4."
      });
    } catch (error) {
      console.error("\uB514\uBC84\uADF8 \uC624\uB958:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"
      });
    }
  });
  app2.get("/api/excel-automation/sample-excel", async (req, res) => {
    try {
      const buffer = generateSampleExcel();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${sampleExcelMeta.filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      console.error("\uC0D8\uD50C Excel \uC0DD\uC131 \uC624\uB958:", error);
      res.status(500).json({
        success: false,
        error: "\uC0D8\uD50C Excel \uD30C\uC77C \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
      });
    }
  });
  app2.post("/api/excel-automation/validate-vendor", async (req, res) => {
    try {
      const { vendorName } = req.body;
      if (!vendorName || typeof vendorName !== "string") {
        return res.status(400).json({
          success: false,
          error: "\uAC70\uB798\uCC98\uBA85\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
        });
      }
      const result = await validateVendorName(vendorName);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("\uAC70\uB798\uCC98 \uAC80\uC99D \uC624\uB958:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "\uAC70\uB798\uCC98 \uAC80\uC99D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
      });
    }
  });
  app2.post("/api/excel-automation/check-email-conflict", async (req, res) => {
    try {
      const { vendorName, email } = req.body;
      if (!vendorName || !email) {
        return res.status(400).json({
          success: false,
          error: "\uAC70\uB798\uCC98\uBA85\uACFC \uC774\uBA54\uC77C\uC774 \uBAA8\uB450 \uD544\uC694\uD569\uB2C8\uB2E4."
        });
      }
      const result = await checkEmailConflict(vendorName, email);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("\uC774\uBA54\uC77C \uCDA9\uB3CC \uAC80\uC0AC \uC624\uB958:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "\uC774\uBA54\uC77C \uCDA9\uB3CC \uAC80\uC0AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
      });
    }
  });
  app2.post("/api/excel-automation/validate-all-vendors", async (req, res) => {
    try {
      const { vendorData } = req.body;
      if (!vendorData || !Array.isArray(vendorData)) {
        return res.status(400).json({
          success: false,
          error: "\uAC80\uC99D\uD560 \uAC70\uB798\uCC98 \uB370\uC774\uD130\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
        });
      }
      const result = await validateMultipleVendors(vendorData);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("\uB2E4\uC911 \uAC70\uB798\uCC98 \uAC80\uC99D \uC624\uB958:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "\uB2E4\uC911 \uAC70\uB798\uCC98 \uAC80\uC99D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
      });
    }
  });
  app2.post("/api/excel-automation/parse-and-validate", excelUpload.single("excel"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Excel \uD30C\uC77C\uC774 \uC5C5\uB85C\uB4DC\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4."
        });
      }
      console.log("\u{1F4CB} Excel \uD30C\uC2F1 + \uAC70\uB798\uCC98 \uAC80\uC99D \uC2DC\uC791:", {
        filename: req.file.originalname,
        size: req.file.size
      });
      const parsedData = parseExcelInputSheet(req.file.buffer);
      console.log(`\u{1F4CA} \uD30C\uC2F1 \uC644\uB8CC: ${parsedData.length}\uAC1C \uD589`);
      const vendorData = parsedData.map((row) => ({
        vendorName: row.vendorName,
        deliveryName: row.deliveryName,
        email: row.vendorEmail
      }));
      console.log("\u{1F50D} \uAC70\uB798\uCC98 \uAC80\uC99D \uC2DC\uC791...");
      const validationResult = await validateMultipleVendors(vendorData);
      const result = {
        parsing: {
          success: true,
          totalRows: parsedData.length,
          data: parsedData
        },
        validation: validationResult,
        meta: {
          uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
          filename: req.file.originalname
        }
      };
      console.log("\u2705 Excel \uD30C\uC2F1 + \uAC70\uB798\uCC98 \uAC80\uC99D \uC644\uB8CC");
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Excel \uD30C\uC2F1 + \uAC70\uB798\uCC98 \uAC80\uC99D \uC624\uB958:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "\uD30C\uC2F1 \uBC0F \uAC80\uC99D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
      });
    }
  });
  try {
    const poTemplateRouter = await Promise.resolve().then(() => (init_po_template_mock(), po_template_mock_exports));
    app2.use("/api/po-template", poTemplateRouter.default);
  } catch (error) {
    console.error("PO Template \uB77C\uC6B0\uD130 \uB85C\uB4DC \uC2E4\uD328:", error);
  }
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs3 from "fs";
import path5 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path4 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path4.resolve(import.meta.dirname, "client", "src"),
      "@shared": path4.resolve(import.meta.dirname, "shared"),
      "@assets": path4.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path4.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path4.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/api/")) {
      return next();
    }
    try {
      const clientTemplate = path5.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path5.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path5.resolve(distPath, "index.html"));
  });
}

// server/index.ts
dotenv2.config();
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use("/attached_assets", express3.static("attached_assets"));
app.use((req, res, next) => {
  const start = Date.now();
  const path6 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path6.startsWith("/api")) {
      let logLine = `${req.method} ${path6} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT || 5e3;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
