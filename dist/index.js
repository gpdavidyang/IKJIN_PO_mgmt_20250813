var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  approvalAuthorities: () => approvalAuthorities,
  approvalWorkflowSettings: () => approvalWorkflowSettings,
  attachments: () => attachments,
  attachmentsRelations: () => attachmentsRelations,
  companies: () => companies,
  emailSendHistory: () => emailSendHistory,
  emailSendHistoryRelations: () => emailSendHistoryRelations,
  handsontableConfigs: () => handsontableConfigs,
  handsontableConfigsRelations: () => handsontableConfigsRelations,
  insertApprovalAuthoritySchema: () => insertApprovalAuthoritySchema,
  insertApprovalWorkflowSettingsSchema: () => insertApprovalWorkflowSettingsSchema,
  insertAttachmentSchema: () => insertAttachmentSchema,
  insertCompanySchema: () => insertCompanySchema,
  insertEmailSendHistorySchema: () => insertEmailSendHistorySchema,
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
  projectTypeEnum: () => projectTypeEnum,
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
  date,
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
var sessions, uiTerms, itemCategories, userRoleEnum, purchaseOrderStatusEnum, projectStatusEnum, projectTypeEnum, invoiceStatusEnum, itemReceiptStatusEnum, verificationActionEnum, approvalAuthorities, users, companies, vendors, items, terminology, projects, projectMembers, projectHistory, orderTemplates, templateFields, handsontableConfigs, templateVersions, purchaseOrders, purchaseOrderItems, attachments, orderHistory, emailSendHistory, invoices, itemReceipts, verificationLogs, usersRelations, vendorsRelations, itemsRelations, projectsRelations, projectMembersRelations, projectHistoryRelations, orderTemplatesRelations, purchaseOrdersRelations, purchaseOrderItemsRelations, attachmentsRelations, orderHistoryRelations, invoicesRelations, itemReceiptsRelations, verificationLogsRelations, templateFieldsRelations, handsontableConfigsRelations, templateVersionsRelations, itemCategoriesRelations, emailSendHistoryRelations, insertCompanySchema, insertVendorSchema, insertItemSchema, insertProjectSchema, insertOrderTemplateSchema, insertItemCategorySchema, insertPurchaseOrderSchema, insertPurchaseOrderItemSchema, insertAttachmentSchema, insertOrderHistorySchema, insertInvoiceSchema, insertItemReceiptSchema, insertVerificationLogSchema, insertEmailSendHistorySchema, insertTemplateFieldSchema, insertHandsontableConfigSchema, insertTemplateVersionSchema, insertProjectMemberSchema, insertProjectHistorySchema, insertUiTermSchema, insertTerminologySchema, insertUITermSchema, insertApprovalAuthoritySchema, approvalWorkflowSettings, insertApprovalWorkflowSettingsSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    sessions = pgTable(
      "sessions",
      {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => [index("IDX_session_expire").on(table.expire)]
    );
    uiTerms = pgTable("ui_terms", {
      id: serial("id").primaryKey(),
      termKey: varchar("term_key", { length: 100 }).notNull().unique(),
      termValue: varchar("term_value", { length: 255 }).notNull(),
      category: varchar("category", { length: 50 }).default("general"),
      description: text("description"),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    itemCategories = pgTable("item_categories", {
      id: serial("id").primaryKey(),
      categoryType: varchar("category_type", { length: 20 }).notNull(),
      // 'major', 'middle', 'minor'
      categoryName: varchar("category_name", { length: 100 }).notNull(),
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
    userRoleEnum = pgEnum("user_role", ["field_worker", "project_manager", "hq_management", "executive", "admin"]);
    purchaseOrderStatusEnum = pgEnum("purchase_order_status", ["draft", "pending", "approved", "sent", "completed"]);
    projectStatusEnum = pgEnum("project_status", ["planning", "active", "on_hold", "completed", "cancelled"]);
    projectTypeEnum = pgEnum("project_type", ["commercial", "residential", "industrial", "infrastructure"]);
    invoiceStatusEnum = pgEnum("invoice_status", ["pending", "verified", "paid"]);
    itemReceiptStatusEnum = pgEnum("item_receipt_status", ["pending", "approved", "rejected"]);
    verificationActionEnum = pgEnum("verification_action", ["invoice_uploaded", "item_verified", "quality_checked"]);
    approvalAuthorities = pgTable("approval_authorities", {
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
    users = pgTable("users", {
      id: varchar("id").primaryKey().notNull(),
      email: varchar("email").unique().notNull(),
      name: varchar("name").notNull(),
      password: varchar("hashed_password").notNull(),
      // Match actual database column name
      phoneNumber: varchar("phone_number"),
      profileImageUrl: varchar("profile_image_url"),
      role: userRoleEnum("role").notNull().default("field_worker"),
      position: varchar("position"),
      // Add position field that exists in DB
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      index("idx_users_email").on(table.email),
      index("idx_users_role").on(table.role)
    ]);
    companies = pgTable("companies", {
      id: serial("id").primaryKey(),
      companyName: varchar("company_name", { length: 255 }).notNull(),
      businessNumber: varchar("business_number", { length: 50 }),
      address: text("address"),
      contactPerson: varchar("contact_person", { length: 100 }),
      // Match actual DB schema
      phone: varchar("phone", { length: 50 }),
      email: varchar("email", { length: 255 }),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    vendors = pgTable("vendors", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      vendorCode: varchar("vendor_code", { length: 50 }),
      // 거래처 코드
      aliases: jsonb("aliases").default([]).$type(),
      // 별칭 필드 추가 - 예: ["(주)익진", "주식회사 익진", "익진"]
      businessNumber: varchar("business_number", { length: 50 }),
      contactPerson: varchar("contact_person", { length: 100 }).notNull(),
      email: varchar("email", { length: 255 }).notNull(),
      phone: varchar("phone", { length: 50 }),
      address: text("address"),
      businessType: varchar("business_type", { length: 100 }),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      index("idx_vendors_name").on(table.name),
      index("idx_vendors_business_number").on(table.businessNumber),
      index("idx_vendors_email").on(table.email),
      index("idx_vendors_active").on(table.isActive)
    ]);
    items = pgTable("items", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      specification: text("specification"),
      unit: varchar("unit", { length: 50 }).notNull(),
      unitPrice: decimal("unit_price", { precision: 15, scale: 2 }),
      category: varchar("category", { length: 100 }),
      majorCategory: varchar("major_category", { length: 100 }),
      middleCategory: varchar("middle_category", { length: 100 }),
      minorCategory: varchar("minor_category", { length: 100 }),
      description: text("description"),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      index("idx_items_name").on(table.name),
      index("idx_items_category").on(table.category),
      index("idx_items_active").on(table.isActive)
    ]);
    terminology = pgTable("terminology", {
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
    projects = pgTable("projects", {
      id: serial("id").primaryKey(),
      projectName: varchar("project_name", { length: 255 }).notNull(),
      projectCode: varchar("project_code", { length: 100 }).notNull().unique(),
      clientName: varchar("client_name", { length: 255 }),
      projectType: projectTypeEnum("project_type").notNull().default("commercial"),
      location: text("location"),
      startDate: date("start_date"),
      endDate: date("end_date"),
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
    projectMembers = pgTable("project_members", {
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
    projectHistory = pgTable("project_history", {
      id: serial("id").primaryKey(),
      projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
      fieldName: varchar("field_name", { length: 100 }).notNull(),
      oldValue: text("old_value"),
      newValue: text("new_value"),
      changedBy: varchar("changed_by").references(() => users.id).notNull(),
      changedAt: timestamp("changed_at").defaultNow(),
      changeReason: text("change_reason")
    });
    orderTemplates = pgTable("order_templates", {
      id: serial("id").primaryKey(),
      templateName: varchar("template_name", { length: 100 }).notNull(),
      templateType: varchar("template_type", { length: 50 }).notNull(),
      // material_extrusion, panel_manufacturing, general, handsontable
      // fieldsConfig: jsonb("fields_config").notNull(), // TODO: Add this column to database
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    templateFields = pgTable("template_fields", {
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
    handsontableConfigs = pgTable("handsontable_configs", {
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
    templateVersions = pgTable("template_versions", {
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
    purchaseOrders = pgTable("purchase_orders", {
      id: serial("id").primaryKey(),
      orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
      projectId: integer("project_id").references(() => projects.id).notNull(),
      vendorId: integer("vendor_id").references(() => vendors.id),
      userId: varchar("user_id").references(() => users.id).notNull(),
      templateId: integer("template_id").references(() => orderTemplates.id),
      orderDate: date("order_date").notNull(),
      deliveryDate: date("delivery_date"),
      status: purchaseOrderStatusEnum("status").notNull().default("pending"),
      totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0").$type(),
      notes: text("notes"),
      // customFields: jsonb("custom_fields"), // TODO: Add this column to database
      isApproved: boolean("is_approved").default(false),
      approvedBy: varchar("approved_by").references(() => users.id),
      approvedAt: timestamp("approved_at"),
      // sentAt: timestamp("sent_at"), // TODO: Add this column to database
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
    purchaseOrderItems = pgTable("purchase_order_items", {
      id: serial("id").primaryKey(),
      orderId: integer("order_id").references(() => purchaseOrders.id).notNull(),
      // itemId: integer("item_id").references(() => items.id), // TODO: Add this column to database
      itemName: varchar("item_name", { length: 255 }).notNull(),
      specification: text("specification"),
      unit: varchar("unit", { length: 50 }),
      // 실제 DB에 있는 컬럼, NULL 허용
      quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().$type(),
      unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull().$type(),
      totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().$type(),
      // 품목 계층 구조 필드 (2025-08-05 추가)
      majorCategory: varchar("major_category", { length: 100 }),
      middleCategory: varchar("middle_category", { length: 100 }),
      minorCategory: varchar("minor_category", { length: 100 }),
      // PO Template Input 시트를 위한 새로운 필드들 (TODO: Add these columns to database)
      // categoryLv1: varchar("category_lv1", { length: 100 }), // 대분류
      // categoryLv2: varchar("category_lv2", { length: 100 }), // 중분류  
      // categoryLv3: varchar("category_lv3", { length: 100 }), // 소분류
      // supplyAmount: decimal("supply_amount", { precision: 15, scale: 2 }).default("0").notNull().$type<number>(), // TODO: Add to DB
      // taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0").notNull().$type<number>(), // TODO: Add to DB  
      // deliveryName: varchar("delivery_name", { length: 255 }), // TODO: Add to DB
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => [
      index("idx_poi_major_category").on(table.majorCategory),
      index("idx_poi_middle_category").on(table.middleCategory),
      index("idx_poi_minor_category").on(table.minorCategory),
      index("idx_poi_category_hierarchy").on(table.majorCategory, table.middleCategory, table.minorCategory)
      // index("idx_purchase_order_items_category_lv1").on(table.categoryLv1), // TODO: Add when column is added
      // index("idx_purchase_order_items_category_lv2").on(table.categoryLv2), // TODO: Add when column is added
      // index("idx_purchase_order_items_category_lv3").on(table.categoryLv3), // TODO: Add when column is added
    ]);
    attachments = pgTable("attachments", {
      id: serial("id").primaryKey(),
      orderId: integer("order_id").references(() => purchaseOrders.id).notNull(),
      originalName: varchar("original_name", { length: 255 }).notNull(),
      storedName: varchar("stored_name", { length: 255 }).notNull(),
      filePath: varchar("file_path", { length: 500 }).notNull(),
      fileSize: integer("file_size"),
      mimeType: varchar("mime_type", { length: 100 }),
      uploadedBy: varchar("uploaded_by", { length: 50 }),
      uploadedAt: timestamp("uploaded_at").defaultNow()
    });
    orderHistory = pgTable("order_history", {
      id: serial("id").primaryKey(),
      orderId: integer("order_id").references(() => purchaseOrders.id).notNull(),
      userId: varchar("user_id").references(() => users.id).notNull(),
      action: varchar("action", { length: 100 }).notNull(),
      // created, updated, approved, sent, etc.
      changes: jsonb("changes"),
      // Store what changed
      createdAt: timestamp("created_at").defaultNow()
    });
    emailSendHistory = pgTable("email_send_history", {
      id: serial("id").primaryKey(),
      orderId: integer("order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
      sentAt: timestamp("sent_at").defaultNow().notNull(),
      sentBy: varchar("sent_by", { length: 255 }).notNull().references(() => users.id),
      recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
      recipientName: varchar("recipient_name", { length: 255 }),
      ccEmails: text("cc_emails"),
      // JSON array of CC emails
      subject: text("subject").notNull(),
      body: text("body").notNull(),
      attachments: jsonb("attachments").$type(),
      status: varchar("status", { length: 50 }).notNull().default("sent"),
      // sent, failed, bounced, opened, clicked
      errorMessage: text("error_message"),
      openedAt: timestamp("opened_at"),
      clickedAt: timestamp("clicked_at"),
      ipAddress: varchar("ip_address", { length: 50 }),
      userAgent: text("user_agent"),
      trackingId: varchar("tracking_id", { length: 100 }).unique(),
      emailProvider: varchar("email_provider", { length: 50 }).default("naver"),
      // naver, gmail, etc.
      messageId: varchar("message_id", { length: 255 }),
      // Email message ID for tracking
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => [
      index("idx_email_history_order").on(table.orderId),
      index("idx_email_history_sent_by").on(table.sentBy),
      index("idx_email_history_recipient").on(table.recipientEmail),
      index("idx_email_history_tracking").on(table.trackingId),
      index("idx_email_history_status").on(table.status),
      index("idx_email_history_sent_at").on(table.sentAt)
    ]);
    invoices = pgTable("invoices", {
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
    itemReceipts = pgTable("item_receipts", {
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
    verificationLogs = pgTable("verification_logs", {
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
    usersRelations = relations(users, ({ many }) => ({
      purchaseOrders: many(purchaseOrders),
      orderHistory: many(orderHistory),
      emailsSent: many(emailSendHistory)
    }));
    vendorsRelations = relations(vendors, ({ many }) => ({
      purchaseOrders: many(purchaseOrders)
    }));
    itemsRelations = relations(items, ({ many }) => ({
      purchaseOrderItems: many(purchaseOrderItems)
    }));
    projectsRelations = relations(projects, ({ one, many }) => ({
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
    projectMembersRelations = relations(projectMembers, ({ one }) => ({
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
    projectHistoryRelations = relations(projectHistory, ({ one }) => ({
      project: one(projects, {
        fields: [projectHistory.projectId],
        references: [projects.id]
      }),
      changedByUser: one(users, {
        fields: [projectHistory.changedBy],
        references: [users.id]
      })
    }));
    orderTemplatesRelations = relations(orderTemplates, ({ many }) => ({
      fields: many(templateFields),
      handsontableConfig: many(handsontableConfigs),
      versions: many(templateVersions),
      orders: many(purchaseOrders)
    }));
    purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
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
      verificationLogs: many(verificationLogs),
      emailHistory: many(emailSendHistory)
    }));
    purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one, many }) => ({
      order: one(purchaseOrders, {
        fields: [purchaseOrderItems.orderId],
        references: [purchaseOrders.id]
      }),
      receipts: many(itemReceipts)
    }));
    attachmentsRelations = relations(attachments, ({ one }) => ({
      order: one(purchaseOrders, {
        fields: [attachments.orderId],
        references: [purchaseOrders.id]
      })
    }));
    orderHistoryRelations = relations(orderHistory, ({ one }) => ({
      order: one(purchaseOrders, {
        fields: [orderHistory.orderId],
        references: [purchaseOrders.id]
      }),
      user: one(users, {
        fields: [orderHistory.userId],
        references: [users.id]
      })
    }));
    invoicesRelations = relations(invoices, ({ one, many }) => ({
      order: one(purchaseOrders, {
        fields: [invoices.orderId],
        references: [purchaseOrders.id]
      }),
      receipts: many(itemReceipts),
      verificationLogs: many(verificationLogs)
    }));
    itemReceiptsRelations = relations(itemReceipts, ({ one, many }) => ({
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
    verificationLogsRelations = relations(verificationLogs, ({ one }) => ({
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
    templateFieldsRelations = relations(templateFields, ({ one }) => ({
      template: one(orderTemplates, {
        fields: [templateFields.templateId],
        references: [orderTemplates.id]
      })
    }));
    handsontableConfigsRelations = relations(handsontableConfigs, ({ one }) => ({
      template: one(orderTemplates, {
        fields: [handsontableConfigs.templateId],
        references: [orderTemplates.id]
      })
    }));
    templateVersionsRelations = relations(templateVersions, ({ one }) => ({
      template: one(orderTemplates, {
        fields: [templateVersions.templateId],
        references: [orderTemplates.id]
      })
    }));
    itemCategoriesRelations = relations(itemCategories, ({ one, many }) => ({
      parent: one(itemCategories, {
        fields: [itemCategories.parentId],
        references: [itemCategories.id]
      }),
      children: many(itemCategories)
    }));
    emailSendHistoryRelations = relations(emailSendHistory, ({ one }) => ({
      order: one(purchaseOrders, {
        fields: [emailSendHistory.orderId],
        references: [purchaseOrders.id]
      }),
      sentByUser: one(users, {
        fields: [emailSendHistory.sentBy],
        references: [users.id]
      })
    }));
    insertCompanySchema = createInsertSchema(companies).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertVendorSchema = createInsertSchema(vendors).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertItemSchema = createInsertSchema(items).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertProjectSchema = createInsertSchema(projects).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertOrderTemplateSchema = createInsertSchema(orderTemplates).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertItemCategorySchema = createInsertSchema(itemCategories).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      orderNumber: true,
      userId: true,
      isApproved: true,
      approvedBy: true,
      approvedAt: true
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
    insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
      id: true,
      createdAt: true
    }).extend({
      supplyAmount: z.number().nonnegative().optional(),
      taxAmount: z.number().nonnegative().optional()
    });
    insertAttachmentSchema = createInsertSchema(attachments).omit({
      id: true,
      uploadedAt: true
    });
    insertOrderHistorySchema = createInsertSchema(orderHistory).omit({
      id: true,
      createdAt: true
    });
    insertInvoiceSchema = createInsertSchema(invoices).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      totalAmount: z.union([z.string(), z.number()]).transform((val) => String(val)),
      vatAmount: z.union([z.string(), z.number()]).transform((val) => String(val))
    });
    insertItemReceiptSchema = createInsertSchema(itemReceipts).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      receivedQuantity: z.union([z.string(), z.number()]).transform((val) => Number(val)),
      receivedDate: z.union([z.string(), z.date()]).transform((val) => new Date(val))
    });
    insertVerificationLogSchema = createInsertSchema(verificationLogs).omit({
      id: true,
      createdAt: true
    });
    insertEmailSendHistorySchema = createInsertSchema(emailSendHistory).omit({
      id: true,
      sentAt: true,
      createdAt: true
    }).extend({
      ccEmails: z.string().nullable().optional(),
      attachments: z.array(z.object({
        filename: z.string(),
        path: z.string(),
        size: z.number()
      })).nullable().optional()
    });
    insertTemplateFieldSchema = createInsertSchema(templateFields).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertHandsontableConfigSchema = createInsertSchema(handsontableConfigs).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertTemplateVersionSchema = createInsertSchema(templateVersions).omit({
      id: true,
      createdAt: true
    });
    insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertProjectHistorySchema = createInsertSchema(projectHistory).omit({
      id: true,
      changedAt: true
    });
    insertUiTermSchema = createInsertSchema(uiTerms);
    insertTerminologySchema = createInsertSchema(terminology).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertUITermSchema = createInsertSchema(uiTerms).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertApprovalAuthoritySchema = createInsertSchema(approvalAuthorities).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    approvalWorkflowSettings = pgTable("approval_workflow_settings", {
      id: serial("id").primaryKey(),
      companyId: integer("company_id").references(() => companies.id),
      approvalMode: varchar("approval_mode", { length: 20 }).notNull().default("staged"),
      // 'direct' or 'staged'
      directApprovalRoles: jsonb("direct_approval_roles").default([]).$type(),
      // roles that can approve directly
      stagedApprovalThresholds: jsonb("staged_approval_thresholds").default({}).$type(),
      requireAllStages: boolean("require_all_stages").default(true),
      // whether all stages must approve
      skipLowerStages: boolean("skip_lower_stages").default(false),
      // whether higher roles can skip lower stages
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()),
      createdBy: varchar("created_by", { length: 255 }).references(() => users.id)
    }, (table) => ({
      companyIdx: index("idx_approval_workflow_company").on(table.companyId),
      activeIdx: index("idx_approval_workflow_active").on(table.isActive)
    }));
    insertApprovalWorkflowSettingsSchema = createInsertSchema(approvalWorkflowSettings).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db
});
import dotenv from "dotenv";
import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var DATABASE_URL, Pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    dotenv.config();
    DATABASE_URL = process.env.DATABASE_URL;
    console.log("\u{1F50D} Using DATABASE_URL:", DATABASE_URL?.split("@")[0] + "@[HIDDEN]");
    ({ Pool } = pkg);
    db = null;
    if (!DATABASE_URL) {
      console.error("\u274C DATABASE_URL not set - cannot connect to database");
      process.exit(1);
    } else {
      try {
        console.log("\u{1F504} Creating PostgreSQL connection pool with URL:", DATABASE_URL?.split("@")[0] + "@[HIDDEN]");
        const pool = new Pool({
          connectionString: DATABASE_URL,
          ssl: { rejectUnauthorized: false },
          // Supabase requires SSL
          max: 20,
          // Connection pool size
          idleTimeoutMillis: 3e4,
          connectionTimeoutMillis: 1e4
        });
        db = drizzle(pool, { schema: schema_exports });
        console.log("\u2705 Database connected successfully (PostgreSQL pool)");
      } catch (error) {
        console.error("\u274C Database connection failed:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }
  }
});

// server/index.ts
import dotenv2 from "dotenv";
import express3 from "express";

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
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
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === "development",
    rollupOptions: {
      output: {
        // Simple file naming without manual chunking
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]"
      },
      // Ensure React is treated as external dependency properly
      external: []
    },
    // Optimize bundle size
    minify: "esbuild",
    target: "es2020",
    cssCodeSplit: true,
    reportCompressedSize: false,
    // Disable to speed up build
    chunkSizeWarningLimit: 1e3
    // Increase limit since we're not chunking
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react-hook-form",
      "@tanstack/react-query",
      "@tanstack/react-table",
      "wouter",
      "zod",
      "clsx",
      "tailwind-merge",
      "recharts",
      "lucide-react"
    ],
    exclude: [
      // Large dependencies that should be loaded dynamically
      "@replit/vite-plugin-cartographer"
    ],
    // Force React to be included in pre-bundling
    force: true
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
    hmr: { server }
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
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
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
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import { createServer } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

// server/routes/index.ts
import { Router as Router15 } from "express";

// server/routes/auth.ts
import { Router } from "express";

// server/storage.ts
init_schema();
init_db();
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
    let query = db.select({
      id: items.id,
      name: items.name,
      specification: items.specification,
      unit: items.unit,
      unitPrice: items.unitPrice,
      category: items.category,
      majorCategory: items.majorCategory,
      middleCategory: items.middleCategory,
      minorCategory: items.minorCategory,
      description: items.description,
      isActive: items.isActive,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt
    }).from(items);
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
    const [item] = await db.select({
      id: items.id,
      name: items.name,
      specification: items.specification,
      unit: items.unit,
      unitPrice: items.unitPrice,
      category: items.category,
      majorCategory: items.majorCategory,
      middleCategory: items.middleCategory,
      minorCategory: items.minorCategory,
      description: items.description,
      isActive: items.isActive,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt
    }).from(items).where(eq(items.id, id));
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
    const { userId, status, vendorId, templateId, projectId, startDate, endDate, minAmount, maxAmount, searchText, majorCategory, middleCategory, minorCategory, page = 1, limit = 50 } = filters;
    let whereConditions = [];
    if (userId && userId !== "all") {
      whereConditions.push(eq(purchaseOrders.userId, userId));
    }
    if (status && status !== "all" && status !== "") {
      whereConditions.push(sql2`${purchaseOrders.status} = ${status}`);
    }
    if (vendorId && vendorId !== "all") {
      whereConditions.push(eq(purchaseOrders.vendorId, vendorId));
    }
    if (templateId && templateId !== "all") {
      whereConditions.push(eq(purchaseOrders.templateId, templateId));
    }
    if (projectId && projectId !== "all") {
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
    if (majorCategory || middleCategory || minorCategory) {
      const categoryConditions = [];
      if (majorCategory) {
        categoryConditions.push(eq(purchaseOrderItems.majorCategory, majorCategory));
      }
      if (middleCategory) {
        categoryConditions.push(eq(purchaseOrderItems.middleCategory, middleCategory));
      }
      if (minorCategory) {
        categoryConditions.push(eq(purchaseOrderItems.minorCategory, minorCategory));
      }
      const matchingItems = await db.select({ orderId: purchaseOrderItems.orderId }).from(purchaseOrderItems).where(and(...categoryConditions)).groupBy(purchaseOrderItems.orderId);
      const matchingOrderIds = new Set(matchingItems.map((item) => item.orderId));
      filteredOrders = filteredOrders.filter((orderRow) => {
        return matchingOrderIds.has(orderRow.purchase_orders.id);
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
    const items3 = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, id));
    console.log("Debug: Items found:", items3);
    const orderAttachments = await db.select({
      id: attachments.id,
      orderId: attachments.orderId,
      originalName: attachments.originalName,
      storedName: attachments.storedName,
      filePath: attachments.filePath,
      fileSize: attachments.fileSize,
      mimeType: attachments.mimeType,
      uploadedBy: attachments.uploadedBy,
      uploadedAt: attachments.uploadedAt
    }).from(attachments).where(eq(attachments.orderId, id));
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
    const [attachment] = await db.select({
      id: attachments.id,
      orderId: attachments.orderId,
      originalName: attachments.originalName,
      storedName: attachments.storedName,
      filePath: attachments.filePath,
      fileSize: attachments.fileSize,
      mimeType: attachments.mimeType,
      uploadedBy: attachments.uploadedBy,
      uploadedAt: attachments.uploadedAt
    }).from(attachments).where(eq(attachments.id, id));
    return attachment || void 0;
  }
  async getOrderAttachments(orderId) {
    return await db.select({
      id: attachments.id,
      orderId: attachments.orderId,
      originalName: attachments.originalName,
      storedName: attachments.storedName,
      filePath: attachments.filePath,
      fileSize: attachments.fileSize,
      mimeType: attachments.mimeType,
      uploadedBy: attachments.uploadedBy,
      uploadedAt: attachments.uploadedAt
    }).from(attachments).where(eq(attachments.orderId, orderId));
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
    try {
      if (category) {
        return await db.select().from(uiTerms).where(and(eq(uiTerms.category, category), eq(uiTerms.isActive, true))).orderBy(asc(uiTerms.termKey));
      }
      return await db.select().from(uiTerms).where(eq(uiTerms.isActive, true)).orderBy(asc(uiTerms.termKey));
    } catch (error) {
      console.error("Database error in getUiTerms:", error);
      return [];
    }
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
        notInArray(purchaseOrders.status, ["completed"])
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
  // Missing methods for API endpoints
  async getActiveProjects() {
    try {
      return await db.select().from(projects).where(and(
        eq(projects.isActive, true),
        eq(projects.status, "active")
      )).orderBy(projects.projectName);
    } catch (error) {
      console.error("Error getting active projects:", error);
      throw error;
    }
  }
  async getMajorCategories() {
    try {
      return await this.getItemCategoriesByType("major");
    } catch (error) {
      console.error("Error getting major categories:", error);
      throw error;
    }
  }
  async getMiddleCategories(majorId) {
    try {
      return await this.getItemCategoriesByType("middle", majorId);
    } catch (error) {
      console.error("Error getting middle categories:", error);
      throw error;
    }
  }
  async getMinorCategories(middleId) {
    try {
      return await this.getItemCategoriesByType("minor", middleId);
    } catch (error) {
      console.error("Error getting minor categories:", error);
      throw error;
    }
  }
  async getPositions() {
    try {
      return [
        { id: 1, name: "\uD604\uC7A5\uC18C\uC7A5", code: "site_manager", level: 1 },
        { id: 2, name: "\uD604\uC7A5\uB300\uB9AC", code: "site_deputy", level: 2 },
        { id: 3, name: "\uD604\uC7A5\uD300\uC7A5", code: "site_team_leader", level: 3 },
        { id: 4, name: "\uD604\uC7A5\uAE30\uC0AC", code: "site_engineer", level: 4 },
        { id: 5, name: "\uD604\uC7A5\uAE30\uB2A5\uACF5", code: "site_worker", level: 5 }
      ];
    } catch (error) {
      console.error("Error getting positions:", error);
      throw error;
    }
  }
  // Item hierarchy methods for filters
  async getDistinctMajorCategories() {
    try {
      const result = await db.selectDistinct({ majorCategory: purchaseOrderItems.majorCategory }).from(purchaseOrderItems).where(isNotNull(purchaseOrderItems.majorCategory)).orderBy(purchaseOrderItems.majorCategory);
      return result.map((row) => row.majorCategory).filter((cat) => cat !== null && cat !== "");
    } catch (error) {
      console.error("Error getting distinct major categories:", error);
      throw error;
    }
  }
  async getDistinctMiddleCategories(majorCategory) {
    try {
      let query = db.selectDistinct({ middleCategory: purchaseOrderItems.middleCategory }).from(purchaseOrderItems).where(isNotNull(purchaseOrderItems.middleCategory));
      if (majorCategory) {
        query = query.where(eq(purchaseOrderItems.majorCategory, majorCategory));
      }
      const result = await query.orderBy(purchaseOrderItems.middleCategory);
      return result.map((row) => row.middleCategory).filter((cat) => cat !== null && cat !== "");
    } catch (error) {
      console.error("Error getting distinct middle categories:", error);
      throw error;
    }
  }
  async getDistinctMinorCategories(majorCategory, middleCategory) {
    try {
      let conditions = [isNotNull(purchaseOrderItems.minorCategory)];
      if (majorCategory) {
        conditions.push(eq(purchaseOrderItems.majorCategory, majorCategory));
      }
      if (middleCategory) {
        conditions.push(eq(purchaseOrderItems.middleCategory, middleCategory));
      }
      const result = await db.selectDistinct({ minorCategory: purchaseOrderItems.minorCategory }).from(purchaseOrderItems).where(and(...conditions)).orderBy(purchaseOrderItems.minorCategory);
      return result.map((row) => row.minorCategory).filter((cat) => cat !== null && cat !== "");
    } catch (error) {
      console.error("Error getting distinct minor categories:", error);
      throw error;
    }
  }
  // Category statistics
  async getCategoryOrderStats(userId) {
    try {
      const whereClause = userId ? eq(purchaseOrders.userId, userId) : void 0;
      const results = await db.select({
        majorCategory: purchaseOrderItems.majorCategory,
        middleCategory: purchaseOrderItems.middleCategory,
        minorCategory: purchaseOrderItems.minorCategory,
        orderCount: count(purchaseOrderItems.id).as("orderCount"),
        totalAmount: sum(purchaseOrderItems.totalAmount).as("totalAmount")
      }).from(purchaseOrderItems).innerJoin(purchaseOrders, eq(purchaseOrderItems.orderId, purchaseOrders.id)).where(whereClause).groupBy(
        purchaseOrderItems.majorCategory,
        purchaseOrderItems.middleCategory,
        purchaseOrderItems.minorCategory
      ).orderBy(
        purchaseOrderItems.majorCategory,
        purchaseOrderItems.middleCategory,
        purchaseOrderItems.minorCategory
      );
      return results.map((row) => ({
        majorCategory: row.majorCategory || "\uBBF8\uBD84\uB958",
        middleCategory: row.middleCategory || "\uBBF8\uBD84\uB958",
        minorCategory: row.minorCategory || "\uBBF8\uBD84\uB958",
        orderCount: Number(row.orderCount) || 0,
        totalAmount: Number(row.totalAmount) || 0
      }));
    } catch (error) {
      console.error("Error getting category order stats:", error);
      return [];
    }
  }
};
var storage = new DatabaseStorage();

// server/auth-utils.ts
import bcrypt from "bcrypt";
async function comparePasswords(supplied, stored) {
  try {
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

// server/local-auth.ts
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }
    const isValidPassword = await comparePasswords(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
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
      res.json({
        message: "Login successful",
        user: userWithoutPassword
      });
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
    if (process.env.NODE_ENV === "development") {
      console.log("\u{1F7E1} \uAC1C\uBC1C \uD658\uACBD - \uC784\uC2DC \uC0AC\uC6A9\uC790\uB85C \uC778\uC99D \uC6B0\uD68C");
      const defaultUser = await storage.getUsers();
      if (defaultUser.length > 0) {
        req.user = defaultUser[0];
        console.log("\u{1F7E1} \uC784\uC2DC \uC0AC\uC6A9\uC790 \uC124\uC815:", req.user.id);
        return next();
      }
    }
    const authSession = req.session;
    if (!authSession.userId) {
      console.log("\u{1F534} \uC778\uC99D \uC2E4\uD328 - userId \uC5C6\uC74C");
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await storage.getUser(authSession.userId);
    if (!user) {
      authSession.userId = void 0;
      console.log("\u{1F534} \uC778\uC99D \uC2E4\uD328 - \uC0AC\uC6A9\uC790 \uC5C6\uC74C:", authSession.userId);
      return res.status(401).json({ message: "Invalid session" });
    }
    req.user = user;
    console.log("\u{1F7E2} \uC778\uC99D \uC131\uACF5:", req.user.id);
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

// server/routes/auth.ts
var router = Router();
router.post("/auth/login", login);
router.post("/auth/logout", logout);
router.get("/logout", logout);
router.get("/auth/user", getCurrentUser);
router.get("/auth/me", getCurrentUser);
router.get("/auth/permissions/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const permissions = {
      userId: user.id,
      role: user.role,
      permissions: {
        canCreateOrder: true,
        canApproveOrder: ["project_manager", "hq_management", "executive", "admin"].includes(user.role),
        canManageUsers: ["admin"].includes(user.role),
        canManageProjects: ["project_manager", "hq_management", "admin"].includes(user.role),
        canViewReports: ["hq_management", "executive", "admin"].includes(user.role),
        canManageSettings: ["admin"].includes(user.role)
      }
    };
    res.json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ message: "Failed to fetch permissions" });
  }
});
router.get("/users", async (req, res) => {
  try {
    const users2 = await storage.getUsers();
    res.json(users2);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});
router.post("/users", async (req, res) => {
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
router.patch("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const currentUser = await storage.getUser(id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
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
    const currentUser = await storage.getUser(id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
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
var auth_default = router;

// server/routes/projects.ts
import { Router as Router2 } from "express";
init_schema();

// server/utils/optimized-queries.ts
init_db();
init_schema();
import { eq as eq2, desc as desc2, count as count2, sql as sql3, and as and2, isNotNull as isNotNull2 } from "drizzle-orm";

// server/utils/cache.ts
var MemoryCache = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.defaultTTL = 5 * 60 * 1e3;
  }
  // 5 minutes default TTL
  /**
   * Set cache entry with TTL
   */
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  /**
   * Get cache entry if not expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  /**
   * Delete cache entry
   */
  delete(key) {
    this.cache.delete(key);
  }
  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }
  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
};
var cache = new MemoryCache();
var CacheTTL = {
  SHORT: 1 * 60 * 1e3,
  // 1 minute
  MEDIUM: 5 * 60 * 1e3,
  // 5 minutes
  LONG: 30 * 60 * 1e3,
  // 30 minutes
  VERY_LONG: 60 * 60 * 1e3
  // 1 hour
};
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1e3);

// server/utils/optimized-queries.ts
var OptimizedOrderQueries = class {
  /**
   * Get orders with comprehensive details and filtering
   */
  static async getOrdersWithDetails(filters = {}) {
    const cacheKey = `orders_details_${JSON.stringify(filters)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    try {
      let query = db.select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        orderDate: purchaseOrders.orderDate,
        deliveryDate: purchaseOrders.deliveryDate,
        projectName: projects.projectName,
        vendorName: vendors.name,
        userName: users.name,
        approvalLevel: purchaseOrders.approvalLevel,
        currentApproverRole: purchaseOrders.currentApproverRole
      }).from(purchaseOrders).leftJoin(projects, eq2(purchaseOrders.projectId, projects.id)).leftJoin(vendors, eq2(purchaseOrders.vendorId, vendors.id)).leftJoin(users, eq2(purchaseOrders.userId, users.id)).orderBy(desc2(purchaseOrders.orderDate));
      const result = await query;
      cache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error("Error fetching orders with details:", error);
      return [];
    }
  }
  /**
   * Get pending approval orders for specific role
   */
  static async getPendingApprovalOrders(role) {
    const cacheKey = `pending_orders_${role}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    try {
      const result = await db.select().from(purchaseOrders).where(
        and2(
          eq2(purchaseOrders.status, "pending"),
          eq2(purchaseOrders.currentApproverRole, role)
        )
      ).orderBy(desc2(purchaseOrders.orderDate));
      cache.set(cacheKey, result, 120);
      return result;
    } catch (error) {
      console.error("Error fetching pending approval orders:", error);
      return [];
    }
  }
  /**
   * Get order statistics summary
   */
  static async getOrderStatistics() {
    const cacheKey = "order_statistics";
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    try {
      const [totalOrders] = await db.select({ count: count2() }).from(purchaseOrders);
      const [pendingOrders] = await db.select({ count: count2() }).from(purchaseOrders).where(eq2(purchaseOrders.status, "pending"));
      const [approvedOrders] = await db.select({ count: count2() }).from(purchaseOrders).where(eq2(purchaseOrders.status, "approved"));
      const result = {
        total: totalOrders.count || 0,
        pending: pendingOrders.count || 0,
        approved: approvedOrders.count || 0
      };
      cache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error("Error fetching order statistics:", error);
      return { total: 0, pending: 0, approved: 0 };
    }
  }
};
var OptimizedDashboardQueries = class {
  /**
   * Get unified dashboard data in single optimized query
   */
  static async getUnifiedDashboardData() {
    const cacheKey = "unified_dashboard_data";
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    try {
      console.log("\u{1F50D} Starting getUnifiedDashboardData query...");
      const orderStatsResult = await db.execute(
        sql3`SELECT 
          COUNT(*) as "totalOrders",
          COALESCE(SUM(total_amount), 0) as "totalAmount"
        FROM purchase_orders`
      );
      console.log("\u{1F4CA} Order stats query result:", orderStatsResult);
      const orderStats = orderStatsResult.rows[0] || { totalOrders: 0, totalAmount: 0 };
      const pendingOrderResult = await db.execute(
        sql3`SELECT COUNT(*) as "pendingOrders" FROM purchase_orders WHERE status = 'pending'`
      );
      const pendingOrderStats = pendingOrderResult.rows[0] || { pendingOrders: 0 };
      const monthlyOrderResult = await db.execute(
        sql3`SELECT COUNT(*) as "monthlyOrders" 
            FROM purchase_orders 
            WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)`
      );
      const monthlyOrderStats = monthlyOrderResult.rows[0] || { monthlyOrders: 0 };
      const projectResult = await db.execute(
        sql3`SELECT COUNT(*) as "activeProjects" FROM projects WHERE is_active = true`
      );
      const projectStats = projectResult.rows[0] || { activeProjects: 0 };
      const vendorResult = await db.execute(
        sql3`SELECT COUNT(*) as "activeVendors" FROM vendors WHERE is_active = true`
      );
      const vendorStats = vendorResult.rows[0] || { activeVendors: 0 };
      const recentOrdersRaw = await db.select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        createdAt: purchaseOrders.createdAt,
        vendorId: vendors.id,
        vendorName: vendors.name,
        projectId: projects.id,
        projectName: projects.projectName
      }).from(purchaseOrders).leftJoin(vendors, eq2(purchaseOrders.vendorId, vendors.id)).leftJoin(projects, eq2(purchaseOrders.projectId, projects.id)).orderBy(desc2(purchaseOrders.createdAt)).limit(10);
      const recentOrders = recentOrdersRaw.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        vendor: order.vendorId ? {
          id: order.vendorId,
          name: order.vendorName
        } : null,
        project: order.projectId ? {
          id: order.projectId,
          name: order.projectName
        } : null
      }));
      const monthlyStatsRaw = await db.select({
        month: sql3`TO_CHAR(${purchaseOrders.orderDate}, 'YYYY-MM')`,
        count: count2(),
        amount: sql3`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`,
        orderDate: sql3`DATE_TRUNC('month', ${purchaseOrders.orderDate})`
        // For proper sorting
      }).from(purchaseOrders).where(sql3`${purchaseOrders.orderDate} >= CURRENT_DATE - INTERVAL '12 months'`).groupBy(sql3`TO_CHAR(${purchaseOrders.orderDate}, 'YYYY-MM')`, sql3`DATE_TRUNC('month', ${purchaseOrders.orderDate})`).orderBy(sql3`DATE_TRUNC('month', ${purchaseOrders.orderDate}) ASC`);
      const monthlyStats = monthlyStatsRaw.map((item) => ({
        month: item.month,
        count: item.count,
        amount: item.amount,
        totalAmount: item.amount
        // Add alias for compatibility
      }));
      const statusStats = await db.select({
        status: purchaseOrders.status,
        count: count2(),
        amount: sql3`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`
      }).from(purchaseOrders).groupBy(purchaseOrders.status).orderBy(desc2(count2()));
      const projectStatsList = await db.select({
        projectId: projects.id,
        projectName: projects.projectName,
        projectType: projects.projectType,
        orderCount: count2(),
        totalAmount: sql3`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`
      }).from(purchaseOrders).leftJoin(projects, eq2(purchaseOrders.projectId, projects.id)).where(isNotNull2(projects.id)).groupBy(projects.id, projects.projectName, projects.projectType).orderBy(desc2(sql3`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`)).limit(10);
      const result = {
        statistics: {
          totalOrders: parseInt(orderStats.totalOrders) || 0,
          totalAmount: Number(orderStats.totalAmount) || 0,
          pendingOrders: parseInt(pendingOrderStats.pendingOrders) || 0,
          monthlyOrders: parseInt(monthlyOrderStats.monthlyOrders) || 0,
          activeProjects: parseInt(projectStats.activeProjects) || 0,
          activeVendors: parseInt(vendorStats.activeVendors) || 0
        },
        recentOrders,
        monthlyStats,
        statusStats,
        projectStats: projectStatsList
      };
      console.log("\u2705 Dashboard data compiled successfully:", {
        totalOrders: result.statistics.totalOrders,
        activeProjects: result.statistics.activeProjects
      });
      cache.set(cacheKey, result, 600);
      return result;
    } catch (error) {
      console.error("\u274C Error fetching unified dashboard data:", error);
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
      return {
        statistics: {
          totalOrders: 0,
          totalAmount: 0,
          pendingOrders: 0,
          monthlyOrders: 0,
          activeProjects: 0,
          activeVendors: 0
        },
        recentOrders: [],
        monthlyStats: [],
        statusStats: [],
        projectStats: []
      };
    }
  }
  /**
   * Get order statistics for dashboard
   */
  static async getOrderStatistics() {
    return OptimizedOrderQueries.getOrderStatistics();
  }
};

// server/routes/projects.ts
var router2 = Router2();
router2.get("/projects", async (req, res) => {
  try {
    const projects2 = await storage.getProjects();
    res.json(projects2);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});
router2.get("/projects/active", async (req, res) => {
  try {
    const projects2 = await storage.getActiveProjects();
    res.json(projects2);
  } catch (error) {
    console.error("Error fetching active projects:", error);
    res.status(500).json({ message: "Failed to fetch active projects" });
  }
});
router2.get("/projects/:id", async (req, res) => {
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
router2.post("/projects", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const user = await storage.getUser(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    console.log("\u{1F50D} Project creation request body:", JSON.stringify(req.body, null, 2));
    const projectTypeMap = {
      "\uC544\uD30C\uD2B8": "residential",
      "\uC624\uD53C\uC2A4\uD154": "residential",
      "\uB2E8\uB3C5\uC8FC\uD0DD": "residential",
      "\uC8FC\uAC70\uC2DC\uC124": "residential",
      "\uC0C1\uC5C5\uC2DC\uC124": "commercial",
      "\uC0AC\uBB34\uC2E4": "commercial",
      "\uC1FC\uD551\uBAB0": "commercial",
      "\uC0B0\uC5C5\uC2DC\uC124": "industrial",
      "\uACF5\uC7A5": "industrial",
      "\uCC3D\uACE0": "industrial",
      "\uC778\uD504\uB77C": "infrastructure",
      "\uB3C4\uB85C": "infrastructure",
      "\uAD50\uB7C9": "infrastructure"
    };
    console.log("\u{1F527} Original projectType:", req.body.projectType, "typeof:", typeof req.body.projectType);
    console.log("\u{1F527} Mapped projectType:", projectTypeMap[req.body.projectType]);
    console.log("\u{1F527} Original dates - startDate:", req.body.startDate, "endDate:", req.body.endDate);
    console.log("\u{1F527} Date types - startDate:", typeof req.body.startDate, "endDate:", typeof req.body.endDate);
    let transformedStartDate = null;
    let transformedEndDate = null;
    if (req.body.startDate) {
      if (typeof req.body.startDate === "string") {
        transformedStartDate = req.body.startDate.split("T")[0];
      } else if (req.body.startDate instanceof Date) {
        transformedStartDate = req.body.startDate.toISOString().split("T")[0];
      }
    }
    if (req.body.endDate) {
      if (typeof req.body.endDate === "string") {
        transformedEndDate = req.body.endDate.split("T")[0];
      } else if (req.body.endDate instanceof Date) {
        transformedEndDate = req.body.endDate.toISOString().split("T")[0];
      }
    }
    const transformedData = {
      ...req.body,
      startDate: transformedStartDate,
      endDate: transformedEndDate,
      totalBudget: req.body.totalBudget ? req.body.totalBudget : null,
      projectType: projectTypeMap[req.body.projectType] || req.body.projectType || "commercial"
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
router2.put("/projects/:id", requireAuth, async (req, res) => {
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
    console.log("\u{1F527} Updating project ID:", projectId);
    console.log("\u{1F527} Update data received:", req.body);
    const updateData = { ...req.body };
    if (updateData.totalBudget) {
      console.log("\u{1F527} Original totalBudget:", updateData.totalBudget, typeof updateData.totalBudget);
      updateData.totalBudget = parseFloat(updateData.totalBudget);
      console.log("\u{1F527} Converted totalBudget:", updateData.totalBudget, typeof updateData.totalBudget);
    }
    const updatedProject = await storage.updateProject(projectId, updateData);
    console.log("\u{1F527} Project updated successfully:", updatedProject);
    res.json(updatedProject);
  } catch (error) {
    console.error("\u{1F527} Error updating project:", error);
    res.status(500).json({ message: "Failed to update project" });
  }
});
router2.delete("/projects/:id", requireAuth, async (req, res) => {
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
router2.get("/projects/:id/members", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const members = await storage.getProjectMembers(projectId);
    res.json(members);
  } catch (error) {
    console.error("Error fetching project members:", error);
    res.status(500).json({ message: "Failed to fetch project members" });
  }
});
router2.post("/projects/:id/members", requireAuth, async (req, res) => {
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
router2.delete("/projects/:id/members/:userId", requireAuth, async (req, res) => {
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
router2.get("/projects/:id/stats", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const orders = await OptimizedOrderQueries.getProjectOrders(projectId);
    const totalAmount = orders.reduce((sum2, order) => sum2 + (order.totalAmount || 0), 0);
    const completedOrders = orders.filter((order) => order.status === "completed").length;
    const stats = {
      totalOrders: orders.length,
      completedOrders,
      pendingOrders: orders.filter((order) => order.status === "pending").length,
      totalAmount,
      completionRate: orders.length > 0 ? Math.round(completedOrders / orders.length * 100) : 0
    };
    res.json(stats);
  } catch (error) {
    console.error("Error fetching project statistics:", error);
    res.status(500).json({ message: "Failed to fetch project statistics" });
  }
});
var projects_default = router2;

// server/routes/orders.ts
import { Router as Router3 } from "express";

// server/utils/multer-config.ts
import multer from "multer";
import path3 from "path";
import fs2 from "fs";

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
var uploadDir = path3.join(process.cwd(), "uploads");
if (!fs2.existsSync(uploadDir)) {
  fs2.mkdirSync(uploadDir, { recursive: true });
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
        // .xlsx
        "application/vnd.ms-excel.sheet.macroEnabled.12",
        // .xlsm (대문자 E)
        "application/vnd.ms-excel.sheet.macroenabled.12",
        // .xlsm (소문자 e)
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
      "application/vnd.ms-excel.sheet.macroEnabled.12",
      // .xlsm (대문자 E)
      "application/vnd.ms-excel.sheet.macroenabled.12",
      // .xlsm (소문자 e)
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

// server/services/order-service.ts
var OrderService = class {
  /**
   * Generate unique order number with current date
   */
  static generateOrderNumber() {
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const timestamp2 = now.getTime().toString().slice(-6);
    return `PO${year}${month}${day}_${timestamp2}`;
  }
  /**
   * Create new purchase order
   */
  static async createOrder(orderData) {
    try {
      if (!orderData.orderNumber) {
        orderData.orderNumber = this.generateOrderNumber();
      }
      orderData.status = orderData.status || "draft";
      orderData.approvalLevel = orderData.approvalLevel || 1;
      orderData.currentApproverRole = orderData.currentApproverRole || "field_worker";
      const result = await storage.createPurchaseOrder(orderData);
      return result;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }
  /**
   * Submit order for approval
   */
  static async submitForApproval(orderId, userId) {
    try {
      const updateData = {
        status: "pending",
        currentApproverRole: "project_manager",
        approvalLevel: 2,
        updatedAt: /* @__PURE__ */ new Date()
      };
      const result = await storage.updatePurchaseOrder(orderId, updateData);
      await this.createApprovalLog(orderId, userId, "submitted_for_approval");
      return result;
    } catch (error) {
      console.error("Error submitting order for approval:", error);
      throw error;
    }
  }
  /**
   * Approve order
   */
  static async approveOrder(orderId, userId, role) {
    try {
      const nextApprovalLevel = this.getNextApprovalLevel(role);
      const nextApproverRole = this.getNextApproverRole(role);
      const updateData = {
        status: nextApproverRole ? "pending" : "approved",
        currentApproverRole: nextApproverRole,
        approvalLevel: nextApprovalLevel,
        updatedAt: /* @__PURE__ */ new Date()
      };
      const result = await storage.updatePurchaseOrder(orderId, updateData);
      await this.createApprovalLog(orderId, userId, "approved");
      return result;
    } catch (error) {
      console.error("Error approving order:", error);
      throw error;
    }
  }
  /**
   * Reject order
   */
  static async rejectOrder(orderId, userId, reason) {
    try {
      const updateData = {
        status: "draft",
        currentApproverRole: null,
        approvalLevel: 1,
        updatedAt: /* @__PURE__ */ new Date()
      };
      const result = await storage.updatePurchaseOrder(orderId, updateData);
      await this.createApprovalLog(orderId, userId, "rejected", reason);
      return result;
    } catch (error) {
      console.error("Error rejecting order:", error);
      throw error;
    }
  }
  /**
   * Get next approval level based on current role
   */
  static getNextApprovalLevel(currentRole) {
    const levels = {
      "field_worker": 2,
      "project_manager": 3,
      "hq_management": 4,
      "executive": 5
    };
    return levels[currentRole] || 1;
  }
  /**
   * Get next approver role based on current role
   */
  static getNextApproverRole(currentRole) {
    const nextRoles = {
      "field_worker": "project_manager",
      "project_manager": "hq_management",
      "hq_management": "executive",
      "executive": null
      // Final approval
    };
    return nextRoles[currentRole] || null;
  }
  /**
   * Create approval log entry
   */
  static async createApprovalLog(orderId, userId, action, notes) {
    try {
      console.log(`Approval log: Order ${orderId}, User ${userId}, Action: ${action}, Notes: ${notes || "None"}`);
    } catch (error) {
      console.error("Error creating approval log:", error);
    }
  }
};

// server/routes/orders.ts
import fs3 from "fs";
import path4 from "path";
var router3 = Router3();
router3.get("/orders", async (req, res) => {
  try {
    const {
      page = "1",
      limit = "50",
      // Changed default from 20 to 50 to match frontend
      status,
      projectId,
      vendorId,
      startDate,
      endDate,
      userId,
      search
    } = req.query;
    const filters = {
      status,
      projectId: projectId ? parseInt(projectId) : void 0,
      vendorId: vendorId ? parseInt(vendorId) : void 0,
      startDate: startDate ? new Date(startDate) : void 0,
      endDate: endDate ? new Date(endDate) : void 0,
      userId,
      searchText: search,
      // Changed from 'search' to 'searchText' to match storage.ts
      page: parseInt(page),
      limit: parseInt(limit)
    };
    const result = await storage.getPurchaseOrders(filters);
    res.json(result);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});
router3.get("/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const order = await storage.getPurchaseOrder(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});
router3.post("/orders", requireAuth, upload.array("attachments"), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    console.log("\u{1F527}\u{1F527}\u{1F527} ORDERS.TS - Order creation request:", {
      body: req.body,
      files: req.files?.map((f) => ({
        originalname: f.originalname,
        filename: f.filename,
        size: f.size
      }))
    });
    let items3 = [];
    try {
      items3 = JSON.parse(req.body.items || "[]");
    } catch (parseError) {
      console.error("\u{1F527}\u{1F527}\u{1F527} ORDERS.TS - Error parsing items:", parseError);
      return res.status(400).json({ message: "Invalid items data" });
    }
    const totalAmount = items3.reduce((sum2, item) => sum2 + parseFloat(item.quantity) * parseFloat(item.unitPrice), 0);
    const orderData = {
      orderNumber: await OrderService.generateOrderNumber(),
      projectId: parseInt(req.body.projectId),
      vendorId: req.body.vendorId ? parseInt(req.body.vendorId) : null,
      templateId: req.body.templateId ? parseInt(req.body.templateId) : null,
      userId,
      orderDate: /* @__PURE__ */ new Date(),
      deliveryDate: req.body.deliveryDate ? new Date(req.body.deliveryDate) : null,
      totalAmount,
      notes: req.body.notes || null,
      status: "draft",
      currentApproverRole: null,
      approvalLevel: 0,
      items: items3
    };
    console.log("\u{1F527}\u{1F527}\u{1F527} ORDERS.TS - Prepared order data:", orderData);
    const order = await storage.createPurchaseOrder(orderData);
    console.log("\u{1F527}\u{1F527}\u{1F527} ORDERS.TS - Created order:", order);
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const decodedFilename = decodeKoreanFilename(file.originalname);
        console.log("\u{1F527}\u{1F527}\u{1F527} ORDERS.TS - Processing file:", {
          original: file.originalname,
          decoded: decodedFilename,
          stored: file.filename
        });
        await storage.createAttachment({
          orderId: order.id,
          originalName: decodedFilename,
          storedName: file.filename,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: userId
        });
      }
    }
    res.status(201).json(order);
  } catch (error) {
    console.error("\u{1F527}\u{1F527}\u{1F527} ORDERS.TS - Error creating order:", error);
    res.status(500).json({ message: "Failed to create order" });
  }
});
router3.put("/orders/:id", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const updateData = req.body;
    const order = await storage.getPurchaseOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "draft" && order.userId !== req.user?.id) {
      return res.status(403).json({ message: "Cannot edit approved orders" });
    }
    const updatedOrder = await storage.updatePurchaseOrder(orderId, updateData);
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Failed to update order" });
  }
});
router3.delete("/orders/:id", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const order = await storage.getPurchaseOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "draft") {
      return res.status(403).json({ message: "Cannot delete submitted orders" });
    }
    await storage.deletePurchaseOrder(orderId);
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Failed to delete order" });
  }
});
router3.post("/orders/:id/approve", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const result = await OrderService.approveOrder(orderId, userId);
    res.json(result);
  } catch (error) {
    console.error("Error approving order:", error);
    res.status(500).json({ message: "Failed to approve order" });
  }
});
router3.post("/orders/:id/reject", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const result = await OrderService.rejectOrder(orderId, userId, reason);
    res.json(result);
  } catch (error) {
    console.error("Error rejecting order:", error);
    res.status(500).json({ message: "Failed to reject order" });
  }
});
router3.post("/orders/:id/submit", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const result = await OrderService.submitForApproval(orderId, userId);
    res.json(result);
  } catch (error) {
    console.error("Error submitting order:", error);
    res.status(500).json({ message: "Failed to submit order" });
  }
});
router3.get("/orders/pending-approval", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const orders = await OptimizedOrderQueries.getPendingApprovalOrders(user.role);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching pending orders:", error);
    res.status(500).json({ message: "Failed to fetch pending orders" });
  }
});
router3.get("/orders/stats", async (req, res) => {
  try {
    const stats = await OptimizedDashboardQueries.getOrderStatistics();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    res.status(500).json({ message: "Failed to fetch order statistics" });
  }
});
router3.post("/orders/generate-pdf", requireAuth, async (req, res) => {
  try {
    const { orderData, options = {} } = req.body;
    if (!orderData) {
      return res.status(400).json({
        success: false,
        error: "\uBC1C\uC8FC\uC11C \uB370\uC774\uD130\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4."
      });
    }
    console.log(`\u{1F4C4} PDF \uC0DD\uC131 \uC694\uCCAD: \uBC1C\uC8FC\uC11C ${orderData.orderNumber || "N/A"}`);
    const timestamp2 = Date.now();
    const tempDir = "uploads/temp-pdf";
    if (!fs3.existsSync(tempDir)) {
      fs3.mkdirSync(tempDir, { recursive: true });
    }
    const tempHtmlPath = path4.join(tempDir, `order-${timestamp2}.html`);
    const tempPdfPath = path4.join(tempDir, `order-${timestamp2}.pdf`);
    try {
      const orderHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>\uBC1C\uC8FC\uC11C - ${orderData.orderNumber || "\uBBF8\uC0DD\uC131"}</title>
  <style>
    body {
      font-family: 'Malgun Gothic', sans-serif;
      margin: 20px;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #3B82F6;
    }
    .header h1 {
      color: #1F2937;
      margin: 0;
      font-size: 28px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .info-item {
      padding: 10px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      background-color: #F9FAFB;
    }
    .info-label {
      font-weight: bold;
      color: #374151;
      margin-bottom: 5px;
    }
    .info-value {
      color: #1F2937;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .items-table th, .items-table td {
      border: 1px solid #D1D5DB;
      padding: 12px;
      text-align: left;
    }
    .items-table th {
      background-color: #F3F4F6;
      font-weight: bold;
      color: #374151;
    }
    .items-table tbody tr:nth-child(even) {
      background-color: #F9FAFB;
    }
    .total-row {
      background-color: #EEF2FF !important;
      font-weight: bold;
    }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 60px;
      color: rgba(59, 130, 246, 0.1);
      z-index: -1;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="watermark">\uBC1C\uC8FC\uC11C</div>
  
  <div class="header">
    <h1>\uAD6C\uB9E4 \uBC1C\uC8FC\uC11C</h1>
    <p style="margin: 5px 0; color: #6B7280;">Purchase Order</p>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">\uBC1C\uC8FC\uC11C \uBC88\uD638</div>
      <div class="info-value">${orderData.orderNumber || "\uBBF8\uC0DD\uC131"}</div>
    </div>
    <div class="info-item">
      <div class="info-label">\uBC1C\uC8FC\uC77C\uC790</div>
      <div class="info-value">${(/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR")}</div>
    </div>
    <div class="info-item">
      <div class="info-label">\uD504\uB85C\uC81D\uD2B8</div>
      <div class="info-value">${orderData.projectName || "\uBBF8\uC9C0\uC815"}</div>
    </div>
    <div class="info-item">
      <div class="info-label">\uAC70\uB798\uCC98</div>
      <div class="info-value">${orderData.vendorName || "\uBBF8\uC9C0\uC815"}</div>
    </div>
  </div>

  <h3 style="color: #374151; border-bottom: 1px solid #D1D5DB; padding-bottom: 10px;">\uBC1C\uC8FC \uD488\uBAA9</h3>
  
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 50px;">\uC21C\uBC88</th>
        <th>\uD488\uBAA9\uBA85</th>
        <th style="width: 80px;">\uC218\uB7C9</th>
        <th style="width: 60px;">\uB2E8\uC704</th>
        <th style="width: 120px;">\uB2E8\uAC00</th>
        <th style="width: 120px;">\uAE08\uC561</th>
      </tr>
    </thead>
    <tbody>
      ${orderData.items?.map((item, index2) => `
        <tr>
          <td style="text-align: center;">${index2 + 1}</td>
          <td>${item.name || "\uD488\uBAA9\uBA85 \uC5C6\uC74C"}</td>
          <td style="text-align: right;">${item.quantity || 0}</td>
          <td style="text-align: center;">${item.unit || "EA"}</td>
          <td style="text-align: right;">\u20A9${(item.unitPrice || 0).toLocaleString()}</td>
          <td style="text-align: right;">\u20A9${((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}</td>
        </tr>
      `).join("") || '<tr><td colspan="6" style="text-align: center; color: #6B7280;">\uD488\uBAA9 \uC815\uBCF4 \uC5C6\uC74C</td></tr>'}
      <tr class="total-row">
        <td colspan="5" style="text-align: right; font-weight: bold;">\uCD1D \uAE08\uC561</td>
        <td style="text-align: right; font-weight: bold;">\u20A9${(orderData.totalAmount || 0).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 40px; padding: 20px; background-color: #F3F4F6; border-radius: 8px;">
    <h4 style="margin-top: 0; color: #374151;">\uBE44\uACE0</h4>
    <p style="margin: 0; color: #6B7280;">
      ${orderData.notes || "\uD2B9\uC774\uC0AC\uD56D \uC5C6\uC74C"}
    </p>
  </div>

  <div style="margin-top: 30px; text-align: center; color: #9CA3AF; font-size: 12px;">
    \uC774 \uBB38\uC11C\uB294 \uC2DC\uC2A4\uD15C\uC5D0\uC11C \uC790\uB3D9 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4. (\uC0DD\uC131\uC77C: ${(/* @__PURE__ */ new Date()).toLocaleString("ko-KR")})
  </div>
</body>
</html>
      `;
      fs3.writeFileSync(tempHtmlPath, orderHtml, "utf8");
      const puppeteer3 = await import("puppeteer");
      const browser = await puppeteer3.default.launch({
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu"
        ]
      });
      const page = await browser.newPage();
      await page.setContent(orderHtml, {
        waitUntil: "networkidle0",
        timeout: 3e4
      });
      await page.pdf({
        path: tempPdfPath,
        format: "A4",
        landscape: false,
        printBackground: true,
        margin: {
          top: "20mm",
          bottom: "20mm",
          left: "15mm",
          right: "15mm"
        }
      });
      await browser.close();
      if (!fs3.existsSync(tempPdfPath)) {
        throw new Error("PDF \uD30C\uC77C\uC774 \uC0DD\uC131\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.");
      }
      const pdfUrl = `/api/orders/download-pdf/${timestamp2}`;
      console.log(`\u2705 PDF \uC0DD\uC131 \uC644\uB8CC: ${pdfUrl}`);
      if (fs3.existsSync(tempHtmlPath)) {
        fs3.unlinkSync(tempHtmlPath);
      }
      res.json({
        success: true,
        pdfUrl,
        message: "PDF\uAC00 \uC131\uACF5\uC801\uC73C\uB85C \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4."
      });
    } catch (conversionError) {
      console.error("PDF \uBCC0\uD658 \uC624\uB958:", conversionError);
      try {
        if (fs3.existsSync(tempHtmlPath)) fs3.unlinkSync(tempHtmlPath);
        if (fs3.existsSync(tempPdfPath)) fs3.unlinkSync(tempPdfPath);
      } catch (cleanupError) {
        console.error("\uC784\uC2DC \uD30C\uC77C \uC815\uB9AC \uC2E4\uD328:", cleanupError);
      }
      res.status(500).json({
        success: false,
        error: "PDF \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
        details: conversionError instanceof Error ? conversionError.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"
      });
    }
  } catch (error) {
    console.error("PDF \uC0DD\uC131 API \uC624\uB958:", error);
    res.status(500).json({
      success: false,
      error: "PDF \uC0DD\uC131 \uC5D0\uB7EC\uAC00 \uBC1C\uC0DD \uD568",
      details: error instanceof Error ? error.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"
    });
  }
});
router3.get("/orders/download-pdf/:timestamp", (req, res) => {
  try {
    const { timestamp: timestamp2 } = req.params;
    const { download } = req.query;
    const pdfPath = path4.join(process.cwd(), "uploads/temp-pdf", `order-${timestamp2}.pdf`);
    console.log(`\u{1F4C4} PDF \uB2E4\uC6B4\uB85C\uB4DC \uC694\uCCAD: ${pdfPath}`);
    console.log(`\u{1F4C4} \uD30C\uC77C \uC874\uC7AC \uC5EC\uBD80: ${fs3.existsSync(pdfPath)}`);
    if (fs3.existsSync(pdfPath)) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      if (download === "true") {
        res.download(pdfPath, `\uBC1C\uC8FC\uC11C_${timestamp2}.pdf`);
      } else {
        const stat = fs3.statSync(pdfPath);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent("\uBC1C\uC8FC\uC11C.pdf")}`);
        res.setHeader("Content-Length", stat.size.toString());
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        const pdfStream = fs3.createReadStream(pdfPath);
        pdfStream.on("error", (error) => {
          console.error("PDF \uC2A4\uD2B8\uB9BC \uC624\uB958:", error);
          if (!res.headersSent) {
            res.status(500).json({ error: "PDF \uC77D\uAE30 \uC2E4\uD328" });
          }
        });
        pdfStream.pipe(res);
      }
    } else {
      res.status(404).json({
        success: false,
        error: "PDF \uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
      });
    }
  } catch (error) {
    console.error("PDF \uB2E4\uC6B4\uB85C\uB4DC \uC624\uB958:", error);
    res.status(500).json({
      success: false,
      error: "PDF \uB2E4\uC6B4\uB85C\uB4DC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
    });
  }
});
var orders_default = router3;

// server/routes/vendors.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.get("/vendors", async (req, res) => {
  try {
    const vendors2 = await storage.getVendors();
    res.json(vendors2);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ message: "Failed to fetch vendors" });
  }
});
router4.get("/vendors/:id", requireAuth, async (req, res) => {
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
router4.post("/vendors", requireAuth, async (req, res) => {
  try {
    console.log("\u{1F50D} Vendor creation request body:", req.body);
    console.log("\u{1F50D} User:", req.user);
    const vendorData = {
      name: req.body.name,
      businessNumber: req.body.businessNumber || null,
      contactPerson: req.body.contactPerson,
      email: req.body.email,
      phone: req.body.phone || null,
      address: req.body.address || null,
      businessType: req.body.businessType || null
    };
    console.log("\u{1F50D} Prepared vendor data:", vendorData);
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        const vendor = await storage.createVendor(vendorData);
        console.log("\u2705 Vendor created successfully:", vendor);
        return res.status(201).json(vendor);
      } catch (dbError) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw dbError;
        }
        console.log(`\u{1F504} Database operation failed, retrying (${attempts}/${maxAttempts})...`);
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
  } catch (error) {
    console.error("\u274C Error creating vendor:", error);
    console.error("\u274C Error details:", error.message);
    console.error("\u274C Error stack:", error.stack);
    res.status(500).json({
      message: "Failed to create vendor",
      error: error.message
    });
  }
});
router4.put("/vendors/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log("\u{1F50D} Vendor update request - ID:", id);
    console.log("\u{1F50D} Update data:", req.body);
    const updatedVendor = await storage.updateVendor(id, req.body);
    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    console.log("\u2705 Vendor updated successfully:", updatedVendor);
    res.json(updatedVendor);
  } catch (error) {
    console.error("\u274C Error updating vendor:", error);
    res.status(500).json({ message: "Failed to update vendor" });
  }
});
router4.delete("/vendors/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteVendor(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting vendor:", error);
    res.status(500).json({ message: "Failed to delete vendor" });
  }
});
var vendors_default = router4;

// server/routes/items.ts
import { Router as Router5 } from "express";
init_schema();
var router5 = Router5();
router5.get("/items", async (req, res) => {
  try {
    const items3 = await storage.getItems();
    res.json(items3);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ message: "Failed to fetch items" });
  }
});
router5.get("/items/categories", async (req, res) => {
  try {
    const categories = await storage.getItemCategories();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching item categories:", error);
    res.status(500).json({ message: "Failed to fetch item categories" });
  }
});
router5.get("/items/:id", async (req, res) => {
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
router5.post("/items", async (req, res) => {
  try {
    const validatedData = insertItemSchema.parse(req.body);
    const item = await storage.createItem(validatedData);
    res.status(201).json(item);
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ message: "Failed to create item" });
  }
});
router5.put("/items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updatedItem = await storage.updateItem(id, req.body);
    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ message: "Failed to update item" });
  }
});
router5.delete("/items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await storage.deleteItem(id);
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ message: "Failed to delete item" });
  }
});
router5.get("/item-categories", async (req, res) => {
  try {
    const categories = await storage.getItemCategories();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching item categories:", error);
    res.status(500).json({ message: "Failed to fetch item categories" });
  }
});
router5.get("/item-categories/major", async (req, res) => {
  try {
    const categories = await storage.getMajorCategories();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching major categories:", error);
    res.status(500).json({ message: "Failed to fetch major categories" });
  }
});
router5.get("/item-categories/middle", async (req, res) => {
  try {
    const { majorId } = req.query;
    const categories = await storage.getMiddleCategories(majorId ? parseInt(majorId) : void 0);
    res.json(categories);
  } catch (error) {
    console.error("Error fetching middle categories:", error);
    res.status(500).json({ message: "Failed to fetch middle categories" });
  }
});
router5.get("/item-categories/minor", async (req, res) => {
  try {
    const { middleId } = req.query;
    const categories = await storage.getMinorCategories(middleId ? parseInt(middleId) : void 0);
    res.json(categories);
  } catch (error) {
    console.error("Error fetching minor categories:", error);
    res.status(500).json({ message: "Failed to fetch minor categories" });
  }
});
router5.post("/item-categories", async (req, res) => {
  try {
    const category = await storage.createItemCategory(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating item category:", error);
    res.status(500).json({ message: "Failed to create item category" });
  }
});
router5.put("/item-categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updatedCategory = await storage.updateItemCategory(id, req.body);
    res.json(updatedCategory);
  } catch (error) {
    console.error("Error updating item category:", error);
    res.status(500).json({ message: "Failed to update item category" });
  }
});
router5.delete("/item-categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await storage.deleteItemCategory(id);
    res.json({ message: "Item category deleted successfully" });
  } catch (error) {
    console.error("Error deleting item category:", error);
    res.status(500).json({ message: "Failed to delete item category" });
  }
});
var items_default = router5;

// server/routes/dashboard.ts
import { Router as Router6 } from "express";
import { sql as sql4 } from "drizzle-orm";
var router6 = Router6();
router6.get("/dashboard/test-db", async (req, res) => {
  try {
    const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const result = await db2.execute(sql4`SELECT COUNT(*) as count FROM purchase_orders`);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("DB test error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
router6.get("/dashboard/unified", async (req, res) => {
  try {
    if (req.query.force === "true") {
      cache.delete("unified_dashboard_data");
    }
    const stats = await OptimizedDashboardQueries.getUnifiedDashboardData();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});
router6.get("/dashboard/recent-projects", async (req, res) => {
  try {
    const projects2 = await storage.getRecentProjectsThisMonth();
    res.json(projects2);
  } catch (error) {
    console.error("Error fetching recent projects:", error);
    res.status(500).json({ message: "Failed to fetch recent projects" });
  }
});
router6.get("/dashboard/urgent-orders", async (req, res) => {
  try {
    const orders = await storage.getUrgentOrders();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching urgent orders:", error);
    res.status(500).json({ message: "Failed to fetch urgent orders" });
  }
});
var dashboard_default = router6;

// server/routes/companies.ts
import { Router as Router7 } from "express";
init_schema();
var router7 = Router7();
router7.get("/companies", async (req, res) => {
  try {
    const companies3 = await storage.getCompanies();
    res.json(companies3);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Failed to fetch companies" });
  }
});
router7.post("/companies", logoUpload.single("logo"), async (req, res) => {
  try {
    const companyData = { ...req.body };
    if (req.file) {
      companyData.logoUrl = `/uploads/${req.file.filename}`;
    }
    const validatedData = insertCompanySchema.parse(companyData);
    const company = await storage.createCompany(validatedData);
    res.status(201).json(company);
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({ message: "Failed to create company" });
  }
});
router7.put("/companies/:id", logoUpload.single("logo"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updateData = { ...req.body };
    if (req.file) {
      updateData.logoUrl = `/uploads/${req.file.filename}`;
    }
    const updatedCompany = await storage.updateCompany(id, updateData);
    res.json(updatedCompany);
  } catch (error) {
    console.error("Error updating company:", error);
    res.status(500).json({ message: "Failed to update company" });
  }
});
var companies_default = router7;

// server/routes/admin.ts
import { Router as Router8 } from "express";
init_db();
init_schema();
import { eq as eq3, and as and3 } from "drizzle-orm";
var router8 = Router8();
router8.get("/positions", async (req, res) => {
  try {
    const positions = await storage.getPositions();
    res.json(positions);
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ message: "Failed to fetch positions" });
  }
});
router8.get("/ui-terms", async (req, res) => {
  try {
    const terms = await storage.getUiTerms();
    res.json(terms);
  } catch (error) {
    console.error("Error fetching UI terms:", error);
    res.status(500).json({ message: "Failed to fetch UI terms" });
  }
});
router8.post("/ui-terms", requireAuth, requireAdmin, async (req, res) => {
  try {
    const term = await storage.createUiTerm(req.body);
    res.status(201).json(term);
  } catch (error) {
    console.error("Error creating UI term:", error);
    res.status(500).json({ message: "Failed to create UI term" });
  }
});
router8.get("/templates", async (req, res) => {
  try {
    const templates = await storage.getOrderTemplates();
    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});
router8.get("/templates/:id", async (req, res) => {
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
router8.post("/templates", requireAuth, async (req, res) => {
  try {
    const template = await storage.createOrderTemplate(req.body);
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ message: "Failed to create template" });
  }
});
router8.put("/templates/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const template = await storage.updateOrderTemplate(id, req.body);
    res.json(template);
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ message: "Failed to update template" });
  }
});
router8.delete("/templates/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await storage.deleteOrderTemplate(id);
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ message: "Failed to delete template" });
  }
});
router8.get("/approval-workflow-settings", requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await db.select().from(approvalWorkflowSettings).where(
      and3(
        eq3(approvalWorkflowSettings.isActive, true),
        eq3(approvalWorkflowSettings.companyId, 1)
      )
    ).limit(1);
    if (settings.length === 0) {
      res.json({
        id: 0,
        companyId: 1,
        approvalMode: "staged",
        directApprovalRoles: [],
        stagedApprovalThresholds: {
          field_worker: 0,
          project_manager: 5e6,
          hq_management: 3e7,
          executive: 1e8,
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
router8.put("/approval-workflow-settings", requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      approvalMode,
      directApprovalRoles,
      stagedApprovalThresholds,
      requireAllStages,
      skipLowerStages
    } = req.body;
    const existing = await db.select().from(approvalWorkflowSettings).where(eq3(approvalWorkflowSettings.companyId, 1)).limit(1);
    if (existing.length === 0) {
      const [newSettings] = await db.insert(approvalWorkflowSettings).values({
        companyId: 1,
        approvalMode,
        directApprovalRoles,
        stagedApprovalThresholds,
        requireAllStages,
        skipLowerStages,
        isActive: true,
        createdBy: req.user.id
      }).returning();
      res.json(newSettings);
    } else {
      const [updatedSettings] = await db.update(approvalWorkflowSettings).set({
        approvalMode,
        directApprovalRoles,
        stagedApprovalThresholds,
        requireAllStages,
        skipLowerStages,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(approvalWorkflowSettings.id, existing[0].id)).returning();
      res.json(updatedSettings);
    }
  } catch (error) {
    console.error("Error updating workflow settings:", error);
    res.status(500).json({ error: "Failed to update workflow settings" });
  }
});
var admin_default = router8;

// server/routes/excel-automation.ts
import { Router as Router9 } from "express";
import multer2 from "multer";
import path8 from "path";
import fs9 from "fs";

// server/utils/po-template-processor-mock.ts
import XLSX from "xlsx";

// server/utils/excel-input-sheet-remover.ts
import JSZip from "jszip";
import fs4 from "fs";
import { DOMParser, XMLSerializer } from "xmldom";
async function removeAllInputSheets(sourcePath, targetPath) {
  try {
    console.log(`\u{1F527} Input \uC2DC\uD2B8 \uC644\uC804 \uC81C\uAC70 \uC2DC\uC791: ${sourcePath} -> ${targetPath}`);
    const data = fs4.readFileSync(sourcePath);
    const zip = new JSZip();
    const zipData = await zip.loadAsync(data);
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const workbookXml = zipData.files["xl/workbook.xml"];
    if (!workbookXml) {
      throw new Error("workbook.xml\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    }
    const workbookContent = await workbookXml.async("string");
    const workbookDoc = parser.parseFromString(workbookContent, "text/xml");
    const sheets = [];
    const sheetElements = workbookDoc.getElementsByTagName("sheet");
    for (let i = 0; i < sheetElements.length; i++) {
      const sheet = sheetElements[i];
      sheets.push({
        name: sheet.getAttribute("name") || "",
        sheetId: sheet.getAttribute("sheetId") || "",
        rId: sheet.getAttribute("r:id") || "",
        element: sheet
      });
    }
    console.log(`\u{1F4CB} \uBC1C\uACAC\uB41C \uBAA8\uB4E0 \uC2DC\uD2B8: ${sheets.map((s) => s.name).join(", ")}`);
    const inputSheets = sheets.filter((s) => s.name.startsWith("Input"));
    const remainingSheetNames = sheets.filter((s) => !s.name.startsWith("Input")).map((s) => s.name);
    console.log(`\u{1F3AF} \uC81C\uAC70\uD560 Input \uC2DC\uD2B8\uB4E4: ${inputSheets.map((s) => s.name).join(", ")}`);
    console.log(`\u{1F4CB} \uBCF4\uC874\uD560 \uC2DC\uD2B8\uB4E4: ${remainingSheetNames.join(", ")}`);
    if (inputSheets.length === 0) {
      console.log(`\u26A0\uFE0F Input\uC73C\uB85C \uC2DC\uC791\uD558\uB294 \uC2DC\uD2B8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
      fs4.copyFileSync(sourcePath, targetPath);
      return {
        success: true,
        removedSheets: [],
        remainingSheets: remainingSheetNames,
        originalFormat: true,
        processedFilePath: targetPath
      };
    }
    const relsPath = "xl/_rels/workbook.xml.rels";
    const relsFile = zipData.files[relsPath];
    const filesToRemove = [];
    if (relsFile) {
      const relsContent = await relsFile.async("string");
      const relsDoc = parser.parseFromString(relsContent, "text/xml");
      const relationships = relsDoc.getElementsByTagName("Relationship");
      for (const inputSheet of inputSheets) {
        for (let i = 0; i < relationships.length; i++) {
          const rel = relationships[i];
          if (rel.getAttribute("Id") === inputSheet.rId) {
            const target = rel.getAttribute("Target") || "";
            const actualSheetFile = target.replace("worksheets/", "");
            filesToRemove.push(`xl/worksheets/${actualSheetFile}`);
            filesToRemove.push(`xl/worksheets/_rels/${actualSheetFile.replace(".xml", ".xml.rels")}`);
            console.log(`\u{1F50D} \uB9E4\uD551 \uD655\uC778: ${inputSheet.name} -> ${actualSheetFile}`);
            break;
          }
        }
      }
    }
    const contentTypesPath = "[Content_Types].xml";
    const contentTypesFile = zipData.files[contentTypesPath];
    if (contentTypesFile) {
      const contentTypesContent = await contentTypesFile.async("string");
      const contentTypesDoc = parser.parseFromString(contentTypesContent, "text/xml");
      const overrides = contentTypesDoc.getElementsByTagName("Override");
      for (const fileToRemove of filesToRemove) {
        if (fileToRemove.endsWith(".xml")) {
          const sheetPartName = `/${fileToRemove}`;
          for (let i = overrides.length - 1; i >= 0; i--) {
            const override = overrides[i];
            if (override.getAttribute("PartName") === sheetPartName) {
              override.parentNode?.removeChild(override);
              console.log(`\u{1F5D1}\uFE0F [Content_Types].xml\uC5D0\uC11C \uC81C\uAC70: ${sheetPartName}`);
              break;
            }
          }
        }
      }
      const updatedContentTypesXml = serializer.serializeToString(contentTypesDoc);
      zipData.file(contentTypesPath, updatedContentTypesXml);
    }
    for (const inputSheet of inputSheets) {
      inputSheet.element.parentNode?.removeChild(inputSheet.element);
    }
    const remainingSheetElements = workbookDoc.getElementsByTagName("sheet");
    for (let i = 0; i < remainingSheetElements.length; i++) {
      const sheet = remainingSheetElements[i];
      const newSheetId = (i + 1).toString();
      sheet.setAttribute("sheetId", newSheetId);
    }
    const updatedWorkbookXml = serializer.serializeToString(workbookDoc);
    zipData.file("xl/workbook.xml", updatedWorkbookXml);
    if (relsFile) {
      const relsContent = await relsFile.async("string");
      const relsDoc = parser.parseFromString(relsContent, "text/xml");
      const relationships = relsDoc.getElementsByTagName("Relationship");
      for (const inputSheet of inputSheets) {
        for (let i = relationships.length - 1; i >= 0; i--) {
          const rel = relationships[i];
          if (rel.getAttribute("Id") === inputSheet.rId) {
            rel.parentNode?.removeChild(rel);
            console.log(`\u{1F5D1}\uFE0F \uAD00\uACC4 \uC81C\uAC70: ${inputSheet.rId}`);
            break;
          }
        }
      }
      const updatedRelsXml = serializer.serializeToString(relsDoc);
      zipData.file(relsPath, updatedRelsXml);
    }
    for (const filePath of filesToRemove) {
      if (zipData.files[filePath]) {
        zipData.remove(filePath);
        console.log(`\u{1F5D1}\uFE0F \uD30C\uC77C \uC81C\uAC70: ${filePath}`);
      }
    }
    const result = await zipData.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
    fs4.writeFileSync(targetPath, result);
    console.log(`\u2705 Input \uC2DC\uD2B8 \uC644\uC804 \uC81C\uAC70 \uC644\uB8CC: ${targetPath}`);
    console.log(`\u{1F4CA} \uC81C\uAC70\uB41C \uC2DC\uD2B8: ${inputSheets.map((s) => s.name).join(", ")}`);
    console.log(`\u{1F4CA} \uBCF4\uC874\uB41C \uC2DC\uD2B8: ${remainingSheetNames.join(", ")}`);
    return {
      success: true,
      removedSheets: inputSheets.map((s) => s.name),
      remainingSheets: remainingSheetNames,
      originalFormat: true,
      processedFilePath: targetPath
    };
  } catch (error) {
    console.error(`\u274C Input \uC2DC\uD2B8 \uC81C\uAC70 \uC2E4\uD328:`, error);
    if (fs4.existsSync(targetPath)) {
      fs4.unlinkSync(targetPath);
    }
    return {
      success: false,
      removedSheets: [],
      remainingSheets: [],
      originalFormat: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// server/utils/po-template-processor-mock.ts
init_db();
init_schema();
import { eq as eq4 } from "drizzle-orm";

// server/utils/debug-logger.ts
var DebugLogger = class {
  static {
    this.isDebugMode = process.env.NODE_ENV === "development";
  }
  static logFunctionEntry(functionName, params = {}) {
    if (!this.isDebugMode) return;
    console.log(`\u{1F527} [ENTRY] ${functionName}`);
    console.log(`   \uC2DC\uAC04: ${(/* @__PURE__ */ new Date()).toISOString()}`);
    if (Object.keys(params).length > 0) {
      console.log(`   \uD30C\uB77C\uBBF8\uD130:`, JSON.stringify(params, null, 2));
    }
    console.log(`   ===============================`);
  }
  static logFunctionExit(functionName, result = {}) {
    if (!this.isDebugMode) return;
    console.log(`\u2705 [EXIT] ${functionName}`);
    console.log(`   \uC2DC\uAC04: ${(/* @__PURE__ */ new Date()).toISOString()}`);
    if (Object.keys(result).length > 0) {
      console.log(`   \uACB0\uACFC:`, JSON.stringify(result, null, 2));
    }
    console.log(`   ===============================`);
  }
  static logError(functionName, error) {
    console.error(`\u274C [ERROR] ${functionName}`);
    console.error(`   \uC2DC\uAC04: ${(/* @__PURE__ */ new Date()).toISOString()}`);
    console.error(`   \uC624\uB958:`, error);
    console.error(`   ===============================`);
  }
  static logExecutionPath(apiEndpoint, actualFunction) {
    if (!this.isDebugMode) return;
    console.log(`\u{1F50D} [EXECUTION PATH]`);
    console.log(`   API: ${apiEndpoint}`);
    console.log(`   \uC2E4\uC81C \uD638\uCD9C: ${actualFunction}`);
    console.log(`   \uC2DC\uAC04: ${(/* @__PURE__ */ new Date()).toISOString()}`);
    console.log(`   ===============================`);
  }
};

// server/utils/po-template-processor-mock.ts
var POTemplateProcessorMock = class {
  /**
   * Excel 파일에서 Input 시트를 파싱하여 발주서 데이터 추출
   */
  static parseInputSheet(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
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
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const rows = data.slice(1);
      const ordersByNumber = /* @__PURE__ */ new Map();
      for (const row of rows) {
        if (!row || row.length === 0 || !row[0] && !row[2] && !row[10]) continue;
        while (row.length < 16) {
          row.push("");
        }
        const orderDate = this.formatDate(row[0]) || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const dueDate = this.formatDate(row[1]) || "";
        const vendorName = String(row[2] || "").trim();
        const vendorEmail = String(row[3] || "").trim();
        const deliveryName = String(row[4] || "").trim();
        const deliveryEmail = String(row[5] || "").trim();
        const siteName = String(row[6] || "").trim();
        const categoryLv1 = String(row[7] || "").trim();
        const categoryLv2 = String(row[8] || "").trim();
        const categoryLv3 = String(row[9] || "").trim();
        const itemName = String(row[10] || "").trim();
        const specification = String(row[11] || "-").trim();
        const quantity = this.safeNumber(row[12]);
        const unitPrice = this.safeNumber(row[13]);
        const totalAmount = this.safeNumber(row[14]);
        const notes = String(row[15] || "").trim();
        const orderNumber = this.generateOrderNumber(orderDate, vendorName);
        const supplyAmount = Math.round(totalAmount / 1.1);
        const taxAmount = totalAmount - supplyAmount;
        if (!ordersByNumber.has(orderNumber)) {
          ordersByNumber.set(orderNumber, {
            orderNumber,
            orderDate,
            siteName,
            dueDate,
            vendorName,
            // 첫 번째 행의 거래처명 사용
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
            vendorName,
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
      await db.transaction(async (tx) => {
        for (const orderData of orders) {
          let vendor = await tx.select().from(vendors).where(eq4(vendors.name, orderData.vendorName)).limit(1);
          let vendorId;
          if (vendor.length === 0) {
            const newVendor = await tx.insert(vendors).values({
              name: orderData.vendorName,
              contactPerson: "Unknown",
              email: "noemail@example.com",
              phone: null,
              isActive: true
            }).returning({ id: vendors.id });
            vendorId = newVendor[0].id;
          } else {
            vendorId = vendor[0].id;
          }
          let project = await tx.select().from(projects).where(eq4(projects.projectName, orderData.siteName)).limit(1);
          let projectId;
          if (project.length === 0) {
            const newProject = await tx.insert(projects).values({
              projectName: orderData.siteName,
              projectCode: `AUTO-${Date.now()}`,
              description: "",
              startDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
              endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
              // 1년 후
              isActive: true,
              projectManagerId: null,
              orderManagerId: null
            }).returning({ id: projects.id });
            projectId = newProject[0].id;
          } else {
            projectId = project[0].id;
          }
          const newOrder = await tx.insert(purchaseOrders).values({
            orderNumber: orderData.orderNumber,
            projectId,
            vendorId,
            userId,
            orderDate: orderData.orderDate,
            deliveryDate: orderData.dueDate,
            totalAmount: orderData.totalAmount,
            notes: `PO Template\uC5D0\uC11C \uC790\uB3D9 \uC0DD\uC131\uB428`
          }).returning({ id: purchaseOrders.id });
          const orderId = newOrder[0].id;
          for (const item of orderData.items) {
            await tx.insert(purchaseOrderItems).values({
              orderId,
              itemName: item.itemName,
              specification: item.specification || "",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              notes: `${item.categoryLv1 || ""} ${item.categoryLv2 || ""} ${item.categoryLv3 || ""}`.trim() || null
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
   * 특정 시트들을 별도 파일로 추출 - 완전한 ZIP 구조 처리로 100% 서식 보존
   */
  static async extractSheetsToFile(sourcePath, targetPath, sheetNames = ["\uAC11\uC9C0", "\uC744\uC9C0"]) {
    DebugLogger.logFunctionEntry("POTemplateProcessorMock.extractSheetsToFile", {
      sourcePath,
      targetPath,
      sheetNames
    });
    try {
      const result = await removeAllInputSheets(sourcePath, targetPath);
      if (result.success) {
        const returnValue = {
          success: true,
          extractedSheets: result.remainingSheets
        };
        DebugLogger.logFunctionExit("POTemplateProcessorMock.extractSheetsToFile", returnValue);
        return returnValue;
      } else {
        console.error(`\u274C \uC644\uC804\uD55C \uC11C\uC2DD \uBCF4\uC874 \uCD94\uCD9C \uC2E4\uD328: ${result.error}`);
        console.log(`\u{1F504} \uD3F4\uBC31: \uAE30\uBCF8 XLSX \uB77C\uC774\uBE0C\uB7EC\uB9AC\uB85C \uC2DC\uB3C4`);
        const workbook = XLSX.readFile(sourcePath);
        const newWorkbook = XLSX.utils.book_new();
        const extractedSheets = [];
        for (const sheetName of sheetNames) {
          if (workbook.SheetNames.includes(sheetName)) {
            const worksheet = workbook.Sheets[sheetName];
            XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
            extractedSheets.push(sheetName);
          }
        }
        if (extractedSheets.length > 0) {
          XLSX.writeFile(newWorkbook, targetPath);
        }
        return {
          success: true,
          extractedSheets
        };
      }
    } catch (error) {
      console.error(`\u274C \uC2DC\uD2B8 \uCD94\uCD9C \uC644\uC804 \uC2E4\uD328:`, error);
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
        const date2 = new Date((dateValue - 25569) * 86400 * 1e3);
        return date2.toISOString().split("T")[0];
      }
      if (typeof dateValue === "string") {
        let dateStr = dateValue.trim();
        if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
          dateStr = dateStr.replace(/\./g, "-");
        }
        const date2 = new Date(dateStr);
        if (!isNaN(date2.getTime())) {
          return date2.toISOString().split("T")[0];
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
  /**
   * 발주번호 생성 (PO-YYYYMMDD-VENDOR-XXX 형식)
   */
  static generateOrderNumber(orderDate, vendorName) {
    const date2 = orderDate ? orderDate.replace(/-/g, "") : (/* @__PURE__ */ new Date()).toISOString().split("T")[0].replace(/-/g, "");
    const vendorCode = vendorName ? vendorName.substring(0, 3).toUpperCase() : "UNK";
    const random = Math.floor(Math.random() * 1e3).toString().padStart(3, "0");
    return `PO-${date2}-${vendorCode}-${random}`;
  }
  /**
   * 기본 납기일자 생성 (발주일 + 7일)
   */
  static getDefaultDueDate(orderDateValue) {
    try {
      const orderDate = this.formatDate(orderDateValue);
      if (!orderDate) {
        const date3 = /* @__PURE__ */ new Date();
        date3.setDate(date3.getDate() + 7);
        return date3.toISOString().split("T")[0];
      }
      const date2 = new Date(orderDate);
      date2.setDate(date2.getDate() + 7);
      return date2.toISOString().split("T")[0];
    } catch {
      const date2 = /* @__PURE__ */ new Date();
      date2.setDate(date2.getDate() + 7);
      return date2.toISOString().split("T")[0];
    }
  }
};

// server/utils/vendor-validation.ts
init_db();
init_schema();
import { eq as eq5, sql as sql5 } from "drizzle-orm";
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
  if (!str1 || !str2) return 0;
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
async function validateVendorName(vendorName, vendorType = "\uAC70\uB798\uCC98") {
  console.log(`\u{1F50D} ${vendorType} \uAC80\uC99D \uC2DC\uC791: "${vendorName}"`);
  try {
    const quickTest = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Quick DB test timeout")), 1e4);
    });
    const testQuery = db.select({ count: sql5`1` }).from(vendors).limit(1);
    await Promise.race([testQuery, quickTest]);
    console.log(`\u2705 \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uD655\uC778\uB428`);
  } catch (quickTestError) {
    const errorMessage = quickTestError instanceof Error ? quickTestError.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958";
    console.log(`\u{1F504} \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328 \uAC10\uC9C0, \uC989\uC2DC \uD3F4\uBC31 \uBAA8\uB4DC\uB85C \uC804\uD658: "${vendorName}"`, errorMessage);
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
    let aliasMatch = [];
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
        contactPerson: vendors.contactPerson,
        aliases: vendors.aliases
      }).from(vendors).where(eq5(vendors.name, vendorName)).limit(1);
      const aliasMatchQuery = db.select({
        id: vendors.id,
        name: vendors.name,
        email: vendors.email,
        phone: vendors.phone,
        contactPerson: vendors.contactPerson,
        aliases: vendors.aliases
      }).from(vendors).where(sql5`${vendors.aliases}::jsonb @> ${JSON.stringify([vendorName])}::jsonb`).limit(1);
      const allVendorsQuery = db.select({
        id: vendors.id,
        name: vendors.name,
        email: vendors.email,
        phone: vendors.phone,
        contactPerson: vendors.contactPerson,
        aliases: vendors.aliases
      }).from(vendors).where(eq5(vendors.isActive, true));
      exactMatch = await Promise.race([exactMatchQuery, dbTimeout]);
      aliasMatch = await Promise.race([aliasMatchQuery, dbTimeout]);
      allVendors = await Promise.race([allVendorsQuery, dbTimeout]);
    } catch (dbError) {
      console.log(`\u{1F504} \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328, \uD3F4\uBC31 \uBAA8\uB4DC\uB85C \uC2E4\uD589: "${vendorName}"`);
      console.log(`DB \uC624\uB958:`, dbError?.message || dbError);
      const fallbackSuggestions = generateFallbackSuggestions(vendorName);
      return {
        vendorName,
        exists: false,
        exactMatch: void 0,
        suggestions: fallbackSuggestions
      };
    }
    const finalMatch = exactMatch.length > 0 ? exactMatch[0] : aliasMatch.length > 0 ? aliasMatch[0] : null;
    const suggestions = allVendors.map((vendor) => {
      const nameSimilarity = calculateSimilarity(vendorName, vendor.name);
      const nameDistance = levenshteinDistance(vendorName.toLowerCase(), vendor.name.toLowerCase());
      let maxAliasSimilarity = 0;
      let minAliasDistance = Infinity;
      if (vendor.aliases && Array.isArray(vendor.aliases)) {
        vendor.aliases.forEach((alias) => {
          const aliasSimilarity = calculateSimilarity(vendorName, alias);
          const aliasDistance = levenshteinDistance(vendorName.toLowerCase(), alias.toLowerCase());
          if (aliasSimilarity > maxAliasSimilarity) {
            maxAliasSimilarity = aliasSimilarity;
            minAliasDistance = aliasDistance;
          }
        });
      }
      const finalSimilarity = Math.max(nameSimilarity, maxAliasSimilarity);
      const finalDistance = Math.min(nameDistance, minAliasDistance);
      return {
        ...vendor,
        similarity: finalSimilarity,
        distance: finalDistance,
        matchedBy: finalSimilarity === nameSimilarity ? "name" : "alias"
      };
    }).filter((vendor) => {
      const isAlreadyMatched = finalMatch && vendor.id === finalMatch.id;
      return !isAlreadyMatched && vendor.similarity >= 0.3;
    }).sort((a, b) => {
      if (b.similarity !== a.similarity) {
        return b.similarity - a.similarity;
      }
      return a.distance - b.distance;
    }).slice(0, 5);
    const result = {
      vendorName,
      exists: finalMatch !== null,
      exactMatch: finalMatch || void 0,
      suggestions
    };
    console.log(`\u2705 ${vendorType} \uAC80\uC99D \uC644\uB8CC: exists=${result.exists}, suggestions=${suggestions.length}\uAC1C`);
    if (result.exactMatch) {
      const matchType = exactMatch.length > 0 ? "\uC774\uB984" : "\uBCC4\uCE6D";
      console.log(`\u{1F4CD} \uC815\uD655\uD55C \uB9E4\uCE6D (${matchType}): ${result.exactMatch.name} (ID: ${result.exactMatch.id})`);
      if (result.exactMatch.aliases && result.exactMatch.aliases.length > 0) {
        console.log(`   \uBCC4\uCE6D: ${result.exactMatch.aliases.join(", ")}`);
      }
    }
    suggestions.forEach((suggestion, index2) => {
      const matchInfo = suggestion.matchedBy === "alias" ? " [\uBCC4\uCE6D \uB9E4\uCE6D]" : "";
      console.log(`\u{1F4A1} \uCD94\uCC9C ${index2 + 1}: ${suggestion.name} (\uC720\uC0AC\uB3C4: ${(suggestion.similarity * 100).toFixed(1)}%${matchInfo})`);
    });
    return result;
  } catch (error) {
    console.error(`\u274C \uAC70\uB798\uCC98 \uAC80\uC99D \uC911 \uC624\uB958:`, error);
    if (error?.message?.includes("database") || error?.message?.includes("connection") || error?.message?.includes("fetch failed") || error?.message?.includes("NeonDbError") || error?.message?.includes("ENOTFOUND") || error?.name === "NeonDbError" || error?.code === "ENOTFOUND") {
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
        email: vendors.email,
        aliases: vendors.aliases
      }).from(vendors).where(
        sql5`${vendors.name} = ${vendorName} OR ${vendors.aliases}::jsonb @> ${JSON.stringify([vendorName])}::jsonb`
      ).limit(1);
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
    if (error?.message?.includes("database") || error?.message?.includes("connection") || error?.message?.includes("fetch failed") || error?.message?.includes("NeonDbError") || error?.message?.includes("ENOTFOUND") || error?.name === "NeonDbError" || error?.code === "ENOTFOUND") {
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
        const vendorValidation = await validateVendorName(data.vendorName, "\uAC70\uB798\uCC98");
        vendorValidations.push(vendorValidation);
      } catch (error) {
        console.error(`\u274C \uAC70\uB798\uCC98 "${data.vendorName}" \uAC80\uC99D \uC2E4\uD328:`, error?.message || error);
        vendorValidations.push({
          vendorName: data.vendorName,
          exists: false,
          exactMatch: void 0,
          suggestions: generateFallbackSuggestions(data.vendorName)
        });
      }
      try {
        if (data.deliveryName && data.deliveryName !== data.vendorName) {
          const deliveryValidation = await validateVendorName(data.deliveryName, "\uB0A9\uD488\uCC98");
          deliveryValidations.push(deliveryValidation);
        }
      } catch (error) {
        console.error(`\u274C \uB0A9\uD488\uCC98 "${data.deliveryName}" \uAC80\uC99D \uC2E4\uD328:`, error?.message || error);
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
        console.error(`\u274C \uC774\uBA54\uC77C \uCDA9\uB3CC \uAC80\uC0AC \uC2E4\uD328 "${data.vendorName}":`, error?.message || error);
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

// server/utils/po-email-service.ts
import nodemailer from "nodemailer";
import path6 from "path";
import fs7 from "fs";

// server/utils/excel-to-pdf.ts
import * as XLSX2 from "xlsx";
import puppeteer from "puppeteer";
var ExcelToPdfConverter = class {
  /**
   * Excel 파일을 PDF로 변환
   */
  static async convertToPdf(excelPath, options = {}) {
    try {
      const workbook = XLSX2.readFile(excelPath);
      const pdfPath = options.outputPath || excelPath.replace(/\.xlsx?m?$/, ".pdf");
      const htmlContent = this.generateHtmlFromWorkbook(workbook);
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });
      await page.pdf({
        path: pdfPath,
        format: options.pageFormat || "A4",
        landscape: options.orientation === "landscape",
        margin: {
          top: options.margin?.top || "20mm",
          right: options.margin?.right || "20mm",
          bottom: options.margin?.bottom || "20mm",
          left: options.margin?.left || "20mm"
        },
        printBackground: true
      });
      await browser.close();
      return {
        success: true,
        pdfPath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * 특정 시트들만 PDF로 변환
   */
  static async convertSheetsToPdf(excelPath, sheetNames, options = {}) {
    try {
      const workbook = XLSX2.readFile(excelPath);
      const pdfPath = options.outputPath || excelPath.replace(/\.xlsx?m?$/, "-sheets.pdf");
      const htmlContent = this.generateHtmlFromSheets(workbook, sheetNames);
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });
      await page.pdf({
        path: pdfPath,
        format: options.pageFormat || "A4",
        landscape: options.orientation === "landscape",
        margin: {
          top: options.margin?.top || "20mm",
          right: options.margin?.right || "20mm",
          bottom: options.margin?.bottom || "20mm",
          left: options.margin?.left || "20mm"
        },
        printBackground: true
      });
      await browser.close();
      return {
        success: true,
        pdfPath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * 워크북 전체를 HTML로 변환
   */
  static generateHtmlFromWorkbook(workbook) {
    const sheets = workbook.SheetNames.map((name) => {
      const worksheet = workbook.Sheets[name];
      const htmlTable = XLSX2.utils.sheet_to_html(worksheet);
      return `
        <div class="sheet-container">
          <h2 class="sheet-title">${name}</h2>
          ${htmlTable}
        </div>
        <div class="page-break"></div>
      `;
    }).join("");
    return this.wrapWithHtmlTemplate(sheets);
  }
  /**
   * 특정 시트들만 HTML로 변환
   */
  static generateHtmlFromSheets(workbook, sheetNames) {
    const sheets = sheetNames.filter((name) => workbook.SheetNames.includes(name)).map((name) => {
      const worksheet = workbook.Sheets[name];
      const htmlTable = XLSX2.utils.sheet_to_html(worksheet);
      return `
          <div class="sheet-container">
            <h2 class="sheet-title">${name}</h2>
            ${htmlTable}
          </div>
          <div class="page-break"></div>
        `;
    }).join("");
    return this.wrapWithHtmlTemplate(sheets);
  }
  /**
   * HTML 템플릿으로 래핑
   */
  static wrapWithHtmlTemplate(content) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Excel to PDF</title>
          <style>
            body {
              font-family: 'Malgun Gothic', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: white;
            }
            
            .sheet-container {
              margin-bottom: 30px;
            }
            
            .sheet-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #333;
              border-bottom: 2px solid #007bff;
              padding-bottom: 5px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 12px;
            }
            
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            
            th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            
            .page-break {
              page-break-before: always;
            }
            
            /* \uC22B\uC790 \uC140 \uC6B0\uCE21 \uC815\uB82C */
            td[data-t="n"] {
              text-align: right;
            }
            
            /* \uBCD1\uD569\uB41C \uC140 \uC2A4\uD0C0\uC77C */
            .merged-cell {
              background-color: #e9ecef;
              font-weight: bold;
              text-align: center;
            }
            
            /* \uC778\uC1C4 \uCD5C\uC801\uD654 */
            @media print {
              body {
                margin: 0;
                padding: 10mm;
              }
              
              .page-break {
                page-break-before: always;
              }
              
              .sheet-container {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  }
};
async function convertExcelToPdf(excelPath, outputPath, sheetsOnly) {
  const options = {
    outputPath,
    pageFormat: "A4",
    orientation: "portrait"
  };
  if (sheetsOnly && sheetsOnly.length > 0) {
    return ExcelToPdfConverter.convertSheetsToPdf(excelPath, sheetsOnly, options);
  } else {
    return ExcelToPdfConverter.convertToPdf(excelPath, options);
  }
}

// server/utils/excel-to-pdf-converter.ts
import puppeteer2 from "puppeteer";
import ExcelJS from "exceljs";
import path5 from "path";
import fs5 from "fs";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname2 = path5.dirname(__filename);
var ExcelToPDFConverter = class {
  /**
   * Excel 파일을 PDF로 변환
   * @param excelPath - Excel 파일 경로
   * @param outputPath - PDF 출력 경로 (선택사항)
   * @returns PDF 파일 경로
   */
  static async convertExcelToPDF(excelPath, outputPath) {
    let browser;
    try {
      console.log(`\u{1F4C4} PDF \uBCC0\uD658 \uC2DC\uC791: ${excelPath}`);
      if (!fs5.existsSync(excelPath)) {
        throw new Error(`Excel \uD30C\uC77C\uC774 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4: ${excelPath}`);
      }
      const pdfPath = outputPath || excelPath.replace(/\.(xlsx?|xlsm)$/i, ".pdf");
      console.log(`\u{1F4C4} PDF \uCD9C\uB825 \uACBD\uB85C: ${pdfPath}`);
      const outputDir = path5.dirname(pdfPath);
      if (!fs5.existsSync(outputDir)) {
        fs5.mkdirSync(outputDir, { recursive: true });
        console.log(`\u{1F4C1} \uCD9C\uB825 \uB514\uB809\uD1A0\uB9AC \uC0DD\uC131: ${outputDir}`);
      }
      console.log(`\u{1F4D6} Excel \uD30C\uC77C \uC77D\uB294 \uC911...`);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      console.log(`\u{1F4D6} Excel \uD30C\uC77C \uC77D\uAE30 \uC644\uB8CC. \uC2DC\uD2B8 \uC218: ${workbook.worksheets.length}`);
      console.log(`\u{1F310} HTML \uC0DD\uC131 \uC911...`);
      const html = await this.generateHTMLFromWorkbook(workbook);
      console.log(`\u{1F310} HTML \uC0DD\uC131 \uC644\uB8CC. \uD06C\uAE30: ${html.length} \uBB38\uC790`);
      console.log(`\u{1F680} Puppeteer \uBE0C\uB77C\uC6B0\uC800 \uC2DC\uC791 \uC911...`);
      browser = await puppeteer2.launch({
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu"
        ]
      });
      console.log(`\u{1F680} Puppeteer \uBE0C\uB77C\uC6B0\uC800 \uC2DC\uC791 \uC644\uB8CC`);
      const page = await browser.newPage();
      console.log(`\u{1F4C4} \uC0C8 \uD398\uC774\uC9C0 \uC0DD\uC131 \uC644\uB8CC`);
      console.log(`\u{1F4C4} HTML \uCEE8\uD150\uCE20 \uC124\uC815 \uC911...`);
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 3e4
        // 30초 타임아웃
      });
      console.log(`\u{1F4C4} HTML \uCEE8\uD150\uCE20 \uC124\uC815 \uC644\uB8CC`);
      console.log(`\u{1F4C4} PDF \uC0DD\uC131 \uC911...`);
      await page.pdf({
        path: pdfPath,
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: {
          top: "20mm",
          bottom: "20mm",
          left: "15mm",
          right: "15mm"
        }
      });
      console.log(`\u{1F4C4} PDF \uD30C\uC77C \uC0DD\uC131 \uC644\uB8CC`);
      await browser.close();
      browser = null;
      if (!fs5.existsSync(pdfPath)) {
        throw new Error(`PDF \uD30C\uC77C\uC774 \uC0DD\uC131\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4: ${pdfPath}`);
      }
      const stats = fs5.statSync(pdfPath);
      console.log(`\u2705 PDF \uC0DD\uC131 \uC644\uB8CC: ${pdfPath} (${Math.round(stats.size / 1024)}KB)`);
      return pdfPath;
    } catch (error) {
      console.error("\u274C Excel to PDF \uBCC0\uD658 \uC624\uB958:", error);
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error("\uBE0C\uB77C\uC6B0\uC800 \uC885\uB8CC \uC624\uB958:", closeError);
        }
      }
      let errorMessage = "PDF \uBCC0\uD658\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(`PDF \uBCC0\uD658 \uC2E4\uD328: ${errorMessage}`);
    }
  }
  /**
   * Workbook을 HTML로 변환
   */
  static async generateHTMLFromWorkbook(workbook) {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Malgun Gothic', sans-serif;
      margin: 0;
      padding: 0;
    }
    .page-break {
      page-break-after: always;
    }
    h2 {
      color: #333;
      border-bottom: 2px solid #3B82F6;
      padding-bottom: 5px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .number {
      text-align: right;
    }
    .center {
      text-align: center;
    }
    .total-row {
      font-weight: bold;
      background-color: #f9f9f9;
    }
  </style>
</head>
<body>
`;
    workbook.eachSheet((worksheet, sheetId) => {
      if (worksheet.name.toLowerCase().startsWith("input")) {
        return;
      }
      if (sheetId > 1) {
        html += '<div class="page-break"></div>';
      }
      html += `<h2>${worksheet.name}</h2>`;
      html += "<table>";
      worksheet.eachRow((row, rowNumber) => {
        html += "<tr>";
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const value = cell.value || "";
          const isHeader = rowNumber === 1;
          const tag = isHeader ? "th" : "td";
          let className = "";
          if (typeof value === "number") {
            className = "number";
          }
          const colspan = cell.model.colspan || 1;
          const rowspan = cell.model.rowspan || 1;
          html += `<${tag} class="${className}"`;
          if (colspan > 1) html += ` colspan="${colspan}"`;
          if (rowspan > 1) html += ` rowspan="${rowspan}"`;
          html += `>${this.formatCellValue(value)}</${tag}>`;
        });
        html += "</tr>";
      });
      html += "</table>";
    });
    html += `
</body>
</html>
`;
    return html;
  }
  /**
   * 셀 값 포맷팅
   */
  static formatCellValue(value) {
    if (value === null || value === void 0) {
      return "";
    }
    if (value instanceof Date) {
      return value.toLocaleDateString("ko-KR");
    }
    if (typeof value === "number") {
      return value.toLocaleString("ko-KR");
    }
    if (value && typeof value === "object" && "richText" in value) {
      return value.richText.map((rt) => rt.text).join("");
    }
    return String(value);
  }
  /**
   * 여러 Excel 파일을 하나의 PDF로 병합
   */
  static async convertMultipleExcelsToPDF(excelPaths, outputPath) {
    try {
      const browser = await puppeteer2.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
      const page = await browser.newPage();
      let combinedHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Malgun Gothic', sans-serif;
      margin: 0;
      padding: 0;
    }
    .file-section {
      page-break-after: always;
    }
    .file-section:last-child {
      page-break-after: auto;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #3B82F6;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    h2 {
      color: #333;
      border-bottom: 2px solid #3B82F6;
      padding-bottom: 5px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .number {
      text-align: right;
    }
  </style>
</head>
<body>
`;
      for (let i = 0; i < excelPaths.length; i++) {
        const excelPath = excelPaths[i];
        const fileName = path5.basename(excelPath, path5.extname(excelPath));
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelPath);
        combinedHTML += `<div class="file-section">`;
        combinedHTML += `<h1>\uD30C\uC77C: ${fileName}</h1>`;
        const content = await this.generateHTMLFromWorkbook(workbook);
        const bodyContent = content.match(/<body>([\s\S]*)<\/body>/)?.[1] || "";
        combinedHTML += bodyContent;
        combinedHTML += `</div>`;
      }
      combinedHTML += `
</body>
</html>
`;
      await page.setContent(combinedHTML, { waitUntil: "networkidle0" });
      await page.pdf({
        path: outputPath,
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: {
          top: "20mm",
          bottom: "20mm",
          left: "15mm",
          right: "15mm"
        }
      });
      await browser.close();
      console.log(`\uD1B5\uD569 PDF \uC0DD\uC131 \uC644\uB8CC: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error("Multiple Excel to PDF \uBCC0\uD658 \uC624\uB958:", error);
      throw error;
    }
  }
};

// server/utils/po-template-processor.ts
init_db();
init_schema();
import { eq as eq6 } from "drizzle-orm";
import * as XLSX3 from "xlsx";
import { v4 as uuidv4 } from "uuid";
import fs6 from "fs";
var POTemplateProcessor = class _POTemplateProcessor {
  /**
   * Excel 파일에서 Input 시트를 파싱하여 발주서 데이터 추출
   */
  static parseInputSheet(filePath) {
    try {
      const buffer = fs6.readFileSync(filePath);
      const workbook = XLSX3.read(buffer, { type: "buffer" });
      const inputSheetName = workbook.SheetNames.find(
        (name) => name === "Input"
      );
      if (!inputSheetName) {
        return {
          success: false,
          totalOrders: 0,
          totalItems: 0,
          orders: [],
          error: "Input \uC2DC\uD2B8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
        };
      }
      const worksheet = workbook.Sheets[inputSheetName];
      const data = XLSX3.utils.sheet_to_json(worksheet, { header: 1 });
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
            vendorName,
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
   * 파싱된 발주서 데이터를 DB에 저장
   */
  static async saveToDatabase(orders, userId) {
    try {
      let savedOrders = 0;
      await db.transaction(async (tx) => {
        for (const orderData of orders) {
          const vendorId = await this.findOrCreateVendor(tx, orderData.vendorName);
          const projectId = await this.findOrCreateProject(tx, orderData.siteName);
          const [purchaseOrder] = await tx.insert(purchaseOrders).values({
            orderNumber: orderData.orderNumber,
            projectId,
            vendorId,
            userId,
            orderDate: /* @__PURE__ */ new Date(orderData.orderDate + "T00:00:00Z"),
            deliveryDate: orderData.dueDate ? /* @__PURE__ */ new Date(orderData.dueDate + "T00:00:00Z") : null,
            totalAmount: orderData.totalAmount,
            status: "draft",
            notes: `PO Template\uC5D0\uC11C \uC790\uB3D9 \uC0DD\uC131\uB428`
          }).returning();
          for (const item of orderData.items) {
            await tx.insert(purchaseOrderItems).values({
              orderId: purchaseOrder.id,
              itemName: item.itemName,
              specification: item.specification,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              majorCategory: item.categoryLv1,
              middleCategory: item.categoryLv2,
              minorCategory: item.categoryLv3,
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
   * 특정 시트들을 별도 파일로 추출 (Input 시트 제거)
   * xlwings 기반 완벽한 서식 보존
   */
  static async extractSheetsToFile(sourcePath, targetPath, sheetNames = ["\uAC11\uC9C0", "\uC744\uC9C0"]) {
    try {
      console.log(`\u{1F4C4} \uC2DC\uD2B8 \uCD94\uCD9C \uC2DC\uC791 (xlwings \uAE30\uBC18): ${sourcePath} -> ${targetPath}`);
      console.log(`[DEBUG] POTemplateProcessor.extractSheetsToFile called at ${(/* @__PURE__ */ new Date()).toISOString()}`);
      console.log(`[DEBUG] sourcePath: ${sourcePath}`);
      console.log(`[DEBUG] targetPath: ${targetPath}`);
      console.log(`[DEBUG] sheetNames: ${JSON.stringify(sheetNames)}`);
      const result = await _POTemplateProcessor.removeInputSheetOnly(
        sourcePath,
        targetPath,
        "Input"
      );
      if (result.success) {
        const extractedSheets = result.remainingSheets.filter(
          (sheetName) => sheetNames.includes(sheetName)
        );
        console.log(`\u2705 \uC2DC\uD2B8 \uCD94\uCD9C \uC644\uB8CC: ${extractedSheets.join(", ")}`);
        return {
          success: true,
          extractedSheets
        };
      } else {
        console.error(`\u274C \uC2DC\uD2B8 \uCD94\uCD9C \uC2E4\uD328: ${result.error}`);
        return {
          success: false,
          extractedSheets: [],
          error: result.error
        };
      }
    } catch (error) {
      console.error(`\u274C \uC2DC\uD2B8 \uCD94\uCD9C \uC624\uB958:`, error);
      return {
        success: false,
        extractedSheets: [],
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Input 시트만 제거하고 원본 형식을 유지한 엑셀 파일 생성
   * 기존 엑셀 파일의 모든 형식(셀 테두리, 병합, 색상, 서식 등)을 그대로 유지
   */
  static async removeInputSheetOnly(sourcePath, targetPath, inputSheetName = "Input") {
    try {
      console.log(`\u{1F4C4} Input \uC2DC\uD2B8 \uC81C\uAC70 \uC2DC\uC791: ${sourcePath} -> ${targetPath}`);
      console.log(`[DEBUG] POTemplateProcessor.removeInputSheetOnly called at ${(/* @__PURE__ */ new Date()).toISOString()}`);
      console.log(`[DEBUG] sourcePath: ${sourcePath}`);
      console.log(`[DEBUG] targetPath: ${targetPath}`);
      console.log(`[DEBUG] inputSheetName: ${inputSheetName}`);
      const result = await removeAllInputSheets(sourcePath, targetPath);
      if (result.success) {
        console.log(`\u2705 Input \uC2DC\uD2B8 \uC81C\uAC70 \uC644\uB8CC (\uC6D0\uBCF8 \uC11C\uC2DD \uBCF4\uC874\uB428)`);
      }
      return {
        success: result.success,
        removedSheet: result.removedSheets.length > 0,
        remainingSheets: result.remainingSheets,
        error: result.error
      };
    } catch (error) {
      console.error(`\u274C Input \uC2DC\uD2B8 \uC81C\uAC70 \uC911 \uC624\uB958:`, error);
      return {
        success: false,
        removedSheet: false,
        remainingSheets: [],
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
        const date2 = new Date((dateValue - 25569) * 86400 * 1e3);
        return date2.toISOString().split("T")[0];
      }
      if (typeof dateValue === "string") {
        let dateStr = dateValue.trim();
        if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
          dateStr = dateStr.replace(/\./g, "-");
        }
        const date2 = new Date(dateStr);
        if (!isNaN(date2.getTime())) {
          return date2.toISOString().split("T")[0];
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
  static async findOrCreateVendor(tx, vendorName) {
    if (!vendorName) {
      const [vendor] = await tx.insert(vendors).values({
        name: "\uBBF8\uC9C0\uC815 \uAC70\uB798\uCC98",
        contactPerson: "\uBBF8\uC9C0\uC815",
        email: `unknown-${uuidv4()}@example.com`,
        mainContact: "\uBBF8\uC9C0\uC815"
      }).returning();
      return vendor.id;
    }
    const existingVendor = await tx.select().from(vendors).where(eq6(vendors.name, vendorName)).limit(1);
    if (existingVendor.length > 0) {
      return existingVendor[0].id;
    }
    const [newVendor] = await tx.insert(vendors).values({
      name: vendorName,
      contactPerson: "\uC790\uB3D9\uC0DD\uC131",
      email: `auto-${uuidv4()}@example.com`,
      mainContact: "\uC790\uB3D9\uC0DD\uC131"
    }).returning();
    return newVendor.id;
  }
  static async findOrCreateProject(tx, siteName) {
    if (!siteName) {
      const [project] = await tx.insert(projects).values({
        projectName: "\uBBF8\uC9C0\uC815 \uD604\uC7A5",
        projectCode: `AUTO-${uuidv4().slice(0, 8)}`,
        status: "active"
      }).returning();
      return project.id;
    }
    const existingProject = await tx.select().from(projects).where(eq6(projects.projectName, siteName)).limit(1);
    if (existingProject.length > 0) {
      return existingProject[0].id;
    }
    const [newProject] = await tx.insert(projects).values({
      projectName: siteName,
      projectCode: `AUTO-${uuidv4().slice(0, 8)}`,
      status: "active"
    }).returning();
    return newProject.id;
  }
};

// server/utils/po-email-service.ts
var POEmailService = class {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.naver.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  /**
   * Input 시트만 제거한 원본 형식 유지 엑셀과 PDF로 첨부하여 이메일 발송
   * 기존 방식과 달리 엑셀 파일의 원본 형식(테두리, 병합, 색상 등)을 그대로 유지
   */
  async sendPOWithOriginalFormat(originalFilePath, emailOptions) {
    try {
      const timestamp2 = Date.now();
      const uploadsDir = path6.join(__dirname, "../../uploads");
      const processedPath = path6.join(uploadsDir, `po-advanced-format-${timestamp2}.xlsx`);
      const removeResult = await removeAllInputSheets(
        originalFilePath,
        processedPath
      );
      if (!removeResult.success) {
        return {
          success: false,
          error: `Input \uC2DC\uD2B8 \uC81C\uAC70 \uC2E4\uD328: ${removeResult.error}`
        };
      }
      console.log(`\u{1F4C4} \uACE0\uAE09 \uD615\uC2DD \uBCF4\uC874 \uD30C\uC77C \uC0DD\uC131: ${processedPath}`);
      console.log(`\u{1F3AF} Input \uC2DC\uD2B8 \uC81C\uAC70 \uC644\uB8CC`);
      console.log(`\u{1F4CB} \uB0A8\uC740 \uC2DC\uD2B8: ${removeResult.remainingSheets.join(", ")}`);
      const pdfPath = path6.join(uploadsDir, `po-advanced-format-${timestamp2}.pdf`);
      let pdfResult = { success: false, error: "" };
      try {
        await ExcelToPDFConverter.convertExcelToPDF(processedPath, pdfPath);
        pdfResult.success = true;
        console.log(`\u2705 PDF \uBCC0\uD658 \uC131\uACF5: ${pdfPath}`);
      } catch (error) {
        try {
          pdfResult = await convertExcelToPdf(processedPath, pdfPath, removeResult.remainingSheets);
        } catch (fallbackError) {
          pdfResult.error = `PDF \uBCC0\uD658 \uC2E4\uD328: ${error}`;
          console.warn(`\u26A0\uFE0F PDF \uBCC0\uD658 \uC2E4\uD328: ${pdfResult.error}, Excel \uD30C\uC77C\uB9CC \uCCA8\uBD80\uD569\uB2C8\uB2E4.`);
        }
      }
      const attachments2 = [];
      if (fs7.existsSync(processedPath)) {
        attachments2.push({
          filename: `\uBC1C\uC8FC\uC11C_${emailOptions.orderNumber || timestamp2}.xlsx`,
          path: processedPath,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        console.log(`\u{1F4CE} Excel \uCCA8\uBD80\uD30C\uC77C \uCD94\uAC00: \uBC1C\uC8FC\uC11C_${emailOptions.orderNumber || timestamp2}.xlsx`);
      }
      if (pdfResult.success && fs7.existsSync(pdfPath)) {
        attachments2.push({
          filename: `\uBC1C\uC8FC\uC11C_${emailOptions.orderNumber || timestamp2}.pdf`,
          path: pdfPath,
          contentType: "application/pdf"
        });
        console.log(`\u{1F4CE} PDF \uCCA8\uBD80\uD30C\uC77C \uCD94\uAC00: \uBC1C\uC8FC\uC11C_${emailOptions.orderNumber || timestamp2}.pdf`);
      }
      if (attachments2.length === 0) {
        return {
          success: false,
          error: "\uCCA8\uBD80\uD560 \uD30C\uC77C\uC774 \uC0DD\uC131\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4."
        };
      }
      const emailContent = this.generateEmailContent(emailOptions);
      const result = await this.sendEmail({
        to: emailOptions.to,
        cc: emailOptions.cc,
        bcc: emailOptions.bcc,
        subject: emailOptions.subject || `\uBC1C\uC8FC\uC11C \uC804\uC1A1 - ${emailOptions.orderNumber || ""}`,
        html: emailContent,
        attachments: attachments2
      });
      this.cleanupTempFiles([processedPath, pdfPath]);
      if (result.success) {
        console.log(`\u2705 \uC6D0\uBCF8 \uD615\uC2DD \uC720\uC9C0 \uC774\uBA54\uC77C \uBC1C\uC1A1 \uC131\uACF5: ${emailOptions.to}`);
      }
      return result;
    } catch (error) {
      console.error("\u274C \uC6D0\uBCF8 \uD615\uC2DD \uC720\uC9C0 \uC774\uBA54\uC77C \uBC1C\uC1A1 \uC624\uB958:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * [기존 방식] 갑지/을지 시트를 Excel과 PDF로 첨부하여 이메일 발송
   * @deprecated 형식 손상 문제로 sendPOWithOriginalFormat 사용 권장
   */
  async sendPOWithAttachments(originalFilePath, emailOptions) {
    try {
      const timestamp2 = Date.now();
      const uploadsDir = path6.join(__dirname, "../../uploads");
      const extractedPath = path6.join(uploadsDir, `po-sheets-${timestamp2}.xlsx`);
      const extractResult = POTemplateProcessor.extractSheetsToFile(
        originalFilePath,
        extractedPath,
        ["\uAC11\uC9C0", "\uC744\uC9C0"]
      );
      const extractResultData = await extractResult;
      if (!extractResultData.success) {
        return {
          success: false,
          error: `\uC2DC\uD2B8 \uCD94\uCD9C \uC2E4\uD328: ${extractResultData.error}`
        };
      }
      const pdfPath = path6.join(uploadsDir, `po-sheets-${timestamp2}.pdf`);
      const pdfResult = await convertExcelToPdf(extractedPath, pdfPath, ["\uAC11\uC9C0", "\uC744\uC9C0"]);
      if (!pdfResult.success) {
        return {
          success: false,
          error: `PDF \uBCC0\uD658 \uC2E4\uD328: ${pdfResult.error}`
        };
      }
      const attachments2 = [];
      if (fs7.existsSync(extractedPath)) {
        attachments2.push({
          filename: `\uBC1C\uC8FC\uC11C_${emailOptions.orderNumber || timestamp2}.xlsx`,
          path: extractedPath,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
      }
      if (fs7.existsSync(pdfPath)) {
        attachments2.push({
          filename: `\uBC1C\uC8FC\uC11C_${emailOptions.orderNumber || timestamp2}.pdf`,
          path: pdfPath,
          contentType: "application/pdf"
        });
      }
      const emailContent = this.generateEmailContent(emailOptions);
      const result = await this.sendEmail({
        to: emailOptions.to,
        cc: emailOptions.cc,
        bcc: emailOptions.bcc,
        subject: emailOptions.subject,
        html: emailContent,
        attachments: attachments2
      });
      this.cleanupTempFiles([extractedPath, pdfPath]);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * 기본 이메일 발송
   */
  async sendEmail(options) {
    try {
      const info = await this.transporter.sendMail({
        from: `"\uBC1C\uC8FC \uC2DC\uC2A4\uD15C" <${process.env.SMTP_USER}>`,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        cc: options.cc ? Array.isArray(options.cc) ? options.cc.join(", ") : options.cc : void 0,
        bcc: options.bcc ? Array.isArray(options.bcc) ? options.bcc.join(", ") : options.bcc : void 0,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          path: att.path,
          contentType: att.contentType
        }))
      });
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * 이메일 내용 생성
   */
  generateEmailContent(options) {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW"
      }).format(amount);
    };
    const formatDate = (dateString) => {
      try {
        const date2 = new Date(dateString);
        return date2.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      } catch {
        return dateString;
      }
    };
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Malgun Gothic', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            
            .header {
              background-color: #007bff;
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            
            .content {
              background-color: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            
            .info-table th,
            .info-table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            
            .info-table th {
              background-color: #e9ecef;
              font-weight: bold;
              width: 30%;
            }
            
            .attachments {
              background-color: #e7f3ff;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>\u{1F4CB} \uBC1C\uC8FC\uC11C \uC1A1\uBD80</h1>
            <p>\uAD6C\uB9E4 \uBC1C\uC8FC \uAD00\uB9AC \uC2DC\uC2A4\uD15C</p>
          </div>
          
          <div class="content">
            <p>\uC548\uB155\uD558\uC138\uC694,</p>
            <p>\uBC1C\uC8FC\uC11C\uB97C \uC1A1\uBD80\uB4DC\uB9BD\uB2C8\uB2E4. \uCCA8\uBD80\uB41C \uD30C\uC77C\uC744 \uD655\uC778\uD558\uC5EC \uC8FC\uC2DC\uAE30 \uBC14\uB78D\uB2C8\uB2E4.</p>
            
            ${options.orderNumber ? `
              <table class="info-table">
                <tr>
                  <th>\uBC1C\uC8FC\uBC88\uD638</th>
                  <td>${options.orderNumber}</td>
                </tr>
                ${options.vendorName ? `
                  <tr>
                    <th>\uAC70\uB798\uCC98\uBA85</th>
                    <td>${options.vendorName}</td>
                  </tr>
                ` : ""}
                ${options.orderDate ? `
                  <tr>
                    <th>\uBC1C\uC8FC\uC77C\uC790</th>
                    <td>${formatDate(options.orderDate)}</td>
                  </tr>
                ` : ""}
                ${options.dueDate ? `
                  <tr>
                    <th>\uB0A9\uAE30\uC77C\uC790</th>
                    <td>${formatDate(options.dueDate)}</td>
                  </tr>
                ` : ""}
                ${options.totalAmount ? `
                  <tr>
                    <th>\uCD1D \uAE08\uC561</th>
                    <td><strong>${formatCurrency(options.totalAmount)}</strong></td>
                  </tr>
                ` : ""}
              </table>
            ` : ""}
            
            <div class="attachments">
              <h3>\u{1F4CE} \uCCA8\uBD80\uD30C\uC77C</h3>
              <ul>
                <li>\uBC1C\uC8FC\uC11C.xlsx (Excel \uD30C\uC77C)</li>
                <li>\uBC1C\uC8FC\uC11C.pdf (PDF \uD30C\uC77C)</li>
              </ul>
              <p><small>* \uAC11\uC9C0\uC640 \uC744\uC9C0 \uC2DC\uD2B8\uAC00 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.</small></p>
            </div>
            
            ${options.additionalMessage ? `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>\u{1F4DD} \uCD94\uAC00 \uC548\uB0B4\uC0AC\uD56D</h3>
                <p>${options.additionalMessage}</p>
              </div>
            ` : ""}
            
            <p>
              \uBC1C\uC8FC\uC11C \uAC80\uD1A0 \uD6C4 \uD655\uC778 \uD68C\uC2E0 \uBD80\uD0C1\uB4DC\uB9BD\uB2C8\uB2E4.<br>
              \uBB38\uC758\uC0AC\uD56D\uC774 \uC788\uC73C\uC2DC\uBA74 \uC5B8\uC81C\uB4E0\uC9C0 \uC5F0\uB77D\uC8FC\uC2DC\uAE30 \uBC14\uB78D\uB2C8\uB2E4.
            </p>
            
            <p>\uAC10\uC0AC\uD569\uB2C8\uB2E4.</p>
          </div>
          
          <div class="footer">
            <p>
              \uC774 \uBA54\uC77C\uC740 \uAD6C\uB9E4 \uBC1C\uC8FC \uAD00\uB9AC \uC2DC\uC2A4\uD15C\uC5D0\uC11C \uC790\uB3D9\uC73C\uB85C \uBC1C\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4.<br>
              \uBC1C\uC1A1 \uC2DC\uAC04: ${(/* @__PURE__ */ new Date()).toLocaleString("ko-KR")}
            </p>
          </div>
        </body>
      </html>
    `;
  }
  /**
   * 임시 파일 정리
   */
  cleanupTempFiles(filePaths) {
    filePaths.forEach((filePath) => {
      try {
        if (fs7.existsSync(filePath)) {
          fs7.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`\uD30C\uC77C \uC815\uB9AC \uC2E4\uD328: ${filePath}`, error);
      }
    });
  }
  /**
   * 이메일 연결 테스트
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
};

// server/utils/excel-automation-service.ts
import fs8 from "fs";
import path7 from "path";
var ExcelAutomationService = class {
  /**
   * 1단계: Excel 파일 업로드 및 파싱, DB 저장
   */
  static async processExcelUpload(filePath, userId) {
    DebugLogger.logFunctionEntry("ExcelAutomationService.processExcelUpload", {
      filePath,
      userId
    });
    try {
      const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
      if (!parseResult.success) {
        return {
          success: false,
          error: `Excel \uD30C\uC2F1 \uC2E4\uD328: ${parseResult.error}`
        };
      }
      const saveResult = await POTemplateProcessorMock.saveToDatabase(
        parseResult.orders || [],
        userId
      );
      if (!saveResult.success) {
        return {
          success: false,
          error: `DB \uC800\uC7A5 \uC2E4\uD328: ${saveResult.error}`
        };
      }
      const vendorValidation = await this.validateVendorsFromExcel(filePath);
      const emailPreview = await this.generateEmailPreview(filePath, vendorValidation);
      const result = {
        success: true,
        data: {
          savedOrders: saveResult.savedOrders,
          vendorValidation,
          emailPreview
        }
      };
      DebugLogger.logFunctionExit("ExcelAutomationService.processExcelUpload", result);
      return result;
    } catch (error) {
      DebugLogger.logError("ExcelAutomationService.processExcelUpload", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * 2단계: 거래처명 검증 및 이메일 추출
   */
  static async validateVendorsFromExcel(filePath) {
    DebugLogger.logFunctionEntry("ExcelAutomationService.validateVendorsFromExcel", { filePath });
    try {
      const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
      if (!parseResult.success || !parseResult.orders) {
        throw new Error("Excel \uD30C\uC2F1 \uC2E4\uD328");
      }
      const allVendorNames = [];
      const allDeliveryNames = [];
      for (const order of parseResult.orders) {
        if (order.vendorName && order.vendorName.trim()) {
          allVendorNames.push(order.vendorName.trim());
        }
        for (const item of order.items) {
          if (item.vendorName && item.vendorName.trim()) {
            allVendorNames.push(item.vendorName.trim());
          }
          if (item.deliveryName && item.deliveryName.trim()) {
            allDeliveryNames.push(item.deliveryName.trim());
          }
        }
      }
      const uniqueVendorNames = Array.from(new Set(allVendorNames));
      const uniqueDeliveryNames = Array.from(new Set(allDeliveryNames));
      console.log(`\u{1F4CB} \uAC80\uC99D\uD560 \uAC70\uB798\uCC98\uBA85 (${uniqueVendorNames.length}\uAC1C): ${uniqueVendorNames.join(", ")}`);
      console.log(`\u{1F4CB} \uAC80\uC99D\uD560 \uB0A9\uD488\uCC98\uBA85 (${uniqueDeliveryNames.length}\uAC1C): ${uniqueDeliveryNames.join(", ")}`);
      const vendorDeliveryPairs = [];
      for (const order of parseResult.orders) {
        for (const item of order.items) {
          const vendorName = item.vendorName?.trim() || order.vendorName?.trim() || "";
          const deliveryName = item.deliveryName?.trim() || vendorName;
          if (vendorName) {
            vendorDeliveryPairs.push({
              vendorName,
              deliveryName
            });
          }
        }
      }
      const uniquePairs = vendorDeliveryPairs.filter(
        (pair, index2, self) => self.findIndex((p) => p.vendorName === pair.vendorName && p.deliveryName === pair.deliveryName) === index2
      );
      console.log(`\u{1F4CB} \uAC80\uC99D\uD560 \uAC70\uB798\uCC98-\uB0A9\uD488\uCC98 \uC30D (${uniquePairs.length}\uAC1C): ${uniquePairs.map((p) => `${p.vendorName}\u2192${p.deliveryName}`).join(", ")}`);
      const vendorData = uniquePairs.map((pair) => ({
        vendorName: pair.vendorName,
        deliveryName: pair.deliveryName,
        email: void 0
        // 이메일은 별도로 추출하지 않음
      }));
      const validationResults = await validateMultipleVendors(vendorData);
      const validVendors = [];
      const invalidVendors = [];
      for (const result of validationResults.vendorValidations) {
        if (result.exists && result.exactMatch) {
          validVendors.push({
            vendorName: result.vendorName,
            email: result.exactMatch.email,
            vendorId: result.exactMatch.id
          });
        } else {
          invalidVendors.push({
            vendorName: result.vendorName,
            suggestions: result.suggestions.map((s) => ({
              id: s.id,
              name: s.name,
              email: s.email,
              similarity: s.similarity
            }))
          });
        }
      }
      const validationStep = {
        validVendors,
        invalidVendors,
        needsUserAction: invalidVendors.length > 0
      };
      console.log(`\u2705 \uC720\uD6A8\uD55C \uAC70\uB798\uCC98: ${validVendors.length}\uAC1C`);
      console.log(`\u26A0\uFE0F \uD655\uC778 \uD544\uC694\uD55C \uAC70\uB798\uCC98: ${invalidVendors.length}\uAC1C`);
      return validationStep;
    } catch (error) {
      DebugLogger.logError("ExcelAutomationService.validateVendorsFromExcel", error);
      return {
        validVendors: [],
        invalidVendors: [],
        needsUserAction: true
      };
    }
  }
  /**
   * 3단계: 이메일 미리보기 생성
   */
  static async generateEmailPreview(filePath, vendorValidation) {
    DebugLogger.logFunctionEntry("ExcelAutomationService.generateEmailPreview", {
      filePath,
      validVendorCount: vendorValidation.validVendors.length
    });
    try {
      const recipients = Array.from(
        new Set(vendorValidation.validVendors.map((v) => v.email))
      ).filter((email) => email && email.trim());
      const timestamp2 = Date.now();
      const processedPath = path7.join(
        path7.dirname(filePath),
        `processed-${timestamp2}.xlsx`
      );
      await removeAllInputSheets(filePath, processedPath);
      const pdfPath = processedPath.replace(/\.(xlsx?)$/i, ".pdf");
      console.log(`\u{1F4C4} Excel\uC744 PDF\uB85C \uBCC0\uD658 \uC2DC\uB3C4 \uC911: ${pdfPath}`);
      let pdfConversionSuccess = false;
      try {
        await ExcelToPDFConverter.convertExcelToPDF(processedPath, pdfPath);
        pdfConversionSuccess = true;
        console.log(`\u2705 PDF \uBCC0\uD658 \uC131\uACF5: ${pdfPath}`);
      } catch (pdfError) {
        console.error("\u26A0\uFE0F PDF \uBCC0\uD658 \uC2E4\uD328 - Excel \uD30C\uC77C\uB9CC \uCCA8\uBD80\uB429\uB2C8\uB2E4:", pdfError);
      }
      const stats = fs8.statSync(processedPath);
      const pdfStats = pdfConversionSuccess && fs8.existsSync(pdfPath) ? fs8.statSync(pdfPath) : null;
      const emailPreview = {
        recipients,
        subject: `\uBC1C\uC8FC\uC11C - ${path7.basename(filePath, path7.extname(filePath))} (${(/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR")})`,
        attachmentInfo: {
          originalFile: path7.basename(filePath),
          processedFile: path7.basename(processedPath),
          processedPdfFile: pdfStats ? path7.basename(pdfPath) : void 0,
          fileSize: stats.size,
          pdfFileSize: pdfStats ? pdfStats.size : void 0
        },
        canProceed: recipients.length > 0 && !vendorValidation.needsUserAction
      };
      console.log(`\u{1F4E7} \uC774\uBA54\uC77C \uC218\uC2E0\uC790: ${recipients.join(", ")}`);
      console.log(`\u{1F4CE} \uCCA8\uBD80\uD30C\uC77C: ${emailPreview.attachmentInfo.processedFile} (${Math.round(stats.size / 1024)}KB)`);
      if (pdfStats) {
        console.log(`\u{1F4C4} PDF \uD30C\uC77C: ${emailPreview.attachmentInfo.processedPdfFile} (${Math.round(pdfStats.size / 1024)}KB)`);
      }
      return emailPreview;
    } catch (error) {
      DebugLogger.logError("ExcelAutomationService.generateEmailPreview", error);
      return {
        recipients: [],
        subject: "",
        attachmentInfo: {
          originalFile: "",
          processedFile: "",
          fileSize: 0
        },
        canProceed: false
      };
    }
  }
  /**
   * 4단계: 이메일 발송 실행 (Excel과 PDF 첨부)
   */
  static async sendEmails(processedFilePath, recipients, emailOptions = {}) {
    DebugLogger.logFunctionEntry("ExcelAutomationService.sendEmails", {
      processedFilePath,
      recipients,
      emailOptions
    });
    try {
      const emailService = new POEmailService();
      const emailResults = [];
      const failedEmails = [];
      for (const email of recipients) {
        try {
          console.log(`\u{1F4E7} \uC774\uBA54\uC77C \uBC1C\uC1A1 \uC911: ${email}`);
          const sendResult = await emailService.sendPOWithOriginalFormat(
            processedFilePath,
            {
              to: email,
              subject: emailOptions.subject || `\uBC1C\uC8FC\uC11C - ${(/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR")}`,
              orderNumber: emailOptions.orderNumber,
              additionalMessage: emailOptions.additionalMessage
            }
          );
          if (sendResult.success) {
            emailResults.push({
              email,
              status: "sent",
              messageId: sendResult.messageId
            });
          } else {
            throw new Error(sendResult.error || "Email sending failed");
          }
          console.log(`\u2705 \uC774\uBA54\uC77C \uBC1C\uC1A1 \uC131\uACF5: ${email}`);
        } catch (emailError) {
          const errorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
          emailResults.push({
            email,
            status: "failed",
            error: errorMessage
          });
          failedEmails.push({
            email,
            error: errorMessage
          });
          console.error(`\u274C \uC774\uBA54\uC77C \uBC1C\uC1A1 \uC2E4\uD328: ${email} - ${errorMessage}`);
        }
      }
      const result = {
        success: failedEmails.length === 0,
        sentEmails: emailResults.filter((r) => r.status === "sent").length,
        failedEmails,
        emailResults
      };
      DebugLogger.logFunctionExit("ExcelAutomationService.sendEmails", result);
      return result;
    } catch (error) {
      DebugLogger.logError("ExcelAutomationService.sendEmails", error);
      return {
        success: false,
        sentEmails: 0,
        failedEmails: recipients.map((email) => ({
          email,
          error: error instanceof Error ? error.message : "Unknown error"
        })),
        emailResults: []
      };
    }
  }
  /**
   * 거래처 선택 결과를 반영하여 이메일 미리보기 업데이트
   */
  static async updateEmailPreviewWithVendorSelection(filePath, selectedVendors) {
    DebugLogger.logFunctionEntry("ExcelAutomationService.updateEmailPreviewWithVendorSelection", {
      filePath,
      selectedVendors
    });
    try {
      const recipients = Array.from(
        new Set(selectedVendors.map((v) => v.selectedVendorEmail))
      ).filter((email) => email && email.trim());
      const timestamp2 = Date.now();
      const processedPath = path7.join(
        path7.dirname(filePath),
        `processed-${timestamp2}.xlsx`
      );
      await removeAllInputSheets(filePath, processedPath);
      const pdfPath = processedPath.replace(/\.(xlsx?)$/i, ".pdf");
      console.log(`\u{1F4C4} Excel\uC744 PDF\uB85C \uBCC0\uD658 \uC2DC\uB3C4 \uC911: ${pdfPath}`);
      let pdfConversionSuccess = false;
      try {
        await ExcelToPDFConverter.convertExcelToPDF(processedPath, pdfPath);
        pdfConversionSuccess = true;
        console.log(`\u2705 PDF \uBCC0\uD658 \uC131\uACF5: ${pdfPath}`);
      } catch (pdfError) {
        console.error("\u26A0\uFE0F PDF \uBCC0\uD658 \uC2E4\uD328 - Excel \uD30C\uC77C\uB9CC \uCCA8\uBD80\uB429\uB2C8\uB2E4:", pdfError);
      }
      const stats = fs8.statSync(processedPath);
      const pdfStats = pdfConversionSuccess && fs8.existsSync(pdfPath) ? fs8.statSync(pdfPath) : null;
      return {
        recipients,
        subject: `\uBC1C\uC8FC\uC11C - ${path7.basename(filePath, path7.extname(filePath))} (${(/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR")})`,
        attachmentInfo: {
          originalFile: path7.basename(filePath),
          processedFile: path7.basename(processedPath),
          processedPdfFile: pdfStats ? path7.basename(pdfPath) : void 0,
          fileSize: stats.size,
          pdfFileSize: pdfStats ? pdfStats.size : void 0
        },
        canProceed: recipients.length > 0
      };
    } catch (error) {
      DebugLogger.logError("ExcelAutomationService.updateEmailPreviewWithVendorSelection", error);
      return {
        recipients: [],
        subject: "",
        attachmentInfo: {
          originalFile: "",
          processedFile: "",
          fileSize: 0
        },
        canProceed: false
      };
    }
  }
};

// server/routes/excel-automation.ts
var router9 = Router9();
var storage2 = multer2.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir2 = "uploads";
    if (!fs9.existsSync(uploadDir2)) {
      fs9.mkdirSync(uploadDir2, { recursive: true });
    }
    cb(null, uploadDir2);
  },
  filename: (req, file, cb) => {
    const timestamp2 = Date.now();
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    cb(null, `${timestamp2}-${originalName}`);
  }
});
var upload2 = multer2({
  storage: storage2,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // .xlsx
      "application/vnd.ms-excel.sheet.macroEnabled.12",
      // .xlsm (대문자 E)
      "application/vnd.ms-excel.sheet.macroenabled.12",
      // .xlsm (소문자 e)
      "application/vnd.ms-excel"
      // .xls
    ];
    if (allowedTypes.includes(file.mimetype)) {
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
router9.post("/upload-and-process", requireAuth, upload2.single("file"), async (req, res) => {
  DebugLogger.logExecutionPath("/api/excel-automation/upload-and-process", "ExcelAutomationService.processExcelUpload");
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "\uD30C\uC77C\uC774 \uC5C5\uB85C\uB4DC\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4."
      });
    }
    const filePath = req.file.path;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "\uC0AC\uC6A9\uC790 \uC778\uC99D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
      });
    }
    console.log(`\u{1F4C1} Excel \uC790\uB3D9\uD654 \uCC98\uB9AC \uC2DC\uC791: ${filePath}`);
    const result = await ExcelAutomationService.processExcelUpload(filePath, userId);
    if (!result.success) {
      if (fs9.existsSync(filePath)) {
        fs9.unlinkSync(filePath);
      }
      return res.status(400).json(result);
    }
    res.json({
      success: true,
      message: "Excel \uD30C\uC77C \uCC98\uB9AC \uC644\uB8CC",
      data: {
        ...result.data,
        filePath,
        fileName: req.file.originalname,
        fileSize: req.file.size
      }
    });
  } catch (error) {
    console.error("Excel \uC790\uB3D9\uD654 \uCC98\uB9AC \uC624\uB958:", error);
    if (req.file?.path && fs9.existsSync(req.file.path)) {
      fs9.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: "\uC11C\uBC84 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router9.post("/update-email-preview", requireAuth, async (req, res) => {
  DebugLogger.logExecutionPath("/api/excel-automation/update-email-preview", "ExcelAutomationService.updateEmailPreviewWithVendorSelection");
  try {
    const { filePath, selectedVendors } = req.body;
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "\uD30C\uC77C \uACBD\uB85C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4."
      });
    }
    if (!Array.isArray(selectedVendors)) {
      return res.status(400).json({
        success: false,
        error: "\uC120\uD0DD\uB41C \uAC70\uB798\uCC98 \uC815\uBCF4\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4."
      });
    }
    console.log(`\u{1F4E7} \uC774\uBA54\uC77C \uBBF8\uB9AC\uBCF4\uAE30 \uC5C5\uB370\uC774\uD2B8: ${selectedVendors.length}\uAC1C \uAC70\uB798\uCC98`);
    const emailPreview = await ExcelAutomationService.updateEmailPreviewWithVendorSelection(
      filePath,
      selectedVendors
    );
    res.json({
      success: true,
      message: "\uC774\uBA54\uC77C \uBBF8\uB9AC\uBCF4\uAE30 \uC5C5\uB370\uC774\uD2B8 \uC644\uB8CC",
      data: { emailPreview }
    });
  } catch (error) {
    console.error("\uC774\uBA54\uC77C \uBBF8\uB9AC\uBCF4\uAE30 \uC5C5\uB370\uC774\uD2B8 \uC624\uB958:", error);
    res.status(500).json({
      success: false,
      error: "\uC11C\uBC84 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router9.post("/send-emails", requireAuth, async (req, res) => {
  DebugLogger.logExecutionPath("/api/excel-automation/send-emails", "ExcelAutomationService.sendEmails");
  try {
    const {
      processedFilePath,
      recipients,
      emailOptions = {}
    } = req.body;
    if (!processedFilePath) {
      return res.status(400).json({
        success: false,
        error: "\uCC98\uB9AC\uB41C \uD30C\uC77C \uACBD\uB85C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4."
      });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: "\uC774\uBA54\uC77C \uC218\uC2E0\uC790\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4."
      });
    }
    if (!fs9.existsSync(processedFilePath)) {
      return res.status(400).json({
        success: false,
        error: "\uCC98\uB9AC\uB41C \uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
      });
    }
    console.log(`\u{1F4E7} \uC774\uBA54\uC77C \uBC1C\uC1A1 \uC2DC\uC791: ${recipients.length}\uBA85`);
    const sendResult = await ExcelAutomationService.sendEmails(
      processedFilePath,
      recipients,
      emailOptions
    );
    res.json({
      success: sendResult.success,
      message: sendResult.success ? `\uC774\uBA54\uC77C \uBC1C\uC1A1 \uC644\uB8CC (\uC131\uACF5: ${sendResult.sentEmails}\uAC1C)` : `\uC774\uBA54\uC77C \uBC1C\uC1A1 \uBD80\uBD84 \uC2E4\uD328 (\uC131\uACF5: ${sendResult.sentEmails}\uAC1C, \uC2E4\uD328: ${sendResult.failedEmails.length}\uAC1C)`,
      data: sendResult
    });
  } catch (error) {
    console.error("\uC774\uBA54\uC77C \uBC1C\uC1A1 \uC624\uB958:", error);
    res.status(500).json({
      success: false,
      error: "\uC11C\uBC84 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router9.post("/validate-vendors", requireAuth, async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath || !fs9.existsSync(filePath)) {
      return res.status(400).json({
        success: false,
        error: "\uC720\uD6A8\uD55C \uD30C\uC77C \uACBD\uB85C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4."
      });
    }
    const vendorValidation = await ExcelAutomationService.validateVendorsFromExcel(filePath);
    res.json({
      success: true,
      message: "\uAC70\uB798\uCC98 \uAC80\uC99D \uC644\uB8CC",
      data: { vendorValidation }
    });
  } catch (error) {
    console.error("\uAC70\uB798\uCC98 \uAC80\uC99D \uC624\uB958:", error);
    res.status(500).json({
      success: false,
      error: "\uC11C\uBC84 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router9.get("/download/:filename", requireAuth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path8.join("uploads", filename);
    if (!fs9.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "\uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
      });
    }
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error("\uD30C\uC77C \uB2E4\uC6B4\uB85C\uB4DC \uC624\uB958:", err);
        res.status(500).json({
          success: false,
          error: "\uD30C\uC77C \uB2E4\uC6B4\uB85C\uB4DC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
        });
      }
    });
  } catch (error) {
    console.error("\uD30C\uC77C \uB2E4\uC6B4\uB85C\uB4DC \uC624\uB958:", error);
    res.status(500).json({
      success: false,
      error: "\uC11C\uBC84 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
    });
  }
});
router9.delete("/cleanup", requireAuth, async (req, res) => {
  try {
    const { filePaths } = req.body;
    if (!Array.isArray(filePaths)) {
      return res.status(400).json({
        success: false,
        error: "\uD30C\uC77C \uACBD\uB85C \uBC30\uC5F4\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
      });
    }
    let deletedCount = 0;
    const errors = [];
    for (const filePath of filePaths) {
      try {
        if (fs9.existsSync(filePath)) {
          fs9.unlinkSync(filePath);
          deletedCount++;
          console.log(`\u{1F5D1}\uFE0F \uD30C\uC77C \uC0AD\uC81C: ${filePath}`);
        }
      } catch (error) {
        const errorMsg = `${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`;
        errors.push(errorMsg);
        console.error(`\u274C \uD30C\uC77C \uC0AD\uC81C \uC2E4\uD328: ${errorMsg}`);
      }
    }
    res.json({
      success: errors.length === 0,
      message: `\uD30C\uC77C \uC815\uB9AC \uC644\uB8CC (\uC0AD\uC81C: ${deletedCount}\uAC1C, \uC2E4\uD328: ${errors.length}\uAC1C)`,
      data: {
        deletedCount,
        errors
      }
    });
  } catch (error) {
    console.error("\uD30C\uC77C \uC815\uB9AC \uC624\uB958:", error);
    res.status(500).json({
      success: false,
      error: "\uC11C\uBC84 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
    });
  }
});
var excel_automation_default = router9;

// server/routes/po-template-real.ts
import { Router as Router10 } from "express";
import multer3 from "multer";
import path12 from "path";
import fs13 from "fs";
import { fileURLToPath as fileURLToPath3 } from "url";

// server/utils/po-email-service-mock.ts
import nodemailer2 from "nodemailer";
import path9 from "path";
import fs10 from "fs";
import { fileURLToPath as fileURLToPath2 } from "url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname3 = path9.dirname(__filename2);
var POEmailServiceMock = class {
  constructor() {
    this.transporter = null;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer2.createTransport({
        host: process.env.SMTP_HOST || "smtp.naver.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }
  }
  /**
   * 갑지/을지 시트를 Excel과 PDF로 첨부하여 이메일 발송
   */
  async sendPOWithAttachments(originalFilePath, emailOptions) {
    try {
      const timestamp2 = Date.now();
      const uploadsDir = path9.join(__dirname3, "../../uploads");
      const extractedPath = path9.join(uploadsDir, `po-sheets-${timestamp2}.xlsx`);
      const extractResult = POTemplateProcessorMock.extractSheetsToFile(
        originalFilePath,
        extractedPath,
        ["\uAC11\uC9C0", "\uC744\uC9C0"]
      );
      const extractResultData = await extractResult;
      if (!extractResultData.success) {
        return {
          success: false,
          error: `\uC2DC\uD2B8 \uCD94\uCD9C \uC2E4\uD328: ${extractResultData.error}`
        };
      }
      const pdfPath = path9.join(uploadsDir, `po-sheets-${timestamp2}.pdf`);
      const pdfResult = await this.createDummyPDF(pdfPath);
      if (!pdfResult.success) {
        return {
          success: false,
          error: `PDF \uBCC0\uD658 \uC2E4\uD328: ${pdfResult.error}`
        };
      }
      const attachments2 = [];
      if (fs10.existsSync(extractedPath)) {
        attachments2.push({
          filename: `\uBC1C\uC8FC\uC11C_${emailOptions.orderNumber || timestamp2}.xlsx`,
          path: extractedPath,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
      }
      if (fs10.existsSync(pdfPath)) {
        attachments2.push({
          filename: `\uBC1C\uC8FC\uC11C_${emailOptions.orderNumber || timestamp2}.pdf`,
          path: pdfPath,
          contentType: "application/pdf"
        });
      }
      const emailContent = this.generateEmailContent(emailOptions);
      let result;
      if (this.transporter) {
        result = await this.sendEmail({
          to: emailOptions.to,
          cc: emailOptions.cc,
          bcc: emailOptions.bcc,
          subject: emailOptions.subject,
          html: emailContent,
          attachments: attachments2
        });
      } else {
        result = await this.sendMockEmail({
          to: emailOptions.to,
          cc: emailOptions.cc,
          bcc: emailOptions.bcc,
          subject: emailOptions.subject,
          html: emailContent,
          attachments: attachments2
        });
      }
      setTimeout(() => {
        this.cleanupTempFiles([extractedPath, pdfPath]);
      }, 5e3);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * 실제 이메일 발송
   */
  async sendEmail(options) {
    try {
      if (!this.transporter) {
        return this.sendMockEmail(options);
      }
      const info = await this.transporter.sendMail({
        from: `"\uBC1C\uC8FC \uC2DC\uC2A4\uD15C" <${process.env.SMTP_USER}>`,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        cc: options.cc ? Array.isArray(options.cc) ? options.cc.join(", ") : options.cc : void 0,
        bcc: options.bcc ? Array.isArray(options.bcc) ? options.bcc.join(", ") : options.bcc : void 0,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          path: att.path,
          contentType: att.contentType
        }))
      });
      return {
        success: true,
        messageId: info.messageId,
        mockMode: false
      };
    } catch (error) {
      console.error("\uC2E4\uC81C \uC774\uBA54\uC77C \uBC1C\uC1A1 \uC2E4\uD328, Mock \uBAA8\uB4DC\uB85C \uC804\uD658:", error);
      return this.sendMockEmail(options);
    }
  }
  /**
   * Mock 이메일 발송
   */
  async sendMockEmail(options) {
    const mockLog = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        size: this.getFileSize(att.path),
        contentType: att.contentType
      }))
    };
    console.log("\u{1F4E7} Mock \uC774\uBA54\uC77C \uBC1C\uC1A1:");
    console.log("  \uC218\uC2E0\uC790:", options.to);
    console.log("  \uC81C\uBAA9:", options.subject);
    console.log("  \uCCA8\uBD80\uD30C\uC77C:", options.attachments?.length || 0, "\uAC1C");
    console.log("  \uBC1C\uC1A1 \uC2DC\uAC04:", mockLog.timestamp);
    const logDir = path9.join(__dirname3, "../../logs");
    if (!fs10.existsSync(logDir)) {
      fs10.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path9.join(logDir, `mock-email-${Date.now()}.json`);
    fs10.writeFileSync(logFile, JSON.stringify(mockLog, null, 2));
    return {
      success: true,
      messageId: `mock-${Date.now()}@po-management.local`,
      mockMode: true
    };
  }
  /**
   * 더미 PDF 파일 생성
   */
  async createDummyPDF(pdfPath) {
    try {
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 55
>>
stream
BT
/F1 12 Tf
100 700 Td
(\uBC1C\uC8FC\uC11C PDF - Mock \uC0DD\uC131) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000379 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
456
%%EOF`;
      fs10.writeFileSync(pdfPath, pdfContent);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * 파일 크기 반환
   */
  getFileSize(filePath) {
    try {
      const stats = fs10.statSync(filePath);
      const bytes = stats.size;
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    } catch {
      return "Unknown";
    }
  }
  /**
   * 이메일 내용 생성
   */
  generateEmailContent(options) {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW"
      }).format(amount);
    };
    const formatDate = (dateString) => {
      try {
        const date2 = new Date(dateString);
        return date2.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      } catch {
        return dateString;
      }
    };
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Malgun Gothic', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            
            .header {
              background-color: #007bff;
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            
            .content {
              background-color: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            
            .info-table th,
            .info-table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            
            .info-table th {
              background-color: #e9ecef;
              font-weight: bold;
              width: 30%;
            }
            
            .attachments {
              background-color: #e7f3ff;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            
            .mock-notice {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 10px;
              border-radius: 5px;
              margin: 15px 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>\u{1F4CB} \uBC1C\uC8FC\uC11C \uC1A1\uBD80</h1>
            <p>\uAD6C\uB9E4 \uBC1C\uC8FC \uAD00\uB9AC \uC2DC\uC2A4\uD15C</p>
          </div>
          
          <div class="content">
            <div class="mock-notice">
              <strong>\u{1F9EA} \uD14C\uC2A4\uD2B8 \uBAA8\uB4DC:</strong> \uC774 \uBA54\uC77C\uC740 \uC2DC\uC2A4\uD15C \uD14C\uC2A4\uD2B8\uC6A9\uC73C\uB85C \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4.
            </div>
            
            <p>\uC548\uB155\uD558\uC138\uC694,</p>
            <p>\uBC1C\uC8FC\uC11C\uB97C \uC1A1\uBD80\uB4DC\uB9BD\uB2C8\uB2E4. \uCCA8\uBD80\uB41C \uD30C\uC77C\uC744 \uD655\uC778\uD558\uC5EC \uC8FC\uC2DC\uAE30 \uBC14\uB78D\uB2C8\uB2E4.</p>
            
            ${options.orderNumber ? `
              <table class="info-table">
                <tr>
                  <th>\uBC1C\uC8FC\uBC88\uD638</th>
                  <td>${options.orderNumber}</td>
                </tr>
                ${options.vendorName ? `
                  <tr>
                    <th>\uAC70\uB798\uCC98\uBA85</th>
                    <td>${options.vendorName}</td>
                  </tr>
                ` : ""}
                ${options.orderDate ? `
                  <tr>
                    <th>\uBC1C\uC8FC\uC77C\uC790</th>
                    <td>${formatDate(options.orderDate)}</td>
                  </tr>
                ` : ""}
                ${options.dueDate ? `
                  <tr>
                    <th>\uB0A9\uAE30\uC77C\uC790</th>
                    <td>${formatDate(options.dueDate)}</td>
                  </tr>
                ` : ""}
                ${options.totalAmount ? `
                  <tr>
                    <th>\uCD1D \uAE08\uC561</th>
                    <td><strong>${formatCurrency(options.totalAmount)}</strong></td>
                  </tr>
                ` : ""}
              </table>
            ` : ""}
            
            <div class="attachments">
              <h3>\u{1F4CE} \uCCA8\uBD80\uD30C\uC77C</h3>
              <ul>
                <li>\uBC1C\uC8FC\uC11C.xlsx (Excel \uD30C\uC77C)</li>
                <li>\uBC1C\uC8FC\uC11C.pdf (PDF \uD30C\uC77C)</li>
              </ul>
              <p><small>* \uAC11\uC9C0\uC640 \uC744\uC9C0 \uC2DC\uD2B8\uAC00 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.</small></p>
            </div>
            
            ${options.additionalMessage ? `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>\u{1F4DD} \uCD94\uAC00 \uC548\uB0B4\uC0AC\uD56D</h3>
                <p>${options.additionalMessage}</p>
              </div>
            ` : ""}
            
            <p>
              \uBC1C\uC8FC\uC11C \uAC80\uD1A0 \uD6C4 \uD655\uC778 \uD68C\uC2E0 \uBD80\uD0C1\uB4DC\uB9BD\uB2C8\uB2E4.<br>
              \uBB38\uC758\uC0AC\uD56D\uC774 \uC788\uC73C\uC2DC\uBA74 \uC5B8\uC81C\uB4E0\uC9C0 \uC5F0\uB77D\uC8FC\uC2DC\uAE30 \uBC14\uB78D\uB2C8\uB2E4.
            </p>
            
            <p>\uAC10\uC0AC\uD569\uB2C8\uB2E4.</p>
          </div>
          
          <div class="footer">
            <p>
              \uC774 \uBA54\uC77C\uC740 \uAD6C\uB9E4 \uBC1C\uC8FC \uAD00\uB9AC \uC2DC\uC2A4\uD15C\uC5D0\uC11C \uC790\uB3D9\uC73C\uB85C \uBC1C\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4.<br>
              \uBC1C\uC1A1 \uC2DC\uAC04: ${(/* @__PURE__ */ new Date()).toLocaleString("ko-KR")}
            </p>
          </div>
        </body>
      </html>
    `;
  }
  /**
   * 임시 파일 정리
   */
  cleanupTempFiles(filePaths) {
    filePaths.forEach((filePath) => {
      try {
        if (fs10.existsSync(filePath)) {
          fs10.unlinkSync(filePath);
          console.log(`\u2705 \uC784\uC2DC \uD30C\uC77C \uC815\uB9AC: ${path9.basename(filePath)}`);
        }
      } catch (error) {
        console.error(`\u274C \uD30C\uC77C \uC815\uB9AC \uC2E4\uD328: ${filePath}`, error);
      }
    });
  }
  /**
   * 이메일 연결 테스트
   */
  async testConnection() {
    try {
      if (!this.transporter) {
        return {
          success: true,
          mockMode: true,
          error: "SMTP \uC124\uC815 \uC5C6\uC74C - Mock \uBAA8\uB4DC \uC0AC\uC6A9"
        };
      }
      await this.transporter.verify();
      return {
        success: true,
        mockMode: false
      };
    } catch (error) {
      return {
        success: true,
        mockMode: true,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
};

// server/utils/excel-to-pdf-mock.ts
import XLSX4 from "xlsx";
import path10 from "path";
import fs11 from "fs";
var ExcelToPdfConverterMock = class {
  /**
   * Excel 파일을 PDF로 변환 (Mock 버전)
   */
  static async convertToPdf(excelPath, options = {}) {
    try {
      if (!fs11.existsSync(excelPath)) {
        return {
          success: false,
          error: "Excel \uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
        };
      }
      const workbook = XLSX4.readFile(excelPath);
      const pdfPath = options.outputPath || excelPath.replace(/\.xlsx?m?$/, ".pdf");
      const htmlContent = this.generateHtmlFromWorkbook(workbook);
      const pdfResult = await this.createMockPdf(htmlContent, pdfPath);
      if (!pdfResult.success) {
        return pdfResult;
      }
      return {
        success: true,
        pdfPath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * 특정 시트들만 PDF로 변환 (Mock 버전)
   */
  static async convertSheetsToPdf(excelPath, sheetNames, options = {}) {
    try {
      if (!fs11.existsSync(excelPath)) {
        return {
          success: false,
          error: "Excel \uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
        };
      }
      const workbook = XLSX4.readFile(excelPath);
      const pdfPath = options.outputPath || excelPath.replace(/\.xlsx?m?$/, "-sheets.pdf");
      const htmlContent = this.generateHtmlFromSheets(workbook, sheetNames);
      const pdfResult = await this.createMockPdf(htmlContent, pdfPath);
      if (!pdfResult.success) {
        return pdfResult;
      }
      return {
        success: true,
        pdfPath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Mock PDF 생성 (간단한 PDF 구조)
   */
  static async createMockPdf(htmlContent, pdfPath) {
    try {
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 700 Td
(\uBC1C\uC8FC\uC11C PDF \uBCC0\uD658 \uC644\uB8CC) Tj
0 -20 Td
(\uC774 \uD30C\uC77C\uC740 Mock PDF\uC785\uB2C8\uB2E4.) Tj
0 -20 Td
(\uC2E4\uC81C \uD658\uACBD\uC5D0\uC11C\uB294 \uC644\uC804\uD55C PDF\uAC00 \uC0DD\uC131\uB429\uB2C8\uB2E4.) Tj
0 -40 Td
(\uC0DD\uC131 \uC2DC\uAC04: ${(/* @__PURE__ */ new Date()).toLocaleString("ko-KR")}) Tj
0 -20 Td
(\uD30C\uC77C \uACBD\uB85C: ${pdfPath}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000524 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
589
%%EOF`;
      fs11.writeFileSync(pdfPath, pdfContent);
      console.log(`\u{1F4C4} Mock PDF \uC0DD\uC131 \uC644\uB8CC: ${path10.basename(pdfPath)}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * 워크북 전체를 HTML로 변환
   */
  static generateHtmlFromWorkbook(workbook) {
    const sheets = workbook.SheetNames.map((name) => {
      const worksheet = workbook.Sheets[name];
      const htmlTable = XLSX4.utils.sheet_to_html(worksheet);
      return `
        <div class="sheet-container">
          <h2 class="sheet-title">${name}</h2>
          ${htmlTable}
        </div>
        <div class="page-break"></div>
      `;
    }).join("");
    return this.wrapWithHtmlTemplate(sheets);
  }
  /**
   * 특정 시트들만 HTML로 변환
   */
  static generateHtmlFromSheets(workbook, sheetNames) {
    const sheets = sheetNames.filter((name) => workbook.SheetNames.includes(name)).map((name) => {
      const worksheet = workbook.Sheets[name];
      const htmlTable = XLSX4.utils.sheet_to_html(worksheet);
      return `
          <div class="sheet-container">
            <h2 class="sheet-title">${name}</h2>
            ${htmlTable}
          </div>
          <div class="page-break"></div>
        `;
    }).join("");
    return this.wrapWithHtmlTemplate(sheets);
  }
  /**
   * HTML 템플릿으로 래핑
   */
  static wrapWithHtmlTemplate(content) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Excel to PDF - Mock</title>
          <style>
            body {
              font-family: 'Malgun Gothic', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: white;
            }
            
            .mock-notice {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 10px;
              border-radius: 5px;
              margin-bottom: 20px;
              font-size: 14px;
            }
            
            .sheet-container {
              margin-bottom: 30px;
            }
            
            .sheet-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #333;
              border-bottom: 2px solid #007bff;
              padding-bottom: 5px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 12px;
            }
            
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            
            th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            
            .page-break {
              page-break-before: always;
            }
            
            /* \uC22B\uC790 \uC140 \uC6B0\uCE21 \uC815\uB82C */
            td[data-t="n"] {
              text-align: right;
            }
            
            /* \uBCD1\uD569\uB41C \uC140 \uC2A4\uD0C0\uC77C */
            .merged-cell {
              background-color: #e9ecef;
              font-weight: bold;
              text-align: center;
            }
            
            /* \uC778\uC1C4 \uCD5C\uC801\uD654 */
            @media print {
              body {
                margin: 0;
                padding: 10mm;
              }
              
              .page-break {
                page-break-before: always;
              }
              
              .sheet-container {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="mock-notice">
            <strong>\u{1F9EA} Mock PDF:</strong> \uC774 \uD30C\uC77C\uC740 \uD14C\uC2A4\uD2B8\uC6A9 Mock PDF\uC785\uB2C8\uB2E4. \uC2E4\uC81C \uD658\uACBD\uC5D0\uC11C\uB294 \uC644\uC804\uD55C PDF \uBCC0\uD658\uC774 \uC218\uD589\uB429\uB2C8\uB2E4.
          </div>
          ${content}
        </body>
      </html>
    `;
  }
};
async function convertExcelToPdfMock(excelPath, outputPath, sheetsOnly) {
  const options = {
    outputPath,
    pageFormat: "A4",
    orientation: "portrait"
  };
  if (sheetsOnly && sheetsOnly.length > 0) {
    return ExcelToPdfConverterMock.convertSheetsToPdf(excelPath, sheetsOnly, options);
  } else {
    return ExcelToPdfConverterMock.convertToPdf(excelPath, options);
  }
}

// server/utils/po-template-validator.ts
import XLSX5 from "xlsx";
import fs12 from "fs";
import path11 from "path";
var POTemplateValidator = class {
  static {
    this.REQUIRED_COLUMNS = [
      "\uBC1C\uC8FC\uBC88\uD638",
      "\uBC1C\uC8FC\uC77C\uC790",
      "\uD604\uC7A5\uBA85",
      "\uD488\uBAA9\uBA85",
      "\uC218\uB7C9",
      "\uB2E8\uAC00",
      "\uACF5\uAE09\uAC00\uC561",
      "\uC138\uC561",
      "\uD569\uACC4",
      "\uB0A9\uAE30\uC77C\uC790",
      "\uAC70\uB798\uCC98\uBA85"
    ];
  }
  static {
    this.OPTIONAL_COLUMNS = [
      "\uB300\uBD84\uB958",
      "\uC911\uBD84\uB958",
      "\uC18C\uBD84\uB958",
      "\uADDC\uACA9",
      "\uB0A9\uD488\uCC98",
      "\uBE44\uACE0"
    ];
  }
  static {
    this.VALIDATION_RULES = [
      {
        field: "\uBC1C\uC8FC\uBC88\uD638",
        required: true,
        type: "string",
        minLength: 3,
        maxLength: 50,
        pattern: /^[A-Z0-9-]+$/
      },
      {
        field: "\uBC1C\uC8FC\uC77C\uC790",
        required: true,
        type: "date"
      },
      {
        field: "\uD604\uC7A5\uBA85",
        required: true,
        type: "string",
        minLength: 2,
        maxLength: 100
      },
      {
        field: "\uD488\uBAA9\uBA85",
        required: true,
        type: "string",
        minLength: 1,
        maxLength: 200
      },
      {
        field: "\uC218\uB7C9",
        required: true,
        type: "number",
        customValidator: (value) => value > 0
      },
      {
        field: "\uB2E8\uAC00",
        required: true,
        type: "number",
        customValidator: (value) => value >= 0
      },
      {
        field: "\uACF5\uAE09\uAC00\uC561",
        required: true,
        type: "number",
        customValidator: (value) => value >= 0
      },
      {
        field: "\uC138\uC561",
        required: true,
        type: "number",
        customValidator: (value) => value >= 0
      },
      {
        field: "\uD569\uACC4",
        required: true,
        type: "number",
        customValidator: (value) => value >= 0
      },
      {
        field: "\uB0A9\uAE30\uC77C\uC790",
        required: true,
        type: "date"
      },
      {
        field: "\uAC70\uB798\uCC98\uBA85",
        required: true,
        type: "string",
        minLength: 2,
        maxLength: 100
      }
    ];
  }
  /**
   * PO Template 파일 전체 유효성 검사
   */
  static async validatePOTemplateFile(filePath) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        missingFields: [],
        duplicateOrderNumbers: []
      }
    };
    try {
      if (!fs12.existsSync(filePath)) {
        result.isValid = false;
        result.errors.push("\uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        return result;
      }
      const ext = path11.extname(filePath).toLowerCase();
      if (![".xlsx", ".xlsm", ".xls"].includes(ext)) {
        result.isValid = false;
        result.errors.push("\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uD30C\uC77C \uD615\uC2DD\uC785\uB2C8\uB2E4. Excel \uD30C\uC77C(.xlsx, .xlsm, .xls)\uB9CC \uC9C0\uC6D0\uB429\uB2C8\uB2E4.");
        return result;
      }
      const workbook = XLSX5.readFile(filePath);
      if (!workbook.SheetNames.includes("Input")) {
        result.isValid = false;
        result.errors.push("Input \uC2DC\uD2B8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        return result;
      }
      const worksheet = workbook.Sheets["Input"];
      const data = XLSX5.utils.sheet_to_json(worksheet, { header: 1 });
      if (data.length < 2) {
        result.isValid = false;
        result.errors.push("Input \uC2DC\uD2B8\uC5D0 \uB370\uC774\uD130\uAC00 \uC5C6\uAC70\uB098 \uD5E4\uB354\uB9CC \uC788\uC2B5\uB2C8\uB2E4.");
        return result;
      }
      const headers = data[0];
      const headerValidation = this.validateHeaders(headers);
      if (!headerValidation.isValid) {
        result.isValid = false;
        result.errors.push(...headerValidation.errors);
        result.warnings.push(...headerValidation.warnings);
        result.summary.missingFields = headerValidation.missingFields;
      }
      const dataRows = data.slice(1);
      result.summary.totalRows = dataRows.length;
      const orderNumbers = /* @__PURE__ */ new Set();
      const duplicates = /* @__PURE__ */ new Set();
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowIndex = i + 2;
        if (this.isEmptyRow(row)) {
          continue;
        }
        const rowValidation = this.validateDataRow(row, headers, rowIndex);
        if (rowValidation.isValid) {
          result.summary.validRows++;
          const orderNumber = String(row[0] || "").trim();
          if (orderNumber) {
            if (orderNumbers.has(orderNumber)) {
              duplicates.add(orderNumber);
            } else {
              orderNumbers.add(orderNumber);
            }
          }
        } else {
          result.summary.invalidRows++;
          result.isValid = false;
          result.errors.push(...rowValidation.errors);
          result.warnings.push(...rowValidation.warnings);
        }
      }
      if (duplicates.size > 0) {
        result.summary.duplicateOrderNumbers = Array.from(duplicates);
        result.warnings.push(`\uC911\uBCF5\uB41C \uBC1C\uC8FC\uBC88\uD638\uAC00 \uBC1C\uACAC\uB418\uC5C8\uC2B5\uB2C8\uB2E4: ${Array.from(duplicates).join(", ")}`);
      }
      const requiredSheets = ["\uAC11\uC9C0", "\uC744\uC9C0"];
      const missingSheets = requiredSheets.filter((sheet) => !workbook.SheetNames.includes(sheet));
      if (missingSheets.length > 0) {
        result.warnings.push(`\uD544\uC218 \uC2DC\uD2B8\uAC00 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4: ${missingSheets.join(", ")}`);
      }
      if (result.summary.validRows === 0) {
        result.isValid = false;
        result.errors.push("\uC720\uD6A8\uD55C \uB370\uC774\uD130 \uD589\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : "\uD30C\uC77C \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
    }
    return result;
  }
  /**
   * 헤더 검증
   */
  static validateHeaders(headers) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      missingFields: []
    };
    const missingRequired = this.REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
    if (missingRequired.length > 0) {
      result.isValid = false;
      result.errors.push(`\uD544\uC218 \uCEEC\uB7FC\uC774 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4: ${missingRequired.join(", ")}`);
      result.missingFields = missingRequired;
    }
    const knownColumns = [...this.REQUIRED_COLUMNS, ...this.OPTIONAL_COLUMNS];
    const unknownColumns = headers.filter((col) => col && !knownColumns.includes(col));
    if (unknownColumns.length > 0) {
      result.warnings.push(`\uC54C \uC218 \uC5C6\uB294 \uCEEC\uB7FC\uC774 \uC788\uC2B5\uB2C8\uB2E4: ${unknownColumns.join(", ")}`);
    }
    return result;
  }
  /**
   * 데이터 행 검증
   */
  static validateDataRow(row, headers, rowIndex) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };
    for (const rule of this.VALIDATION_RULES) {
      const columnIndex = headers.indexOf(rule.field);
      if (columnIndex === -1) continue;
      const value = row[columnIndex];
      const fieldValidation = this.validateField(value, rule, rule.field, rowIndex);
      if (!fieldValidation.isValid) {
        result.isValid = false;
        result.errors.push(...fieldValidation.errors);
      }
      result.warnings.push(...fieldValidation.warnings);
    }
    const supplyAmount = this.parseNumber(row[headers.indexOf("\uACF5\uAE09\uAC00\uC561")]);
    const taxAmount = this.parseNumber(row[headers.indexOf("\uC138\uC561")]);
    const totalAmount = this.parseNumber(row[headers.indexOf("\uD569\uACC4")]);
    if (supplyAmount !== null && taxAmount !== null && totalAmount !== null) {
      const calculatedTotal = supplyAmount + taxAmount;
      if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
        result.warnings.push(`${rowIndex}\uD589: \uACF5\uAE09\uAC00\uC561(${supplyAmount}) + \uC138\uC561(${taxAmount}) \u2260 \uD569\uACC4(${totalAmount})`);
      }
    }
    const quantity = this.parseNumber(row[headers.indexOf("\uC218\uB7C9")]);
    const unitPrice = this.parseNumber(row[headers.indexOf("\uB2E8\uAC00")]);
    if (quantity !== null && unitPrice !== null && supplyAmount !== null) {
      const calculatedSupply = quantity * unitPrice;
      if (Math.abs(calculatedSupply - supplyAmount) > 0.01) {
        result.warnings.push(`${rowIndex}\uD589: \uC218\uB7C9(${quantity}) \xD7 \uB2E8\uAC00(${unitPrice}) \u2260 \uACF5\uAE09\uAC00\uC561(${supplyAmount})`);
      }
    }
    return result;
  }
  /**
   * 개별 필드 유효성 검사
   */
  static validateField(value, rule, fieldName, rowIndex) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };
    if (rule.required && (value === null || value === void 0 || value === "")) {
      result.isValid = false;
      result.errors.push(`${rowIndex}\uD589: ${fieldName}\uC740(\uB294) \uD544\uC218 \uD56D\uBAA9\uC785\uB2C8\uB2E4.`);
      return result;
    }
    if (value === null || value === void 0 || value === "") {
      return result;
    }
    switch (rule.type) {
      case "string":
        if (typeof value !== "string") {
          const stringValue = String(value);
          if (rule.minLength && stringValue.length < rule.minLength) {
            result.isValid = false;
            result.errors.push(`${rowIndex}\uD589: ${fieldName}\uC740(\uB294) \uCD5C\uC18C ${rule.minLength}\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.`);
          }
          if (rule.maxLength && stringValue.length > rule.maxLength) {
            result.isValid = false;
            result.errors.push(`${rowIndex}\uD589: ${fieldName}\uC740(\uB294) \uCD5C\uB300 ${rule.maxLength}\uC790 \uC774\uD558\uC5EC\uC57C \uD569\uB2C8\uB2E4.`);
          }
          if (rule.pattern && !rule.pattern.test(stringValue)) {
            result.isValid = false;
            result.errors.push(`${rowIndex}\uD589: ${fieldName}\uC758 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.`);
          }
        }
        break;
      case "number":
        const numValue = this.parseNumber(value);
        if (numValue === null) {
          result.isValid = false;
          result.errors.push(`${rowIndex}\uD589: ${fieldName}\uC740(\uB294) \uC22B\uC790\uC5EC\uC57C \uD569\uB2C8\uB2E4.`);
        }
        break;
      case "date":
        const dateValue = this.parseDate(value);
        if (dateValue === null) {
          result.isValid = false;
          result.errors.push(`${rowIndex}\uD589: ${fieldName}\uC740(\uB294) \uC62C\uBC14\uB978 \uB0A0\uC9DC \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.`);
        }
        break;
    }
    if (rule.customValidator && !rule.customValidator(value)) {
      result.isValid = false;
      result.errors.push(`${rowIndex}\uD589: ${fieldName}\uC758 \uAC12\uC774 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.`);
    }
    return result;
  }
  /**
   * 빈 행 확인
   */
  static isEmptyRow(row) {
    return row.every((cell) => cell === null || cell === void 0 || cell === "");
  }
  /**
   * 숫자 파싱
   */
  static parseNumber(value) {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[,\s]/g, "");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }
  /**
   * 날짜 파싱
   */
  static parseDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === "number") {
      const date2 = new Date((value - 25569) * 86400 * 1e3);
      return isNaN(date2.getTime()) ? null : date2;
    }
    if (typeof value === "string") {
      const date2 = new Date(value);
      return isNaN(date2.getTime()) ? null : date2;
    }
    return null;
  }
  /**
   * 빠른 유효성 검사 (기본적인 구조만 확인)
   */
  static async quickValidate(filePath) {
    const result = {
      isValid: true,
      hasInputSheet: false,
      hasRequiredSheets: false,
      rowCount: 0,
      errors: []
    };
    try {
      if (!fs12.existsSync(filePath)) {
        result.isValid = false;
        result.errors.push("\uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        return result;
      }
      const workbook = XLSX5.readFile(filePath);
      result.hasInputSheet = workbook.SheetNames.includes("Input");
      if (!result.hasInputSheet) {
        result.isValid = false;
        result.errors.push("Input \uC2DC\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
      }
      const requiredSheets = ["\uAC11\uC9C0", "\uC744\uC9C0"];
      result.hasRequiredSheets = requiredSheets.every((sheet) => workbook.SheetNames.includes(sheet));
      if (!result.hasRequiredSheets) {
        result.errors.push("\uAC11\uC9C0 \uB610\uB294 \uC744\uC9C0 \uC2DC\uD2B8\uAC00 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      }
      if (result.hasInputSheet) {
        const worksheet = workbook.Sheets["Input"];
        const data = XLSX5.utils.sheet_to_json(worksheet, { header: 1 });
        result.rowCount = Math.max(0, data.length - 1);
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : "\uD30C\uC77C \uCC98\uB9AC \uC624\uB958");
    }
    return result;
  }
};

// server/routes/po-template-real.ts
init_db();
init_schema();
import { eq as eq7 } from "drizzle-orm";
var router10 = Router10();
router10.get("/test", (req, res) => {
  res.json({ message: "PO Template router is working!", timestamp: /* @__PURE__ */ new Date() });
});
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname4 = path12.dirname(__filename3);
var storage3 = multer3.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir2 = path12.join(__dirname4, "../../uploads");
    if (!fs13.existsSync(uploadDir2)) {
      fs13.mkdirSync(uploadDir2, { recursive: true });
    }
    cb(null, uploadDir2);
  },
  filename: (req, file, cb) => {
    const timestamp2 = Date.now();
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    const extension = path12.extname(originalName);
    const basename = path12.basename(originalName, extension);
    cb(null, `${timestamp2}-${basename}${extension}`);
  }
});
var upload3 = multer3({
  storage: storage3,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // .xlsx
      "application/vnd.ms-excel.sheet.macroEnabled.12",
      // .xlsm (대문자 E)
      "application/vnd.ms-excel.sheet.macroenabled.12",
      // .xlsm (소문자 e)
      "application/vnd.ms-excel"
      // .xls
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
var requireAuth2 = (req, res, next) => {
  req.user = { id: "test_admin_001" };
  next();
};
router10.get("/db-status", requireAuth2, async (req, res) => {
  try {
    if (!db) {
      return res.json({
        success: false,
        message: "DB \uC5F0\uACB0 \uC5C6\uC74C - Mock DB \uC0AC\uC6A9",
        usingMockDB: true
      });
    }
    const testResult = await db.select().from(vendors).limit(1);
    res.json({
      success: true,
      message: "\uC2E4\uC81C DB \uC5F0\uACB0 \uC131\uACF5",
      usingMockDB: false,
      vendorCount: testResult.length
    });
  } catch (error) {
    console.error("DB \uC0C1\uD0DC \uD655\uC778 \uC624\uB958:", error);
    res.json({
      success: false,
      message: "DB \uC5F0\uACB0 \uC2E4\uD328 - Mock DB\uB85C \uD3F4\uBC31",
      usingMockDB: true,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router10.post("/upload", requireAuth2, upload3.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "\uD30C\uC77C\uC774 \uC5C5\uB85C\uB4DC\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." });
    }
    const filePath = req.file.path;
    const quickValidation = await POTemplateValidator.quickValidate(filePath);
    if (!quickValidation.isValid) {
      fs13.unlinkSync(filePath);
      return res.status(400).json({
        error: "\uD30C\uC77C \uC720\uD6A8\uC131 \uAC80\uC0AC \uC2E4\uD328",
        details: quickValidation.errors.join(", "),
        validation: quickValidation
      });
    }
    const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
    if (!parseResult.success) {
      fs13.unlinkSync(filePath);
      return res.status(400).json({
        error: "\uD30C\uC2F1 \uC2E4\uD328",
        details: parseResult.error
      });
    }
    const detailedValidation = await POTemplateValidator.validatePOTemplateFile(filePath);
    res.json({
      success: true,
      message: "\uD30C\uC77C \uD30C\uC2F1 \uC644\uB8CC",
      data: {
        fileName: req.file.originalname,
        filePath,
        totalOrders: parseResult.totalOrders,
        totalItems: parseResult.totalItems,
        orders: parseResult.orders,
        validation: detailedValidation
      }
    });
  } catch (error) {
    console.error("PO Template \uC5C5\uB85C\uB4DC \uC624\uB958:", error);
    if (req.file && fs13.existsSync(req.file.path)) {
      fs13.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: "\uC11C\uBC84 \uC624\uB958",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router10.post("/save", requireAuth2, async (req, res) => {
  console.log("\u{1F525}\u{1F525}\u{1F525} /save \uC5D4\uB4DC\uD3EC\uC778\uD2B8 \uD638\uCD9C\uB428 - \uC0C8\uB85C\uC6B4 \uB514\uBC84\uAE45 \uCF54\uB4DC \uC801\uC6A9\uB428");
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: "\uBC1C\uC8FC\uC11C \uB370\uC774\uD130\uAC00 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4." });
    }
    if (db) {
      try {
        let savedOrders = 0;
        for (const orderData of orders) {
          let vendor = await db.select().from(vendors).where(eq7(vendors.name, orderData.vendorName)).limit(1);
          let vendorId;
          if (vendor.length === 0) {
            const newVendor = await db.insert(vendors).values({
              name: orderData.vendorName,
              contactPerson: "\uC790\uB3D9\uC0DD\uC131",
              email: `auto-${Date.now()}@example.com`,
              mainContact: "\uC790\uB3D9\uC0DD\uC131"
            }).returning();
            vendorId = newVendor[0].id;
          } else {
            vendorId = vendor[0].id;
          }
          let project = await db.select().from(projects).where(eq7(projects.projectName, orderData.siteName)).limit(1);
          let projectId;
          if (project.length === 0) {
            const newProject = await db.insert(projects).values({
              projectName: orderData.siteName,
              projectCode: `AUTO-${Date.now().toString().slice(-8)}`,
              status: "active"
            }).returning();
            projectId = newProject[0].id;
          } else {
            projectId = project[0].id;
          }
          let orderNumber = orderData.orderNumber;
          let suffix = 1;
          while (true) {
            try {
              const existing = await db.select().from(purchaseOrders).where(eq7(purchaseOrders.orderNumber, orderNumber));
              if (existing.length === 0) {
                break;
              }
              orderNumber = `${orderData.orderNumber}-${suffix}`;
              suffix++;
            } catch (error) {
              console.error("\uBC1C\uC8FC\uBC88\uD638 \uC911\uBCF5 \uAC80\uC0AC \uC624\uB958:", error);
              orderNumber = `${orderData.orderNumber}-${Date.now().toString().slice(-6)}`;
              break;
            }
          }
          console.log(`\u{1F4CB} \uCD5C\uC885 \uBC1C\uC8FC\uBC88\uD638: ${orderNumber} (\uC6D0\uBCF8: ${orderData.orderNumber})`);
          console.log(`\u{1F4C5} \uBC1C\uC8FC\uC77C\uC790 \uB514\uBC84\uAE45: orderData.orderDate="${orderData.orderDate}", type=${typeof orderData.orderDate}`);
          console.log(`\u{1F4C5} \uB0A9\uAE30\uC77C\uC790 \uB514\uBC84\uAE45: orderData.dueDate="${orderData.dueDate}", type=${typeof orderData.dueDate}`);
          console.log(`\u{1F525}\u{1F525}\u{1F525} \uB0A0\uC9DC \uBCC0\uD658 \uD568\uC218 \uC2DC\uC791 - \uC0C8 \uCF54\uB4DC \uC2E4\uD589\uB428`);
          const parseDate = (dateStr) => {
            console.log(`\u{1F525}\u{1F4C5} parseDate \uC785\uB825\uAC12: "${dateStr}", type=${typeof dateStr}, isEmpty=${!dateStr || dateStr.trim() === ""}`);
            if (!dateStr || dateStr.trim() === "") {
              console.log(`\u{1F525}\u{1F4C5} parseDate \uACB0\uACFC: null (\uBE48 \uBB38\uC790\uC5F4)`);
              return null;
            }
            const date2 = new Date(dateStr);
            const isValid = !isNaN(date2.getTime());
            console.log(`\u{1F525}\u{1F4C5} parseDate \uACB0\uACFC: "${dateStr}" -> ${isValid ? date2.toISOString() : "Invalid"} (valid: ${isValid})`);
            return isValid ? date2 : null;
          };
          const parsedOrderDate = parseDate(orderData.orderDate);
          const parsedDeliveryDate = parseDate(orderData.dueDate);
          console.log(`\u{1F4C5} \uCD5C\uC885 \uC800\uC7A5\uD560 \uB0A0\uC9DC\uB4E4:`, {
            orderDate: parsedOrderDate,
            deliveryDate: parsedDeliveryDate,
            orderDateISO: parsedOrderDate ? parsedOrderDate.toISOString() : null,
            deliveryDateISO: parsedDeliveryDate ? parsedDeliveryDate.toISOString() : null
          });
          const newOrder = await db.insert(purchaseOrders).values({
            orderNumber,
            projectId,
            vendorId,
            userId: req.user.id,
            orderDate: parsedOrderDate ? parsedOrderDate.toISOString().split("T")[0] : null,
            deliveryDate: parsedDeliveryDate ? parsedDeliveryDate.toISOString().split("T")[0] : null,
            totalAmount: orderData.totalAmount,
            status: "draft",
            notes: "PO Template\uC5D0\uC11C \uC790\uB3D9 \uC0DD\uC131\uB428"
          }).returning();
          console.log(`\u{1F4C5} DB\uC5D0 \uC800\uC7A5\uB41C \uBC1C\uC8FC\uC11C:`, {
            id: newOrder[0].id,
            orderNumber: newOrder[0].orderNumber,
            orderDate: newOrder[0].orderDate,
            deliveryDate: newOrder[0].deliveryDate
          });
          const orderId = newOrder[0].id;
          for (const item of orderData.items) {
            await db.insert(purchaseOrderItems).values({
              orderId,
              itemName: item.itemName,
              specification: item.specification,
              unit: item.unit || null,
              // 단위가 없으면 NULL (DB에서 NULL 허용됨)
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              // categoryLv1: item.categoryLv1, // TODO: Add column to DB
              // categoryLv2: item.categoryLv2, // TODO: Add column to DB
              // categoryLv3: item.categoryLv3, // TODO: Add column to DB
              // supplyAmount: item.supplyAmount, // TODO: Add column to DB
              // taxAmount: item.taxAmount, // TODO: Add column to DB
              // deliveryName: item.deliveryName, // TODO: Add column to DB
              notes: item.notes
            });
          }
          savedOrders++;
        }
        res.json({
          success: true,
          message: "\uC2E4\uC81C DB \uC800\uC7A5 \uC644\uB8CC",
          data: {
            savedOrders,
            usingMockDB: false
          }
        });
      } catch (dbError) {
        console.error("\uC2E4\uC81C DB \uC800\uC7A5 \uC2E4\uD328, Mock DB\uB85C \uD3F4\uBC31:", dbError);
        const mockResult = await POTemplateProcessorMock.saveToDatabase(orders, req.user.id);
        if (!mockResult.success) {
          return res.status(500).json({
            error: "Mock DB \uC800\uC7A5\uB3C4 \uC2E4\uD328",
            details: mockResult.error
          });
        }
        res.json({
          success: true,
          message: "Mock DB \uC800\uC7A5 \uC644\uB8CC (\uC2E4\uC81C DB \uC5F0\uACB0 \uC2E4\uD328)",
          data: {
            savedOrders: mockResult.savedOrders,
            usingMockDB: true,
            dbError: dbError instanceof Error ? dbError.message : "Unknown error"
          }
        });
      }
    } else {
      const mockResult = await POTemplateProcessorMock.saveToDatabase(orders, req.user.id);
      if (!mockResult.success) {
        return res.status(500).json({
          error: "Mock DB \uC800\uC7A5 \uC2E4\uD328",
          details: mockResult.error
        });
      }
      res.json({
        success: true,
        message: "Mock DB \uC800\uC7A5 \uC644\uB8CC (DB \uC5F0\uACB0 \uC5C6\uC74C)",
        data: {
          savedOrders: mockResult.savedOrders,
          usingMockDB: true
        }
      });
    }
  } catch (error) {
    console.error("PO Template \uC800\uC7A5 \uC624\uB958:", error);
    res.status(500).json({
      error: "\uC11C\uBC84 \uC624\uB958",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router10.post("/extract-sheets", requireAuth2, async (req, res) => {
  DebugLogger.logExecutionPath("/api/po-template/extract-sheets", "POTemplateProcessorMock.extractSheetsToFile");
  try {
    const { filePath, sheetNames = ["\uAC11\uC9C0", "\uC744\uC9C0"] } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "\uD30C\uC77C \uACBD\uB85C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." });
    }
    if (!fs13.existsSync(filePath)) {
      return res.status(400).json({ error: "\uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
    const timestamp2 = Date.now();
    const extractedPath = path12.join(
      path12.dirname(filePath),
      `extracted-${timestamp2}.xlsx`
    );
    const extractResult = await POTemplateProcessorMock.extractSheetsToFile(
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
router10.get("/db-stats", requireAuth2, async (req, res) => {
  try {
    if (db) {
      try {
        const vendorCount = await db.select().from(vendors);
        const projectCount = await db.select().from(projects);
        const orderCount = await db.select().from(purchaseOrders);
        const itemCount = await db.select().from(purchaseOrderItems);
        res.json({
          success: true,
          data: {
            stats: {
              vendors: vendorCount.length,
              projects: projectCount.length,
              purchaseOrders: orderCount.length,
              purchaseOrderItems: itemCount.length
            },
            sampleData: {
              recentVendors: vendorCount.slice(-3),
              recentProjects: projectCount.slice(-3),
              recentOrders: orderCount.slice(-3),
              recentItems: itemCount.slice(-3)
            },
            usingMockDB: false
          }
        });
      } catch (dbError) {
        console.error("\uC2E4\uC81C DB \uD1B5\uACC4 \uC870\uD68C \uC2E4\uD328, Mock DB\uB85C \uD3F4\uBC31:", dbError);
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
            },
            usingMockDB: true,
            dbError: dbError instanceof Error ? dbError.message : "Unknown error"
          }
        });
      }
    } else {
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
          },
          usingMockDB: true
        }
      });
    }
  } catch (error) {
    console.error("DB \uD1B5\uACC4 \uC870\uD68C \uC624\uB958:", error);
    res.status(500).json({
      error: "\uC11C\uBC84 \uC624\uB958",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router10.post("/send-email", requireAuth2, async (req, res) => {
  try {
    const {
      filePath,
      to,
      cc,
      bcc,
      subject,
      orderNumber,
      vendorName,
      orderDate,
      dueDate,
      totalAmount,
      additionalMessage
    } = req.body;
    if (!filePath || !to || !subject) {
      return res.status(400).json({
        error: "\uD544\uC218 \uB370\uC774\uD130\uAC00 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4. (filePath, to, subject \uD544\uC218)"
      });
    }
    if (!fs13.existsSync(filePath)) {
      return res.status(400).json({ error: "\uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
    const emailService = new POEmailServiceMock();
    const emailResult = await emailService.sendPOWithAttachments(filePath, {
      to,
      cc,
      bcc,
      subject,
      orderNumber,
      vendorName,
      orderDate,
      dueDate,
      totalAmount,
      additionalMessage
    });
    if (!emailResult.success) {
      return res.status(500).json({
        error: "\uC774\uBA54\uC77C \uBC1C\uC1A1 \uC2E4\uD328",
        details: emailResult.error
      });
    }
    res.json({
      success: true,
      message: emailResult.mockMode ? "\uC774\uBA54\uC77C \uBC1C\uC1A1 \uC644\uB8CC (Mock \uBAA8\uB4DC)" : "\uC774\uBA54\uC77C \uBC1C\uC1A1 \uC644\uB8CC",
      data: {
        messageId: emailResult.messageId,
        recipients: Array.isArray(to) ? to : [to],
        attachments: ["\uAC11\uC9C0/\uC744\uC9C0 \uC2DC\uD2B8 (Excel)", "\uAC11\uC9C0/\uC744\uC9C0 \uC2DC\uD2B8 (PDF)"],
        mockMode: emailResult.mockMode
      }
    });
  } catch (error) {
    console.error("\uC774\uBA54\uC77C \uBC1C\uC1A1 \uC624\uB958:", error);
    res.status(500).json({
      error: "\uC11C\uBC84 \uC624\uB958",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router10.post("/convert-to-pdf", requireAuth2, async (req, res) => {
  try {
    const { filePath, outputPath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "\uD30C\uC77C \uACBD\uB85C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." });
    }
    if (!fs13.existsSync(filePath)) {
      return res.status(400).json({ error: "\uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
    const timestamp2 = Date.now();
    const pdfPath = outputPath || path12.join(
      path12.dirname(filePath),
      `po-sheets-${timestamp2}.pdf`
    );
    const pdfResult = await convertExcelToPdfMock(filePath, pdfPath, ["\uAC11\uC9C0", "\uC744\uC9C0"]);
    if (!pdfResult.success) {
      return res.status(500).json({
        error: "PDF \uBCC0\uD658 \uC2E4\uD328",
        details: pdfResult.error
      });
    }
    res.json({
      success: true,
      message: "PDF \uBCC0\uD658 \uC644\uB8CC",
      data: {
        pdfPath: pdfResult.pdfPath,
        originalFile: filePath,
        convertedSheets: ["\uAC11\uC9C0", "\uC744\uC9C0"]
      }
    });
  } catch (error) {
    console.error("PDF \uBCC0\uD658 \uC624\uB958:", error);
    res.status(500).json({
      error: "\uC11C\uBC84 \uC624\uB958",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router10.post("/process-complete", requireAuth2, upload3.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "\uD30C\uC77C\uC774 \uC5C5\uB85C\uB4DC\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." });
    }
    const filePath = req.file.path;
    const {
      sendEmail,
      emailTo,
      emailSubject,
      emailMessage,
      generatePDF
    } = req.body;
    const results = {
      upload: null,
      validation: null,
      parsing: null,
      saving: null,
      extraction: null,
      pdf: null,
      email: null
    };
    console.log("\u{1F4C1} 1\uB2E8\uACC4: \uD30C\uC77C \uC5C5\uB85C\uB4DC \uBC0F \uC720\uD6A8\uC131 \uAC80\uC0AC");
    const validation = await POTemplateValidator.validatePOTemplateFile(filePath);
    results.validation = validation;
    if (!validation.isValid) {
      fs13.unlinkSync(filePath);
      return res.status(400).json({
        error: "\uC720\uD6A8\uC131 \uAC80\uC0AC \uC2E4\uD328",
        details: validation.errors.join(", "),
        results
      });
    }
    console.log("\u{1F4CA} 2\uB2E8\uACC4: \uB370\uC774\uD130 \uD30C\uC2F1");
    const parseResult = POTemplateProcessorMock.parseInputSheet(filePath);
    results.parsing = parseResult;
    if (!parseResult.success) {
      fs13.unlinkSync(filePath);
      return res.status(400).json({
        error: "\uD30C\uC2F1 \uC2E4\uD328",
        details: parseResult.error,
        results
      });
    }
    console.log("\u{1F4BE} 3\uB2E8\uACC4: \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC800\uC7A5");
    const saveResult = await (void 0).saveToDatabase(parseResult.orders, req.user.id);
    results.saving = saveResult;
    console.log("\u{1F4CB} 4\uB2E8\uACC4: \uAC11\uC9C0/\uC744\uC9C0 \uC2DC\uD2B8 \uCD94\uCD9C");
    const timestamp2 = Date.now();
    const extractedPath = path12.join(
      path12.dirname(filePath),
      `extracted-${timestamp2}.xlsx`
    );
    const extractResult = await POTemplateProcessorMock.extractSheetsToFile(
      filePath,
      extractedPath,
      ["\uAC11\uC9C0", "\uC744\uC9C0"]
    );
    results.extraction = extractResult;
    if (generatePDF) {
      console.log("\u{1F4C4} 5\uB2E8\uACC4: PDF \uBCC0\uD658");
      const pdfPath = path12.join(
        path12.dirname(filePath),
        `po-sheets-${timestamp2}.pdf`
      );
      const pdfResult = await convertExcelToPdfMock(extractedPath, pdfPath);
      results.pdf = pdfResult;
    }
    if (sendEmail && emailTo && emailSubject) {
      console.log("\u{1F4E7} 6\uB2E8\uACC4: \uC774\uBA54\uC77C \uBC1C\uC1A1");
      const emailService = new POEmailServiceMock();
      const emailResult = await emailService.sendPOWithAttachments(extractedPath, {
        to: emailTo,
        subject: emailSubject,
        orderNumber: parseResult.orders[0]?.orderNumber,
        vendorName: parseResult.orders[0]?.vendorName,
        orderDate: parseResult.orders[0]?.orderDate,
        dueDate: parseResult.orders[0]?.dueDate,
        totalAmount: parseResult.orders[0]?.totalAmount,
        additionalMessage: emailMessage
      });
      results.email = emailResult;
    }
    console.log("\u2705 \uBAA8\uB4E0 \uB2E8\uACC4 \uC644\uB8CC");
    res.json({
      success: true,
      message: "PO Template \uD1B5\uD569 \uCC98\uB9AC \uC644\uB8CC",
      data: {
        fileName: req.file.originalname,
        results,
        summary: {
          totalOrders: parseResult.totalOrders,
          totalItems: parseResult.totalItems,
          validationPassed: validation.isValid,
          savedToDatabase: saveResult.success,
          sheetsExtracted: extractResult.success,
          pdfGenerated: results.pdf?.success || false,
          emailSent: results.email?.success || false
        }
      }
    });
  } catch (error) {
    console.error("\uD1B5\uD569 \uCC98\uB9AC \uC624\uB958:", error);
    if (req.file && fs13.existsSync(req.file.path)) {
      fs13.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: "\uC11C\uBC84 \uC624\uB958",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router10.get("/test-email", requireAuth2, async (req, res) => {
  try {
    const emailService = new POEmailServiceMock();
    const testResult = await emailService.testConnection();
    res.json({
      success: true,
      message: testResult.mockMode ? "\uC774\uBA54\uC77C Mock \uBAA8\uB4DC \uC815\uC0C1" : "\uC774\uBA54\uC77C \uC11C\uBC84 \uC5F0\uACB0 \uC131\uACF5",
      data: {
        mockMode: testResult.mockMode,
        error: testResult.error
      }
    });
  } catch (error) {
    console.error("\uC774\uBA54\uC77C \uC5F0\uACB0 \uD14C\uC2A4\uD2B8 \uC624\uB958:", error);
    res.status(500).json({
      error: "\uC11C\uBC84 \uC624\uB958",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router10.post("/reset-db", requireAuth2, (req, res) => {
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
router10.saveToDatabase = async function(orders, userId) {
  if (db) {
    try {
      let savedOrders = 0;
      for (const orderData of orders) {
        let vendor = await db.select().from(vendors).where(eq7(vendors.name, orderData.vendorName)).limit(1);
        let vendorId;
        if (vendor.length === 0) {
          const newVendor = await db.insert(vendors).values({
            name: orderData.vendorName,
            contactPerson: "\uC790\uB3D9\uC0DD\uC131",
            email: `auto-${Date.now()}@example.com`,
            mainContact: "\uC790\uB3D9\uC0DD\uC131"
          }).returning();
          vendorId = newVendor[0].id;
        } else {
          vendorId = vendor[0].id;
        }
        let project = await db.select().from(projects).where(eq7(projects.projectName, orderData.siteName)).limit(1);
        let projectId;
        if (project.length === 0) {
          const newProject = await db.insert(projects).values({
            projectName: orderData.siteName,
            projectCode: `AUTO-${Date.now().toString().slice(-8)}`,
            status: "active"
          }).returning();
          projectId = newProject[0].id;
        } else {
          projectId = project[0].id;
        }
        const newOrder = await db.insert(purchaseOrders).values({
          orderNumber: orderData.orderNumber,
          projectId,
          vendorId,
          userId,
          orderDate: new Date(orderData.orderDate),
          deliveryDate: orderData.dueDate ? new Date(orderData.dueDate) : null,
          totalAmount: orderData.totalAmount,
          status: "draft",
          notes: "PO Template\uC5D0\uC11C \uC790\uB3D9 \uC0DD\uC131\uB428"
        }).returning();
        const orderId = newOrder[0].id;
        for (const item of orderData.items) {
          await db.insert(purchaseOrderItems).values({
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
      return {
        success: true,
        savedOrders,
        usingMockDB: false
      };
    } catch (dbError) {
      console.error("\uC2E4\uC81C DB \uC800\uC7A5 \uC2E4\uD328, Mock DB\uB85C \uD3F4\uBC31:", dbError);
      const mockResult = await POTemplateProcessorMock.saveToDatabase(orders, userId);
      return {
        success: mockResult.success,
        savedOrders: mockResult.savedOrders,
        usingMockDB: true,
        dbError: dbError instanceof Error ? dbError.message : "Unknown error"
      };
    }
  } else {
    const mockResult = await POTemplateProcessorMock.saveToDatabase(orders, userId);
    return {
      success: mockResult.success,
      savedOrders: mockResult.savedOrders,
      usingMockDB: true
    };
  }
};
var po_template_real_default = router10;

// server/routes/reports.ts
import { Router as Router11 } from "express";
init_db();
init_schema();
import { eq as eq8, sql as sql6, and as and5, gte as gte3, lte as lte3, inArray as inArray2 } from "drizzle-orm";
import * as XLSX6 from "xlsx";
var formatKoreanWon = (amount) => {
  return `\u20A9${amount.toLocaleString("ko-KR")}`;
};
var router11 = Router11();
router11.get("/debug-data", async (req, res) => {
  try {
    console.log("Debug data endpoint called");
    const orderCount = await db.select({
      count: sql6`count(*)`
    }).from(purchaseOrders);
    const itemCount = await db.select({
      count: sql6`count(*)`
    }).from(purchaseOrderItems);
    const itemsWithCategories = await db.select({
      count: sql6`count(*)`,
      withMajor: sql6`count(${items.majorCategory})`,
      withMiddle: sql6`count(${items.middleCategory})`,
      withMinor: sql6`count(${items.minorCategory})`
    }).from(items);
    const vendorCount = await db.select({
      count: sql6`count(*)`
    }).from(vendors);
    const sampleOrders = await db.select().from(purchaseOrders).limit(3);
    const sampleItems = await db.select().from(purchaseOrderItems).limit(3);
    const sampleItemsData = await db.select().from(items).limit(3);
    res.json({
      counts: {
        orders: orderCount[0],
        orderItems: itemCount[0],
        items: itemsWithCategories[0],
        vendors: vendorCount[0]
      },
      samples: {
        orders: sampleOrders,
        orderItems: sampleItems,
        items: sampleItemsData
      }
    });
  } catch (error) {
    console.error("Debug data error:", error);
    res.status(500).json({ error: "Debug failed" });
  }
});
var parseDateFilters = (startDate, endDate) => {
  const filters = [];
  if (startDate && startDate !== "") {
    filters.push(gte3(purchaseOrders.orderDate, new Date(startDate)));
  }
  if (endDate && endDate !== "") {
    filters.push(lte3(purchaseOrders.orderDate, new Date(endDate)));
  }
  return filters;
};
router11.get("/by-category", async (req, res) => {
  try {
    const { startDate, endDate, categoryType = "major" } = req.query;
    const dateFilters = parseDateFilters(startDate, endDate);
    console.log("Category report filters:", { startDate, endDate, categoryType });
    let query = db.select({
      orderId: purchaseOrderItems.orderId,
      itemName: purchaseOrderItems.itemName,
      majorCategory: purchaseOrderItems.majorCategory,
      middleCategory: purchaseOrderItems.middleCategory,
      minorCategory: purchaseOrderItems.minorCategory,
      quantity: purchaseOrderItems.quantity,
      totalAmount: purchaseOrderItems.totalAmount,
      orderDate: purchaseOrders.orderDate,
      orderStatus: purchaseOrders.status,
      specification: purchaseOrderItems.specification,
      unitPrice: purchaseOrderItems.unitPrice
    }).from(purchaseOrderItems).innerJoin(purchaseOrders, eq8(purchaseOrderItems.orderId, purchaseOrders.id));
    if (dateFilters.length > 0) {
      query = query.where(and5(...dateFilters));
    }
    const orderItemsWithCategories = await query;
    console.log("Order items with categories found:", orderItemsWithCategories.length);
    if (orderItemsWithCategories.length > 0) {
      console.log("Sample item:", orderItemsWithCategories[0]);
    }
    const categoryReport = orderItemsWithCategories.reduce((acc, item) => {
      let categoryKey = "";
      let hierarchyPath = "";
      switch (categoryType) {
        case "major":
          categoryKey = item.majorCategory || "\uBBF8\uBD84\uB958";
          hierarchyPath = categoryKey;
          break;
        case "middle":
          categoryKey = item.middleCategory || "\uBBF8\uBD84\uB958";
          hierarchyPath = `${item.majorCategory || "\uBBF8\uBD84\uB958"} > ${categoryKey}`;
          break;
        case "minor":
          categoryKey = item.minorCategory || "\uBBF8\uBD84\uB958";
          hierarchyPath = `${item.majorCategory || "\uBBF8\uBD84\uB958"} > ${item.middleCategory || "\uBBF8\uBD84\uB958"} > ${categoryKey}`;
          break;
      }
      if (!acc[categoryKey]) {
        acc[categoryKey] = {
          category: categoryKey,
          hierarchyPath,
          majorCategory: item.majorCategory,
          middleCategory: item.middleCategory,
          minorCategory: item.minorCategory,
          orderCount: /* @__PURE__ */ new Set(),
          itemCount: 0,
          totalQuantity: 0,
          totalAmount: 0,
          statusBreakdown: {},
          topItems: {}
        };
      }
      acc[categoryKey].orderCount.add(item.orderId);
      acc[categoryKey].itemCount += 1;
      acc[categoryKey].totalQuantity += parseFloat(item.quantity);
      acc[categoryKey].totalAmount += parseFloat(item.totalAmount);
      if (!acc[categoryKey].statusBreakdown[item.orderStatus]) {
        acc[categoryKey].statusBreakdown[item.orderStatus] = 0;
      }
      acc[categoryKey].statusBreakdown[item.orderStatus] += 1;
      if (!acc[categoryKey].topItems[item.itemName]) {
        acc[categoryKey].topItems[item.itemName] = {
          quantity: 0,
          amount: 0,
          specification: item.specification
        };
      }
      acc[categoryKey].topItems[item.itemName].quantity += parseFloat(item.quantity);
      acc[categoryKey].topItems[item.itemName].amount += parseFloat(item.totalAmount);
      return acc;
    }, {});
    const reportData = Object.values(categoryReport).map((item) => {
      const topItemsArray = Object.entries(item.topItems).map(([name, data]) => ({
        itemName: name,
        quantity: data.quantity,
        amount: data.amount,
        specification: data.specification
      })).sort((a, b) => b.amount - a.amount).slice(0, 5);
      return {
        ...item,
        orderCount: item.orderCount.size,
        averageAmount: item.totalAmount / item.itemCount,
        topItems: topItemsArray
      };
    });
    reportData.sort((a, b) => b.totalAmount - a.totalAmount);
    res.json({
      categoryType,
      period: {
        startDate: startDate || "all",
        endDate: endDate || "all"
      },
      summary: {
        totalCategories: reportData.length,
        totalOrders: new Set(orderItemsWithCategories.map((item) => item.orderId)).size,
        totalItems: orderItemsWithCategories.length,
        totalAmount: reportData.reduce((sum2, item) => sum2 + item.totalAmount, 0)
      },
      data: reportData
    });
  } catch (error) {
    console.error("Error generating category report:", error);
    res.status(500).json({ error: "Failed to generate category report" });
  }
});
router11.get("/by-project", requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, projectId } = req.query;
    const filters = parseDateFilters(startDate, endDate);
    if (projectId) {
      filters.push(eq8(purchaseOrders.projectId, parseInt(projectId)));
    }
    const ordersWithProjects = await db.select({
      projectId: projects.id,
      projectName: projects.projectName,
      projectCode: projects.projectCode,
      projectStatus: projects.status,
      orderId: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      orderDate: purchaseOrders.orderDate,
      totalAmount: purchaseOrders.totalAmount,
      orderStatus: purchaseOrders.status,
      vendorId: purchaseOrders.vendorId,
      vendorName: vendors.name
    }).from(purchaseOrders).innerJoin(projects, eq8(purchaseOrders.projectId, projects.id)).leftJoin(vendors, eq8(purchaseOrders.vendorId, vendors.id)).where(filters.length > 0 ? and5(...filters) : void 0);
    const projectReport = ordersWithProjects.reduce((acc, order) => {
      const projectKey = order.projectId;
      if (!acc[projectKey]) {
        acc[projectKey] = {
          projectId: order.projectId,
          projectName: order.projectName,
          projectCode: order.projectCode,
          projectStatus: order.projectStatus,
          orderCount: 0,
          totalAmount: 0,
          vendors: /* @__PURE__ */ new Set(),
          statusBreakdown: {},
          monthlyBreakdown: {}
        };
      }
      acc[projectKey].orderCount += 1;
      acc[projectKey].totalAmount += parseFloat(order.totalAmount);
      if (order.vendorId) {
        acc[projectKey].vendors.add(order.vendorName);
      }
      if (!acc[projectKey].statusBreakdown[order.orderStatus]) {
        acc[projectKey].statusBreakdown[order.orderStatus] = 0;
      }
      acc[projectKey].statusBreakdown[order.orderStatus] += 1;
      const month = new Date(order.orderDate).toISOString().slice(0, 7);
      if (!acc[projectKey].monthlyBreakdown[month]) {
        acc[projectKey].monthlyBreakdown[month] = {
          count: 0,
          amount: 0
        };
      }
      acc[projectKey].monthlyBreakdown[month].count += 1;
      acc[projectKey].monthlyBreakdown[month].amount += parseFloat(order.totalAmount);
      return acc;
    }, {});
    const reportData = Object.values(projectReport).map((item) => ({
      ...item,
      vendorCount: item.vendors.size,
      vendors: Array.from(item.vendors),
      averageOrderAmount: item.totalAmount / item.orderCount
    }));
    reportData.sort((a, b) => b.totalAmount - a.totalAmount);
    res.json({
      period: {
        startDate: startDate || "all",
        endDate: endDate || "all"
      },
      summary: {
        totalProjects: reportData.length,
        totalOrders: ordersWithProjects.length,
        totalAmount: reportData.reduce((sum2, item) => sum2 + item.totalAmount, 0),
        averagePerProject: reportData.length > 0 ? reportData.reduce((sum2, item) => sum2 + item.totalAmount, 0) / reportData.length : 0
      },
      data: reportData
    });
  } catch (error) {
    console.error("Error generating project report:", error);
    res.status(500).json({ error: "Failed to generate project report" });
  }
});
router11.get("/by-vendor", async (req, res) => {
  try {
    const { startDate, endDate, vendorId } = req.query;
    const filters = parseDateFilters(startDate, endDate);
    console.log("Vendor report starting...");
    console.log("Vendor report filters:", { startDate, endDate, vendorId, filters });
    console.log("Starting vendor report generation...");
    let vendorQuery = db.select({
      vendorId: vendors.id,
      vendorName: vendors.name,
      vendorCode: vendors.vendorCode,
      businessNumber: vendors.businessNumber,
      orderId: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      orderDate: purchaseOrders.orderDate,
      totalAmount: purchaseOrders.totalAmount,
      orderStatus: purchaseOrders.status,
      projectId: purchaseOrders.projectId,
      projectName: projects.projectName,
      originalVendorId: purchaseOrders.vendorId
      // Add original vendorId for null check
    }).from(purchaseOrders).leftJoin(vendors, eq8(purchaseOrders.vendorId, vendors.id)).leftJoin(projects, eq8(purchaseOrders.projectId, projects.id));
    if (filters.length > 0) {
      vendorQuery = vendorQuery.where(and5(...filters));
    }
    const ordersWithVendors = await vendorQuery;
    console.log("Orders with vendors found:", ordersWithVendors.length);
    const orderIds = ordersWithVendors.map((o) => o.orderId);
    const orderItemsData = await db.select({
      orderId: purchaseOrderItems.orderId,
      itemName: purchaseOrderItems.itemName,
      majorCategory: purchaseOrderItems.majorCategory,
      quantity: purchaseOrderItems.quantity,
      totalAmount: purchaseOrderItems.totalAmount
    }).from(purchaseOrderItems).where(inArray2(purchaseOrderItems.orderId, orderIds));
    const vendorReport = ordersWithVendors.reduce((acc, order) => {
      const vendorKey = order.vendorId || "unassigned";
      if (!acc[vendorKey]) {
        acc[vendorKey] = {
          vendorId: order.vendorId,
          vendorName: order.vendorName || "\uAC70\uB798\uCC98 \uBBF8\uC9C0\uC815",
          vendorCode: order.vendorCode || "N/A",
          businessNumber: order.businessNumber || "N/A",
          orderCount: 0,
          totalAmount: 0,
          projects: /* @__PURE__ */ new Set(),
          statusBreakdown: {},
          monthlyBreakdown: {},
          categoryBreakdown: {},
          topItems: {}
        };
      }
      acc[vendorKey].orderCount += 1;
      acc[vendorKey].totalAmount += parseFloat(order.totalAmount);
      if (order.projectId) {
        acc[vendorKey].projects.add(order.projectName);
      }
      if (!acc[vendorKey].statusBreakdown[order.orderStatus]) {
        acc[vendorKey].statusBreakdown[order.orderStatus] = 0;
      }
      acc[vendorKey].statusBreakdown[order.orderStatus] += 1;
      const month = new Date(order.orderDate).toISOString().slice(0, 7);
      if (!acc[vendorKey].monthlyBreakdown[month]) {
        acc[vendorKey].monthlyBreakdown[month] = {
          count: 0,
          amount: 0
        };
      }
      acc[vendorKey].monthlyBreakdown[month].count += 1;
      acc[vendorKey].monthlyBreakdown[month].amount += parseFloat(order.totalAmount);
      return acc;
    }, {});
    orderItemsData.forEach((item) => {
      const order = ordersWithVendors.find((o) => o.orderId === item.orderId);
      if (order) {
        const vendorKey = order.vendorId || "unassigned";
        if (vendorReport[vendorKey]) {
          const vendor = vendorReport[vendorKey];
          const category = item.majorCategory || "\uBBF8\uBD84\uB958";
          if (!vendor.categoryBreakdown[category]) {
            vendor.categoryBreakdown[category] = {
              count: 0,
              amount: 0
            };
          }
          vendor.categoryBreakdown[category].count += 1;
          vendor.categoryBreakdown[category].amount += parseFloat(item.totalAmount);
          if (!vendor.topItems[item.itemName]) {
            vendor.topItems[item.itemName] = {
              quantity: 0,
              amount: 0
            };
          }
          vendor.topItems[item.itemName].quantity += parseFloat(item.quantity);
          vendor.topItems[item.itemName].amount += parseFloat(item.totalAmount);
        }
      }
    });
    const reportData = Object.values(vendorReport).map((vendor) => {
      const topItemsArray = Object.entries(vendor.topItems).map(([name, data]) => ({
        itemName: name,
        quantity: data.quantity,
        amount: data.amount
      })).sort((a, b) => b.amount - a.amount).slice(0, 5);
      return {
        ...vendor,
        projectCount: vendor.projects.size,
        projects: Array.from(vendor.projects),
        averageOrderAmount: vendor.totalAmount / vendor.orderCount,
        topItems: topItemsArray
      };
    });
    reportData.sort((a, b) => b.totalAmount - a.totalAmount);
    res.json({
      period: {
        startDate: startDate || "all",
        endDate: endDate || "all"
      },
      summary: {
        totalVendors: reportData.length,
        totalOrders: ordersWithVendors.length,
        totalAmount: reportData.reduce((sum2, item) => sum2 + item.totalAmount, 0),
        averagePerVendor: reportData.length > 0 ? reportData.reduce((sum2, item) => sum2 + item.totalAmount, 0) / reportData.length : 0
      },
      data: reportData
    });
  } catch (error) {
    console.error("Error generating vendor report:", error);
    console.error("Error details:", error.message, error.stack);
    res.status(500).json({
      error: "Failed to generate vendor report",
      details: error.message,
      debug: "Check server console for full error"
    });
  }
});
router11.get("/export-excel", requireAuth, async (req, res) => {
  try {
    const { type, startDate, endDate, categoryType } = req.query;
    let reportData;
    let sheetName;
    switch (type) {
      case "category":
        const categoryResponse = await fetch(`${req.protocol}://${req.get("host")}/api/reports/by-category?startDate=${startDate || ""}&endDate=${endDate || ""}&categoryType=${categoryType || "major"}`, {
          headers: {
            "Cookie": req.headers.cookie || ""
          }
        });
        reportData = await categoryResponse.json();
        sheetName = "\uBD84\uB958\uBCC4 \uBCF4\uACE0\uC11C";
        break;
      case "project":
        const projectResponse = await fetch(`${req.protocol}://${req.get("host")}/api/reports/by-project?startDate=${startDate || ""}&endDate=${endDate || ""}`, {
          headers: {
            "Cookie": req.headers.cookie || ""
          }
        });
        reportData = await projectResponse.json();
        sheetName = "\uD504\uB85C\uC81D\uD2B8\uBCC4 \uBCF4\uACE0\uC11C";
        break;
      case "vendor":
        const vendorResponse = await fetch(`${req.protocol}://${req.get("host")}/api/reports/by-vendor?startDate=${startDate || ""}&endDate=${endDate || ""}`, {
          headers: {
            "Cookie": req.headers.cookie || ""
          }
        });
        reportData = await vendorResponse.json();
        sheetName = "\uAC70\uB798\uCC98\uBCC4 \uBCF4\uACE0\uC11C";
        break;
      default:
        return res.status(400).json({ error: "Invalid report type" });
    }
    const wb = XLSX6.utils.book_new();
    const summaryData = [
      ["\uBCF4\uACE0\uC11C \uC720\uD615", sheetName],
      ["\uAE30\uAC04", `${reportData.period.startDate} ~ ${reportData.period.endDate}`],
      ["\uC0DD\uC131\uC77C\uC2DC", (/* @__PURE__ */ new Date()).toLocaleString("ko-KR")],
      [],
      ["\uC694\uC57D \uC815\uBCF4"]
    ];
    Object.entries(reportData.summary).forEach(([key, value]) => {
      const label = key === "totalCategories" ? "\uCD1D \uBD84\uB958 \uC218" : key === "totalProjects" ? "\uCD1D \uD504\uB85C\uC81D\uD2B8 \uC218" : key === "totalVendors" ? "\uCD1D \uAC70\uB798\uCC98 \uC218" : key === "totalOrders" ? "\uCD1D \uBC1C\uC8FC \uC218" : key === "totalItems" ? "\uCD1D \uD488\uBAA9 \uC218" : key === "totalAmount" ? "\uCD1D \uAE08\uC561" : key === "averagePerProject" ? "\uD504\uB85C\uC81D\uD2B8\uB2F9 \uD3C9\uADE0" : key === "averagePerVendor" ? "\uAC70\uB798\uCC98\uB2F9 \uD3C9\uADE0" : key;
      const formattedValue = key.includes("Amount") || key.includes("average") ? formatKoreanWon(Math.floor(value)) : value;
      summaryData.push([label, formattedValue]);
    });
    const summarySheet = XLSX6.utils.aoa_to_sheet(summaryData);
    XLSX6.utils.book_append_sheet(wb, summarySheet, "\uC694\uC57D");
    let detailData = [];
    if (type === "category") {
      detailData = [
        ["\uBD84\uB958", "\uBC1C\uC8FC \uC218", "\uD488\uBAA9 \uC218", "\uCD1D \uC218\uB7C9", "\uCD1D \uAE08\uC561", "\uD3C9\uADE0 \uAE08\uC561"]
      ];
      reportData.data.forEach((item) => {
        detailData.push([
          item.category,
          item.orderCount,
          item.itemCount,
          item.totalQuantity,
          formatKoreanWon(Math.floor(item.totalAmount)),
          formatKoreanWon(Math.floor(item.averageAmount))
        ]);
      });
    } else if (type === "project") {
      detailData = [
        ["\uD504\uB85C\uC81D\uD2B8\uBA85", "\uD504\uB85C\uC81D\uD2B8 \uCF54\uB4DC", "\uC0C1\uD0DC", "\uBC1C\uC8FC \uC218", "\uAC70\uB798\uCC98 \uC218", "\uCD1D \uAE08\uC561", "\uD3C9\uADE0 \uAE08\uC561"]
      ];
      reportData.data.forEach((item) => {
        detailData.push([
          item.projectName,
          item.projectCode,
          item.projectStatus,
          item.orderCount,
          item.vendorCount,
          formatKoreanWon(Math.floor(item.totalAmount)),
          formatKoreanWon(Math.floor(item.averageOrderAmount))
        ]);
      });
    } else if (type === "vendor") {
      detailData = [
        ["\uAC70\uB798\uCC98\uBA85", "\uAC70\uB798\uCC98 \uCF54\uB4DC", "\uC0AC\uC5C5\uC790\uBC88\uD638", "\uBC1C\uC8FC \uC218", "\uD504\uB85C\uC81D\uD2B8 \uC218", "\uCD1D \uAE08\uC561", "\uD3C9\uADE0 \uAE08\uC561"]
      ];
      reportData.data.forEach((item) => {
        detailData.push([
          item.vendorName,
          item.vendorCode,
          item.businessNumber,
          item.orderCount,
          item.projectCount,
          formatKoreanWon(Math.floor(item.totalAmount)),
          formatKoreanWon(Math.floor(item.averageOrderAmount))
        ]);
      });
    }
    const detailSheet = XLSX6.utils.aoa_to_sheet(detailData);
    XLSX6.utils.book_append_sheet(wb, detailSheet, "\uC0C1\uC138 \uB370\uC774\uD130");
    const buffer = XLSX6.write(wb, { bookType: "xlsx", type: "buffer" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${sheetName}_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting Excel:", error);
    res.status(500).json({ error: "Failed to export Excel" });
  }
});
router11.get("/summary", requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilters = parseDateFilters(startDate, endDate);
    const ordersSummary = await db.select({
      totalOrders: sql6`count(*)`,
      totalAmount: sql6`sum(${purchaseOrders.totalAmount})`,
      avgAmount: sql6`avg(${purchaseOrders.totalAmount})`
    }).from(purchaseOrders).where(dateFilters.length > 0 ? and5(...dateFilters) : void 0);
    const statusBreakdown = await db.select({
      status: purchaseOrders.status,
      count: sql6`count(*)`,
      totalAmount: sql6`sum(${purchaseOrders.totalAmount})`
    }).from(purchaseOrders).where(and5(...dateFilters)).groupBy(purchaseOrders.status);
    const topVendors = await db.select({
      vendorId: vendors.id,
      vendorName: vendors.name,
      orderCount: sql6`count(${purchaseOrders.id})`,
      totalAmount: sql6`sum(${purchaseOrders.totalAmount})`
    }).from(purchaseOrders).innerJoin(vendors, eq8(purchaseOrders.vendorId, vendors.id)).where(and5(...dateFilters)).groupBy(vendors.id, vendors.name).orderBy(sql6`sum(${purchaseOrders.totalAmount}) desc`).limit(10);
    const topProjects = await db.select({
      projectId: projects.id,
      projectName: projects.projectName,
      orderCount: sql6`count(${purchaseOrders.id})`,
      totalAmount: sql6`sum(${purchaseOrders.totalAmount})`
    }).from(purchaseOrders).innerJoin(projects, eq8(purchaseOrders.projectId, projects.id)).where(and5(...dateFilters)).groupBy(projects.id, projects.projectName).orderBy(sql6`sum(${purchaseOrders.totalAmount}) desc`).limit(10);
    const monthlyTrend = await db.select({
      month: sql6`to_char(${purchaseOrders.orderDate}, 'YYYY-MM')`,
      orderCount: sql6`count(*)`,
      totalAmount: sql6`sum(${purchaseOrders.totalAmount})`
    }).from(purchaseOrders).where(and5(...dateFilters)).groupBy(sql6`to_char(${purchaseOrders.orderDate}, 'YYYY-MM')`).orderBy(sql6`to_char(${purchaseOrders.orderDate}, 'YYYY-MM')`);
    res.json({
      period: {
        startDate: startDate || "all",
        endDate: endDate || "all"
      },
      summary: ordersSummary[0],
      statusBreakdown,
      topVendors,
      topProjects,
      monthlyTrend
    });
  } catch (error) {
    console.error("Error generating summary report:", error);
    res.status(500).json({ error: "Failed to generate summary report" });
  }
});
var reports_default = router11;

// server/routes/import-export.ts
import { Router as Router12 } from "express";

// server/utils/import-export-service.ts
init_db();
init_schema();
import * as XLSX7 from "xlsx";
import Papa from "papaparse";
import { eq as eq9 } from "drizzle-orm";
import fs14 from "fs";
var ImportExportService = class {
  // Parse Excel file
  static parseExcelFile(filePath) {
    const workbook = XLSX7.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX7.utils.sheet_to_json(worksheet);
    return data;
  }
  // Parse CSV file
  static parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const fileContent = fs14.readFileSync(filePath, "utf8");
      Papa.parse(fileContent, {
        header: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }
  // Vendor Import Methods
  static async importVendors(filePath, fileType) {
    try {
      const data = fileType === "excel" ? this.parseExcelFile(filePath) : await this.parseCSVFile(filePath);
      let imported = 0;
      const errors = [];
      for (const row of data) {
        try {
          const vendorData = {
            name: row["\uAC70\uB798\uCC98\uBA85"] || row["name"] || "",
            vendorCode: row["\uAC70\uB798\uCC98\uCF54\uB4DC"] || row["vendorCode"],
            businessNumber: row["\uC0AC\uC5C5\uC790\uBC88\uD638"] || row["businessNumber"],
            contactPerson: row["\uB2F4\uB2F9\uC790"] || row["contactPerson"] || "",
            email: row["\uC774\uBA54\uC77C"] || row["email"] || "",
            phone: row["\uC804\uD654\uBC88\uD638"] || row["phone"],
            address: row["\uC8FC\uC18C"] || row["address"],
            businessType: row["\uC0AC\uC5C5\uC720\uD615"] || row["businessType"]
          };
          if (row["\uBCC4\uCE6D"] || row["aliases"]) {
            const aliasesStr = row["\uBCC4\uCE6D"] || row["aliases"];
            try {
              vendorData.aliases = JSON.stringify(
                typeof aliasesStr === "string" ? aliasesStr.split(",").map((a) => a.trim()) : aliasesStr
              );
            } catch (e) {
              vendorData.aliases = "[]";
            }
          }
          if (!vendorData.name || !vendorData.contactPerson || !vendorData.email) {
            errors.push({ row: imported + errors.length + 1, error: "Missing required fields", data: row });
            continue;
          }
          await db.insert(vendors).values({
            ...vendorData,
            aliases: vendorData.aliases ? JSON.parse(vendorData.aliases) : []
          });
          imported++;
        } catch (error) {
          errors.push({ row: imported + errors.length + 1, error: error.message, data: row });
        }
      }
      return { imported, errors };
    } catch (error) {
      throw new Error(`Failed to import vendors: ${error.message}`);
    }
  }
  // Item Import Methods
  static async importItems(filePath, fileType) {
    try {
      const data = fileType === "excel" ? this.parseExcelFile(filePath) : await this.parseCSVFile(filePath);
      let imported = 0;
      const errors = [];
      for (const row of data) {
        try {
          const itemData = {
            name: row["\uD488\uBAA9\uBA85"] || row["name"] || "",
            specification: row["\uADDC\uACA9"] || row["specification"],
            unit: row["\uB2E8\uC704"] || row["unit"] || "",
            unitPrice: parseFloat(row["\uB2E8\uAC00"] || row["unitPrice"]) || void 0,
            majorCategory: row["\uB300\uBD84\uB958"] || row["majorCategory"],
            middleCategory: row["\uC911\uBD84\uB958"] || row["middleCategory"],
            minorCategory: row["\uC18C\uBD84\uB958"] || row["minorCategory"],
            description: row["\uC124\uBA85"] || row["description"]
          };
          if (!itemData.name || !itemData.unit) {
            errors.push({ row: imported + errors.length + 1, error: "Missing required fields", data: row });
            continue;
          }
          await db.insert(items).values(itemData);
          imported++;
        } catch (error) {
          errors.push({ row: imported + errors.length + 1, error: error.message, data: row });
        }
      }
      return { imported, errors };
    } catch (error) {
      throw new Error(`Failed to import items: ${error.message}`);
    }
  }
  // Project Import Methods
  static async importProjects(filePath, fileType) {
    try {
      const data = fileType === "excel" ? this.parseExcelFile(filePath) : await this.parseCSVFile(filePath);
      let imported = 0;
      const errors = [];
      const projectTypeMap = {
        "\uC0C1\uC5C5\uC2DC\uC124": "commercial",
        "\uC8FC\uAC70\uC2DC\uC124": "residential",
        "\uC0B0\uC5C5\uC2DC\uC124": "industrial",
        "\uC778\uD504\uB77C": "infrastructure"
      };
      const statusMap = {
        "\uACC4\uD68D\uC911": "planning",
        "\uC9C4\uD589\uC911": "active",
        "\uBCF4\uB958": "on_hold",
        "\uC644\uB8CC": "completed",
        "\uCDE8\uC18C": "cancelled"
      };
      for (const row of data) {
        try {
          const projectData = {
            projectName: row["\uD504\uB85C\uC81D\uD2B8\uBA85"] || row["projectName"] || "",
            projectCode: row["\uD504\uB85C\uC81D\uD2B8\uCF54\uB4DC"] || row["projectCode"] || "",
            clientName: row["\uBC1C\uC8FC\uCC98"] || row["clientName"],
            projectType: projectTypeMap[row["\uD504\uB85C\uC81D\uD2B8\uC720\uD615"]] || row["projectType"] || "commercial",
            location: row["\uC704\uCE58"] || row["location"],
            startDate: row["\uC2DC\uC791\uC77C"] || row["startDate"],
            endDate: row["\uC885\uB8CC\uC77C"] || row["endDate"],
            status: statusMap[row["\uC0C1\uD0DC"]] || row["status"] || "active",
            totalBudget: parseFloat(row["\uC608\uC0B0"] || row["totalBudget"]) || void 0,
            description: row["\uC124\uBA85"] || row["description"]
          };
          if (!projectData.projectName || !projectData.projectCode) {
            errors.push({ row: imported + errors.length + 1, error: "Missing required fields", data: row });
            continue;
          }
          await db.insert(projects).values(projectData);
          imported++;
        } catch (error) {
          errors.push({ row: imported + errors.length + 1, error: error.message, data: row });
        }
      }
      return { imported, errors };
    } catch (error) {
      throw new Error(`Failed to import projects: ${error.message}`);
    }
  }
  // Export Methods
  static async exportVendors(format) {
    const vendorData = await db.select().from(vendors).where(eq9(vendors.isActive, true));
    const exportData = vendorData.map((vendor) => ({
      "\uAC70\uB798\uCC98\uBA85": vendor.name,
      "\uAC70\uB798\uCC98\uCF54\uB4DC": vendor.vendorCode || "",
      "\uBCC4\uCE6D": vendor.aliases ? vendor.aliases.join(", ") : "",
      "\uC0AC\uC5C5\uC790\uBC88\uD638": vendor.businessNumber || "",
      "\uB2F4\uB2F9\uC790": vendor.contactPerson,
      "\uC774\uBA54\uC77C": vendor.email,
      "\uC804\uD654\uBC88\uD638": vendor.phone || "",
      "\uC8FC\uC18C": vendor.address || "",
      "\uC0AC\uC5C5\uC720\uD615": vendor.businessType || "",
      "\uC0DD\uC131\uC77C": vendor.createdAt?.toISOString().split("T")[0] || ""
    }));
    if (format === "excel") {
      const ws = XLSX7.utils.json_to_sheet(exportData);
      const wb = XLSX7.utils.book_new();
      XLSX7.utils.book_append_sheet(wb, ws, "\uAC70\uB798\uCC98\uBAA9\uB85D");
      return Buffer.from(XLSX7.write(wb, { bookType: "xlsx", type: "buffer" }));
    } else {
      const csv = Papa.unparse(exportData, {
        header: true,
        encoding: "utf8"
      });
      return Buffer.from(csv, "utf8");
    }
  }
  static async exportItems(format) {
    const itemData = await db.select().from(items).where(eq9(items.isActive, true));
    const exportData = itemData.map((item) => ({
      "\uD488\uBAA9\uBA85": item.name,
      "\uADDC\uACA9": item.specification || "",
      "\uB2E8\uC704": item.unit,
      "\uB2E8\uAC00": item.unitPrice || "",
      "\uB300\uBD84\uB958": item.majorCategory || "",
      "\uC911\uBD84\uB958": item.middleCategory || "",
      "\uC18C\uBD84\uB958": item.minorCategory || "",
      "\uC124\uBA85": item.description || "",
      "\uC0DD\uC131\uC77C": item.createdAt?.toISOString().split("T")[0] || ""
    }));
    if (format === "excel") {
      const ws = XLSX7.utils.json_to_sheet(exportData);
      const wb = XLSX7.utils.book_new();
      XLSX7.utils.book_append_sheet(wb, ws, "\uD488\uBAA9\uBAA9\uB85D");
      return Buffer.from(XLSX7.write(wb, { bookType: "xlsx", type: "buffer" }));
    } else {
      const csv = Papa.unparse(exportData, {
        header: true,
        encoding: "utf8"
      });
      return Buffer.from(csv, "utf8");
    }
  }
  static async exportProjects(format) {
    const projectData = await db.select().from(projects).where(eq9(projects.isActive, true));
    const typeMap = {
      "commercial": "\uC0C1\uC5C5\uC2DC\uC124",
      "residential": "\uC8FC\uAC70\uC2DC\uC124",
      "industrial": "\uC0B0\uC5C5\uC2DC\uC124",
      "infrastructure": "\uC778\uD504\uB77C"
    };
    const statusMap = {
      "planning": "\uACC4\uD68D\uC911",
      "active": "\uC9C4\uD589\uC911",
      "on_hold": "\uBCF4\uB958",
      "completed": "\uC644\uB8CC",
      "cancelled": "\uCDE8\uC18C"
    };
    const exportData = projectData.map((project) => ({
      "\uD504\uB85C\uC81D\uD2B8\uBA85": project.projectName,
      "\uD504\uB85C\uC81D\uD2B8\uCF54\uB4DC": project.projectCode,
      "\uBC1C\uC8FC\uCC98": project.clientName || "",
      "\uD504\uB85C\uC81D\uD2B8\uC720\uD615": typeMap[project.projectType] || project.projectType,
      "\uC704\uCE58": project.location || "",
      "\uC2DC\uC791\uC77C": project.startDate || "",
      "\uC885\uB8CC\uC77C": project.endDate || "",
      "\uC0C1\uD0DC": statusMap[project.status] || project.status,
      "\uC608\uC0B0": project.totalBudget || "",
      "\uC124\uBA85": project.description || "",
      "\uC0DD\uC131\uC77C": project.createdAt?.toISOString().split("T")[0] || ""
    }));
    if (format === "excel") {
      const ws = XLSX7.utils.json_to_sheet(exportData);
      const wb = XLSX7.utils.book_new();
      XLSX7.utils.book_append_sheet(wb, ws, "\uD504\uB85C\uC81D\uD2B8\uBAA9\uB85D");
      return Buffer.from(XLSX7.write(wb, { bookType: "xlsx", type: "buffer" }));
    } else {
      const csv = Papa.unparse(exportData, {
        header: true,
        encoding: "utf8"
      });
      return Buffer.from(csv, "utf8");
    }
  }
  // Generate sample template files
  static generateImportTemplate(entity, format) {
    const templates = {
      vendors: [
        {
          "\uAC70\uB798\uCC98\uBA85": "\uC608\uC2DC\uAC70\uB798\uCC98",
          "\uAC70\uB798\uCC98\uCF54\uB4DC": "VENDOR001",
          "\uBCC4\uCE6D": "\uC608\uC2DC1, \uC608\uC2DC2",
          "\uC0AC\uC5C5\uC790\uBC88\uD638": "123-45-67890",
          "\uB2F4\uB2F9\uC790": "\uD64D\uAE38\uB3D9",
          "\uC774\uBA54\uC77C": "example@company.com",
          "\uC804\uD654\uBC88\uD638": "02-1234-5678",
          "\uC8FC\uC18C": "\uC11C\uC6B8\uC2DC \uAC15\uB0A8\uAD6C \uD14C\uD5E4\uB780\uB85C 123",
          "\uC0AC\uC5C5\uC720\uD615": "\uC81C\uC870\uC5C5"
        }
      ],
      items: [
        {
          "\uD488\uBAA9\uBA85": "\uCCA0\uADFC",
          "\uADDC\uACA9": "HD10",
          "\uB2E8\uC704": "TON",
          "\uB2E8\uAC00": "850000",
          "\uB300\uBD84\uB958": "\uCCA0\uADFC",
          "\uC911\uBD84\uB958": "\uC774\uD615\uCCA0\uADFC",
          "\uC18C\uBD84\uB958": "HD10",
          "\uC124\uBA85": "\uACE0\uAC15\uB3C4 \uC774\uD615\uCCA0\uADFC"
        }
      ],
      projects: [
        {
          "\uD504\uB85C\uC81D\uD2B8\uBA85": "\uAC15\uB0A8 \uC624\uD53C\uC2A4\uBE4C\uB529",
          "\uD504\uB85C\uC81D\uD2B8\uCF54\uB4DC": "GN-2024-001",
          "\uBC1C\uC8FC\uCC98": "ABC\uAC74\uC124",
          "\uD504\uB85C\uC81D\uD2B8\uC720\uD615": "\uC0C1\uC5C5\uC2DC\uC124",
          "\uC704\uCE58": "\uC11C\uC6B8\uC2DC \uAC15\uB0A8\uAD6C",
          "\uC2DC\uC791\uC77C": "2024-01-01",
          "\uC885\uB8CC\uC77C": "2024-12-31",
          "\uC0C1\uD0DC": "\uC9C4\uD589\uC911",
          "\uC608\uC0B0": "50000000000",
          "\uC124\uBA85": "20\uCE35 \uADDC\uBAA8 \uC624\uD53C\uC2A4\uBE4C\uB529 \uC2E0\uCD95\uACF5\uC0AC"
        }
      ]
    };
    const data = templates[entity];
    if (format === "excel") {
      const ws = XLSX7.utils.json_to_sheet(data);
      const wb = XLSX7.utils.book_new();
      XLSX7.utils.book_append_sheet(wb, ws, "Template");
      return Buffer.from(XLSX7.write(wb, { bookType: "xlsx", type: "buffer" }));
    } else {
      const csv = Papa.unparse(data, {
        header: true,
        encoding: "utf8"
      });
      return Buffer.from(csv, "utf8");
    }
  }
};

// server/routes/import-export.ts
import multer4 from "multer";
import fs15 from "fs";
import path13 from "path";
var upload4 = multer4({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv"
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel and CSV files are allowed."));
    }
  }
});
var router12 = Router12();
var getFileType = (filename) => {
  const ext = path13.extname(filename).toLowerCase();
  return ext === ".csv" ? "csv" : "excel";
};
router12.post("/import/vendors", requireAuth, upload4.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileType = getFileType(req.file.filename);
    const result = await ImportExportService.importVendors(req.file.path, fileType);
    fs15.unlinkSync(req.file.path);
    res.json({
      message: "Vendor import completed",
      imported: result.imported,
      errors: result.errors,
      totalRows: result.imported + result.errors.length
    });
  } catch (error) {
    console.error("Error importing vendors:", error);
    res.status(500).json({ error: "Failed to import vendors" });
  }
});
router12.post("/import/items", requireAuth, upload4.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileType = getFileType(req.file.filename);
    const result = await ImportExportService.importItems(req.file.path, fileType);
    fs15.unlinkSync(req.file.path);
    res.json({
      message: "Item import completed",
      imported: result.imported,
      errors: result.errors,
      totalRows: result.imported + result.errors.length
    });
  } catch (error) {
    console.error("Error importing items:", error);
    res.status(500).json({ error: "Failed to import items" });
  }
});
router12.post("/import/projects", requireAuth, upload4.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileType = getFileType(req.file.filename);
    const result = await ImportExportService.importProjects(req.file.path, fileType);
    fs15.unlinkSync(req.file.path);
    res.json({
      message: "Project import completed",
      imported: result.imported,
      errors: result.errors,
      totalRows: result.imported + result.errors.length
    });
  } catch (error) {
    console.error("Error importing projects:", error);
    res.status(500).json({ error: "Failed to import projects" });
  }
});
router12.get("/export/vendors", requireAuth, async (req, res) => {
  try {
    const format = req.query.format || "excel";
    const buffer = await ImportExportService.exportVendors(format);
    const filename = `vendors_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.${format === "csv" ? "csv" : "xlsx"}`;
    const contentType = format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting vendors:", error);
    res.status(500).json({ error: "Failed to export vendors" });
  }
});
router12.get("/export/items", requireAuth, async (req, res) => {
  try {
    const format = req.query.format || "excel";
    const buffer = await ImportExportService.exportItems(format);
    const filename = `items_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.${format === "csv" ? "csv" : "xlsx"}`;
    const contentType = format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting items:", error);
    res.status(500).json({ error: "Failed to export items" });
  }
});
router12.get("/export/projects", requireAuth, async (req, res) => {
  try {
    const format = req.query.format || "excel";
    const buffer = await ImportExportService.exportProjects(format);
    const filename = `projects_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.${format === "csv" ? "csv" : "xlsx"}`;
    const contentType = format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting projects:", error);
    res.status(500).json({ error: "Failed to export projects" });
  }
});
router12.get("/template/:entity", requireAuth, async (req, res) => {
  try {
    const entity = req.params.entity;
    const format = req.query.format || "excel";
    if (!["vendors", "items", "projects"].includes(entity)) {
      return res.status(400).json({ error: "Invalid entity type" });
    }
    const buffer = ImportExportService.generateImportTemplate(entity, format);
    const filename = `${entity}_template.${format === "csv" ? "csv" : "xlsx"}`;
    const contentType = format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("Error generating template:", error);
    res.status(500).json({ error: "Failed to generate template" });
  }
});
var import_export_default = router12;

// server/routes/email-history.ts
init_db();
init_schema();
import { Router as Router13 } from "express";
import { eq as eq10, desc as desc3, sql as sql7 } from "drizzle-orm";
import { z as z2 } from "zod";
var router13 = Router13();
var createEmailHistorySchema = z2.object({
  orderId: z2.number(),
  recipientEmail: z2.string().email(),
  recipientName: z2.string().optional(),
  ccEmails: z2.string().optional(),
  subject: z2.string(),
  body: z2.string(),
  attachments: z2.array(z2.object({
    filename: z2.string(),
    path: z2.string(),
    size: z2.number()
  })).optional(),
  status: z2.enum(["sent", "failed", "bounced", "opened", "clicked"]).default("sent"),
  errorMessage: z2.string().optional(),
  emailProvider: z2.string().default("naver"),
  messageId: z2.string().optional()
});
router13.get("/orders/:orderId/email-history", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }
    const order = await db.query.purchaseOrders.findFirst({
      where: eq10(purchaseOrders.id, orderId)
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    const emailHistory = await db.select({
      id: emailSendHistory.id,
      orderId: emailSendHistory.orderId,
      sentAt: emailSendHistory.sentAt,
      sentBy: emailSendHistory.sentBy,
      sentByName: users.name,
      sentByEmail: users.email,
      recipientEmail: emailSendHistory.recipientEmail,
      recipientName: emailSendHistory.recipientName,
      ccEmails: emailSendHistory.ccEmails,
      subject: emailSendHistory.subject,
      body: emailSendHistory.body,
      attachments: emailSendHistory.attachments,
      status: emailSendHistory.status,
      errorMessage: emailSendHistory.errorMessage,
      openedAt: emailSendHistory.openedAt,
      clickedAt: emailSendHistory.clickedAt,
      trackingId: emailSendHistory.trackingId,
      emailProvider: emailSendHistory.emailProvider,
      messageId: emailSendHistory.messageId
    }).from(emailSendHistory).leftJoin(users, eq10(emailSendHistory.sentBy, users.id)).where(eq10(emailSendHistory.orderId, orderId)).orderBy(desc3(emailSendHistory.sentAt));
    res.json(emailHistory);
  } catch (error) {
    console.error("Error fetching email history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router13.post("/email-history", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const validatedData = createEmailHistorySchema.parse(req.body);
    const trackingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const [newEmailHistory] = await db.insert(emailSendHistory).values({
      ...validatedData,
      sentBy: req.user.id,
      trackingId,
      attachments: validatedData.attachments || null
    }).returning();
    const order = await db.query.purchaseOrders.findFirst({
      where: eq10(purchaseOrders.id, validatedData.orderId)
    });
    if (order && order.status === "approved") {
      await db.update(purchaseOrders).set({
        status: "sent",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq10(purchaseOrders.id, validatedData.orderId));
    }
    res.json(newEmailHistory);
  } catch (error) {
    if (error instanceof z2.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error creating email history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router13.get("/orders-email-status", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const emailStatusQuery = await db.execute(sql7`
      WITH latest_emails AS (
        SELECT DISTINCT ON (order_id) 
          order_id,
          status,
          sent_at,
          recipient_email,
          opened_at
        FROM email_send_history
        ORDER BY order_id, sent_at DESC
      )
      SELECT 
        po.id,
        po.order_number,
        le.status as email_status,
        le.sent_at as last_sent_at,
        le.recipient_email,
        le.opened_at,
        COUNT(eh.id) as total_emails_sent
      FROM purchase_orders po
      LEFT JOIN latest_emails le ON po.id = le.order_id
      LEFT JOIN email_send_history eh ON po.id = eh.order_id
      GROUP BY po.id, po.order_number, le.status, le.sent_at, le.recipient_email, le.opened_at
    `);
    res.json(emailStatusQuery.rows);
  } catch (error) {
    console.error("Error fetching orders email status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router13.put("/email-tracking/:trackingId", async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { action } = req.body;
    if (!["opened", "clicked"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }
    const updateData = {};
    if (action === "opened") {
      updateData.openedAt = /* @__PURE__ */ new Date();
      updateData.status = "opened";
    } else if (action === "clicked") {
      updateData.clickedAt = /* @__PURE__ */ new Date();
      updateData.status = "clicked";
    }
    if (req.headers["x-forwarded-for"] || req.ip) {
      updateData.ipAddress = (req.headers["x-forwarded-for"] || req.ip).split(",")[0];
    }
    if (req.headers["user-agent"]) {
      updateData.userAgent = req.headers["user-agent"];
    }
    const [updated] = await db.update(emailSendHistory).set(updateData).where(eq10(emailSendHistory.trackingId, trackingId)).returning();
    if (!updated) {
      return res.status(404).json({ error: "Email not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating email tracking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router13.get("/email-history/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const emailId = parseInt(req.params.id);
    if (isNaN(emailId)) {
      return res.status(400).json({ error: "Invalid email ID" });
    }
    const email = await db.select({
      id: emailSendHistory.id,
      orderId: emailSendHistory.orderId,
      orderNumber: purchaseOrders.orderNumber,
      vendorName: vendors.name,
      sentAt: emailSendHistory.sentAt,
      sentBy: emailSendHistory.sentBy,
      sentByName: users.name,
      sentByEmail: users.email,
      recipientEmail: emailSendHistory.recipientEmail,
      recipientName: emailSendHistory.recipientName,
      ccEmails: emailSendHistory.ccEmails,
      subject: emailSendHistory.subject,
      body: emailSendHistory.body,
      attachments: emailSendHistory.attachments,
      status: emailSendHistory.status,
      errorMessage: emailSendHistory.errorMessage,
      openedAt: emailSendHistory.openedAt,
      clickedAt: emailSendHistory.clickedAt,
      ipAddress: emailSendHistory.ipAddress,
      userAgent: emailSendHistory.userAgent,
      trackingId: emailSendHistory.trackingId,
      emailProvider: emailSendHistory.emailProvider,
      messageId: emailSendHistory.messageId
    }).from(emailSendHistory).leftJoin(purchaseOrders, eq10(emailSendHistory.orderId, purchaseOrders.id)).leftJoin(vendors, eq10(purchaseOrders.vendorId, vendors.id)).leftJoin(users, eq10(emailSendHistory.sentBy, users.id)).where(eq10(emailSendHistory.id, emailId));
    if (!email || email.length === 0) {
      return res.status(404).json({ error: "Email not found" });
    }
    res.json(email[0]);
  } catch (error) {
    console.error("Error fetching email detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
var email_history_default = router13;

// server/routes/excel-template.ts
import express2 from "express";
import * as XLSX8 from "xlsx";
var router14 = express2.Router();
router14.get("/download", async (req, res) => {
  try {
    const templateData = [
      // 헤더 행
      [
        "\uBC1C\uC8FC\uC77C\uC790",
        "\uB0A9\uAE30\uC77C\uC790",
        "\uAC70\uB798\uCC98\uBA85",
        "\uAC70\uB798\uCC98 \uC774\uBA54\uC77C",
        "\uB0A9\uD488\uCC98\uBA85",
        "\uB0A9\uD488\uCC98 \uC774\uBA54\uC77C",
        "\uD504\uB85C\uC81D\uD2B8\uBA85",
        "\uB300\uBD84\uB958",
        "\uC911\uBD84\uB958",
        "\uC18C\uBD84\uB958",
        "\uD488\uBAA9\uBA85",
        "\uADDC\uACA9",
        "\uC218\uB7C9",
        "\uB2E8\uAC00",
        "\uCD1D\uAE08\uC561",
        "\uBE44\uACE0"
      ],
      // 샘플 데이터 행 1
      [
        "2025-08-05",
        "2025-08-12",
        "(\uC8FC)\uC775\uC9C4",
        "ikjin@example.com",
        "(\uC8FC)\uC775\uC9C4",
        "ikjin@example.com",
        "\uC11C\uC6B8 \uC544\uD30C\uD2B8 \uC2E0\uCD95\uACF5\uC0AC",
        "\uCCA0\uADFC",
        "\uBD09\uAC15",
        "D19",
        "D19 \uCCA0\uADFC",
        "KS D 3504",
        100,
        5e4,
        5e6,
        "\uAE34\uAE09 \uB0A9\uD488 \uC694\uCCAD"
      ],
      // 샘플 데이터 행 2
      [
        "2025-08-05",
        "2025-08-15",
        "\uC0BC\uC131\uAC74\uC124",
        "samsung@example.com",
        "\uC0BC\uC131\uAC74\uC124",
        "samsung@example.com",
        "\uBD80\uC0B0 \uC0C1\uAC00 \uAC74\uC124",
        "\uCF58\uD06C\uB9AC\uD2B8",
        "\uB808\uBBF8\uCF58",
        "C24",
        "\uB808\uBBF8\uCF58 C24",
        "24MPa",
        50,
        12e4,
        6e6,
        "\uD604\uC7A5 \uC9C1\uB0A9"
      ],
      // 샘플 데이터 행 3
      [
        "2025-08-05",
        "2025-08-10",
        "\uD604\uB300\uAC74\uC124",
        "hyundai@example.com",
        "\uD604\uB300\uAC74\uC124",
        "hyundai@example.com",
        "\uB300\uC804 \uACF5\uC7A5 \uC99D\uCD95",
        "\uAC15\uC7AC",
        "H\uBE54",
        "H-400x200",
        "H\uBE54 400x200",
        "SS400",
        20,
        15e4,
        3e6,
        "\uD488\uC9C8 \uAC80\uC0AC \uD544\uC218"
      ]
    ];
    const workbook = XLSX8.utils.book_new();
    const inputWorksheet = XLSX8.utils.aoa_to_sheet(templateData);
    const columnWidths = [
      { wch: 12 },
      // A: 발주일자
      { wch: 12 },
      // B: 납기일자
      { wch: 15 },
      // C: 거래처명
      { wch: 20 },
      // D: 거래처 이메일
      { wch: 15 },
      // E: 납품처명
      { wch: 20 },
      // F: 납품처 이메일
      { wch: 20 },
      // G: 프로젝트명
      { wch: 10 },
      // H: 대분류
      { wch: 10 },
      // I: 중분류
      { wch: 10 },
      // J: 소분류
      { wch: 20 },
      // K: 품목명
      { wch: 15 },
      // L: 규격
      { wch: 10 },
      // M: 수량
      { wch: 12 },
      // N: 단가
      { wch: 15 },
      // O: 총금액
      { wch: 20 }
      // P: 비고
    ];
    inputWorksheet["!cols"] = columnWidths;
    const headerStyle = {
      fill: { fgColor: { rgb: "CCCCCC" } },
      font: { bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
    for (let col = 0; col < 16; col++) {
      const cellRef = XLSX8.utils.encode_cell({ r: 0, c: col });
      if (!inputWorksheet[cellRef]) inputWorksheet[cellRef] = { v: "", t: "s" };
      inputWorksheet[cellRef].s = headerStyle;
    }
    const dataBorder = {
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } }
      }
    };
    for (let row = 1; row <= 3; row++) {
      for (let col = 0; col < 16; col++) {
        const cellRef = XLSX8.utils.encode_cell({ r: row, c: col });
        if (!inputWorksheet[cellRef]) inputWorksheet[cellRef] = { v: "", t: "s" };
        inputWorksheet[cellRef].s = dataBorder;
      }
    }
    XLSX8.utils.book_append_sheet(workbook, inputWorksheet, "Input");
    const gapjiData = [
      ["\uBC1C\uC8FC\uC11C (\uAC11\uC9C0)", "", "", "", "", ""],
      ["", "", "", "", "", ""],
      ["\uBC1C\uC8FC\uBC88\uD638:", "", "\uBC1C\uC8FC\uC77C\uC790:", "", "", ""],
      ["\uAC70\uB798\uCC98:", "", "\uB0A9\uAE30\uC77C\uC790:", "", "", ""],
      ["\uB0A9\uD488\uCC98:", "", "\uD504\uB85C\uC81D\uD2B8:", "", "", ""],
      ["", "", "", "", "", ""],
      ["\uC21C\uBC88", "\uD488\uBAA9\uBA85", "\uADDC\uACA9", "\uC218\uB7C9", "\uB2E8\uAC00", "\uAE08\uC561"],
      ["1", "", "", "", "", ""],
      ["2", "", "", "", "", ""],
      ["3", "", "", "", "", ""],
      ["", "", "", "", "", ""],
      ["", "", "", "\uD569\uACC4:", "", ""]
    ];
    const gapjiWorksheet = XLSX8.utils.aoa_to_sheet(gapjiData);
    gapjiWorksheet["!cols"] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 }
    ];
    XLSX8.utils.book_append_sheet(workbook, gapjiWorksheet, "\uAC11\uC9C0");
    const euljiData = [
      ["\uBC1C\uC8FC\uC11C (\uC744\uC9C0)", "", "", "", "", ""],
      ["", "", "", "", "", ""],
      ["\uBC1C\uC8FC\uBC88\uD638:", "", "\uBC1C\uC8FC\uC77C\uC790:", "", "", ""],
      ["\uAC70\uB798\uCC98:", "", "\uB0A9\uAE30\uC77C\uC790:", "", "", ""],
      ["\uB0A9\uD488\uCC98:", "", "\uD504\uB85C\uC81D\uD2B8:", "", "", ""],
      ["", "", "", "", "", ""],
      ["\uC21C\uBC88", "\uD488\uBAA9\uBA85", "\uADDC\uACA9", "\uC218\uB7C9", "\uB2E8\uAC00", "\uAE08\uC561"],
      ["1", "", "", "", "", ""],
      ["2", "", "", "", "", ""],
      ["3", "", "", "", "", ""],
      ["", "", "", "", "", ""],
      ["", "", "", "\uD569\uACC4:", "", ""]
    ];
    const euljiWorksheet = XLSX8.utils.aoa_to_sheet(euljiData);
    euljiWorksheet["!cols"] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 }
    ];
    XLSX8.utils.book_append_sheet(workbook, euljiWorksheet, "\uC744\uC9C0");
    const buffer = XLSX8.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
      bookSST: false
    });
    const filename = "PO_Excel_Template.xlsx";
    const encodedFilename = encodeURIComponent(filename);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader("Content-Length", buffer.length.toString());
    res.send(buffer);
  } catch (error) {
    console.error("Excel \uD15C\uD50C\uB9BF \uC0DD\uC131 \uC624\uB958:", error);
    res.status(500).json({
      success: false,
      error: "Excel \uD15C\uD50C\uB9BF \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
    });
  }
});
router14.get("/info", (req, res) => {
  try {
    const templateInfo = {
      success: true,
      data: {
        fileName: "PO_Excel_Template.xlsx",
        description: "16\uAC1C \uCEEC\uB7FC \uAD6C\uC870\uC758 \uD45C\uC900 \uBC1C\uC8FC\uC11C Excel \uD15C\uD50C\uB9BF",
        columns: [
          { column: "A", name: "\uBC1C\uC8FC\uC77C\uC790", required: true, description: "\uBC1C\uC8FC\uC11C \uC791\uC131 \uB0A0\uC9DC (YYYY-MM-DD)" },
          { column: "B", name: "\uB0A9\uAE30\uC77C\uC790", required: false, description: "\uB0A9\uD488 \uC608\uC815 \uB0A0\uC9DC (YYYY-MM-DD)" },
          { column: "C", name: "\uAC70\uB798\uCC98\uBA85", required: true, description: "\uACF5\uAE09\uC5C5\uCCB4 \uC774\uB984" },
          { column: "D", name: "\uAC70\uB798\uCC98 \uC774\uBA54\uC77C", required: false, description: "\uACF5\uAE09\uC5C5\uCCB4 \uC774\uBA54\uC77C \uC8FC\uC18C" },
          { column: "E", name: "\uB0A9\uD488\uCC98\uBA85", required: true, description: "\uB0A9\uD488\uBC1B\uC744 \uC5C5\uCCB4\uBA85" },
          { column: "F", name: "\uB0A9\uD488\uCC98 \uC774\uBA54\uC77C", required: false, description: "\uB0A9\uD488\uCC98 \uC774\uBA54\uC77C \uC8FC\uC18C" },
          { column: "G", name: "\uD504\uB85C\uC81D\uD2B8\uBA85", required: true, description: "\uD574\uB2F9 \uD504\uB85C\uC81D\uD2B8/\uD604\uC7A5\uBA85" },
          { column: "H", name: "\uB300\uBD84\uB958", required: true, description: "\uD488\uBAA9 \uB300\uBD84\uB958" },
          { column: "I", name: "\uC911\uBD84\uB958", required: false, description: "\uD488\uBAA9 \uC911\uBD84\uB958" },
          { column: "J", name: "\uC18C\uBD84\uB958", required: false, description: "\uD488\uBAA9 \uC18C\uBD84\uB958" },
          { column: "K", name: "\uD488\uBAA9\uBA85", required: true, description: "\uAD6C\uCCB4\uC801\uC778 \uD488\uBAA9 \uC774\uB984" },
          { column: "L", name: "\uADDC\uACA9", required: false, description: "\uD488\uBAA9 \uADDC\uACA9/\uC0AC\uC591" },
          { column: "M", name: "\uC218\uB7C9", required: true, description: "\uC8FC\uBB38 \uC218\uB7C9" },
          { column: "N", name: "\uB2E8\uAC00", required: true, description: "\uD488\uBAA9 \uB2E8\uAC00" },
          { column: "O", name: "\uCD1D\uAE08\uC561", required: true, description: "\uC218\uB7C9 \xD7 \uB2E8\uAC00 = \uCD1D \uAE08\uC561" },
          { column: "P", name: "\uBE44\uACE0", required: false, description: "\uCD94\uAC00 \uC124\uBA85/\uBA54\uBAA8" }
        ],
        sheets: ["Input", "\uAC11\uC9C0", "\uC744\uC9C0"],
        rules: [
          "\uD544\uC218 \uCEEC\uB7FC \uB204\uB77D \uC2DC \uAC80\uC99D \uC624\uB958 \uBC1C\uC0DD",
          "\uCD1D\uAE08\uC561(O\uC5F4) = \uC218\uB7C9(M\uC5F4) \xD7 \uB2E8\uAC00(N\uC5F4) \uC790\uB3D9 \uACC4\uC0B0 \uAC80\uC99D",
          "\uAC70\uB798\uCC98\uBA85\uC774 \uC788\uC73C\uBA74 \uB0A9\uD488\uCC98\uBA85\uC5D0 \uC790\uB3D9 \uBCF5\uC0AC",
          '\uD504\uB85C\uC81D\uD2B8\uBA85\uC774 \uC5C6\uC73C\uBA74 \uAE30\uBCF8\uAC12 "\uD504\uB85C\uC81D\uD2B8\uBA85" \uC124\uC815'
        ]
      }
    };
    res.json(templateInfo);
  } catch (error) {
    console.error("\uD15C\uD50C\uB9BF \uC815\uBCF4 \uC870\uD68C \uC624\uB958:", error);
    res.status(500).json({
      success: false,
      error: "\uD15C\uD50C\uB9BF \uC815\uBCF4 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
    });
  }
});
var excel_template_default = router14;

// server/routes/orders-optimized.ts
import { Router as Router14 } from "express";

// server/utils/optimized-orders-query.ts
init_db();
init_schema();
import { eq as eq11, desc as desc4, asc as asc2, ilike as ilike3, and as and7, or as or3, between as between2, count as count3, sql as sql8, gte as gte4, lte as lte4 } from "drizzle-orm";
var OptimizedOrdersService = class _OptimizedOrdersService {
  /**
   * 정렬 필드에 따른 ORDER BY 절 생성
   */
  static getOrderByClause(sortBy, sortOrder = "desc") {
    const getSortField = (field) => {
      switch (field) {
        case "orderNumber":
          return purchaseOrders.orderNumber;
        case "status":
          return purchaseOrders.status;
        case "vendorName":
          return vendors.name;
        case "projectName":
          return projects.projectName;
        case "userName":
          return users.name;
        case "orderDate":
          return purchaseOrders.orderDate;
        case "totalAmount":
          return purchaseOrders.totalAmount;
        default:
          return purchaseOrders.createdAt;
      }
    };
    const sortField = getSortField(sortBy || "createdAt");
    return sortOrder === "asc" ? asc2(sortField) : desc4(sortField);
  }
  /**
   * High-performance order listing with metadata
   * Single query with optimized joins and proper pagination
   */
  static async getOrdersWithMetadata(filters = {}) {
    const {
      userId,
      status,
      vendorId,
      projectId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      searchText,
      page = 1,
      limit = 20,
      sortBy,
      sortOrder = "desc"
    } = filters;
    const whereConditions = [];
    if (userId && userId !== "all") {
      whereConditions.push(eq11(purchaseOrders.userId, userId));
    }
    if (status && status !== "all" && status !== "") {
      whereConditions.push(sql8`${purchaseOrders.status} = ${status}`);
    }
    if (vendorId && vendorId !== "all") {
      whereConditions.push(eq11(purchaseOrders.vendorId, vendorId));
    }
    if (projectId && projectId !== "all") {
      whereConditions.push(eq11(purchaseOrders.projectId, projectId));
    }
    if (startDate && endDate) {
      whereConditions.push(between2(purchaseOrders.orderDate, startDate, endDate));
    }
    if (minAmount) {
      whereConditions.push(gte4(purchaseOrders.totalAmount, minAmount));
    }
    if (maxAmount) {
      whereConditions.push(lte4(purchaseOrders.totalAmount, maxAmount));
    }
    if (searchText) {
      const searchPattern = `%${searchText.toLowerCase()}%`;
      whereConditions.push(
        or3(
          ilike3(purchaseOrders.orderNumber, searchPattern),
          ilike3(vendors.name, searchPattern),
          ilike3(projects.projectName, searchPattern),
          ilike3(users.name, searchPattern)
        )
      );
    }
    const whereClause = whereConditions.length > 0 ? and7(...whereConditions) : void 0;
    const ordersQuery = db.select({
      // Order fields
      id: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      orderDate: purchaseOrders.orderDate,
      deliveryDate: purchaseOrders.deliveryDate,
      userId: purchaseOrders.userId,
      vendorId: purchaseOrders.vendorId,
      projectId: purchaseOrders.projectId,
      approvalLevel: purchaseOrders.approvalLevel,
      currentApproverRole: purchaseOrders.currentApproverRole,
      createdAt: purchaseOrders.createdAt,
      // Joined fields
      vendorName: vendors.name,
      projectName: projects.projectName,
      userName: users.name
    }).from(purchaseOrders).leftJoin(vendors, eq11(purchaseOrders.vendorId, vendors.id)).leftJoin(projects, eq11(purchaseOrders.projectId, projects.id)).leftJoin(users, eq11(purchaseOrders.userId, users.id)).where(whereClause).orderBy(_OptimizedOrdersService.getOrderByClause(sortBy, sortOrder)).limit(limit).offset((page - 1) * limit);
    const countQuery = db.select({ count: count3() }).from(purchaseOrders).leftJoin(vendors, eq11(purchaseOrders.vendorId, vendors.id)).leftJoin(projects, eq11(purchaseOrders.projectId, projects.id)).leftJoin(users, eq11(purchaseOrders.userId, users.id)).where(whereClause);
    const [orders, [{ count: totalCount }]] = await Promise.all([
      ordersQuery,
      countQuery
    ]);
    return {
      orders,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    };
  }
  /**
   * Get order metadata (vendors, projects, users) for filters
   * Cached and optimized for dropdown population
   */
  static async getOrderMetadata() {
    const [vendorsList, projectsList, usersList] = await Promise.all([
      // Only active vendors with recent orders
      db.select({
        id: vendors.id,
        name: vendors.name
      }).from(vendors).where(eq11(vendors.isActive, true)).orderBy(asc2(vendors.name)),
      // Only active projects
      db.select({
        id: projects.id,
        projectName: projects.projectName,
        projectCode: projects.projectCode
      }).from(projects).where(eq11(projects.isActive, true)).orderBy(asc2(projects.projectName)),
      // Only active users
      db.select({
        id: users.id,
        name: users.name,
        email: users.email
      }).from(users).where(eq11(users.isActive, true)).orderBy(asc2(users.name))
    ]);
    return {
      vendors: vendorsList,
      projects: projectsList,
      users: usersList
    };
  }
  /**
   * Get orders with email status in a single optimized query
   * TEMPORARY: Email functionality disabled until email_send_history table is created
   */
  static async getOrdersWithEmailStatus(filters = {}) {
    const ordersResult = await this.getOrdersWithMetadata(filters);
    const ordersWithEmailStatus = ordersResult.orders.map((order) => ({
      ...order,
      emailStatus: null,
      lastSentAt: null,
      totalEmailsSent: 0,
      openedAt: null
    }));
    return {
      ...ordersResult,
      orders: ordersWithEmailStatus
    };
  }
  /**
   * Batch operation for updating multiple order statuses
   * Reduces multiple API calls for bulk operations
   */
  static async batchUpdateOrderStatus(orderIds, status, userId) {
    const result = await db.update(purchaseOrders).set({
      status,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(sql8`${purchaseOrders.id} = ANY(${orderIds})`).returning();
    return result;
  }
  /**
   * Get order statistics for dashboard
   * Uses materialized view for better performance
   */
  static async getOrderStatistics(userId) {
    const whereClause = userId ? eq11(purchaseOrders.userId, userId) : void 0;
    const stats = await db.select({
      status: purchaseOrders.status,
      count: count3(),
      totalAmount: sql8`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`,
      avgAmount: sql8`COALESCE(AVG(${purchaseOrders.totalAmount}), 0)`
    }).from(purchaseOrders).where(whereClause).groupBy(purchaseOrders.status);
    return stats;
  }
};
var QueryPerformanceMonitor = class {
  static {
    this.queryTimes = /* @__PURE__ */ new Map();
  }
  static startTimer(queryName) {
    const start = performance.now();
    return () => {
      const end = performance.now();
      const duration = end - start;
      if (!this.queryTimes.has(queryName)) {
        this.queryTimes.set(queryName, []);
      }
      this.queryTimes.get(queryName).push(duration);
      if (duration > 500) {
        console.warn(`\u{1F40C} Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
      }
    };
  }
  static getStats() {
    const stats = {};
    for (const [queryName, times] of this.queryTimes.entries()) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      stats[queryName] = { avg, min, max, count: times.length };
    }
    return stats;
  }
};

// server/routes/orders-optimized.ts
import { z as z3 } from "zod";
var router15 = Router14();
var OrderFiltersSchema = z3.object({
  page: z3.string().optional().transform((val) => val ? parseInt(val) : 1),
  limit: z3.string().optional().transform((val) => val ? parseInt(val) : 20),
  status: z3.string().optional(),
  projectId: z3.string().optional().transform((val) => val && val !== "all" ? parseInt(val) : void 0),
  vendorId: z3.string().optional().transform((val) => val && val !== "all" ? parseInt(val) : void 0),
  userId: z3.string().optional(),
  startDate: z3.string().optional().transform((val) => val ? new Date(val) : void 0),
  endDate: z3.string().optional().transform((val) => val ? new Date(val) : void 0),
  minAmount: z3.string().optional().transform((val) => val ? parseFloat(val) : void 0),
  maxAmount: z3.string().optional().transform((val) => val ? parseFloat(val) : void 0),
  searchText: z3.string().optional(),
  sortBy: z3.string().optional(),
  sortOrder: z3.enum(["asc", "desc"]).optional().default("desc")
});
router15.get("/orders-optimized", async (req, res) => {
  const endTimer = QueryPerformanceMonitor.startTimer("orders-optimized");
  try {
    const filters = OrderFiltersSchema.parse(req.query);
    console.log("\u{1F680} Optimized orders request:", {
      filters,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    const result = await OptimizedOrdersService.getOrdersWithEmailStatus(filters);
    const metadata = await OptimizedOrdersService.getOrderMetadata();
    const response = {
      ...result,
      metadata,
      performance: {
        queryTime: `${performance.now().toFixed(2)}ms`,
        cacheHit: false,
        // TODO: Implement Redis caching
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    console.log("\u2705 Optimized orders response:", {
      ordersCount: result.orders.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      vendorsCount: metadata.vendors.length,
      projectsCount: metadata.projects.length
    });
    res.json(response);
  } catch (error) {
    console.error("\u274C Error in optimized orders endpoint:", error);
    res.status(500).json({
      message: "Failed to fetch orders",
      error: process.env.NODE_ENV === "development" ? error.message : void 0
    });
  } finally {
    endTimer();
  }
});
router15.get("/orders-metadata", async (req, res) => {
  const endTimer = QueryPerformanceMonitor.startTimer("orders-metadata");
  try {
    const metadata = await OptimizedOrdersService.getOrderMetadata();
    res.json({
      ...metadata,
      cached: false,
      // TODO: Implement caching
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("\u274C Error fetching orders metadata:", error);
    res.status(500).json({ message: "Failed to fetch metadata" });
  } finally {
    endTimer();
  }
});
router15.get("/orders-stats", async (req, res) => {
  const endTimer = QueryPerformanceMonitor.startTimer("orders-stats");
  try {
    const { userId } = req.query;
    const stats = await OptimizedOrdersService.getOrderStatistics(userId);
    res.json({
      stats,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("\u274C Error fetching order statistics:", error);
    res.status(500).json({ message: "Failed to fetch statistics" });
  } finally {
    endTimer();
  }
});
router15.put("/orders-bulk-status", async (req, res) => {
  const endTimer = QueryPerformanceMonitor.startTimer("orders-bulk-status");
  try {
    const { orderIds, status } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: "Invalid order IDs" });
    }
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    const result = await OptimizedOrdersService.batchUpdateOrderStatus(
      orderIds,
      status,
      userId
    );
    res.json({
      message: `Updated ${result.length} orders`,
      updatedOrders: result,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("\u274C Error in bulk status update:", error);
    res.status(500).json({ message: "Failed to update orders" });
  } finally {
    endTimer();
  }
});
router15.get("/query-performance", async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ message: "Not found" });
  }
  const stats = QueryPerformanceMonitor.getStats();
  res.json({
    queryStats: stats,
    recommendations: generatePerformanceRecommendations(stats),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
function generatePerformanceRecommendations(stats) {
  const recommendations = [];
  for (const [queryName, data] of Object.entries(stats)) {
    if (data.avg > 500) {
      recommendations.push({
        query: queryName,
        issue: "Slow average response time",
        avgTime: `${data.avg.toFixed(2)}ms`,
        recommendation: "Consider adding database indexes or optimizing query"
      });
    }
    if (data.max > 2e3) {
      recommendations.push({
        query: queryName,
        issue: "Very slow maximum response time",
        maxTime: `${data.max.toFixed(2)}ms`,
        recommendation: "Investigate query execution plan and add appropriate indexes"
      });
    }
  }
  return recommendations;
}
var orders_optimized_default = router15;

// server/routes/index.ts
var router16 = Router15();
router16.use("/api", auth_default);
router16.use("/api", projects_default);
router16.use("/api", orders_default);
router16.use("/api", vendors_default);
router16.use("/api", items_default);
router16.use("/api", dashboard_default);
router16.use("/api", companies_default);
router16.use("/api", admin_default);
router16.use("/api/excel-automation", excel_automation_default);
router16.use("/api/po-template", po_template_real_default);
router16.use("/api/reports", reports_default);
router16.use("/api", import_export_default);
router16.use("/api", email_history_default);
router16.use("/api/excel-template", excel_template_default);
router16.use("/api", orders_optimized_default);
var routes_default = router16;

// server/index.ts
dotenv2.config();
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.tbvugytmskxxyqfvqmup:gps110601ysw@db.tbvugytmskxxyqfvqmup.supabase.co:5432/postgres?sslmode=require&connect_timeout=60";
console.log("\u{1F527} Force-set DATABASE_URL:", process.env.DATABASE_URL.split("@")[0] + "@[HIDDEN]");
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use("/attached_assets", express3.static("attached_assets"));
app.use((req, res, next) => {
  const start = Date.now();
  const path14 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path14.startsWith("/api")) {
      let logLine = `${req.method} ${path14} ${res.statusCode} in ${duration}ms`;
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
async function initializeApp() {
  const pgSession = connectPgSimple(session);
  app.use(session({
    store: new pgSession({
      conString: process.env.DATABASE_URL,
      tableName: "app_sessions"
    }),
    secret: process.env.SESSION_SECRET || "default-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 1e3 * 60 * 60 * 24 * 7
      // 7 days
    }
  }));
  app.use(routes_default);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    const server = createServer(app);
    await setupVite(app, server);
    if (!process.env.VERCEL) {
      const port = process.env.PORT || 5e3;
      server.listen(port, "0.0.0.0", () => {
        log(`serving on port ${port}`);
      });
    }
  } else {
    serveStatic(app);
  }
}
if (process.env.VERCEL) {
  initializeApp().catch(console.error);
} else {
  initializeApp().then(() => {
    log("App initialized successfully");
  }).catch(console.error);
}
var index_default = app;
export {
  index_default as default
};
