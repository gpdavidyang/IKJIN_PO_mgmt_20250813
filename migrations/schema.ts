import { pgTable, index, foreignKey, serial, integer, varchar, bigint, timestamp, check, text, jsonb, boolean, unique, numeric, date, inet, json, pgView, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const approvalRole = pgEnum("approval_role", ['field_worker', 'project_manager', 'hq_management', 'executive', 'admin'])
export const invoiceStatus = pgEnum("invoice_status", ['pending', 'verified', 'paid'])
export const itemReceiptStatus = pgEnum("item_receipt_status", ['pending', 'approved', 'rejected'])
export const loginStatus = pgEnum("login_status", ['success', 'failed', 'locked'])
export const projectStatus = pgEnum("project_status", ['active', 'completed', 'on_hold', 'cancelled', 'planning'])
export const projectType = pgEnum("project_type", ['commercial', 'residential', 'industrial', 'infrastructure'])
export const purchaseOrderStatus = pgEnum("purchase_order_status", ['draft', 'pending', 'approved', 'sent', 'completed', 'cancelled'])
export const userRole = pgEnum("user_role", ['field_worker', 'project_manager', 'hq_management', 'executive', 'admin'])
export const verificationAction = pgEnum("verification_action", ['invoice_uploaded', 'item_verified', 'quality_checked'])


export const attachments = pgTable("attachments", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id").notNull(),
	originalName: varchar("original_name", { length: 500 }).notNull(),
	storedName: varchar("stored_name", { length: 500 }).notNull(),
	filePath: varchar("file_path", { length: 1000 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSize: bigint("file_size", { mode: "number" }),
	mimeType: varchar("mime_type", { length: 100 }),
	uploadedBy: varchar("uploaded_by", { length: 50 }),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_attachments_order_id").using("btree", table.orderId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [purchaseOrders.id],
			name: "attachments_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "attachments_uploaded_by_fkey"
		}),
]);

export const emailSendingDetails = pgTable("email_sending_details", {
	id: serial().primaryKey().notNull(),
	historyId: integer("history_id").notNull(),
	recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
	recipientType: varchar("recipient_type", { length: 10 }).notNull(),
	sendingStatus: varchar("sending_status", { length: 20 }).default('pending'),
	messageId: varchar("message_id", { length: 255 }),
	errorMessage: text("error_message"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_email_sending_details_history_id").using("btree", table.historyId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.historyId],
			foreignColumns: [emailSendingHistory.id],
			name: "email_sending_details_history_id_fkey"
		}).onDelete("cascade"),
	check("email_sending_details_recipient_type_check", sql`(recipient_type)::text = ANY (ARRAY[('to'::character varying)::text, ('cc'::character varying)::text, ('bcc'::character varying)::text])`),
]);

export const emailSendingHistory = pgTable("email_sending_history", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id"),
	orderNumber: varchar("order_number", { length: 50 }),
	senderUserId: varchar("sender_user_id", { length: 50 }),
	recipients: jsonb().notNull(),
	cc: jsonb(),
	bcc: jsonb(),
	subject: text().notNull(),
	messageContent: text("message_content"),
	attachmentFiles: jsonb("attachment_files"),
	sendingStatus: varchar("sending_status", { length: 20 }).default('pending'),
	sentCount: integer("sent_count").default(0),
	failedCount: integer("failed_count").default(0),
	errorMessage: text("error_message"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_email_sending_history_order_id").using("btree", table.orderId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [purchaseOrders.id],
			name: "email_sending_history_order_id_fkey"
		}),
	foreignKey({
			columns: [table.senderUserId],
			foreignColumns: [users.id],
			name: "email_sending_history_sender_user_id_fkey"
		}),
]);

export const handsontableConfigs = pgTable("handsontable_configs", {
	id: serial().primaryKey().notNull(),
	templateId: integer("template_id").notNull(),
	configName: varchar("config_name", { length: 100 }).notNull(),
	tableConfig: jsonb("table_config").notNull(),
	headers: jsonb(),
	columnTypes: jsonb("column_types"),
	validationRules: jsonb("validation_rules"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [orderTemplates.id],
			name: "handsontable_configs_template_id_fkey"
		}).onDelete("cascade"),
]);

export const approvalAuthorities = pgTable("approval_authorities", {
	id: serial().primaryKey().notNull(),
	role: approvalRole().notNull(),
	maxAmount: numeric("max_amount", { precision: 15, scale:  2 }).notNull(),
	description: varchar({ length: 255 }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("approval_authorities_role_key").on(table.role),
]);

export const itemReceipts = pgTable("item_receipts", {
	id: serial().primaryKey().notNull(),
	orderItemId: integer("order_item_id").notNull(),
	invoiceId: integer("invoice_id"),
	receivedQuantity: numeric("received_quantity", { precision: 10, scale:  3 }).notNull(),
	receivedDate: date("received_date").notNull(),
	qualityStatus: varchar("quality_status", { length: 20 }).default('good'),
	verifiedBy: varchar("verified_by", { length: 50 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "item_receipts_invoice_id_fkey"
		}),
	foreignKey({
			columns: [table.orderItemId],
			foreignColumns: [purchaseOrderItems.id],
			name: "item_receipts_order_item_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.verifiedBy],
			foreignColumns: [users.id],
			name: "item_receipts_verified_by_fkey"
		}),
]);

export const items = pgTable("items", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	specification: text(),
	unit: varchar({ length: 20 }).notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }),
	category: varchar({ length: 100 }),
	majorCategory: varchar("major_category", { length: 100 }),
	middleCategory: varchar("middle_category", { length: 100 }),
	minorCategory: varchar("minor_category", { length: 100 }),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const orderHistory = pgTable("order_history", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id").notNull(),
	userId: varchar("user_id", { length: 50 }).notNull(),
	action: varchar({ length: 50 }).notNull(),
	changes: jsonb(),
	notes: text(),
	timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_order_history_order_id").using("btree", table.orderId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [purchaseOrders.id],
			name: "order_history_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "order_history_user_id_fkey"
		}),
]);

export const loginAuditLogs = pgTable("login_audit_logs", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 50 }),
	email: varchar({ length: 255 }).notNull(),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	loginStatus: loginStatus("login_status").notNull(),
	failureReason: varchar("failure_reason", { length: 255 }),
	sessionId: varchar("session_id", { length: 128 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_login_audit_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_login_audit_logs_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "login_audit_logs_user_id_fkey"
		}),
]);

export const itemCategories = pgTable("item_categories", {
	id: serial().primaryKey().notNull(),
	categoryName: varchar("category_name", { length: 100 }).notNull(),
	categoryType: varchar("category_type", { length: 20 }).notNull(),
	parentId: integer("parent_id"),
	displayOrder: integer("display_order").default(0),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "item_categories_parent_id_fkey"
		}),
	check("item_categories_category_type_check", sql`(category_type)::text = ANY (ARRAY[('major'::character varying)::text, ('middle'::character varying)::text, ('minor'::character varying)::text])`),
]);

export const projectMembers = pgTable("project_members", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	userId: varchar("user_id", { length: 50 }).notNull(),
	role: varchar({ length: 50 }).notNull(),
	assignedBy: varchar("assigned_by", { length: 50 }),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_project_members_project_id").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	index("idx_project_members_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.id],
			name: "project_members_assigned_by_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_members_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "project_members_user_id_fkey"
		}).onDelete("cascade"),
]);

export const projectHistory = pgTable("project_history", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	changedBy: varchar("changed_by", { length: 50 }).notNull(),
	changeType: varchar("change_type", { length: 50 }).notNull(),
	oldValues: jsonb("old_values"),
	newValues: jsonb("new_values"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.changedBy],
			foreignColumns: [users.id],
			name: "project_history_changed_by_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_history_project_id_fkey"
		}).onDelete("cascade"),
]);

export const templateVersions = pgTable("template_versions", {
	id: serial().primaryKey().notNull(),
	templateId: integer("template_id"),
	versionNumber: varchar("version_number", { length: 20 }).notNull(),
	changes: jsonb(),
	templateConfig: jsonb("template_config").notNull(),
	createdBy: varchar("created_by", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const sessions = pgTable("sessions", {
	id: varchar({ length: 128 }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	expires: bigint({ mode: "number" }).notNull(),
	data: text(),
});

export const verificationLogs = pgTable("verification_logs", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id"),
	invoiceId: integer("invoice_id"),
	itemReceiptId: integer("item_receipt_id"),
	action: varchar({ length: 50 }).notNull(),
	details: text(),
	performedBy: varchar("performed_by", { length: 50 }).notNull(),
	performedAt: timestamp("performed_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "verification_logs_invoice_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.itemReceiptId],
			foreignColumns: [itemReceipts.id],
			name: "verification_logs_item_receipt_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [purchaseOrders.id],
			name: "verification_logs_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.performedBy],
			foreignColumns: [users.id],
			name: "verification_logs_performed_by_fkey"
		}),
]);

export const templateFields = pgTable("template_fields", {
	id: serial().primaryKey().notNull(),
	templateId: integer("template_id").notNull(),
	fieldName: varchar("field_name", { length: 100 }).notNull(),
	fieldType: varchar("field_type", { length: 50 }).notNull(),
	fieldLabel: varchar("field_label", { length: 255 }),
	fieldOptions: jsonb("field_options"),
	validationRules: jsonb("validation_rules"),
	displayOrder: integer("display_order").default(0),
	isRequired: boolean("is_required").default(false),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [orderTemplates.id],
			name: "template_fields_template_id_fkey"
		}).onDelete("cascade"),
]);

export const terminology = pgTable("terminology", {
	id: serial().primaryKey().notNull(),
	termKey: varchar("term_key", { length: 100 }).notNull(),
	termValue: varchar("term_value", { length: 500 }).notNull(),
	category: varchar({ length: 50 }),
	description: text(),
	exampleUsage: text("example_usage"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const vendors = pgTable("vendors", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	businessNumber: varchar("business_number", { length: 20 }),
	contactPerson: varchar("contact_person", { length: 100 }),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 255 }),
	address: text(),
	businessType: varchar("business_type", { length: 100 }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	aliases: jsonb().default([]),
	vendorCode: varchar("vendor_code", { length: 50 }),
}, (table) => [
	unique("vendors_business_number_key").on(table.businessNumber),
]);

export const uiTerms = pgTable("ui_terms", {
	termKey: varchar("term_key", { length: 100 }).primaryKey().notNull(),
	termValue: varchar("term_value", { length: 500 }).notNull(),
	category: varchar({ length: 50 }),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const appSessions = pgTable("app_sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_app_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const invoices = pgTable("invoices", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id").notNull(),
	invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
	invoiceDate: date("invoice_date").notNull(),
	invoiceAmount: numeric("invoice_amount", { precision: 15, scale:  2 }).notNull(),
	dueDate: date("due_date"),
	status: varchar({ length: 20 }).default('pending'),
	uploadedBy: varchar("uploaded_by", { length: 50 }),
	verifiedBy: varchar("verified_by", { length: 50 }),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [purchaseOrders.id],
			name: "invoices_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "invoices_uploaded_by_fkey"
		}),
	foreignKey({
			columns: [table.verifiedBy],
			foreignColumns: [users.id],
			name: "invoices_verified_by_fkey"
		}),
]);

export const emailVerificationTokens = pgTable("email_verification_tokens", {
	id: serial().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	token: varchar({ length: 255 }).notNull(),
	tokenType: varchar("token_type", { length: 50 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_email_verification_tokens_token").using("btree", table.token.asc().nullsLast().op("text_ops")),
	unique("email_verification_tokens_token_key").on(table.token),
]);

export const companies = pgTable("companies", {
	id: serial().primaryKey().notNull(),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	businessNumber: varchar("business_number", { length: 20 }),
	address: text(),
	contactPerson: varchar("contact_person", { length: 100 }),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 255 }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("companies_business_number_key").on(table.businessNumber),
]);

export const purchaseOrders = pgTable("purchase_orders", {
	id: serial().primaryKey().notNull(),
	orderNumber: varchar("order_number", { length: 50 }).notNull(),
	userId: varchar("user_id", { length: 50 }).notNull(),
	vendorId: integer("vendor_id"),
	projectId: integer("project_id"),
	templateId: integer("template_id"),
	orderDate: date("order_date").default(sql`CURRENT_DATE`).notNull(),
	deliveryDate: date("delivery_date"),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }).default('0'),
	status: purchaseOrderStatus().default('draft').notNull(),
	notes: text(),
	paymentTerms: varchar("payment_terms", { length: 255 }),
	deliveryAddress: text("delivery_address"),
	isApproved: boolean("is_approved").default(false),
	approvedBy: varchar("approved_by", { length: 50 }),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	currentApproverRole: approvalRole("current_approver_role"),
	approvalLevel: integer("approval_level").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_purchase_orders_order_date").using("btree", table.orderDate.asc().nullsLast().op("date_ops")),
	index("idx_purchase_orders_project_id").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	index("idx_purchase_orders_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_purchase_orders_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("idx_purchase_orders_vendor_id").using("btree", table.vendorId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "purchase_orders_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "purchase_orders_project_id_fkey"
		}),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [orderTemplates.id],
			name: "purchase_orders_template_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "purchase_orders_user_id_fkey"
		}),
	foreignKey({
			columns: [table.vendorId],
			foreignColumns: [vendors.id],
			name: "purchase_orders_vendor_id_fkey"
		}),
	unique("purchase_orders_order_number_key").on(table.orderNumber),
]);

export const orderTemplates = pgTable("order_templates", {
	id: serial().primaryKey().notNull(),
	templateName: varchar("template_name", { length: 255 }).notNull(),
	templateType: varchar("template_type", { length: 50 }).notNull(),
	description: text(),
	formFields: jsonb("form_fields"),
	isActive: boolean("is_active").default(true),
	createdBy: varchar("created_by", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "order_templates_created_by_fkey"
		}),
]);

export const pendingRegistrations = pgTable("pending_registrations", {
	id: serial().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
	fullName: varchar("full_name", { length: 100 }).notNull(),
	phoneNumber: varchar("phone_number", { length: 20 }),
	role: userRole().default('field_worker').notNull(),
	position: varchar({ length: 100 }),
	verificationToken: varchar("verification_token", { length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("pending_registrations_email_key").on(table.email),
	unique("pending_registrations_verification_token_key").on(table.verificationToken),
]);

export const projects = pgTable("projects", {
	id: serial().primaryKey().notNull(),
	projectName: varchar("project_name", { length: 255 }).notNull(),
	projectCode: varchar("project_code", { length: 50 }).notNull(),
	clientName: varchar("client_name", { length: 255 }),
	projectType: projectType("project_type").default('commercial').notNull(),
	location: text(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	status: projectStatus().default('active').notNull(),
	totalBudget: numeric("total_budget", { precision: 15, scale:  2 }),
	projectManagerId: varchar("project_manager_id", { length: 50 }),
	orderManagerId: varchar("order_manager_id", { length: 50 }),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.orderManagerId],
			foreignColumns: [users.id],
			name: "projects_order_manager_id_fkey"
		}),
	foreignKey({
			columns: [table.projectManagerId],
			foreignColumns: [users.id],
			name: "projects_project_manager_id_fkey"
		}),
	unique("projects_project_code_key").on(table.projectCode),
]);

export const purchaseOrderItems = pgTable("purchase_order_items", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id").notNull(),
	itemName: varchar("item_name", { length: 255 }).notNull(),
	specification: text(),
	unit: varchar({ length: 20 }),
	quantity: numeric({ precision: 10, scale:  3 }).notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }).notNull(),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }).notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_purchase_order_items_order_id").using("btree", table.orderId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [purchaseOrders.id],
			name: "purchase_order_items_order_id_fkey"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: varchar({ length: 50 }).primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
	phoneNumber: varchar("phone_number", { length: 20 }),
	role: userRole().default('field_worker').notNull(),
	position: varchar({ length: 100 }),
	isActive: boolean("is_active").default(true),
	profileImageUrl: varchar("profile_image_url", { length: 500 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_users_role").using("btree", table.role.asc().nullsLast().op("enum_ops")),
	unique("users_email_key").on(table.email),
]);

export const approvalWorkflowSettings = pgTable("approval_workflow_settings", {
	id: serial().primaryKey().notNull(),
	companyId: integer("company_id"),
	approvalMode: varchar("approval_mode", { length: 20 }).default('staged').notNull(),
	directApprovalRoles: jsonb("direct_approval_roles").default([]),
	stagedApprovalThresholds: jsonb("staged_approval_thresholds").default({}),
	requireAllStages: boolean("require_all_stages").default(true),
	skipLowerStages: boolean("skip_lower_stages").default(false),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	createdBy: varchar("created_by", { length: 255 }),
}, (table) => [
	index("idx_approval_workflow_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_approval_workflow_company").using("btree", table.companyId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "approval_workflow_settings_company_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "approval_workflow_settings_created_by_fkey"
		}),
]);
export const purchaseOrderStatusDisplay = pgView("purchase_order_status_display", {	statusCode: text("status_code"),
	statusName: text("status_name"),
	statusColor: text("status_color"),
	sortOrder: integer("sort_order"),
}).as(sql`SELECT 'draft'::text AS status_code, '임시저장'::text AS status_name, '#9CA3AF'::text AS status_color, 1 AS sort_order UNION ALL SELECT 'pending'::text AS status_code, '승인대기'::text AS status_name, '#F59E0B'::text AS status_color, 2 AS sort_order UNION ALL SELECT 'approved'::text AS status_code, '승인완료'::text AS status_name, '#10B981'::text AS status_color, 3 AS sort_order UNION ALL SELECT 'sent'::text AS status_code, '발송완료'::text AS status_name, '#3B82F6'::text AS status_color, 4 AS sort_order UNION ALL SELECT 'completed'::text AS status_code, '완료'::text AS status_name, '#6366F1'::text AS status_color, 5 AS sort_order UNION ALL SELECT 'cancelled'::text AS status_code, '취소'::text AS status_name, '#EF4444'::text AS status_color, 6 AS sort_order`);