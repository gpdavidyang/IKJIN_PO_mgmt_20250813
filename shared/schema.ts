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
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// UI terminology table for soft-coding localization
export const uiTerms = pgTable("ui_terms", {
  id: serial("id").primaryKey(),
  termKey: varchar("term_key", { length: 100 }).notNull().unique(),
  termValue: varchar("term_value", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).default("general"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Item categories management table for dynamic classification system
export const itemCategories = pgTable("item_categories", {
  id: serial("id").primaryKey(),
  categoryType: varchar("category_type", { length: 20 }).notNull(), // 'major', 'middle', 'minor'
  categoryName: varchar("category_name", { length: 100 }).notNull(),
  parentId: integer("parent_id"), // References parent category ID
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_item_categories_type").on(table.categoryType),
  index("idx_item_categories_parent").on(table.parentId),
]);

// Enum definitions
export const userRoleEnum = pgEnum("user_role", ["field_worker", "project_manager", "hq_management", "executive", "admin"]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", ["draft", "pending", "approved", "sent", "completed"]);
export const projectStatusEnum = pgEnum("project_status", ["planning", "active", "on_hold", "completed", "cancelled"]);
export const projectTypeEnum = pgEnum("project_type", ["commercial", "residential", "industrial", "infrastructure"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["pending", "verified", "paid"]);
export const itemReceiptStatusEnum = pgEnum("item_receipt_status", ["pending", "approved", "rejected"]);
export const verificationActionEnum = pgEnum("verification_action", ["invoice_uploaded", "item_verified", "quality_checked"]);
export const approvalStepStatusEnum = pgEnum("approval_step_status", ["pending", "approved", "rejected", "skipped"]);

// Approval authority settings table for role-based amount limits
export const approvalAuthorities = pgTable("approval_authorities", {
  id: serial("id").primaryKey(),
  role: userRoleEnum("role").notNull(),
  maxAmount: decimal("max_amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_role_approval").on(table.role),
]);

// User storage table for local authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  name: varchar("name").notNull(),
  password: varchar("hashed_password").notNull(), // Match actual database column name
  phoneNumber: varchar("phone_number"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("field_worker"),
  position: varchar("position"), // Add position field that exists in DB
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_email").on(table.email),
  index("idx_users_role").on(table.role),
]);

// Note: order_statuses table removed - using ENUM with display views instead

// Company information table (발주사 회사 정보)
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  businessNumber: varchar("business_number", { length: 50 }),
  address: text("address"),
  contactPerson: varchar("contact_person", { length: 100 }), // Match actual DB schema
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vendor type enum for distinguishing between vendors and suppliers
// vendorTypeEnum 제거 - 실제 데이터베이스 스키마에 맞춤

// Vendors table
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  vendorCode: varchar("vendor_code", { length: 50 }), // 거래처 코드
  aliases: jsonb("aliases").default([]).$type<string[]>(), // 별칭 필드 추가 - 예: ["(주)익진", "주식회사 익진", "익진"]
  businessNumber: varchar("business_number", { length: 50 }),
  contactPerson: varchar("contact_person", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  businessType: varchar("business_type", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_vendors_name").on(table.name),
  index("idx_vendors_business_number").on(table.businessNumber),
  index("idx_vendors_email").on(table.email),
  index("idx_vendors_active").on(table.isActive),
]);

// Items table
export const items = pgTable("items", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_items_name").on(table.name),
  index("idx_items_category").on(table.category),
  index("idx_items_active").on(table.isActive),
]);

// Terminology management table - 용어집 관리
export const terminology = pgTable("terminology", {
  id: serial("id").primaryKey(),
  termKey: varchar("term_key", { length: 100 }).notNull().unique(),
  termValue: varchar("term_value", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_terminology_key").on(table.termKey),
  index("idx_terminology_category").on(table.category),
  index("idx_terminology_active").on(table.isActive),
]);

// Note: Project statuses and types tables removed - using ENUM types for better performance

// Projects table - 건설 현장 관리
export const projects = pgTable("projects", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_projects_name").on(table.projectName),
  index("idx_projects_code").on(table.projectCode),
  index("idx_projects_status").on(table.status),
  index("idx_projects_start_date").on(table.startDate),
  index("idx_projects_active").on(table.isActive),
  index("idx_projects_manager").on(table.projectManagerId),
]);

// Project team members table - 현장 팀 구성원 관리
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // 'manager', 'order_manager', 'member', 'viewer'
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("project_members_project_user_unique").on(table.projectId, table.userId),
]);

// Project change history table - 현장 변경 이력 추적
export const projectHistory = pgTable("project_history", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: varchar("changed_by").references(() => users.id).notNull(),
  changedAt: timestamp("changed_at").defaultNow(),
  changeReason: text("change_reason"),
});

// Order templates table
export const orderTemplates = pgTable("order_templates", {
  id: serial("id").primaryKey(),
  templateName: varchar("template_name", { length: 100 }).notNull(),
  templateType: varchar("template_type", { length: 50 }).notNull(), // material_extrusion, panel_manufacturing, general, handsontable
  // fieldsConfig: jsonb("fields_config").notNull(), // TODO: Add this column to database
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Template fields for dynamic form building
export const templateFields = pgTable("template_fields", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => orderTemplates.id, { onDelete: "cascade" }),
  fieldType: varchar("field_type", { length: 50 }).notNull(), // 'text', 'number', 'select', 'date', 'textarea'
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  placeholder: varchar("placeholder", { length: 255 }),
  required: boolean("required").default(false),
  validation: jsonb("validation"), // JSON validation rules
  options: jsonb("options"), // For select fields
  gridPosition: jsonb("grid_position").notNull(), // {row, col, span}
  sectionName: varchar("section_name", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Handsontable configurations for spreadsheet templates
export const handsontableConfigs = pgTable("handsontable_configs", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => orderTemplates.id, { onDelete: "cascade" }),
  colHeaders: jsonb("col_headers").notNull(), // Array of column headers
  columns: jsonb("columns").notNull(), // Column configurations
  rowsCount: integer("rows_count").default(10),
  formulas: jsonb("formulas"), // Formula definitions
  validationRules: jsonb("validation_rules"), // Cell validation rules
  customStyles: jsonb("custom_styles"), // Styling rules
  settings: jsonb("settings"), // Additional Handsontable settings
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Template versions for change tracking
export const templateVersions = pgTable("template_versions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => orderTemplates.id, { onDelete: "cascade" }),
  versionNumber: varchar("version_number", { length: 20 }).notNull(),
  changes: jsonb("changes"), // Changelog
  templateConfig: jsonb("template_config").notNull(), // Snapshot of template at this version
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchase orders table
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  templateId: integer("template_id").references(() => orderTemplates.id),
  orderDate: date("order_date").notNull(),
  deliveryDate: date("delivery_date"),
  status: purchaseOrderStatusEnum("status").notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0").$type<number>(),
  notes: text("notes"),
  // customFields: jsonb("custom_fields"), // TODO: Add this column to database
  isApproved: boolean("is_approved").default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  // sentAt: timestamp("sent_at"), // TODO: Add this column to database
  currentApproverRole: userRoleEnum("current_approver_role"),
  approvalLevel: integer("approval_level").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_purchase_orders_number").on(table.orderNumber),
  index("idx_purchase_orders_project").on(table.projectId),
  index("idx_purchase_orders_vendor").on(table.vendorId),
  index("idx_purchase_orders_user").on(table.userId),
  index("idx_purchase_orders_status").on(table.status),
  index("idx_purchase_orders_date").on(table.orderDate),
  index("idx_purchase_orders_delivery").on(table.deliveryDate),
  index("idx_purchase_orders_created").on(table.createdAt),
  index("idx_purchase_orders_approver").on(table.currentApproverRole),
]);

// Purchase order items table
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => purchaseOrders.id).notNull(),
  // itemId: integer("item_id").references(() => items.id), // TODO: Add this column to database
  itemName: varchar("item_name", { length: 255 }).notNull(),
  specification: text("specification"),
  unit: varchar("unit", { length: 50 }), // 실제 DB에 있는 컬럼, NULL 허용
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().$type<number>(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull().$type<number>(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().$type<number>(),
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
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_poi_major_category").on(table.majorCategory),
  index("idx_poi_middle_category").on(table.middleCategory),
  index("idx_poi_minor_category").on(table.minorCategory),
  index("idx_poi_category_hierarchy").on(table.majorCategory, table.middleCategory, table.minorCategory),
  // index("idx_purchase_order_items_category_lv1").on(table.categoryLv1), // TODO: Add when column is added
  // index("idx_purchase_order_items_category_lv2").on(table.categoryLv2), // TODO: Add when column is added
  // index("idx_purchase_order_items_category_lv3").on(table.categoryLv3), // TODO: Add when column is added
]);

// File attachments table
export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => purchaseOrders.id).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  storedName: varchar("stored_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedBy: varchar("uploaded_by", { length: 50 }),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Order history/audit log table
export const orderHistory = pgTable("order_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => purchaseOrders.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: varchar("action", { length: 100 }).notNull(), // created, updated, approved, sent, etc.
  changes: jsonb("changes"), // Store what changed
  createdAt: timestamp("created_at").defaultNow(),
});

// Email send history
export const emailSendHistory = pgTable("email_send_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  sentBy: varchar("sent_by", { length: 255 }).notNull().references(() => users.id),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  recipientName: varchar("recipient_name", { length: 255 }),
  ccEmails: text("cc_emails"), // JSON array of CC emails
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  attachments: jsonb("attachments").$type<{ filename: string; path: string; size: number }[]>(),
  status: varchar("status", { length: 50 }).notNull().default('sent'), // sent, failed, bounced, opened, clicked
  errorMessage: text("error_message"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  trackingId: varchar("tracking_id", { length: 100 }).unique(),
  emailProvider: varchar("email_provider", { length: 50 }).default('naver'), // naver, gmail, etc.
  messageId: varchar("message_id", { length: 255 }), // Email message ID for tracking
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_email_history_order").on(table.orderId),
  index("idx_email_history_sent_by").on(table.sentBy),
  index("idx_email_history_recipient").on(table.recipientEmail),
  index("idx_email_history_tracking").on(table.trackingId),
  index("idx_email_history_status").on(table.status),
  index("idx_email_history_sent_at").on(table.sentAt),
]);

// 청구서/세금계산서 테이블
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(),
  invoiceType: varchar("invoice_type", { length: 20 }).notNull(), // 'invoice' or 'tax_invoice'
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().$type<number>(),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }).default("0").$type<number>(),
  status: invoiceStatusEnum("status").notNull().default("pending"),
  filePath: varchar("file_path", { length: 500 }), // 청구서 파일 경로
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  taxInvoiceIssued: boolean("tax_invoice_issued").default(false), // 세금계산서 발행 여부
  taxInvoiceIssuedDate: timestamp("tax_invoice_issued_date"), // 세금계산서 발행일
  taxInvoiceIssuedBy: varchar("tax_invoice_issued_by").references(() => users.id), // 세금계산서 발행자
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 항목별 수령 확인 테이블
export const itemReceipts = pgTable("item_receipts", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id").notNull().references(() => purchaseOrderItems.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  receivedQuantity: decimal("received_quantity", { precision: 10, scale: 2 }).notNull().$type<number>(),
  receivedDate: timestamp("received_date").notNull(),
  qualityCheck: boolean("quality_check").default(false),
  qualityNotes: text("quality_notes"),
  verifiedBy: varchar("verified_by").notNull().references(() => users.id),
  status: itemReceiptStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 검증 로그 테이블
export const verificationLogs = pgTable("verification_logs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  itemReceiptId: integer("item_receipt_id").references(() => itemReceipts.id, { onDelete: "set null" }),
  action: verificationActionEnum("action").notNull(),
  details: text("details"),
  performedBy: varchar("performed_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
  orderHistory: many(orderHistory),
  emailsSent: many(emailSendHistory),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
}));

export const itemsRelations = relations(items, ({ many }) => ({
  purchaseOrderItems: many(purchaseOrderItems),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
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
  projectHistory: many(projectHistory),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
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
  }),
}));

export const projectHistoryRelations = relations(projectHistory, ({ one }) => ({
  project: one(projects, {
    fields: [projectHistory.projectId],
    references: [projects.id]
  }),
  changedByUser: one(users, {
    fields: [projectHistory.changedBy],
    references: [users.id]
  }),
}));



export const orderTemplatesRelations = relations(orderTemplates, ({ many }) => ({
  fields: many(templateFields),
  handsontableConfig: many(handsontableConfigs),
  versions: many(templateVersions),
  orders: many(purchaseOrders),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  project: one(projects, {
    fields: [purchaseOrders.projectId],
    references: [projects.id],
  }),
  vendor: one(vendors, {
    fields: [purchaseOrders.vendorId],
    references: [vendors.id],
  }),
  user: one(users, {
    fields: [purchaseOrders.userId],
    references: [users.id],
  }),
  template: one(orderTemplates, {
    fields: [purchaseOrders.templateId],
    references: [orderTemplates.id],
  }),
  approver: one(users, {
    fields: [purchaseOrders.approvedBy],
    references: [users.id],
  }),
  items: many(purchaseOrderItems),
  attachments: many(attachments),
  history: many(orderHistory),
  invoices: many(invoices),
  verificationLogs: many(verificationLogs),
  emailHistory: many(emailSendHistory),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one, many }) => ({
  order: one(purchaseOrders, {
    fields: [purchaseOrderItems.orderId],
    references: [purchaseOrders.id],
  }),
  receipts: many(itemReceipts),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  order: one(purchaseOrders, {
    fields: [attachments.orderId],
    references: [purchaseOrders.id],
  }),
}));

export const orderHistoryRelations = relations(orderHistory, ({ one }) => ({
  order: one(purchaseOrders, {
    fields: [orderHistory.orderId],
    references: [purchaseOrders.id],
  }),
  user: one(users, {
    fields: [orderHistory.userId],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(purchaseOrders, {
    fields: [invoices.orderId],
    references: [purchaseOrders.id],
  }),
  receipts: many(itemReceipts),
  verificationLogs: many(verificationLogs),
}));

export const itemReceiptsRelations = relations(itemReceipts, ({ one, many }) => ({
  orderItem: one(purchaseOrderItems, {
    fields: [itemReceipts.orderItemId],
    references: [purchaseOrderItems.id],
  }),
  invoice: one(invoices, {
    fields: [itemReceipts.invoiceId],
    references: [invoices.id],
  }),
  verificationLogs: many(verificationLogs),
}));

export const verificationLogsRelations = relations(verificationLogs, ({ one }) => ({
  order: one(purchaseOrders, {
    fields: [verificationLogs.orderId],
    references: [purchaseOrders.id],
  }),
  invoice: one(invoices, {
    fields: [verificationLogs.invoiceId],
    references: [invoices.id],
  }),
  itemReceipt: one(itemReceipts, {
    fields: [verificationLogs.itemReceiptId],
    references: [itemReceipts.id],
  }),
}));



export const templateFieldsRelations = relations(templateFields, ({ one }) => ({
  template: one(orderTemplates, {
    fields: [templateFields.templateId],
    references: [orderTemplates.id],
  }),
}));

export const handsontableConfigsRelations = relations(handsontableConfigs, ({ one }) => ({
  template: one(orderTemplates, {
    fields: [handsontableConfigs.templateId],
    references: [orderTemplates.id],
  }),
}));

export const templateVersionsRelations = relations(templateVersions, ({ one }) => ({
  template: one(orderTemplates, {
    fields: [templateVersions.templateId],
    references: [orderTemplates.id],
  }),
}));

export const itemCategoriesRelations = relations(itemCategories, ({ one, many }) => ({
  parent: one(itemCategories, {
    fields: [itemCategories.parentId],
    references: [itemCategories.id],
  }),
  children: many(itemCategories),
}));

export const emailSendHistoryRelations = relations(emailSendHistory, ({ one }) => ({
  order: one(purchaseOrders, {
    fields: [emailSendHistory.orderId],
    references: [purchaseOrders.id],
  }),
  sentByUser: one(users, {
    fields: [emailSendHistory.sentBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Note: Project status and type schemas removed - using ENUM types directly

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderTemplateSchema = createInsertSchema(orderTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertItemCategorySchema = createInsertSchema(itemCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  orderNumber: true,
  userId: true,
  isApproved: true,
  approvedBy: true,
  approvedAt: true,
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
    notes: z.string().nullable().optional(),
    // Category fields (added to fix category data loss)
    majorCategory: z.string().nullable().optional(),
    middleCategory: z.string().nullable().optional(),
    minorCategory: z.string().nullable().optional(),
  })),
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
  createdAt: true,
}).extend({
  supplyAmount: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  uploadedAt: true,
});

export const insertOrderHistorySchema = createInsertSchema(orderHistory).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  totalAmount: z.union([z.string(), z.number()]).transform(val => String(val)),
  vatAmount: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const insertItemReceiptSchema = createInsertSchema(itemReceipts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  receivedQuantity: z.union([z.string(), z.number()]).transform(val => Number(val)),
  receivedDate: z.union([z.string(), z.date()]).transform(val => new Date(val)),
});

export const insertVerificationLogSchema = createInsertSchema(verificationLogs).omit({
  id: true,
  createdAt: true,
});

export const insertEmailSendHistorySchema = createInsertSchema(emailSendHistory).omit({
  id: true,
  sentAt: true,
  createdAt: true,
}).extend({
  ccEmails: z.string().nullable().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    path: z.string(),
    size: z.number(),
  })).nullable().optional(),
});

// Note: Order status schemas removed - using ENUM types instead

// New insert schemas for template management
export const insertTemplateFieldSchema = createInsertSchema(templateFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHandsontableConfigSchema = createInsertSchema(handsontableConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateVersionSchema = createInsertSchema(templateVersions).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = Omit<typeof users.$inferInsert, 'id'> & { id?: string };
export type User = typeof users.$inferSelect;

// Extended User type with proper typing
export type UserWithRole = User & {
  id: string;
  role: string;
};
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
// Note: Project status and type types removed - using ENUM values directly
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type OrderTemplate = typeof orderTemplates.$inferSelect;
export type InsertOrderTemplate = z.infer<typeof insertOrderTemplateSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type OrderHistory = typeof orderHistory.$inferSelect;
export type InsertOrderHistory = z.infer<typeof insertOrderHistorySchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type ItemReceipt = typeof itemReceipts.$inferSelect;
export type InsertItemReceipt = z.infer<typeof insertItemReceiptSchema>;
export type VerificationLog = typeof verificationLogs.$inferSelect;
export type InsertVerificationLog = z.infer<typeof insertVerificationLogSchema>;
export type EmailSendHistory = typeof emailSendHistory.$inferSelect;
export type InsertEmailSendHistory = z.infer<typeof insertEmailSendHistorySchema>;
// Order status types now use ENUM values directly

// New template management types
export type TemplateField = typeof templateFields.$inferSelect;
export type InsertTemplateField = z.infer<typeof insertTemplateFieldSchema>;
export type HandsontableConfig = typeof handsontableConfigs.$inferSelect;
export type InsertHandsontableConfig = z.infer<typeof insertHandsontableConfigSchema>;
export type TemplateVersion = typeof templateVersions.$inferSelect;
export type InsertTemplateVersion = z.infer<typeof insertTemplateVersionSchema>;

// Project team management types
export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectHistorySchema = createInsertSchema(projectHistory).omit({
  id: true,
  changedAt: true,
});

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectHistory = typeof projectHistory.$inferSelect;
export type InsertProjectHistory = z.infer<typeof insertProjectHistorySchema>;

// UI terminology types
export const insertUiTermSchema = createInsertSchema(uiTerms);
export type UiTerm = typeof uiTerms.$inferSelect;
export type InsertUiTerm = z.infer<typeof insertUiTermSchema>;



// Company types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

// Terminology types
export const insertTerminologySchema = createInsertSchema(terminology).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type Terminology = typeof terminology.$inferSelect;
export type InsertTerminology = z.infer<typeof insertTerminologySchema>;

// UI Terms types
export const insertUITermSchema = createInsertSchema(uiTerms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type UITerm = typeof uiTerms.$inferSelect;
export type InsertUITerm = z.infer<typeof insertUITermSchema>;

// Approval authority schema and types
export const insertApprovalAuthoritySchema = createInsertSchema(approvalAuthorities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type ApprovalAuthority = typeof approvalAuthorities.$inferSelect;
export type InsertApprovalAuthority = z.infer<typeof insertApprovalAuthoritySchema>;

// Item category types
export type ItemCategory = typeof itemCategories.$inferSelect;
export type InsertItemCategory = z.infer<typeof insertItemCategorySchema>;

// Approval workflow settings table
export const approvalWorkflowSettings = pgTable("approval_workflow_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  approvalMode: varchar("approval_mode", { length: 20 }).notNull().default("staged"), // 'direct' or 'staged'
  directApprovalRoles: jsonb("direct_approval_roles").default([]).$type<string[]>(), // roles that can approve directly
  stagedApprovalThresholds: jsonb("staged_approval_thresholds").default({}).$type<{
    [role: string]: number; // max amount each role can approve
  }>(),
  requireAllStages: boolean("require_all_stages").default(true), // whether all stages must approve
  skipLowerStages: boolean("skip_lower_stages").default(false), // whether higher roles can skip lower stages
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
}, (table) => ({
  companyIdx: index("idx_approval_workflow_company").on(table.companyId),
  activeIdx: index("idx_approval_workflow_active").on(table.isActive),
}));

// Approval step templates table for defining step sequences
export const approvalStepTemplates = pgTable("approval_step_templates", {
  id: serial("id").primaryKey(),
  templateName: varchar("template_name", { length: 100 }).notNull(),
  companyId: integer("company_id").references(() => companies.id),
  stepOrder: integer("step_order").notNull(),
  requiredRole: userRoleEnum("required_role").notNull(),
  minAmount: decimal("min_amount", { precision: 15, scale: 2 }).default('0'),
  maxAmount: decimal("max_amount", { precision: 15, scale: 2 }),
  isOptional: boolean("is_optional").default(false),
  canSkip: boolean("can_skip").default(false), // can be skipped by higher authority
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  templateCompanyIdx: index("idx_approval_step_template_company").on(table.companyId),
  templateOrderIdx: index("idx_approval_step_order").on(table.templateName, table.stepOrder),
}));

// Approval step instances table for tracking actual approval steps for each order
export const approvalStepInstances = pgTable("approval_step_instances", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => purchaseOrders.id).notNull(),
  templateId: integer("template_id").references(() => approvalStepTemplates.id),
  stepOrder: integer("step_order").notNull(),
  requiredRole: userRoleEnum("required_role").notNull(),
  assignedUserId: varchar("assigned_user_id", { length: 255 }).references(() => users.id),
  status: approvalStepStatusEnum("status").default("pending"),
  approvedBy: varchar("approved_by", { length: 255 }).references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  comments: text("comments"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  orderIdx: index("idx_approval_step_instance_order").on(table.orderId),
  statusIdx: index("idx_approval_step_instance_status").on(table.status),
  assignedUserIdx: index("idx_approval_step_instance_user").on(table.assignedUserId),
}));

// Approval workflow settings types
export const insertApprovalWorkflowSettingsSchema = createInsertSchema(approvalWorkflowSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type ApprovalWorkflowSettings = typeof approvalWorkflowSettings.$inferSelect;
export type InsertApprovalWorkflowSettings = z.infer<typeof insertApprovalWorkflowSettingsSchema>;

// Approval step templates types
export const insertApprovalStepTemplateSchema = createInsertSchema(approvalStepTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type ApprovalStepTemplate = typeof approvalStepTemplates.$inferSelect;
export type InsertApprovalStepTemplate = z.infer<typeof insertApprovalStepTemplateSchema>;

// Approval step instances types
export const insertApprovalStepInstanceSchema = createInsertSchema(approvalStepInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type ApprovalStepInstance = typeof approvalStepInstances.$inferSelect;
export type InsertApprovalStepInstance = z.infer<typeof insertApprovalStepInstanceSchema>;

// ============================================================================
// AUDIT MANAGEMENT SYSTEM
// ============================================================================

// Audit log level enum
export const auditLogLevelEnum = pgEnum("audit_log_level", ["OFF", "ERROR", "WARNING", "INFO", "DEBUG"]);

// Audit event type enum  
export const auditEventTypeEnum = pgEnum("audit_event_type", [
  "login", 
  "logout", 
  "login_failed",
  "session_expired",
  "password_change",
  "permission_change",
  "data_create",
  "data_read", 
  "data_update",
  "data_delete",
  "data_export",
  "approval_request",
  "approval_grant",
  "approval_reject",
  "email_send",
  "file_upload",
  "file_download",
  "settings_change",
  "security_alert",
  "api_access",
  "error"
]);

// System audit logs table - 시스템 전체 감사 로그
export const systemAuditLogs = pgTable("system_audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id), // NULL for system events
  userName: varchar("user_name", { length: 255 }), // Denormalized for performance
  userRole: varchar("user_role", { length: 50 }), // Denormalized for performance
  eventType: auditEventTypeEnum("event_type").notNull(),
  eventCategory: varchar("event_category", { length: 50 }).notNull(), // 'auth', 'data', 'system', 'security'
  entityType: varchar("entity_type", { length: 50 }), // 'order', 'user', 'vendor', 'project', etc.
  entityId: varchar("entity_id", { length: 100 }), // ID of affected entity
  action: varchar("action", { length: 255 }).notNull(), // Detailed action description
  details: jsonb("details"), // Additional event details
  oldValue: jsonb("old_value"), // Previous state (for updates)
  newValue: jsonb("new_value"), // New state (for updates)
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 255 }),
  requestMethod: varchar("request_method", { length: 10 }), // GET, POST, PUT, DELETE
  requestPath: varchar("request_path", { length: 500 }),
  responseStatus: integer("response_status"), // HTTP status code
  executionTime: integer("execution_time"), // in milliseconds
  errorMessage: text("error_message"), // For error events
  stackTrace: text("stack_trace"), // For debugging (only in DEBUG mode)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_user").on(table.userId),
  index("idx_audit_event_type").on(table.eventType),
  index("idx_audit_entity").on(table.entityType, table.entityId),
  index("idx_audit_created").on(table.createdAt),
  index("idx_audit_category").on(table.eventCategory),
  index("idx_audit_session").on(table.sessionId),
]);

// Audit settings table - 감사 설정
export const auditSettings = pgTable("audit_settings", {
  id: serial("id").primaryKey(),
  logLevel: auditLogLevelEnum("log_level").notNull().default("INFO"),
  enabledCategories: jsonb("enabled_categories").notNull().default(["auth", "data", "security"]).$type<string[]>(),
  retentionDays: integer("retention_days").notNull().default(90), // Days to keep logs
  archiveEnabled: boolean("archive_enabled").default(true),
  archiveAfterDays: integer("archive_after_days").default(30),
  realTimeAlerts: boolean("real_time_alerts").default(false),
  alertEmails: jsonb("alert_emails").default([]).$type<string[]>(),
  excludedPaths: jsonb("excluded_paths").default([]).$type<string[]>(), // API paths to exclude
  excludedUsers: jsonb("excluded_users").default([]).$type<string[]>(), // User IDs to exclude
  sensitiveDataMasking: boolean("sensitive_data_masking").default(true),
  performanceTracking: boolean("performance_tracking").default(false),
  apiAccessLogging: boolean("api_access_logging").default(false),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
  createdAt: timestamp("created_at").defaultNow(),
});

// Archived audit logs table - 아카이브된 감사 로그
export const archivedAuditLogs = pgTable("archived_audit_logs", {
  id: serial("id").primaryKey(),
  originalId: integer("original_id").notNull(), // Original log ID
  userId: varchar("user_id", { length: 255 }),
  userName: varchar("user_name", { length: 255 }),
  userRole: varchar("user_role", { length: 50 }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventCategory: varchar("event_category", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: varchar("entity_id", { length: 100 }),
  action: varchar("action", { length: 255 }).notNull(),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").notNull(),
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
}, (table) => [
  index("idx_archived_audit_user").on(table.userId),
  index("idx_archived_audit_created").on(table.createdAt),
  index("idx_archived_audit_archived").on(table.archivedAt),
]);

// Audit alert rules table - 감사 알림 규칙
export const auditAlertRules = pgTable("audit_alert_rules", {
  id: serial("id").primaryKey(),
  ruleName: varchar("rule_name", { length: 100 }).notNull(),
  description: text("description"),
  eventTypes: jsonb("event_types").notNull().$type<string[]>(), // Events to monitor
  condition: jsonb("condition"), // Complex conditions
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  alertChannels: jsonb("alert_channels").notNull().$type<string[]>(), // email, slack, webhook
  recipients: jsonb("recipients").notNull().$type<string[]>(), // Email addresses or webhook URLs
  throttleMinutes: integer("throttle_minutes").default(60), // Prevent alert spam
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_alert_rules_active").on(table.isActive),
  index("idx_alert_rules_severity").on(table.severity),
]);

// Relations for audit tables
export const systemAuditLogsRelations = relations(systemAuditLogs, ({ one }) => ({
  user: one(users, {
    fields: [systemAuditLogs.userId],
    references: [users.id],
  }),
}));

export const auditSettingsRelations = relations(auditSettings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [auditSettings.updatedBy],
    references: [users.id],
  }),
}));

export const auditAlertRulesRelations = relations(auditAlertRules, ({ one }) => ({
  createdByUser: one(users, {
    fields: [auditAlertRules.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas for audit tables
export const insertSystemAuditLogSchema = createInsertSchema(systemAuditLogs).omit({
  id: true,
  createdAt: true,
});
export type SystemAuditLog = typeof systemAuditLogs.$inferSelect;
export type InsertSystemAuditLog = z.infer<typeof insertSystemAuditLogSchema>;

export const insertAuditSettingsSchema = createInsertSchema(auditSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type AuditSettings = typeof auditSettings.$inferSelect;
export type InsertAuditSettings = z.infer<typeof insertAuditSettingsSchema>;

export const insertArchivedAuditLogSchema = createInsertSchema(archivedAuditLogs).omit({
  id: true,
  archivedAt: true,
});
export type ArchivedAuditLog = typeof archivedAuditLogs.$inferSelect;
export type InsertArchivedAuditLog = z.infer<typeof insertArchivedAuditLogSchema>;

export const insertAuditAlertRuleSchema = createInsertSchema(auditAlertRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type AuditAlertRule = typeof auditAlertRules.$inferSelect;
export type InsertAuditAlertRule = z.infer<typeof insertAuditAlertRuleSchema>;
